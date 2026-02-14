import { test, expect } from '@playwright/test';

test('Full System Smoke Test', async ({ page }) => {
  console.log('Starting Smoke Test...');
  
  // 1. Login
  console.log('Navigating to /login...');
  await page.goto('/login');
  
  console.log('Filling credentials...');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  
  console.log('Clicking AUTHENTICATE...');
  await page.click('button:has-text("AUTHENTICATE")');
  
  // Wait for Dashboard
  console.log('Waiting for Dashboard redirect...');
  try {
    await page.waitForURL('**/', { timeout: 15000 });
    console.log('Dashboard reached.');
  } catch (e) {
    console.error('Failed to reach dashboard. Current URL:', page.url());
    const bodyText = await page.innerText('body');
    console.error('Body content snippet:', bodyText.substring(0, 500));
    throw e;
  }
  
  await expect(page.locator('body')).toContainText('Dashboard');

  // 2. Navigation to Tickets
  console.log('Navigating to /tickets...');
  await page.goto('/tickets');
  await expect(page.locator('body')).toContainText('CENTRO DE TICKETS');
  
  // 3. Create Ticket
  console.log('Opening New Ticket page...');
  await page.click('button:has-text("NUEVO TICKET")');
  await page.waitForURL('**/tickets/new');
  
  const ticketTitle = 'Smoke Test Ticket ' + Date.now();
  console.log('Creating ticket:', ticketTitle);
  await page.fill('input[placeholder*="descripción del problema"]', ticketTitle);
  
  // More robust selector for Quill editor
  const editor = page.locator('.ql-editor').first();
  await editor.fill('Validated by automated smoke test.');
  
  await page.click('button:has-text("GUARDAR Y CREAR TICKET")');
  
  // Wait for redirect back to tickets or detail
  console.log('Waiting for redirect after creation...');
  await page.waitForURL(/\/tickets/, { timeout: 10000 });
  
  // 4. Admin Users
  console.log('Navigating to /admin/users...');
  await page.goto('/admin/users');
  await expect(page.locator('body')).toContainText('Cuentas de Usuario');
  await expect(page.locator('button:has-text("REGISTRAR NUEVO")')).toBeVisible();
  console.log('Smoke Test Completed Successfully.');
});
