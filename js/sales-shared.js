'use strict';
/* ============================================================
   SALES-SHARED.JS — Common helpers for modupay Cards & DP sales dashboards
   Used by: sales-dashboard-mc.js and sales-dashboard-dp.js
   ============================================================ */

// ── Folder aliases ─────────────────────────────────────────────
const _SALES_FOLDER_MAP = { 'Masria Cards': 'modupay Cards', 'mdp': 'modupay DP' };

// ── Product classification ────────────────────────────────────
const MC_ISSUANCE_PRODUCTS = new Set(['Cards', 'Perso', 'Card', 'Personalization', 'Personalisation']);
const MC_FILTER   = r => r.mainCategory === 'Issuance' || r.mainCategory === 'Others'
                      || MC_ISSUANCE_PRODUCTS.has(r.productType);
const IS_ISSUANCE = r => r.mainCategory === 'Issuance' || MC_ISSUANCE_PRODUCTS.has(r.productType);

const DP_ISSUANCE_CATS = new Set([
  'Issuance (Cards + Perso)', 'Issuance', 'Cards', 'Perso',
  'Card', 'Personalization', 'Personalisation',
]);

// ── Shared UI state ───────────────────────────────────────────
const SALES_STATE = {
  sortCol: 'curr', sortDir: 'desc',
  // MC state
  mcOthersExpanded: false,
  mcSearch: '', mcSortCol: 'curr', mcSortDir: 'desc',
  mcTrendPeriod: 'month',   // 'month' | 'quarter' | 'half'
  mcTrendSlider: 12,
  // DP state
  dpBankSearch: '', dpFintechSearch: '',
  dpBankSortCol: 'curr',    dpBankSortDir: 'desc',
  dpFintechSortCol: 'curr', dpFintechSortDir: 'desc',
  dpViewMode: 'all',        // 'all' | 'issuance' | 'processing'
  dpSelectedCats: new Set(),
  dpTrendCats: new Set(),
  dpTrendPeriod: 'month',
  dpTrendSlider: 12,
  dpTrendType: 'all',       // 'all' | 'processing' | 'issuance'
};

// ── Color palettes ────────────────────────────────────────────
const PALETTE_MULTI = [
  '#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#0f766e', '#9333ea', '#1e40af', '#065f46',
  '#c2410c', '#0369a1', '#4d7c0f', '#7e22ce', '#b45309',
];
const PALETTE_LOCAL_EXPORT = ['#2563eb', '#f59e0b', '#94a3b8'];

// ── Chart registry ────────────────────────────────────────────
const _salesCharts = {};

