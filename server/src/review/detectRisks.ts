import { createRightCodeResponse } from '../llm/rightCodeClient.js';
import type { ReviewContext } from './buildReviewContext.js';

export type ReviewRisk = {
  file: string;
  level: 'low' | 'medium' | 'high';
  type: string;
  title: string;
  reason: string;
  suggestion: string;
};

type RiskDetectionResult = {
  riskLevel: 'low' | 'medium' | 'high';
  risks: ReviewRisk[];
};

function buildRiskPrompt(context: ReviewContext) {
  return `You are a senior software engineer doing code review.

Analyze the following PR context and identify risky changes.

Return ONLY valid JSON in this exact shape:
{
  "riskLevel": "low" | "medium" | "high",
  "risks": [
    {
      "file": "file path",
      "level": "low" | "medium" | "high",
      "type": "string",
      "title": "string",
      "reason": "string",
      "suggestion": "string"
    }
  ]
}

Rules:
- Only report real risks supported by the context.
- Prefer false negatives over false positives.
- If no meaningful risk is found, return {"riskLevel":"low","risks":[]}.
- Keep reasons short and concrete.
- Focus on null handling, exception handling, auth, breaking changes, security, deleted logic, and wide impact changes.
- use Chinese for the response.

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

function safeJsonParse(text: string): RiskDetectionResult {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as RiskDetectionResult;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as RiskDetectionResult;
    }

    throw new Error('Failed to parse risk detection JSON');
  }
}

export async function detectRisks(context: ReviewContext) {
  const raw = await createRightCodeResponse({
    prompt: buildRiskPrompt(context),
  });

  const parsed = safeJsonParse(raw);

  return {
    riskLevel: parsed.riskLevel ?? 'low',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
  };
}