import { createRightCodeResponse } from '../llm/rightCodeClient.js';
import type { ReviewContext } from './buildReviewContext.js';

function buildSummaryContext(context: ReviewContext) {
  return {
    pr: context.pr,
    stats: context.stats,
    warnings: context.warnings,
    files: context.files
      .filter((file) => !file.ignored)
      .slice(0, 12)
      .map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch.slice(0, 4000),
      })),
  };
}

export async function generatePrSummary(context: ReviewContext) {
  const prompt = `You are a senior software engineer reviewing a GitHub pull request.

Generate a concise PR summary based only on the provided PR metadata and diff context.

Requirements:
- Explain what this PR changes.
- Mention the main affected modules.
- Mention important implementation details.
- Mention whether the change size looks small, medium, or large.
- Do not invent risks or review suggestions yet.
- Keep it under 180 words.
- Write in Chinese.

Review context:
${JSON.stringify(buildSummaryContext(context), null, 2)}`;

  return createRightCodeResponse({ prompt });
}