import { test, expect } from '@playwright/test';

test.describe('Ticket Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'admin'); // Adjusted to username as per recent context
    await page.fill('input[name="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should list tickets and open a ticket details', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.locator('h1')).toContainText('Tickets');
    
    // Check if ticket table is visible
    await expect(page.locator('table')).toBeVisible();

    // Click on the first ticket in the list
    const firstTicketLink = page.locator('table tbody tr').first().locator('a');
    if (await firstTicketLink.count() > 0) {
        await firstTicketLink.click();
        await expect(page).toHaveURL(/\/tickets\/\d+/);
        await expect(page.locator('h1')).toBeVisible();
    } else {
        console.log('No tickets found to test details view.');
    }
  });

  test('should create a new ticket', async ({ page }) => {
    await page.goto('/tickets/new');
    
    await page.fill('input[name="title"]', 'E2E Test Ticket ' + Date.now());
    await page.fill('textarea[name="description"]', 'This is an automated test ticket.');
    
    // Select Priority (assuming select or custom dropdown)
    const prioritySelect = page.locator('select[name="priority"]');
    if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('HIGH');
    }

    await page.click('button[type="submit"]');
    
    // Expect redirect to ticket list or details
    await expect(page).toHaveURL(/\/tickets/);
    
    // Verify success toast or message
    await expect(page.locator('text=Ticket created successfully')).toBeVisible();
  });

  test('should comment on a ticket and mention user', async ({ page }) => {
    // Go to a specific ticket (assuming ID 1 exists or pick first)
    await page.goto('/tickets');
    const firstTicketLink = page.locator('table tbody tr').first().locator('a');
    
    if (await firstTicketLink.count() === 0) {
        test.skip('No tickets available to test commenting');
        return;
    }
    
    await firstTicketLink.click();
    
    // Add comment
    const commentBox = page.locator('textarea[name="comment"]');
    await commentBox.fill('Automated comment with @admin mention.');
    await page.click('button:has-text("Post Comment")');
    
    // Verify comment appears
    await expect(page.locator('text=Automated comment with @admin mention')).toBeVisible();
  });
});
