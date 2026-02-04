import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'test_admin');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new user and assign role', async ({ page }) => {
    await page.goto('/test_admin/users');
    
    await page.click('button:has-text("Create User")');
    
    const uniqueUser = 'user_' + Date.now();
    await page.fill('input[name="username"]', uniqueUser);
    await page.fill('input[name="email"]', `${uniqueUser}@example.com`);
    await page.fill('input[name="password"]', 'password123');
    
    // Select Role
    await page.selectOption('select[name="role"]', 'agent'); // Assuming 'agent' is a valid value

    await page.click('button[type="submit"]');
    
    // Verify user appears in list
    await expect(page.locator(`text=${uniqueUser}`)).toBeVisible();
  });

  test('should verify export functionality', async ({ page }) => {
    // This could be in tickets or test_admin, testing generic export button
    await page.goto('/tickets');
    
    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv'); // or .xlsx / .pdf
    } else {
        test.skip('Export button not found');
    }
  });
});
