export type ParsedPRInfo = {
    owner: string;
    repo: string;
    prNumber: number;
};

export function parsePRUrl(url: string): ParsedPRInfo {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }

    if (parsedUrl.hostname !== 'github.com') {
        throw new Error('URL must be from github.com');
    }

    const parts = parsedUrl.pathname.split('/').filter(Boolean);

    if (parts.length !== 4 || parts[2] !== 'pull') {
        throw new Error('URL must match https://github.com/:owner/:repo/pull/:number');
    }

    const [owner, repo, , prNumberStr] = parts;
    const prNumber = parseInt(prNumberStr ?? '', 10);

    if (!owner || !repo || isNaN(prNumber) || prNumber <= 0) {
        throw new Error('Invalid pull request number');
    }

    return { 
        owner, 
        repo, 
        prNumber 
    };
}