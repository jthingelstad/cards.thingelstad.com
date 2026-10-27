// Put the card maker live, from this Mac, as the cloud-engineer identity.
//
//   node tools/deploy.mjs plan         package, then print the change set for the
//                                      cards stack; uploads and executes nothing
//   node tools/deploy.mjs apply        package, upload the zip if it is new, and
//                                      execute the change set; then read /health
//                                      through CloudFront until it reports the key
//                                      and clear the cards that now draw differently
//   node tools/deploy.mjs apply --clear-all   the same, clearing every card
//   node tools/deploy.mjs certificate  create the cards-certificate stack and print
//                                      the ACM validation record for Namecheap
//
// The first apply creates the stack in two steps: the code bucket, role and
// logs alone (CodeKey empty), then, with the zip uploaded, the function, its
// URL and the distribution. Once the certificate is ISSUED, apply gives the
// distribution its cards.thingelstad.com alias; until then cards are served
// on the CloudFront domain only. Each apply rewrites the live fields of
// infra/deployment.json from the stack.
//
// The zip's key, code/<sha256>.zip, hashes the files, not the zip's bytes, so
// an apply with nothing changed in the code or the template has nothing to do.
//
// A drawn card is kept a year, so a layout change reaches only cards not yet
// drawn unless the cache is cleared; but clearing it throws away every card
// the crawlers made, to draw the same cards again (2026-10-27: AhrefsBot and
// Amazonbot drew about 18,000 overnight). So apply clears only the sites whose
// cards changed: tools/compare.mjs draws tools/samples.json with the package
// the cache was drawn by and with the new one, and each site whose samples
// differ is cleared (/<site>/*, edges and Origin Shield both), or /* when
// they all do. cache/drawn-by.json in the code bucket names the package the
// cache was drawn by, written only once the clearing is done, so a rerun
// after a failed apply compares from the same package again and clears what
// the first run did not. Without that record, the live package is taken as
// the one. Plan prints what apply would clear.
import { CloudFrontClient, CreateInvalidationCommand, waitUntilInvalidationCompleted } from '@aws-sdk/client-cloudfront';
import {
  CloudFormationClient,
  CreateChangeSetCommand,
  DeleteChangeSetCommand,
  DescribeChangeSetCommand,
  DescribeStackEventsCommand,
  DescribeStackResourceCommand,
  DescribeStacksCommand,
  ExecuteChangeSetCommand,
  waitUntilChangeSetCreateComplete,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
} from '@aws-sdk/client-cloudformation';
import { ACMClient, DescribeCertificateCommand } from '@aws-sdk/client-acm';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedSites, load, readSamples } from './compare.mjs';
import { packageCards } from './package.mjs';
import { SITES } from '../src/sites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = path.join(ROOT, 'infra/deployment.json');
const ROLE = ':assumed-role/ProjectsCloudEngineer/';

const mode = process.argv[2];
if (!['plan', 'apply', 'certificate'].includes(mode))
  throw new Error('Usage: node tools/deploy.mjs plan|apply [--clear-all]|certificate');
const clearAll = process.argv.includes('--clear-all');
const RECORD = 'cache/drawn-by.json';

const config = JSON.parse(await fs.readFile(CONFIG, 'utf8'));
const settings = { region: config.region, maxAttempts: 5 };
const identity = await new STSClient(settings).send(new GetCallerIdentityCommand({}));
if (identity.Account !== config.account) throw new Error(`Unexpected AWS account ${identity.Account}`);
if (!identity.Arn.includes(ROLE)) throw new Error(`Deploy as the cloud-engineer identity, not ${identity.Arn}`);
const cfn = new CloudFormationClient(settings);
const Tags = Object.entries(config.stackTags).map(([Key, Value]) => ({ Key, Value }));
const template = (name) => fs.readFile(path.join(ROOT, 'infra', `${name}.json`), 'utf8');
const STABLE = /_COMPLETE$/;

async function describe(StackName) {
  try {
    const { Stacks } = await cfn.send(new DescribeStacksCommand({ StackName }));
    const stack = Stacks[0];
    return stack.StackStatus === 'REVIEW_IN_PROGRESS' ? { ...stack, review: true } : stack;
  } catch (error) {
    if (/does not exist/.test(error.message)) return null;
    throw error;
  }
}

const parameter = (stack, name) => stack?.Parameters?.find((p) => p.ParameterKey === name)?.ParameterValue ?? '';
const output = (stack, name) => stack?.Outputs?.find((o) => o.OutputKey === name)?.OutputValue ?? '';

