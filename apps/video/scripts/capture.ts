import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

import {
  REQUIRED_CAPTURE_IDS,
  type CaptureId,
  type CaptureManifest,
  type CaptureRecord,
} from '../src/captureContract.ts';
import { marqueeAroundMarks, type MarkBounds } from '../src/captureGeometry.ts';
import {
  STORY_ACTION_SECONDS,
  STORY_CAPTURE_PRESENTATION,
  STORY_CONTRACT,
  STORY_PACING_SECONDS,
} from '../src/storyContract.ts';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const videoRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(videoRoot, '../..');
const capturesDirectory = resolve(videoRoot, 'public/captures');
const temporaryDirectory = resolve(videoRoot, 'out/capture-temp');
const baseUrl = 'http://127.0.0.1:4176';
const viewport = { width: 3840, height: 2160 } as const;
const logicalViewport = { width: 1920, height: 1080 } as const;
const contentScale = 2 as const;
const deviceScaleFactor = 1 as const;
const recordSize = { width: 3840, height: 2160 } as const;
const editorSelector = '[data-tellplot="editor"]';
const expectedWaterfallBars = 12;
const actionPreRollMs = 650;
const pointerMetadata = {
  mode: 'page-event-overlay',
  version: 1,
  clickFeedbackMs: 160,
} as const;

interface ChartPoint extends MarkBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly x: number;
  readonly y: number;
}

interface CaptureDefinition {
  readonly id: CaptureId;
  readonly url: string;
  readonly assertions: readonly string[];
  readonly prepare: (page: Page) => Promise<void>;
  readonly perform: (page: Page) => Promise<void>;
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // The production preview is still starting.
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200));
  }
  throw new Error('TellPlot production preview did not start within 30 seconds.');
}

