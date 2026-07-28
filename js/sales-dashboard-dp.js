'use strict';
/* ============================================================
   SALES-DASHBOARD-DP.JS — modupay DP sales dashboard
   Depends on: sales-shared.js
   ============================================================ */

// ── DP Processing category list ───────────────────────────────
const DP_PROCESSING_CATS = [
  'Account Setup', 'Trx Processing', 'Fraud', 'VAS', 'Hosting',
  'Recurring Fees', '3DS', 'Implementation/Setup/CRs',
  'Digital & Data Products', 'Tokenization', 'ATM',
];

// ── DP Stacked Bar Trend: Processing / Issuance ───────────────
function _mkDPTypeToggle(currentVal) {
  const opts = [['all', 'All'], ['processing', 'Processing'], ['issuance', 'Issuance']];
  return opts.map(([v, l]) => `
    <button class="sp-btn${currentVal === v ? ' sp-btn-active' : ''}"
      style="padding:4px 9px;font-size:11px"
      onclick="SALES_STATE.dpTrendType='${v}';renderSalesDashboard()">
      ${l}
    </button>`).join('');
}

function _drawDPStackedTrend(id, allRows, period, sliderN, typeFilter) {
  const canvas = document.getElementById(id); if (!canvas) return;
  canvas.style.width = '100%'; canvas.style.height = '100%'; _destroyChart(id);

  let rows = allRows;
  if (typeFilter === 'processing') rows = allRows.filter(r => !DP_ISSUANCE_CATS.has(r.categorization) && !DP_ISSUANCE_CATS.has(r.mainCategory));
  if (typeFilter === 'issuance')   rows = allRows.filter(r =>  DP_ISSUANCE_CATS.has(r.categorization) ||  DP_ISSUANCE_CATS.has(r.mainCategory));

  const allKeys   = _buildPeriodKeys(rows, period);
  const keys      = allKeys.slice(-sliderN);
  if (!keys.length) return;

  const procMap = {}, issMap = {}, splyMap = {};
  for (const r of allRows) {  // SPLY from full dataset
    const k  = _periodKey(r, period);
    const fk = (() => {
      if (period === 'quarter') { const [y, q] = k.split('-'); return `${parseInt(y) + 1}-${q}`; }
      if (period === 'half')    { const [y, h] = k.split('-'); return `${parseInt(y) + 1}-${h}`; }
      const [y, mm] = k.split('-'); return `${parseInt(y) + 1}-${mm}`;
    })();
    splyMap[fk] = (splyMap[fk] || 0) + _valDP(r);
  }
  for (const r of rows) {
    const k      = _periodKey(r, period);
    const isIss  = DP_ISSUANCE_CATS.has(r.categorization) || DP_ISSUANCE_CATS.has(r.mainCategory);
    if (isIss) issMap[k]  = (issMap[k]  || 0) + _valDP(r);
    else       procMap[k] = (procMap[k] || 0) + _valDP(r);
  }

  const labels    = keys.map(k => _periodLabel(k, period));
  const procData  = keys.map(k => procMap[k] || 0);
  const issData   = keys.map(k => issMap[k]  || 0);
  const splyData  = keys.map(k => splyMap[k] || 0);
  const totalData = keys.map((k, i) => procData[i] + issData[i]);
  const hasSPLY   = splyData.some(v => v > 0);
  const showBoth  = typeFilter === 'all';

  const datasets = [];
  if (showBoth || typeFilter === 'processing') {
    datasets.push({
      label: 'Processing', data: showBoth ? procData : totalData,
      backgroundColor: '#0d9488',
      borderRadius: showBoth
        ? { topLeft: 0, topRight: 0, bottomLeft: 3, bottomRight: 3 }
        : { topLeft: 3, topRight: 3, bottomLeft: 3, bottomRight: 3 },
      stack: 'curr', order: 2,
    });
  }
  if (showBoth || typeFilter === 'issuance') {
    datasets.push({
      label: 'Issuance', data: showBoth ? issData : totalData,
      backgroundColor: '#2563eb',
      borderRadius: showBoth
        ? { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 }
        : { topLeft: 3, topRight: 3, bottomLeft: 3, bottomRight: 3 },
      stack: 'curr', order: 2,
    });
  }
  if (hasSPLY) {
    datasets.push({
      label: 'SPLY Total', data: splyData, type: 'line', fill: false,
      borderColor: '#94a3b8', borderDash: [5, 4], borderWidth: 1.5,
      pointRadius: 3, tension: 0.3, stack: undefined, order: 1,
    });
  }

  _salesCharts[id] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 280 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', align: 'end',
          labels: { color: _chartTxt(), font: { size: 10 }, boxWidth: 12, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'SPLY Total') return ` SPLY: ${_fmtDP(ctx.parsed.y)}`;
              const total = totalData[ctx.dataIndex];
              const pct   = total ? (ctx.parsed.y / total * 100).toFixed(1) : 0;
              return ` ${ctx.dataset.label}: ${_fmtDP(ctx.parsed.y)} (${pct}%)`;
            },
            footer: items => {
              const i = items[0]?.dataIndex; if (i == null) return '';
              return `Total: ${_fmtDP(totalData[i])}`;
            },
          },
        },
      },
      scales: {
        x: { stacked: true, ticks: { color: _chartTxt(), font: { size: 9 }, maxRotation: 35 }, grid: { color: _chartGrid() } },
        y: { stacked: true, ticks: { color: _chartTxt(), font: { size: 10 }, callback: v => _fmtDP(v) }, grid: { color: _chartGrid() } },
      },
    },
    plugins: [{ id: 'dpStackLabels', afterDatasetsDraw(chart) {
      const { ctx } = chart; ctx.save();
      const barMetas = chart.data.datasets
        .map((ds, i) => ({ ds, meta: chart.getDatasetMeta(i) }))
        .filter(x => x.ds.type !== 'line' && x.ds.stack === 'curr');
      if (!barMetas.length) return;
      const topMeta = barMetas[barMetas.length - 1].meta;
      topMeta.data.forEach((bar, i) => {
        const total = totalData[i]; if (!total) return;
        ctx.fillStyle = _isDark() ? '#e2e8f0' : '#1e293b';
        ctx.font = '600 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(_fmtDP(total), bar.x, bar.y - 3);
        barMetas.forEach(({ ds, meta }) => {
          const seg = meta.data[i], h = Math.abs(seg.base - seg.y), val = ds.data[i] || 0;
          if (h > 18 && val > 0) {
            const pct = (val / total * 100).toFixed(0);
            ctx.fillStyle = '#fff'; ctx.font = '500 8px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`${pct}%`, seg.x, (seg.base + seg.y) / 2);
          }
        });
      });
      ctx.restore();
    } }],
  });
}

