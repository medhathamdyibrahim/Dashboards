'use strict';
/* ============================================================
   RENDERER-PL.JS — P&L table with surgical collapse (no full rebuild)
   Toggle uses DOM manipulation only — no renderAllEntities() call
   ============================================================ */

const PL_COLLAPSED = { cogs: true, da: true, revMC: true, procRev: true, issRev: true, sm: true, ga: true, sga: true, dpSm: true, dpGa: true };

// ── Attach collapse listeners once ────────────────────────────
function initPLToggleListeners() {
  const container = document.getElementById('statements-container');
  if (!container || container._plInit) return;
  container._plInit = true;

  container.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-pl-toggle]');
    if (!btn) return;
    const group = btn.dataset.plToggle;
    PL_COLLAPSED[group] = !PL_COLLAPSED[group];
    _updatePLGroupDOM(group);
  });
}

// ── Surgical DOM update — only touch rows of this group ────────
function _updatePLGroupDOM(group) {
  // Update all toggle buttons for this group
  document.querySelectorAll(`[data-pl-toggle="${group}"]`).forEach(btn => {
    btn.textContent = PL_COLLAPSED[group] ? '+' : '−';
  });

  // Show/hide child rows
  document.querySelectorAll(`[data-pl-group="${group}"]`).forEach(row => {
    row.style.display = PL_COLLAPSED[group] ? 'none' : '';
  });
}

// ── Column headers ─────────────────────────────────────────────
function buildColumnHeaders(year, month) {
  const lbl = buildPeriodLabels(year, month);
  return [
    { key: 'label',      header: '',             type: 'label'    },
    { key: 'ytd',        header: lbl.ytd,         type: 'amount'   },
    { key: 'standalone', header: lbl.standalone,  type: 'amount'   },
    { key: 'splm',       header: lbl.splm,        type: 'amount'   },
    { key: 'ytdBudget',  header: lbl.ytdBudget,   type: 'amount'   },
    { key: 'sply',       header: lbl.sply,        type: 'amount'   },
    { key: 'varBud',     header: lbl.varBud,      type: 'variance' },
    { key: 'varBudPct',  header: lbl.varBudPct,   type: 'pct'      },
    { key: 'varLY',      header: lbl.varLY,       type: 'variance' },
    { key: 'varLYPct',   header: lbl.varLYPct,    type: 'pct'      },
  ];
}

