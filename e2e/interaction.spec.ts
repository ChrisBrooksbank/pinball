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

test.describe('Flipper input', () => {
    test('flipper key triggers the flipper action', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('canvas#game');
        await page.keyboard.down('ShiftLeft');
        await expect(canvas).toHaveAttribute('data-flipper-left', 'down');
        await page.keyboard.up('ShiftLeft');
        await expect(canvas).toHaveAttribute('data-flipper-left', 'up');
    });

    test('touching the flipper zone triggers the flipper action', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('canvas#game');
        const touch = (type: string, xFrac: number) =>
            canvas.evaluate(
                (el, [t, x]) => {
                    const r = el.getBoundingClientRect();
                    el.dispatchEvent(
                        new PointerEvent(t as string, {
                            pointerId: 7,
                            pointerType: 'touch',
                            clientX: r.left + r.width * (x as number),
                            clientY: r.top + r.height * 0.8,
                            bubbles: true,
                        })
                    );
                },
                [type, xFrac]
            );
        await touch('pointerdown', 0.75);
        await expect(canvas).toHaveAttribute('data-flipper-right', 'down');
        await touch('pointerup', 0.75);
        await expect(canvas).toHaveAttribute('data-flipper-right', 'up');
    });
});
