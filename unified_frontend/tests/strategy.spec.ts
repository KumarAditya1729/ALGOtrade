import { test, expect } from '@playwright/test';

test.describe('Strategy Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate by using the login flow
    await page.route('**/api/v2/auth/login', async route => {
      await route.fulfill({
        json: {
          status: 'success',
          data: { token: 'fake-jwt-token', user: { id: 1, email: 'test@example.com' } }
        }
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for the redirect to happen
    await page.waitForURL('**/app/dashboard');
  });

  test('can view visual strategy and deploy', async ({ page }) => {
    await page.goto('/app/strategy-builder');

    // Check if initial nodes are on canvas
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    await expect(page.getByText('Data Source (e.g., Live Ticks)')).toBeVisible();

    // Listen for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Strategy blueprint saved successfully (mock)');
      await dialog.accept();
    });

    // Deploy
    await page.click('button:has-text("Deploy Strategy")');
  });
});
