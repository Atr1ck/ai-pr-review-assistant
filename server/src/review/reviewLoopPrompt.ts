import {
  REVIEW_LOOP_LIMITS,
  type ReviewLoopState,
} from './reviewLoopTypes.js';

function buildAvailableFiles(state: ReviewLoopState) {
  return state.context.files
    .filter((file) => !file.ignored)
    .slice(0, 20)
    .map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      inspected: state.inspectedFiles.includes(file.filename),
    }));
}

function buildInspectedFilePatches(state: ReviewLoopState) {
  return state.context.files
    .filter((file) => state.inspectedFiles.includes(file.filename))
    .map((file) => ({
      filename: file.filename,
      patch: file.patch.slice(0, 5000),
    }));
}

export function buildReviewLoopPrompt(state: ReviewLoopState) {
  return `You are an AI engineer reviewing a GitHub pull request.

You must choose exactly ONE next action.

Return ONLY valid JSON. Do not include markdown.

Available actions:

1. Inspect a file:
{
  "type": "inspect_file",
  "file": "path/to/file.ts",
  "reason": "why this file should be inspected"
}

2. Record a risk:
{
  "type": "record_risk",
  "risk": {
    "id": "risk-1",
    "file": "path/to/file.ts",
    "level": "low" | "medium" | "high",
    "type": "security | authorization | null-safety | exception | breaking-change | complexity | other",
    "title": "short risk title",
    "reason": "concrete reason supported by the diff"
  }
}

3. Record a review suggestion:
{
  "type": "record_suggestion",
  "suggestion": {
    "id": "suggestion-1",
    "riskId": "risk-1",
    "file": "path/to/file.ts",
    "title": "short suggestion title",
    "comment": "GitHub PR review comment",
    "suggestedChange": "specific suggested change"
  }
}

4. Finish review:
{
  "type": "finish",
  "summary": "concise review summary",
  "riskLevel": "low" | "medium" | "high"
}

Rules:
- Choose only one action.
- Do not invent files.
- Inspect a file before recording a risk for it.
- Suggestions must reference an existing riskId.
- Do not create suggestions without risks.
- Prefer false negatives over false positives.
- Finish if there is not enough evidence for more risks.
- Maximum iterations: ${REVIEW_LOOP_LIMITS.maxIterations}
- Maximum inspected files: ${REVIEW_LOOP_LIMITS.maxInspectedFiles}
- Maximum risks: ${REVIEW_LOOP_LIMITS.maxRisks}
- Maximum suggestions: ${REVIEW_LOOP_LIMITS.maxSuggestions}
- Use Chinese for the response.

Current state:
${JSON.stringify(
  {
    iteration: state.iteration,
    pr: state.context.pr,
    stats: state.context.stats,
    warnings: state.context.warnings,
    availableFiles: buildAvailableFiles(state),
    inspectedFilePatches: buildInspectedFilePatches(state),
    inspectedFiles: state.inspectedFiles,
    risks: state.risks,
    suggestions: state.suggestions,
  },
  null,
  2,
)}`;
}