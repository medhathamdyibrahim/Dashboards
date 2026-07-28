'use strict';
/* ============================================================
   SALES-DASHBOARD-MC.JS — modupay Cards sales dashboard
   Depends on: sales-shared.js
   ============================================================ */

// ── MC Stacked Bar Trend: Local / Export ──────────────────────
function _drawMCStackedTrend(id, allRows, period, sliderN, valFn) {
  const canvas = document.getElementById(id); if (!canvas) return;
  canvas.style.width = '100%'; canvas.style.height = '100%'; _destroyChart(id);
  valFn = valFn || _val;

  const allKeys = _buildPeriodKeys(allRows, period);
  const keys    = allKeys.slice(-sliderN);
  if (!keys.length) return;

  const localMap  = {}, exportMap = {}, splyMap = {};
  for (const r of allRows) {
    const k   = _periodKey(r, period);
    const seg = r.jurisdiction === 'Local' ? 'local' : 'export';
    if (seg === 'local') localMap[k]  = (localMap[k]  || 0) + valFn(r);
    else                 exportMap[k] = (exportMap[k] || 0) + valFn(r);
    // SPLY: push this row's value forward one year
    const fk = (() => {
      if (period === 'quarter') { const [y, q] = k.split('-'); return `${parseInt(y) + 1}-${q}`; }
      if (period === 'half')    { const [y, h] = k.split('-'); return `${parseInt(y) + 1}-${h}`; }
      const [y, mm] = k.split('-'); return `${parseInt(y) + 1}-${mm}`;
    })();
    splyMap[fk] = (splyMap[fk] || 0) + valFn(r);
  }

  const labels     = keys.map(k => _periodLabel(k, period));
  const localData  = keys.map(k => localMap[k]  || 0);
  const exportData = keys.map(k => exportMap[k] || 0);
  const splyData   = keys.map(k => splyMap[k]   || 0);
  const totalData  = keys.map((k, i) => localData[i] + exportData[i]);
  const hasSPLY    = splyData.some(v => v > 0);
  const fmt        = valFn === _valDP ? _fmtDP : _fmt;

  _salesCharts[id] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Local',  data: localData,  backgroundColor: '#2563eb',
          borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 3, bottomRight: 3 }, stack: 'curr', order: 2 },
        { label: 'Export', data: exportData, backgroundColor: '#f59e0b',
          borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 }, stack: 'curr', order: 2 },
        ...(hasSPLY ? [{ label: 'SPLY Total', data: splyData, type: 'line', fill: false,
          borderColor: '#94a3b8', borderDash: [5, 4], borderWidth: 1.5,
          pointRadius: 3, tension: 0.3, stack: undefined, order: 1 }] : []),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 280 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', align: 'end',
          labels: { color: _chartTxt(), font: { size: 10 }, boxWidth: 12, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'SPLY Total') return ` SPLY: ${fmt(ctx.parsed.y)}`;
              const total = totalData[ctx.dataIndex];
              const pct   = total ? (ctx.parsed.y / total * 100).toFixed(1) : 0;
              return ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)} (${pct}%)`;
            },
            footer: items => {
              const i = items[0]?.dataIndex; if (i == null) return '';
              return `Total: ${fmt(totalData[i])}`;
            },
          },
        },
      },
      scales: {
        x: { stacked: true, ticks: { color: _chartTxt(), font: { size: 9 }, maxRotation: 35 }, grid: { color: _chartGrid() } },
        y: { stacked: true, ticks: { color: _chartTxt(), font: { size: 10 }, callback: v => fmt(v) }, grid: { color: _chartGrid() } },
      },
    },
    plugins: [{ id: 'stackLabels', afterDatasetsDraw(chart) {
      const { ctx } = chart; ctx.save();
      const meta0 = chart.getDatasetMeta(0); // Local
      const meta1 = chart.getDatasetMeta(1); // Export
      meta0.data.forEach((bar, i) => {
        const total = totalData[i]; if (!total) return;
        const pctL  = (localData[i]  / total * 100).toFixed(0);
        const barH  = Math.abs(bar.base - bar.y);
        if (barH > 18 && localData[i] > 0) {
          ctx.fillStyle = '#fff'; ctx.font = '500 8px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${pctL}%`, bar.x, (bar.base + bar.y) / 2);
        }
        const topBar = meta1.data[i];
        ctx.fillStyle = _isDark() ? '#e2e8f0' : '#1e293b';
        ctx.font = '600 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(fmt(total), topBar.x, topBar.y - 3);
        const pctE  = (exportData[i] / total * 100).toFixed(0);
        const expH  = Math.abs(meta1.data[i].base - meta1.data[i].y);
        if (expH > 18 && exportData[i] > 0) {
          ctx.fillStyle = '#fff'; ctx.font = '500 8px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${pctE}%`, meta1.data[i].x, (meta1.data[i].base + meta1.data[i].y) / 2);
        }
      });
      ctx.restore();
    } }],
  });
}

