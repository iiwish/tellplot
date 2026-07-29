import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialViewSpec, type CommandEvent, type ViewSpec } from '../../src';
import { FinancialChartEditor } from '../../src/components/FinancialChartEditor';
import {
  resolvePointerDropPlacement,
  resolvePointerMoveTarget,
} from '../../src/interactions/moveTargets';
import { commandSourceData } from '../fixtures/commandSourceData';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];

    static reset(): void {
      Chart.instances = [];
    }

    readonly options = vi.fn((): this => this);
    readonly render = vi.fn((): Promise<void> => Promise.resolve());
    readonly destroy = vi.fn((): void => undefined);
    readonly on = vi.fn((): this => this);
    readonly off = vi.fn((): this => this);
    readonly getContext = vi.fn(() => ({
      animations: [],
      canvas: {
        document: {
          getElementsByClassName: vi.fn(() => [
            {
              __data__: { data: { nodeId: 'c' } },
              getBounds: vi.fn(() => ({ min: [120, 0], max: [160, 100] })),
            },
          ]),
        },
      },
    }));

    constructor(readonly config: unknown) {
      Chart.instances.push(this);
    }
  }

  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

function initialView(): ViewSpec {
  const result = createInitialViewSpec(commandSourceData);
  if (!result.ok) {
    throw new Error('Expected valid outline fixture');
  }
  return result.value;
}

beforeEach(() => {
  g2Mock.Chart.reset();
});

function installOutlineLayout(tree: HTMLElement): void {
  within(tree)
    .getAllByRole('treeitem')
    .forEach((row, index) => {
      Object.defineProperty(row, 'getBoundingClientRect', {
        configurable: true,
        value: () => new DOMRect(0, index * 40, 240, 36),
      });
    });
}

async function beginBetaDrag(pointerId: number): Promise<void> {
  const betaHandle = screen.getByRole('button', { name: '拖动 Beta confidential' });
  fireEvent.pointerDown(betaHandle, {
    button: 0,
    pointerId,
    isPrimary: true,
    clientX: 20,
    clientY: 98,
  });
  fireEvent.pointerMove(document, {
    pointerId,
    isPrimary: true,
    clientX: 20,
    clientY: 105,
  });
  await waitFor(() =>
    expect(document.querySelector('[data-tellplot]')?.getAttribute('data-interaction-state')).toBe(
      'dragging',
    ),
  );
}

async function moveBetaAfterGamma(pointerId: number): Promise<void> {
  fireEvent.pointerMove(document, {
    pointerId,
    isPrimary: true,
    clientX: 20,
    clientY: 155,
  });
  await waitFor(() =>
    expect(
      screen
        .getByRole('treeitem', { name: /Gamma confidential/ })
        .getAttribute('data-drop-indicator'),
    ).toBe('after'),
  );
}

async function moveBetaBeforeGamma(pointerId: number): Promise<void> {
  fireEvent.pointerMove(document, {
    pointerId,
    isPrimary: true,
    clientX: 20,
    clientY: 124,
  });
  await waitFor(() =>
    expect(
      screen
        .getByRole('treeitem', { name: /Gamma confidential/ })
        .getAttribute('data-drop-indicator'),
    ).toBe('before'),
  );
}

function endPointerDrag(pointerId: number): void {
  fireEvent.pointerUp(document, {
    pointerId,
    isPrimary: true,
    clientX: 20,
    clientY: 155,
  });
}

function ControlledReleaseHarness({
  viewSpec,
  releasePointerId,
  onCommand,
  onViewSpecChange,
}: {
  readonly viewSpec: ViewSpec;
  readonly releasePointerId: number | null;
  readonly onCommand: (event: CommandEvent) => void;
  readonly onViewSpecChange: (viewSpec: ViewSpec) => void;
}): React.JSX.Element {
  useLayoutEffect(() => {
    if (releasePointerId === null) {
      return;
    }
    fireEvent.pointerUp(document, {
      pointerId: releasePointerId,
      isPrimary: true,
      clientX: 20,
      clientY: 155,
    });
  }, [releasePointerId]);

  return (
    <FinancialChartEditor
      sourceData={commandSourceData}
      viewSpec={viewSpec}
      onCommand={onCommand}
      onViewSpecChange={onViewSpecChange}
    />
  );
}

