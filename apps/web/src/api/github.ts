import type { ParsedPRInfo, PullRequestMetadata } from '../types/github';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export async function parsePRUrl(url: string): Promise<ParsedPRInfo> {
    const response = await fetch(`${API_BASE_URL}/github/parse-pr-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PR URL');
    }

    return data;
}

export async function fetchPRMetadata(parsedInfo: ParsedPRInfo): Promise<PullRequestMetadata>{
    const searchParams = new URLSearchParams({
        owner: parsedInfo.owner,
        repo: parsedInfo.repo,
        pullNumber: parsedInfo.prNumber.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/github/pull-request?${searchParams}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pull request metadata');
    }

    return data;
}