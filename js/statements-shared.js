'use strict';
/* ============================================================
   STATEMENTS-SHARED.JS — Common helpers for IS & BS computation
   Used by: statements-mc.js (modupay Cards) and statements-dp.js (modupay DP)
   ============================================================ */

// ── TB amount helpers ─────────────────────────────────────────
// Negate SAP sign so Revenue → positive, Expense → positive cost.
function sumTB(rows, filterFn) {
  const useYTD = rows && (rows._periodKey === 'ytd' || rows._periodKey === 'sply');
  return rows.filter(filterFn).reduce((s, r) => {
    const amount = useYTD ? (r.adjustedBalance || 0) : (r.balanceOfMonth || 0);
    return s - amount;
  }, 0);
}

function asIncome(v)  { return  Math.abs(v || 0); }
function asExpense(v) { return -Math.abs(v || 0); }

function sumTBIncome(rows, filterFn)  { return asIncome(sumTB(rows, filterFn)); }
function sumTBExpense(rows, filterFn) { return asExpense(sumTB(rows, filterFn)); }

function sumTBCredit(rows, filterFn) {
  const useYTD = rows && (rows._periodKey === 'ytd' || rows._periodKey === 'sply');
  return rows.filter(filterFn).reduce((s, r) => {
    const amount = useYTD ? (r.adjustedCredit || 0) : (r.creditOfMonth || 0);
    return s - amount;
  }, 0);
}

// ── OpEx amount helpers ───────────────────────────────────────
function sumOp(rows, filterFn) {
  return rows.filter(filterFn).reduce((s, r) => s + (r.amount || 0), 0);
}

function sumOpExpense(rows, filterFn) { return asExpense(sumOp(rows, filterFn)); }

// ── Row matching helpers ──────────────────────────────────────
function keyIs(r, k) {
  return String(r.account || '').startsWith(String(k));
}

function parentIncludes(r, str) {
  return String(r.accountParent || '').toLowerCase().includes(str.toLowerCase());
}

function mappingIs(r, val) {
  return String(r.mapping || '').trim().toUpperCase() === val.toUpperCase();
}