function startPreview(): ChildProcess {
  return spawn(
    'pnpm',
    [
      '--filter',
      '@tellplot/playground',
      'exec',
      'vite',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4176',
      '--strictPort',
    ],
    { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

async function waitForAttribute(
  locator: Locator,
  name: string,
  value: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await locator.getAttribute(name)) === value) {
      return;
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Expected ${name}=${value}.`);
}

async function waitForText(locator: Locator, expected: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await locator.textContent())?.includes(expected)) {
      return;
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Expected visible text: ${expected}`);
}

async function waitForInputValue(
  locator: Locator,
  expected: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await locator.inputValue()).includes(expected)) {
      return;
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Expected input value: ${expected}`);
}

async function smoothMove(
  page: Page,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  durationMs: number,
  steps = 18,
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
    await page.waitForTimeout(durationMs / steps);
  }
}

async function installVideoPointer(page: Page): Promise<void> {
  await page.evaluate(pointer => {
    if (document.querySelector('[data-tellplot-video-pointer]') !== null) {
      return;
    }
    const style = document.createElement('style');
    style.textContent = `
      [data-tellplot-video-pointer] {
        position: fixed;
        z-index: 2147483647;
        top: 0;
        left: 0;
        width: 34px;
        height: 42px;
        pointer-events: none;
        will-change: transform;
        transform: translate3d(calc(100vw - 80px), calc(100vh - 80px), 0);
      }
      [data-tellplot-video-pointer]::before,
      [data-tellplot-video-pointer]::after {
        position: absolute;
        top: 0;
        left: 0;
        content: '';
        clip-path: polygon(0 0, 0 31px, 8px 23px, 14px 38px, 21px 35px, 15px 21px, 27px 21px);
      }
      [data-tellplot-video-pointer]::before {
        width: 29px;
        height: 40px;
        background: #ffffff;
        filter: drop-shadow(0 2px 4px rgba(17, 24, 39, 0.42));
      }
      [data-tellplot-video-pointer]::after {
        top: 2px;
        left: 2px;
        width: 25px;
        height: 36px;
        background: #111827;
        clip-path: polygon(0 0, 0 26px, 7px 20px, 13px 34px, 18px 32px, 12px 18px, 23px 18px);
      }
      [data-tellplot-video-pointer] > i {
        position: absolute;
        z-index: -1;
        top: -15px;
        left: -15px;
        width: 42px;
        height: 42px;
        border: 3px solid #2f7cf6;
        border-radius: 50%;
        opacity: 0;
        transform: scale(1.12);
        transition:
          opacity ${pointer.clickFeedbackMs}ms cubic-bezier(0.23, 1, 0.32, 1),
          transform ${pointer.clickFeedbackMs}ms cubic-bezier(0.23, 1, 0.32, 1);
      }
      [data-tellplot-video-pointer][data-pressed='true'] > i {
        opacity: 0.9;
        transform: scale(0.7);
      }
    `;
    const cursor = document.createElement('div');
    cursor.dataset['tellplotVideoPointer'] = '';
    cursor.dataset['pressed'] = 'false';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.append(document.createElement('i'));
    document.head.append(style);
    document.body.append(cursor);
    window.addEventListener(
      'pointermove',
      event => {
        cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      },
      true,
    );
    window.addEventListener(
      'pointerdown',
      () => {
        cursor.dataset['pressed'] = 'true';
      },
      true,
    );
    const release = (): void => {
      cursor.dataset['pressed'] = 'false';
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
  }, pointerMetadata);
}

async function applyHighResolutionViewport(page: Page): Promise<void> {
  const groupDialogPosition =
    STORY_CAPTURE_PRESENTATION.groupDialogPlacement === 'editor-center' ? 'absolute' : 'fixed';
  const selectionTooltipRule = STORY_CAPTURE_PRESENTATION.suppressTooltipWhileSelecting
    ? `${editorSelector}[data-interaction-state='selecting'] .g2-tooltip { display: none !important; }`
    : '';
  await page.addStyleTag({
    content: `
      html,
      body,
      #root {
        width: ${logicalViewport.width}px !important;
        height: ${logicalViewport.height}px !important;
        min-height: ${logicalViewport.height}px !important;
        overflow: hidden !important;
      }
      #root > div {
        min-height: ${logicalViewport.height}px !important;
      }
      ${editorSelector} .tp-group-dialog-layer {
        position: ${groupDialogPosition} !important;
        inset: 0 !important;
      }
      ${selectionTooltipRule}
    `,
  });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: contentScale });
  await session.detach();
}

async function openEditor(page: Page, keepUsage = false): Promise<void> {
  await page.goto(`${baseUrl}/playground`, { waitUntil: 'networkidle' });
  await applyHighResolutionViewport(page);
  const editor = page.locator(`${editorSelector}[data-editor-state="ready"]`);
  await editor.waitFor({ state: 'visible' });
  await page.getByTestId('tellplot-chart-stage').waitFor({ state: 'visible' });
  if (!keepUsage) {
    const hideUsage = page.getByRole('button', { name: '隐藏使用代码' });
    if (await hideUsage.isVisible()) {
      await hideUsage.click();
    }
  }
  await page.waitForTimeout(700);
}

async function waterfallBarPoints(page: Page): Promise<readonly ChartPoint[]> {
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  const localPoints = await canvas.evaluate((element, expectedBarCount) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const palette: readonly (readonly [number, number, number])[] = [
      [47, 124, 246],
      [18, 183, 106],
      [240, 68, 100],
      [20, 184, 166],
    ];
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const ysByX: number[][] = Array.from({ length: element.width }, () => []);
    for (let x = 0; x < element.width; x += 1) {
      for (let y = 0; y < element.height; y += 1) {
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (
          alpha > 120 &&
          palette.some(
            ([r, g, b]) =>
              Math.abs(red - r) <= 8 && Math.abs(green - g) <= 8 && Math.abs(blue - b) <= 8,
          )
        ) {
          ysByX[x]?.push(y);
        }
      }
    }
    const clusters: { minX: number; maxX: number }[] = [];
    for (let x = 0; x < ysByX.length; x += 1) {
      if ((ysByX[x]?.length ?? 0) < 3) {
        continue;
      }
      const current = clusters.at(-1);
      if (current === undefined || x > current.maxX + 1) {
        clusters.push({ minX: x, maxX: x });
      } else {
        current.maxX = x;
      }
    }
    const painted = clusters.filter(cluster => cluster.maxX - cluster.minX >= 4);
    const first = painted[0];
    const last = painted.at(-1);
    if (first === undefined || last === undefined) {
      return [];
    }
    const firstCenter = (first.minX + first.maxX) / 2;
    const lastCenter = (last.minX + last.maxX) / 2;
    const spacing = (lastCenter - firstCenter) / (expectedBarCount - 1);
    return Array.from({ length: expectedBarCount }, (_, index) => {
      const center = firstCenter + spacing * index;
      const minBandX = Math.max(0, Math.floor(center - spacing / 2));
      const maxBandX = Math.min(ysByX.length - 1, Math.ceil(center + spacing / 2));
      const paintedXs: number[] = [];
      for (let x = minBandX; x <= maxBandX; x += 1) {
        if ((ysByX[x]?.length ?? 0) >= 3) {
          paintedXs.push(x);
        }
      }
      const x = paintedXs[Math.floor(paintedXs.length / 2)];
      const ys = x === undefined ? undefined : ysByX[x];
      if (x === undefined || ys === undefined || ys.length === 0) {
        return undefined;
      }
      const sampleYs = ys.filter((value, sampleIndex) => sampleIndex % 5 === 0);
      const minX = paintedXs[0];
      const maxX = paintedXs.at(-1);
      if (minX === undefined || maxX === undefined || sampleYs.length === 0) {
        return undefined;
      }
      return {
        minX,
        maxX,
        minY: Math.min(...sampleYs),
        maxY: Math.max(...sampleYs),
        x: (minX + maxX) / 2,
        y: sampleYs[Math.floor(sampleYs.length / 2)] ?? 0,
      };
    }).filter((point): point is NonNullable<typeof point> => point !== undefined);
  }, expectedWaterfallBars);
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({
    width: element instanceof HTMLCanvasElement ? element.width : 0,
    height: element instanceof HTMLCanvasElement ? element.height : 0,
  }));
  if (box === null || size.width === 0 || size.height === 0) {
    return [];
  }
  return localPoints.map(point => ({
    x: box.x + (point.x / size.width) * box.width,
    y: box.y + (point.y / size.height) * box.height,
    minX: box.x + (point.minX / size.width) * box.width,
    maxX: box.x + (point.maxX / size.width) * box.width,
    minY: box.y + (point.minY / size.height) * box.height,
    maxY: box.y + (point.maxY / size.height) * box.height,
  }));
}

async function waitForWaterfallPoints(page: Page): Promise<readonly ChartPoint[]> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const points = await waterfallBarPoints(page);
    if (points.length === expectedWaterfallBars) {
      return points;
    }
    await page.waitForTimeout(100);
  }
  throw new Error('Expected 12 painted waterfall marks.');
}

async function prepareHome(page: Page): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await applyHighResolutionViewport(page);
  await page.getByTestId('showcase-chart').waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
}

async function waitUntilStoryTime(storyStartedAt: number, seconds: number): Promise<void> {
  const remainingMs = seconds * 1000 - (Date.now() - storyStartedAt);
  if (remainingMs > 0) {
    await new Promise(resolveDelay => setTimeout(resolveDelay, remainingMs));
  }
}

async function assertEditorCenteredDialog(editor: Locator, dialog: Locator): Promise<void> {
  const editorBox = await editor.boundingBox();
  const dialogBox = await dialog.boundingBox();
  if (editorBox === null || dialogBox === null) {
    throw new Error('Group dialog framing is unavailable.');
  }
  const editorCenterX = editorBox.x + editorBox.width / 2;
  const dialogCenterX = dialogBox.x + dialogBox.width / 2;
  const fullyVisible =
    dialogBox.x >= editorBox.x &&
    dialogBox.y >= editorBox.y &&
    dialogBox.x + dialogBox.width <= editorBox.x + editorBox.width &&
    dialogBox.y + dialogBox.height <= editorBox.y + editorBox.height;
  if (!fullyVisible || Math.abs(dialogCenterX - editorCenterX) > 2) {
    throw new Error('Group dialog must be fully visible and centered in the editor.');
  }
}

const definitions: readonly CaptureDefinition[] = [
  {
    id: 'story-take',
    url: '/playground',
    assertions: [
      'single continuous editor take',
      'drag and marquee group complete',
      'expand collapse undo redo complete',
      'SVG export complete',
      'ViewSpec visible',
    ],
    prepare: page => openEditor(page),
    perform: async page => {
      const storyStartedAt = Date.now() - actionPreRollMs;
      const editor = page.locator(editorSelector);
      const initialPoints = await waitForWaterfallPoints(page);
      const dragSource = initialPoints[1];
      const dragTarget = initialPoints[2];
      if (dragSource === undefined || dragTarget === undefined) {
        throw new Error('Story drag geometry is unavailable.');
      }

      const pointerHome = {
        x: logicalViewport.width - 80,
        y: logicalViewport.height - 80,
      };
      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.directDrag - 0.55);
      await smoothMove(page, pointerHome, dragSource, 420, 14);
      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.directDrag);
      await page.mouse.down();
      const dragDestination = {
        x: dragTarget.maxX - 3,
        y: dragSource.y,
      };
      await smoothMove(page, dragSource, dragDestination, 1_050, 18);
      await waitForAttribute(page.getByTestId('tellplot-chart'), 'data-drop-indicator', 'after');
      await waitUntilStoryTime(storyStartedAt, STORY_PACING_SECONDS.directDragRelease);
      await page.mouse.up();
      await waitForAttribute(editor, 'data-view-revision', '1');

      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.marqueeGroup - 0.55);
      const groupedPoints = await waitForWaterfallPoints(page);
      const groupFirst = groupedPoints[2];
      const groupSecond = groupedPoints[3];
      if (groupFirst === undefined || groupSecond === undefined) {
        throw new Error('Story marquee geometry is unavailable.');
      }
      const { from: marqueeFrom, to: marqueeTo } = marqueeAroundMarks(
        [groupFirst, groupSecond],
        STORY_CAPTURE_PRESENTATION.marqueePadding,
      );
      await smoothMove(page, dragDestination, marqueeFrom, 420, 14);
      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.marqueeGroup);
      await page.mouse.down();
      await smoothMove(page, marqueeFrom, marqueeTo, 950, 18);
      await page.getByTestId('chart-marquee').waitFor({ state: 'visible' });
      await waitUntilStoryTime(storyStartedAt, STORY_PACING_SECONDS.marqueeRelease);
      await page.mouse.up();
      const dialog = page.getByRole('dialog', { name: '创建折叠分组' });
      await dialog.waitFor({ state: 'visible' });
      await assertEditorCenteredDialog(editor, dialog);
      const groupName = dialog.getByRole('textbox', { name: '分组名称' });
      if (STORY_CAPTURE_PRESENTATION.pointerTargetsGroupInput) {
        const inputBox = await groupName.boundingBox();
        if (inputBox === null) {
          throw new Error('Group name input framing is unavailable.');
        }
        const inputPointer = {
          x: inputBox.x + inputBox.width - 24,
          y: inputBox.y + inputBox.height / 2,
        };
        await smoothMove(page, marqueeTo, inputPointer, 280, 12);
        await page.mouse.down();
        await page.waitForTimeout(70);
        await page.mouse.up();
      }
      await waitUntilStoryTime(storyStartedAt, STORY_PACING_SECONDS.groupNameStart);
      await groupName.pressSequentially('增长驱动', { delay: 140 });
      await waitForInputValue(groupName, '增长驱动');
      await waitUntilStoryTime(storyStartedAt, STORY_PACING_SECONDS.groupCreate);
      await page.waitForTimeout(STORY_PACING_SECONDS.groupNameHoldSeconds * 1000);
      await groupName.press('Enter');
      await waitForAttribute(editor, 'data-view-revision', '2');

      const expand = page.getByRole('button', { name: '展开 增长驱动' });
      await expand.waitFor({ state: 'visible' });
      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.prototypeExpand);
      await expand.click();
      const collapse = page.getByRole('button', { name: '折叠 增长驱动' });
      await collapse.waitFor({ state: 'visible' });
      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.prototypeCollapse);
      await collapse.click();
      await expand.waitFor({ state: 'visible' });

      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.undo);
      await page.getByRole('button', { name: '撤销' }).click();
      await waitForAttribute(editor, 'data-view-revision', '5');
      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.redo);
      await page.getByRole('button', { name: '重做' }).click();
      await waitForAttribute(editor, 'data-view-revision', '6');

      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.exportSvg);
      await page.getByRole('button', { name: '导出' }).click();
      await page.getByRole('menu', { name: '导出格式' }).waitFor({ state: 'visible' });
      const download = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'SVG 图像' }).click();
      await download;
      await waitForText(page.getByRole('status', { name: '文件状态' }), 'SVG_EXPORTED');

      await waitUntilStoryTime(storyStartedAt, STORY_ACTION_SECONDS.viewState);
      await page.getByRole('button', { name: '显示使用代码' }).click();
      const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
      await guide.getByRole('tab', { name: '视图状态' }).click();
      const viewState = guide.getByRole('textbox', { name: 'TellPlot 视图状态' });
      await viewState.waitFor({ state: 'visible' });
      await waitForInputValue(viewState, '增长驱动');
      await waitUntilStoryTime(storyStartedAt, STORY_CONTRACT.continuousEditor.endSeconds);
    },
  },
  {
    id: 'waterfall-direct',
    url: '/playground',
    assertions: ['chart drag entered dragging', 'drop indicator after', 'view revision 1'],
    prepare: page => openEditor(page),
    perform: async page => {
      const points = await waitForWaterfallPoints(page);
      const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
      const box = await canvas.boundingBox();
      const source = points[1];
      const target = points[2];
      if (box === null || source === undefined || target === undefined) {
        throw new Error('Waterfall drag geometry is unavailable.');
      }
      const destination = {
        x: source.x + (target.minX - source.maxX) + 1,
        y: box.y + 8 < target.minY ? box.y + 8 : box.y + box.height - 8,
      };
      await page.mouse.move(source.x, source.y);
      await page.mouse.down();
      await smoothMove(page, source, destination, 1_400);
      await waitForAttribute(page.locator(editorSelector), 'data-interaction-state', 'dragging');
      await waitForAttribute(page.getByTestId('tellplot-chart'), 'data-drop-indicator', 'after');
      await page.waitForTimeout(500);
      await page.mouse.up();
      await waitForAttribute(page.locator(editorSelector), 'data-view-revision', '1');
      await page.waitForTimeout(1_300);
    },
  },
  {
    id: 'waterfall-group',
    url: '/playground',
    assertions: ['marquee visible', 'group revision 1', 'expand and collapse controls visible'],
    prepare: page => openEditor(page),
    perform: async page => {
      const points = await waitForWaterfallPoints(page);
      const first = points[1];
      const second = points[2];
      if (first === undefined || second === undefined) {
        throw new Error('Waterfall marquee geometry is unavailable.');
      }
      const { from, to } = marqueeAroundMarks(
        [first, second],
        STORY_CAPTURE_PRESENTATION.marqueePadding,
      );
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await smoothMove(page, from, to, 1_300);
      await page.getByTestId('chart-marquee').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
      await page.mouse.up();
      const dialog = page.getByRole('dialog', { name: '创建折叠分组' });
      await dialog.waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      const groupName = dialog.getByRole('textbox', { name: '分组名称' });
      await groupName.fill('增长驱动');
      await page.waitForTimeout(450);
      await groupName.press('Enter');
      await waitForAttribute(page.locator(editorSelector), 'data-view-revision', '1');
      const expand = page.getByRole('button', { name: '展开 增长驱动' });
      await expand.waitFor({ state: 'visible' });
      await page.waitForTimeout(900);
      await expand.click();
      const collapse = page.getByRole('button', { name: '折叠 增长驱动' });
      await collapse.waitFor({ state: 'visible' });
      await page.waitForTimeout(1_100);
      await collapse.click();
      await expand.waitFor({ state: 'visible' });
      await page.waitForTimeout(1_100);
    },
  },
  {
    id: 'outline-history',
    url: '/playground',
    assertions: ['outline drag preview', 'view revision 1', 'undo and redo complete'],
    prepare: page => openEditor(page),
    perform: async page => {
      const source = page.getByRole('treeitem', { name: /销量增长/ });
      const target = page.getByRole('treeitem', { name: /价格提升/ });
      const sourceBox = await source.boundingBox();
      const targetBox = await target.boundingBox();
      if (sourceBox === null || targetBox === null) {
        throw new Error('Outline rows are unavailable.');
      }
      const from = {
        x: sourceBox.x + sourceBox.width * 0.62,
        y: sourceBox.y + sourceBox.height / 2,
      };
      const to = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height - 3 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await smoothMove(page, from, to, 1_200);
      await waitForAttribute(target, 'data-drop-indicator', 'after');
      await page.waitForTimeout(450);
      await page.mouse.up();
      await waitForAttribute(page.locator(editorSelector), 'data-view-revision', '1');
      await page.waitForTimeout(850);
      await page.getByRole('button', { name: '撤销' }).click();
      await waitForAttribute(page.locator(editorSelector), 'data-view-revision', '2');
      await page.waitForTimeout(850);
      await page.getByRole('button', { name: '重做' }).click();
      await waitForAttribute(page.locator(editorSelector), 'data-view-revision', '3');
      await page.waitForTimeout(1_000);
    },
  },
  {
    id: 'state-model',
    url: '/playground',
    assertions: [
      'group command revision 1',
      'ViewSpec tab visible',
      'serialized group label visible',
    ],
    prepare: page => openEditor(page, true),
    perform: async page => {
      await page.getByRole('treeitem', { name: /销量增长/ }).click();
      await page.getByRole('treeitem', { name: /价格提升/ }).click({ modifiers: ['Meta'] });
      await page.getByRole('tab', { name: '检查器' }).click();
      await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
      await page.getByRole('button', { name: '创建分组' }).click();
      await waitForAttribute(page.locator(editorSelector), 'data-view-revision', '1');
      await page.waitForTimeout(800);
      const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
      await guide.getByRole('tab', { name: '视图状态' }).click();
      const viewState = guide.getByRole('textbox', { name: 'TellPlot 视图状态' });
      await viewState.waitFor({ state: 'visible' });
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if ((await viewState.inputValue()).includes('增长驱动')) {
          break;
        }
        await page.waitForTimeout(80);
      }
      if (!(await viewState.inputValue()).includes('增长驱动')) {
        throw new Error('Serialized ViewSpec did not expose the new group.');
      }
      await page.waitForTimeout(1_700);
    },
  },
  {
    id: 'export-svg',
    url: '/playground',
    assertions: ['export menu visible', 'SVG download completed', 'SVG_EXPORTED status'],
    prepare: page => openEditor(page),
    perform: async page => {
      const exportButton = page.getByRole('button', { name: '导出' });
      await exportButton.click();
      await page.getByRole('menu', { name: '导出格式' }).waitFor({ state: 'visible' });
      await page.waitForTimeout(900);
      const download = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'SVG 图像' }).click();
      await download;
      await waitForText(page.getByRole('status', { name: '文件状态' }), 'SVG_EXPORTED');
      await page.waitForTimeout(1_500);
    },
  },
  {
    id: 'chart-families',
    url: '/',
    assertions: ['waterfall visible', 'column selected', 'bar selected', 'waterfall restored'],
    prepare: prepareHome,
    perform: async page => {
      const meta = page.locator('.site-home-hero__chart-meta strong');
      await waitForText(meta, '经营变动瀑布图');
      await page.getByRole('button', { name: '分类柱状图' }).click();
      await waitForText(meta, '分类柱状图');
      await page.waitForTimeout(1_400);
      await page.getByRole('button', { name: '分类条形图' }).click();
      await waitForText(meta, '分类条形图');
      await page.waitForTimeout(1_400);
      await page.getByRole('button', { name: '经营变动瀑布图' }).click();
      await waitForText(meta, '经营变动瀑布图');
      await page.waitForTimeout(1_200);
    },
  },
];

async function recordCapture(
  browser: Browser,
  definition: CaptureDefinition,
): Promise<CaptureRecord> {
  const contextStartedAt = Date.now();
  let context: BrowserContext | undefined;
  try {
    context = await browser.newContext({
      viewport,
      deviceScaleFactor,
      recordVideo: { dir: temporaryDirectory, size: recordSize },
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      locale: 'zh-CN',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', error => errors.push(error.message));
    await definition.prepare(page);
    await installVideoPointer(page);
    await page.mouse.move(logicalViewport.width - 80, logicalViewport.height - 80);
    await page.waitForTimeout(180);
    const startStill = `${definition.id}-start.png`;
    const endStill = `${definition.id}-end.png`;
    await page.screenshot({ path: resolve(capturesDirectory, startStill) });
    const clipStartedAt = Date.now();
    const trimStartSeconds = (clipStartedAt - contextStartedAt) / 1000;
    await page.waitForTimeout(actionPreRollMs);
    const actionStartedAt = Date.now();
    await definition.perform(page);
    await page.screenshot({ path: resolve(capturesDirectory, endStill) });
    const durationSeconds = (Date.now() - contextStartedAt) / 1000;
    const actionStartOffsetSeconds = (actionStartedAt - clipStartedAt) / 1000;
    const video = page.video();
    if (video === null) {
      throw new Error(`Recording is unavailable for ${definition.id}.`);
    }
    await context.close();
    context = undefined;
    await video.saveAs(resolve(capturesDirectory, `${definition.id}.webm`));
    if (errors.length > 0) {
      throw new Error(`${definition.id} emitted browser errors: ${errors.join(' | ')}`);
    }
    return {
      id: definition.id,
      file: `${definition.id}.webm`,
      startStill,
      endStill,
      durationSeconds: Number(durationSeconds.toFixed(3)),
      trimStartSeconds: Number(trimStartSeconds.toFixed(3)),
      actionStartOffsetSeconds: Number(actionStartOffsetSeconds.toFixed(3)),
      assertions: definition.assertions,
    };
  } finally {
    await context?.close();
  }
}

async function main(): Promise<void> {
  if (definitions.map(definition => definition.id).join('|') !== REQUIRED_CAPTURE_IDS.join('|')) {
    throw new Error('Capture definitions do not match the approved capture contract.');
  }
  await rm(capturesDirectory, { recursive: true, force: true });
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(capturesDirectory, { recursive: true });
  await mkdir(temporaryDirectory, { recursive: true });

  const preview = startPreview();
  let browser: Browser | undefined;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });
    const captures: CaptureRecord[] = [];
    for (const definition of definitions) {
      process.stdout.write(`Recording ${definition.id}...\n`);
      captures.push(await recordCapture(browser, definition));
    }
    const manifest: CaptureManifest = {
      schemaVersion: 4,
      source: 'tellplot-production-build',
      createdAt: new Date().toISOString(),
      pointer: pointerMetadata,
      viewport,
      logicalViewport,
      contentScale,
      deviceScaleFactor,
      recordSize,
      captures,
    };
    await writeFile(
      resolve(capturesDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await browser?.close();
    preview.kill('SIGTERM');
  }
}

await main();
