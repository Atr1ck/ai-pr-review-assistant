import { createRightCodeResponse } from '../llm/rightCodeClient.js';
import type { ReviewContext } from './buildReviewContext.js';
import type { ReviewRisk } from './generateDetectRisks.js';

export type ReviewSuggestion = {
  file: string;
  line?: number;
  title: string;
  comment: string;
  suggestedChange: string;
};

type SuggestionResult = {
  suggestions: ReviewSuggestion[];
};

function buildSuggestionPrompt(context: ReviewContext, risks: ReviewRisk[]) {
  return `You are a senior software engineer writing GitHub PR review comments.

Generate practical review suggestions based on the PR context and detected risks.

Return ONLY valid JSON in this exact shape:
{
  "suggestions": [
    {
      "file": "file path",
      "line": 123,
      "title": "short title",
      "comment": "review comment",
      "suggestedChange": "specific suggested change"
    }
  ]
}

Rules:
- Only suggest changes supported by the diff context.
- Prefer high-signal suggestions over many generic comments.
- Maximum 6 suggestions.
- If no useful suggestion is found, return {"suggestions":[]}.
- line is optional. Omit it if you cannot infer a reliable line number.
- Comments should be concise and suitable for a GitHub PR review.
- Avoid repeating the exact same content as detected risks.
- use Chinese for the response.

Detected risks:
${JSON.stringify(risks, null, 2)}

Review context:
${JSON.stringify(
  {
    pr: context.pr,
    stats: context.stats,
    warnings: context.warnings,
    files: context.files
      .filter((file) => !file.ignored)
      .slice(0, 15)
      .map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch.slice(0, 4000),
      })),
  },
  null,
  2,
)}`;
}

function safeJsonParse(text: string): SuggestionResult {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as SuggestionResult;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as SuggestionResult;
    }

    throw new Error('Failed to parse review suggestions JSON');
  }
}

export async function generateReviewSuggestions(
  context: ReviewContext,
  risks: ReviewRisk[],
) {
  const raw = await createRightCodeResponse({
    prompt: buildSuggestionPrompt(context, risks),
  });

  const parsed = safeJsonParse(raw);

  return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
}