import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { currentRelease, validateCurrentRelease } from './current-release.mjs';
import { fail, repositoryRoot } from './release-utils.mjs';

const PACKAGE_DIRECTORIES = [currentRelease.packageName];
const EXPECTED_PACKAGE_NAMES = [currentRelease.packageName];
const EXPECTED_REMOTE =
  /^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/git@github\.com\/)iiwish\/tellplot(?:\.git)?$/u;
const CANONICAL_REMOTE_QUERY_URL = 'https://github.com/iiwish/tellplot.git';
const OFFICIAL_NPM_REGISTRY = currentRelease.registry;
const REMOTE_QUERY_ENVIRONMENT_KEYS = [
  'PATH',
  'PATHEXT',
  'SystemRoot',
  'SYSTEMROOT',
  'WINDIR',
  'COMSPEC',
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'ALL_PROXY',
  'all_proxy',
  'NO_PROXY',
  'no_proxy',
];
const NULL_DEVICE = process.platform === 'win32' ? 'NUL' : '/dev/null';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isCommit(value) {
  return /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u.test(clean(value));
}

export function normalizeNpmRegistry(value) {
  try {
    const registry = new URL(clean(value));
    if (
      registry.protocol !== 'https:' ||
      registry.username !== '' ||
      registry.password !== '' ||
      registry.pathname !== '/' ||
      registry.search !== '' ||
      registry.hash !== ''
    ) {
      return undefined;
    }
    return `${registry.origin}/`;
  } catch {
    return undefined;
  }
}

function releaseVersion(packageManifests) {
  const versions = packageManifests.map(manifest => clean(manifest?.version));
  return versions.length === EXPECTED_PACKAGE_NAMES.length &&
    versions.every(version => version === versions[0]) &&
    versions[0] === currentRelease.version
    ? versions[0]
    : undefined;
}

function artifactFilename(name, version) {
  return `${name.replace(/^@/u, '').replaceAll('/', '-')}-${version}.tgz`;
}

function validatePackages(packageManifests, findings) {
  const packageNames = packageManifests.map(manifest => manifest?.name);
  if (JSON.stringify(packageNames) !== JSON.stringify(EXPECTED_PACKAGE_NAMES)) {
    findings.push('release packages must contain only tellplot');
  }
  const version = releaseVersion(packageManifests);
  if (version !== currentRelease.version) {
    findings.push(`the public tellplot package must use ${currentRelease.version}`);
  }
  for (const manifest of packageManifests) {
    if (
      manifest?.publishConfig?.access !== 'public' ||
      manifest?.publishConfig?.registry !== OFFICIAL_NPM_REGISTRY
    ) {
      findings.push(
        `${clean(manifest?.name) || 'unknown package'} must publish publicly through the official npm registry`,
      );
    }
  }
  return version;
}

function validateArtifacts(state, packageManifests, version, release, findings) {
  const manifest = state.artifactManifest;
  if (
    manifest === null ||
    typeof manifest !== 'object' ||
    manifest.version !== version ||
    !Array.isArray(manifest.packages)
  ) {
    findings.push(
      `${release.evidenceTask} release artifact manifest is missing, invalid, or version-mismatched`,
    );
    return;
  }
  if (
    manifest.evidenceTask !== release.evidenceTask ||
    manifest.nodeVersion !== release.nodeVersion
  ) {
    findings.push('release artifact manifest evidence task does not match the descriptor');
  }
  if (
    JSON.stringify(manifest.packages.map(entry => entry?.name)) !==
    JSON.stringify(EXPECTED_PACKAGE_NAMES)
  ) {
    findings.push('release artifact manifest must contain exactly the tellplot package');
  }

  const artifactFiles = Array.isArray(state.artifactFiles) ? state.artifactFiles : [];
  for (let index = 0; index < packageManifests.length; index += 1) {
    const packageManifest = packageManifests[index];
    const name = clean(packageManifest?.name);
    const packageVersion = clean(packageManifest?.version);
    const filename = artifactFilename(name, packageVersion);
    const manifestEntry = manifest.packages[index];
    if (
      manifestEntry?.name !== name ||
      manifestEntry?.version !== packageVersion ||
      manifestEntry?.filename !== filename ||
      !Number.isSafeInteger(manifestEntry?.sizeBytes) ||
      manifestEntry.sizeBytes <= 0 ||
      !/^[0-9a-f]{64}$/u.test(clean(manifestEntry?.sha256))
    ) {
      findings.push(`release artifact manifest entry is invalid for ${name || filename}`);
      continue;
    }
    if (
      manifestEntry.filename !== release.artifact.filename ||
      manifestEntry.sizeBytes !== release.artifact.sizeBytes ||
      manifestEntry.sha256 !== release.artifact.sha256
    ) {
      findings.push(`release artifact descriptor does not match for ${name}`);
    }

    const artifact = artifactFiles.find(candidate => candidate?.filename === filename);
    if (artifact === undefined) {
      findings.push(`release artifact is missing for ${name}`);
      continue;
    }
    if (
      artifact.sizeBytes !== manifestEntry.sizeBytes ||
      artifact.sha256 !== manifestEntry.sha256
    ) {
      findings.push(`release artifact integrity does not match for ${name}`);
    }
  }
}

