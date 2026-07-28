'use strict';
/* ============================================================
   SALES-DASHBOARD.JS — Orchestrator (replaces the old monolithic file)

   Load order in index.html:
     1. sales-shared.js          ← common state, helpers, chart utils
     2. sales-dashboard-mc.js    ← modupay Cards section + charts
     3. sales-dashboard-dp.js    ← modupay DP section + charts
     4. sales-dashboard.js       ← this file (renderSalesDashboard)

   Each entity file exposes:
     renderMCSalesSection(...)  → { html, mcAllRows, mcCurr, mcSliderMax }
     drawMCCharts(mcCurr, mcAllRows)
     renderDPSalesSection(...)  → { html, dpAllRows, dpCurr, dpSliderMax }
     drawDPCharts(dpCurr, dpAllRows)
   ============================================================ */

function renderSalesDashboard() {
  const container = document.getElementById('sales-container');
  if (!container) return;

  const rows = STATE.salesRows || [];
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No revenue data loaded</div></div>`;
    return;
  }

  const { year, month } = STATE.filters;
  const currLabel = _salesPeriodLabel(year || new Date().getFullYear(), month || 12, false);
  const splyLabel = _salesPeriodLabel(year || new Date().getFullYear(), month || 12, true);
  const ccy       = `(${_ccy()})`;

  // ── modupay Cards ─────────────────────────────────────────────
  const mcFolders  = ['modupay Cards', 'Masria Cards'];
  const { curr: mcCurrAll, sply: mcSplyAll } = _getSalesRows(mcFolders, year, month, { includeIntercompany: true });
  const mcCurr = mcCurrAll.filter(MC_FILTER);
  const mcSply = mcSplyAll.filter(MC_FILTER);
  const mcAllRows  = _getAllMonthlyRows(mcFolders, { includeIntercompany: true }).filter(MC_FILTER);

  const mcSection = renderMCSalesSection(mcCurr, mcSply, mcCurrAll, mcSplyAll, mcAllRows, currLabel, splyLabel, ccy);

  // ── modupay DP ────────────────────────────────────────────────
  const dpFolders = ['modupay DP', 'mdp'];
  const { curr: dpCurr, sply: dpSply } = _getSalesRows(dpFolders, year, month);
  const dpAllRows = _getAllMonthlyRows(dpFolders);

  const dpSection = renderDPSalesSection(dpCurr, dpSply, dpAllRows, currLabel, splyLabel, ccy);

  // ── Compose full page ─────────────────────────────────────────
  container.innerHTML = `<div class="sales-page">
    ${mcSection.html}
    <div class="entity-sales-divider"></div>
    ${dpSection.html}
  </div>`;

  // ── Draw all charts ───────────────────────────────────────────
  requestAnimationFrame(() => {
    drawMCCharts(mcSection.mcCurr, mcSection.mcAllRows);
    drawDPCharts(dpSection.dpCurr, dpSection.dpAllRows);
  });
}
