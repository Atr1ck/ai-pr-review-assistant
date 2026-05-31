import { createRightCodeResponse } from '../llm/rightCodeClient.js';
import { buildReviewLoopPrompt } from './reviewLoopPrompt.js';
import { parseReviewLoopAction } from './parseReviewLoopAction.js';
import {
  REVIEW_LOOP_LIMITS,
  type ReviewLoopAction,
  type ReviewLoopRisk,
  type ReviewLoopState,
  type ReviewLoopSuggestion,
} from './reviewLoopTypes.js';
import type { ReviewContext } from './buildReviewContext.js';

export type ReviewLoopResult = {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  risks: ReviewLoopRisk[];
  suggestions: ReviewLoopSuggestion[];
};

type RunReviewLoopInput = {
  context: ReviewContext;
  onAction?: (action: ReviewLoopAction, state: ReviewLoopState) => void;
};

function getHighestRiskLevel(risks: ReviewLoopRisk[]) {
  if (risks.some((risk) => risk.level === 'high')) {
    return 'high';
  }

  if (risks.some((risk) => risk.level === 'medium')) {
    return 'medium';
  }

  return 'low';
}

function buildFallbackSummary(state: ReviewLoopState) {
  return `Review loop reached its iteration limit after inspecting ${state.inspectedFiles.length} file(s). It found ${state.risks.length} risk(s) before stopping.`;
}

function createInitialState(context: ReviewContext): ReviewLoopState {
  return {
    context,
    iteration: 0,
    inspectedFiles: [],
    risks: [],
    suggestions: [],
    messages: [],
  };
}

function applyAction(
  state: ReviewLoopState,
  action: ReviewLoopAction,
): ReviewLoopState {
  if (action.type === 'inspect_files') {
    const nextFiles = action.files.filter(
      (file) => !state.inspectedFiles.includes(file),
    );

    return {
      ...state,
      inspectedFiles: [...state.inspectedFiles, ...nextFiles],
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Inspect files: ${nextFiles.join(', ')}. Reason: ${action.reason}`,
        },
      ],
    };
  }

  if (action.type === 'record_risk') {
    if (state.risks.some((risk) => risk.id === action.risk.id)) {
      return state;
    }

    return {
      ...state,
      risks: [...state.risks, action.risk],
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Record risk: ${action.risk.title}`,
        },
      ],
    };
  }

  if (action.type === 'record_suggestion') {
    if (
      state.suggestions.some(
        (suggestion) => suggestion.id === action.suggestion.id,
      )
    ) {
      return state;
    }

    return {
      ...state,
      suggestions: [...state.suggestions, action.suggestion],
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Record suggestion: ${action.suggestion.title}`,
        },
      ],
    };
  }

  return state;
}

function shouldForceFinish(state: ReviewLoopState) {
  return (
    state.iteration >= REVIEW_LOOP_LIMITS.maxIterations ||
    state.risks.length >= REVIEW_LOOP_LIMITS.maxRisks ||
    state.suggestions.length >= REVIEW_LOOP_LIMITS.maxSuggestions
  );
}

export async function runReviewLoop({
  context,
  onAction,
}: RunReviewLoopInput): Promise<ReviewLoopResult> {
  let state = createInitialState(context);

  while (state.iteration < REVIEW_LOOP_LIMITS.maxIterations) {
    const prompt = buildReviewLoopPrompt(state);
    const rawAction = await createRightCodeResponse({ prompt });
    const action = parseReviewLoopAction(rawAction, state);

    onAction?.(action, state);

    if (action.type === 'finish') {
      return {
        summary: action.summary,
        riskLevel: action.riskLevel,
        risks: state.risks,
        suggestions: state.suggestions,
      };
    }

    state = applyAction(state, action);

    state = {
      ...state,
      iteration: state.iteration + 1,
    };

    if (shouldForceFinish(state)) {
      break;
    }
  }

  return {
    summary: buildFallbackSummary(state),
    riskLevel: getHighestRiskLevel(state.risks),
    risks: state.risks,
    suggestions: state.suggestions,
  };
}