export function validatePublicReleaseState(state) {
  const findings = [];
  const release = state.releaseDescriptor ?? currentRelease;
  findings.push(...validateCurrentRelease(release));
  const packageManifests = Array.isArray(state.packageManifests) ? state.packageManifests : [];
  const version = validatePackages(packageManifests, findings);
  validateArtifacts(state, packageManifests, version, release, findings);

  const expectedTag = version === undefined ? undefined : release.tag;
  if (clean(state.status) !== '') {
    findings.push('public release worktree and index must be clean, including untracked files');
  }
  if (!isCommit(state.head)) {
    findings.push('public release HEAD must be a committed Git object');
  }
  if (expectedTag === undefined || state.tag !== expectedTag) {
    findings.push(`public release tag must exactly match ${expectedTag ?? 'the package version'}`);
  }
  if (!isCommit(state.tagCommit) || state.tagCommit !== state.head) {
    findings.push('public release tag must resolve to HEAD');
  }
  if (
    !isCommit(state.tagObject) ||
    state.tagObjectType !== 'tag' ||
    state.tagObject === state.tagCommit
  ) {
    findings.push('public release tag must be an annotated tag object');
  }
  if (
    !isCommit(state.remoteTagObject) ||
    !isCommit(state.remoteTagCommit) ||
    state.remoteTagObject === state.remoteTagCommit
  ) {
    findings.push('the remote release tag must expose an annotated object and peeled commit');
  } else if (state.remoteTagObject !== state.tagObject) {
    findings.push('the remote release tag object must exactly match the local annotated tag');
  }
  if (!isCommit(state.remoteMainCommit) || state.remoteMainCommit !== state.head) {
    findings.push('public release HEAD must exactly match origin/main');
  }
  if (!EXPECTED_REMOTE.test(clean(state.remoteUrl))) {
    findings.push('origin must be the canonical iiwish/tellplot GitHub repository');
  }
  if (clean(state.nodeVersion) !== release.nodeVersion) {
    findings.push(`public release requires exact Node ${release.nodeVersion}`);
  }
  if (clean(state.npmVersion) !== release.npmVersion) {
    findings.push(`public release requires exact npm ${release.npmVersion}`);
  }
  if (normalizeNpmRegistry(state.npmRegistry) !== OFFICIAL_NPM_REGISTRY) {
    findings.push(`npm config registry must resolve to ${OFFICIAL_NPM_REGISTRY}`);
  }

  if (state.mode === 'local') {
    if (state.branch !== 'main') {
      findings.push('local public preflight must run from main');
    }
    if (state.upstream !== 'origin/main') {
      findings.push('local public preflight main must track origin/main');
    }
    if (!isCommit(state.upstreamCommit) || state.upstreamCommit !== state.head) {
      findings.push('local public preflight HEAD must match its upstream commit');
    }
    if (!isCommit(state.remoteTagCommit) || state.remoteTagCommit !== state.head) {
      findings.push('the exact release tag must already exist on origin and resolve to HEAD');
    }
  } else if (state.mode === 'ci') {
    if (state.githubActions !== 'true') {
      findings.push('public publishing preflight only supports GitHub Actions');
    }
    if (state.runnerEnvironment !== 'github-hosted') {
      findings.push('npm Trusted Publishing requires a GitHub-hosted runner');
    }
    if (state.eventName !== 'workflow_dispatch') {
      findings.push('public publishing requires an explicit workflow_dispatch invocation');
    }
    if (state.refType !== 'tag' || state.refName !== expectedTag) {
      findings.push(`public publishing must run from the exact ${expectedTag ?? 'version'} tag`);
    }
    if (!isCommit(state.sha) || state.sha !== state.head) {
      findings.push('GitHub Actions release SHA must match the checked-out HEAD');
    }
    if (
      !isCommit(state.remoteTagCommit) ||
      state.remoteTagCommit !== state.head ||
      state.remoteTagCommit !== state.sha
    ) {
      findings.push(
        'the exact remote release tag must resolve to the checked-out HEAD and GitHub Actions SHA',
      );
    }
    if (state.repository !== 'iiwish/tellplot') {
      findings.push('public publishing must run in the canonical iiwish/tellplot repository');
    }
    if (state.visibility !== 'public') {
      findings.push('npm provenance requires a public repository');
    }
    if (state.workflowRef !== `${release.workflow}@refs/tags/${expectedTag}`) {
      findings.push('public publishing must run the trusted publish-npm.yml workflow from the tag');
    }
    const confirmation = `stage ${release.version} stage-only-trusted-publishers-verified`;
    if (state.confirmation !== confirmation) {
      findings.push(`release confirmation must exactly equal "${confirmation}"`);
    }
  } else {
    findings.push('public release preflight mode must be local or ci');
  }

  return findings;
}

