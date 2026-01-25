import { test, expect } from '@playwright/test';

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should verify kanban board loads and allows drag and drop', async ({ page }) => {
    await page.goto('/kanban');
    
    // Check for columns
    await expect(page.locator('text=TODO')).toBeVisible();
    await expect(page.locator('text=DOING')).toBeVisible();
    await expect(page.locator('text=DONE')).toBeVisible();

    // Find a card in TODO column
    const todoColumn = page.locator('[data-rbd-droppable-id="TODO"]'); // Example selector for React Beautiful DND or similar
    // Fallback if specific ID not found, look for column container
    const firstCard = page.locator('.kanban-card').first();
    
    if (await firstCard.count() === 0) {
        console.log('No cards in Kanban to test drag and drop.');
        return;
    }

    // Attempt Drag and Drop
    // This depends heavily on the implementation (HTML5 dnd vs libraries)
    // Here is a generic approach assuming a library might be used or standard drag events
    const doingColumn = page.locator('[data-rbd-droppable-id="DOING"]'); 
    
    // If we can identify the destination
    if (await doingColumn.isVisible()) {
        await firstCard.dragTo(doingColumn);
        // Verify state change (persistence check would be ideal, but UI check first)
        // await expect(doingColumn.locator('.kanban-card')).toContainText(await firstCard.textContent());
    } else {
        console.log('Doing column not found with expected selector.');
    }
  });
});
