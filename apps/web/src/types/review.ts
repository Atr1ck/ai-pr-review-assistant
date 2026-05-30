export type ReviewContextFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  truncated: boolean;
  ignored: boolean;
  ignoreReason?: string;
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