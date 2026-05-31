import type {
  ReviewLoopAction,
  ReviewLoopState,
} from './reviewLoopTypes.js';
import {
  REVIEW_LOOP_LIMITS,
  getMaxInspectedFiles,
} from './reviewLoopTypes.js';

function parseJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }

    throw new Error('LLM response does not contain valid JSON');
  }
}

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Loop action must be a JSON object');
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function assertStringArray(
  value: unknown,
  field: string,
): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw new Error(`${field} must be a non-empty string array`);
  }
}

function assertKnownFile(state: ReviewLoopState, file: string) {
  const exists = state.context.files.some(
    (contextFile) => contextFile.filename === file && !contextFile.ignored,
  );

  if (!exists) {
    throw new Error(`Unknown or ignored file: ${file}`);
  }
}

function assertKnownRisk(state: ReviewLoopState, riskId: string) {
  const exists = state.risks.some((risk) => risk.id === riskId);

  if (!exists) {
    throw new Error(`Unknown riskId: ${riskId}`);
  }
}

function assertInspectedFile(state: ReviewLoopState, file: string) {
  if (!state.inspectedFiles.includes(file)) {
    throw new Error(`File must be inspected before recording findings: ${file}`);
  }
}

export function parseReviewLoopAction(
  text: string,
  state: ReviewLoopState,
): ReviewLoopAction {
  const parsed = parseJsonObject(text);
  assertObject(parsed);

  assertString(parsed.type, 'type');

  if (parsed.type === 'inspect_files') {
    assertStringArray(parsed.files, 'files');
    assertString(parsed.reason, 'reason');

    const uniqueFiles = [...new Set(parsed.files)];
    const reviewableFileCount = state.context.files.filter(
      (file) => !file.ignored,
    ).length;
    const maxInspectedFiles = getMaxInspectedFiles(reviewableFileCount);
    const remainingInspectionSlots = maxInspectedFiles - state.inspectedFiles.length;

    if (uniqueFiles.length !== parsed.files.length) {
      throw new Error('inspect_files cannot include duplicate files');
    }

    if (uniqueFiles.length > REVIEW_LOOP_LIMITS.maxFilesPerInspection) {
      throw new Error(
        `inspect_files can include at most ${REVIEW_LOOP_LIMITS.maxFilesPerInspection} files`,
      );
    }

    if (remainingInspectionSlots <= 0) {
      throw new Error('File inspection limit reached');
    }

    if (uniqueFiles.length > remainingInspectionSlots) {
      throw new Error(
        `inspect_files exceeds remaining inspection slots: ${remainingInspectionSlots}`,
      );
    }

    for (const file of uniqueFiles) {
      assertKnownFile(state, file);

      if (state.inspectedFiles.includes(file)) {
        throw new Error(`File already inspected: ${file}`);
      }
    }

    return {
      type: 'inspect_files',
      files: uniqueFiles,
      reason: parsed.reason,
    };
  }

  if (parsed.type === 'record_risk') {
    assertObject(parsed.risk);

    assertString(parsed.risk.id, 'risk.id');
    assertString(parsed.risk.file, 'risk.file');
    assertString(parsed.risk.level, 'risk.level');
    assertString(parsed.risk.type, 'risk.type');
    assertString(parsed.risk.title, 'risk.title');
    assertString(parsed.risk.reason, 'risk.reason');

    assertKnownFile(state, parsed.risk.file);
    assertInspectedFile(state, parsed.risk.file);

    if (!['low', 'medium', 'high'].includes(parsed.risk.level)) {
      throw new Error('risk.level must be low, medium or high');
    }

    return {
      type: 'record_risk',
      risk: {
        id: parsed.risk.id,
        file: parsed.risk.file,
        level: parsed.risk.level as 'low' | 'medium' | 'high',
        type: parsed.risk.type,
        title: parsed.risk.title,
        reason: parsed.risk.reason,
      },
    };
  }

  if (parsed.type === 'record_suggestion') {
    assertObject(parsed.suggestion);

    assertString(parsed.suggestion.id, 'suggestion.id');
    assertString(parsed.suggestion.riskId, 'suggestion.riskId');
    assertString(parsed.suggestion.file, 'suggestion.file');
    assertString(parsed.suggestion.title, 'suggestion.title');
    assertString(parsed.suggestion.comment, 'suggestion.comment');
    assertString(parsed.suggestion.suggestedChange, 'suggestion.suggestedChange');

    assertKnownFile(state, parsed.suggestion.file);
    assertInspectedFile(state, parsed.suggestion.file);
    assertKnownRisk(state, parsed.suggestion.riskId);

    return {
      type: 'record_suggestion',
      suggestion: {
        id: parsed.suggestion.id,
        riskId: parsed.suggestion.riskId,
        file: parsed.suggestion.file,
        title: parsed.suggestion.title,
        comment: parsed.suggestion.comment,
        suggestedChange: parsed.suggestion.suggestedChange,
      },
    };
  }

  if (parsed.type === 'finish') {
    assertString(parsed.summary, 'summary');
    assertString(parsed.riskLevel, 'riskLevel');

    if (!['low', 'medium', 'high'].includes(parsed.riskLevel)) {
      throw new Error('riskLevel must be low, medium or high');
    }

    return {
      type: 'finish',
      summary: parsed.summary,
      riskLevel: parsed.riskLevel as 'low' | 'medium' | 'high',
    };
  }

  throw new Error(`Unsupported loop action type: ${parsed.type}`);
}
