 import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})