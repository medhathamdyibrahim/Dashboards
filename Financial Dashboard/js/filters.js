'use strict';
/* ============================================================
   FILTERS.JS — Filter bar UI, readFilters(), applyFilters()
   ============================================================ */

// ── Populate filter dropdowns from discovered data ─────────────
function populateFilters() {
  const { years, months } = discoverPeriods();

  const yearSel  = document.getElementById('filter-year');
  const monthSel = document.getElementById('filter-month');
  const entSel   = document.getElementById('filter-entity');

  if (!yearSel || !monthSel) return;

  // Years — latest first
  yearSel.innerHTML = '';
  for (const y of [...years].reverse()) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }

  // Months
  monthSel.innerHTML = '';
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = MONTH_FULL[m];
    monthSel.appendChild(opt);
  }

  // Entities
  if (entSel) {
    entSel.innerHTML = '<option value="">All Entities</option>';
    for (const ef of ENTITY_FOLDERS) {
      const opt      = document.createElement('option');
      opt.value      = ef;
      opt.textContent = MASTER.entity[ef]?.companyName || ef;
      entSel.appendChild(opt);
    }
  }

  // Auto-select latest year + its latest month
  const latestYear  = years[years.length - 1];
  const latestMonth = getLatestMonthInYear(latestYear);

  yearSel.value  = latestYear  || '';
  monthSel.value = latestMonth || 12;
  if (entSel) entSel.value = '';

  // Sync to STATE
  STATE.filters.year    = String(latestYear  || '');
  STATE.filters.month   = String(latestMonth || '');
  STATE.filters.company = '';

  updatePeriodBadge();
}

// ── Read current filter values from DOM ───────────────────────
function readFilters() {
  const yearSel  = document.getElementById('filter-year');
  const monthSel = document.getElementById('filter-month');
  const entSel   = document.getElementById('filter-entity');

  STATE.filters.year    = yearSel?.value  || '';
  STATE.filters.month   = monthSel?.value || '';
  STATE.filters.company = entSel?.value   || '';
}

// ── Apply filters: rebuild statements → re-render ─────────────
function applyFilters() {
  readFilters();
  updatePeriodBadge();
  buildAllStatements();
  renderAllEntities();
  renderKPIs();
  updateCharts();
  // Re-render sales dashboard if it is the active tab
  if (STATE.activeTab === 'sales' && typeof renderSalesDashboard === 'function') {
    renderSalesDashboard();
  }
  // Re-render ratios dashboard if it is the active tab
  if (STATE.activeTab === 'ratios' && typeof renderRatios === 'function') {
    renderRatios();
  }
}

// ── Update the period badge in the header ─────────────────────
function updatePeriodBadge() {
  const badge = document.getElementById('period-badge');
  if (!badge) return;
  const { year, month } = STATE.filters;
  if (!year || !month) { badge.textContent = '—'; return; }
  const lbl = buildPeriodLabels(year, month);
  badge.textContent = lbl.ytd || '';
}

// ── Wire up filter event listeners ────────────────────────────
function initFilters() {
  const yearSel  = document.getElementById('filter-year');
  const monthSel = document.getElementById('filter-month');
  const entSel   = document.getElementById('filter-entity');

  const handler = () => applyFilters();
  yearSel?.addEventListener('change', handler);
  monthSel?.addEventListener('change', handler);
  entSel?.addEventListener('change', handler);
}