// ── Row definitions ────────────────────────────────────────────
// toggleGroup: this row IS the toggle header
// childOf:     this row is a child (hidden when group collapsed)
function getMasriaPLRows() {
  return [
    { key: 'revenue', label: 'Revenue', type: 'data', indent: 0, isExp: false, toggleGroup: 'revMC' },
    { key: '_mcCards',  label: 'Cards',  type: 'data', indent: 1, isExp: false, childOf: 'revMC', _salesBreak: { entity:'MC', cat:'Cards'  } },
    { key: '_mcPerso',  label: 'Perso',  type: 'data', indent: 1, isExp: false, childOf: 'revMC', _salesBreak: { entity:'MC', cat:'Perso'  } },
    { key: '_mcOthers', label: 'Others', type: 'data', indent: 1, isExp: false, childOf: 'revMC', _salesBreak: { entity:'MC', cat:'Others' } },
    { key: 'cogs',              label: 'COGS',                          type: 'subtotal', indent: 0, isExp: true,  toggleGroup: 'cogs' },
    { key: 'consumptionCost',   label: 'Consumption Cost',              type: 'data',     indent: 1, isExp: true,  childOf: 'cogs' },
    { key: 'industrialPayroll', label: 'Industrial Payroll',            type: 'data',     indent: 1, isExp: true,  childOf: 'cogs' },
    { key: 'manufacturingCost', label: 'Manufacturing Cost',            type: 'data',     indent: 1, isExp: true,  childOf: 'cogs' },
    { key: 'sla',               label: 'SLA',                           type: 'data',     indent: 1, isExp: true,  childOf: 'cogs' },
    { key: '_sep1', type: 'spacer' },
    { key: 'grossProfit',       label: 'Gross Profit',                  type: 'subtotal', indent: 0, isExp: false },
    { key: 'gpm',               label: 'Gross Margin %',                type: 'margin',   indent: 1 },
    { key: '_sep2', type: 'spacer' },
    { key: 'sm', label: 'S&M', type: 'data', indent: 0, isExp: true, toggleGroup: 'sm' },
    { key: 'smPersonnel', label: 'Personnel (6030)', type: 'data', indent: 1, isExp: true, childOf: 'sm' },
    { key: 'smOther',     label: 'Other Expenses',   type: 'data', indent: 1, isExp: true, childOf: 'sm' },
    { key: 'ga', label: 'G&A', type: 'data', indent: 0, isExp: true, toggleGroup: 'ga' },
    { key: 'gaPersonnel', label: 'Personnel (6030)', type: 'data', indent: 1, isExp: true, childOf: 'ga' },
    { key: 'gaOther',     label: 'Other Expenses',   type: 'data', indent: 1, isExp: true, childOf: 'ga' },
    { key: '_sep3', type: 'spacer' },
    { key: 'ebitda',            label: 'EBITDA',                        type: 'subtotal', indent: 0, isExp: false },
    { key: 'ebitdaM',           label: 'EBITDA Margin %',               type: 'margin',   indent: 1 },
    { key: '_sep4', type: 'spacer' },
    { key: 'totalDA',           label: 'Depreciation & Amortization',   type: 'subtotal', indent: 0, isExp: true,  toggleGroup: 'da'  },
    { key: 'grossDA',           label: 'Gross D&A — Fixed Assets',      type: 'data',     indent: 1, isExp: true,  childOf: 'da'  },
    { key: 'rouDA',             label: 'Depreciation — Right of Use',   type: 'data',     indent: 1, isExp: true,  childOf: 'da'  },
    { key: 'rechargeSLA',       label: 'Recharge Masria/mdp SLA',       type: 'data',     indent: 1, isExp: false, childOf: 'da'  },
    { key: '_sep5', type: 'spacer' },
    { key: 'financialExpenses', label: 'Financial Expenses',            type: 'data',     indent: 0, isExp: true  },
    { key: 'leaseLiabInt',      label: 'Lease Liabilities Interest',    type: 'data',     indent: 0, isExp: true  },
    { key: 'creditInterest',    label: 'Credit Interest',               type: 'data',     indent: 0, isExp: false },
    { key: 'leaseBackcharge',   label: 'Lease Backcharge',              type: 'data',     indent: 0, isExp: true  },
    { key: 'otherIncome',       label: 'Other Income',                  type: 'data',     indent: 0, isExp: false },
    { key: 'capitalGain',       label: 'Capital Gain',                  type: 'data',     indent: 0, isExp: false },
    { key: 'provisions',        label: 'Provisions',                    type: 'data',     indent: 0, isExp: true  },
    { key: 'provisionsNLR',     label: 'Provisions No Longer Required', type: 'data',     indent: 0, isExp: false },
    { key: 'takaful',           label: "Takaful Contribution's",        type: 'data',     indent: 0, isExp: true  },
    { key: 'unrealizedFX',      label: 'Unrealized FX',                 type: 'data',     indent: 0, isExp: false },
    { key: 'realizedFX',        label: 'Realized FX',                   type: 'data',     indent: 0, isExp: false },
    { key: '_sep6', type: 'spacer' },
    { key: 'ebt',               label: 'EBT',                           type: 'subtotal', indent: 0, isExp: false },
    { key: 'ebtM',              label: 'EBT Margin %',                  type: 'margin',   indent: 1 },
    { key: 'incomeTax',         label: 'Income Tax',                    type: 'data',     indent: 1, isExp: true  },
    { key: 'deferredTax',       label: 'Deferred Tax',                  type: 'data',     indent: 1, isExp: true  },
    { key: 'netProfit',         label: 'Net Profit',                    type: 'total',    indent: 0, isExp: false },
    { key: 'netM',              label: 'Net Margin %',                  type: 'margin',   indent: 1 },
  ];
}

