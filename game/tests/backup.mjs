// Backup outside claude.ai: a real file download on desktop, the share sheet ("Save to Files") on iPad,
// and the backup restores. Also checks the Home Screen tags. Run: node game/tests/backup.mjs
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const file = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist/ward-rounds.html');
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); };

async function toSettings(page) {
  await page.goto(file);
  await page.waitForSelector('.onboard, .floorplan');
  await page.evaluate(() => { const s = window.WR.Store; s.state.profile.onboarded = true; s.state.profile.name = 'Test'; s.state.xp = 1234; s.save({ now: true }); window.WR.App.show('settings'); });
  await page.waitForSelector('[data-action="backup"]');
}

const browser = await chromium.launch();

// desktop: ordinary download
{
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await toSettings(page);
  const head = await page.evaluate(() => ({
    capable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"][content="yes"]'),
    icon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
  }));
  check(head.capable && head.icon === 'apple-touch-icon.png' && head.manifest === 'manifest.webmanifest', 'Home Screen tags present');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click('[data-action="backup"]')]);
  check(/^ward-rounds-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'desktop backup downloads a dated .json file');
  const saved = path.join(path.dirname(new URL(import.meta.url).pathname), '../dist/backup-test.json');
  await dl.saveAs(saved);
  const obj = JSON.parse(fs.readFileSync(saved, 'utf8'));
  check(obj.app === 'ward-rounds' && obj.save.xp === 1234, 'downloaded file holds the progress');
  // restore it after wiping progress
  await page.evaluate(() => { window.WR.Store.state.xp = 0; window.WR.App.show('settings'); });
  await page.setInputFiles('#restore', saved);
  await page.waitForSelector('#modal-root .modal');
  await page.click('#modal-root [data-m="yes"]');
  await page.waitForTimeout(400);
  check(await page.evaluate(() => window.WR.Store.state.xp) === 1234, 'restoring the downloaded file brings progress back');
  fs.unlinkSync(saved);
  check(await page.evaluate(() => !document.querySelector('#modal-root .modal')), 'no iPad reminder on desktop');
  check(errors.length === 0, 'no page errors (desktop)' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

// iPad: share sheet with the file
{
  const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
  await ctx.addInitScript(() => {
    window.__shared = null;
    navigator.canShare = (d) => !!(d && d.files && d.files.length);
    navigator.share = async (d) => { window.__shared = { name: d.files[0].name, text: await d.files[0].text() }; };
  });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await toSettings(page);
  await page.click('[data-action="backup"]');
  await page.waitForTimeout(400);
  const sh = await page.evaluate(() => window.__shared);
  check(sh && /\.json$/.test(sh.name) && JSON.parse(sh.text).save.xp === 1234, 'iPad backup opens the share sheet with the file');
  // the how-to-save guide in Settings
  const guide = await page.evaluate(() => document.querySelector('.card.save-help')?.innerText || '');
  check(/How to save your game on iPad/.test(guide) && /Add to Home Screen/.test(guide) && /Save to Files/.test(guide), 'Settings shows the iPad save guide');
  // one-time reminder in Safari: appears at start, "Remind me later" keeps it, "Got it" retires it
  const reminder = async () => { await page.reload(); await page.waitForSelector('.floorplan'); await page.waitForTimeout(300); return page.evaluate(() => /Keep your progress safe/.test(document.querySelector('#modal-root')?.innerText || '')); };
  check(await reminder(), 'iPad Safari shows the save reminder at start');
  await page.click('#modal-root [data-m="later"]');
  check(await reminder(), '"Remind me later" shows it again next time');
  await page.click('#modal-root [data-m="ok"]');
  await page.waitForTimeout(400);
  check(!(await reminder()), '"Got it" stops the reminder');
  await page.screenshot({ path: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist/shots/ipad-save-guide.png') }).catch(() => {});
  check(errors.length === 0, 'no page errors (iPad)' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} failure(s)` : 'backup: all passed');
process.exit(failures ? 1 : 0);
