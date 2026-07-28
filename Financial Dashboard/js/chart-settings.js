'use strict';
/* ============================================================
   CHART-SETTINGS.JS — Chart settings panel UI wiring
   ============================================================ */

function initChartSettings() {
  const btn   = document.getElementById('chart-settings-btn');
  const panel = document.getElementById('chart-settings-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
    }
  });
}
