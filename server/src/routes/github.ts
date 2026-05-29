import { Router } from 'express';
import { parsePRUrl } from '../github/parsePullRequestUrl.js';
import { getPullRequestMetadata } from '../github/getPullRequestMetadata.js';

export const githubRouter = Router();

githubRouter.post('/parse-pr-url', (req, res) => {
    const url = req.body?.url;
    
    if (typeof url !== 'string' || url.trim() === '') {
        res.status(400).json({
            error: 'PR URL is required and must be a non-empty string',
        });
        return;
    }
    
    try {
        const result = parsePRUrl(url);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Invalid PR URL',
        });
    }
});

githubRouter.get('/pull-request',async (req, res) => {
    const owner = req.query.owner;
    const repo = req.query.repo;
    const pullNumber = Number(req.query.pullNumber);

    if (typeof owner !== 'string' || typeof repo !== 'string' || !Number.isInteger(pullNumber)){
        res.status(400).json({
            error: 'owner, repo, and pullNumber query parameters are required and must be valid',
        });
        return;
    }

    try {
        const metadata = await getPullRequestMetadata({ owner, repo, pullNumber });

        res.json(metadata);
    } catch (error) {
        res.status(502).json({
            error: error instanceof Error ? error.message : 'Failed to fetch pull request metadata',
        });
    }
});