describe('outline pointer targets', () => {
  it('renders expanded and collapsed recursive groups at their derived tree levels', async () => {
    const nestedView: ViewSpec = {
      ...initialView(),
      rootOrder: ['outer', 'd', 'e'],
      groups: {
        inner: { id: 'inner', label: 'Inner group', childIds: ['a', 'b'] },
        outer: { id: 'outer', label: 'Outer group', childIds: ['inner', 'c'] },
      },
    };
    const { rerender } = render(
      <FinancialChartEditor sourceData={commandSourceData} viewSpec={nestedView} />,
    );

    expect(
      (await screen.findByRole('treeitem', { name: /Outer group/ })).getAttribute('aria-level'),
    ).toBe('1');
    expect(screen.getByRole('treeitem', { name: /Inner group/ }).getAttribute('aria-level')).toBe(
      '2',
    );
    expect(
      screen.getByRole('treeitem', { name: /Alpha confidential/ }).getAttribute('aria-level'),
    ).toBe('3');
    expect(
      screen.getByRole('treeitem', { name: /Gamma confidential/ }).getAttribute('aria-level'),
    ).toBe('2');

    rerender(
      <FinancialChartEditor
        sourceData={commandSourceData}
        viewSpec={{ ...nestedView, collapsedGroupIds: ['inner'] }}
      />,
    );
    expect(screen.getByRole('treeitem', { name: /Inner group/ }).getAttribute('aria-level')).toBe(
      '2',
    );
    expect(screen.queryByRole('treeitem', { name: /Alpha confidential/ })).toBeNull();
    expect(screen.getByRole('treeitem', { name: /Gamma confidential/ })).toBeTruthy();
  });

  it('maps before/after targets after removing the active item', () => {
    const viewSpec = initialView();

    expect(
      resolvePointerMoveTarget(viewSpec, {
        itemId: 'b',
        targetNodeId: 'c',
        placement: 'after',
      }),
    ).toEqual({ ok: true, target: { containerId: 'root', index: 2 } });
    expect(
      resolvePointerMoveTarget(viewSpec, {
        itemId: 'c',
        targetNodeId: 'a',
        placement: 'before',
      }),
    ).toEqual({ ok: true, target: { containerId: 'root', index: 0 } });

    const nestedView: ViewSpec = {
      ...viewSpec,
      rootOrder: ['outer', 'd', 'e'],
      groups: {
        inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
      },
    };
    expect(
      resolvePointerMoveTarget(nestedView, {
        itemId: 'inner',
        targetNodeId: 'c',
        placement: 'after',
      }),
    ).toEqual({ ok: true, target: { containerId: 'outer', index: 1 } });
    expect(
      resolvePointerMoveTarget(nestedView, {
        itemId: 'c',
        targetNodeId: 'inner',
        placement: 'before',
      }),
    ).toEqual({ ok: true, target: { containerId: 'outer', index: 0 } });
    expect(
      resolvePointerMoveTarget(nestedView, {
        itemId: 'd',
        targetNodeId: 'inner',
        placement: 'inside',
      }),
    ).toEqual({ ok: true, target: { containerId: 'inner', index: 2 } });
    expect(
      resolvePointerMoveTarget(nestedView, {
        itemId: 'a',
        targetNodeId: 'inner',
        placement: 'inside',
      }),
    ).toEqual({ ok: true, target: { containerId: 'inner', index: 1 } });
    expect(
      resolvePointerMoveTarget(nestedView, {
        itemId: 'd',
        targetNodeId: 'c',
        placement: 'inside',
      }),
    ).toEqual({ ok: false, reason: 'INVALID_TARGET' });
    expect(resolvePointerDropPlacement(nestedView, 'inner', 0.5, 'after')).toBe('inside');
    expect(resolvePointerDropPlacement(nestedView, 'inner', 0.1, 'after')).toBe('after');
    expect(resolvePointerDropPlacement(nestedView, 'c', 0.5, 'before')).toBe('before');
  });

  it('shows an inside target on the middle of a group row and commits a cross-level move', async () => {
    const nestedView: ViewSpec = {
      ...initialView(),
      rootOrder: ['outer', 'd', 'e'],
      groups: {
        inner: { id: 'inner', label: 'Inner group', childIds: ['a', 'b'] },
        outer: { id: 'outer', label: 'Outer group', childIds: ['inner', 'c'] },
      },
    };
    const views: ViewSpec[] = [];
    const rejections = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        viewSpec={nestedView}
        onCommandRejected={rejections}
        onViewSpecChange={view => views.push(view)}
      />,
    );
    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    const handle = screen.getByRole('button', { name: '拖动 Gamma confidential' });

    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 12,
      isPrimary: true,
      clientX: 20,
      clientY: 218,
    });
    fireEvent.pointerMove(document, {
      pointerId: 12,
      isPrimary: true,
      clientX: 20,
      clientY: 225,
    });
    fireEvent.pointerMove(document, {
      pointerId: 12,
      isPrimary: true,
      clientX: 20,
      clientY: 98,
    });

    const innerRow = screen.getByRole('treeitem', { name: /Inner group/ });
    await waitFor(() => expect(innerRow.getAttribute('data-drop-inside')).toBe('true'));
    expect(innerRow.hasAttribute('data-drop-indicator')).toBe(false);
    fireEvent.pointerUp(document, {
      pointerId: 12,
      isPrimary: true,
      clientX: 20,
      clientY: 98,
    });

    await waitFor(() => expect(views).toHaveLength(1));
    expect(rejections).not.toHaveBeenCalled();
    expect(views[0]?.groups['inner']?.childIds).toEqual(['a', 'b', 'c']);
    expect(views[0]?.groups['outer']).toBeUndefined();
    expect(views[0]?.rootOrder).toEqual(['inner', 'd', 'e']);
  });

  it('marks locked rows as non-sortable while retaining stable tree semantics', async () => {
    render(<FinancialChartEditor sourceData={commandSourceData} />);

    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    expect(tree.getAttribute('aria-multiselectable')).toBe('true');
    const rows = within(tree).getAllByRole('treeitem');
    expect(rows).toHaveLength(commandSourceData.items.length);
    expect(rows.filter(row => row.getAttribute('tabindex') === '0')).toHaveLength(1);
    for (const row of rows) {
      expect(row.getAttribute('aria-level')).toBe('1');
    }

    expect(
      (screen.getByRole('button', { name: '拖动 Opening' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '拖动 Subtotal' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '拖动 Ending' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '拖动 Alpha confidential' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      screen.getByRole('button', { name: '拖动 Alpha confidential' }).getAttribute('tabindex'),
    ).toBe('-1');
    expect(
      screen
        .getByRole('treeitem', { name: /Alpha confidential/ })
        .getAttribute('data-source-count'),
    ).toBe('1');
    expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);
    const describedBy = screen
      .getByRole('button', { name: '拖动 Alpha confidential' })
      .getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const dragInstructions = describedBy === null ? null : document.getElementById(describedBy);
    expect(dragInstructions?.textContent).toContain('Alt');
    expect(dragInstructions?.textContent).not.toMatch(/space|空格/i);
  });

  it('starts pointer sorting from the draggable row body instead of requiring the grip', async () => {
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    const root = document.querySelector<HTMLElement>('[data-tellplot]');
    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    const betaRow = screen.getByRole('treeitem', { name: /Beta confidential/ });
    const betaLabel = within(betaRow).getByText('Beta confidential');

    fireEvent.pointerDown(betaLabel, {
      button: 0,
      pointerId: 20,
      isPrimary: true,
      clientX: 150,
      clientY: 98,
    });
    fireEvent.pointerMove(document, {
      pointerId: 20,
      isPrimary: true,
      clientX: 150,
      clientY: 105,
    });
    await waitFor(() => expect(root?.getAttribute('data-interaction-state')).toBe('dragging'));

    await moveBetaAfterGamma(20);
    endPointerDrag(20);

    await waitFor(() => expect(views).toHaveLength(1));
    expect(views[0]?.rootOrder).toEqual(['a', 'c', 'b', 'd', 'e']);
    // Let dnd-kit's post-drag click guard detach before the next isolated test.
    await new Promise<void>(resolve => window.setTimeout(resolve, 60));
  });

  it('keeps selection controls outside the row drag activator', async () => {
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor sourceData={commandSourceData} onViewSpecChange={onViewSpecChange} />,
    );

    const root = document.querySelector<HTMLElement>('[data-tellplot]');
    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    const checkbox = screen.getByRole('checkbox', { name: '选择 Beta confidential' });

    fireEvent.pointerDown(checkbox, {
      button: 0,
      pointerId: 19,
      isPrimary: true,
      clientX: 52,
      clientY: 98,
    });
    fireEvent.pointerMove(document, {
      pointerId: 19,
      isPrimary: true,
      clientX: 52,
      clientY: 112,
    });
    fireEvent.pointerUp(document, {
      pointerId: 19,
      isPrimary: true,
      clientX: 52,
      clientY: 112,
    });

    expect(root?.getAttribute('data-interaction-state')).toBe('idle');
    expect(screen.queryByTestId('outline-drag-overlay')).toBeNull();
    expect(onViewSpecChange).not.toHaveBeenCalled();
  });

  it('keeps a contiguous multi-selection in source order without changing the view', async () => {
    const onSelectionChange = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onSelectionChange={onSelectionChange}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    await screen.findByRole('treeitem', { name: /Alpha confidential/ });
    fireEvent.click(screen.getByRole('treeitem', { name: /Alpha confidential/ }));
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole('treeitem', { name: /Alpha confidential/ }).getAttribute('aria-selected'),
      ).toBe('true'),
    );
    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(
        screen.getByRole('treeitem', { name: /Alpha confidential/ }).getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        screen.getByRole('treeitem', { name: /Beta confidential/ }).getAttribute('aria-selected'),
      ).toBe('true');
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeId: 'b',
      nodeIds: ['a', 'b'],
      sourceIds: ['a', 'b'],
    });

    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      ctrlKey: true,
    });
    await waitFor(() => {
      expect(
        screen.getByRole('treeitem', { name: /Alpha confidential/ }).getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        screen.getByRole('treeitem', { name: /Beta confidential/ }).getAttribute('aria-selected'),
      ).toBe('false');
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeId: 'a',
      nodeIds: ['a'],
      sourceIds: ['a'],
    });
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      '0',
    );
  });

  it('commits one semantic outline pointer move and publishes a private preview', async () => {
    const events: CommandEvent[] = [];
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={{
          ...commandSourceData,
          items: commandSourceData.items.map(item =>
            item.id === 'b' ? { ...item, sourceRef: 'ledger://private/beta' } : item,
          ),
        }}
        onCommand={event => events.push(event)}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    const root = document.querySelector<HTMLElement>('[data-tellplot]');
    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    await beginBetaDrag(21);

    expect(root?.getAttribute('data-interaction-state')).toBe('dragging');
    expect(screen.getByTestId('outline-drag-overlay')).toBeTruthy();
    const status = document.querySelector<HTMLElement>('.tp-command-feedback');
    expect(status?.textContent).toContain('正在移动');
    expect(status?.textContent).not.toContain('Beta confidential');
    expect(status?.textContent).not.toContain('ledger://private/beta');
    expect(status?.textContent).not.toContain('CNY');

    await moveBetaBeforeGamma(21);
    await moveBetaAfterGamma(21);
    const chartPlot = screen.getByTestId('tellplot-chart');
    await waitFor(() => {
      expect(chartPlot.getAttribute('data-drop-indicator')).toBe('after');
      expect(chartPlot.getAttribute('data-drop-node-id')).toBe('c');
      expect(chartPlot.style.getPropertyValue('--tp-chart-drop-x')).toBe('160px');
    });
    endPointerDrag(21);

    await waitFor(() => expect(root?.getAttribute('data-interaction-state')).toBe('idle'));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'moveItem', source: 'outline' });
    expect(views).toHaveLength(1);
    expect(views[0]?.rootOrder).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(screen.queryByTestId('outline-drag-overlay')).toBeNull();
    expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);
    expect(status?.textContent).toContain('已移动，顺序已更新');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: /Beta confidential/ }),
      ),
    );
  });

  it('cancels an active outline drag when a new valid controlled view arrives', async () => {
    const initial = initialView();
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    const { rerender } = render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        viewSpec={initial}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    await beginBetaDrag(27);
    await moveBetaAfterGamma(27);

    const replacement: ViewSpec = {
      ...initial,
      revision: 1,
      rootOrder: ['a', 'c', 'b', 'd', 'e'],
    };
    rerender(
      <FinancialChartEditor
        sourceData={commandSourceData}
        viewSpec={replacement}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('[data-tellplot]')?.getAttribute('data-interaction-state'),
      ).toBe('idle'),
    );
    fireEvent.pointerMove(document, {
      pointerId: 27,
      isPrimary: true,
      clientX: 20,
      clientY: 124,
    });
    expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('treeitem')
          .filter(row => row.getAttribute('data-interaction-state') === 'dragging'),
      ).toHaveLength(0),
    );
    expect(screen.getAllByRole('treeitem').every(row => row.style.transform.length === 0)).toBe(
      true,
    );
    endPointerDrag(27);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('outline-drag-overlay')).toBeNull();
    expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);
    expect(document.querySelector('.tp-command-feedback')?.textContent).toContain(
      'ACTION_CANCELLED',
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: /Beta confidential/ }),
      ),
    );

    const replacementTree = screen.getByRole('tree', { name: '结构大纲' });
    installOutlineLayout(replacementTree);
    await beginBetaDrag(28);
    fireEvent.pointerMove(document, {
      pointerId: 28,
      isPrimary: true,
      clientX: 20,
      clientY: 85,
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole('treeitem', { name: /Gamma confidential/ })
          .getAttribute('data-drop-indicator'),
      ).toBe('before'),
    );
    fireEvent.pointerUp(document, {
      pointerId: 28,
      isPrimary: true,
      clientX: 20,
      clientY: 85,
    });
    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ source: 'outline' }));
    expect(onViewSpecChange).toHaveBeenCalledWith(
      expect.objectContaining({ rootOrder: ['a', 'b', 'c', 'd', 'e'] }),
      expect.objectContaining({ source: 'outline' }),
    );
  });

  it('cancels before a parent layout effect can release a stale controlled drag', async () => {
    const initial = initialView();
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    const { rerender } = render(
      <ControlledReleaseHarness
        viewSpec={initial}
        releasePointerId={null}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    await beginBetaDrag(29);
    await moveBetaAfterGamma(29);

    rerender(
      <ControlledReleaseHarness
        viewSpec={{ ...initial, revision: 1 }}
        releasePointerId={29}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('[data-tellplot]')?.getAttribute('data-interaction-state'),
      ).toBe('idle'),
    );
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);
    expect(screen.queryByTestId('outline-drag-overlay')).toBeNull();
  });

  for (const cancellation of ['blur', 'pointercancel'] as const) {
    it(`fully cancels an active drag on ${cancellation} and accepts the next pointer move`, async () => {
      const onCommand = vi.fn();
      const onViewSpecChange = vi.fn();
      render(
        <FinancialChartEditor
          sourceData={commandSourceData}
          onCommand={onCommand}
          onViewSpecChange={onViewSpecChange}
        />,
      );

      const root = document.querySelector<HTMLElement>('[data-tellplot]');
      const tree = await screen.findByRole('tree', { name: '结构大纲' });
      installOutlineLayout(tree);
      await beginBetaDrag(cancellation === 'blur' ? 31 : 41);

      if (cancellation === 'blur') {
        fireEvent.blur(window);
      } else {
        fireEvent.pointerCancel(document, {
          pointerId: 41,
          isPrimary: true,
          clientX: 20,
          clientY: 105,
        });
      }

      await waitFor(() => expect(root?.getAttribute('data-interaction-state')).toBe('idle'));
      endPointerDrag(cancellation === 'blur' ? 31 : 41);
      expect(onCommand).not.toHaveBeenCalled();
      expect(onViewSpecChange).not.toHaveBeenCalled();
      expect(root?.getAttribute('data-view-revision')).toBe('0');
      expect(screen.queryByTestId('outline-drag-overlay')).toBeNull();
      expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);

      const nextPointerId = cancellation === 'blur' ? 32 : 42;
      await beginBetaDrag(nextPointerId);
      await moveBetaAfterGamma(nextPointerId);
      endPointerDrag(nextPointerId);

      await waitFor(() => expect(onCommand).toHaveBeenCalledOnce());
      expect(onViewSpecChange).toHaveBeenCalledOnce();
      expect(root?.getAttribute('data-view-revision')).toBe('1');
      expect(root?.getAttribute('data-interaction-state')).toBe('idle');
    });
  }

  it('treats release without a semantic target as cancellation and remains reusable', async () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const root = document.querySelector<HTMLElement>('[data-tellplot]');
    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    installOutlineLayout(tree);
    await beginBetaDrag(51);
    fireEvent.pointerMove(document, {
      pointerId: 51,
      isPrimary: true,
      clientX: 1000,
      clientY: 1000,
    });
    await waitFor(() => expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0));
    fireEvent.pointerUp(document, {
      pointerId: 51,
      isPrimary: true,
      clientX: 1000,
      clientY: 1000,
    });

    await waitFor(() => expect(root?.getAttribute('data-interaction-state')).toBe('idle'));
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    const feedback = document.querySelector<HTMLElement>('.tp-command-feedback');
    expect(feedback?.textContent).toContain('ACTION_CANCELLED');
    expect(feedback?.textContent).not.toContain('INVALID_DROP_TARGET');
    await waitFor(() => {
      const announcement = Array.from(
        document.querySelectorAll<HTMLElement>('[aria-live="assertive"]'),
      )
        .map(region => region.textContent)
        .join(' ');
      expect(announcement).toContain('取消');
      expect(announcement).not.toContain('已移动');
    });

    await beginBetaDrag(52);
    await moveBetaAfterGamma(52);
    endPointerDrag(52);
    await waitFor(() => expect(onCommand).toHaveBeenCalledOnce());
    expect(onViewSpecChange).toHaveBeenCalledOnce();
    expect(root?.getAttribute('data-view-revision')).toBe('1');
  });
});
