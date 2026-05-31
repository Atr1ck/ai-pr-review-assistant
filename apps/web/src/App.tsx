import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { parsePRUrl, fetchPRMetadata, fetchPullRequestFiles } from './api/github';
import type { ParsedPRInfo, PullRequestMetadata, PullRequestFile, } from './types/github';
import { PatchViewer } from './components/PatchViewer';
import { fetchReviewContext } from './api/review';
import type { ReviewContext, ReviewPipelineStep, ReviewResult, ReviewPipelineEvent} from './types/review';


function App() {
  const [prUrl, setprUrl] = useState('');
  const [parsedInfo, setParsedInfo] = useState<ParsedPRInfo | null>(null);
  const [prMetadata, setPrMetadata] = useState<PullRequestMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsparsing] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [files, setFiles] = useState<PullRequestFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(null);
  const [isBuildingContext, setIsBuildingContext] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<ReviewPipelineStep[]>([
  { id: 'fetch-metadata', label: 'Fetch PR metadata', status: 'idle' },
  { id: 'fetch-files', label: 'Fetch changed files', status: 'idle' },
  { id: 'build-context', label: 'Build review context', status: 'idle' },
  { id: 'review-loop', label: 'AI review loop', status: 'idle' },
  { id: 'generate-suggestions', label: 'Generate review suggestions', status: 'idle' },
]);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  function runReviewStream(parsedPr: ParsedPRInfo) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

    const searchParams = new URLSearchParams({
      owner: parsedPr.owner,
      repo: parsedPr.repo,
      pullNumber: String(parsedPr.prNumber),
    });

    const eventSource = new EventSource(
      `${apiBaseUrl}/api/review/stream?${searchParams.toString()}`,
    );

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ReviewPipelineEvent;

      if (payload.type === 'step') {
        setPipelineSteps((steps) =>
          steps.map((step) =>
            step.id === payload.step
              ? {
                  ...step,
                  status: payload.status,
                  message: payload.message,
                }
              : step,
          ),
        );
      }

      if (payload.type === 'result') {
        setReviewResult(payload.result);
      }

      if (payload.type === 'done') {
        eventSource.close();
      }

      if (payload.type === 'error') {
        setError(payload.error);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError('Review stream connection failed');
      eventSource.close();
    };
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setReviewResult(null);
    setPipelineSteps((steps) =>
      steps.map((step) => ({
        ...step,
        status: 'idle',
        message: undefined,
      })),
    );
    setError(null);
    setParsedInfo(null);
    setPrMetadata(null);
    setIsparsing(true);
    setIsDescriptionExpanded(false);
    setFiles([]);
    setSelectedFileName(null);
    setReviewContext(null);
    setIsBuildingContext(false);

    try {
      const result = await parsePRUrl(prUrl);
      setParsedInfo(result);


      runReviewStream(result);

      const metadata = await fetchPRMetadata(result);
      setPrMetadata(metadata);

      const files = await fetchPullRequestFiles(result);
      setFiles(files);
      setSelectedFileName(files[0]?.filename ?? null); // 默认选择第一个文件

      setIsBuildingContext(true);
      const nextReviewContext = await fetchReviewContext(result);
      setReviewContext(nextReviewContext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PR URL');
    } finally {
      setIsparsing(false);
      setIsBuildingContext(false);
    }
  };

  const selectedFile = files.find((file) => file.filename === selectedFileName) || null;


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
        <aside className="min-h-130rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">Pull Request</h2>

          {prMetadata && parsedInfo ? (
            <div className="space-y-4">
              <div>
                <a
                  href={prMetadata.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {parsedInfo.owner}/{parsedInfo.repo} #{parsedInfo.prNumber}
                </a>
                <h3 className="mt-2 text-base font-semibold text-slate-900">
                  {prMetadata.title}
                </h3>
              </div>

              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">State</span>
                  <span className="font-medium text-slate-900">{prMetadata.state}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Author</span>
                  <span className="font-medium text-slate-900">
                    {prMetadata.author?.login ?? 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Base</span>
                  <span className="max-w-40 truncate font-medium text-slate-900">
                    {prMetadata.baseBranch}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Head</span>
                  <span className="max-w-40 truncate font-medium text-slate-900">
                    {prMetadata.headBranch}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md bg-emerald-50 p-2">
                  <div className="font-semibold text-emerald-700">
                    +{prMetadata.additions}
                  </div>
                  <div className="text-xs text-slate-500">Additions</div>
                </div>
                <div className="rounded-md bg-red-50 p-2">
                  <div className="font-semibold text-red-700">
                    -{prMetadata.deletions}
                  </div>
                  <div className="text-xs text-slate-500">Deletions</div>
                </div>
                <div className="rounded-md bg-blue-50 p-2">
                  <div className="font-semibold text-blue-700">
                    {prMetadata.changedFiles}
                  </div>
                  <div className="text-xs text-slate-500">Files</div>
                </div>
              </div>

              {prMetadata.description ? (
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Description
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsDescriptionExpanded((value) => !value)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {isDescriptionExpanded ? '收回' : '展开'}
                      </button>
                    </div>

                    <p
                      className={[
                        'whitespace-pre-wrap text-sm leading-6 text-slate-600',
                        isDescriptionExpanded ? '' : 'line-clamp-6',
                      ].join(' ')}
                    >
                      {prMetadata.description}
                    </p>
                  </div>
                ) : null}
            </div>
          ) : (
            <div className="grid gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              <strong className="text-slate-800">No PR loaded</strong>
              <span>Enter a GitHub PR URL to start analysis.</span>
            </div>
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">
            已更改的文件列表
          </h3>
              {files.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {files.map((file) => {
                    const isSelected = file.filename === selectedFileName;

                    return (
                      <li key={file.filename}>
                        <button
                          type="button"
                          onClick={() => setSelectedFileName(file.filename)}
                          className={[
                            'w-full rounded-md border p-2 text-left transition',
                            isSelected
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="wrap-break-word font-medium text-slate-800">
                            {file.filename}
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                              {file.status}
                            </span>
                            <span>
                              <span className="font-medium text-emerald-700">
                                +{file.additions}
                              </span>
                              <span className="mx-1 text-slate-400">/</span>
                              <span className="font-medium text-red-700">
                                -{file.deletions}
                              </span>
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  Changed files will appear after analysis.
                </div>
              )}
        </aside>

        <PatchViewer file={selectedFile} />

        <aside className="min-h-130 rounded-lg border border-slate-200 bg-white p-4">
          <aside className="min-h-[520px] rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-4 text-lg font-semibold">AI Review 流程</h2>

              <ol className="space-y-2 text-sm mb-3">
                {pipelineSteps.map((step) => (
                  <li
                    key={step.id}
                    className={[
                      'rounded-md border p-2',
                      step.status === 'completed'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : step.status === 'running'
                          ? 'border-blue-200 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-600',
                    ].join(' ')}
                  >
                    <div className="font-medium">{step.label}</div>
                    {step.message ? (
                      <div className="mt-1 text-xs opacity-80">{step.message}</div>
                    ) : null}
                  </li>
                ))}
              </ol>

              {reviewContext ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-md bg-slate-50 p-2">
                      <div className="font-semibold text-slate-900">
                        {reviewContext.stats.totalFiles}
                      </div>
                      <div className="text-xs text-slate-500">Total</div>
                    </div>
                    <div className="rounded-md bg-emerald-50 p-2">
                      <div className="font-semibold text-emerald-700">
                        {reviewContext.stats.includedFiles}
                      </div>
                      <div className="text-xs text-slate-500">Included</div>
                    </div>
                    <div className="rounded-md bg-amber-50 p-2">
                      <div className="font-semibold text-amber-700">
                        {reviewContext.stats.ignoredFiles}
                      </div>
                      <div className="text-xs text-slate-500">Ignored</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Additions</span>
                      <span className="font-medium text-emerald-700">
                        +{reviewContext.stats.totalAdditions}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span className="text-slate-500">Deletions</span>
                      <span className="font-medium text-red-700">
                        -{reviewContext.stats.totalDeletions}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span className="text-slate-500">Changes</span>
                      <span className="font-medium text-slate-900">
                        {reviewContext.stats.totalChanges}
                      </span>
                    </div>
                  </div>

                  {reviewContext.stats.largeChange ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      大型 PR 检测到。AI 审查应优先考虑高风险文件。
                    </div>
                  ) : null}

                  {reviewContext.warnings.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">
                        Context Warnings
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {reviewContext.warnings.slice(0, 6).map((warning) => (
                          <li
                            key={warning}
                            className="rounded-md border border-slate-200 bg-white p-2"
                          >
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  <strong className="text-slate-800">
                    {isBuildingContext ? 'Building context' : 'Context pending'}
                  </strong>
                  <span>Review context will appear after PR files are loaded.</span>
                </div>
              )}
            </aside>

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">
            Review 结果
          </h3>
          {reviewResult ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <span className="text-slate-500">风险等级</span>
                <p className="mt-1 font-semibold text-slate-900">
                  {reviewResult.riskLevel}
                </p>
              </div>

              <div>
                <span className="text-slate-500">摘要</span>
                <p className="mt-1 leading-6 text-slate-700">
                  {reviewResult.summary}
                </p>
              </div>

              {reviewResult.risks.length > 0 ? (
                <div>
                  <span className="text-slate-500">风险</span>
                  <div className="mt-2 space-y-2">
                    {reviewResult.risks.map((risk) => (
                      <div
                        key={`${risk.file}-${risk.title}`}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{risk.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {risk.file} · {risk.type} · {risk.level}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {risk.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {reviewResult.suggestions.length > 0 ? (
                <div>
                  <span className="text-slate-500">Review 建议</span>
                  <div className="mt-2 space-y-2">
                    {reviewResult.suggestions.map((suggestion) => (
                      <div
                        key={`${suggestion.file}-${suggestion.title}`}
                        className="rounded-md border border-blue-100 bg-blue-50 p-3"
                      >
                        <p className="font-medium text-slate-900">{suggestion.title}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {suggestion.file}
                          {suggestion.line ? ` · line ${suggestion.line}` : ''}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Related risk: {suggestion.riskTitle}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {suggestion.comment}
                        </p>

                        <div className="mt-2 rounded-md bg-white p-2 text-sm leading-6 text-blue-800">
                          {suggestion.suggestedChange}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {reviewResult.changedModules.length > 0 ? (
                <div>
                  <span className="text-slate-500">更改的模块</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reviewResult.changedModules.map((module) => (
                      <span
                        key={module}
                        className="rounded bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Review 结果将在AI审查完成后显示。
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}


export default App;