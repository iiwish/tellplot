import { createRef } from 'react';
import '@tellplot/react/styles.css';

import {
  ChartEditor,
  type ChartEditorHandle,
  type ChartEditorProps,
  type ChartRenderIssue,
  type ViewSpec,
} from '@tellplot/react';

declare const config: ChartEditorProps['config'];
declare const view: ViewSpec;

export const editorRef = createRef<ChartEditorHandle>();
export const editor = (
  <ChartEditor
    config={config}
    onViewChange={nextView => {
      const checked: ViewSpec = nextView;
      return checked;
    }}
    onRenderError={issue => {
      const checked: ChartRenderIssue | null = issue;
      return checked;
    }}
    ref={editorRef}
    view={view}
  />
);
