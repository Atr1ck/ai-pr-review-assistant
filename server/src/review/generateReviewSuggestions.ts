import { createRightCodeResponse } from '../llm/rightCodeClient.js';
import type { ReviewRisk } from './generateDetectRisks.js';

export type ReviewSuggestion = {
  file: string;
  line?: number;
  riskTitle: string;
  title: string;
  comment: string;
  suggestedChange: string;
};

type SuggestionResult = {
  suggestions: ReviewSuggestion[];
};

function buildSuggestionPrompt(risks: ReviewRisk[]) {
  return `You are a senior software engineer writing GitHub PR review comments.

Generate practical review suggestions based ONLY on the detected risks below.

Return ONLY valid JSON in this exact shape:
{
  "suggestions": [
    {
      "file": "file path",
      "line": 123,
      "riskTitle": "the related risk title",
      "title": "short suggestion title",
      "comment": "review comment",
      "suggestedChange": "specific suggested change"
    }
  ]
}

Rules:
- Every suggestion must correspond to one detected risk.
- Do not introduce new issues that are not listed in risks.
- Do not generate suggestions for low-confidence or vague risks.
- If risks is empty, return {"suggestions":[]}.
- Maximum one suggestion per risk.
- Maximum 6 suggestions total.
- line is optional. Omit it if the risk does not include reliable line information.
- Comments should be suitable for GitHub PR review.
- Use Chinese for the response.

Detected risks:
${JSON.stringify(risks, null, 2)}`;
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

export async function generateReviewSuggestions(risks: ReviewRisk[]) {
  if (risks.length === 0) {
    return [];
  }

  const raw = await createRightCodeResponse({
    prompt: buildSuggestionPrompt(risks),
  });

  const parsed = safeJsonParse(raw);

  if (!Array.isArray(parsed.suggestions)) {
    return [];
  }

  const riskTitles = new Set(risks.map((risk) => risk.title));
  const riskFiles = new Set(risks.map((risk) => risk.file));

  return parsed.suggestions
    .filter((suggestion) => riskTitles.has(suggestion.riskTitle)) //避免误报
    .filter((suggestion) => riskFiles.has(suggestion.file))
    .slice(0, 6);
}