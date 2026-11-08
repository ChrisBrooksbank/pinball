import { test, expect } from '@playwright/test';

test.describe('Core interactions', () => {
    test('page loads with a visible game canvas', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/pinball/i);
        await expect(page.locator('canvas#game')).toBeVisible();
    });

    test('canvas fills the viewport', async ({ page }) => {
        await page.goto('/');
        const box = await page.locator('canvas#game').boundingBox();
        const viewport = page.viewportSize();
        expect(box?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1);
        expect(box?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);
    });

    test('no console errors on load', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(errors).toEqual([]);
    });
});