function command(name, args, root, environment) {
  const result = spawnSync(name, args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...environment,
      GIT_TERMINAL_PROMPT: '0',
    },
    timeout: 30_000,
  });
  return result.status === 0 ? clean(result.stdout) : undefined;
}

export function createRemoteQueryEnvironment(environment) {
  const isolated = {};
  for (const key of REMOTE_QUERY_ENVIRONMENT_KEYS) {
    if (typeof environment?.[key] === 'string') {
      isolated[key] = environment[key];
    }
  }
  return {
    ...isolated,
    GIT_CONFIG_GLOBAL: NULL_DEVICE,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
  };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function packageManifests(root) {
  return PACKAGE_DIRECTORIES.map(directory =>
    readJson(resolve(root, 'packages', directory, 'package.json')),
  );
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function artifactState(root, manifests, version, release) {
  const artifactFiles = [];
  if (version !== undefined) {
    for (const manifest of manifests) {
      const filename = artifactFilename(clean(manifest?.name), version);
      const path = resolve(root, release.artifactRoot, filename);
      try {
        if (!existsSync(path)) {
          continue;
        }
        artifactFiles.push({
          filename,
          sizeBytes: statSync(path).size,
          sha256: sha256(path),
        });
      } catch {
        // An unreadable artifact is reported as missing without leaking its local path.
      }
    }
  }
  return {
    artifactManifest: readJson(resolve(root, release.manifestPath)),
    artifactFiles,
  };
}

function remoteTagState(gitCommand, remoteQueryUrl, tag) {
  const output = gitCommand([
    'ls-remote',
    '--exit-code',
    '--tags',
    remoteQueryUrl,
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`,
  ]);
  const entries = output
    ?.split(/\r?\n/u)
    .map(line => line.split(/\s+/u))
    .filter(parts => parts.length === 2);
  return {
    object: entries?.find(([, ref]) => ref === `refs/tags/${tag}`)?.[0],
    commit: entries?.find(([, ref]) => ref === `refs/tags/${tag}^{}`)?.[0],
  };
}

function remoteMainCommit(gitCommand, remoteQueryUrl) {
  const output = gitCommand([
    'ls-remote',
    '--exit-code',
    '--refs',
    remoteQueryUrl,
    'refs/heads/main',
  ]);
  const [commit, ref] = output?.split(/\s+/u) ?? [];
  return ref === 'refs/heads/main' ? commit : undefined;
}

export function collectPublicReleaseState(mode, options = {}) {
  const root = options.repositoryRoot ?? repositoryRoot;
  const environment = options.env ?? process.env;
  const commandRunner = (name, args) => command(name, args, root, environment);
  const gitCommand = args => commandRunner('git', args);
  const remoteQueryUrl =
    options.repositoryRoot === undefined
      ? CANONICAL_REMOTE_QUERY_URL
      : (options.remoteQueryUrl ?? CANONICAL_REMOTE_QUERY_URL);
  const remoteGitCommand = args =>
    command('git', args, tmpdir(), createRemoteQueryEnvironment(environment));
  const releaseDescriptor = options.releaseDescriptor ?? currentRelease;
  const descriptorFindings = validateCurrentRelease(releaseDescriptor);
  if (descriptorFindings.length > 0) {
    throw new Error(
      `Invalid release descriptor for public preflight: ${descriptorFindings.join('; ')}`,
    );
  }
  const manifests = packageManifests(root);
  const version = releaseVersion(manifests);
  const tag = version === undefined ? '' : `v${version}`;
  const head = gitCommand(['rev-parse', '--verify', 'HEAD']);
  const remoteUrl = gitCommand(['config', '--get', 'remote.origin.url']);
  const canonicalRemote = EXPECTED_REMOTE.test(clean(remoteUrl));
  const remoteTag = canonicalRemote
    ? remoteTagState(remoteGitCommand, remoteQueryUrl, tag)
    : { object: undefined, commit: undefined };
  const common = {
    mode,
    releaseDescriptor,
    packageManifests: manifests,
    ...artifactState(root, manifests, version, releaseDescriptor),
    status:
      gitCommand(['status', '--porcelain=v1', '--untracked-files=all']) ?? 'git status unavailable',
    head,
    tag,
    tagObject: gitCommand(['rev-parse', '--verify', `refs/tags/${tag}`]),
    tagObjectType: gitCommand(['cat-file', '-t', `refs/tags/${tag}`]),
    tagCommit: gitCommand(['rev-parse', '--verify', `${tag}^{commit}`]),
    remoteMainCommit: canonicalRemote
      ? remoteMainCommit(remoteGitCommand, remoteQueryUrl)
      : undefined,
    remoteTagObject: remoteTag.object,
    remoteTagCommit: remoteTag.commit,
    remoteUrl,
    nodeVersion: process.versions.node,
    npmVersion: options.npmVersion ?? commandRunner('npm', ['--version']),
    npmRegistry: options.npmRegistry ?? commandRunner('npm', ['config', 'get', 'registry']),
  };

  if (mode === 'ci') {
    return {
      ...common,
      githubActions: environment['GITHUB_ACTIONS'],
      runnerEnvironment: environment['RUNNER_ENVIRONMENT'],
      eventName: environment['GITHUB_EVENT_NAME'],
      refType: environment['GITHUB_REF_TYPE'],
      refName: environment['GITHUB_REF_NAME'],
      sha: environment['GITHUB_SHA'],
      repository: environment['GITHUB_REPOSITORY'],
      visibility: environment['TELLPLOT_REPOSITORY_VISIBILITY'],
      workflowRef: environment['GITHUB_WORKFLOW_REF'],
      confirmation: environment['TELLPLOT_RELEASE_CONFIRMATION'],
    };
  }

  return {
    ...common,
    branch: gitCommand(['symbolic-ref', '--quiet', '--short', 'HEAD']),
    upstream: gitCommand(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']),
    upstreamCommit: gitCommand(['rev-parse', '--verify', '@{upstream}^{commit}']),
  };
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.length === 0 ? 'local' : args.length === 1 && args[0] === '--ci' ? 'ci' : '';
  if (mode === '') {
    fail('TellPlot public release preflight failed', [
      `unsupported arguments: ${args.join(' ') || '(none)'}`,
    ]);
    return;
  }

  const state = collectPublicReleaseState(mode);
  const findings = validatePublicReleaseState(state);
  if (findings.length > 0) {
    fail('TellPlot public release preflight failed', findings);
    return;
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        mode,
        version: releaseVersion(state.packageManifests),
        tag: state.tag,
        commit: state.head,
        packages: state.packageManifests.map(manifest => manifest.name),
      },
      null,
      2,
    )}\n`,
  );
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main();
}
