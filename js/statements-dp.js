'use strict';
/* ============================================================
   STATEMENTS-DP.JS — modupay DP (companyCode 1200)
   IS (P&L) computation + BS structure
   Depends on: statements-shared.js
   ============================================================ */

// ── DP BS Structure ───────────────────────────────────────────
// DP has a different BS structure from modupay Cards.
// Key difference: Fixed assets (net) = "Fixed assets (net)" + "Intangible assets (net)"
//                 (both account parents summed into one line).
// DP also has unique lines: Investment, Due from sister company (DMCC & Ghana),
// Advanced from supplier, Tax Post Pond Exp, Paid under capital increase, etc.
const DP_BS_STRUCTURE = {
  nonCurrentAssets: {
    label: 'Non-Current Assets',
    lines: [
      // Fixed assets (net) = Fixed assets (net) parent + Intangible assets (net) parent
      { label: 'Fixed assets (net)',                   parentMatch: ['Fixed assets (net)', 'Intangible assets (net)'] },
      { label: 'Projects under construction',          parentMatch: 'Projects Under Construction' },
      { label: 'Investment',                           glMatch: 19116201       },
      { label: 'Right of use assets',                  parentMatch: 'Right of Use Assets'         },
    ],
  },
  currentAssets: {
    label: 'Current Assets',
    lines: [
      { label: 'Inventory',                            parentMatch: 'Inventory'                         },
      { label: "Account's receivables",                parentMatch: "Account's receivables"             },
      { label: 'Debtors and other debit balances',     parentMatch: 'Debtors and other debit balances'  },
      { label: 'Due from sister company (DMCC & Ghana)', parentMatch: 'Due from Related parties'        },
      { label: 'Advanced from supplier',               parentMatch: 'Advances to Suppliers', matchMode: 'exact' },
      { label: 'Cash on hand and at banks',            parentMatch: 'Cash'                              },
    ],
  },
  equity: {
    label: 'Equity',
    lines: [
      { label: 'Issued and paid-up Capital',           parentMatch: 'Issued and paid-up Capital'     },
      { label: 'Paid under capital increase',          parentMatch: 'OCI'               },
      { label: 'Legal Reserve',                        parentMatch: 'Legal Reserve'     },
      { label: 'Retained Earnings',                    parentMatch: 'Retained Earnings' },
      { label: 'Net profit for the year',              sourceType:  'isNetProfit'       },
    ],
  },
  nonCurrentLiabilities: {
    label: 'Non-current Liabilities',
    lines: [
      { label: 'Lease Liabilities',                   glMatch: 21002000       },
      { label: 'Tax Post Pond Exp',                   parentMatch: 'Deferred Tax' },
    ],
  },
  currentLiabilities: {
    label: 'Current Liabilities',
    lines: [
      { label: 'Suppliers',                           parentMatch: 'Suppliers', matchMode: 'exact'  },
      {
        label: 'Creditors and other credit balances',
        customFilter: r =>
          (
            normMatchText(r.accountParent) === normMatchText('Creditors and other credit balances') &&
            normMatchText(r.subCategory)   !== normMatchText('Customers - Advance Payments')
          )
          ||
          normMatchText(r.accountParent) === normMatchText('Dividends Payable'),
      },      
      
      { label: 'Advanced from Customers', subCatMatch: 'Customers - Advance Payments' },
      { label: 'Due to Related parties',              parentMatch: 'Due To Related Parties'          },
      { label: 'Provisions',                          parentMatch: 'Provisions'                      },
      { label: 'Accrued income tax',                  parentMatch: 'Income Tax Payable'              },
      { label: 'Lease Liabilities',                   parentMatch: 'Short Term Lease'                },
      { label: "Takaful contribution's",              parentMatch: 'Takaful'                         },
      { label: 'Accrued expenses',                    parentMatch: 'Banks Overdraft'                 },
    ],
  },
};

function getDPBSStructure() { return DP_BS_STRUCTURE; }

