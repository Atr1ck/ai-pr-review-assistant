export type ParsedPRInfo = {
    owner: string;
    repo: string;
    prNumber: number;
};

export type PullRequestMetadata = {
  title: string;
  description: string;
  author: {
    login: string;
    avatarUrl: string;
    htmlUrl: string;
  } | null;
  state: string;
  htmlUrl: string;
  baseBranch: string;
  headBranch: string;
  headSha: string;
  additions: number;
  deletions: number;
  changedFiles: number;
};

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  blobUrl: string;
  rawUrl: string;
  contentsUrl: string;
};