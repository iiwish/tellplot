import { describe, expect, it } from 'vitest';

import { editorMessages } from '../../src/editor/messages';

describe('editor messages', () => {
  it('covers all transient controls in both supported locales', () => {
    const english = editorMessages('en-US');
    expect({
      closeOutline: english.closeOutline,
      closeInspector: english.closeInspector,
      groupDialogTitle: english.groupDialogTitle,
      cancel: english.cancel,
      expandGroupAction: english.expandGroupAction,
      collapseGroupAction: english.collapseGroupAction,
      backdrop: english.backdrop(english.outline),
    }).toEqual({
      closeOutline: 'Close structure outline',
      closeInspector: 'Close inspector',
      groupDialogTitle: 'Create collapsed group',
      cancel: 'Cancel',
      expandGroupAction: 'Expand group',
      collapseGroupAction: 'Collapse group',
      backdrop: 'Structure outline backdrop',
    });

    const chinese = editorMessages('zh-CN');
    expect({
      closeOutline: chinese.closeOutline,
      closeInspector: chinese.closeInspector,
      groupDialogTitle: chinese.groupDialogTitle,
      cancel: chinese.cancel,
      expandGroupAction: chinese.expandGroupAction,
      collapseGroupAction: chinese.collapseGroupAction,
      backdrop: chinese.backdrop(chinese.outline),
    }).toEqual({
      closeOutline: '关闭结构大纲',
      closeInspector: '关闭检查器',
      groupDialogTitle: '创建折叠分组',
      cancel: '取消',
      expandGroupAction: '展开分组',
      collapseGroupAction: '折叠分组',
      backdrop: '结构大纲背景层',
    });
  });
});