// ── DP IS Computation ─────────────────────────────────────────
// DP categorization sets — mirror of DP_ISSUANCE_CATS in sales-dashboard-dp.js
const _DP_ISSUANCE_CATS = new Set([
  'Issuance (Cards + Perso)', 'Issuance', 'Cards', 'Perso',
  'Card', 'Personalization', 'Personalisation',
]);

const DP_OPEX_PARENT = 'G&A, Industrial, Selling & Marketing Expenses';

/**
 * Compute modupay DP P&L for a single period.
 * @param {Array}  tbISRows        - TB rows for IS, period-sliced
 * @param {Array}  opexRows        - OpEx rows for DP entity
 * @param {string} compCode        - '1200'
 * @param {Array}  masriaSalesRows - MC sales rows (for SLA cross-charge)
 * @param {Array}  dpSalesRows     - DP sales rows (USD-denominated)
 */
function computeMdpIS(tbISRows, opexRows, compCode, masriaSalesRows, dpSalesRows) {

  const _dpRows = dpSalesRows || [];

  // ── Revenues — from Sales data ────────────────────────────────
  // DP data stored in USD; salesValueEGP() converts to EGP (value × fxRate).
  const issuanceRevenues = asIncome(
    _dpRows
      .filter(r => _DP_ISSUANCE_CATS.has(r.categorization) || _DP_ISSUANCE_CATS.has(r.mainCategory))
      .reduce((s, r) => s + salesValueEGP(r), 0)
  );

  const processingRevenues = asIncome(
    _dpRows
      .filter(r => !_DP_ISSUANCE_CATS.has(r.categorization) && !_DP_ISSUANCE_CATS.has(r.mainCategory))
      .reduce((s, r) => s + salesValueEGP(r), 0)
  );

  const digitalRevenues = 0;   // TODO: provide spec when available
  const revenue         = processingRevenues + issuanceRevenues + digitalRevenues;

  // ── Processing Cost ───────────────────────────────────────────
  // Personnel: GL 6030x mapped to COGS
  const personnel = sumOpExpense(opexRows, r =>
    String(r.glAccountGroup || '').startsWith('6030') &&
    mappingIs(r, 'COGS') &&
    r.companyCode === compCode
  );

  // SLA cross-charge (from MC setup fees billed to DP)
  const sla = asExpense(sumMasriaSetupSLA(masriaSalesRows));

  // InfoSec & Technology OpEx: (Key=6, NOT personnel, COGS-mapped) + (Key=5, excl 50601000) – SLA
  const infoSecOpEx =
    sumOpExpense(opexRows, r =>
      keyIs(r, 6) &&
      !String(r.glAccountGroup || '').startsWith('6030') &&
      r.accountParent === DP_OPEX_PARENT &&
      mappingIs(r, 'COGS') &&
      r.companyCode === compCode
    ) +
    sumTBExpense(tbISRows, r => keyIs(r, 5) && r.account !== 50601000) - sla;

  const processingCost        = personnel + infoSecOpEx + sla;
  const processingGrossProfit = processingRevenues + processingCost;
  const processingGPM         = processingRevenues ? processingGrossProfit / processingRevenues : 0;

  // ── Issuance Cost (GL 50601000) ───────────────────────────────
  const issuanceCost        = sumTBExpense(tbISRows, r => r.account === 50601000);
  const issuanceGrossProfit = issuanceRevenues + issuanceCost;
  const issuanceGPM         = issuanceRevenues ? issuanceGrossProfit / issuanceRevenues : 0;

  // ── Total Gross Profit ────────────────────────────────────────
  const totalGrossProfit = processingGrossProfit + issuanceGrossProfit + digitalRevenues;
  const totalGPM         = revenue ? totalGrossProfit / revenue : 0;

  // ── Digital ───────────────────────────────────────────────────
  const productDevCost     = sumOpExpense(opexRows, r =>
    r.ccCode === 1210221100 && mappingIs(r, 'S&M') && r.companyCode === compCode
  );
  const digitalGrossProfit = digitalRevenues + productDevCost;
  const digitalGPM         = digitalRevenues ? digitalGrossProfit / digitalRevenues : 0;

  // ── SG&A (Key=6, S&M + G&A mapped) ───────────────────────────
  const sgaFilter = r => keyIs(r,6) && (mappingIs(r,'S&M')||mappingIs(r,'G&A')) && r.accountParent===DP_OPEX_PARENT && r.companyCode===compCode;
  const sga = sumOpExpense(opexRows, sgaFilter);
  const smFilter = r => sgaFilter(r) && mappingIs(r,'S&M');
  const sm = sumOpExpense(opexRows, smFilter);
  const smPersonnel = sumOpExpense(opexRows, r => smFilter(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const smOther     = sm - smPersonnel;
  const gaFilter = r => sgaFilter(r) && mappingIs(r,'G&A');
  const ga = sumOpExpense(opexRows, gaFilter);
  const gaPersonnel = sumOpExpense(opexRows, r => gaFilter(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const gaOther     = ga - gaPersonnel;

  const ebitda  = totalGrossProfit + sga;
  const ebitdaM = revenue ? ebitda / revenue : 0;

  // ── D&A ───────────────────────────────────────────────────────
  const grossDA = sumTBExpense(tbISRows, r => {
    const t = String(r.accountType || '').toLowerCase();
    return (t === 'amortization' || t === 'depreciation') && r.account !== 61601020;
  });
  const rouDA   = sumTBExpense(tbISRows, r => r.account === 61601020);
  const totalDA = grossDA + rouDA;

  // ── Below EBITDA ──────────────────────────────────────────────
  const financialExpenses = sumTBExpense(tbISRows, r => parentIncludes(r, 'financial expenses'));
  const leaseInterest2F   = sumTBExpense(tbISRows, r => r.account === 61901060);
  const otherIncome       = sumTBIncome(tbISRows,  r => r.account === 49901010);
  const creditInterest    = sumTBIncome(tbISRows,  r => r.account === 61901030);
  const solidarity        = 0;
  const provisions        = sumTBExpense(tbISRows, r => r.account === 69001500);
  const unrealizedFX      = sumTB(tbISRows, r => r.account === 70201000);
  const realizedFX        = sumTB(tbISRows, r => r.account === 70201010);

  // ── EBT ───────────────────────────────────────────────────────
  const ebt =
    ebitda + totalDA + financialExpenses + leaseInterest2F +
    otherIncome + creditInterest + solidarity + provisions +
    unrealizedFX + realizedFX;
  const ebtM = revenue ? ebt / revenue : 0;

  // ── Tax ───────────────────────────────────────────────────────
  const incomeTax   = sumTBExpense(tbISRows, r => r.account === 69001100);
  const deferredTax = sumTBExpense(tbISRows, r => r.account === 69001600);
  const netProfit   = ebt + incomeTax + deferredTax;
  const netM        = revenue ? netProfit / revenue : 0;

  return {
    processingRevenues, issuanceRevenues, digitalRevenues, revenue,
    personnel, infoSecOpEx, sla, processingCost,
    processingGrossProfit, processingGPM,
    issuanceCost, issuanceGrossProfit, issuanceGPM,
    totalGrossProfit, totalGPM,
    productDevCost, digitalGrossProfit, digitalGPM,
    sga, sm, smPersonnel, smOther, ga, gaPersonnel, gaOther,
    ebitda, ebitdaM,
    grossDA, rouDA, totalDA,
    financialExpenses, leaseInterest2F,
    otherIncome, creditInterest, solidarity,
    provisions, unrealizedFX, realizedFX,
    ebt, ebtM, incomeTax, deferredTax, netProfit, netM,
  };
}

// ── Build IS for all periods ───────────────────────────────────
function buildMdpIS(entityFolder, filters) {
  const compCode = entityCompanyCode(entityFolder);  // '1200'
  const tbIS     = STATE.tbRows.filter(r =>
    r.entityFolder === entityFolder && r.bsOrPL === 'IS'
  );
  const opex = STATE.opexRows.filter(r => r.companyCode === compCode);

  const salesEntityFolders = ['mdp', 'modupay DP'];
  const masriaFolders      = ['Masria Cards', 'modupay Cards'];
  const sales       = (STATE.salesRows || []).filter(r => salesEntityFolders.includes(r.entityFolder));
  const masriaSales = (STATE.salesRows || []).filter(r => masriaFolders.includes(r.entityFolder));

  const periods = ['ytd', 'standalone', 'splm', 'ytdBudget', 'sply'];
  const result  = {};
  for (const p of periods) {
    const tbP         = getStatementTBRows(tbIS,  p, filters);
    const opP         = getPeriodRows(opex, p, filters);
    const salesP      = getPeriodRows(sales, p, filters);
    const masriaSalesP = getPeriodRows(masriaSales, p, filters);
    result[p]         = computeMdpIS(tbP, opP, compCode, masriaSalesP, salesP);
  }

  // Override ytdBudget with actual budget file data (EGP)
  if (typeof getBudgetISData === 'function') {
    const budgetIS = getBudgetISData(entityFolder, filters.year, filters.month);
    const hasData  = Object.values(budgetIS).some(v => typeof v === 'number' && v !== 0);
    if (hasData) result.ytdBudget = budgetIS;
  }

  // ── USD versions ────────────────────────────────────────────────
  // TB rows: use getPeriodRows (all months 1..M with balanceOfMonth per row)
  // so each month is converted by its own FX rate. OpEx & Sales already per-month.

  // YTD USD
  const tbYTD_USD    = getPeriodRows(tbIS, 'ytd', filters);
  const opYTD        = getPeriodRows(opex, 'ytd', filters);
  const salesYTD     = getPeriodRows(sales, 'ytd', filters);
  const mSalesYTD    = getPeriodRows(masriaSales, 'ytd', filters);
  result._ytdUSD     = computeMdpIS_USD(tbYTD_USD, opYTD, compCode, mSalesYTD, salesYTD);

  // Standalone USD
  const tbSA_USD     = getPeriodRows(tbIS, 'standalone', filters);
  const opSA         = getPeriodRows(opex, 'standalone', filters);
  const salesSA      = getPeriodRows(sales, 'standalone', filters);
  const mSalesSA     = getPeriodRows(masriaSales, 'standalone', filters);
  result._standaloneUSD = computeMdpIS_USD(tbSA_USD, opSA, compCode, mSalesSA, salesSA);

  // SPLM USD
  const tbSPLM_USD   = getPeriodRows(tbIS, 'splm', filters);
  const opSPLM       = getPeriodRows(opex, 'splm', filters);
  const salesSPLM    = getPeriodRows(sales, 'splm', filters);
  const mSalesSPLM   = getPeriodRows(masriaSales, 'splm', filters);
  result._splmUSD    = computeMdpIS_USD(tbSPLM_USD, opSPLM, compCode, mSalesSPLM, salesSPLM);

  // SPLY USD
  const tbSPLY_USD   = getPeriodRows(tbIS, 'sply', filters);
  const opSPLY       = getPeriodRows(opex, 'sply', filters);
  const salesSPLY    = getPeriodRows(sales, 'sply', filters);
  const mSalesSPLY   = getPeriodRows(masriaSales, 'sply', filters);
  result._splyUSD    = computeMdpIS_USD(tbSPLY_USD, opSPLY, compCode, mSalesSPLY, salesSPLY);

  result._entity   = entityFolder;
  result._isMasria = false;
  return result;
}

// ── Build BS ───────────────────────────────────────────────────
function buildMdpBS(entityFolder, year, month) {
  return buildEntityBS(entityFolder, year, month, DP_BS_STRUCTURE);
}
