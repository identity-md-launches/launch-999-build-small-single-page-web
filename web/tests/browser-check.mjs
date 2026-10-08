import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const exportRoot = process.env.EXPORT_ROOT || path.join(root, 'dist');
const artifacts = process.env.EVIDENCE_ROOT || path.join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  if (req.url === '/iframe-test') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><title>Iframe check</title><body style="margin:0"><iframe title="Gas calculator" src="/preview/" sandbox="allow-scripts allow-same-origin" allow="clipboard-write \'none\'" style="width:100%;height:1600px;border:0"></iframe></body></html>');
    return;
  }
  try {
    let resource = new URL(req.url, 'http://localhost').pathname;
    if (!resource.startsWith('/preview/')) throw new Error('Unknown path');
    resource = decodeURIComponent(resource.slice('/preview/'.length)) || 'index.html';
    const filename = path.resolve(exportRoot, resource);
    if (!filename.startsWith(`${path.resolve(exportRoot)}/`)) throw new Error('Outside export');
    res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
    res.end(await readFile(filename));
  } catch { res.statusCode = 404; res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const report = { checks: [], viewports: [], contrast: [], focus: [], accessibility: [], requests: [], consoleErrors: [], pageErrors: [], failedRequests: [] };
function passed(name) { report.checks.push(name); console.log(`PASS ${name}`); }

try {
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('request', request => report.requests.push(request.url().replace(origin, 'LOCAL')));
  page.on('requestfailed', request => report.failedRequests.push(request.url()));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.route('**/*', async route => {
    assert.ok(route.request().url().startsWith(origin), 'No external runtime requests');
    await route.continue();
  });
  await page.goto(`${origin}/preview/`);
  const field = page.getByRole('textbox', { name: 'Amount in wei' });
  const output = unit => page.locator(`#${unit}-result`);
  await field.waitFor();
  assert.equal(await output('gwei').textContent(), '1');
  assert.equal(await output('ETH').textContent(), '0.000000001');
  passed('Default result and relative assets at /preview/');

  for (const width of [1200, 800, 720, 360, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, columns: getComputedStyle(document.querySelector('.calculator')).gridTemplateColumns }));
    assert.ok(dimensions.scrollWidth <= width, `No overflow at ${width}`);
    report.viewports.push(dimensions);
    await page.screenshot({ path: path.join(artifacts, `calculator-${width}.png`), fullPage: true });
  }
  passed('Reflow at 320, 360, 720, 800, and 1200 CSS pixels');

  for (const [value, gwei, eth] of [
    ['1', '0.000000001', '0.000000000000000001'],
    ['0', '0', '0'],
    ['1,000,000,000', '1', '0.000000001'],
    ['1000000000000000001', '1000000000.000000001', '1.000000000000000001'],
    ['9007199254740993', '9007199.254740993', '0.009007199254740993'],
    [' 0001000000000 ', '1', '0.000000001'],
  ]) {
    await field.fill(value);
    assert.equal(await output('gwei').textContent(), gwei);
    assert.equal(await output('ETH').textContent(), eth);
    if (value === '1') {
      await page.screenshot({ path: path.join(artifacts, 'calculator-one-wei.png'), fullPage: true });
      const size = await output('ETH').evaluate(element => ({ height: element.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(element).lineHeight) }));
      assert.ok(size.height <= size.lineHeight + 1, 'One-wei ETH result fits on one line at 320px');
    }
  }
  passed('Typing, comma paste, trimming, zero, one wei, and large exact conversions');

  for (const invalid of ['-1', '1.2', '1e9', '0x10', '1,00', '9'.repeat(257)]) {
    await field.fill(invalid);
    assert.equal(await field.getAttribute('aria-invalid'), 'true');
    assert.equal(await output('gwei').textContent(), '—');
    assert.ok(await page.getByRole('button', { name: 'Copy gwei amount' }).isDisabled());
  }
  await page.screenshot({ path: path.join(artifacts, 'calculator-error.png'), fullPage: true });
  passed('Invalid values show a recoverable error and suppress stale results');

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  assert.equal(await field.inputValue(), '');
  assert.equal(await output('ETH').textContent(), '—');
  assert.equal(await field.evaluate(element => document.activeElement === element), true);
  await page.screenshot({ path: path.join(artifacts, 'calculator-empty.png'), fullPage: true });
  passed('Clear shows the empty state and returns focus to input');
  for (const [name, value] of [['1 wei', '1'], ['1 gwei', '1000000000'], ['1 ETH', '1000000000000000000']]) {
    await page.getByRole('button', { name, exact: true }).click();
    assert.equal(await field.inputValue(), value);
    assert.equal(await field.getAttribute('aria-invalid'), 'false');
  }
  passed('All three examples populate input and recover from errors');

  await field.fill('9'.repeat(256));
  assert.equal(await field.getAttribute('aria-invalid'), 'false');
  assert.equal((await output('ETH').textContent()).replace('.', '').length, 256);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(artifacts, 'calculator-long.png'), fullPage: true });
  passed('256-digit results remain complete and wrap without page overflow at 320px');

  await page.setViewportSize({ width: 1200, height: 1000 });
  await field.fill('1000000000000000001');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  for (const [unit, expected] of [['gwei', '1000000000.000000001'], ['ETH', '1.000000000000000001']]) {
    await page.getByRole('button', { name: `Copy ${unit} amount` }).click();
    await page.getByText(`${unit} amount copied.`, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
    assert.equal(await page.getByRole('button', { name: `Copy ${unit} amount` }).innerText(), 'Copy');
  }
  passed('Both clipboard buttons copy the full unrounded decimal');

  await field.fill('1000000000');
  await field.focus();
  for (let i = 0; i < 6; i++) {
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      const css = getComputedStyle(element);
      return { name: element.getAttribute('aria-label') || element.textContent || element.id, visible: element.matches(':focus-visible'), outline: css.outlineStyle, width: css.outlineWidth, color: css.outlineColor, bounds: { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height } };
    });
    assert.ok(focus.visible && focus.outline === 'solid' && parseFloat(focus.width) >= 2);
    report.focus.push(focus);
    await page.screenshot({ path: path.join(artifacts, `focus-${i}.png`), fullPage: true });
    await page.keyboard.press('Tab');
  }
  await page.getByRole('button', { name: '1 wei', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await field.inputValue(), '1');
  await page.getByRole('button', { name: 'Clear', exact: true }).focus();
  await page.screenshot({ path: path.join(artifacts, 'focus-clear.png'), fullPage: true });
  await page.keyboard.press('Space');
  assert.equal(await field.inputValue(), '');
  passed('Keyboard focus, Tab order, Enter example and Space clear');

  await field.fill('1000000000');
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(artifacts, 'calculator-text-200.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.removeProperty('font-size'); });
  passed('200% root text enlargement at 360px (not browser-native zoom)');

  assert.equal(await page.locator('.clear-button').evaluate(element => getComputedStyle(element).transitionDuration), '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.ok((await page.locator('.clear-button').evaluate(element => getComputedStyle(element).transitionDuration)).includes('0.12s'));
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await field.focus();
  assert.equal(await field.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
  await page.screenshot({ path: path.join(artifacts, 'calculator-forced-colors.png'), fullPage: true });
  await page.emulateMedia({ forcedColors: 'none' });
  passed('Reduced motion and forced-colors focus styles');

  const axeSource = await readFile(process.env.AXE_SCRIPT || require.resolve('axe-core/axe.min.js'), 'utf8');
  await page.evaluate(axeSource);
  for (const [state, value] of [['valid', '1000000000'], ['invalid', '-1'], ['empty', '']]) {
    await field.fill(value);
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return { violations: result.violations, incomplete: result.incomplete.map(item => item.id), passes: result.passes.length };
    });
    report.accessibility.push({ state, ...audit });
    assert.equal(audit.violations.length, 0, JSON.stringify(audit.violations));
  }
  passed('Axe WCAG A/AA scans for valid, invalid and empty states');

  await field.fill('1000000000');
  report.contrast = await page.evaluate(() => {
    function rgb(s) { return s.match(/[\d.]+/g).slice(0, 3).map(Number); }
    function luminance(c) { return c.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0); }
    const pairs = [['body', 'body', ':root', 'color'], ['secondary', '.intro-description', ':root', 'color'], ['gwei result', '#gwei-result', '.result-card-tinted', 'color'], ['formula on tint', '.result-card-tinted .formula', '.result-card-tinted', 'color'], ['control border', '.input-wrap', '.input-wrap', 'borderTopColor'], ['focus on white', '#wei', '.input-wrap', 'outlineColor'], ['focus on tint', '#wei', '.result-card-tinted', 'outlineColor']];
    return pairs.map(([name, foreground, background, property]) => {
      const fg = getComputedStyle(document.querySelector(foreground))[property];
      const bg = getComputedStyle(document.querySelector(background)).backgroundColor;
      const [a,b] = [luminance(rgb(fg)), luminance(rgb(bg))].sort((a,b) => b-a);
      return { name, foreground: fg, background: bg, ratio: +((a+.05)/(b+.05)).toFixed(2) };
    });
  });
  for (const pair of report.contrast) assert.ok(pair.ratio >= (pair.name.includes('border') || pair.name.includes('focus') ? 3 : 4.5), JSON.stringify(pair));
  passed('Measured rendered text, input boundary, and focus contrast');

  await context.setOffline(true);
  await field.fill('1234567890');
  assert.equal(await output('gwei').textContent(), '1.23456789');
  assert.equal(await output('ETH').textContent(), '0.00000000123456789');
  await context.setOffline(false);
  passed('Conversion still works with the browser offline after initial load');

  await context.clearPermissions();
  await page.goto(`${origin}/iframe-test`);
  const frame = page.frameLocator('iframe');
  for (const width of [1200, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await frame.getByRole('textbox', { name: 'Amount in wei' }).fill('1000000000');
    assert.equal(await frame.locator('#gwei-result').textContent(), '1');
    assert.ok(await page.frames()[1].evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await frame.getByRole('textbox', { name: 'Amount in wei' }).fill('1000000000000000001');
  assert.equal(await frame.locator('#ETH-result').textContent(), '1.000000000000000001');
  await frame.getByRole('button', { name: 'Copy ETH amount' }).click();
  await frame.getByText('Copy is unavailable here.', { exact: false }).waitFor();
  const selected = await page.frames()[1].evaluate(() => window.getSelection().toString());
  assert.equal(selected, '1.000000000000000001');
  passed('Sandboxed iframe conversion and blocked clipboard selection fallback');

  // The deliberate iframe clipboard denial can produce a browser policy diagnostic.
  const unexpectedErrors = report.consoleErrors.filter(message => !/clipboard|permissions policy/i.test(message));
  assert.deepEqual(unexpectedErrors, []);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.failedRequests, []);
  passed('No unexpected console errors, page exceptions, failed assets, or external requests');
  await writeFile(path.join(artifacts, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Completed ${report.checks.length} check groups.`);
} catch (error) {
  await writeFile(path.join(artifacts, 'browser-results.json'), JSON.stringify({ ...report, failure: String(error) }, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
