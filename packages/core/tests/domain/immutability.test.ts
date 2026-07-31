import { describe, expect, it, vi } from 'vitest';

import { createInitialViewSpec, validateSourceData, validateViewSpec } from '../../src';
import type { SourceData, ValidationResult } from '../../src';
import { financialSourceData } from '../fixtures/financialSourceData';

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}

function expectValue<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error('Expected validation success');
  }
  return result.value;
}

describe('domain immutability', () => {
  it('validates frozen source data without cloning, normalizing or logging it', () => {
    const input = deepFreeze(structuredClone(financialSourceData) as SourceData);
    const before = JSON.stringify(input);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = validateSourceData(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(input);
    }
    expect(JSON.stringify(input)).toBe(before);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('validates a frozen invalid source without mutating it', () => {
    const input = deepFreeze({
      ...structuredClone(financialSourceData),
      items: financialSourceData.items.map((item, index) =>
        index === 1 ? { ...item, amount: Number.NaN } : item,
      ),
    });
    const before = input.items.map(item => ({ ...item }));

    expect(validateSourceData(input).ok).toBe(false);
    expect(input.items).toEqual(before);
  });

  it('creates a view from frozen source data without sharing source containers', () => {
    const source = deepFreeze(structuredClone(financialSourceData) as SourceData);
    const before = JSON.stringify(source);
    const view = expectValue(createInitialViewSpec(source));

    expect(JSON.stringify(source)).toBe(before);
    expect(view.rootOrder).not.toBe(source.items);
    expect(Object.values(view.groups)).toEqual([]);
  });

  it('validates a frozen view without cloning or changing nested containers', () => {
    const source = deepFreeze(structuredClone(financialSourceData) as SourceData);
    const view = deepFreeze(expectValue(createInitialViewSpec(source)));
    const before = JSON.stringify(view);

    const result = validateViewSpec(view, source);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(view);
    }
    expect(JSON.stringify(view)).toBe(before);
  });
});