function normMatchText(v) {
  return String(v || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ── Sales value helpers ───────────────────────────────────────
function salesValueEGP(r) {
  const v = r.value || 0;
  if (r.entityFolder === 'modupay DP' || r.entityFolder === 'mdp') {
    const rate = (Number.isFinite(r.fxRate) && r.fxRate > 0) ? r.fxRate : 1;
    return v * rate;
  }
  return v;
}

/**
 * Returns the SLA Setup revenue from Masria/Cards sales (GL 1001090, productType='setup').
 * Used as both revenue (in MC) and a COGS deduction (in DP).
 */
function sumMasriaSetupSLA(salesRows) {
  return asIncome((salesRows || []).reduce((s, r) => {
    if ((r.entityFolder !== 'modupay Cards' && r.entityFolder !== 'Masria Cards') || r.code !== 1001090) return s;
    if (String(r.productType || '').trim().toLowerCase() !== 'setup') return s;
    return s + salesValueEGP(r);
  }, 0));
}

function computeRechargeSLA(salesRows) {
  return asIncome(sumMasriaSetupSLA(salesRows));
}

// ── USD-native row aggregation helpers ───────────────────────
// These mirror sumTB / sumOp / salesValue but divide each row
// by its month's FX rate before summing — giving exact USD totals.

function _fxRate(row) {
  // row must have .year and .month
  if (!row || !STATE.fxRates) return null;
  const key = `${row.year}-${String(row.month).padStart(2,'0')}`;
  return STATE.fxRates[key] || null;
}

function sumTB_USD(rows, filterFn) {
  // Strategy depends on how many months are in the row set:
  //
  // SINGLE month (standalone / SPLM):
  //   Use balanceOfMonth directly — it is already the correct monthly
  //   movement (debit - credit of that month only), divide by FX(M).
  //   We must NOT use adjustedBalance here because that is the full
  //   YTD cumulative (Jan..M) which would give hugely inflated figures.
  //
  // MULTIPLE months (YTD / SPLY):
  //   Use adjustedBalance(M) - adjustedBalance(M-1) per account per month,
  //   then divide by FX(M). This correctly isolates each month's movement
  //   regardless of opening-balance carryforward, and avoids the sign
  //   inconsistency that balanceOfMonth (debitOfMonth - creditOfMonth) has.

  const filtered = rows.filter(filterFn);

  // Detect: are all rows in the same year+month? (standalone / SPLM)
  const years  = new Set(filtered.map(r => r.year));
  const months = new Set(filtered.map(r => r.month));
  const isSingleMonth = years.size <= 1 && months.size <= 1;

  if (isSingleMonth) {
    // Standalone / SPLM: use balanceOfMonth ÷ FX directly
    return filtered.reduce((s, r) => {
      const fx = _fxRate(r);
      if (!fx) return s;
      return s - (r.balanceOfMonth || 0) / fx;
    }, 0);
  }

  // YTD / SPLY: adjustedBalance diff per account per month ÷ FX
  const byAcct = {};
  for (const r of filtered) {
    if (!byAcct[r.account]) byAcct[r.account] = [];
    byAcct[r.account].push(r);
  }
  let total = 0;
  for (const acctRows of Object.values(byAcct)) {
    acctRows.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    let prevAdjBal = 0;
    for (const r of acctRows) {
      const fx = _fxRate(r);
      if (!fx) { prevAdjBal = r.adjustedBalance || 0; continue; }
      const movement = (r.adjustedBalance || 0) - prevAdjBal;
      total -= movement / fx;
      prevAdjBal = r.adjustedBalance || 0;
    }
  }
  return total;
}

function sumTBCredit_USD(rows, filterFn) {
  // Same dual strategy as sumTB_USD
  const filtered = rows.filter(filterFn);

  const years  = new Set(filtered.map(r => r.year));
  const months = new Set(filtered.map(r => r.month));
  const isSingleMonth = years.size <= 1 && months.size <= 1;

  if (isSingleMonth) {
    return filtered.reduce((s, r) => {
      const fx = _fxRate(r);
      if (!fx) return s;
      return s - (r.creditOfMonth || 0) / fx;
    }, 0);
  }

  const byAcct = {};
  for (const r of filtered) {
    if (!byAcct[r.account]) byAcct[r.account] = [];
    byAcct[r.account].push(r);
  }
  let total = 0;
  for (const acctRows of Object.values(byAcct)) {
    acctRows.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    let prevAdjCredit = 0;
    for (const r of acctRows) {
      const fx = _fxRate(r);
      if (!fx) { prevAdjCredit = r.adjustedCredit || 0; continue; }
      const movement = (r.adjustedCredit || 0) - prevAdjCredit;
      total -= movement / fx;
      prevAdjCredit = r.adjustedCredit || 0;
    }
  }
  return total;
}

function sumTBIncome_USD(rows, filterFn)  { return asIncome(sumTB_USD(rows, filterFn)); }
function sumTBExpense_USD(rows, filterFn) { return asExpense(sumTB_USD(rows, filterFn)); }

function sumOp_USD(rows, filterFn) {
  return rows.filter(filterFn).reduce((s, r) => {
    const fx = _fxRate(r);
    if (!fx) return s;
    return s + (r.amount || 0) / fx;
  }, 0);
}
function sumOpExpense_USD(rows, filterFn) { return asExpense(sumOp_USD(rows, filterFn)); }

// MC sales: stored as EGP → divide by r.fxRate (transaction-level rate,
// same rate used in the Revenues tab via _val()) to ensure both match exactly.
function salesValueUSD_MC(r) {
  const v = r.value || 0;
  const rate = (Number.isFinite(r.fxRate) && r.fxRate > 0) ? r.fxRate : (_fxRate(r) || 1);
  return v / rate;
}
// DP sales: stored as USD natively → use r.value directly
function salesValueUSD_DP(r) {
  return r.value || 0;
}

function sumMasriaSetupSLA_USD(salesRows) {
  return asIncome((salesRows || []).reduce((s, r) => {
    if ((r.entityFolder !== 'modupay Cards' && r.entityFolder !== 'Masria Cards') || r.code !== 1001090) return s;
    if (String(r.productType || '').trim().toLowerCase() !== 'setup') return s;
    return s + salesValueUSD_MC(r);
  }, 0));
}

// ── MC revenue USD: mirrors Revenues tab exactly ─────────────
// Receives period-scoped sales rows (already filtered by entity + year/month).
// Sums r.value / r.fxRate — identical to _val(r) in sales-shared.js.
// No additional filtering here: the caller (buildMasriaIS) passes rows
// built with _getSalesRowsForIS() which mirrors _getSalesRows(mcFolders,...,
// { includeIntercompany: true }) used by the Revenues tab.
function _getMCRevenueUSD(salesRows) {
  return asIncome(
    (salesRows || []).reduce((s, r) => {
      const v    = r.value || 0;
      const rate = (Number.isFinite(r.fxRate) && r.fxRate > 0) ? r.fxRate : (_fxRate(r) || 1);
      return s + v / rate;
    }, 0)
  );
}

// ── Compute MC IS in USD from raw rows ────────────────────────
function computeMasriaIS_USD(tbISRows, opexRows, compCode, salesRows) {

  // Revenue in USD: directly mirrors the Revenues tab.
  // _getMCRevenueUSD() fetches from STATE.salesRows with identical
  // filters to mcCurrAll/_getSalesRows so YTD/SPLY/standalone all match.
  const revenue = _getMCRevenueUSD(salesRows);
  const consumptionCost = sumTBExpense_USD(tbISRows, r => keyIs(r, 5));

  const industrialPayroll = sumOpExpense_USD(opexRows, r =>
    String(r.glAccountGroup || '').startsWith('6030') && mappingIs(r, 'COGS') &&
    r.companyCode === compCode && r.accountParent === MC_OPEX_PARENT
  );
  const manufacturingCost = sumOpExpense_USD(opexRows, r =>
    keyIs(r, 6) && !String(r.glAccountGroup || '').startsWith('6030') &&
    mappingIs(r, 'COGS') && r.companyCode === compCode && r.accountParent === MC_OPEX_PARENT
  );
  const sla        = asExpense(sumMasriaSetupSLA_USD(salesRows));
  const cogs       = consumptionCost + industrialPayroll + manufacturingCost + sla;
  const grossProfit = revenue + cogs;
  const gpm        = revenue ? grossProfit / revenue : 0;

  const smFilterU = r => keyIs(r,6) && mappingIs(r,'S&M') && r.companyCode===compCode && r.accountParent===MC_OPEX_PARENT;
  const sm = sumOpExpense_USD(opexRows, smFilterU);
  const smPersonnel = sumOpExpense_USD(opexRows, r => smFilterU(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const smOther     = sm - smPersonnel;
  const gaFilterU = r => keyIs(r,6) && mappingIs(r,'G&A') && r.companyCode===compCode && r.accountParent===MC_OPEX_PARENT;
  const ga = sumOpExpense_USD(opexRows, gaFilterU);
  const gaPersonnel = sumOpExpense_USD(opexRows, r => gaFilterU(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const gaOther     = ga - gaPersonnel;
  const ebitda  = grossProfit + sm + ga;
  const ebitdaM = revenue ? ebitda / revenue : 0;

  const grossDA = sumTBExpense_USD(tbISRows, r => parentIncludes(r, 'fixed assets depreciation'));
  const rouDA   = sumTBExpense_USD(tbISRows, r => parentIncludes(r, 'right of use assets amortization'));
  const rechargeSLA = asIncome(sumMasriaSetupSLA_USD(salesRows));
  const totalDA = grossDA + rouDA + rechargeSLA;

  const financialExpenses = sumTBExpense_USD(tbISRows, r => parentIncludes(r, 'financial expenses'));
  const leaseLiabInt      = sumTBExpense_USD(tbISRows, r => parentIncludes(r, 'lease liabilities interest'));
  const creditInterest    = sumTBIncome_USD(tbISRows,  r => parentIncludes(r, 'credit interest'));
  const leaseBackcharge   = sumTBIncome_USD(tbISRows,  r => r.account === 61601099 || r.account === 61901099);
  const otherIncome       = sumTBIncome_USD(tbISRows,  r =>
    parentIncludes(r, 'other income') && r.account !== 61601099 && r.account !== 61901099
  );
  const capitalGain       = sumTBIncome_USD(tbISRows,  r => parentIncludes(r, 'capital gain'));

  const provisionsBal   = sumTBExpense_USD(tbISRows, r => [69001090, 69001400, 69001500].includes(r.account));
  const provisionsDebit = tbISRows
    .filter(r => [69001040, 69001060].includes(r.account))
    .reduce((s, r) => {
      const fx = _fxRate(r); if (!fx) return s;
      return s - Math.abs((r.debitOfMonth || 0) / fx);  // always monthly
    }, 0);
  const provisions    = provisionsBal + provisionsDebit;
  const provisionsNLR = asIncome(sumTBCredit_USD(tbISRows, r => r.account === 69001040));
  const takaful       = sumTBExpense_USD(tbISRows, r => r.account === 69001200);

  const unrealizedFX  = sumTB_USD(tbISRows, r => String(r.accountName || '').toLowerCase().includes('currency valuation-unrealized'));
  const realizedFX    = sumTB_USD(tbISRows, r => String(r.accountName || '').toLowerCase().includes('currency valuation-realized'));

  const ebt =
    ebitda + totalDA + financialExpenses + leaseLiabInt +
    creditInterest + leaseBackcharge + otherIncome + capitalGain +
    provisions + provisionsNLR + takaful + unrealizedFX + realizedFX;
  const ebtM    = revenue ? ebt / revenue : 0;
  const incomeTax   = sumTBExpense_USD(tbISRows, r => r.account === 69001100);
  const deferredTax = sumTBExpense_USD(tbISRows, r => r.account === 69001600);
  const netProfit   = ebt + incomeTax + deferredTax;
  const netM        = revenue ? netProfit / revenue : 0;

  return {
    revenue, consumptionCost, industrialPayroll, manufacturingCost, sla, cogs,
    grossProfit, gpm, sm, smPersonnel, smOther, ga, gaPersonnel, gaOther, ebitda, ebitdaM,
    grossDA, rouDA, rechargeSLA, totalDA,
    financialExpenses, leaseLiabInt, creditInterest, leaseBackcharge,
    otherIncome, capitalGain, provisions, provisionsNLR, takaful,
    unrealizedFX, realizedFX, ebt, ebtM, incomeTax, deferredTax, netProfit, netM,
  };
}

// ── Compute DP IS in USD from raw rows ────────────────────────
function computeMdpIS_USD(tbISRows, opexRows, compCode, masriaSalesRows, dpSalesRows) {
  const _dp = dpSalesRows || [];

  // DP revenues are in USD natively → sum r.value directly
  const issuanceRevenues = asIncome(
    _dp.filter(r => _isDP_Issuance(r.categorization) || _isDP_Issuance(r.mainCategory))
       .reduce((s, r) => s + salesValueUSD_DP(r), 0)
  );
  const processingRevenues = asIncome(
    _dp.filter(r => !_isDP_Issuance(r.categorization) && !_isDP_Issuance(r.mainCategory))
       .reduce((s, r) => s + salesValueUSD_DP(r), 0)
  );
  const digitalRevenues = 0;
  const revenue         = processingRevenues + issuanceRevenues + digitalRevenues;

  const personnel  = sumOpExpense_USD(opexRows, r =>
    String(r.glAccountGroup || '').startsWith('6030') && mappingIs(r, 'COGS') && r.companyCode === compCode
  );
  const sla = asExpense(sumMasriaSetupSLA_USD(masriaSalesRows));
  const infoSecOpEx =
    sumOpExpense_USD(opexRows, r =>
      keyIs(r, 6) && !String(r.glAccountGroup || '').startsWith('6030') &&
      r.accountParent === DP_OPEX_PARENT && mappingIs(r, 'COGS') && r.companyCode === compCode
    ) +
    sumTBExpense_USD(tbISRows, r => keyIs(r, 5) && r.account !== 50601000) - sla;

  const processingCost        = personnel + infoSecOpEx + sla;
  const processingGrossProfit = processingRevenues + processingCost;
  const processingGPM         = processingRevenues ? processingGrossProfit / processingRevenues : 0;

  const issuanceCost        = sumTBExpense_USD(tbISRows, r => r.account === 50601000);
  const issuanceGrossProfit = issuanceRevenues + issuanceCost;
  const issuanceGPM         = issuanceRevenues ? issuanceGrossProfit / issuanceRevenues : 0;

  const totalGrossProfit = processingGrossProfit + issuanceGrossProfit + digitalRevenues;
  const totalGPM         = revenue ? totalGrossProfit / revenue : 0;

  const productDevCost     = sumOpExpense_USD(opexRows, r =>
    r.ccCode === 1210221100 && mappingIs(r, 'S&M') && r.companyCode === compCode
  );
  const digitalGrossProfit = digitalRevenues + productDevCost;
  const digitalGPM         = 0;

  const sgaFilterU = r => keyIs(r,6) && (mappingIs(r,'S&M')||mappingIs(r,'G&A')) && r.accountParent===DP_OPEX_PARENT && r.companyCode===compCode;
  const sga = sumOpExpense_USD(opexRows, sgaFilterU);
  const smFilterUD = r => sgaFilterU(r) && mappingIs(r,'S&M');
  const sm_dp = sumOpExpense_USD(opexRows, smFilterUD);
  const smPersonnel_dp = sumOpExpense_USD(opexRows, r => smFilterUD(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const smOther_dp     = sm_dp - smPersonnel_dp;
  const gaFilterUD = r => sgaFilterU(r) && mappingIs(r,'G&A');
  const ga_dp = sumOpExpense_USD(opexRows, gaFilterUD);
  const gaPersonnel_dp = sumOpExpense_USD(opexRows, r => gaFilterUD(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const gaOther_dp     = ga_dp - gaPersonnel_dp;

  const ebitda  = totalGrossProfit + sga;
  const ebitdaM = revenue ? ebitda / revenue : 0;

  const grossDA = sumTBExpense_USD(tbISRows, r => {
    const t = String(r.accountType || '').toLowerCase();
    return (t === 'amortization' || t === 'depreciation') && r.account !== 61601020;
  });
  const rouDA   = sumTBExpense_USD(tbISRows, r => r.account === 61601020);
  const totalDA = grossDA + rouDA;

  const financialExpenses = sumTBExpense_USD(tbISRows, r => parentIncludes(r, 'financial expenses'));
  const leaseInterest2F   = sumTBExpense_USD(tbISRows, r => r.account === 61901060);
  const otherIncome       = sumTBIncome_USD(tbISRows,  r => r.account === 49901010);
  const creditInterest    = sumTBIncome_USD(tbISRows,  r => r.account === 61901030);
  const solidarity        = 0;
  const provisions        = sumTBExpense_USD(tbISRows, r => r.account === 69001500);
  const unrealizedFX      = sumTB_USD(tbISRows, r => r.account === 70201000);
  const realizedFX        = sumTB_USD(tbISRows, r => r.account === 70201010);

  const ebt =
    ebitda + totalDA + financialExpenses + leaseInterest2F +
    otherIncome + creditInterest + solidarity + provisions +
    unrealizedFX + realizedFX;
  const ebtM      = revenue ? ebt / revenue : 0;
  const incomeTax   = sumTBExpense_USD(tbISRows, r => r.account === 69001100);
  const deferredTax = sumTBExpense_USD(tbISRows, r => r.account === 69001600);
  const netProfit   = ebt + incomeTax + deferredTax;
  const netM        = revenue ? netProfit / revenue : 0;

  return {
    processingRevenues, issuanceRevenues, digitalRevenues, revenue,
    personnel, infoSecOpEx, sla, processingCost,
    processingGrossProfit, processingGPM,
    issuanceCost, issuanceGrossProfit, issuanceGPM,
    totalGrossProfit, totalGPM,
    productDevCost, digitalGrossProfit, digitalGPM,
    sga, sm: sm_dp, smPersonnel: smPersonnel_dp, smOther: smOther_dp, ga: ga_dp, gaPersonnel: gaPersonnel_dp, gaOther: gaOther_dp, ebitda, ebitdaM, grossDA, rouDA, totalDA,
    financialExpenses, leaseInterest2F, otherIncome, creditInterest,
    solidarity, provisions, unrealizedFX, realizedFX,
    ebt, ebtM, incomeTax, deferredTax, netProfit, netM,
  };
}

// ── DP issuance category check (inline — avoids collision with statements-dp.js) ──
function _isDP_Issuance(cat) {
  return ['Issuance (Cards + Perso)','Issuance','Cards','Perso',
          'Card','Personalization','Personalisation'].includes(cat);
}


// ── Entity/company-code resolution ───────────────────────────
function entityCompanyCode(entityFolder) {
  const prefix = (ENTITY_UID_PREFIX || {})[entityFolder];
  if (prefix === '10') return '1000';
  if (prefix === '12') return '1200';
  return entityFolder;
}

// ── Period row slicing ────────────────────────────────────────
function getStatementTBRows(rows, periodKey, filters) {
  const y = parseInt(filters.year);
  const m = parseInt(filters.month);
  if (!y || !m) return [];

  let filtered;
  if (periodKey === 'ytd') {
    filtered = rows.filter(r => r.year === y && r.month === m);
  } else if (periodKey === 'sply') {
    filtered = rows.filter(r => r.year === y - 1 && r.month === m);
  } else {
    filtered = getPeriodRows(rows, periodKey, filters);
  }
  filtered._periodKey = periodKey;
  return filtered;
}

// ── BS line computation ───────────────────────────────────────
/**
 * Compute a single BS line value.
 * parentMatch: string | string[] — one or multiple parent names to sum.
 * isAsset: debit-nature accounts → positive; liability/equity → negate.
 * matchMode: 'contains' (default) | 'exact'
 */
function computeBSLine(tbBS, parentMatch, isAsset, matchMode = 'contains', glMatch = null, subCatMatch = null, customFilter = null) {
  let rows;
  if (customFilter) {
    // Fully custom filter function — receives all TB rows for this section
    rows = tbBS.filter(customFilter);
  } else if (glMatch) {
    const accounts = Array.isArray(glMatch) ? glMatch : [glMatch];
    rows = tbBS.filter(r => accounts.includes(Number(r.account)));
  } else if (subCatMatch) {
    const targets = Array.isArray(subCatMatch) ? subCatMatch : [subCatMatch];
    rows = tbBS.filter(r =>
      targets.some(t => normMatchText(r.subCategory) === normMatchText(t))
    );
  } else {
    const matches = Array.isArray(parentMatch) ? parentMatch : [parentMatch];
    rows = tbBS.filter(r => {
      const ap = normMatchText(r.accountParent);
      return matches.some(pm => {
        const p = normMatchText(pm);
        return matchMode === 'exact' ? ap === p : ap.includes(p);
      });
    });
  }
  if (isAsset) {
    return rows.reduce((s, r) => s + (r.adjustedBalance || 0), 0);
  } else {
    return rows.reduce((s, r) => s - (r.adjustedBalance || 0), 0);
  }
}

function computeBSNetProfit(entityFolder, year, month) {
  return STATE.tbRows
    .filter(r =>
      r.entityFolder === entityFolder &&
      r.bsOrPL === 'IS' &&
      r.year === year &&
      r.month === month
    )
    .reduce((s, r) => s - (r.adjustedBalance || 0), 0);
}

/**
 * Generic BS builder — accepts a bsStructure definition object.
 * Each entity provides its own structure via getMCBSStructure() / getDPBSStructure().
 */
function buildEntityBS(entityFolder, year, month, bsStructure) {
  const y = parseInt(year);
  const m = parseInt(month);
  const baseFilter = r => r.entityFolder === entityFolder && r.bsOrPL === 'BS';
  const curr = STATE.tbRows.filter(r => baseFilter(r) && r.year === y     && r.month === m);
  const prev  = STATE.tbRows.filter(r => baseFilter(r) && r.year === y - 1 && r.month === 12);

  const result = { current: {}, prior: {}, sections: [] };
  const ASSET_KEYS = ['nonCurrentAssets', 'currentAssets'];

  for (const [sectionKey, section] of Object.entries(bsStructure)) {
    let sectionCurr = 0, sectionPrior = 0;

// =========================
   
const lines = section.lines.map(({ label, parentMatch, sourceType, matchMode, glMatch, subCatMatch, customFilter }) => {
  const isAsset = ASSET_KEYS.includes(sectionKey);
  const c = sourceType === 'isNetProfit'
    ? computeBSNetProfit(entityFolder, y, m)
    : computeBSLine(curr, parentMatch, isAsset, matchMode, glMatch, subCatMatch, customFilter);
  const p = sourceType === 'isNetProfit'
    ? computeBSNetProfit(entityFolder, y - 1, 12)
    : computeBSLine(prev, parentMatch, isAsset, matchMode, glMatch, subCatMatch, customFilter);
  sectionCurr += c;
  sectionPrior += p;
  return { label, current: c, prior: p, var: c - p, varPct: p ? (c - p) / Math.abs(p) : null };
});

// =========================

    result.sections.push({
      key: sectionKey, label: section.label,
      isAsset: ASSET_KEYS.includes(sectionKey),
      lines, totalCurrent: sectionCurr, totalPrior: sectionPrior,
    });
  }

  const assetSec  = result.sections.filter(s => s.isAsset);
  const eqLiabSec = result.sections.filter(s => !s.isAsset);
  result.totalAssets    = assetSec.reduce((s, x)  => s + x.totalCurrent, 0);
  result.totalEqLiab    = eqLiabSec.reduce((s, x) => s + x.totalCurrent, 0);
  result.totalAssetsPY  = assetSec.reduce((s, x)  => s + x.totalPrior, 0);
  result.totalEqLiabPY  = eqLiabSec.reduce((s, x) => s + x.totalPrior, 0);
  result.balanceCheck   = Math.abs(result.totalAssets - result.totalEqLiab) < 1;
  return result;
}
