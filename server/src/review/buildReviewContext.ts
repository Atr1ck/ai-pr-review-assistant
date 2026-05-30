import { getPullRequestFiles } from '../github/getPullRequestFiles.js';
import { getPullRequestMetadata } from '../github/getPullRequestMetadata.js';

const MAX_PATCH_CHARS_PER_FILE = 10000;

const IGNORED_FILE_PATTERNS = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'dist/',
  'build/',
  '.min.js',
];

type BuildReviewContextInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type ReviewContextFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  truncated: boolean;
  ignored: boolean;
  ignoreReason?: string | undefined;
};

export type ReviewContext = {
  pr: {
    owner: string;
    repo: string;
    pullNumber: number;
    title: string;
    description: string;
    author: string | null;
    state: string;
    htmlUrl: string;
    baseBranch: string;
    headBranch: string;
    headSha: string;
    additions: number;
    deletions: number;
    changedFiles: number;
  };
  files: ReviewContextFile[];
  stats: {
    totalFiles: number;
    includedFiles: number;
    ignoredFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    totalChanges: number;
    largeChange: boolean;
  };
  warnings: string[];
};

function getIgnoreReason(filename: string) {
  const matchedPattern = IGNORED_FILE_PATTERNS.find((pattern) =>
    filename.includes(pattern),
  );

  if (!matchedPattern) {
    return null;
  }

  return `Ignored by pattern: ${matchedPattern}`;
}

function truncatePatch(patch: string) {
  if (patch.length <= MAX_PATCH_CHARS_PER_FILE) {
    return {
      patch,
      truncated: false,
    };
  }

  return {
    patch: `${patch.slice(0, MAX_PATCH_CHARS_PER_FILE)}\n\n[Patch truncated for review context]`,
    truncated: true,
  };
}

export async function buildReviewContext({
  owner,
  repo,
  pullNumber,
}: BuildReviewContextInput): Promise<ReviewContext> {
  const [metadata, files] = await Promise.all([
    getPullRequestMetadata({ owner, repo, pullNumber }),
    getPullRequestFiles({ owner, repo, pullNumber }),
  ]);

  const warnings: string[] = [];

  const contextFiles = files.map((file) => {
    const ignoreReason = getIgnoreReason(file.filename);
    const ignored = Boolean(ignoreReason);
    const { patch, truncated } = truncatePatch(file.patch);

    if (truncated) {
      warnings.push(`Patch truncated: ${file.filename}`);
    }

    if (ignored && ignoreReason) {
      warnings.push(`${file.filename}: ${ignoreReason}`);
    }

    return {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: ignored ? '' : patch,
      truncated,
      ignored,
      ignoreReason: ignoreReason ?? undefined,
    };
  });

  const includedFiles = contextFiles.filter((file) => !file.ignored);
  const totalChanges = files.reduce((sum, file) => sum + file.changes, 0);
  const largeChange =
    metadata.changedFiles >= 20 ||
    metadata.additions + metadata.deletions >= 800;

  if (largeChange) {
    warnings.push('Large PR detected. Review may need file-level prioritization.');
  }

  return {
    pr: {
      owner,
      repo,
      pullNumber,
      title: metadata.title,
      description: metadata.description,
      author: metadata.author?.login ?? null,
      state: metadata.state,
      htmlUrl: metadata.htmlUrl,
      baseBranch: metadata.baseBranch,
      headBranch: metadata.headBranch,
      headSha: metadata.headSha,
      additions: metadata.additions,
      deletions: metadata.deletions,
      changedFiles: metadata.changedFiles,
    },
    files: contextFiles,
    stats: {
      totalFiles: contextFiles.length,
      includedFiles: includedFiles.length,
      ignoredFiles: contextFiles.length - includedFiles.length,
      totalAdditions: metadata.additions,
      totalDeletions: metadata.deletions,
      totalChanges,
      largeChange,
    },
    warnings,
  };
}