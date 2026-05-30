import type { Response } from 'express';
import { buildReviewContext } from './buildReviewContext.js';

type RunReviewPipelineInput = {
  owner: string;
  repo: string;
  pullNumber: number;
  res: Response;
};

type PipelineEvent =
  | {
      type: 'step';
      step: string;
      status: 'running' | 'completed';
      message: string;
    }
  | {
      type: 'result';
      result: {
        summary: string;
        riskLevel: 'low' | 'medium' | 'high';
        changedModules: string[];
        risks: unknown[];
        suggestions: unknown[];
      };
    }
  | {
      type: 'done';
    };

function sendEvent(res: Response, event: PipelineEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runReviewPipeline({
  owner,
  repo,
  pullNumber,
  res,
}: RunReviewPipelineInput) {
  sendEvent(res, {
    type: 'step',
    step: 'fetch-metadata',
    status: 'running',
    message: '获取 PR 元数据...',
  });

  await wait(400);

  sendEvent(res, {
    type: 'step',
    step: 'fetch-files',
    status: 'running',
    message: '获取更改的文件...',
  });

  await wait(400);

  sendEvent(res, {
    type: 'step',
    step: 'build-context',
    status: 'running',
    message: '构建审查上下文...',
  });

  const context = await buildReviewContext({
    owner,
    repo,
    pullNumber,
  });

  sendEvent(res, {
    type: 'step',
    step: 'build-context',
    status: 'completed',
    message: '审查上下文构建完成。',
  });

  await wait(400);

  sendEvent(res, {
    type: 'step',
    step: 'detect-risks',
    status: 'running',
    message: '检测风险变更...',
  });

  await wait(500);

  sendEvent(res, {
    type: 'step',
    step: 'generate-suggestions',
    status: 'running',
    message: '生成审查建议...',
  });

  await wait(500);

  sendEvent(res, {
    type: 'result',
    result: {
      summary: `This PR changes ${context.stats.includedFiles} reviewable files with ${context.stats.totalAdditions} additions and ${context.stats.totalDeletions} deletions.`,
      riskLevel: context.stats.largeChange ? 'medium' : 'low',
      changedModules: context.files
        .filter((file) => !file.ignored)
        .slice(0, 5)
        .map((file) => file.filename.split('/')[0] ?? file.filename),
      risks: [],
      suggestions: [],
    },
  });

  sendEvent(res, {
    type: 'done',
  });

  res.end();
}