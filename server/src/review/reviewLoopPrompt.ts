import {
  REVIEW_LOOP_LIMITS,
  getMaxInspectedFiles,
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
  const reviewableFileCount = state.context.files.filter(
    (file) => !file.ignored,
  ).length;
  const maxInspectedFiles = getMaxInspectedFiles(reviewableFileCount);
  const remainingInspectionSlots = Math.max(
    maxInspectedFiles - state.inspectedFiles.length,
    0,
  );
  const canInspectMore = remainingInspectionSlots > 0;

  return `You are an AI engineer reviewing a GitHub pull request.

You must choose exactly ONE next action.

Return ONLY valid JSON. Do not include markdown.

Available actions:

1. Inspect a batch of files:
{
  "type": "inspect_files",
  "files": ["path/to/file.ts", "path/to/another-file.ts"],
  "reason": "why these files should be inspected"
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
- Inspect files before recording risks for them.
- Suggestions must reference an existing riskId.
- Do not create suggestions without risks.
- Prefer false negatives over false positives.
- Finish if there is not enough evidence for more risks.
- Use inspect_files to inspect a batch of important files.
- Prefer files with large changes, auth/security logic, API boundaries, data model changes, error handling, or deleted logic.
- For small PRs, inspect all reviewable files.
- For large PRs, prioritize high-risk files and mention coverage limits in the finish summary.
- You may inspect at most ${REVIEW_LOOP_LIMITS.maxFilesPerInspection} files in one inspect_files action.
- Reviewable files: ${reviewableFileCount}
- Maximum files to inspect for this PR: ${maxInspectedFiles}
- Remaining inspection slots: ${remainingInspectionSlots}
${canInspectMore
  ? '- You may inspect more files if they are likely to contain risk.'
  : '- You have reached the file inspection limit. Do not use inspect_files anymore. You must record_risk, record_suggestion, or finish.'}
- Maximum iterations: ${REVIEW_LOOP_LIMITS.maxIterations}
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
