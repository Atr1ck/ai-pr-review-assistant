import type { Response } from 'express';
import { buildReviewContext } from './buildReviewContext.js';
import { generatePrSummary } from './generatePrSummary.js';
import { generateDetectRisks } from './generateDetectRisks.js';
import { generateReviewSuggestions } from './generateReviewSuggestions.js';

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

  sendEvent(res, {
    type: 'step',
    step: 'generate-summary',
    status: 'running',
    message: '正在生成 PR 摘要...',
  });

  const summary = await generatePrSummary(context);

  sendEvent(res, {
    type: 'step',
    step: 'generate-summary',
    status: 'completed',
    message: '生成 PR 摘要完成。',
  });

  sendEvent(res, {
    type: 'step',
    step: 'detect-risks',
    status: 'running',
    message: '检测潜在风险...',
  });

    const riskResult = await generateDetectRisks(context);

  sendEvent(res, {
    type: 'step',
    step: 'detect-risks',
    status: 'completed',
    message: '风险检测完成。',
  });

  sendEvent(res, {
    type: 'step',
    step: 'generate-suggestions',
    status: 'running',
    message: '生成审查建议...',
  });

    const suggestions = await generateReviewSuggestions(
    context,
    riskResult.risks,
  );

    sendEvent(res, {
    type: 'step',
    step: 'generate-suggestions',
    status: 'completed',
    message: '审查建议生成完成。',
  });

  sendEvent(res, {
    type: 'result',
    result: {
      summary: summary,
      riskLevel: riskResult.riskLevel,
      changedModules: context.files
        .filter((file) => !file.ignored)
        .slice(0, 5)
        .map((file) => file.filename.split('/')[0] ?? file.filename),
      risks: riskResult.risks,
      suggestions: suggestions,
    },
  });

  sendEvent(res, {
    type: 'done',
  });

  res.end();
}