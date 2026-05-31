import { app } from '../server/src/app';

export const config = {
  maxDuration: 300,
};

export default function handler(req: unknown, res: unknown) {
  return app(req as never, res as never);
}
