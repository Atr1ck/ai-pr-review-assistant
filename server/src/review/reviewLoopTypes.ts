import type { ReviewContext } from './buildReviewContext.js';

export type ReviewRiskLevel = 'low' | 'medium' | 'high';

export type ReviewLoopRisk = {
  id: string;
  file: string;
  level: ReviewRiskLevel;
  type: string;
  title: string;
  reason: string;
};

export type ReviewLoopSuggestion = {
  id: string;
  riskId: string;
  file: string;
  title: string;
  comment: string;
  suggestedChange: string;
};

export type ReviewLoopAction =
  | {
      type: 'inspect_files';
      files: string[];
      reason: string;
    }
  | {
      type: 'record_risk';
      risk: ReviewLoopRisk;
    }
  | {
      type: 'record_suggestion';
      suggestion: ReviewLoopSuggestion;
    }
  | {
      type: 'finish';
      summary: string;
      riskLevel: ReviewRiskLevel;
    };

export type ReviewLoopMessage = {
  role: 'system' | 'assistant' | 'tool';
  content: string;
};

export type ReviewLoopState = {
  context: ReviewContext;
  iteration: number;
  inspectedFiles: string[];
  risks: ReviewLoopRisk[];
  suggestions: ReviewLoopSuggestion[];
  messages: ReviewLoopMessage[];
};

export const REVIEW_LOOP_LIMITS = {
  maxIterations: 10,
  maxRisks: 6,
  maxSuggestions: 6,
  maxFilesPerInspection: 7,
} as const;

export function getMaxInspectedFiles(totalFiles: number) {
  if (totalFiles <= 6) {
    return totalFiles;
  }

  if (totalFiles <= 15) {
    return 10;
  }

  if (totalFiles <= 40) {
    return 15;
  }

  return 20;
}
