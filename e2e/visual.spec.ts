import { test, expect } from '@playwright/test';

test.describe('Visual regression', () => {
    test('initial table render matches screenshot', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // let the first frames render
        await expect(page).toHaveScreenshot('table.png', {
            maxDiffPixelRatio: 0.05,
            timeout: 20000,
        });
    });
});
