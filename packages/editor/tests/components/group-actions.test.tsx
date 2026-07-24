import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  createInitialViewSpec,
  type CategoricalSourceData,
  type CommandEvent,
  type ViewSpec,
} from '../../src';
import { FinancialChartEditor } from '../../src/components/FinancialChartEditor';
import { evaluateGroupSelection } from '../../src/interactions/groupSelection';
import { projectWaterfall } from '../../src/charts/waterfall/projection';
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
    throw new Error('Expected valid grouping fixture');
  }
  return result.value;
}

const categoricalSource = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'categorical-group-selection',
  items: [
    { id: 'category-a', label: 'Category A', amount: 10 },
    { id: 'category-b', label: 'Category B', amount: 20 },
    { id: 'category-c', label: 'Category C', amount: 30 },
  ],
} as const satisfies CategoricalSourceData;

function categoricalView(): ViewSpec {
  const result = createInitialViewSpec(categoricalSource);
  if (!result.ok) {
    throw new Error('Expected valid categorical grouping fixture');
  }
  return result.value;
}

describe('group selection and actions', () => {
  it('shows group creation only for multi-selection and keeps a selected group contextual', async () => {
    const groupedView: ViewSpec = {
      ...initialView(),
      rootOrder: ['group-ab', 'c', 'd', 'e'],
      groups: {
        'group-ab': { id: 'group-ab', label: 'Existing group', childIds: ['a', 'b'] },
      },
    };
    render(<FinancialChartEditor sourceData={commandSourceData} defaultViewSpec={groupedView} />);

    fireEvent.click(await screen.findByRole('treeitem', { name: /Existing group/ }));
    expect(screen.queryByRole('textbox', { name: '分组名称' })).toBeNull();
    expect(screen.queryByRole('button', { name: '创建分组' })).toBeNull();
    expect(screen.getByRole('button', { name: '取消分组' })).toBeDefined();

    fireEvent.click(screen.getByRole('treeitem', { name: /Gamma confidential/ }));
    expect(screen.queryByRole('textbox', { name: '分组名称' })).toBeNull();
    expect(screen.queryByRole('button', { name: '创建分组' })).toBeNull();

    fireEvent.click(screen.getByRole('treeitem', { name: /Delta confidential/ }), {
      ctrlKey: true,
    });
    expect(screen.getByRole('textbox', { name: '分组名称' })).toBeDefined();
    expect(screen.getByRole('button', { name: '创建分组' })).toBeDefined();
  });

  it('returns focus to the annotation field after saving without remounting the control', async () => {
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    const annotation = screen.getByRole('textbox', { name: '注释' });
    fireEvent.change(annotation, { target: { value: '保持焦点的批注' } });
    const save = screen.getByRole('button', { name: '保存注释' });
    save.focus();
    expect(document.activeElement).toBe(save);

    fireEvent.click(save);

    await waitFor(() => expect(views.at(-1)?.annotations['a']).toBe('保持焦点的批注'));
    const committed = screen.getByRole('textbox', { name: '注释' });
    expect(committed).toBe(annotation);
    expect(document.activeElement).toBe(committed);
  });

  it('edits the selected annotation through the command history and restores it with redo', async () => {
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    const annotation = screen.getByRole('textbox', { name: '注释' });
    fireEvent.change(annotation, { target: { value: '董事会口径：剔除一次性因素' } });
    fireEvent.click(screen.getByRole('button', { name: '保存注释' }));

    await waitFor(() => expect(views.at(-1)?.annotations['a']).toBe('董事会口径：剔除一次性因素'));
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      '1',
    );
    expect(screen.getByText('注释已保存')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '撤销' }));
    await waitFor(() =>
      expect((screen.getByRole('textbox', { name: '注释' }) as HTMLTextAreaElement).value).toBe(''),
    );
    expect(views.at(-1)?.annotations['a']).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: '重做' }));
    await waitFor(() =>
      expect((screen.getByRole('textbox', { name: '注释' }) as HTMLTextAreaElement).value).toBe(
        '董事会口径：剔除一次性因素',
      ),
    );
    expect(views.at(-1)?.annotations['a']).toBe('董事会口径：剔除一次性因素');

    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }));
    expect((screen.getByRole('textbox', { name: '注释' }) as HTMLTextAreaElement).value).toBe('');
  });

  it('counts annotation Unicode code points and blocks over-limit or read-only saves', async () => {
    const views: ViewSpec[] = [];
    const { unmount } = render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    const annotation = screen.getByRole('textbox', { name: '注释' });
    fireEvent.change(annotation, { target: { value: '😀'.repeat(500) } });
    expect(screen.getByText('500 / 500')).toBeDefined();
    expect(annotation.getAttribute('aria-invalid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '保存注释' }));
    await waitFor(() => expect(views.at(-1)?.annotations['a']).toBe('😀'.repeat(500)));

    const committed = screen.getByRole('textbox', { name: '注释' });
    fireEvent.change(committed, { target: { value: '😀'.repeat(501) } });
    expect(screen.getByText('501 / 500').getAttribute('data-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('注释不能超过 500 个字符');
    expect(committed.getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByRole('button', { name: '保存注释' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(views).toHaveLength(1);

    unmount();
    render(<FinancialChartEditor sourceData={commandSourceData} readOnly />);
    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    expect((screen.getByRole('textbox', { name: '注释' }) as HTMLTextAreaElement).readOnly).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: '保存注释' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('classifies contiguous root contributions without reordering the selection', () => {
    expect(evaluateGroupSelection(commandSourceData, initialView(), ['b', 'a'])).toEqual({
      ok: true,
      nodeIds: ['a', 'b'],
      sourceIds: ['a', 'b'],
    });
    expect(evaluateGroupSelection(commandSourceData, initialView(), ['a', 'c'])).toEqual({
      ok: false,
      reason: 'NON_CONTIGUOUS_GROUP_SELECTION',
    });
    expect(evaluateGroupSelection(commandSourceData, initialView(), ['a'])).toEqual({
      ok: false,
      reason: 'GROUP_TOO_SMALL',
    });
    expect(
      evaluateGroupSelection(commandSourceData, { ...initialView(), pinnedItemIds: ['b'] }, [
        'a',
        'b',
      ]),
    ).toEqual({ ok: false, reason: 'ITEM_LOCKED' });
  });

  it('classifies plain categorical items as groupable while preserving pin rejection', () => {
    expect(
      evaluateGroupSelection(categoricalSource, categoricalView(), ['category-b', 'category-a']),
    ).toEqual({
      ok: true,
      nodeIds: ['category-a', 'category-b'],
      sourceIds: ['category-a', 'category-b'],
    });
    expect(
      evaluateGroupSelection(
        categoricalSource,
        { ...categoricalView(), pinnedItemIds: ['category-b'] },
        ['category-a', 'category-b'],
      ),
    ).toEqual({ ok: false, reason: 'ITEM_LOCKED' });
  });

  it('classifies contiguous recursive nodes only within the same parent', () => {
    const viewSpec: ViewSpec = {
      ...initialView(),
      rootOrder: ['outer', 'd', 'e'],
      groups: {
        inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
      },
    };

    expect(evaluateGroupSelection(commandSourceData, viewSpec, ['c', 'inner'])).toEqual({
      ok: true,
      nodeIds: ['inner', 'c'],
      sourceIds: ['a', 'b', 'c'],
    });
    expect(evaluateGroupSelection(commandSourceData, viewSpec, ['b', 'c'])).toEqual({
      ok: false,
      reason: 'NON_CONTIGUOUS_GROUP_SELECTION',
    });
  });

  it('supports modifier-free additive selection through touch-sized checkboxes', async () => {
    const onSelectionChange = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onSelectionChange={onSelectionChange}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const alpha = await screen.findByRole('checkbox', { name: '选择 Alpha confidential' });
    const beta = screen.getByRole('checkbox', { name: '选择 Beta confidential' });
    fireEvent.click(alpha);
    fireEvent.click(beta);

    await waitFor(() => {
      expect((alpha as HTMLInputElement).checked).toBe(true);
      expect((beta as HTMLInputElement).checked).toBe(true);
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeId: 'b',
      nodeIds: ['a', 'b'],
      sourceIds: ['a', 'b'],
    });
    expect((screen.getByRole('button', { name: '创建分组' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: 'Touch group' },
    });
    expect((screen.getByRole('button', { name: '创建分组' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(onViewSpecChange).not.toHaveBeenCalled();
  });

  it('validates the label, creates a group, and conserves projected amount and sources', async () => {
    const sourceIdentity = commandSourceData;
    const sourceSnapshot = JSON.stringify(commandSourceData);
    const views: ViewSpec[] = [];
    const events: CommandEvent[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
        onCommand={event => events.push(event)}
      />,
    );

    const alpha = await screen.findByRole('treeitem', { name: /Alpha confidential/ });
    const beta = screen.getByRole('treeitem', { name: /Beta confidential/ });
    fireEvent.click(alpha);
    fireEvent.click(beta, { ctrlKey: true });

    const groupButton = screen.getByRole('button', { name: '创建分组' });
    expect((groupButton as HTMLButtonElement).disabled).toBe(true);
    expect(groupButton.getAttribute('title')).toContain('分组名称');
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '增长驱动' },
    });
    expect((groupButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(groupButton);

    await waitFor(() => expect(events.at(-1)?.type).toBe('createGroup'));
    expect(events.at(-1)?.source).toBe('outline');
    const groupedView = views.at(-1);
    expect(groupedView).toBeDefined();
    const group = Object.values(groupedView?.groups ?? {})[0];
    expect(group?.label).toBe('增长驱动');
    expect(group?.childIds).toEqual(['a', 'b']);

    const projection = projectWaterfall(commandSourceData, groupedView as ViewSpec);
    expect(projection.ok).toBe(true);
    if (projection.ok) {
      expect(projection.value.flatMap(datum => datum.sourceIds).sort()).toEqual(
        commandSourceData.items.map(item => item.id).sort(),
      );
      expect(projection.value.find(datum => datum.nodeId === 'a')?.amount).toBe(1);
      expect(projection.value.find(datum => datum.nodeId === 'b')?.amount).toBe(2);
    }
    expect(commandSourceData).toBe(sourceIdentity);
    expect(JSON.stringify(commandSourceData)).toBe(sourceSnapshot);
  });

  it('uses a real disclosure button for collapse/expand and ungroup restores children', async () => {
    const user = userEvent.setup();
    const baselineRootOrder = initialView().rootOrder;
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );
    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      ctrlKey: true,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '增长驱动' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建分组' }));

    const collapse = await screen.findByRole('button', { name: '折叠 增长驱动' });
    const beforeCollapse = projectWaterfall(commandSourceData, views.at(-1) as ViewSpec);
    expect(beforeCollapse.ok).toBe(true);
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    collapse.focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '展开 增长驱动' }).getAttribute('aria-expanded'),
      ).toBe('false'),
    );
    expect(screen.queryByRole('treeitem', { name: /Alpha confidential/ })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '展开 增长驱动' }));
    const collapsedView = views.at(-1);
    expect(collapsedView?.collapsedGroupIds).toHaveLength(1);
    const collapsedProjection = projectWaterfall(commandSourceData, collapsedView as ViewSpec);
    expect(collapsedProjection.ok).toBe(true);
    if (collapsedProjection.ok) {
      const groupId = collapsedView?.collapsedGroupIds[0];
      const groupDatum = collapsedProjection.value.find(datum => datum.nodeId === groupId);
      expect(groupDatum?.amount).toBe(3);
      expect(groupDatum?.sourceIds).toEqual(['a', 'b']);
      expect(collapsedProjection.value.flatMap(datum => datum.sourceIds).sort()).toEqual(
        commandSourceData.items.map(item => item.id).sort(),
      );
      expect(collapsedProjection.value[0]?.nodeId).toBe('start');
      expect(collapsedProjection.value.at(-1)?.nodeId).toBe('end');
      expect(collapsedProjection.value.at(-1)?.amount).toBe(17);
    }

    const expand = screen.getByRole('button', { name: '展开 增长驱动' });
    expand.focus();
    await user.keyboard(' ');
    await screen.findByRole('treeitem', { name: /Alpha confidential/ });
    const expandedProjection = projectWaterfall(commandSourceData, views.at(-1) as ViewSpec);
    expect(expandedProjection.ok).toBe(true);
    expect(expandedProjection).toEqual(beforeCollapse);
    if (expandedProjection.ok) {
      expect(
        expandedProjection.value
          .filter(datum => datum.nodeId === 'a' || datum.nodeId === 'b')
          .map(datum => ({
            nodeId: datum.nodeId,
            amount: datum.amount,
            sourceIds: datum.sourceIds,
          })),
      ).toEqual([
        { nodeId: 'a', amount: 1, sourceIds: ['a'] },
        { nodeId: 'b', amount: 2, sourceIds: ['b'] },
      ]);
    }
    fireEvent.click(screen.getByRole('treeitem', { name: /增长驱动/ }));
    fireEvent.click(screen.getByRole('button', { name: '取消分组' }));

    await waitFor(() => expect(screen.queryByRole('treeitem', { name: /增长驱动/ })).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole('treeitem', { name: /Alpha confidential/ }),
    );
    expect(Object.keys(views.at(-1)?.groups ?? {})).toHaveLength(0);
    expect(views.at(-1)?.rootOrder).toEqual(baselineRootOrder);
    expect(views.at(-1)?.collapsedGroupIds).toEqual([]);
    const ungroupedProjection = projectWaterfall(commandSourceData, views.at(-1) as ViewSpec);
    expect(ungroupedProjection.ok).toBe(true);
    if (ungroupedProjection.ok) {
      expect(ungroupedProjection.value.flatMap(datum => datum.sourceIds).sort()).toEqual(
        commandSourceData.items.map(item => item.id).sort(),
      );
      expect(ungroupedProjection.value.at(-1)?.amount).toBe(17);
    }
  });

  it('disables group disclosure in read-only mode with an explicit reason', async () => {
    const views: ViewSpec[] = [];
    const editable = render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );
    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      ctrlKey: true,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '只读分组' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建分组' }));
    await waitFor(() => expect(views).toHaveLength(1));
    const groupedView = views[0];
    if (groupedView === undefined) {
      throw new Error('Expected grouped view');
    }
    editable.unmount();

    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        defaultViewSpec={groupedView}
        readOnly
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    const disclosure = await screen.findByRole('button', { name: '折叠 只读分组' });
    expect((disclosure as HTMLButtonElement).disabled).toBe(true);
    expect(disclosure.getAttribute('title')).toContain('只读');
    expect(disclosure.getAttribute('aria-description')).toContain('只读');
    fireEvent.click(disclosure);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      String(groupedView.revision),
    );
  });

  it('routes a contiguous cross-subtotal group attempt to domain rejection with zero commit', async () => {
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

    fireEvent.click(await screen.findByRole('treeitem', { name: /Gamma confidential/ }));
    fireEvent.click(screen.getByRole('treeitem', { name: /Delta confidential/ }), {
      ctrlKey: true,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '跨小计分组' },
    });
    const button = screen.getByRole('button', { name: '创建分组' });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);

    await screen.findByText('INVALID_DROP_TARGET');
    expect(onCommandRejected).toHaveBeenCalledOnce();
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-view-revision]')?.getAttribute('data-view-revision')).toBe(
      '0',
    );
  });

  it('keeps blank-label grouping disabled with zero command commit', async () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      ctrlKey: true,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '   ' },
    });

    const button = screen.getByRole('button', { name: '创建分组' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toContain('分组名称');
    fireEvent.click(button);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
  });

  it('hides group creation for a single-item selection with zero command commit', async () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    expect(screen.queryByRole('textbox', { name: '分组名称' })).toBeNull();
    expect(screen.queryByRole('button', { name: '创建分组' })).toBeNull();
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
  });

  it('keeps a non-contiguous selection disabled with zero command commit', async () => {
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    fireEvent.click(screen.getByRole('treeitem', { name: /Gamma confidential/ }), {
      ctrlKey: true,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '非连续分组' },
    });
    const button = screen.getByRole('button', { name: '创建分组' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toContain('连续');
    fireEvent.click(button);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
  });

  it('keeps a pinned selection disabled with zero command commit and an explicit reason', async () => {
    const pinnedView: ViewSpec = { ...initialView(), pinnedItemIds: ['b'] };
    const onCommand = vi.fn();
    const onViewSpecChange = vi.fn();
    render(
      <FinancialChartEditor
        sourceData={commandSourceData}
        defaultViewSpec={pinnedView}
        onCommand={onCommand}
        onViewSpecChange={onViewSpecChange}
      />,
    );

    fireEvent.click(await screen.findByRole('treeitem', { name: /Alpha confidential/ }));
    fireEvent.click(screen.getByRole('treeitem', { name: /Beta confidential/ }), {
      ctrlKey: true,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '不可用分组' },
    });
    const button = screen.getByRole('button', { name: '创建分组' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toContain('锁定');
    fireEvent.click(button);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewSpecChange).not.toHaveBeenCalled();
  });
});
