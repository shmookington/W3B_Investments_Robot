import { test, expect } from '@playwright/test';

test.describe('MONOLITH Dashboard', () => {
    test('overview page loads with mock data', async ({ page }) => {
        await page.goto('/monolith');
        await expect(page.locator('text=MONOLITH')).toBeVisible();
    });

    test('navigation between sub-pages works', async ({ page }) => {
        await page.goto('/monolith');

        // Navigate to Data Pipeline
        await page.click('text=DATA');
        await expect(page).toHaveURL(/\/monolith\/data/);

        // Navigate to Backtest
        await page.click('text=BACKTEST');
        await expect(page).toHaveURL(/\/monolith\/backtest/);
    });

    test('strategy table renders rows', async ({ page }) => {
        await page.goto('/monolith');
        const rows = page.locator('tr');
        await expect(rows.first()).toBeVisible();
    });
});

test.describe('Audit Page', () => {
    test('loads without wallet connected', async ({ page }) => {
        await page.goto('/audit');
        await expect(page.locator('text=AUDIT')).toBeVisible();
    });
});

test.describe('Settings Page', () => {
    test('loads and shows wallet section', async ({ page }) => {
        await page.goto('/settings');
        await expect(page.locator('text=WALLET')).toBeVisible();
    });
});

test.describe('404 Page', () => {
    test('shows lost in space theme', async ({ page }) => {
        await page.goto('/some-nonexistent-page');
        await expect(page.locator('text=SIGNAL LOST')).toBeVisible();
        await expect(page.locator('text=RETURN TO BASE')).toBeVisible();
    });
});
