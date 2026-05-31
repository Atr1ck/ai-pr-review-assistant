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

export type ReviewPipelineStepStatus = 'idle' | 'running' | 'completed';

export type ReviewPipelineStep = {
  id: string;
  label: string;
  status: ReviewPipelineStepStatus;
  message?: string;
};

export type ReviewRisk = {
  file: string;
  level: 'low' | 'medium' | 'high';
  type: string;
  title: string;
  reason: string;
};

export type ReviewSuggestion = {
  file: string;
  line?: number;
  riskTitle: string;
  title: string;
  comment: string;
  suggestedChange: string;
};

export type ReviewResult = {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  changedModules: string[];
  risks: ReviewRisk[];
  suggestions: ReviewSuggestion[];
};

export type ReviewPipelineEvent =
  | {
      type: 'step';
      step: string;
      status: 'running' | 'completed';
      message: string;
    }
  | {
      type: 'result';
      result: ReviewResult;
    }
  | {
      type: 'loop_action';
      action: unknown;
    }
  | {
      type: 'done';
    }
  | {
      type: 'error';
      error: string;
    }
  | {
    type: 'heartbeat';
    message: string;
    elapsedSeconds: number;
  };
