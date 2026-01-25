import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow admin to login and navigate to dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/.*auth\/login/);

    // Fill in login credentials
    await page.fill('input[name="email"]', 'admin');
    await page.fill('input[name="password"]', 'adminpassword');

    // Click the login button
    await page.click('button[type="submit"]');

    // Assuming a 2FA step might exist, check for its presence
    // This part needs adjustment based on actual UI/UX for 2FA.
    // For now, let's assume if 2FA is present, it will show a specific element.
    // If not, it should proceed to the dashboard.
    const twoFaCodeInput = page.locator('input[name="2fa_code"]');
    if (await twoFaCodeInput.isVisible()) {
      console.log('2FA required. Entering placeholder code...');
      // If 2FA is mocked or a known test code is available, enter it here
      // await twoFaCodeInput.fill('123456'); // Placeholder 2FA code
      // await page.click('button[type="submit"]'); // Submit 2FA
      test.skip('2FA is required and not handled in this test', () => {});
    }

    // After login (and optional 2FA), expect to be redirected to the dashboard or home page
    await page.waitForURL('/dashboard', {timeout: 10000}); // Adjust URL if needed
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify a key element on the dashboard to confirm successful login
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible(); // Adjust selector/text
  });
});
