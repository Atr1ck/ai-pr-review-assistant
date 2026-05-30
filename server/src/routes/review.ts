import { Router } from 'express';
import { buildReviewContext } from '../review/buildReviewContext.js';
import { runReviewPipeline } from '../review/runReviewPipeline.js';

export const reviewRouter = Router();

reviewRouter.get('/context', async (req, res) => {
  const owner = req.query.owner;
  const repo = req.query.repo;
  const pullNumber = Number(req.query.pullNumber);

  if (
    typeof owner !== 'string' ||
    typeof repo !== 'string' ||
    !Number.isInteger(pullNumber) ||
    pullNumber <= 0
  ) {
    res.status(400).json({
      error: 'owner, repo and pullNumber are required',
    });
    return;
  }

  try {
    const context = await buildReviewContext({
      owner,
      repo,
      pullNumber,
    });

    res.json(context);
  } catch (error) {
    res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to build review context',
    });
  }
});

reviewRouter.get('/stream', async (req, res) => {
  const owner = req.query.owner;
  const repo = req.query.repo;
  const pullNumber = Number(req.query.pullNumber);

  if (
    typeof owner !== 'string' ||
    typeof repo !== 'string' ||
    !Number.isInteger(pullNumber) ||
    pullNumber <= 0
  ) {
    res.status(400).json({
      error: 'owner, repo and pullNumber are required',
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await runReviewPipeline({
      owner,
      repo,
      pullNumber,
      res,
    });
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Failed to run review pipeline',
      })}\n\n`,
    );
    res.end();
  }
});