// ── MC Revenue Breakdown Table ────────────────────────────────
function _renderMCBreakdownTable(curr, sply, currLabel, splyLabel) {
  const PRODUCTS = ['Cards', 'Perso', 'Others'];
  const SEGMENTS = ['Local', 'Export'];

  function seg(r)  { const j = (r.jurisdiction || '').trim(); return j && j !== 'Local' ? 'Export' : 'Local'; }
  function prod(r) {
    const cat = (r.categorization || '').trim();
    if (cat === 'Cards') return 'Cards';
    if (cat === 'Perso') return 'Perso';
    return 'Others';
  }
  function agg(rows) {
    const m = { Local: { Cards: { rev: 0, vol: 0 }, Perso: { rev: 0, vol: 0 }, Others: { rev: 0, vol: 0 } },
                Export: { Cards: { rev: 0, vol: 0 }, Perso: { rev: 0, vol: 0 }, Others: { rev: 0, vol: 0 } } };
    for (const r of rows) { const s = seg(r), p = prod(r); m[s][p].rev += _val(r); m[s][p].vol += (r.volume || 0); }
    return m;
  }

  const cAgg = agg(curr), sAgg = agg(sply);
  const grandCurr = curr.reduce((s, r) => s + _val(r), 0);

  function asp(rev, vol)  { return vol ? rev / vol : 0; }
  function varPct(c, s)   { return s ? (c - s) / Math.abs(s) : null; }
  function cell(v, is0 = false) { if (!v && is0) return '—'; return _fmtAmt(v); }
  function cellPct(v) {
    if (v == null) return '—';
    const c = v > 0 ? 'sp-pos' : v < 0 ? 'sp-neg' : '';
    return `<span class="${c}">${FMT.pct(v)}</span>`;
  }

  let h = `
    <div class="sp-section-title" style="margin:20px 0 10px">Revenue Breakdown — Local vs Export</div>
    <div class="sp-table-wrap"><table class="sp-table" style="font-size:11.5px">
    <thead>
      <tr>
        <th class="sp-lbl" rowspan="2" style="width:120px"></th>
        <th class="sp-num" colspan="4" style="border-bottom:1px solid var(--border)">${_escH(currLabel)}</th>
        <th class="sp-num" colspan="4" style="border-bottom:1px solid var(--border)">${_escH(splyLabel)}</th>
        <th class="sp-num" colspan="4" style="border-bottom:1px solid var(--border)">Variance to LY</th>
      </tr>
      <tr>
        <th class="sp-num">Revenue</th><th class="sp-num">%</th>
        <th class="sp-num">Volume</th><th class="sp-num">ASP</th>
        <th class="sp-num">Revenue</th><th class="sp-num">%</th>
        <th class="sp-num">Volume</th><th class="sp-num">ASP</th>
        <th class="sp-num">Revenue</th><th class="sp-num">Volume</th>
        <th class="sp-num">Rev %</th><th class="sp-num">Vol %</th>
      </tr>
    </thead><tbody>`;

  let grandVol = 0;
  for (const s of SEGMENTS) {
    const segCurr = curr.filter(r => seg(r) === s), segSply = sply.filter(r => seg(r) === s);
    const segRevC = segCurr.reduce((x, r) => x + _val(r), 0);
    const segRevS = segSply.reduce((x, r) => x + _val(r), 0);
    const segVolC = segCurr.reduce((x, r) => x + (r.volume || 0), 0);
    const segVolS = segSply.reduce((x, r) => x + (r.volume || 0), 0);
    grandVol += segVolC;

    h += `<tr class="pl-row-subtotal">
      <td class="sp-lbl" style="font-weight:700">${s}</td>
      <td class="sp-num">${cell(segRevC)}</td>
      <td class="sp-num">${grandCurr ? FMT.pct(segRevC / grandCurr) : '—'}</td>
      <td class="sp-num">${segVolC ? Math.round(segVolC).toLocaleString() : '—'}</td>
      <td class="sp-num">${cell(asp(segRevC, segVolC))}</td>
      <td class="sp-num">${cell(segRevS)}</td>
      <td class="sp-num">—</td>
      <td class="sp-num">${segVolS ? Math.round(segVolS).toLocaleString() : '—'}</td>
      <td class="sp-num">${cell(asp(segRevS, segVolS))}</td>
      <td class="sp-num ${(segRevC - segRevS) >= 0 ? 'sp-pos' : 'sp-neg'}">${cell(segRevC - segRevS)}</td>
      <td class="sp-num ${(segVolC - segVolS) >= 0 ? 'sp-pos' : 'sp-neg'}">${(segVolC - segVolS) ? Math.round(segVolC - segVolS).toLocaleString() : '—'}</td>
      <td class="sp-num">${cellPct(varPct(segRevC, segRevS))}</td>
      <td class="sp-num">${cellPct(varPct(segVolC, segVolS))}</td>
    </tr>`;

    for (const p of PRODUCTS) {
      const pc = cAgg[s][p], ps = sAgg[s][p];
      h += `<tr class="pl-row-data">
        <td class="sp-lbl" style="padding-left:24px">${p}</td>
        <td class="sp-num">${cell(pc.rev)}</td>
        <td class="sp-num">${grandCurr ? FMT.pct(pc.rev / grandCurr) : '—'}</td>
        <td class="sp-num">${pc.vol ? Math.round(pc.vol).toLocaleString() : '—'}</td>
        <td class="sp-num">${cell(asp(pc.rev, pc.vol))}</td>
        <td class="sp-num">${cell(ps.rev)}</td>
        <td class="sp-num">—</td>
        <td class="sp-num">${ps.vol ? Math.round(ps.vol).toLocaleString() : '—'}</td>
        <td class="sp-num">${cell(asp(ps.rev, ps.vol))}</td>
        <td class="sp-num ${(pc.rev - ps.rev) >= 0 ? 'sp-pos' : 'sp-neg'}">${cell(pc.rev - ps.rev)}</td>
        <td class="sp-num ${(pc.vol - ps.vol) >= 0 ? 'sp-pos' : 'sp-neg'}">${(pc.vol - ps.vol) ? Math.round(pc.vol - ps.vol).toLocaleString() : '—'}</td>
        <td class="sp-num">${cellPct(varPct(pc.rev, ps.rev))}</td>
        <td class="sp-num">${cellPct(varPct(pc.vol, ps.vol))}</td>
      </tr>`;
    }
  }

  const totS = sply.reduce((x, r) => x + _val(r), 0);
  const totVolS = sply.reduce((x, r) => x + (r.volume || 0), 0);
  h += `<tr class="sp-total">
    <td class="sp-lbl">Total</td>
    <td class="sp-num">${cell(grandCurr)}</td><td class="sp-num">100%</td>
    <td class="sp-num">${grandVol ? Math.round(grandVol).toLocaleString() : '—'}</td>
    <td class="sp-num">${cell(asp(grandCurr, grandVol))}</td>
    <td class="sp-num">${cell(totS)}</td><td class="sp-num">100%</td>
    <td class="sp-num">${totVolS ? Math.round(totVolS).toLocaleString() : '—'}</td>
    <td class="sp-num">${cell(asp(totS, totVolS))}</td>
    <td class="sp-num ${(grandCurr - totS) >= 0 ? 'sp-pos' : 'sp-neg'}">${cell(grandCurr - totS)}</td>
    <td class="sp-num ${(grandVol - totVolS) >= 0 ? 'sp-pos' : 'sp-neg'}">${(grandVol - totVolS) ? Math.round(grandVol - totVolS).toLocaleString() : '—'}</td>
    <td class="sp-num">${cellPct(varPct(grandCurr, totS))}</td>
    <td class="sp-num">${cellPct(varPct(grandVol, totVolS))}</td>
  </tr>`;
  h += `</tbody></table></div>`;
  return h;
}