function getMdpPLRows() {
  return [
    { key: 'totalRevenues',         label: 'Total Revenues',                type: 'subtotal', indent: 0, isExp: false,
      deriveFn: d => (d.processingRevenues || 0) + (d.issuanceRevenues || 0) + (d.digitalRevenues || 0) },
    { key: '_sep0', type: 'spacer' },
    { key: 'processingRevenues', label: 'Processing Revenues', type: 'data', indent: 0, isExp: false, toggleGroup: 'procRev' },
    { key: '_dpAcctSetup',  label: 'Account Setup',              type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Account Setup' } },
    { key: '_dpTrxProc',    label: 'Trx Processing',             type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Trx Processing' } },
    { key: '_dpFraud',      label: 'Fraud',                      type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Fraud' } },
    { key: '_dpVAS',        label: 'VAS',                        type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'VAS' } },
    { key: '_dpHosting',    label: 'Hosting',                    type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Hosting' } },
    { key: '_dpRecurring',  label: 'Recurring Fees',             type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Recurring' } },
    { key: '_dp3DS',        label: '3DS',                        type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'3DS' } },
    { key: '_dpImpl',       label: 'Implementation/Setup/CRs',   type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Implementation' } },
    { key: '_dpDigital',    label: 'Digital & Data Products',    type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Digital' } },
    { key: '_dpToken',      label: 'Tokenization',               type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'Tokenization' } },
    { key: '_dpATM',        label: 'ATM',                        type: 'data', indent: 1, isExp: false, childOf: 'procRev', _salesBreak: { entity:'DP', cat:'ATM' } },
    { key: 'processingCost',        label: 'Processing Cost',               type: 'subtotal', indent: 0, isExp: true  },
    { key: 'personnel',             label: 'Personnel',                     type: 'data',     indent: 1, isExp: true  },
    { key: 'infoSecOpEx',           label: 'InfoSec & Technology OpEx',     type: 'data',     indent: 1, isExp: true  },
    { key: 'sla',                   label: 'SLA',                           type: 'data',     indent: 1, isExp: true  },
    { key: '_pcostpct',             label: '% of NR', type: 'margin', indent: 1,
      deriveFn: d => d.processingRevenues ? d.processingCost / d.processingRevenues : 0 },
    { key: 'processingGrossProfit', label: 'Processing Gross Profit',       type: 'subtotal', indent: 0, isExp: false },
    { key: 'processingGPM',         label: '% of NR',                       type: 'margin',   indent: 1 },
    { key: '_sep1', type: 'spacer' },
    { key: 'issuanceRevenues', label: 'Issuance Revenues', type: 'data', indent: 0, isExp: false, toggleGroup: 'issRev' },
    { key: '_dpIssCards', label: 'Cards', type: 'data', indent: 1, isExp: false, childOf: 'issRev', _salesBreak: { entity:'DP', cat:'Cards' } },
    { key: '_dpIssPerso', label: 'Perso', type: 'data', indent: 1, isExp: false, childOf: 'issRev', _salesBreak: { entity:'DP', cat:'Perso' } },
    { key: 'issuanceCost',          label: 'Issuance Cost',                 type: 'subtotal', indent: 0, isExp: true  },
    { key: 'issuanceGrossProfit',   label: 'Issuance Gross Profit',         type: 'subtotal', indent: 0, isExp: false },
    { key: 'issuanceGPM',           label: '% of NR',                       type: 'margin',   indent: 1 },
    { key: '_sep2', type: 'spacer' },
    { key: 'totalGrossProfit',      label: 'Total Gross Profit',            type: 'subtotal', indent: 0, isExp: false },
    { key: 'totalGPM',              label: '% of NR',                       type: 'margin',   indent: 1 },
    { key: '_sep3', type: 'spacer' },
    { key: 'digitalRevenues',       label: 'Digital Revenues',              type: 'data',     indent: 0, isExp: false },
    { key: 'productDevCost',        label: 'Product Dev. Cost',             type: 'data',     indent: 0, isExp: true  },
    { key: 'digitalGrossProfit',    label: 'Digital Gross Profit',          type: 'subtotal', indent: 0, isExp: false },
    { key: 'digitalGPM',            label: '% of NR',                       type: 'margin',   indent: 1 },
    { key: '_sep4', type: 'spacer' },
    { key: 'sga', label: 'SG&A', type: 'data', indent: 0, isExp: true, toggleGroup: 'sga' },
    { key: 'sm', label: 'S&M', type: 'data', indent: 1, isExp: true, childOf: 'sga', toggleGroup: 'dpSm' },
    { key: 'smPersonnel', label: 'Personnel (6030)', type: 'data', indent: 2, isExp: true, childOf: 'dpSm' },
    { key: 'smOther',     label: 'Other Expenses',   type: 'data', indent: 2, isExp: true, childOf: 'dpSm' },
    { key: 'ga', label: 'G&A', type: 'data', indent: 1, isExp: true, childOf: 'sga', toggleGroup: 'dpGa' },
    { key: 'gaPersonnel', label: 'Personnel (6030)', type: 'data', indent: 2, isExp: true, childOf: 'dpGa' },
    { key: 'gaOther',     label: 'Other Expenses',   type: 'data', indent: 2, isExp: true, childOf: 'dpGa' },
    { key: 'ebitda',                label: 'EBITDA',                        type: 'subtotal', indent: 0, isExp: false },
    { key: 'ebitdaM',               label: '% of NR',                       type: 'margin',   indent: 1 },
    { key: '_sep5', type: 'spacer' },
    { key: 'totalDA',               label: 'Depreciation & Amortization',   type: 'subtotal', indent: 0, isExp: true, toggleGroup: 'da' },
    { key: 'grossDA',               label: 'Gross D&A — Fixed Assets',      type: 'data',     indent: 1, isExp: true, childOf: 'da' },
    { key: 'rouDA',                 label: 'Depreciation — Right of Use',   type: 'data',     indent: 1, isExp: true, childOf: 'da' },
    { key: '_sep6', type: 'spacer' },
    { key: 'financialExpenses',     label: 'Financial Expenses',            type: 'data',     indent: 0, isExp: true  },
    { key: 'leaseExpenses6F',       label: 'Lease Expenses (6th Floor)',    type: 'data',     indent: 0, isExp: true  },
    { key: 'leaseInterest2F',       label: 'Lease Interest (2nd Floor)',    type: 'data',     indent: 0, isExp: true  },
    { key: 'otherIncome',           label: 'Other Income',                  type: 'data',     indent: 0, isExp: false },
    { key: 'creditInterest',        label: 'Credit Interest',               type: 'data',     indent: 0, isExp: false },
    { key: 'solidarity',            label: 'Solidarity Mutual Contribution',type: 'data',     indent: 0, isExp: true  },
    { key: 'provisions',            label: 'Provisions',                    type: 'data',     indent: 0, isExp: true  },
    { key: 'unrealizedFX',          label: 'Unrealized FX',                 type: 'data',     indent: 0, isExp: false },
    { key: 'realizedFX',            label: 'Realized FX',                   type: 'data',     indent: 0, isExp: false },
    { key: '_sep7', type: 'spacer' },
    { key: 'ebt',                   label: 'EBT',                           type: 'subtotal', indent: 0, isExp: false },
    { key: 'ebtM',                  label: 'EBT Margin %',                  type: 'margin',   indent: 1 },
    { key: 'incomeTax',             label: 'Income Tax',                    type: 'data',     indent: 1, isExp: true  },
    { key: 'deferredTax',           label: 'Deferred Tax',                  type: 'data',     indent: 1, isExp: true  },
    { key: 'netProfit',             label: 'Net Profit',                    type: 'total',    indent: 0, isExp: false },
    { key: 'netM',                  label: 'Net Margin %',                  type: 'margin',   indent: 1 },
  ];
}

// PL_STRUCTURES override removed — row definitions with breakdowns live above

// ── Format ─────────────────────────────────────────────────────
function fmtCell(value, type) {
  if (value == null || (typeof value === 'number' && isNaN(value))) return '—';
  if (type === 'pct' || type === 'margin') return value === 0 ? '—' : FMT.pct(value);
  if (type === 'variance') return value === null ? '—' : FMT.amount(value);
  return value === 0 ? '—' : FMT.amount(value);
}

function computePLVariance(isData, key, deriveFn) {
  const get = p => {
    if (deriveFn) return deriveFn(isData[p] || {});
    return isData[p]?.[key] ?? 0;
  };
  const actual   = get('ytd');
  const budget   = isData.ytdBudget ? get('ytdBudget') : null;
  const priorYTD = get('sply');
  const hB = budget != null && budget !== 0;
  const hL = priorYTD !== 0;
  return {
    varBud:    hB ? actual - budget                          : null,
    varBudPct: hB ? (actual - budget) / Math.abs(budget)    : null,
    varLY:     hL ? actual - priorYTD                        : null,
    varLYPct:  hL ? (actual - priorYTD) / Math.abs(priorYTD): null,
  };
}

// ── Sales breakdown helper for revenue sub-rows ───────────────
// Computes the revenue value for a specific product category
// by summing the relevant sales rows for the given IS period.
function _getSalesBreakVal(breakDef, period, isData) {
  if (!STATE.salesRows) return 0;
  const { year, month } = STATE.filters;
  const y = parseInt(year), m = parseInt(month);
  if (!y || !m) return 0;

  // Determine year and month range for this period
  let yFilter, moMin = 1, moMax = m;
  if (period === 'ytd')        { yFilter = y; }
  else if (period === 'standalone') { yFilter = y; moMin = moMax = m; }
  else if (period === 'splm')  { yFilter = y - 1; moMin = moMax = m; }
  else if (period === 'sply')  { yFilter = y - 1; }
  else if (period === 'ytdBudget') { return 0; }  // no breakdown for budget
  else return 0;

  const { entity, cat } = breakDef;
  const isMC = entity === 'MC';
  const folders = isMC ? ['Masria Cards','modupay Cards'] : ['mdp','modupay DP'];

  const rows = STATE.salesRows.filter(r =>
    folders.includes(r.entityFolder) &&
    r.year === yFilter && r.month >= moMin && r.month <= moMax
  );

  let total = 0;
  if (isMC) {
    // MC: Cards, Perso, Others by categorization
    const isLocal = r => (r.jurisdiction || '').trim() === 'Local';
    const isExport = r => !isLocal(r);
    const val = r => {
      const v = r.value || 0;
      if (STATE.usdMode) {
        const rate = (Number.isFinite(r.fxRate) && r.fxRate > 1) ? r.fxRate : 1;
        return v / rate;
      }
      return v;
    };
    if (cat === 'Cards')  total = rows.filter(r => r.categorization === 'Cards').reduce((s,r) => s + val(r), 0);
    else if (cat === 'Perso')  total = rows.filter(r => r.categorization === 'Perso').reduce((s,r) => s + val(r), 0);
    else if (cat === 'Others') {
      const excl = rows.filter(r => r.categorization === 'Cards' || r.categorization === 'Perso').reduce((s,r) => s + val(r), 0);
      total = rows.reduce((s,r) => s + val(r), 0) - excl;
    }
  } else {
    // DP: by categorization, value is USD natively (r.value)
    const val = r => {
      const v = r.value || 0;
      if (!STATE.usdMode) {
        const rate = (Number.isFinite(r.fxRate) && r.fxRate > 1) ? r.fxRate : 1;
        return v * rate;
      }
      return v;
    };
    // Map display category label to actual categorization values
    const catMap = {
      'Account Setup':   r => /account.?setup/i.test(r.categorization),
      'Trx Processing':  r => /trx|transaction|processing/i.test(r.categorization) && !/account/i.test(r.categorization),
      'Fraud':           r => /fraud/i.test(r.categorization),
      'VAS':             r => /^vas$/i.test(r.categorization),
      'Hosting':         r => /hosting/i.test(r.categorization),
      'Recurring':       r => /recurring|managed.?service|fixed/i.test(r.categorization),
      '3DS':             r => /3ds/i.test(r.categorization),
      'Implementation':  r => /implement|setup|cr/i.test(r.categorization),
      'Digital':         r => /digital|mobile|app|data.?product/i.test(r.categorization),
      'Tokenization':    r => /token/i.test(r.categorization),
      'ATM':             r => /atm/i.test(r.categorization),
      'Cards':           r => r.categorization === 'Cards' || r.mainCategory === 'Issuance' && /card/i.test(r.categorization),
      'Perso':           r => r.categorization === 'Perso' || r.mainCategory === 'Issuance' && /perso/i.test(r.categorization),
    };
    const fn = catMap[cat];
    if (fn) total = rows.filter(fn).reduce((s,r) => s + val(r), 0);
  }
  return total;
}

// ── Render P&L table HTML ──────────────────────────────────────
// ── USD display wrapper ────────────────────────────────────────
function _toUSD(isData) {
  if (!isData) return isData;
  const marginKeys = new Set([
    'gpm','ebitdaM','ebtM','netM','totalGPM',
    'processingGPM','issuanceGPM','digitalGPM',
  ]);
  function divBudget(obj) {
    if (!obj) return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'number' && !isNaN(v))
        out[k] = marginKeys.has(k) ? v : v / BUDGET_FX_RATE;
      else out[k] = v;
    }
    return out;
  }
  return {
    ytd:        isData._ytdUSD        || isData.ytd,
    standalone: isData._standaloneUSD || isData.standalone,
    splm:       isData._splmUSD       || isData.splm,
    sply:       isData._splyUSD       || isData.sply,
    ytdBudget:  divBudget(isData.ytdBudget),
    _entity:    isData._entity,
    _isMasria:  isData._isMasria,
  };
}

function renderPLTable(isData, columns, isMasria) {
  const plRows  = isMasria ? getMasriaPLRows() : getMdpPLRows();
  const display = STATE.usdMode ? _toUSD(isData) : isData;

  let html = '<div class="stmt-table-wrap"><table class="stmt-table"><thead><tr>';
  for (const col of columns) {
    const cls = col.type === 'label' ? '' : ' class="stmt-amount"';
    html += `<th${cls}>${escHtml(col.header)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const rowDef of plRows) {
    if (rowDef.type === 'spacer') {
      html += `<tr class="pl-row-spacer"><td colspan="${columns.length}"></td></tr>`;
      continue;
    }

    const { key, isExp = false, indent = 0, toggleGroup, childOf, deriveFn } = rowDef;
    const isMargin = rowDef.type === 'margin';

    // Row attributes
    let rowAttrs = `class="pl-row-${rowDef.type} pl-indent-${indent}"`;
    if (childOf) {
      // Child rows: hidden by default if group is collapsed
      const hidden = PL_COLLAPSED[childOf] ? ' style="display:none"' : '';
      rowAttrs = `class="pl-row-${rowDef.type} pl-indent-${indent}" data-pl-group="${childOf}"${hidden}`;
    }

    // Label cell
    let labelContent;
    if (toggleGroup) {
      const icon = PL_COLLAPSED[toggleGroup] ? '+' : '−';
      labelContent = `<button class="pl-toggle-btn" data-pl-toggle="${toggleGroup}" title="Expand/Collapse">${icon}</button>${escHtml(rowDef.label)}`;
    } else {
      labelContent = escHtml(rowDef.label || '');
    }

    const getVal = p => {
      if (deriveFn) return deriveFn(display[p] || {});
      // Sales breakdown rows — compute from live sales data
      if (rowDef._salesBreak) return _getSalesBreakVal(rowDef._salesBreak, p, isData);
      return display[p]?.[key] ?? 0;
    };

    const vals = {
      ytd:        getVal('ytd'),
      standalone: getVal('standalone'),
      splm:       getVal('splm'),
      ytdBudget:  display.ytdBudget ? getVal('ytdBudget') : null,
      sply:       getVal('sply'),
    };

    const variance = computePLVariance(display, key, deriveFn);

    html += `<tr ${rowAttrs}>`;
    for (const col of columns) {
      if (col.key === 'label') { html += `<td>${labelContent}</td>`; continue; }

      let rawVal, cellType, colorClass = '';
      if (['ytd','standalone','splm','sply'].includes(col.key)) {
        rawVal = vals[col.key]; cellType = isMargin ? 'pct' : 'amount';
      } else if (col.key === 'ytdBudget') {
        rawVal = vals.ytdBudget; cellType = isMargin ? 'pct' : 'amount';
      } else if (col.key === 'varBud') {
        rawVal = variance.varBud; cellType = 'variance';
        if (rawVal != null) colorClass = varianceColorClass(rawVal, isExp);
      } else if (col.key === 'varBudPct') {
        rawVal = variance.varBudPct; cellType = 'pct';
        if (rawVal != null) colorClass = varianceColorClass(rawVal, isExp);
      } else if (col.key === 'varLY') {
        rawVal = variance.varLY; cellType = 'variance';
        if (rawVal != null) colorClass = varianceColorClass(rawVal, isExp);
      } else if (col.key === 'varLYPct') {
        rawVal = variance.varLYPct; cellType = 'pct';
        if (rawVal != null) colorClass = varianceColorClass(rawVal, isExp);
      }

      const display = fmtCell(rawVal, cellType);
      const tdClass = `stmt-amount${colorClass ? ' ' + colorClass : ''}`;
      html += `<td class="${tdClass}">${escHtml(display)}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  return html;
}

// ── escHtml ────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
