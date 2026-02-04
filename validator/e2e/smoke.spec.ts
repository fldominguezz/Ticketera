import { test, expect } from '@playwright/test';

test('Full System Smoke Test', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button:has-text("AUTHENTICATE")');
  
  // Wait for Dashboard
  await page.waitForURL('**/', { timeout: 15000 });
  await expect(page.locator('body')).toContainText('Dashboard');

  // 2. Navigation to Tickets
  await page.goto('/tickets');
  await expect(page.locator('body')).toContainText('CENTRO DE TICKETS');
  
  // 3. Create Ticket
  await page.click('button:has-text("NUEVO TICKET")');
  await page.waitForURL('**/tickets/new');
  
  const ticketTitle = 'Smoke Test Ticket ' + Date.now();
  await page.fill('input[placeholder*="descripción del problema"]', ticketTitle);
  await page.locator('.ql-editor').fill('Validated by automated smoke test.');
  
  await page.click('button:has-text("GUARDAR Y CREAR TICKET")');
  
  // Wait for redirect back to tickets or detail
  await page.waitForURL(/\/tickets/);
  
  // 4. Admin Users
  await page.goto('/admin/users');
  await expect(page.locator('body')).toContainText('Cuentas de Usuario');
  await expect(page.locator('button:has-text("REGISTRAR NUEVO")')).toBeVisible();
});
