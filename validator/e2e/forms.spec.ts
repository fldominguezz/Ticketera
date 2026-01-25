import { test, expect } from '@playwright/test';

test.describe('Dynamic Forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should fill multi-team installation form', async ({ page }) => {
    await page.goto('/forms/installation');
    
    await expect(page.locator('h1')).toContainText('Installation');

    // Fill Client Name
    await page.fill('input[name="client_name"]', 'Test Client');

    // Add First Team
    await page.fill('input[name="teams[0].name"]', 'Team Alpha');
    await page.fill('input[name="teams[0].location"]', 'Server Room A');

    // Add Second Team
    const addTeamBtn = page.locator('button:has-text("Add Team")');
    if (await addTeamBtn.isVisible()) {
        await addTeamBtn.click();
        await page.fill('input[name="teams[1].name"]', 'Team Beta');
        await page.fill('input[name="teams[1].location"]', 'Office 202');
    }

    // Submit
    await page.click('button[type="submit"]');

    // Expect Success
    await expect(page.locator('text=Form submitted successfully')).toBeVisible({ timeout: 10000 });
  });
});