// ── Formatting helpers ────────────────────────────────────────
function _escH(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _salesPeriodLabel(year, month, isSPLY) {
  const y = parseInt(year), m = parseInt(month), yr = isSPLY ? y - 1 : y;
  if (m === 12) return `FY ${yr}`;
  if (m === 6)  return `H1 ${yr}`;
  if (m === 3)  return `Q1 ${yr}`;
  if (m === 9)  return `9M ${yr}`;
  return `YTD ${MONTH_NAMES[m] || m} ${yr}`;
}

function _ccy()        { return STATE.usdMode ? 'USD' : 'EGP'; }
function _fmt(v)       { return STATE.usdMode ? '$' + FMT.compact(v) : FMT.compact(v); }
function _fmtAmt(v)    { return STATE.usdMode ? '$' + FMT.amount(v)  : FMT.amount(v); }
function _fmtDP(v)     { return STATE.usdMode ? '$' + FMT.compact(v) : FMT.compact(v); }
function _fmtAmtDP(v)  { return STATE.usdMode ? '$' + FMT.amount(v)  : FMT.amount(v); }
function _fmtMn(v) {
  if (v == null || isNaN(v)) return '0.00 Mn';
  const abs = Math.abs(v) / 1e6;
  const s = `${abs.toFixed(2)} Mn`;
  return v < 0 ? `(${s})` : s;
}

// ── Value resolvers ───────────────────────────────────────────
// MC: data in EGP natively. USD mode = ÷ fxRate.
function _val(r) {
  const v = r.value || 0;
  if (!STATE.usdMode) return v;
  const rate = (Number.isFinite(r.fxRate) && r.fxRate > 0) ? r.fxRate : 1;
  return v / rate;
}

// DP: data in USD. EGP = value × fxRate. USD mode returns raw USD.
function _valDP(r) {
  const v = r.value || 0;
  if (STATE.usdMode) return v;
  const rate = (Number.isFinite(r.fxRate) && r.fxRate > 0) ? r.fxRate : 1;
  return v * rate;
}

// ── Row filtering helpers ─────────────────────────────────────
function _shouldExcludeIntercompanySales(options) {
  return !options?.includeIntercompany && !STATE.filters?.company;
}

function _salesEntityAllowed(entityFolder) {
  const selected = STATE.filters?.company || '';
  if (!selected) return true;
  if (selected === 'Masria Cards') return entityFolder === 'Masria Cards' || entityFolder === 'modupay Cards';
  if (selected === 'mdp') return entityFolder === 'mdp' || entityFolder === 'modupay DP';
  return true;
}

function _filterSalesRows(folderNames, options = {}) {
  const excludeIntercompany = _shouldExcludeIntercompanySales(options);
  return (STATE.salesRows || []).filter(r =>
    folderNames.includes(r.entityFolder) &&
    _salesEntityAllowed(r.entityFolder) &&
    (!excludeIntercompany || r.code !== 1001090)
  );
}

function _getSalesRows(folderNames, year, month, options = {}) {
  const f = _filterSalesRows(folderNames, options);
  const y = parseInt(year), m = parseInt(month);
  if (y && m) return {
    curr: f.filter(r => r.year === y     && r.month >= 1 && r.month <= m),
    sply: f.filter(r => r.year === y - 1 && r.month >= 1 && r.month <= m),
  };
  return { curr: f, sply: [] };
}

function _getTTMRows(folderNames, year, month, options = {}) {
  const f = _filterSalesRows(folderNames, options);
  const y = parseInt(year), m = parseInt(month);
  if (!y || !m) return { ttm: f, ttmPrev: [], ttmMonths: [] };
  const ttmMonths = [];
  for (let i = 11; i >= 0; i--) {
    let mo = m - i, yr = y;
    if (mo <= 0) { mo += 12; yr -= 1; }
    ttmMonths.push({ yr, mo });
  }
  const ttm     = f.filter(r => ttmMonths.some(t => t.yr === r.year && t.mo === r.month));
  const ttmPrev = f.filter(r => ttmMonths.some(t => t.yr - 1 === r.year && t.mo === r.month));
  return { ttm, ttmPrev, ttmMonths };
}

function _getAllMonthlyRows(folderNames, options = {}) {
  return _filterSalesRows(folderNames, options);
}

function _groupSum(rows, keyFn, valFn) {
  valFn = valFn || _val;
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r) || 'Unknown';
    map.set(k, (map.get(k) || 0) + valFn(r));
  }
  return [...map.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
}

function _kpi(lbl, val, sub = '', cls = '') {
  return `<div class="sales-kpi">
    <div class="sales-kpi-label">${_escH(lbl)}</div>
    <div class="sales-kpi-value${cls ? ' ' + cls : ''}">${val}</div>
    ${sub ? `<div class="sales-kpi-sub">${sub}</div>` : ''}
  </div>`;
}

