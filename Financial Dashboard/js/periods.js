'use strict';
/* ============================================================
   PERIODS.JS — Period computation: YTD, standalone, SPLY, SPLM
   ============================================================ */

// ── Period label builder ──────────────────────────────────────
function buildPeriodLabels(year, month) {
  const y   = parseInt(year);
  const m   = parseInt(month);
  if (!y || !m) return {};
  const fullName  = MONTH_FULL[m]  || '';
  const shortName = MONTH_NAMES[m] || '';

  return {
    ytd:        `YTD ${shortName} ${y}`,
    standalone: `${fullName} ${y}`,
    splm:       `${fullName} ${y - 1}`,
    ytdBudget:  `YTD ${shortName} ${y} Budget`,
    sply:       `YTD ${shortName} ${y - 1} LY`,
    varBud:     'Var to BUD (+/-)',
    varBudPct:  'Var to BUD (%)',
    varLY:      'Var to LY (+/-)',
    varLYPct:   'LY Var %',
  };
}

// ── Filter rows for a given period ────────────────────────────
function getPeriodRows(rows, periodKey, filters) {
  const y = parseInt(filters.year);
  const m = parseInt(filters.month);
  if (!y || !m) return [];

  switch (periodKey) {
    case 'ytd':
      return rows.filter(r => r.year === y && r.month >= 1 && r.month <= m);

    case 'standalone':
      return rows.filter(r => r.year === y && r.month === m);

    case 'splm':
      return rows.filter(r => r.year === (y - 1) && r.month === m);

    case 'ytdBudget':
      return [];   // empty until budget data source is defined

    case 'sply':
      return rows.filter(r => r.year === (y - 1) && r.month >= 1 && r.month <= m);

    default:
      return [];
  }
}

// ── Discover available years and months from loaded data ──────
function discoverPeriods() {
  const years  = new Set();
  const months = new Set();

  for (const row of STATE.tbRows) {
    if (row.year)  years.add(row.year);
    if (row.month) months.add(row.month);
  }
  for (const row of STATE.opexRows) {
    if (row.year)  years.add(row.year);
    if (row.month) months.add(row.month);
  }
  // Include years/months from Sales data so Sales-only years appear in the filter
  for (const row of (STATE.salesRows || [])) {
    if (row.year)  years.add(row.year);
    if (row.month) months.add(row.month);
  }

  return {
    years:  Array.from(years).sort((a, b) => a - b),
    months: Array.from(months).sort((a, b) => a - b),
  };
}

// ── Find the latest available month within a year ─────────────
function getLatestMonthInYear(year) {
  let maxMonth = 0;
  const y = parseInt(year);
  for (const row of STATE.tbRows) {
    if (row.year === y && row.month > maxMonth) maxMonth = row.month;
  }
  for (const row of STATE.opexRows) {
    if (row.year === y && row.month > maxMonth) maxMonth = row.month;
  }
  // Also check Sales rows so Sales-only years get correct latest month
  for (const row of (STATE.salesRows || [])) {
    if (row.year === y && row.month > maxMonth) maxMonth = row.month;
  }
  return maxMonth || 12;
}
