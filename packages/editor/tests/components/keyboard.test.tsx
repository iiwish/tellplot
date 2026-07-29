import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditorSession,
  createInitialViewSpec,
  executeCommand,
  type CommandEvent,
  type ViewSpec,
} from '../../src';
import { FinancialChartEditor } from '../../src/components/FinancialChartEditor';
import {
  buildMoveItemCommand,
  resolveKeyboardMoveTarget,
} from '../../src/interactions/moveTargets';
import { commandSourceData } from '../fixtures/commandSourceData';

const g2Mock = vi.hoisted(() => {
  class Chart {
    readonly options = vi.fn((): this => this);
    readonly render = vi.fn((): Promise<void> => Promise.resolve());
    readonly destroy = vi.fn((): void => undefined);
    readonly on = vi.fn((): this => this);
    readonly off = vi.fn((): this => this);
    readonly getContext = vi.fn(() => ({ animations: [] }));
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

function initialView(): ViewSpec {
  const result = createInitialViewSpec(commandSourceData);
  if (!result.ok) {
    throw new Error('Expected valid keyboard fixture');
  }
  return result.value;
}

function groupedView(itemIds: readonly string[]): ViewSpec {
  const session = createEditorSession(commandSourceData);
  if (!session.ok) {
    throw new Error('Expected valid keyboard session');
  }
  const result = executeCommand(session.value, {
    schemaVersion: '1.0.0',
    id: `fixture-group-${itemIds.length}`,
    type: 'createGroup',
    source: 'host',
    baseRevision: 0,
    payload: {
      groupId: 'fixture-group',
      label: 'Fixture group',
      nodeIds: itemIds,
      initiallyCollapsed: false,
    },
  });
  if (!result.ok) {
    throw new Error('Expected grouped keyboard fixture');
  }
  return result.viewSpec;
}

beforeEach(() => {
  performance.clearMeasures();
});

describe('keyboard move operations', () => {
  it('resolves before/after and explicit into/out targets with command-schema indices', () => {
    const rootView = initialView();
    expect(resolveKeyboardMoveTarget(rootView, 'b', 'before')).toEqual({
      ok: true,
      target: { containerId: 'root', index: 0 },
    });
    expect(resolveKeyboardMoveTarget(rootView, 'b', 'after')).toEqual({
      ok: true,
      target: { containerId: 'root', index: 2 },
    });

    const viewWithGroup = groupedView(['a', 'b', 'c']);
    expect(resolveKeyboardMoveTarget(viewWithGroup, 'c', 'out')).toEqual({
      ok: true,
      target: { containerId: 'root', index: 1 },
    });
    expect(resolveKeyboardMoveTarget(viewWithGroup, 'a', 'out')).toEqual({
      ok: true,
      target: { containerId: 'root', index: 1 },
    });

    for (const source of ['direct', 'outline', 'keyboard'] as const) {
      expect(
        buildMoveItemCommand({
          id: `${source}-move-17`,
          source,
          baseRevision: 4,
          itemId: 'b',
          target: { containerId: 'root', index: 2 },
        }),
      ).toEqual({
        schemaVersion: '1.0.0',
        id: `${source}-move-17`,
        type: 'moveItem',
        source,
        baseRevision: 4,
        payload: { itemId: 'b', target: { containerId: 'root', index: 2 } },
      });
    }
  });

  it('moves before and after through keyboard commands and preserves focus', async () => {
    const events: CommandEvent[] = [];
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={event => events.push(event)}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    const beta = await screen.findByRole('treeitem', { name: /Beta confidential/ });
    beta.focus();
    fireEvent.keyDown(beta, { key: 'ArrowDown', altKey: true });

    await waitFor(() =>
      expect(
        document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision'),
      ).toBe('1'),
    );
    expect(events.at(-1)?.source).toBe('keyboard');
    expect(events.at(-1)?.type).toBe('moveItem');
    expect(views.at(-1)?.rootOrder).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(document.activeElement).toBe(
      screen.getByRole('treeitem', { name: /Beta confidential/ }),
    );
    expect(
      screen
        .getAllByRole('treeitem')
        .filter(row => row.getAttribute('aria-level') === '1')
        .map(row => row.getAttribute('data-node-id')),
    ).toEqual(['start', 'a', 'c', 'b', 'subtotal', 'd', 'e', 'end']);

    fireEvent.keyDown(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      key: 'ArrowUp',
      altKey: true,
    });
    await waitFor(() => expect(events).toHaveLength(2));
    expect(events.at(-1)?.source).toBe('keyboard');
    expect(events.at(-1)?.type).toBe('moveItem');
    expect(new Set(events.map(event => event.commandId)).size).toBe(2);
    expect(views.at(-1)?.rootOrder).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('uses one roving tree tab stop with ordinary row navigation and no command', async () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const tree = await screen.findByRole('tree', { name: '结构大纲' });
    const treeRows = (): HTMLElement[] => within(tree).getAllByRole('treeitem');
    expect(treeRows().filter(row => row.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(treeRows()[0]?.getAttribute('data-node-id')).toBe('start');

    const beta = within(tree).getByRole('treeitem', { name: /Beta confidential/ });
    beta.focus();
    await waitFor(() => expect(beta.getAttribute('tabindex')).toBe('0'));
    fireEvent.keyDown(beta, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(tree).getByRole('treeitem', { name: /Gamma confidential/ }),
      ),
    );
    expect(treeRows().filter(row => row.getAttribute('tabindex') === '0')).toHaveLength(1);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(tree).getByRole('treeitem', { name: /Ending/ })),
    );
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(tree).getByRole('treeitem', { name: /Opening/ })),
    );
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      '0',
    );
  });

  it('navigates group children and expands or collapses groups with Left and Right', async () => {
    const events: CommandEvent[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        defaultViewSpec={groupedView(['a', 'b', 'c'])}
        onCommand={event => events.push(event)}
      />,
    );

    const group = await screen.findByRole('treeitem', { name: /Fixture group/ });
    group.focus();
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: /Alpha confidential/ }),
      ),
    );
    expect(events).toHaveLength(0);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement).toBe(group));
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    await screen.findByRole('button', { name: '展开 Fixture group' });
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(events.at(-1)?.type).toBe('collapseGroup');

    fireEvent.keyDown(group, { key: 'ArrowRight' });
    await screen.findByRole('button', { name: '折叠 Fixture group' });
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(events.at(-1)?.type).toBe('expandGroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: /Alpha confidential/ }),
      ),
    );
    expect(events).toHaveLength(2);
  });

  it('supports move into and out while retaining a meaningful focused row', async () => {
    const events: CommandEvent[] = [];
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        defaultViewSpec={groupedView(['a', 'b', 'c'])}
        onCommand={event => events.push(event)}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    const gamma = await screen.findByRole('treeitem', { name: /Gamma confidential/ });
    gamma.focus();
    fireEvent.keyDown(gamma, { key: 'ArrowLeft', altKey: true });

    await waitFor(() => expect(events.at(-1)?.source).toBe('keyboard'));
    expect(views.at(-1)?.rootOrder).toEqual(['fixture-group', 'c', 'd', 'e']);
    expect(views.at(-1)?.groups['fixture-group']?.childIds).toEqual(['a', 'b']);
    expect(document.activeElement).toBe(
      screen.getByRole('treeitem', { name: /Gamma confidential/ }),
    );

    fireEvent.keyDown(screen.getByRole('treeitem', { name: /Gamma confidential/ }), {
      key: 'ArrowRight',
      altKey: true,
    });
    await waitFor(() => expect(events).toHaveLength(2));
    expect(events.at(-1)?.source).toBe('keyboard');
    expect(document.activeElement).toBe(
      screen.getByRole('treeitem', { name: /Gamma confidential/ }),
    );
    expect(views.at(-1)?.rootOrder).toEqual(['fixture-group', 'd', 'e']);
    expect(views.at(-1)?.groups['fixture-group']?.childIds).toEqual(['a', 'b', 'c']);
  });

  it('rejects fixed-item keyboard moves privately and Escape makes no change', async () => {
    const onCommand = vi.fn();
    const onCommandRejected = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={onCommand}
        onCommandRejected={onCommandRejected}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const opening = await screen.findByRole('treeitem', { name: /Opening/ });
    opening.focus();
    fireEvent.keyDown(opening, { key: 'ArrowDown', altKey: true });

    await screen.findByText('ITEM_LOCKED');
    expect(document.querySelector('.tp-command-feedback')?.textContent).toContain('ITEM_LOCKED');
    expect(onCommandRejected).toHaveBeenCalledOnce();
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();

    const betaHandle = screen.getByRole('button', { name: '拖动 Beta confidential' });
    fireEvent.pointerDown(betaHandle, {
      button: 0,
      pointerId: 7,
      isPrimary: true,
      clientX: 20,
      clientY: 80,
    });
    fireEvent.pointerMove(document, {
      pointerId: 7,
      isPrimary: true,
      clientX: 20,
      clientY: 120,
    });
    await waitFor(() =>
      expect(
        screen.getByRole('tree', { name: '结构大纲' }).getAttribute('data-interaction-state'),
      ).toBe('dragging'),
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() =>
      expect(
        screen.getByRole('tree', { name: '结构大纲' }).getAttribute('data-interaction-state'),
      ).toBe('idle'),
    );
    fireEvent.pointerUp(document, {
      pointerId: 7,
      isPrimary: true,
      clientX: 20,
      clientY: 120,
    });
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-drop-indicator]')).toHaveLength(0);
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      '0',
    );
  });

  it('rejects pinned and cross-segment keyboard moves without committing', async () => {
    const cases: readonly {
      readonly viewSpec: ViewSpec;
      readonly rowName: RegExp;
      readonly key: 'ArrowDown';
      readonly code: 'ITEM_LOCKED' | 'INVALID_DROP_TARGET';
    }[] = [
      {
        viewSpec: { ...initialView(), pinnedItemIds: ['b'] },
        rowName: /Beta confidential/,
        key: 'ArrowDown',
        code: 'ITEM_LOCKED',
      },
      {
        viewSpec: initialView(),
        rowName: /Gamma confidential/,
        key: 'ArrowDown',
        code: 'INVALID_DROP_TARGET',
      },
    ];

    for (const testCase of cases) {
      const onCommand = vi.fn();
      const onViewSpecChange = vi.fn();
      const onCommandRejected = vi.fn();
      const rendered = render(
        <FinancialChartEditor
          sourceData={commandSourceData}
          defaultViewSpec={testCase.viewSpec}
          onCommand={onCommand}
          onViewSpecChange={onViewSpecChange}
          onCommandRejected={onCommandRejected}
        />,
      );

      fireEvent.keyDown(await screen.findByRole('treeitem', { name: testCase.rowName }), {
        key: testCase.key,
        altKey: true,
      });
      await screen.findByText(testCase.code);
      expect(onCommandRejected).toHaveBeenCalledOnce();
      expect(onCommand).not.toHaveBeenCalled();
      expect(onViewSpecChange).not.toHaveBeenCalled();
      expect(document.querySelector('.tp-command-feedback')?.textContent).not.toContain(
        'confidential',
      );
      rendered.unmount();
    }
  });

  it('moves out of a two-member group and dissolves it as one keyboard command', async () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        defaultViewSpec={groupedView(['a', 'b'])}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    fireEvent.keyDown(await screen.findByRole('treeitem', { name: /Beta confidential/ }), {
      key: 'ArrowLeft',
      altKey: true,
    });

    await waitFor(() => expect(onCommand).toHaveBeenCalledOnce());
    expect(onCommand).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'moveItem', source: 'keyboard' }),
    );
    expect(onViewSpecChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rootOrder: ['a', 'b', 'c', 'd', 'e'],
        groups: {},
      }),
      expect.objectContaining({ source: 'keyboard' }),
    );
  });

  it('scopes delayed focus to the active editor when two instances share node ids', async () => {
    const firstCommand = vi.fn();
    const secondCommand = vi.fn();
    render(
      <>
        <section data-instance="first">
          <FinancialChartEditor sourceData={commandSourceData} onCommand={firstCommand} />
        </section>
        <section data-instance="second">
          <FinancialChartEditor sourceData={commandSourceData} onCommand={secondCommand} />
        </section>
      </>,
    );

    const first = document.querySelector<HTMLElement>('[data-instance="first"]');
    const second = document.querySelector<HTMLElement>('[data-instance="second"]');
    if (first === null || second === null) {
      throw new Error('Expected both editor instances');
    }
    const secondBeta = within(second).getByRole('treeitem', { name: /Beta confidential/ });
    secondBeta.focus();
    fireEvent.keyDown(secondBeta, { key: 'ArrowDown', altKey: true });

    await waitFor(() => expect(within(second).getByText('已移动，顺序已更新')).toBeTruthy());
    expect(firstCommand).not.toHaveBeenCalled();
    expect(secondCommand).toHaveBeenCalledOnce();
    expect(first.querySelector('[data-tellplot]')?.getAttribute('data-view-revision')).toBe('0');
    expect(second.querySelector('[data-tellplot]')?.getAttribute('data-view-revision')).toBe('1');
    expect(document.activeElement).toBe(secondBeta);
  });

  it('clears a pending focus timer when its editor unmounts', async () => {
    const first = render(<FinancialChartEditor sourceData={commandSourceData} />);
    const firstBeta = await screen.findByRole('treeitem', { name: /Beta confidential/ });
    firstBeta.focus();
    fireEvent.keyDown(firstBeta, { key: 'ArrowDown', altKey: true });
    first.unmount();

    render(<FinancialChartEditor sourceData={commandSourceData} />);
    const replacementBeta = await screen.findByRole('treeitem', { name: /Beta confidential/ });
    await new Promise(resolve => window.setTimeout(resolve, 10));
    expect(document.activeElement).not.toBe(replacementBeta);
  });
});