// ── MC Top-20 client table ────────────────────────────────────
function _renderMCClientTable(curr, sply, currLabel, splyLabel) {
  const cMap = new Map(), sMap = new Map();
  for (const r of curr) {
    const k = r.shortName || String(r.code);
    if (!cMap.has(k)) cMap.set(k, { name: k, value: 0, vol: 0, region: r.mainRegion || '' });
    const e = cMap.get(k); e.value += _val(r); e.vol += (r.volume || 0);
  }
  for (const r of sply) { const k = r.shortName || String(r.code); sMap.set(k, (sMap.get(k) || 0) + _val(r)); }

  let sorted = [...cMap.values()].sort((a, b) => {
    const col = SALES_STATE.mcSortCol, dir = SALES_STATE.mcSortDir === 'asc' ? 1 : -1;
    const av  = col === 'sply' ? sMap.get(a.name) || 0 : col === 'var' ? a.value - (sMap.get(a.name) || 0) : a.value;
    const bv  = col === 'sply' ? sMap.get(b.name) || 0 : col === 'var' ? b.value - (sMap.get(b.name) || 0) : b.value;
    return (bv - av) * dir;
  });

  const q = SALES_STATE.mcSearch.trim().toLowerCase();
  if (q) sorted = sorted.filter(c => c.name.toLowerCase().includes(q));

  const top20 = sorted.slice(0, 20), others = sorted.slice(20);
  const grandC = sorted.reduce((s, r) => s + r.value, 0);
  const grandS = [...sMap.values()].reduce((s, v) => s + v, 0);

  function th(col, lbl) {
    const arrow = SALES_STATE.mcSortCol === col ? (SALES_STATE.mcSortDir === 'desc' ? '↓' : '↑') : '⇅';
    return `<th class="sp-num" style="cursor:pointer" onclick="mcTableSort('${col}')">${lbl} ${arrow}</th>`;
  }
  function trow(name, c, s, region = '', isTot = false) {
    const v = c - s, pct = s ? v / Math.abs(s) : null, share = grandC ? c / grandC : 0;
    const cls = v > 0 ? 'sp-pos' : v < 0 ? 'sp-neg' : '';
    return `<tr${isTot ? ' class="sp-total"' : ''}>
      <td class="sp-lbl">${_escH(name)}</td>
      <td class="sp-lbl" style="font-size:11px;color:var(--text-muted)">${_escH(region)}</td>
      <td class="sp-num">${_fmtAmt(c)}</td>
      <td class="sp-num">${s ? _fmtAmt(s) : '—'}</td>
      <td class="sp-num ${cls}">${_fmtAmt(v)}</td>
      <td class="sp-num ${cls}">${pct != null ? FMT.pct(pct) : '—'}</td>
      <td class="sp-num">${FMT.pct(share)}</td>
    </tr>`;
  }

  let html = `
    <div class="sp-section-title" style="margin:20px 0 10px">Top 20 Clients</div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
      <div class="search-box" style="max-width:260px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search clients…" value="${_escH(q)}"
          oninput="SALES_STATE.mcSearch=this.value;renderSalesDashboard()" style="font-size:12px">
      </div>
    </div>
    <div class="sp-table-wrap"><table class="sp-table">
    <thead><tr>
      <th class="sp-lbl">Client</th>
      <th class="sp-lbl" style="width:80px">Region</th>
      ${th('curr', currLabel)}${th('sply', splyLabel)}${th('var', 'Variance')}
      <th class="sp-num">Var %</th><th class="sp-num">Share %</th>
    </tr></thead><tbody>`;

  for (const c of top20) html += trow(c.name, c.value, sMap.get(c.name) || 0, c.region);

  if (others.length) {
    const othersC = others.reduce((s, r) => s + r.value, 0);
    const othersS = others.reduce((s, r) => s + (sMap.get(r.name) || 0), 0);
    html += `<tr class="pl-row-subtotal" style="cursor:pointer" onclick="toggleMCOthers()">
      <td class="sp-lbl" colspan="2">
        <span id="mc-others-icon">${SALES_STATE.mcOthersExpanded ? '−' : '+'}</span>
        Others (${others.length} more clients)
      </td>
      <td class="sp-num">${_fmtAmt(othersC)}</td>
      <td class="sp-num">${othersS ? _fmtAmt(othersS) : '—'}</td>
      <td class="sp-num ${(othersC - othersS) >= 0 ? 'sp-pos' : 'sp-neg'}">${_fmtAmt(othersC - othersS)}</td>
      <td class="sp-num">${othersS ? FMT.pct((othersC - othersS) / Math.abs(othersS)) : '—'}</td>
      <td class="sp-num">${FMT.pct(othersC / grandC)}</td>
    </tr>`;
    if (SALES_STATE.mcOthersExpanded) {
      for (const c of others) html += trow(c.name, c.value, sMap.get(c.name) || 0, c.region);
    }
  }
  html += trow('Grand Total', grandC, grandS, '', true);
  html += `</tbody></table></div>`;
  return html;
}

