const { test, expect } = require('@playwright/test');
const { openWorkbench } = require('./helpers.cjs');

test('workspace trust remains enabled in the packaged workbench', async ({ page }) => {
  await openWorkbench(page);
  const configuration = await page.locator('#vscode-workbench-web-configuration').getAttribute('data-settings');
  expect(configuration).toBeTruthy();
  expect(JSON.parse(configuration).enableWorkspaceTrust).toBe(true);
});

test('keyboard shortcut opens and closes the command palette', async ({ page }) => {
  await openWorkbench(page);
  await page.keyboard.press('F1');
  const palette = page.locator('.quick-input-widget');
  await expect(palette).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(palette).toBeHidden();
});

test('settings UI opens through the workbench command', async ({ page }) => {
  await openWorkbench(page);
  await page.evaluate(async () => {
    const { commands } = await import('./out/vs/workbench/workbench.web.main.internal.js');
    await commands.executeCommand('workbench.action.openSettings');
  });
  await expect(page.locator('.settings-editor:visible')).toBeVisible();
});

test('static mode does not advertise an offline service-worker cache', async ({ page }) => {
  await openWorkbench(page);
  const registrations = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return [];
    return (await navigator.serviceWorker.getRegistrations()).map(registration => registration.scope);
  });
  expect(registrations).toEqual([]);
});

test('Chromium opens a browser-owned local folder, saves a file, and restores it', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Directory picker requires Chromium File System Access');
  await openWorkbench(page);

  const supported = await page.evaluate(async () => {
    if (typeof window.showDirectoryPicker !== 'function') return false;
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('cosw-local-folder', { create: true });
    const file = await folder.getFileHandle('local-file.txt', { create: true });
    const writable = await file.createWritable();
    await writable.write('Before edit');
    await writable.close();
    // OPFS supplies a real, serializable FileSystemDirectoryHandle without
    // granting CI access to the machine's filesystem.
    window.showDirectoryPicker = async () => folder;
    return true;
  });
  expect(supported).toBe(true);

  await page.keyboard.press('F1');
  const command = page.locator('.quick-input-widget input').first();
  await expect(command).toBeVisible();
  await command.fill('>Open Folder');
  await expect(page.locator('.quick-input-widget')).toContainText('Open Folder');

  await page.keyboard.press('Escape');
  // The empty-folder welcome button is rendered only while Explorer is active.
  await page.evaluate(async () => {
    const { commands } = await import('./out/vs/workbench/workbench.web.main.internal.js');
    await commands.executeCommand('workbench.view.explorer');
  });
  const openFolderButton = page.locator('.welcome-view-content').getByRole('button', { name: 'Open Folder', exact: true }).first();
  await expect(openFolderButton).toBeVisible();

  await openFolderButton.click();
  // The test owns this fixture folder; explicitly grant workspace trust.
  const trustDialog = page.getByRole('dialog', { name: /Do you trust the authors of the files in this folder/ });
  await expect(trustDialog).toBeVisible();
  await trustDialog.getByRole('button', { name: 'Yes' }).click();

  // Code-OSS can enter an untitled workspace in place after the picker.
  const file = page.getByText('local-file.txt', { exact: true }).first();
  await expect(file).toBeVisible({ timeout: 30_000 });
  await file.dblclick();
  const editor = page.locator('.monaco-editor:visible').last();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('After edit');
  await page.keyboard.press('ControlOrMeta+S');

  await expect.poll(() => page.evaluate(async () => {
    const folder = await (await navigator.storage.getDirectory()).getDirectoryHandle('cosw-local-folder');
    return (await (await folder.getFileHandle('local-file.txt')).getFile()).text();
  }), { timeout: 30_000 }).toBe('After edit');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('local-file.txt', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
});

test('new window request does not reload or clear the current tab workspace', async ({ page }) => {
  await openWorkbench(page);
  const previous = JSON.stringify({ folderUri: { scheme: 'file', path: '/previous-folder' } });
  await page.evaluate(value => sessionStorage.setItem('cosw.workspace.v1', value), previous);

  await page.evaluate(async () => {
    const { commands } = await import('./out/vs/workbench/workbench.web.main.internal.js');
    // New windows are intentionally unsupported by this single-tab embedder.
    // Do not wait for the ensuing Code-OSS warning dialog.
    void commands.executeCommand('workbench.action.newWindow');
  });

  await expect(page.getByText('The browser blocked opening a new tab or window', { exact: false }))
    .toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => sessionStorage.getItem('cosw.workspace.v1'))).toBe(previous);
});
