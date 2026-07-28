'use strict';
/* ============================================================
   CHART-PREFERENCES.JS — Chart prefs: load/save/sync CSS vars
   ============================================================ */

const DEFAULT_CHART_PREFS = {
  chartType:    'bar',
  colorScheme:  'default',
  showLegend:   true,
  showGrid:     true,
};

function loadChartPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem('pnl_chart_prefs') || 'null');
    STATE.chartPrefs = { ...DEFAULT_CHART_PREFS, ...(stored || {}) };
  } catch {
    STATE.chartPrefs = { ...DEFAULT_CHART_PREFS };
  }
}

function saveChartPrefs() {
  localStorage.setItem('pnl_chart_prefs', JSON.stringify(STATE.chartPrefs));
}

function applyChartPrefs() {
  // Sync Chart.js global defaults from prefs
  if (window.Chart) {
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  }
}