// ── DP Revenue by Categorization table ───────────────────────
function _renderDPCategorizationTable(curr, sply, currLabel, splyLabel) {
  function sumCat(rows, cat) {
    return rows.filter(r => r.categorization === cat || r.mainCategory === cat)
               .reduce((s, r) => s + _valDP(r), 0);
  }

  const issuanceCurr = curr.filter(r => DP_ISSUANCE_CATS.has(r.categorization) || DP_ISSUANCE_CATS.has(r.mainCategory));
  const issuanceSply = sply.filter(r => DP_ISSUANCE_CATS.has(r.categorization) || DP_ISSUANCE_CATS.has(r.mainCategory));
  const issuanceC    = issuanceCurr.reduce((s, r) => s + _valDP(r), 0);
  const issuanceS    = issuanceSply.reduce((s, r) => s + _valDP(r), 0);
  const totalC       = curr.reduce((s, r) => s + _valDP(r), 0);
  const totalS       = sply.reduce((s, r) => s + _valDP(r), 0);

  function varPct(c, s) { return s ? (c - s) / Math.abs(s) : null; }
  function cellPct(v) {
    if (v == null) return '—';
    const cl = v > 0 ? 'sp-pos' : v < 0 ? 'sp-neg' : '';
    return `<span class="${cl}">${FMT.pct(v)}</span>`;
  }
  function row(label, c, s, indent = false) {
    const varA = c - s, vPct = varPct(c, s);
    const cls = varA >= 0 ? 'sp-pos' : 'sp-neg';
    return `<tr class="${indent ? 'pl-row-data' : 'pl-row-subtotal'}">
      <td class="sp-lbl"${indent ? ' style="padding-left:20px"' : ''}>${_escH(label)}</td>
      <td class="sp-num">${c ? FMT.amount(c) : '—'}</td>
      <td class="sp-num">${s ? FMT.amount(s) : '—'}</td>
      <td class="sp-num ${cls}">${varA ? FMT.amount(varA) : '—'}</td>
      <td class="sp-num">${cellPct(vPct)}</td>
    </tr>`;
  }

  const ccy = _ccy();
  let h = `
    <div class="sp-section-title" style="margin:20px 0 10px">modupay DP — Revenue by Category</div>
    <div class="sp-table-wrap"><table class="sp-table" style="font-size:12px">
    <thead><tr>
      <th class="sp-lbl">Category</th>
      <th class="sp-num">${_escH(currLabel)} (${ccy})</th>
      <th class="sp-num">${_escH(splyLabel)} (${ccy})</th>
      <th class="sp-num">Var +/-</th>
      <th class="sp-num">Var %</th>
    </tr></thead><tbody>`;

  let procTotalC = 0, procTotalS = 0;
  for (const cat of DP_PROCESSING_CATS) {
    const c = sumCat(curr, cat), s = sumCat(sply, cat);
    procTotalC += c; procTotalS += s;
    h += row(cat, c, s, true);
  }
  h += row('Total Processing', procTotalC, procTotalS);
  h += row('Issuance (Cards + Perso)', issuanceC, issuanceS);
  h += `<tr class="sp-total"><td class="sp-lbl">Total Revenues</td>
    <td class="sp-num">${totalC ? FMT.amount(totalC) : '—'}</td>
    <td class="sp-num">${totalS ? FMT.amount(totalS) : '—'}</td>
    <td class="sp-num ${(totalC - totalS) >= 0 ? 'sp-pos' : 'sp-neg'}">${FMT.amount(totalC - totalS)}</td>
    <td class="sp-num">${cellPct(varPct(totalC, totalS))}</td>
  </tr>`;
  h += `</tbody></table></div>`;
  return h;
}

