import type { Response } from 'express';
import { buildReviewContext } from './buildReviewContext.js';
import { generatePrSummary } from './generatePrSummary.js';
import { runReviewLoop } from './runReviewLoop.js';

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
        type: 'loop_action';
        action: unknown;
    }
  | {
     type: 'heartbeat';
     message: string;
     elapsedSeconds: number;
  }
  | {
      type: 'done';
    };

function sendEvent(res: Response, event: PipelineEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function startHeartbeat(res: Response) {
  const startedAt = Date.now();

  const timer = setInterval(() => {
    sendEvent(res, {
      type: 'heartbeat',
      message: 'AI review is still running...',
      elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
  }, 8000);

  return () => {
    clearInterval(timer);
  };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getChangedModules(context: Awaited<ReturnType<typeof buildReviewContext>>) {
  return [
    ...new Set(
      context.files
        .filter((file) => !file.ignored)
        .map((file) => file.filename.split('/')[0] ?? file.filename),
    ),
  ].slice(0, 5);
}

export async function runReviewPipeline({
  owner,
  repo,
  pullNumber,
  res,
}: RunReviewPipelineInput) {
  const stopHeartbeat = startHeartbeat(res);

  try {
  
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
    message: '构建Review Context...',
  });

  const context = await buildReviewContext({
    owner,
    repo,
    pullNumber,
  });

  sendEvent(res, {
    type: 'step',
    step: 'fetch-metadata',
    status: 'completed',
    message: 'PR 元数据获取完成',
  });

  await wait(400);
  
    sendEvent(res, {
    type: 'step',
    step: 'fetch-files',
    status: 'completed',
    message: '更改文件获取完成',
  });

  await wait(400);

  sendEvent(res, {
    type: 'step',
    step: 'build-context',
    status: 'completed',
    message: 'Review Context构建完成。',
  });

  await wait(400);

  sendEvent(res, {
    type: 'step',
    step: 'generate-summary',
    status: 'running',
    message: '正在调用模型生成 PR 摘要，可能需要一些时间...',
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
    step: 'review-loop',
    status: 'running',
    message: 'AI 正在审查文件变更，可能需要多轮模型调用...',
  });

  const loopResult = await runReviewLoop({
    context,
    onAction: (action) => {
      sendEvent(res, {
        type: 'loop_action',
        action,
      });
    },
  });

  sendEvent(res, {
    type: 'step',
    step: 'review-loop',
    status: 'completed',
    message: 'AI review loop completed.',
  });

  sendEvent(res, {
    type: 'result',
    result: {
      summary: loopResult.summary || summary,
      riskLevel: loopResult.riskLevel,
      changedModules: getChangedModules(context),
      risks: loopResult.risks.map((risk) => ({
        file: risk.file,
        level: risk.level,
        type: risk.type,
        title: risk.title,
        reason: risk.reason,
        suggestion:
            loopResult.suggestions.find(
            (suggestion) => suggestion.riskId === risk.id,
            )?.suggestedChange ?? '',
      })),
      suggestions: loopResult.suggestions.map((suggestion) => ({
        file: suggestion.file,
        riskTitle:
            loopResult.risks.find((risk) => risk.id === suggestion.riskId)?.title ??
            suggestion.riskId,
        title: suggestion.title,
        comment: suggestion.comment,
        suggestedChange: suggestion.suggestedChange,
      })),
    },
  });

  sendEvent(res, {
    type: 'done',
  });

  res.end();
} finally {
    stopHeartbeat();
}
}