// ── Period bucketing (for stacked bar charts) ─────────────────
function _periodKey(row, period) {
  const y = row.year, m = row.month;
  if (period === 'quarter') { const q = Math.ceil(m / 3); return `${y}-Q${q}`; }
  if (period === 'half')    { const h = m <= 6 ? 'H1' : 'H2'; return `${y}-${h}`; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function _periodLabel(key, period) {
  if (period === 'quarter') { const [y, q] = key.split('-'); return `${q} ${y}`; }
  if (period === 'half')    { const [y, h] = key.split('-'); return `${h} ${y}`; }
  const [y, mm] = key.split('-');
  return `${MONTH_NAMES[parseInt(mm)] || mm} ${y}`;
}

function _splyKey(key, period) {
  if (period === 'quarter') { const [y, q] = key.split('-'); return `${parseInt(y) - 1}-${q}`; }
  if (period === 'half')    { const [y, h] = key.split('-'); return `${parseInt(y) - 1}-${h}`; }
  const [y, mm] = key.split('-');
  return `${parseInt(y) - 1}-${mm}`;
}

function _buildPeriodKeys(rows, period) {
  const keys = new Set();
  for (const r of rows) keys.add(_periodKey(r, period));
  return [...keys].sort();
}

// ── Chart helpers ─────────────────────────────────────────────
function _isDark()    { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function _chartTxt()  { return _isDark() ? '#94a3b8' : '#64748b'; }
function _chartGrid() { return _isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; }
function _destroyChart(id) {
  if (_salesCharts[id]) { _salesCharts[id].destroy(); delete _salesCharts[id]; }
}

function _drawDoughnut(id, labels, values, colors) {
  const canvas = document.getElementById(id); if (!canvas) return;
  canvas.style.width = '100%'; canvas.style.height = '100%'; _destroyChart(id);
  const total = values.reduce((s, v) => s + v, 0);
  _salesCharts[id] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors || PALETTE_MULTI,
      borderWidth: 2, borderColor: _isDark() ? '#1e2130' : '#fff', hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '52%', animation: { duration: 280 },
      plugins: {
        legend: { display: true, position: 'bottom',
          labels: { color: _chartTxt(), font: { size: 10 }, boxWidth: 10, padding: 6,
            generateLabels: chart => chart.data.labels.map((l, i) => ({
              text: String(l).length > 16 ? String(l).slice(0, 15) + '…' : l,
              fillStyle: chart.data.datasets[0].backgroundColor[i], hidden: false, index: i,
            })) } },
        tooltip: { callbacks: { label: ctx => {
          const v = ctx.parsed, pct = total ? (v / total * 100).toFixed(1) : 0;
          return ` ${_fmt(v)}  (${pct}%)`;
        } } },
      },
    },
    plugins: [{ id: 'dlabels', afterDraw(chart) {
      const { ctx } = chart, meta = chart.getDatasetMeta(0); ctx.save();
      meta.data.forEach((arc, i) => {
        const v = values[i], pct = total ? v / total * 100 : 0; if (pct < 4) return;
        const mid = (arc.startAngle + arc.endAngle) / 2, r = (arc.innerRadius + arc.outerRadius) / 2;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${pct.toFixed(0)}%`, arc.x + r * Math.cos(mid), arc.y + r * Math.sin(mid));
      }); ctx.restore();
    } }],
  });
}

function _drawHBar(id, labels, values, color, valFmtFn) {
  const canvas = document.getElementById(id); if (!canvas) return;
  valFmtFn = valFmtFn || _fmt;
  canvas.style.width = '100%'; canvas.style.height = '100%'; _destroyChart(id);
  const maxVal = Math.max(...values, 1);
  _salesCharts[id] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4, borderSkipped: false }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 280 },
      layout: { padding: { right: 70 } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${valFmtFn(ctx.parsed.x)}` } } },
      scales: {
        x: { display: false, max: maxVal * 1.3, grid: { display: false }, ticks: { display: false } },
        y: { ticks: { color: _chartTxt(), font: { size: 10 },
          callback: (v, i) => { const s = String(labels[i] || ''); return s.length > 18 ? s.slice(0, 17) + '…' : s; } },
          grid: { display: false } },
      },
    },
    plugins: [{ id: 'hbl', afterDatasetDraw(chart) {
      const { ctx } = chart, meta = chart.getDatasetMeta(0); ctx.save();
      meta.data.forEach((bar, i) => {
        ctx.fillStyle = _isDark() ? '#e2e8f0' : '#1e293b'; ctx.font = '500 10px sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(valFmtFn(values[i]), bar.x + 6, bar.y);
      }); ctx.restore();
    } }],
  });
}

// ── Trend control HTML builders ───────────────────────────────
function _mkPeriodToggle(stateKey, currentVal) {
  const opts = [['month', 'Monthly'], ['quarter', 'Quarterly'], ['half', 'Half-Yearly']];
  return opts.map(([v, l]) => `
    <button class="sp-btn${currentVal === v ? ' sp-btn-active' : ''}"
      style="padding:4px 9px;font-size:11px"
      onclick="SALES_STATE.${stateKey}='${v}';renderSalesDashboard()">
      ${l}
    </button>`).join('');
}

function _mkSlider(stateKey, maxPeriods, currentVal, label) {
  const max = Math.max(maxPeriods, 6);
  const val = Math.min(currentVal, max);
  return `<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-muted)">
    <span>${label || 'Show'}</span>
    <input type="range" min="6" max="${max}" value="${val}"
      style="width:100px;accent-color:#2563eb"
      oninput="SALES_STATE.${stateKey}=parseInt(this.value);document.getElementById('${stateKey}-lbl').textContent=this.value;renderSalesDashboard()">
    <span id="${stateKey}-lbl">${val}</span>
    <span>periods</span>
  </div>`;
}

// ── Multi-select dropdown ─────────────────────────────────────
function salesDPDropdownToggle() {
  const d = document.getElementById('dp-cat-dropdown');
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}
function salesDPCatAll()  { SALES_STATE.dpSelectedCats.clear(); renderSalesDashboard(); }
function salesDPCatToggle(cat, checked) {
  checked ? SALES_STATE.dpSelectedCats.add(cat) : SALES_STATE.dpSelectedCats.delete(cat);
  renderSalesDashboard();
}
function salesDPTrendCatAll() { SALES_STATE.dpTrendCats.clear(); renderSalesDashboard(); }
function salesDPTrendCatToggle(cat, checked) {
  checked ? SALES_STATE.dpTrendCats.add(cat) : SALES_STATE.dpTrendCats.delete(cat);
  renderSalesDashboard();
}

document.addEventListener('click', e => {
  const btn = document.getElementById('dp-cat-btn'), dd = document.getElementById('dp-cat-dropdown');
  if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) dd.style.display = 'none';
});

