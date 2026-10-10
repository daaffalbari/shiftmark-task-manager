import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { openDatabase } from '../server/src/db/client';
import { migrateDatabase } from '../server/src/db/migrate';
import { seedDemoUsers } from '../server/src/db/seed';

const directory = await mkdtemp(join(tmpdir(), 'shiftmark-browser-'));
const databasePath = join(directory, 'test.sqlite');
const password = randomBytes(24).toString('hex');
const { db, sqlite } = openDatabase(databasePath);
migrateDatabase(db);
await seedDemoUsers(db, password);
sqlite.close();
const output = resolve('.browser-checks');
await mkdir(output, { recursive: true });
const origin = 'http://localhost:15173';
let exited = false;
let stopping = false;
const dev = spawn(process.execPath, ['run', 'dev'], {
  cwd: resolve('.'), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, DB_FILE_NAME: databasePath, DEMO_PASSWORD: password, NODE_ENV: 'development', APP_ORIGIN: origin, PORT: '13000', WEB_PORT: '15173' },
});
dev.stdout.on('data', (chunk) => { if (!stopping) process.stdout.write(chunk); });
dev.stderr.on('data', (chunk) => { if (!stopping) process.stderr.write(chunk); });
const devStopped = new Promise<void>((resolve) => dev.once('exit', () => { exited = true; resolve(); }));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const errors: string[] = [];

async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (exited) throw new Error('Development server exited before becoming ready.');
    try {
      const [web, api] = await Promise.all([fetch(origin, { signal: AbortSignal.timeout(1000) }), fetch(origin + '/api/auth/me', { signal: AbortSignal.timeout(1000) })]);
      if (web.ok && api.status === 401) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Development server did not become ready; check ports 13000 and 15173.');
}
async function login(page: Page, email: string) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'My tasks', exact: true }).waitFor();
}
async function noOverflow(page: Page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Page must not overflow horizontally');
}
async function visible(page: Page, text: string) {
  await page.getByText(text, { exact: true }).waitFor();
}

