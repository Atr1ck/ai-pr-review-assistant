import { Router } from 'express';
import { parsePRUrl } from '../github/parsePullRequestUrl.js';

export const githubRouter = Router();

githubRouter.post('/parse-pr-url', (req, res) => {
    const { url } = req.body?.url;

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

