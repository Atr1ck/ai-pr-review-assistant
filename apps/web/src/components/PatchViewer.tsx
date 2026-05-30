import type { PullRequestFile } from '../types/github';

type PatchViewerProps = {
  file: PullRequestFile | null;
};

function getPatchLineClass(line: string) {
  if (line.startsWith('@@')) {
    return 'bg-blue-950 text-blue-200';
  }

  if (line.startsWith('+')) {
    return 'bg-emerald-950 text-emerald-200';
  }

  if (line.startsWith('-')) {
    return 'bg-red-950 text-red-200';
  }

  return 'text-slate-300';
}

export function PatchViewer({ file }: PatchViewerProps) {
  if (!file) {
    return (
      <section className="min-h-[520px] rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Diff Viewer</h2>
        <div className="grid min-h-[440px] place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Select a changed file to inspect its patch.
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[520px] rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Diff Viewer</h2>
          <p className="mt-1 break-all text-sm text-slate-500">
            {file.filename}
          </p>
        </div>

        {file.blobUrl ? (
          <a
            href={file.blobUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View file
          </a>
        ) : null}
      </div>

      {file.patch ? (
        <div className="min-h-[440px] overflow-auto rounded-md bg-slate-950 py-4 text-sm leading-6">
          <pre className="min-w-max font-mono">
            {file.patch.split('\n').map((line, index) => (
              <div
                key={`${index}-${line}`}
                className={`whitespace-pre px-4 ${getPatchLineClass(line)}`}
              >
                {line || ' '}
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="grid min-h-[440px] place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No patch is available for this file. It may be binary or too large for GitHub to include inline.
        </div>
      )}
    </section>
  );
}