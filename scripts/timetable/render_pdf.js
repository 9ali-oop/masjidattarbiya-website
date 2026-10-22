// Print a month's timetable page to an A4 PDF, and a PNG to look at.
//   python scripts/timetable/timetable.py html 2026-10
//   node scripts/timetable/render_pdf.js 2026-10
// Needs Playwright with Chromium. Fails if the page would spill onto a second sheet.
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

(async () => {
  const ym = process.argv[2];
  if (!/^\d{4}-\d{2}$/.test(ym || '')) { console.error('usage: node render_pdf.js YYYY-MM'); process.exit(2); }
  const out = path.join(__dirname, 'out');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(out, ym + '.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const spill = await page.evaluate(() => document.body.scrollHeight - document.body.clientHeight);
  await page.pdf({ path: path.join(out, ym + '.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.screenshot({ path: path.join(out, ym + '.png') });
  await browser.close();
  if (spill > 0) { console.error(`${ym}: the page is ${spill}px too tall for one sheet`); process.exit(1); }
  console.log(`wrote ${path.join(out, ym + '.pdf')}`);
})();
