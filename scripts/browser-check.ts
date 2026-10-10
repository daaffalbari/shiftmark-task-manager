import { strict as assert } from 'node:assert';
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
const { db, sqlite } = openDatabase(databasePath);
migrateDatabase(db);
seedDemoUsers(db);
sqlite.close();
const output = resolve('.browser-checks');
await mkdir(output, { recursive: true });
const origin = 'http://localhost:15173';
let exited = false;
let stopping = false;
const dev = spawn(process.execPath, ['run', 'dev'], {
  cwd: resolve('.'), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, DB_FILE_NAME: databasePath, NODE_ENV: 'development', APP_ORIGIN: origin, PORT: '13000', WEB_PORT: '15173' },
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
      const [web, api] = await Promise.all([fetch(origin, { signal: AbortSignal.timeout(1000) }), fetch(origin + '/api/members', { signal: AbortSignal.timeout(1000) })]);
      if (web.ok && api.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Development server did not become ready; check ports 13000 and 15173.');
}
async function chooseActor(page: Page, name: string) {
  const selector = page.getByRole('combobox', { name: 'Acting as', exact: true });
  await selector.waitFor();
  await selector.selectOption({ label: name });
  await page.getByRole('heading', { name: 'Team tasks', exact: true }).waitFor();
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
    const options = { viewport: { width, height: 900 }, timezoneId: 'Asia/Jakarta', reducedMotion: 'reduce' as const };
    const johnContext = await browser.newContext(options);
    const janeContext = await browser.newContext(options);
    const john = await johnContext.newPage();
    const jane = await janeContext.newPage();
    for (const page of [john, jane]) page.on('pageerror', (error) => errors.push(error.message));
    const title = 'Prepare invoice ' + width;
    const revised = 'Approved invoice ' + width;
    await john.goto(origin + '/tasks');
    await chooseActor(john, 'John Doe');
    await noOverflow(john);
    assert.equal(await john.getByLabel('Password', { exact: true }).count(), 0, 'The assessment workspace must open without login');
    await john.screenshot({ path: join(output, 'actor-workspace-' + width + '.png'), fullPage: true });
    if (width === 1440) {
      const sidebar = john.locator('.sidebar');
      const main = john.getByRole('main');
      assert.equal((await main.boundingBox())?.x, 208);
      await john.getByRole('button', { name: 'Hide sidebar', exact: true }).press('Enter');
      await sidebar.waitFor({ state: 'hidden' });
      const showSidebar = john.getByRole('button', { name: 'Show sidebar', exact: true });
      assert.equal(await showSidebar.getAttribute('aria-expanded'), 'false');
      assert(await showSidebar.evaluate((element) => element === document.activeElement), 'Sidebar toggle must retain keyboard focus');
      assert.equal((await main.boundingBox())?.x, 0, 'Closing the sidebar must release its width');
      await noOverflow(john);
      await john.screenshot({ path: join(output, 'sidebar-closed-' + width + '.png'), fullPage: true });
      for (const checkWidth of [390, 768, 1024]) {
        await john.setViewportSize({ width: checkWidth, height: 900 });
        assert.equal(await sidebar.isVisible(), checkWidth < 1024, 'Mobile navigation must remain available after closing the desktop sidebar');
        assert.equal(await showSidebar.isVisible(), checkWidth >= 1024);
        await noOverflow(john);
      }
      await john.setViewportSize({ width, height: 900 });
      await showSidebar.press('Space');
      await sidebar.waitFor({ state: 'visible' });
      assert.equal((await main.boundingBox())?.x, 208);
      assert.equal(await john.getByRole('button', { name: 'Hide sidebar', exact: true }).getAttribute('aria-expanded'), 'true');
      await john.screenshot({ path: join(output, 'sidebar-open-' + width + '.png'), fullPage: true });
    }
    const newButton = john.locator('header').getByRole('button', { name: 'New task', exact: true });
    await newButton.click();
    assert(await john.getByLabel('Task title').evaluate((element) => element === document.activeElement));
    await john.keyboard.press('Escape');
    assert(await newButton.evaluate((element) => element === document.activeElement), 'Create dialog must restore focus');
    await newButton.click();
    await john.getByLabel('Task title').fill(title);
    await john.getByLabel('Description', { exact: true }).fill('Check draft totals');
    await john.getByLabel('Assignee', { exact: true }).getByRole('option', { name: 'John Doe', exact: true }).waitFor({ state: 'attached' });
    await john.getByLabel('Assignee', { exact: true }).selectOption({ label: 'John Doe' });
    await noOverflow(john);
    await john.screenshot({ path: join(output, 'team-create-' + width + '.png'), fullPage: true });
    await john.getByRole('button', { name: 'Create task', exact: true }).click();
    await john.getByRole('button', { name: 'View details for ' + title, exact: true }).waitFor();

    await jane.goto(origin + '/tasks');
    await chooseActor(jane, 'Jane Doe');
    const janeOpener = jane.getByRole('button', { name: 'View details for ' + title, exact: true });
    await janeOpener.waitFor();
    await janeOpener.click();
    const activity = jane.getByRole('list', { name: 'Task activity', exact: true });
    await activity.getByText('Title: ' + title, { exact: true }).waitFor();
    assert((await activity.textContent())?.includes('John Doe created this task.'));
    await jane.getByRole('button', { name: 'Edit details', exact: true }).click();
    await jane.getByLabel('Task title').fill(revised);
    await jane.getByLabel('Description', { exact: true }).fill('Approved totals');
    await jane.getByLabel('Assignee', { exact: true }).getByRole('option', { name: 'Jane Doe', exact: true }).waitFor({ state: 'attached' });
    await jane.getByLabel('Assignee', { exact: true }).selectOption({ label: 'Jane Doe' });
    await jane.screenshot({ path: join(output, 'team-edit-' + width + '.png'), fullPage: true });
    await jane.getByRole('button', { name: 'Save changes', exact: true }).click();
    await jane.getByRole('heading', { name: revised, exact: true }).waitFor();
    await activity.getByText('Approved totals', { exact: false }).waitFor();
    assert((await activity.textContent())?.includes('Jane Doe updated this task.'));
    assert((await activity.textContent())?.includes('BeforeCheck draft totalsAfterApproved totals'));
    assert((await activity.textContent())?.includes('BeforeJohn DoeAfterJane Doe'));

    // A second workspace sees the edit and cannot overwrite it from a stale form.
    await john.getByRole('button', { name: 'Refresh', exact: true }).click();
    const johnOpener = john.getByRole('button', { name: 'View details for ' + revised, exact: true });
    await johnOpener.waitFor();
    await noOverflow(john);
    await john.screenshot({ path: join(output, 'team-tasks-' + width + '.png'), fullPage: true });
    if (width === 1440) {
      for (const checkWidth of [320, 768, 1024]) {
        await john.setViewportSize({ width: checkWidth, height: 900 });
        await noOverflow(john);
      }
      await john.setViewportSize({ width, height: 900 });
    }
    await johnOpener.click();
    await john.getByRole('list', { name: 'Task activity' }).waitFor();
    await john.getByRole('button', { name: 'Edit details', exact: true }).click();
    await john.getByLabel('Assignee', { exact: true }).getByRole('option', { name: 'Jane Doe', exact: true }).waitFor({ state: 'attached' });
    await john.getByLabel('Task title').fill('John unsaved draft');
    await jane.getByRole('button', { name: 'Move to Pending', exact: true }).click();
    await jane.getByRole('button', { name: 'Move to In progress', exact: true }).waitFor();
    await john.getByRole('button', { name: 'Save changes', exact: true }).click();
    await john.getByRole('alert').getByText('A teammate changed this task.', { exact: false }).waitFor();
    assert.equal(await john.getByLabel('Task title').inputValue(), 'John unsaved draft');
    assert(await john.getByRole('button', { name: 'Save changes', exact: true }).isDisabled());
    await john.screenshot({ path: join(output, 'team-conflict-' + width + '.png'), fullPage: true });
    await john.getByRole('button', { name: 'Reload latest', exact: true }).click();
    await john.waitForFunction((expected) => (document.querySelector('#edit-task-title') as HTMLInputElement)?.value === expected, revised);
    await john.getByRole('button', { name: 'Cancel', exact: true }).click();
    for (const name of ['Move to In progress', 'Mark as Done']) {
      const action = jane.getByRole('button', { name, exact: true });
      await action.waitFor(); await action.click();
    }
    await visible(jane, 'This task is complete.');
    await john.getByRole('button', { name: 'Refresh task', exact: true }).click();
    await visible(john, 'This task is complete.');
    const johnActivity = john.getByRole('list', { name: 'Task activity', exact: true });
    await johnActivity.waitFor();
    assert.equal(await johnActivity.getByRole('listitem').count(), 5);
    assert((await johnActivity.textContent())?.includes('Jane Doe moved this task from In progress to Done.'));
    const detail = john.getByRole('dialog', { name: revised, exact: true });
    assert.equal(Math.round(await detail.evaluate((element) => element.getBoundingClientRect().width)), width === 1440 ? 440 : 390);
    if (width === 1440) assert.equal(await john.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().width), 208);
    await detail.evaluate((element) => { element.scrollTop = 0; });
    await john.screenshot({ path: join(output, 'team-detail-' + width + '.png'), fullPage: true });
    await johnActivity.scrollIntoViewIfNeeded();
    await john.screenshot({ path: join(output, 'team-history-' + width + '.png'), fullPage: true });
    await noOverflow(john);
    for (let key = 0; key < 6; key++) {
      await john.keyboard.press('Tab');
      assert(await john.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog[open]')), 'Modal must contain keyboard focus');
    }
    assert(await detail.evaluate((element) => element.matches(':modal')), 'Detail must use the native modal top layer');
    await john.keyboard.press('Escape');
    assert(await johnOpener.evaluate((element) => element === document.activeElement), 'Detail must restore focus after refresh');

    await jane.getByRole('button', { name: 'Delete task', exact: true }).click();
    const confirm = jane.getByRole('dialog', { name: 'Delete “' + revised + '”?', exact: true });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await jane.getByRole('button', { name: 'Delete task', exact: true }).click();
    await confirm.getByRole('button', { name: 'Delete task', exact: true }).click();
    await jane.getByRole('heading', { name: 'Team tasks', exact: true }).waitFor();
    await john.getByRole('button', { name: 'Refresh', exact: true }).click();
    await johnOpener.waitFor({ state: 'hidden' });
    await john.getByRole('link', { name: 'Deleted tasks', exact: true }).click();
    await johnOpener.waitFor(); await johnOpener.click();
    await john.getByText('Deleted on', { exact: false }).waitFor();
    await johnActivity.waitFor();
    assert.equal(await johnActivity.getByRole('listitem').count(), 6);
    assert((await johnActivity.textContent())?.includes('Jane Doe deleted “' + revised + '”. History is preserved.'));
    assert.equal(await john.getByRole('button', { name: /Move to|Mark as|Delete task|Edit details/ }).count(), 0);
    await johnActivity.scrollIntoViewIfNeeded();
    await john.screenshot({ path: join(output, 'team-deleted-' + width + '.png'), fullPage: true });
    await noOverflow(john);

    await john.keyboard.press('Escape');
    await john.getByRole('link', { name: 'Team tasks', exact: true }).click();
    await chooseActor(john, 'Jane Doe');
    await john.getByRole('link', { name: 'Deleted tasks', exact: true }).click();
    assert.equal(await john.getByRole('combobox', { name: 'Acting as', exact: true }).inputValue(), '2', 'Actor selection must survive navigation');
    await johnOpener.click();
    await johnActivity.waitFor();
    assert.equal(await johnActivity.getByRole('listitem').count(), 6, 'Switching actor must not change recorded history');
    assert((await johnActivity.textContent())?.includes('John Doe created this task.'));
    await johnContext.close(); await janeContext.close();
    console.log('PASS ' + width + 'px: sidebar, shared access, assignment, before/after edits, stale draft, workflow, deletion history, actor switching, keyboard and overflow');
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
