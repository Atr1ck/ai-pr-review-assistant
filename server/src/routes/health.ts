import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'AI PR Review Assistant',
});
});