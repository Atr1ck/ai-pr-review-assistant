import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { reviewRouter } from './routes/review.js';
import { healthRouter } from './routes/health.js';
import { githubRouter } from './routes/github.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api/github', githubRouter);
app.use('/api/review', reviewRouter);

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})