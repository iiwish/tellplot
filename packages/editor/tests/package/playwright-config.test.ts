import { describe, expect, it } from 'vitest';

import playwrightConfig from '../../../../playwright.config';

describe('Playwright release gates', () => {
  it('never retries the isolated performance project', () => {
    const performanceProject = playwrightConfig.projects?.find(
      project => project.name === 'chromium-performance',
    );

    expect(performanceProject).toBeDefined();
    expect(performanceProject?.retries).toBe(0);
  });
});
