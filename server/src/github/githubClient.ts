type GitHubRequestOptions = {
    path: string;
}

type GitHubAPIError = {
    message?: string;
};

export async function githubRequest<T>({ path }: GitHubRequestOptions): Promise<T> {
      const headers: Record<string, string> = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'ai-pr-review-assistant',
            'X-GitHub-Api-Version': '2026-03-10',
        };

    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com${path}`, {
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        const error = data as GitHubAPIError;
        throw new Error(error.message || `GitHub API request failed with status ${response.status}`);
    }

    return data as T;
}