function _mkMultiSelect(btnId, ddId, allDPCats, selectedSet, allFn, toggleFn) {
  const selCount = selectedSet.size;
  const btnLbl   = selCount === 0 ? 'All Categories' : `${selCount} selected`;
  return `<div style="position:relative;display:inline-block">
    <button class="sp-btn" id="${btnId}" onclick="salesDPDropdownToggle()"
      style="min-width:160px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;font-size:12px">
      <span>${_escH(btnLbl)}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div id="${ddId}" style="display:none;position:absolute;top:calc(100%+4px);left:0;z-index:200;
         background:var(--surface);border:1px solid var(--border);border-radius:8px;
         box-shadow:0 8px 24px rgba(0,0,0,.14);padding:6px 0;min-width:200px;max-height:280px;overflow-y:auto">
      <label style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border)">
        <input type="checkbox" ${selCount === 0 ? 'checked' : ''} onchange="${allFn}()">
        <strong>All Categories</strong>
      </label>
      ${allDPCats.map(c => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:12px">
          <input type="checkbox" value="${_escH(c)}" ${selectedSet.has(c) ? 'checked' : ''}
            onchange="${toggleFn}('${_escH(c)}',this.checked)">
          <span>${_escH(c)}</span>
        </label>`).join('')}
    </div>
  </div>`;
}

// ── Sort helpers ──────────────────────────────────────────────
function dpTableSort(colKey, dirKey, col) {
  SALES_STATE[dirKey] = (SALES_STATE[colKey] === col && SALES_STATE[dirKey] === 'desc') ? 'asc' : 'desc';
  SALES_STATE[colKey] = col;
  renderSalesDashboard();
}

// ── Compatibility ─────────────────────────────────────────────
function setSalesFilter(key, value) { STATE.salesFilters[key] = value; renderSalesDashboard(); }
