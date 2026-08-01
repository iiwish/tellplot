import {
  parseViewSpec,
  serializeViewSpec,
  validateChartConfig,
  type ChartConfig,
  type ValidationErrorCode,
  type ViewSpec,
} from 'tellplot';

export interface PlaygroundPublicFileError {
  readonly code: 'INVALID_JSON' | ValidationErrorCode;
  readonly path: string;
}

export type PlaygroundChartConfigResult =
  | { readonly ok: true; readonly value: ChartConfig }
  | { readonly ok: false; readonly error: PlaygroundPublicFileError };

export type PlaygroundViewResult =
  | { readonly ok: true; readonly value: ViewSpec }
  | { readonly ok: false; readonly error: PlaygroundPublicFileError };

function invalidJson(): PlaygroundPublicFileError {
  return { code: 'INVALID_JSON', path: '/' };
}

function pretty(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function scalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function scalarRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(scalar)
  );
}

function compactJson(value: unknown, depth = 0): string {
  if (scalar(value)) {
    return JSON.stringify(value);
  }
  const indentation = '  '.repeat(depth);
  const childIndentation = '  '.repeat(depth + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    if (value.every(scalar)) {
      return JSON.stringify(value);
    }
    if (value.every(scalarRecord)) {
      return `[\n${value
        .map(item => `${childIndentation}${JSON.stringify(item)}`)
        .join(',\n')}\n${indentation}]`;
    }
    return `[\n${value
      .map(item => `${childIndentation}${compactJson(item, depth + 1)}`)
      .join(',\n')}\n${indentation}]`;
  }
  if (typeof value !== 'object' || value === null) {
    return 'null';
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return '{}';
  }
  const inline = JSON.stringify(value);
  if (entries.every(([, entryValue]) => scalar(entryValue)) && inline.length <= 96) {
    return inline;
  }
  return `{\n${entries
    .map(
      ([key, entryValue]) =>
        `${childIndentation}${JSON.stringify(key)}: ${compactJson(entryValue, depth + 1)}`,
    )
    .join(',\n')}\n${indentation}}`;
}

/** Serializes the exact public ChartConfig object shown by the playground. */
export function serializePlaygroundChartConfig(config: ChartConfig): string {
  const normalized = JSON.parse(JSON.stringify(config)) as unknown;
  return `${compactJson(normalized)}\n`;
}

/** Parses the public config with the same runtime validator exported by the package. */
export function parsePlaygroundChartConfig(text: string): PlaygroundChartConfigResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: invalidJson() };
  }

  const result = validateChartConfig(parsed);
  if (!result.ok) {
    const issue = result.errors[0];
    return {
      ok: false,
      error: {
        code: issue?.code ?? 'INVALID_CHART_CONFIG',
        path: issue?.path ?? '/',
      },
    };
  }
  return { ok: true, value: result.value };
}

/** Serializes persisted public view state separately from immutable chart configuration. */
export function serializePlaygroundView(view: ViewSpec): string {
  const canonical = JSON.parse(serializeViewSpec(view)) as unknown;
  return pretty(canonical);
}

/** Parses ViewSpec against both source data and the declared chart type. */
export function parsePlaygroundView(text: string, config: ChartConfig): PlaygroundViewResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: invalidJson() };
  }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    'chartType' in parsed &&
    parsed.chartType !== config.type
  ) {
    return {
      ok: false,
      error: { code: 'SOURCE_CONFLICT', path: '/chartType' },
    };
  }

  const result = parseViewSpec(text, config.data);
  if (!result.ok) {
    const issue = result.errors[0];
    return {
      ok: false,
      error: {
        code:
          issue?.reason === 'UNREADABLE_INPUT'
            ? 'INVALID_JSON'
            : issue?.reason === 'INCOMPATIBLE_CHART_TYPE'
              ? 'SOURCE_CONFLICT'
              : (issue?.code ?? 'INVALID_VIEW_SPEC'),
        path: issue?.path ?? '/',
      },
    };
  }
  if (result.value.chartType !== config.type) {
    return {
      ok: false,
      error: { code: 'SOURCE_CONFLICT', path: '/chartType' },
    };
  }
  return { ok: true, value: result.value };
}
