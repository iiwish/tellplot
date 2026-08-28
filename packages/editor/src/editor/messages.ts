import type { GroupSelectionMode } from '@tellplot/core';
import type { EditorLocale } from './formatAmount';

export interface EditorMessages {
  readonly toolbar: string;
  readonly outline: string;
  readonly inspector: string;
  readonly openOutline: string;
  readonly closeOutline: string;
  readonly openInspector: string;
  readonly closeInspector: string;
  readonly undo: string;
  readonly undoUnavailable: string;
  readonly redo: string;
  readonly redoUnavailable: string;
  readonly validated: string;
  readonly validation: string;
  readonly valid: string;
  readonly invalidData: string;
  readonly chartRenderFailed: string;
  readonly retryChartRender: string;
  readonly editorRenderFailed: string;
  readonly selectedItem: string;
  readonly sourceCount: string;
  readonly sourceItems: string;
  readonly revision: string;
  readonly dataset: string;
  readonly locked: string;
  readonly editable: string;
  readonly groupedItems: string;
  readonly seriesCount: (count: number) => string;
  readonly selectedNodes: (count: number) => string;
  readonly sourceCategories: (count: number) => string;
  readonly expanded: string;
  readonly collapsed: string;
  readonly pinned: string;
  readonly highlighted: string;
  readonly muted: string;
  readonly seriesRegistry: (labels: readonly string[]) => string;
  readonly comparisonSummary: (clusterCount: number, seriesCount: number) => string;
  readonly annotation: string;
  readonly annotationPlaceholder: string;
  readonly saveAnnotation: string;
  readonly annotationSaved: string;
  readonly annotationRemoved: string;
  readonly annotationTooLong: string;
  readonly waterfallTitle: string;
  readonly columnTitle: string;
  readonly barTitle: string;
  readonly groupLabel: string;
  readonly createGroup: string;
  readonly groupDialogTitle: string;
  readonly cancel: string;
  readonly ungroup: string;
  readonly groupLabelRequired: string;
  readonly groupTooSmall: string;
  readonly groupNonContiguous: string;
  readonly groupLocked: string;
  readonly groupRedundant: string;
  readonly moveInProgress: string;
  readonly moveAccepted: string;
  readonly groupCreated: string;
  readonly groupCollapsed: string;
  readonly groupExpanded: string;
  readonly groupRemoved: string;
  readonly undoAccepted: string;
  readonly redoAccepted: string;
  readonly actionCancelled: string;
  readonly targetUnavailable: string;
  readonly readOnlyReason: string;
  readonly selectLabel: (label: string) => string;
  readonly dragLabel: (label: string) => string;
  readonly expandGroupAction: string;
  readonly collapseGroupAction: string;
  readonly collapseGroup: (label: string) => string;
  readonly expandGroup: (label: string) => string;
  readonly groupSelectionSummary: (
    mode: GroupSelectionMode,
    parentLabel: string | null,
    nodeCount: number,
    sourceCount: number,
  ) => string;
  readonly backdrop: (label: string) => string;
}

const ZH_CN: EditorMessages = {
  toolbar: '编辑器工具栏',
  outline: '结构大纲',
  inspector: '检查器',
  openOutline: '打开结构大纲',
  closeOutline: '关闭结构大纲',
  openInspector: '打开检查器',
  closeInspector: '关闭检查器',
  undo: '撤销',
  undoUnavailable: '没有可撤销的修改',
  redo: '重做',
  redoUnavailable: '没有可重做的修改',
  validated: '已校验',
  validation: '数据校验',
  valid: '结构与金额锚点有效',
  invalidData: '数据无法渲染',
  chartRenderFailed: '图表渲染失败，请重试',
  retryChartRender: '重试渲染',
  editorRenderFailed: '编辑器界面渲染失败，请更新配置后重试',
  selectedItem: '当前选择',
  sourceCount: '来源数量',
  sourceItems: '项来源',
  revision: '视图版本',
  dataset: '数据集',
  locked: '已锁定',
  editable: '可编辑',
  groupedItems: '项',
  seriesCount: count => `${count} 个序列`,
  selectedNodes: count => `已选 ${count} 个节点`,
  sourceCategories: count => `${count} 个来源分类`,
  expanded: '已展开',
  collapsed: '已折叠',
  pinned: '已固定',
  highlighted: '已强调',
  muted: '已弱化',
  seriesRegistry: labels => `序列：${labels.join('、')}。`,
  comparisonSummary: (clusterCount, seriesCount) =>
    `共 ${clusterCount} 个可见分类或分组，${seriesCount} 个序列。`,
  annotation: '注释',
  annotationPlaceholder: '记录口径或汇报说明',
  saveAnnotation: '保存注释',
  annotationSaved: '注释已保存',
  annotationRemoved: '注释已移除',
  annotationTooLong: '注释不能超过 500 个字符',
  waterfallTitle: '经营变动瀑布图',
  columnTitle: '分类柱状图',
  barTitle: '分类条形图',
  groupLabel: '分组名称',
  createGroup: '创建分组',
  groupDialogTitle: '创建折叠分组',
  cancel: '取消',
  ungroup: '取消分组',
  groupLabelRequired: '请输入非空分组名称',
  groupTooSmall: '至少选择 2 项连续贡献项',
  groupNonContiguous: '所选节点必须连续且位于同一父级',
  groupLocked: '所选项目包含锁定项',
  groupRedundant: '所选内容已属于同一完整分组，请调整选择范围',
  moveInProgress: '正在移动…',
  moveAccepted: '已移动，顺序已更新',
  groupCreated: '分组已创建',
  groupCollapsed: '分组已折叠',
  groupExpanded: '分组已展开',
  groupRemoved: '分组已取消',
  undoAccepted: '已撤销上一项修改',
  redoAccepted: '已恢复上一项修改',
  actionCancelled: '操作已取消，视图未更改',
  targetUnavailable: '当前位置不是有效目标',
  readOnlyReason: '只读模式下不可修改结构',
  selectLabel: label => `选择 ${label}`,
  dragLabel: label => `拖动 ${label}`,
  expandGroupAction: '展开分组',
  collapseGroupAction: '折叠分组',
  collapseGroup: label => `折叠 ${label}`,
  expandGroup: label => `展开 ${label}`,
  groupSelectionSummary: (mode, parentLabel, nodeCount, sourceCount) =>
    mode === 'nested'
      ? `将在“${parentLabel ?? '当前分组'}”内创建子分组，共 ${sourceCount} 项来源`
      : mode === 'lifted'
        ? `已按分组边界选择 ${nodeCount} 个完整节点，共 ${sourceCount} 项来源`
        : `将 ${nodeCount} 个节点（${sourceCount} 项来源）创建为分组`,
  backdrop: label => `${label}背景层`,
};

