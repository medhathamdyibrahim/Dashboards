'use strict';
/* ============================================================
   RENDERER-BS.JS — Renders Balance Sheet table HTML per entity
   ============================================================ */

// ── Convert BS data to USD ─────────────────────────────────────
// Balance Sheet is a point-in-time snapshot, so:
//   current column → divide by that month's actual FX rate
//   prior column   → divide by Dec prior year FX rate
function _toBSUSD(bsData, year, month) {
  const y  = parseInt(year);
  const m  = parseInt(month);
  const fxCurr = getFXRate(y,     m)      || null;
  const fxPrev = getFXRate(y - 1, 12)    || null;

  function cvt(val, fx) { return (fx && val != null) ? val / fx : val; }

  const sections = bsData.sections.map(sec => {
    let totalCurrent = 0, totalPrior = 0;
    const lines = sec.lines.map(line => {
      const c = cvt(line.current, fxCurr);
      const p = cvt(line.prior,   fxPrev);
      totalCurrent += c;
      totalPrior   += p;
      return { ...line, current: c, prior: p,
               var: c - p,
               varPct: p ? (c - p) / Math.abs(p) : null };
    });
    const stVar = totalCurrent - totalPrior;
    return { ...sec, lines, totalCurrent, totalPrior };
  });

  const assetSec  = sections.filter(s => s.isAsset);
  const eqLiabSec = sections.filter(s => !s.isAsset);
  return {
    ...bsData,
    sections,
    totalAssets:   assetSec.reduce((s,x)  => s + x.totalCurrent, 0),
    totalEqLiab:   eqLiabSec.reduce((s,x) => s + x.totalCurrent, 0),
    totalAssetsPY: assetSec.reduce((s,x)  => s + x.totalPrior,   0),
    totalEqLiabPY: eqLiabSec.reduce((s,x) => s + x.totalPrior,   0),
    balanceCheck:  bsData.balanceCheck,   // preserve EGP balance flag
  };
}

// ── Render BS table ────────────────────────────────────────────
function renderBSTable(bsData, year, month) {
  // Apply USD conversion if toggle is on
  if (STATE.usdMode && typeof getFXRate === 'function') {
    bsData = _toBSUSD(bsData, year, month);
  }
  const y = parseInt(year);
  const m = parseInt(month);
  const lblCurr = `${MONTH_NAMES[m] || ''} ${y}`;
  const lblPrev = `31-12-${y - 1}`;

  // Balance check badge
  const checkBadge = bsData.balanceCheck
    ? `<span class="bs-balance-check bs-balanced">✓ Balanced</span>`
    : `<span class="bs-balance-check bs-not-balanced">✕ Out of Balance</span>`;

  let html = `
<div class="stmt-table-wrap">
<table class="stmt-table">
<thead>
  <tr>
    <th style="min-width:220px">Line Item ${checkBadge}</th>
    <th class="stmt-amount">${escHtml(lblCurr)}</th>
    <th class="stmt-amount">${escHtml(lblPrev)}</th>
    <th class="stmt-amount">Var (+/-)</th>
    <th class="stmt-amount">Var (%)</th>
  </tr>
</thead>
<tbody>`;

  let assetsDone = false;

  for (const section of bsData.sections) {
    // Insert "Total Assets" row after Current Assets section
    if (!assetsDone && !section.isAsset) {
      html += renderBSTotalRow('Total Assets', bsData.totalAssets, bsData.totalAssetsPY, true);
      assetsDone = true;
    }

    // Section header
    html += `<tr class="bs-section-row"><td colspan="5">${escHtml(section.label)}</td></tr>`;

    // Detail lines
    for (const line of section.lines) {
      const varVal  = line.var;
      const varPct  = line.varPct;
      const varCls  = varVal > 0 ? 'var-green' : varVal < 0 ? 'var-red' : 'var-neutral';

      html += `<tr class="pl-row-data pl-indent-1">
  <td>${escHtml(line.label)}</td>
  <td class="stmt-amount">${FMT.amount(line.current)}</td>
  <td class="stmt-amount">${FMT.amount(line.prior)}</td>
  <td class="stmt-amount ${varCls}">${FMT.amount(varVal)}</td>
  <td class="stmt-pct ${varCls}">${FMT.pct(varPct)}</td>
</tr>`;
    }

    // Section total
    const stVar    = section.totalCurrent - section.totalPrior;
    const stVarPct = section.totalPrior ? stVar / Math.abs(section.totalPrior) : null;
    const stCls    = stVar > 0 ? 'var-green' : stVar < 0 ? 'var-red' : 'var-neutral';

    html += `<tr class="bs-section-total-row">
  <td>Total ${escHtml(section.label)}</td>
  <td class="stmt-amount">${FMT.amount(section.totalCurrent)}</td>
  <td class="stmt-amount">${FMT.amount(section.totalPrior)}</td>
  <td class="stmt-amount ${stCls}">${FMT.amount(stVar)}</td>
  <td class="stmt-pct ${stCls}">${FMT.pct(stVarPct)}</td>
</tr>`;
  }

  // Total Equity & Liabilities
  html += renderBSTotalRow('Total Equity & Liabilities', bsData.totalEqLiab, bsData.totalEqLiabPY, true);

  html += '</tbody></table></div>';
  return html;
}

// ── Render a grand-total row ───────────────────────────────────
function renderBSTotalRow(label, current, prior, grand = false) {
  const varVal  = current - prior;
  const varPct  = prior ? varVal / Math.abs(prior) : null;
  const varCls  = varVal > 0 ? 'var-green' : varVal < 0 ? 'var-red' : 'var-neutral';
  const rowClass = grand ? 'bs-grand-total-row' : 'bs-section-total-row';

  return `<tr class="${rowClass}">
  <td>${escHtml(label)}</td>
  <td class="stmt-amount">${FMT.amount(current)}</td>
  <td class="stmt-amount">${FMT.amount(prior)}</td>
  <td class="stmt-amount ${varCls}">${FMT.amount(varVal)}</td>
  <td class="stmt-pct ${varCls}">${FMT.pct(varPct)}</td>
</tr>`;
}
