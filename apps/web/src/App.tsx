import { useState } from 'react';
import type { SubmitEvent } from 'react';
import {parsePRUrl} from './api/github';
import type { ParsedPRInfo } from './types/github';

const mockFiles = [
  'server/src/auth/middleware.ts',
  'server/src/routes/pullRequest.ts',
  'apps/web/src/App.tsx',
];

const pipelineSteps = [
  '等待 PR URL',
  '获取 PR 元数据',
  '获取更改的文件',
  '解析 diff',
  '构建审查上下文',
  '生成 AI 审查结果',
];

function App() {
  const [prUrl, setprUrl] = useState('');
  const [parsedInfo, setParsedInfo] = useState<ParsedPRInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsparsing] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setParsedInfo(null);

    try {
      const result = await parsePRUrl(prUrl);
      setParsedInfo(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PR URL');
    } finally {
      setIsparsing(false);
    }
  };


  return (
    <main className="flex flex-col min-h-screen bg-slate-100 p-6 text-slate-900">
      <section className="mb-5 grid gap-6 lg:grid-cols-[1fr_560px] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            AI PR Review Assistant
          </h1>
          <p className="mt-2 text-slate-600">
            Github PR 的可视化管线
          </p>
        </div>

        <form onSubmit={handleSubmit} 
              className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="url"
            placeholder="https://github.com/owner/repo/pull/123"
            value={prUrl}
            onChange={(e) => setprUrl(e.target.value)}
            aria-label="GitHub PR URL"
            className="h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={isParsing || prUrl.trim() === ''}
            className="h-11 rounded-md bg-blue-600 px-5 font-medium text-white hover:bg-blue-700"
          >
            {isParsing ? '解析中...' : '解析 PR URL'}
          </button>
        </form>
      </section>

      { error ? (
        <div className="mb-5 rounded-md bg-red-50 p-4 text-sm text-red-700">
          <strong className="font-semibold">错误:</strong> {error}
        </div>
      ) : null }

      <section className="flex-1 grid gap-4 xl:grid-cols-[280px_minmax(360px,1fr)_340px]">
        <aside className="min-h-[520px] rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">Pull Request</h2>

          {parsedInfo ? (
            <div className="space-y-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <div><strong>Owner:</strong> {parsedInfo.owner}</div>
              <div><strong>Repo:</strong> {parsedInfo.repo}</div>
              <div><strong>PR Number:</strong> {parsedInfo.prNumber}</div>
            </div>
          ) : (
            <div className="grid gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              <strong className="text-slate-800">暂无已加载的 PR</strong>
              <span>请输入 GitHub PR URL 开始分析。</span>
            </div>
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">
            已更改的文件列表
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {mockFiles.map((file) => (
              <li key={file} className="break-words">
                {file}
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col min-h-[520px] rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">Diff 视图</h2>
          <pre className="flex-1 overflow-auto rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-200">
{`@@ -1,5 +1,8 @@
+ AI review diff preview will appear here.
+ Changed lines will be highlighted later.
- Old code
+ New code`}
          </pre>
        </section>

        <aside className="min-h-[520px] rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">AI Review 管线</h2>

          <ol className="space-y-2 text-sm">
            {pipelineSteps.map((step, index) => (
              <li
                key={step}
                className={index === 0 ? 'font-semibold text-blue-600' : 'text-slate-600'}
              >
                {step}
              </li>
            ))}
          </ol>

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">
            Review 结果
          </h3>
          <div className="grid gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            <strong className="text-slate-800">审查结果</strong>
            <span>风险审查和建议将在此处显示。</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;