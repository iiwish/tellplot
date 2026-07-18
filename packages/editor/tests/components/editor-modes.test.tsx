import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import type { PinItemCommand } from '../../src/domain/commands';
import type { CommandResult } from '../../src/domain/executeCommand';
import type { ViewSpec } from '../../src/domain/model';
import { useEditorController } from '../../src/react/useEditorController';
import { commandSourceData } from '../fixtures/commandSourceData';

function initialView(): ViewSpec {
  const result = createInitialViewSpec(commandSourceData);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid initial view');
  }

  return result.value;
}

function pinCommand(id: string, baseRevision = 0, itemId = 'a'): PinItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'pinItem',
    source: 'host',
    baseRevision,
    payload: { itemId },
  };
}

function expectAccepted(result: CommandResult | null | undefined): ViewSpec {
  expect(result?.ok).toBe(true);
  if (result === null || result === undefined || !result.ok) {
    throw new Error('Expected an accepted controller command');
  }

  return result.viewSpec;
}

describe('useEditorController modes', () => {
  it('locks uncontrolled mode to its initial default and commits accepted commands immediately', () => {
    const defaultViewSpec = initialView();
    const laterDefault: ViewSpec = {
      ...defaultViewSpec,
      revision: 1,
      pinnedItemIds: ['b'],
    };
    const { result, rerender } = renderHook(
      ({ currentDefault }: { readonly currentDefault: ViewSpec }) =>
        useEditorController({
          sourceData: commandSourceData,
          defaultViewSpec: currentDefault,
        }),
      { initialProps: { currentDefault: defaultViewSpec } },
    );

    expect(result.current.mode).toBe('uncontrolled');
    expect(result.current.status).toBe('ready');
    expect(result.current.viewSpec).toBe(defaultViewSpec);

    let commandResult: CommandResult | null | undefined;
    act(() => {
      commandResult = result.current.dispatch(pinCommand('uncontrolled-pin'));
    });

    const committedView = expectAccepted(commandResult);
    expect(result.current.viewSpec).toBe(committedView);
    expect(result.current.viewSpec?.revision).toBe(1);
    expect(result.current.viewSpec?.pinnedItemIds).toEqual(['a']);

    rerender({ currentDefault: laterDefault });

    expect(result.current.mode).toBe('uncontrolled');
    expect(result.current.viewSpec).toBe(committedView);
    expect(result.current.viewSpec?.pinnedItemIds).toEqual(['a']);
  });

  it('serializes synchronous uncontrolled commands against the latest accepted session', () => {
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        defaultViewSpec: initialView(),
      }),
    );

    let firstResult: CommandResult | null | undefined;
    let secondResult: CommandResult | null | undefined;
    act(() => {
      firstResult = result.current.dispatch(pinCommand('uncontrolled-first', 0, 'a'));
      secondResult = result.current.dispatch(pinCommand('uncontrolled-second', 1, 'b'));
    });

    expect(expectAccepted(firstResult).revision).toBe(1);
    expect(expectAccepted(secondResult).revision).toBe(2);
    expect(result.current.viewSpec?.revision).toBe(2);
    expect(result.current.viewSpec?.pinnedItemIds).toEqual(['a', 'b']);
  });

  it('keeps controlled rendering on props until the host echoes an accepted view', () => {
    const viewSpec = initialView();
    const { result, rerender } = renderHook(
      ({ currentView }: { readonly currentView: ViewSpec }) =>
        useEditorController({
          sourceData: commandSourceData,
          viewSpec: currentView,
        }),
      { initialProps: { currentView: viewSpec } },
    );

    expect(result.current.mode).toBe('controlled');
    expect(result.current.viewSpec).toBe(viewSpec);

    let commandResult: CommandResult | null | undefined;
    act(() => {
      commandResult = result.current.dispatch(pinCommand('controlled-pin'));
    });
    const emittedView = expectAccepted(commandResult);

    expect(emittedView.revision).toBe(1);
    expect(emittedView.pinnedItemIds).toEqual(['a']);
    expect(result.current.viewSpec).toBe(viewSpec);
    expect(result.current.viewSpec?.revision).toBe(0);
    expect(result.current.viewSpec?.pinnedItemIds).toEqual([]);

    rerender({ currentView: emittedView });

    expect(result.current.mode).toBe('controlled');
    expect(result.current.viewSpec).toBe(emittedView);
    expect(result.current.viewSpec?.pinnedItemIds).toEqual(['a']);
  });

  it('executes each controlled command from the visible prop while an echo is pending', () => {
    const viewSpec = initialView();
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        viewSpec,
      }),
    );

    let firstResult: CommandResult | null | undefined;
    let secondResult: CommandResult | null | undefined;
    act(() => {
      firstResult = result.current.dispatch(pinCommand('controlled-first', 0, 'a'));
    });
    act(() => {
      secondResult = result.current.dispatch(pinCommand('controlled-second', 0, 'b'));
    });

    expect(expectAccepted(firstResult).pinnedItemIds).toEqual(['a']);
    expect(expectAccepted(secondResult).pinnedItemIds).toEqual(['b']);
    expect(result.current.viewSpec).toBe(viewSpec);
    expect(result.current.session?.viewSpec).toBe(viewSpec);
  });

  it('returns a deterministic invalid controller when both controlled props are provided', () => {
    const viewSpec = initialView();
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        viewSpec,
        defaultViewSpec: viewSpec,
      }),
    );

    expect(result.current.mode).toBe('invalid');
    expect(result.current.status).toBe('invalid');
    expect(result.current.session).toBeNull();
    expect(result.current.viewSpec).toBeNull();
    expect(result.current.issues.length).toBeGreaterThan(0);
  });

  it('blocks write commands in read-only mode without emitting host callbacks', () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    const onCommandRejected = vi.fn();
    const viewSpec = initialView();
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        defaultViewSpec: viewSpec,
        readOnly: true,
        onCommand,
        onViewSpecChange,
        onCommandRejected,
      }),
    );

    let commandResult: CommandResult | null | undefined;
    act(() => {
      commandResult = result.current.dispatch(pinCommand('read-only-pin'));
    });

    expect(commandResult).toBeNull();
    expect(result.current.viewSpec).toBe(viewSpec);
    expect(result.current.session?.viewSpec).toBe(viewSpec);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(onCommandRejected).not.toHaveBeenCalled();
  });
});