const EN_US: EditorMessages = {
  toolbar: 'Editor toolbar',
  outline: 'Structure outline',
  inspector: 'Inspector',
  openOutline: 'Open structure outline',
  closeOutline: 'Close structure outline',
  openInspector: 'Open inspector',
  closeInspector: 'Close inspector',
  undo: 'Undo',
  undoUnavailable: 'No changes to undo',
  redo: 'Redo',
  redoUnavailable: 'No changes to redo',
  validated: 'Validated',
  validation: 'Data validation',
  valid: 'Structure and amount anchors are valid',
  invalidData: 'Data cannot be rendered',
  chartRenderFailed: 'Chart rendering failed. Try again.',
  retryChartRender: 'Retry rendering',
  editorRenderFailed: 'The editor interface failed to render. Update the configuration to retry.',
  selectedItem: 'Current selection',
  sourceCount: 'Source count',
  sourceItems: 'sources',
  revision: 'View revision',
  dataset: 'Dataset',
  locked: 'Locked',
  editable: 'Editable',
  groupedItems: 'items',
  seriesCount: count => `${count} series`,
  selectedNodes: count => `${count} selected ${count === 1 ? 'node' : 'nodes'}`,
  sourceCategories: count => `${count} source ${count === 1 ? 'category' : 'categories'}`,
  expanded: 'Expanded',
  collapsed: 'Collapsed',
  pinned: 'Pinned',
  highlighted: 'Highlighted',
  muted: 'Muted',
  seriesRegistry: labels => `Series registry: ${labels.join(', ')}.`,
  comparisonSummary: (clusterCount, seriesCount) =>
    `${clusterCount} visible ${clusterCount === 1 ? 'cluster' : 'clusters'} and ${seriesCount} series.`,
  annotation: 'Annotation',
  annotationPlaceholder: 'Add reporting context',
  saveAnnotation: 'Save annotation',
  annotationSaved: 'Annotation saved',
  annotationRemoved: 'Annotation removed',
  annotationTooLong: 'Annotation cannot exceed 500 characters',
  waterfallTitle: 'Operating bridge',
  columnTitle: 'Category column chart',
  barTitle: 'Category bar chart',
  groupLabel: 'Group label',
  createGroup: 'Create group',
  groupDialogTitle: 'Create collapsed group',
  cancel: 'Cancel',
  ungroup: 'Ungroup',
  groupLabelRequired: 'Enter a non-empty group label',
  groupTooSmall: 'Select at least 2 contiguous contributions',
  groupNonContiguous: 'Selected nodes must be contiguous siblings',
  groupLocked: 'The selection contains a locked item',
  groupRedundant: 'The selection already covers one complete group; adjust the selection',
  moveInProgress: 'Moving…',
  moveAccepted: 'Moved; order updated',
  groupCreated: 'Group created',
  groupCollapsed: 'Group collapsed',
  groupExpanded: 'Group expanded',
  groupRemoved: 'Group removed',
  undoAccepted: 'Previous change undone',
  redoAccepted: 'Previous change restored',
  actionCancelled: 'Action cancelled; the view is unchanged',
  targetUnavailable: 'This position is not a valid target',
  readOnlyReason: 'Structure cannot be changed in read-only mode',
  selectLabel: label => `Select ${label}`,
  dragLabel: label => `Drag ${label}`,
  expandGroupAction: 'Expand group',
  collapseGroupAction: 'Collapse group',
  collapseGroup: label => `Collapse ${label}`,
  expandGroup: label => `Expand ${label}`,
  groupSelectionSummary: (mode, parentLabel, nodeCount, sourceCount) =>
    mode === 'nested'
      ? `Create a subgroup inside “${parentLabel ?? 'the current group'}” from ${sourceCount} sources`
      : mode === 'lifted'
        ? `Selected ${nodeCount} complete nodes at group boundaries from ${sourceCount} sources`
        : `Create a group from ${nodeCount} nodes and ${sourceCount} sources`,
  backdrop: label => `${label} backdrop`,
};

export function editorMessages(locale: EditorLocale): EditorMessages {
  return locale === 'en-US' ? EN_US : ZH_CN;
}
