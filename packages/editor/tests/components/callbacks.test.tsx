import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FinancialChartEditor } from '../../src/components/FinancialChartEditor';
import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import type { PinItemCommand } from '../../src/domain/commands';
import type { CommandEvent, CommandResult } from '../../src/domain/executeCommand';
import type { ViewSpec } from '../../src/domain/model';
import type { SelectionState } from '../../src/react/editorTypes';
import { useEditorController } from '../../src/react/useEditorController';
import { commandSourceData } from '../fixtures/commandSourceData';

vi.mock('@antv/g2', () => ({
  Chart: class ChartMock {
    options(): this {
      return this;
    }

    render(): Promise<void> {
      return Promise.resolve();
    }

    on(): this {
      return this;
    }

    off(): this {
      return this;
    }

    getContext(): { readonly animations: readonly [] } {
      return { animations: [] };
    }

    destroy(): void {
      return;
    }
  },
}));

function initialView() {
  const result = createInitialViewSpec(commandSourceData);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid initial view');
  }

  return result.value;
}

function groupedView(): { readonly viewSpec: ViewSpec; readonly childIds: string[] } {
  const viewSpec = initialView();
  const childIds = ['a', 'b'];
  const groupId = 'group-ab';

  return {
    childIds,
    viewSpec: {
      ...viewSpec,
      rootOrder: [groupId, ...viewSpec.rootOrder.filter(id => !childIds.includes(id))],
      groups: {
        [groupId]: {
          id: groupId,
          label: 'Grouped confidential',
          childIds,
        },
      },
    },
  };
}

function pinCommand(id: string, baseRevision = 0): PinItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'pinItem',
    source: 'host',
    baseRevision,
    payload: { itemId: 'a' },
  };
}

