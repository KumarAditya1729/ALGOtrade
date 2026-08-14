import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    // Mock the login API response
    await page.route('**/api/v2/auth/login', async route => {
      await route.fulfill({
        json: {
          status: 'success',
          data: {
            token: 'fake-jwt-token',
            user: { id: 1, email: 'test@example.com' }
          }
        }
      });
    });

    // Mock dashboard summary
    await page.route('**/api/v2/dashboard/summary', async route => {
      await route.fulfill({ json: { data: { total_account_value: 10000, pnl_realized: 150, active_strategies_count: 0, win_rate: 0 } } });
    });

    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation and verify dashboard elements
    await page.waitForURL('**/app/dashboard');
    await expect(page.getByText('Dashboard Overview')).toBeVisible();
  });

  test('failed login shows error message', async ({ page }) => {
    // Mock failed login
    await page.route('**/api/v2/auth/login', async route => {
      await route.fulfill({ 
        status: 401, 
        json: { message: 'Invalid credentials' } 
      });
    });

    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
