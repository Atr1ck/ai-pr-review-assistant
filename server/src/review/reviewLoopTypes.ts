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
      type: 'inspect_file';
      file: string;
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
  maxIterations: 6,
  maxInspectedFiles: 3,
  maxRisks: 5,
  maxSuggestions: 5,
} as const;