describe('FinancialChartEditor callbacks', () => {
  it('emits onCommand before onViewSpecChange for an accepted command', () => {
    const calls: string[] = [];
    const onCommand = vi.fn<(event: CommandEvent) => void>(() => {
      calls.push('command');
    });
    const onViewSpecChange = vi.fn<(next: ViewSpec, event: CommandEvent) => void>(() => {
      calls.push('view');
    });
    const onCommandRejected = vi.fn(() => calls.push('rejected'));
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        viewSpec: initialView(),
        onCommand,
        onViewSpecChange,
        onCommandRejected,
      }),
    );

    let commandResult: CommandResult | null | undefined;
    act(() => {
      commandResult = result.current.dispatch(pinCommand('accepted-order'));
    });

    expect(commandResult?.ok).toBe(true);
    expect(calls).toEqual(['command', 'view']);
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onViewSpecChange).toHaveBeenCalledTimes(1);
    expect(onCommandRejected).not.toHaveBeenCalled();
    expect(onViewSpecChange.mock.calls[0]?.[1]).toBe(onCommand.mock.calls[0]?.[0]);
  });

  it('emits only onCommandRejected when command execution is rejected', () => {
    const calls: string[] = [];
    const onCommand = vi.fn(() => calls.push('command'));
    const onViewSpecChange = vi.fn(() => calls.push('view'));
    const onCommandRejected = vi.fn(() => calls.push('rejected'));
    const viewSpec = initialView();
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        defaultViewSpec: viewSpec,
        onCommand,
        onViewSpecChange,
        onCommandRejected,
      }),
    );

    let commandResult: CommandResult | null | undefined;
    act(() => {
      commandResult = result.current.dispatch(pinCommand('rejected-order', 99));
    });

    expect(commandResult?.ok).toBe(false);
    expect(calls).toEqual(['rejected']);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(onCommandRejected).toHaveBeenCalledTimes(1);
    expect(result.current.viewSpec).toBe(viewSpec);
  });

  it('emits a copied ID-based selection from an outline row', () => {
    const onSelectionChange = vi.fn<(selection: SelectionState) => void>();
    const { viewSpec, childIds } = groupedView();

    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        defaultViewSpec={viewSpec}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem', { name: /Grouped confidential/ }));

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeId: 'group-ab',
      nodeIds: ['group-ab'],
      sourceIds: ['a', 'b'],
    });
    const selection = onSelectionChange.mock.calls[0]?.[0];
    expect(selection?.sourceIds).not.toBe(childIds);
    childIds.push('c');
    expect(selection?.sourceIds).toEqual(['a', 'b']);
  });

  it('reconciles a controlled selection when a replacement view changes or removes its group', () => {
    const onSelectionChange = vi.fn<(selection: SelectionState) => void>();
    const first = groupedView().viewSpec;
    const replacement: ViewSpec = {
      ...first,
      revision: 7,
      rootOrder: ['group-ab', 'd', 'e'],
      groups: {
        'group-ab': {
          id: 'group-ab',
          label: 'Replacement group',
          childIds: ['a', 'b', 'c'],
        },
      },
    };
    const ungrouped: ViewSpec = { ...initialView(), revision: 11 };
    const { result, rerender } = renderHook(
      ({ viewSpec }: { readonly viewSpec: ViewSpec }) =>
        useEditorController({
          sourceData: commandSourceData,
          viewSpec,
          onSelectionChange,
        }),
      { initialProps: { viewSpec: first } },
    );

    act(() => {
      result.current.select({
        nodeId: 'group-ab',
        nodeIds: ['group-ab'],
        sourceIds: ['a', 'b'],
      });
    });
    rerender({ viewSpec: replacement });

    expect(result.current.selection).toEqual({
      nodeId: 'group-ab',
      nodeIds: ['group-ab'],
      sourceIds: ['a', 'b', 'c'],
    });
    expect(result.current.viewSpec?.revision).toBe(7);

    rerender({ viewSpec: ungrouped });

    expect(result.current.selection).toBeNull();
    expect(result.current.viewSpec?.revision).toBe(11);

    rerender({ viewSpec: replacement });

    expect(result.current.selection).toBeNull();
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('removes stale group details from the Inspector after a controlled view replacement', () => {
    const first = groupedView().viewSpec;
    const replacement: ViewSpec = {
      ...first,
      revision: 8,
      rootOrder: ['group-ab', 'd', 'e'],
      groups: {
        'group-ab': {
          id: 'group-ab',
          label: 'Replacement group',
          childIds: ['a', 'b', 'c'],
        },
      },
    };
    const { rerender } = render(
      <FinancialChartEditor sourceData={commandSourceData} viewSpec={first} />,
    );

    fireEvent.click(screen.getByRole('treeitem', { name: /Grouped confidential/ }));
    const inspector = screen.getByRole('complementary', { name: '检查器' });
    const inspectorSourceCount = (): string | null => {
      const term = within(inspector).getByText('来源数量');
      return term.parentElement?.querySelector('dd')?.textContent ?? null;
    };
    expect(inspector.textContent).toContain('Grouped confidential');
    expect(inspectorSourceCount()).toBe('2');
    expect(screen.getByRole('textbox', { name: '注释' })).toBeTruthy();

    rerender(<FinancialChartEditor sourceData={commandSourceData} viewSpec={replacement} />);

    expect(inspector.textContent).not.toContain('Grouped confidential');
    expect(inspector.textContent).toContain('Replacement group');
    expect(inspectorSourceCount()).toBe('3');

    rerender(
      <FinancialChartEditor
        sourceData={commandSourceData}
        viewSpec={{ ...initialView(), revision: 12 }}
      />,
    );

    expect(inspector.textContent).not.toContain('Grouped confidential');
    expect(inspector.textContent).not.toContain('group-ab');
    expect(screen.queryByRole('textbox', { name: '注释' })).toBeNull();
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      '12',
    );
  });

  it('contains every host callback exception and logs only callback identity', () => {
    const privateErrorText = 'caller-secret: Alpha confidential amount=123456';
    const calls: string[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onCommand = vi.fn(() => {
      calls.push('command');
      throw new Error(privateErrorText);
    });
    const onViewSpecChange = vi.fn(() => {
      calls.push('view');
      throw new Error(privateErrorText);
    });
    const onCommandRejected = vi.fn(() => {
      calls.push('rejected');
      throw new Error(privateErrorText);
    });
    const onSelectionChange = vi.fn(() => {
      calls.push('selection');
      throw new Error(privateErrorText);
    });
    const { result } = renderHook(() =>
      useEditorController({
        sourceData: commandSourceData,
        defaultViewSpec: initialView(),
        onCommand,
        onViewSpecChange,
        onCommandRejected,
        onSelectionChange,
      }),
    );

    expect(() => {
      act(() => {
        result.current.dispatch(pinCommand('contained-callback'));
      });
    }).not.toThrow();
    expect(() => {
      act(() => {
        result.current.dispatch(pinCommand('contained-rejection', 99));
      });
    }).not.toThrow();
    expect(() => {
      act(() => {
        result.current.select({ nodeId: 'a', nodeIds: ['a'], sourceIds: ['a'] });
      });
    }).not.toThrow();

    expect(calls).toEqual(['command', 'view', 'rejected', 'selection']);
    expect(onViewSpecChange).toHaveBeenCalledTimes(1);
    expect(onCommandRejected).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(4);

    const logged = consoleError.mock.calls
      .flatMap(call => call.map(value => String(value)))
      .join(' ');
    for (const identity of [
      'onCommand',
      'onViewSpecChange',
      'onCommandRejected',
      'onSelectionChange',
    ]) {
      expect(logged).toContain(identity);
    }
    expect(logged).not.toContain(privateErrorText);
    expect(logged).not.toContain('Alpha confidential');
    expect(logged).not.toContain('123456');
  });
});