// ── DP Bank vs Fintech client tables ──────────────────────────
function _renderDPClientTables(curr, sply, currLabel, splyLabel) {
  const banks       = curr.filter(r => String(r.bankFintech || '').toLowerCase() === 'bank');
  const fintechs    = curr.filter(r => String(r.bankFintech || '').toLowerCase() !== 'bank');
  const banksSply   = sply.filter(r => String(r.bankFintech || '').toLowerCase() === 'bank');
  const fintechsSply = sply.filter(r => String(r.bankFintech || '').toLowerCase() !== 'bank');

  const viewMode  = SALES_STATE.dpViewMode;
  const filterRows = rows => {
    if (viewMode === 'issuance')   return rows.filter(r =>  DP_ISSUANCE_CATS.has(r.categorization) ||  DP_ISSUANCE_CATS.has(r.mainCategory));
    if (viewMode === 'processing') return rows.filter(r => !DP_ISSUANCE_CATS.has(r.categorization) && !DP_ISSUANCE_CATS.has(r.mainCategory));
    return rows;
  };

  function buildTable(rows, splyRows, title, searchKey, sortColKey, sortDirKey, color) {
    const fRows = filterRows(rows), fSply = filterRows(splyRows);
    const cMap = new Map(), sMap = new Map();
    for (const r of fRows) {
      const k = r.shortName || String(r.code);
      if (!cMap.has(k)) cMap.set(k, { name: k, value: 0, bf: r.bankFintech || '' });
      cMap.get(k).value += _valDP(r);
    }
    for (const r of fSply) { const k = r.shortName || String(r.code); sMap.set(k, (sMap.get(k) || 0) + _valDP(r)); }

    const q = SALES_STATE[searchKey].trim().toLowerCase();
    let sorted = [...cMap.values()].sort((a, b) => {
      const sc = SALES_STATE[sortColKey], sd = SALES_STATE[sortDirKey] === 'asc' ? 1 : -1;
      const av = sc === 'sply' ? sMap.get(a.name) || 0 : sc === 'var' ? a.value - (sMap.get(a.name) || 0) : a.value;
      const bv = sc === 'sply' ? sMap.get(b.name) || 0 : sc === 'var' ? b.value - (sMap.get(b.name) || 0) : b.value;
      return (bv - av) * sd;
    });
    if (q) sorted = sorted.filter(c => c.name.toLowerCase().includes(q));

    const grandC    = sorted.reduce((s, r) => s + r.value, 0);
    const grandSVal = sorted.reduce((s, r) => s + (sMap.get(r.name) || 0), 0);

    function thdp(col, lbl) {
      const arrow = SALES_STATE[sortColKey] === col ? (SALES_STATE[sortDirKey] === 'desc' ? '↓' : '↑') : '⇅';
      return `<th class="sp-num" style="cursor:pointer;font-size:11px"
        onclick="dpTableSort('${sortColKey}','${sortDirKey}','${col}')">
        ${lbl} ${arrow}</th>`;
    }
    function drow(name, c, s, isTot = false) {
      const v = c - s, pct = s ? v / Math.abs(s) : null, share = grandC ? c / grandC : 0;
      const cls = v > 0 ? 'sp-pos' : v < 0 ? 'sp-neg' : '';
      return `<tr${isTot ? ' class="sp-total"' : ''}>
        <td class="sp-lbl" style="font-size:12px">${_escH(name)}</td>
        <td class="sp-num">${_fmtAmtDP(c)}</td>
        <td class="sp-num">${s ? _fmtAmtDP(s) : '—'}</td>
        <td class="sp-num ${cls}">${_fmtAmtDP(v)}</td>
        <td class="sp-num ${cls}">${pct != null ? FMT.pct(pct) : '—'}</td>
        <td class="sp-num">${FMT.pct(share)}</td>
      </tr>`;
    }

    return `
      <div class="sp-section-title" style="margin:16px 0 8px;color:${color}">${_escH(title)}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
        <div class="search-box" style="max-width:220px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search…" value="${_escH(q)}"
            oninput="SALES_STATE.${searchKey}=this.value;renderSalesDashboard()" style="font-size:11px">
        </div>
      </div>
      <div class="sp-table-wrap"><table class="sp-table">
      <thead><tr>
        <th class="sp-lbl">Client</th>
        ${thdp('curr', currLabel)}${thdp('sply', splyLabel)}${thdp('var', 'Variance')}
        <th class="sp-num" style="font-size:11px">Var %</th>
        <th class="sp-num" style="font-size:11px">Share %</th>
      </tr></thead><tbody>
      ${sorted.map(c => drow(c.name, c.value, sMap.get(c.name) || 0)).join('')}
      ${drow('Total', grandC, grandSVal, true)}
      </tbody></table></div>`;
  }

  const viewToggle = `
    <div style="display:flex;gap:6px;margin-bottom:14px;align-items:center">
      <span style="font-size:11px;color:var(--text-muted);margin-right:4px">View:</span>
      ${['all', 'issuance', 'processing'].map(v => `
        <button class="sp-btn${SALES_STATE.dpViewMode === v ? ' sp-btn-active' : ''}"
          style="padding:4px 9px;font-size:11px"
          onclick="SALES_STATE.dpViewMode='${v}';renderSalesDashboard()">
          ${v.charAt(0).toUpperCase() + v.slice(1)}</button>`).join('')}
    </div>`;

  return `<div>${viewToggle}
    ${buildTable(banks,    banksSply,    'Banks',    'dpBankSearch',    'dpBankSortCol',    'dpBankSortDir',    '#2563eb')}
    <div style="height:20px"></div>
    ${buildTable(fintechs, fintechsSply, 'Fintechs', 'dpFintechSearch', 'dpFintechSortCol', 'dpFintechSortDir', '#0d9488')}
  </div>`;
}

