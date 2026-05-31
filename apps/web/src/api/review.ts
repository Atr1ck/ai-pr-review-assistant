import type { ParsedPRInfo } from '../types/github';
import type { ReviewContext } from '../types/review';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

export async function fetchReviewContext(
  parsedPr: ParsedPRInfo,
): Promise<ReviewContext> {
  const searchParams = new URLSearchParams({
    owner: parsedPr.owner,
    repo: parsedPr.repo,
    pullNumber: String(parsedPr.prNumber),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/review/context?${searchParams.toString()}`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to build review context');
  }

  return data;
}