try {
  await ready();
  browser = await chromium.launch({ executablePath: process.argv[2] || undefined, headless: true });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Jakarta', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin + '/tasks');
    await page.getByRole('heading', { name: 'Sign in to shiftmark' }).waitFor();
    await noOverflow(page);
    await page.screenshot({ path: join(output, 'login-' + width + '.png'), fullPage: true });
    await page.getByLabel('Email', { exact: true }).fill('john@example.com');
    await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
    await page.getByLabel('Password', { exact: true }).press('Enter');
    await visible(page, 'Invalid email or password.');
    await login(page, 'john@example.com');
    if (width === 390) {
      await page.getByRole('button', { name: 'Account', exact: true }).click();
      await visible(page, 'john@example.com');
      await page.getByRole('button', { name: 'Account', exact: true }).click();
    }
    const newButton = page.getByRole('button', { name: 'New task', exact: true }).first();
    await newButton.click();
    assert(await page.getByLabel('Task title').evaluate((element) => element === document.activeElement));
    await page.keyboard.press('Escape');
    assert(await newButton.evaluate((element) => element === document.activeElement), 'Create dialog must restore focus');
    await newButton.click();
    await page.getByLabel('Task title').fill('Prepare invoice ' + width);
    await page.getByRole('button', { name: 'Create task', exact: true }).click();
    const opener = page.getByRole('button', { name: 'View details for Prepare invoice ' + width, exact: true });
    await opener.waitFor();
    await noOverflow(page);
    await page.screenshot({ path: join(output, 'tasks-' + width + '.png'), fullPage: true });
    await opener.click();
    await visible(page, 'No status changes yet.');
    for (const name of ['Move to Pending', 'Move to In progress', 'Mark as Done']) {
      const action = page.getByRole('button', { name, exact: true });
      await action.waitFor();
      await action.click();
    }
    await visible(page, 'This task is complete.');
    assert.equal(await page.getByRole('list', { name: 'Status changes' }).getByRole('listitem').count(), 3);
    await noOverflow(page);
    const sheetWidth = await page.getByRole('dialog', { name: 'Prepare invoice ' + width, exact: true }).evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(Math.round(sheetWidth), width === 1440 ? 440 : 390);
    if (width === 1440) assert.equal(await page.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().width), 208);
    await page.screenshot({ path: join(output, 'history-' + width + '.png'), fullPage: true });
    // Native dialog contains keyboard focus, even while the task list is present.
    for (let key = 0; key < 6; key++) {
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog[open]')), 'No background control may receive focus while modal is open');
    }
    assert(await page.getByRole('dialog', { name: 'Prepare invoice ' + width, exact: true }).evaluate((element) => element.matches(':modal')), 'Detail must use the native modal top layer');
    await page.keyboard.press('Escape');
    assert(await opener.evaluate((element) => element === document.activeElement), 'Detail must restore focus after refresh');
    await opener.click();
    await page.getByRole('button', { name: 'Delete task', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete “Prepare invoice ' + width + '”?', exact: true });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Delete task', exact: true }).click();
    await confirm.getByRole('button', { name: 'Delete task', exact: true }).click();
    await opener.waitFor({ state: 'hidden' });
    await page.getByRole('link', { name: 'Deleted tasks', exact: true }).click();
    await opener.waitFor();
    await opener.click();
    await page.getByText('Deleted on', { exact: false }).waitFor();
    await page.getByRole('list', { name: 'Status changes' }).waitFor();
    assert.equal(await page.getByRole('list', { name: 'Status changes' }).getByRole('listitem').count(), 3);
    assert.equal(await page.getByRole('button', { name: /Move to|Mark as|Delete task/ }).count(), 0);
    await page.screenshot({ path: join(output, 'deleted-' + width + '.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await login(page, 'jane@example.com');
    await visible(page, 'Nothing on your list yet.');
    await page.getByRole('link', { name: 'Deleted tasks', exact: true }).click();
    if (width === 1440) await visible(page, 'No deleted tasks.');
    assert.equal(await page.getByRole('button', { name: /View details for Prepare invoice/ }).count(), 0);
    await noOverflow(page);
    // Expire real SQLite sessions while private task data is visible.
    await page.getByRole('link', { name: 'My tasks', exact: true }).click();
    await page.getByRole('button', { name: 'New task', exact: true }).first().click();
    await page.getByLabel('Task title').fill('Private Jane task ' + width);
    await page.getByRole('button', { name: 'Create task', exact: true }).click();
    await visible(page, 'Private Jane task ' + width);
    const state = openDatabase(databasePath);
    state.sqlite.run('UPDATE sessions SET expires_at = 0');
    state.sqlite.close();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('heading', { name: 'Sign in to shiftmark' }).waitFor();
    assert.equal(await page.getByText('Private Jane task ' + width, { exact: true }).count(), 0);
    await visible(page, 'Your session has ended. Please sign in again.');
    // Clean up only the test account's task through the real application.
    await login(page, 'jane@example.com');
    await page.getByRole('button', { name: 'View details for Private Jane task ' + width, exact: true }).click();
    await page.getByRole('button', { name: 'Delete task', exact: true }).click();
    await page.getByRole('dialog', { name: 'Delete “Private Jane task ' + width + '”?' }).getByRole('button', { name: 'Delete task' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await context.close();
    console.log('PASS ' + width + 'px: login, create, workflow, history, delete, isolation, expiry, keyboard and overflow');
  }
  assert.deepEqual(errors, [], 'Browser must not raise JavaScript errors');
  console.log('Screenshots: ' + output);
} finally {
  await browser?.close();
  stopping = true;
  if (dev.pid) {
    try { process.kill(-dev.pid, 'SIGTERM'); } catch {}
    await devStopped;
  }
  await rm(directory, { recursive: true, force: true });
}