function toggleMCOthers() { SALES_STATE.mcOthersExpanded = !SALES_STATE.mcOthersExpanded; renderSalesDashboard(); }
function mcTableSort(col) {
  SALES_STATE.mcSortDir = (SALES_STATE.mcSortCol === col && SALES_STATE.mcSortDir === 'desc') ? 'asc' : 'desc';
  SALES_STATE.mcSortCol = col;
  renderSalesDashboard();
}

// ── MC Section HTML ───────────────────────────────────────────
/**
 * Build the full modupay Cards HTML section.
 * Called by renderSalesDashboard() in sales-dashboard.js.
 */
function renderMCSalesSection(mcCurr, mcSply, mcCurrAll, mcSplyAll, mcAllRows, currLabel, splyLabel, ccy) {
  const mcTotal     = mcCurrAll.reduce((s, r) => s + _val(r), 0);
  const mcSplyTotal = mcSplyAll.reduce((s, r) => s + _val(r), 0);
  const mcVar       = mcTotal - mcSplyTotal;
  const mcVarPct    = mcSplyTotal ? mcVar / Math.abs(mcSplyTotal) : null;
  const mcClients   = new Set(mcCurrAll.map(r => r.code)).size;
  const mcCardsVol  = mcCurr.filter(r => r.categorization === 'Cards').reduce((s, r) => s + (r.volume || 0), 0);
  const mcPersoVol  = mcCurr.filter(r => r.categorization === 'Perso').reduce((s, r) => s + (r.volume || 0), 0);

  // Budget revenue KPI
  const { year, month } = STATE.filters;
  let budgetKpi = '';
  if (typeof getBudgetRevenues === 'function') {
    const bud = getBudgetRevenues('Masria Cards', year, month);
    if (bud.totalUSD > 0) {
      const budVal = STATE.usdMode ? bud.totalUSD : bud.totalUSD * BUDGET_FX_RATE;
      const varBud = mcTotal - budVal;
      const varBudPct = budVal ? varBud / Math.abs(budVal) : null;
      budgetKpi = `
        ${_kpi('Budget', _fmt(budVal))}
        ${_kpi('Var to Budget', _fmt(varBud), varBudPct != null ? FMT.pct(varBudPct) : '', varBud >= 0 ? ' sp-pos' : ' sp-neg')}`;
    }
  }

  const mcAllPeriodKeys = _buildPeriodKeys(mcAllRows, SALES_STATE.mcTrendPeriod);
  const mcSliderMax     = Math.max(mcAllPeriodKeys.length, 6);
  SALES_STATE.mcTrendSlider = Math.min(SALES_STATE.mcTrendSlider, mcSliderMax);

  return {
    html: `
    <div class="entity-sales-section">
      <div class="entity-sales-header">
        <div class="entity-sales-title">modupay Cards</div>
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${ccy}</span>
      </div>
      <div class="sales-kpi-strip" style="margin-bottom:16px">
        ${_kpi(currLabel, _fmt(mcTotal))}
        ${_kpi(splyLabel, _fmt(mcSplyTotal))}
        ${_kpi('Variance to LY', _fmt(mcVar), mcVarPct != null ? FMT.pct(mcVarPct) : '', mcVar >= 0 ? ' sp-pos' : ' sp-neg')}
        ${budgetKpi}
        ${_kpi('Cards Volume', _fmtMn(mcCardsVol), 'units')}
        ${_kpi('Perso Volume', _fmtMn(mcPersoVol), 'units')}
        ${_kpi('Clients', String(mcClients))}
      </div>

      <div class="sales-charts-grid" style="margin-bottom:16px">
        <div class="sales-chart-card sales-chart-wide" style="height:320px">
          <div class="sales-chart-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <span>Cards Revenue Trend — Local / Export</span>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${_mkPeriodToggle('mcTrendPeriod', SALES_STATE.mcTrendPeriod)}
              ${_mkSlider('mcTrendSlider', mcSliderMax, SALES_STATE.mcTrendSlider, 'Show')}
            </div>
          </div>
          <div style="height:260px;position:relative"><canvas id="mc-trend"></canvas></div>
        </div>
      </div>

      <div class="sales-table-card" style="margin-bottom:16px">
        ${_renderMCBreakdownTable(mcCurr, mcSply, currLabel, splyLabel)}
      </div>

      <div class="sales-charts-grid" style="margin-bottom:16px">
        <div class="sales-chart-card" style="height:280px">
          <div class="sales-chart-title">By Category</div>
          <div style="height:230px;position:relative"><canvas id="mc-cat"></canvas></div>
        </div>
        <div class="sales-chart-card" style="height:280px">
          <div class="sales-chart-title">Local vs Export</div>
          <div style="height:230px;position:relative"><canvas id="mc-locexp"></canvas></div>
        </div>
        <div class="sales-chart-card" style="height:300px">
          <div class="sales-chart-title">By Region</div>
          <div style="height:255px;position:relative"><canvas id="mc-region"></canvas></div>
        </div>
        <div class="sales-chart-card" style="height:300px">
          <div class="sales-chart-title">By Account Manager</div>
          <div style="height:255px;position:relative"><canvas id="mc-am"></canvas></div>
        </div>
      </div>

      <div class="sales-table-card">
        ${_renderMCClientTable(mcCurr, mcSply, currLabel, splyLabel)}
      </div>
    </div>`,
    mcAllRows,
    mcCurr,
    mcSliderMax,
  };
}

