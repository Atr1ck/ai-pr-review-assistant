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

function getRisksWithoutSuggestions(state: ReviewLoopState) {
  const suggestedRiskIds = new Set(
    state.suggestions.map((suggestion) => suggestion.riskId),
  );

  return state.risks.filter((risk) => !suggestedRiskIds.has(risk.id));
}

function hasNoFindingReviewChallenge(state: ReviewLoopState) {
  return state.messages.some((message) =>
    message.content.includes('no-finding-review-challenge'),
  );
}

function shouldChallengeNoFindingFinish(
  state: ReviewLoopState,
  action: ReviewLoopAction,
) {
  return (
    action.type === 'finish' &&
    state.inspectedFiles.length > 0 &&
    state.risks.length === 0 &&
    !hasNoFindingReviewChallenge(state) &&
    state.iteration < REVIEW_LOOP_LIMITS.maxIterations - 1
  );
}

function addNoFindingReviewChallenge(state: ReviewLoopState): ReviewLoopState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        role: 'tool',
        content:
          'no-finding-review-challenge: You are about to finish with zero risks after inspecting files. Re-check the inspected patches for concrete low or medium severity review findings, such as brittle error handling, missing validation, missing tests for changed behavior, API contract issues, or fragile state ordering. If there are still no supported findings, finish again and explain that no actionable findings were found.',
      },
    ],
  };
}

function shouldChallengeMissingSuggestionsFinish(
  state: ReviewLoopState,
  action: ReviewLoopAction,
) {
  return (
    action.type === 'finish' &&
    getRisksWithoutSuggestions(state).length > 0 &&
    state.iteration < REVIEW_LOOP_LIMITS.maxIterations - 1
  );
}

function addMissingSuggestionsChallenge(
  state: ReviewLoopState,
): ReviewLoopState {
  const risksWithoutSuggestions = getRisksWithoutSuggestions(state);

  return {
    ...state,
    messages: [
      ...state.messages,
      {
        role: 'tool',
        content: `missing-suggestions-challenge: You are trying to finish while some risks do not have related suggestions. Generate record_suggestion actions for these risks before finishing. Risks without suggestions: ${JSON.stringify(
          risksWithoutSuggestions,
          null,
          2,
        )}`,
      },
    ],
  };
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
      if (shouldChallengeNoFindingFinish(state, action)) {
        state = addNoFindingReviewChallenge(state);
        state = {
          ...state,
          iteration: state.iteration + 1,
        };
        continue;
      }

      if (shouldChallengeMissingSuggestionsFinish(state, action)) {
        state = addMissingSuggestionsChallenge(state);
        state = {
          ...state,
          iteration: state.iteration + 1,
        };
        continue;
      }

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