// ── DP Section HTML ───────────────────────────────────────────
/**
 * Build the full modupay DP HTML section.
 * Called by renderSalesDashboard() in sales-dashboard.js.
 */
function renderDPSalesSection(dpCurr, dpSply, dpAllRows, currLabel, splyLabel, ccy) {
  const dpTotal     = dpCurr.reduce((s, r) => s + _valDP(r), 0);
  const dpSplyTotal = dpSply.reduce((s, r) => s + _valDP(r), 0);
  const dpVar       = dpTotal - dpSplyTotal;
  const dpVarPct    = dpSplyTotal ? dpVar / Math.abs(dpSplyTotal) : null;
  const dpClients   = new Set(dpCurr.map(r => r.code)).size;

  // Budget revenue KPI (DP budget revenues are in USD)
  const { year, month } = STATE.filters;
  let dpBudgetKpi = '';
  if (typeof getBudgetRevenues === 'function') {
    const bud = getBudgetRevenues('mdp', year, month);
    if (bud.totalUSD > 0) {
      // _valDP in USD mode returns USD, in EGP mode returns EGP
      // Budget is in USD; match the display currency
      const budVal = STATE.usdMode ? bud.totalUSD : bud.totalUSD * BUDGET_FX_RATE;
      const varBud = dpTotal - budVal;
      const varBudPct = budVal ? varBud / Math.abs(budVal) : null;
      dpBudgetKpi = `
        ${_kpi('Budget', _fmtDP(budVal))}
        ${_kpi('Var to Budget', _fmtDP(varBud), varBudPct != null ? FMT.pct(varBudPct) : '', varBud >= 0 ? ' sp-pos' : ' sp-neg')}`;
    }
  }

  const dpAllPeriodKeys = _buildPeriodKeys(dpAllRows, SALES_STATE.dpTrendPeriod);
  const dpSliderMax     = Math.max(dpAllPeriodKeys.length, 6);
  SALES_STATE.dpTrendSlider = Math.min(SALES_STATE.dpTrendSlider, dpSliderMax);

  return {
    html: `
    <div class="entity-sales-section">
      <div class="entity-sales-header">
        <div class="entity-sales-title">modupay DP</div>
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${ccy}</span>
      </div>
      <div class="sales-kpi-strip" style="margin-bottom:16px">
        ${_kpi(currLabel, _fmtDP(dpTotal))}
        ${_kpi(splyLabel, _fmtDP(dpSplyTotal))}
        ${_kpi('Variance to LY', _fmtDP(dpVar), dpVarPct != null ? FMT.pct(dpVarPct) : '', dpVar >= 0 ? ' sp-pos' : ' sp-neg')}
        ${dpBudgetKpi}
        ${_kpi('Clients', String(dpClients))}
      </div>

      <div class="sales-charts-grid" style="margin-bottom:16px">
        <div class="sales-chart-card sales-chart-wide" style="height:340px">
          <div class="sales-chart-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <span>DP Revenue Trend — Processing / Issuance</span>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${_mkDPTypeToggle(SALES_STATE.dpTrendType)}
              <div style="width:1px;height:16px;background:var(--border)"></div>
              ${_mkPeriodToggle('dpTrendPeriod', SALES_STATE.dpTrendPeriod)}
              ${_mkSlider('dpTrendSlider', dpSliderMax, SALES_STATE.dpTrendSlider, 'Show')}
            </div>
          </div>
          <div style="height:270px;position:relative"><canvas id="dp-trend"></canvas></div>
        </div>
      </div>

      <div class="sales-table-card" style="margin-bottom:16px">
        ${_renderDPCategorizationTable(dpCurr, dpSply, currLabel, splyLabel)}
      </div>

      <div class="sales-charts-grid" style="margin-bottom:16px">
        <div class="sales-chart-card" style="height:280px">
          <div class="sales-chart-title">By Category (Issuance vs Processing)</div>
          <div style="height:230px;position:relative"><canvas id="dp-cat"></canvas></div>
        </div>
        <div class="sales-chart-card" style="height:280px">
          <div class="sales-chart-title">Local vs Export</div>
          <div style="height:230px;position:relative"><canvas id="dp-locexp"></canvas></div>
        </div>
        <div class="sales-chart-card" style="height:300px">
          <div class="sales-chart-title">By Region</div>
          <div style="height:255px;position:relative"><canvas id="dp-region"></canvas></div>
        </div>
        <div class="sales-chart-card" style="height:300px">
          <div class="sales-chart-title">By Account Manager</div>
          <div style="height:255px;position:relative"><canvas id="dp-am"></canvas></div>
        </div>
      </div>

      <div class="sales-table-card">
        ${_renderDPClientTables(dpCurr, dpSply, currLabel, splyLabel)}
      </div>
    </div>`,
    dpAllRows,
    dpCurr,
    dpSliderMax,
  };
}