/** Draw all MC charts — call inside requestAnimationFrame after HTML is in DOM */
function drawMCCharts(mcCurr, mcAllRows) {
  _drawMCStackedTrend('mc-trend', mcAllRows, SALES_STATE.mcTrendPeriod, SALES_STATE.mcTrendSlider);

  const mcByCat = _groupSum(mcCurr, r => r.mainCategory || 'Unknown');
  _drawDoughnut('mc-cat', mcByCat.map(c => c.key), mcByCat.map(c => c.value), PALETTE_MULTI);

  const mcLocal  = mcCurr.filter(r => r.jurisdiction === 'Local').reduce((s, r) => s + _val(r), 0);
  const mcExport = mcCurr.filter(r => r.jurisdiction && r.jurisdiction !== 'Local').reduce((s, r) => s + _val(r), 0);
  const mcOtherJ = mcCurr.filter(r => !r.jurisdiction).reduce((s, r) => s + _val(r), 0);
  const mcLEL = ['Local', 'Export'], mcLEV = [mcLocal, mcExport];
  if (mcOtherJ > 0) { mcLEL.push('Other'); mcLEV.push(mcOtherJ); }
  _drawDoughnut('mc-locexp', mcLEL, mcLEV, PALETTE_LOCAL_EXPORT);

  const mcByReg = _groupSum(mcCurr, r => r.mainRegion || 'Unknown');
  _drawHBar('mc-region', mcByReg.slice(0, 10).map(c => c.key), mcByReg.slice(0, 10).map(c => c.value), '#2563eb');

  const mcByAM = _groupSum(mcCurr, r => r.accountManager || 'Unassigned');
  _drawHBar('mc-am', mcByAM.slice(0, 8).map(c => c.key), mcByAM.slice(0, 8).map(c => c.value), '#3b82f6');
}
