import { test, expect } from '@playwright/test';

test.describe('Trading Terminal', () => {
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

    // Mock API responses
    await page.route('**/api/v2/market/assets', async route => {
      await route.fulfill({ json: { data: [{ symbol: 'AAPL', name: 'Apple Inc.' }] } });
    });
    
    await page.route('**/api/v2/broker/accounts', async route => {
      await route.fulfill({ json: { data: [{ id: 1, name: 'Paper Trading', balance: 100000 }] } });
    });
  });

  test('can place a market buy order', async ({ page }) => {
    // Mock the order placement
    await page.route('**/api/quick-trade/place-order', async route => {
      await route.fulfill({ 
        json: { 
          status: 'success',
          data: { id: 999, symbol: 'AAPL', side: 'BUY', quantity: 10, status: 'EXECUTED' } 
        } 
      });
    });

    await page.goto('/app/trading');
    
    // UI Interactions
    await page.screenshot({ path: 'trading-screenshot.png', fullPage: true });
    await page.fill('input[placeholder="e.g. NIFTY"]', 'AAPL');
    // Using nth(1) because the first input is the symbol text input, second is quantity number input
    await page.locator('input[type="number"]').first().fill('10');
    
    await page.click('button:has-text("BUY")');
    
    // Verify success message appears inline
    await expect(page.getByText('Order placed successfully!')).toBeVisible();
  });
});