/** Make a change set; returns its changes, or null when there is nothing to change. */
async function changeSet(StackName, TemplateBody, Parameters, create) {
  const ChangeSetName = `${mode}-${Date.now()}`;
  await cfn.send(
    new CreateChangeSetCommand({
      StackName,
      ChangeSetName,
      ChangeSetType: create ? 'CREATE' : 'UPDATE',
      TemplateBody,
      Parameters,
      Capabilities: ['CAPABILITY_IAM'],
      Tags,
    }),
  );
  try {
    await waitUntilChangeSetCreateComplete({ client: cfn, maxWaitTime: 300 }, { StackName, ChangeSetName });
  } catch (error) {
    const { StatusReason } = await cfn.send(new DescribeChangeSetCommand({ StackName, ChangeSetName }));
    await cfn.send(new DeleteChangeSetCommand({ StackName, ChangeSetName }));
    if (/didn't contain changes|No updates are to be performed/.test(StatusReason ?? '')) return null;
    throw new Error(`${StackName}: ${StatusReason || error.message}`, { cause: error });
  }
  const { Changes } = await cfn.send(new DescribeChangeSetCommand({ StackName, ChangeSetName }));
  return { ChangeSetName, Changes };
}

function show(StackName, set) {
  if (!set) return console.log(`${StackName}: no changes`);
  console.log(`${StackName}: ${set.Changes.length} change(s)`);
  for (const { ResourceChange: c } of set.Changes)
    console.log(`  ${c.Action.padEnd(6)} ${c.LogicalResourceId} (${c.ResourceType})${c.Replacement === 'True' ? ' REPLACES' : ''}`);
}

async function execute(StackName, set, create) {
  await cfn.send(new ExecuteChangeSetCommand({ StackName, ChangeSetName: set.ChangeSetName }));
  const wait = create ? waitUntilStackCreateComplete : waitUntilStackUpdateComplete;
  try {
    await wait({ client: cfn, maxWaitTime: 1800, minDelay: 15 }, { StackName });
  } catch (error) {
    const { StackEvents } = await cfn.send(new DescribeStackEventsCommand({ StackName }));
    const failed = StackEvents?.find((e) => /FAILED$/.test(e.ResourceStatus ?? ''));
    throw new Error(
      `${StackName} did not ${create ? 'create' : 'update'}` +
        (failed ? `: ${failed.LogicalResourceId} ${failed.ResourceStatus} ${failed.ResourceStatusReason}` : ''),
      { cause: error },
    );
  }
}

/** The certificate's ARN once it is ISSUED, else ''. */
async function issuedCertificate() {
  const stack = await describe(config.stacks.certificate);
  if (!stack) return '';
  const { StackResourceDetail } = await cfn
    .send(new DescribeStackResourceCommand({ StackName: stack.StackName, LogicalResourceId: 'Certificate' }))
    .catch(() => ({}));
  const arn = StackResourceDetail?.PhysicalResourceId;
  if (!arn?.startsWith('arn:')) return '';
  const { Certificate } = await new ACMClient(settings).send(new DescribeCertificateCommand({ CertificateArn: arn }));
  return Certificate.Status === 'ISSUED' ? arn : '';
}

async function certificate() {
  const StackName = config.stacks.certificate;
  let stack = await describe(StackName);
  if (!stack) {
    const set = await changeSet(StackName, await template('certificate'), [], true);
    show(StackName, set);
    await cfn.send(new ExecuteChangeSetCommand({ StackName, ChangeSetName: set.ChangeSetName }));
  }
  // The stack finishes only once the validation record is in DNS; print the
  // record as soon as ACM has it.
  const acm = new ACMClient(settings);
  for (let attempt = 0; attempt < 60; attempt++) {
    const { StackResourceDetail } = await cfn
      .send(new DescribeStackResourceCommand({ StackName, LogicalResourceId: 'Certificate' }))
      .catch(() => ({}));
    const arn = StackResourceDetail?.PhysicalResourceId;
    if (arn?.startsWith('arn:')) {
      const { Certificate } = await acm.send(new DescribeCertificateCommand({ CertificateArn: arn }));
      const record = Certificate.DomainValidationOptions?.[0]?.ResourceRecord;
      if (record || Certificate.Status === 'ISSUED') {
        console.log(JSON.stringify({ certificate: arn, status: Certificate.Status, validation: record ?? null }, null, 2));
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`${StackName}: ACM gave no validation record in five minutes`);
}

/** The package the cache was drawn by, from its record or else the live one. */
async function drawnBy(s3, Bucket, live) {
  try {
    const { Body } = await s3.send(new GetObjectCommand({ Bucket, Key: RECORD }));
    return JSON.parse(await Body.transformToString()).code;
  } catch (error) {
    if (error.name === 'NoSuchKey') return live;
    throw error;
  }
}

/** The paths to clear for a move from one package to another: [] for none. */
async function toClear(s3, Bucket, from, manifest) {
  if (clearAll) return { paths: ['/*'], reasons: { all: '--clear-all' } };
  if (!from) return { paths: ['/*'], reasons: { all: 'no package on record' } };
  if (from === manifest.key) return { paths: [], reasons: {} };
  const { Body } = await s3.send(new GetObjectCommand({ Bucket, Key: from }));
  const before = await load(Buffer.from(await Body.transformToByteArray()));
  const after = await load(await fs.readFile(manifest.path));
  const sites = Object.keys(SITES);
  const changed = await changedSites(before, after, await readSamples(), sites);
  const reasons = Object.fromEntries(changed);
  if (changed.size === sites.length) return { paths: ['/*'], reasons };
  return { paths: [...changed.keys()].map((site) => `/${site}/*`), reasons };
}

async function apply() {
  const StackName = config.stacks.cards;
  const manifest = await packageCards();
  console.log(`Package ${manifest.key} (${manifest.size} bytes)`);
  const TemplateBody = await template('cards');
  let stack = await describe(StackName);
  if (stack && !STABLE.test(stack.StackStatus) && !stack.review)
    throw new Error(`${StackName} is ${stack.StackStatus}; run again once it settles`);
  const CertificateArn = await issuedCertificate();

  if (!stack || stack.review) {
    // First the bucket, role and logs, so there is somewhere to upload to.
    const set = await changeSet(StackName, TemplateBody, [], true);
    show(StackName, set);
    if (mode === 'plan') return console.log('The code bucket comes first; apply uploads the zip and plans the rest.');
    await execute(StackName, set, true);
    stack = await describe(StackName);
  }

  const Bucket = output(stack, 'CodeBucket');
  const s3 = new S3Client(settings);
  let Key = parameter(stack, 'CodeKey');
  let Version = parameter(stack, 'CodeVersion');
  const cachedBy = await drawnBy(s3, Bucket, Key);
  const clear = await toClear(s3, Bucket, cachedBy, manifest);
  console.log(
    clear.paths.length
      ? `Cards drawn by ${cachedBy || 'none'}: clear ${clear.paths.join(' ')}`
      : 'Cards: every sample draws the same; nothing to clear',
  );
  for (const [site, reason] of Object.entries(clear.reasons)) console.log(`  ${site}: ${reason}`);
  if (Key !== manifest.key) {
    if (mode === 'plan') {
      console.log(`Code: ${Key || 'none'} -> ${manifest.key} (uploaded at apply)`);
    } else {
      const put = await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: manifest.key,
          Body: await fs.readFile(manifest.path),
          ContentType: 'application/zip',
          ChecksumAlgorithm: 'SHA256',
          ChecksumSHA256: manifest.checksumSha256,
        }),
      );
      if (!put.VersionId) throw new Error(`${Bucket} gave no object version; is versioning on?`);
      ({ Key, Version } = { Key: manifest.key, Version: put.VersionId });
    }
  }
  const Parameters =
    mode === 'plan' && Key !== manifest.key
      ? [
          { ParameterKey: 'CodeKey', UsePreviousValue: true },
          { ParameterKey: 'CodeVersion', UsePreviousValue: true },
          { ParameterKey: 'CertificateArn', ParameterValue: CertificateArn },
        ]
      : [
          { ParameterKey: 'CodeKey', ParameterValue: Key },
          { ParameterKey: 'CodeVersion', ParameterValue: Version },
          { ParameterKey: 'CertificateArn', ParameterValue: CertificateArn },
        ];
  const set = await changeSet(StackName, TemplateBody, Parameters, false);
  show(StackName, set);
  if (mode === 'plan') {
    if (set) await cfn.send(new DeleteChangeSetCommand({ StackName, ChangeSetName: set.ChangeSetName }));
    return;
  }
  if (set) await execute(StackName, set, false);
  stack = await describe(StackName);

  const live = {
    codeBucket: output(stack, 'CodeBucket'),
    functionName: output(stack, 'FunctionName'),
    distributionId: output(stack, 'DistributionId'),
    cloudfrontDomain: output(stack, 'DistributionDomain'),
    certificateArn: CertificateArn || null,
  };
  await fs.writeFile(CONFIG, `${JSON.stringify({ ...config, ...live }, null, 2)}\n`);

  const health = `https://${live.cloudfrontDomain}/health`;
  let reported = null;
  for (let attempt = 0; attempt < 60 && reported !== Key; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 10000));
    try {
      const response = await fetch(health, { signal: AbortSignal.timeout(30000) });
      if (response.ok) reported = (await response.json()).code ?? null;
    } catch {
      // CloudFront is still deploying; try again.
    }
  }
  if (reported !== Key) throw new Error(`${health} reports ${reported}, not ${Key}`);

  let cleared = null;
  if (clear.paths.length) {
    const cloudfront = new CloudFrontClient(settings);
    const { Invalidation } = await cloudfront.send(
      new CreateInvalidationCommand({
        DistributionId: live.distributionId,
        InvalidationBatch: {
          CallerReference: `${Key}@${Date.now()}`,
          Paths: { Quantity: clear.paths.length, Items: clear.paths },
        },
      }),
    );
    console.log(`Clearing ${clear.paths.join(' ')} for ${Key} (invalidation ${Invalidation.Id})`);
    await waitUntilInvalidationCompleted(
      { client: cloudfront, maxWaitTime: 900 },
      { DistributionId: live.distributionId, Id: Invalidation.Id },
    );
    cleared = { id: Invalidation.Id, paths: clear.paths };
  }
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: RECORD,
      Body: `${JSON.stringify({ code: Key, at: new Date().toISOString(), cleared })}\n`,
      ContentType: 'application/json',
    }),
  );
  console.log(JSON.stringify({ stack: StackName, code: Key, cleared, ...live }, null, 2));
}

await (mode === 'certificate' ? certificate() : apply());
