import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import type { PullRequestFile } from '../types/github';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

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

function getHighlightLanguage(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (!extension) {
    return null;
  }

  const languageByExtension: Record<string, string> = {
    bash: 'bash',
    cjs: 'javascript',
    css: 'css',
    html: 'xml',
    js: 'javascript',
    json: 'json',
    jsx: 'javascript',
    md: 'markdown',
    mjs: 'javascript',
    sh: 'bash',
    ts: 'typescript',
    tsx: 'typescript',
    xml: 'xml',
  };

  return languageByExtension[extension] ?? null;
}

function highlightCode(code: string, filename: string) {
  const language = getHighlightLanguage(filename);

  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, {
      language,
      ignoreIllegals: true,
    }).value;
  }

  return hljs.highlightAuto(code).value;
}

function renderPatchLine(line: string, filename: string) {
  if (!line) {
    return ' ';
  }

  if (line.startsWith('@@')) {
    return line;
  }

  if (line.startsWith('+') || line.startsWith('-')) {
    return (
      <>
        <span>{line[0]}</span>
        <span
          dangerouslySetInnerHTML={{
            __html: highlightCode(line.slice(1), filename),
          }}
        />
      </>
    );
  }

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: highlightCode(line, filename),
      }}
    />
  );
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
          <pre className="patch-code min-w-max font-mono">
            {file.patch.split('\n').map((line, index) => (
              <div
                key={`${index}-${line}`}
                className={`whitespace-pre px-4 ${getPatchLineClass(line)}`}
              >
                {renderPatchLine(line, file.filename)}
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
