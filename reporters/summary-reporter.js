'use strict';
const fs = require('fs');
const path = require('path');

const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');

class SummaryReporter {
  constructor(globalConfig, options = {}) {
    this.outDir = path.resolve(options.outputDir || 'report');
  }

  onRunComplete(_contexts, results) {
    const rows = [];
    for (const suite of results.testResults) {
      for (const t of suite.testResults) {
        const m = /^([A-Z]+-\d+(?:\/\d+)*)\s+(.*)$/.exec(t.title);
        rows.push({
          id: m ? m[1] : '-',
          title: m ? m[2] : t.title,
          group: t.ancestorTitles.join(' > '),
          status: t.status, // passed | failed | pending
          ms: t.duration || 0,
          error: strip((t.failureMessages || []).join('\n')).split('\n').slice(0, 12).join('\n'),
        });
      }
    }
    const total = rows.length;
    const passed = rows.filter((r) => r.status === 'passed').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const skipped = total - passed - failed;

    this.printConsole(rows, { total, passed, failed, skipped });
    fs.mkdirSync(this.outDir, { recursive: true });
    const htmlPath = path.join(this.outDir, 'report.html');
    fs.writeFileSync(htmlPath, this.html(rows, { total, passed, failed, skipped }));
    fs.writeFileSync(path.join(this.outDir, 'results.json'), JSON.stringify(rows, null, 2));
    console.log(`\n${C.b}HTML report:${C.x} ${htmlPath}\n${C.b}JSON results:${C.x} ${path.join(this.outDir, 'results.json')}\n`);
  }

  printConsole(rows, s) {
    const idW = Math.max(6, ...rows.map((r) => r.id.length));
    console.log(`\n${C.b}=== Petstore API Test Report ===${C.x}\n`);
    for (const r of rows) {
      const tag = r.status === 'passed' ? `${C.g}PASS${C.x}` : r.status === 'failed' ? `${C.r}FAIL${C.x}` : `${C.y}SKIP${C.x}`;
      console.log(`${tag}  ${r.id.padEnd(idW)}  ${r.title} ${C.d}(${r.ms} ms)${C.x}`);
    }
    const failedRows = rows.filter((r) => r.status === 'failed');
    if (failedRows.length) {
      console.log(`\n${C.r}${C.b}Failed tests:${C.x}`);
      for (const r of failedRows) {
        const first = r.error.split('\n').find((l) => l.trim()) || '';
        console.log(`  ${r.id}  ${r.title}\n      ${C.d}${first.trim()}${C.x}`);
      }
    }
    const rate = s.total ? ((s.passed / s.total) * 100).toFixed(1) : '0.0';
    console.log(`\n${C.b}Total:${C.x} ${s.total}   ${C.g}Passed:${C.x} ${s.passed}   ${C.r}Failed:${C.x} ${s.failed}   ${C.y}Skipped:${C.x} ${s.skipped}   ${C.b}Pass rate:${C.x} ${rate}%`);
  }

  html(rows, s) {
    const rate = s.total ? ((s.passed / s.total) * 100).toFixed(1) : '0.0';
    const body = rows.map((r) => `
      <tr class="${r.status}">
        <td>${esc(r.id)}</td><td>${esc(r.group)}</td><td>${esc(r.title)}</td>
        <td><span class="badge ${r.status}">${r.status === 'passed' ? 'PASS' : r.status === 'failed' ? 'FAIL' : 'SKIP'}</span></td>
        <td>${r.ms} ms</td>
        <td>${r.error ? `<details><summary>Show</summary><pre>${esc(r.error)}</pre></details>` : ''}</td>
      </tr>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Petstore API Test Report</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;color:#1a1a1a;background:#fafafa}
h1{margin:0 0 4px}.meta{color:#666;margin-bottom:16px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px 20px;min-width:110px}
.card b{display:block;font-size:26px}.passed b{color:#1a7f37}.failed b{color:#cf222e}
table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top;font-size:14px}
th{background:#f0f0f0}tr.failed{background:#fff5f5}
.badge{padding:2px 8px;border-radius:10px;color:#fff;font-size:12px;font-weight:600}
.badge.passed{background:#1a7f37}.badge.failed{background:#cf222e}.badge.pending{background:#9a6700}
pre{white-space:pre-wrap;max-width:560px;margin:6px 0 0;font-size:12px}
.filters button{margin-right:6px;padding:4px 12px;cursor:pointer}
</style></head><body>
<h1>Petstore API Test Report</h1>
<div class="meta">Base URL: ${esc(process.env.BASE_URL || 'https://petstore.swagger.io')} &middot; Generated: ${new Date().toLocaleString()}</div>
<div class="cards">
<div class="card"><b>${s.total}</b>Total</div><div class="card passed"><b>${s.passed}</b>Passed</div>
<div class="card failed"><b>${s.failed}</b>Failed</div><div class="card"><b>${s.skipped}</b>Skipped</div><div class="card"><b>${rate}%</b>Pass rate</div>
</div>
<div class="filters"><button onclick="f('all')">All</button><button onclick="f('passed')">Passed</button><button onclick="f('failed')">Failed</button></div><br>
<table><thead><tr><th>TC ID</th><th>Suite</th><th>Title</th><th>Result</th><th>Time</th><th>Error</th></tr></thead><tbody>${body}</tbody></table>
<script>function f(s){document.querySelectorAll('tbody tr').forEach(r=>r.style.display=(s==='all'||r.classList.contains(s))?'':'none')}</script>
</body></html>`;
  }
}

module.exports = SummaryReporter;
