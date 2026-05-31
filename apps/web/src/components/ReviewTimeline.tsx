import type { ReviewLoopAction } from '../types/review';

type ReviewTimelineProps = {
  actions: ReviewLoopAction[];
};

function getActionTitle(action: ReviewLoopAction) {
  if (action.type === 'inspect_files') {
    return `Inspecting ${action.files.length} file${action.files.length > 1 ? 's' : ''}`;
  }

  if (action.type === 'record_risk') {
    return `Risk found: ${action.risk.title}`;
  }

  if (action.type === 'record_suggestion') {
    return `Suggestion: ${action.suggestion.title}`;
  }

  return 'Review finished';
}

function getActionBody(action: ReviewLoopAction) {
  if (action.type === 'inspect_files') {
    return (
      <div className="space-y-2">
        <p className="text-slate-600">{action.reason}</p>
        <ul className="space-y-1">
          {action.files.map((file) => (
            <li
              key={file}
              className="break-words rounded bg-white px-2 py-1 text-xs text-slate-700"
            >
              {file}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (action.type === 'record_risk') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          {action.risk.file} · {action.risk.type} · {action.risk.level}
        </p>
        <p className="text-slate-700">{action.risk.reason}</p>
      </div>
    );
  }

  if (action.type === 'record_suggestion') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          {action.suggestion.file} · related risk: {action.suggestion.riskId}
        </p>
        <p className="text-slate-700">{action.suggestion.comment}</p>
        <div className="rounded bg-white p-2 text-blue-800">
          {action.suggestion.suggestedChange}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Risk level: {action.riskLevel}</p>
      <p className="text-slate-700">{action.summary}</p>
    </div>
  );
}

export function ReviewTimeline({ actions }: ReviewTimelineProps) {
  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 m-4">
        Review 循环的每个步骤都会在这里显示。
        
      </div>
    );
  }

  return (
    <div className="space-y-2 mb-4">
      {actions.map((action, index) => (
        <div
          key={`${action.type}-${index}`}
          className="rounded-md border border-slate-200 bg-white p-3 text-sm"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-medium text-slate-900">{getActionTitle(action)}</p>
            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              #{index + 1}
            </span>
          </div>

          {getActionBody(action)}
        </div>
      ))}
    </div>
  );
}