/** Draw all DP charts — call inside requestAnimationFrame after HTML is in DOM */
function drawDPCharts(dpCurr, dpAllRows) {
  _drawDPStackedTrend('dp-trend', dpAllRows, SALES_STATE.dpTrendPeriod, SALES_STATE.dpTrendSlider, SALES_STATE.dpTrendType);

  const dpIssuanceTotal   = dpCurr.filter(r =>  DP_ISSUANCE_CATS.has(r.categorization) ||  DP_ISSUANCE_CATS.has(r.mainCategory)).reduce((s, r) => s + _valDP(r), 0);
  const dpProcessingTotal = dpCurr.filter(r => !DP_ISSUANCE_CATS.has(r.categorization) && !DP_ISSUANCE_CATS.has(r.mainCategory)).reduce((s, r) => s + _valDP(r), 0);
  _drawDoughnut('dp-cat', ['Issuance', 'Processing'], [dpIssuanceTotal, dpProcessingTotal], ['#2563eb', '#0d9488']);

  const dpLocal  = dpCurr.filter(r => r.jurisdiction === 'Local').reduce((s, r) => s + _valDP(r), 0);
  const dpExport = dpCurr.filter(r => r.jurisdiction && r.jurisdiction !== 'Local').reduce((s, r) => s + _valDP(r), 0);
  const dpOtherJ = dpCurr.filter(r => !r.jurisdiction).reduce((s, r) => s + _valDP(r), 0);
  const dpLEL = ['Local', 'Export'], dpLEV = [dpLocal, dpExport];
  if (dpOtherJ > 0) { dpLEL.push('Other'); dpLEV.push(dpOtherJ); }
  _drawDoughnut('dp-locexp', dpLEL, dpLEV, PALETTE_LOCAL_EXPORT);

  const dpByReg = _groupSum(dpCurr, r => r.mainRegion || 'Unknown', _valDP);
  _drawHBar('dp-region', dpByReg.slice(0, 10).map(c => c.key), dpByReg.slice(0, 10).map(c => c.value), '#0d9488', _fmtDP);

  const dpByAM = _groupSum(dpCurr, r => r.accountManager || 'Unassigned', _valDP);
  _drawHBar('dp-am', dpByAM.slice(0, 8).map(c => c.key), dpByAM.slice(0, 8).map(c => c.value), '#14b8a6', _fmtDP);
}
