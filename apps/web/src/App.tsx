import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { parsePRUrl, fetchPRMetadata, fetchPullRequestFiles } from './api/github';
import type { ParsedPRInfo, PullRequestMetadata, PullRequestFile } from './types/github';
import { PatchViewer } from './components/PatchViewer';

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
  const [prMetadata, setPrMetadata] = useState<PullRequestMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsparsing] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [files, setFiles] = useState<PullRequestFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setParsedInfo(null);
    setPrMetadata(null);
    setIsparsing(true);
    setIsDescriptionExpanded(false);
    setFiles([]);
    setSelectedFileName(null);

    try {
      const result = await parsePRUrl(prUrl);
      setParsedInfo(result);

      const metadata = await fetchPRMetadata(result);
      setPrMetadata(metadata);

      const files = await fetchPullRequestFiles(result);
      setFiles(files);
      setSelectedFileName(files[0]?.filename ?? null); // 默认选择第一个文件
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PR URL');
    } finally {
      setIsparsing(false);
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