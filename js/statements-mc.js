'use strict';
/* ============================================================
   STATEMENTS-MC.JS — modupay Cards (companyCode 1000)
   IS (P&L) computation + BS structure
   Depends on: statements-shared.js
   ============================================================ */

// ── MC BS Structure ───────────────────────────────────────────
// Note: Fixed assets (net) = "Fixed Assets" + "Intangible assets (net)" parents.
const MC_BS_STRUCTURE = {
  nonCurrentAssets: {
    label: 'Non-Current Assets',
    lines: [
      { label: 'Fixed assets (net)',           parentMatch: 'Fixed Assets' },
      { label: 'Right of use assets',          parentMatch: 'Right of Use Assets'         },
      { label: 'Projects under construction',  parentMatch: 'Projects Under Construction' },
      { label: 'Intangible assets (net)',       parentMatch: 'Intangible Assets'           },
      { label: 'Financial investments',         parentMatch: 'Financial Investments'       },
    ],
  },
  currentAssets: {
    label: 'Current Assets',
    lines: [
      { label: 'Inventory',                    parentMatch: 'Inventory'                         },
      { label: "Account's receivables",        parentMatch: "Account's receivables"             },
      { label: 'Debtors and other debit bal.', parentMatch: 'Debtors and other debit balances'  },
      { label: 'Due from Related parties',     parentMatch: 'Due from Related parties'          },
      { label: 'Advances to suppliers',        parentMatch: 'Advances to Suppliers', matchMode: 'exact' },
      { label: 'Cash on hand and at banks',    parentMatch: 'Cash'                              },
    ],
  },
  equity: {
    label: 'Equity',
    lines: [
      { label: 'Issued and paid-up Capital',   parentMatch: 'Issued and paid-up Capital'    },
      { label: 'Legal Reserve',                parentMatch: 'Legal Reserve'    },
      { label: 'Retained Earnings',            parentMatch: 'Retained Earnings'},
      { label: 'Treasury stock',               parentMatch: 'Treasury Stock'   },
      { label: 'OCI',                          parentMatch: 'OCI'              },
      { label: 'Net profit for the year',      sourceType:  'isNetProfit'      },
    ],
  },
  nonCurrentLiabilities: {
    label: 'Non-Current Liabilities',
    lines: [
      { label: 'Deferred tax liability',       parentMatch: 'Deferred Tax Liability' },
      { label: 'Long-term financial lease',    parentMatch: 'Long-term financial lease'        },
      { label: 'Long-Term Borrowing',          parentMatch: 'Long Term Borrowing'    },
    ],
  },
  currentLiabilities: {
    label: 'Current Liabilities',
    lines: [
      { label: "Banks' overdrafts",            parentMatch: 'Banks’ overdrafts'        },
      { label: 'Provisions',                   parentMatch: 'Provisions'             },
      { label: 'Short-term loans',             parentMatch: 'Short-term loans'       },
      { label: 'Suppliers',                    parentMatch: 'Suppliers', matchMode: 'exact' },
      { label: 'Creditors and other credit',   parentMatch: 'Creditors'              },
      { label: 'Due to Related parties',       parentMatch: 'Due To Related Parties' },
      { label: 'Short-term lease liability',   parentMatch: 'Short Term Lease'       },
      { label: 'Dividends Payable',            parentMatch: 'Dividends Payable'      },
      { label: 'Income Tax Payable',           parentMatch: 'Income Tax Payable'     },
      { label: "Takaful contribution's",       parentMatch: 'Takaful'                },
    ],
  },
};

function getMCBSStructure() { return MC_BS_STRUCTURE; }

// ── MC IS Computation ─────────────────────────────────────────
const MC_OPEX_PARENT = 'G&A, Industrial, Selling & Marketing Expenses';

/**
 * Compute modupay Cards P&L for a single period.
 * @param {Array}  tbISRows   - TB rows for IS, period-sliced
 * @param {Array}  opexRows   - OpEx rows for this entity
 * @param {string} compCode   - '1000'
 * @param {Array}  salesRows  - Sales rows for MC entity folders
 */
function computeMasriaIS(tbISRows, opexRows, compCode, salesRows) {

  // ── Revenue (Key=4, excl 49901010) ───────────────────────────
  const revenue = sumTBIncome(tbISRows, r => keyIs(r, 4) && r.account !== 49901010);

  // ── COGS ─────────────────────────────────────────────────────
  const consumptionCost = sumTBExpense(tbISRows, r => keyIs(r, 5));

  const industrialPayroll = sumOpExpense(opexRows, r =>
    String(r.glAccountGroup || '').startsWith('6030') &&
    mappingIs(r, 'COGS') &&
    r.companyCode === compCode &&
    r.accountParent === MC_OPEX_PARENT
  );

  const manufacturingCost = sumOpExpense(opexRows, r =>
    keyIs(r, 6) &&
    !String(r.glAccountGroup || '').startsWith('6030') &&
    mappingIs(r, 'COGS') &&
    r.companyCode === compCode &&
    r.accountParent === MC_OPEX_PARENT
  );

  const sla   = asExpense(sumMasriaSetupSLA(salesRows));
  const cogs  = consumptionCost + industrialPayroll + manufacturingCost + sla;
  const grossProfit = revenue + cogs;
  const gpm   = revenue ? grossProfit / revenue : 0;

  // ── S&M ───────────────────────────────────────────────────────
  const smFilter = r => keyIs(r,6) && mappingIs(r,'S&M') && r.companyCode===compCode && r.accountParent===MC_OPEX_PARENT;
  const sm = sumOpExpense(opexRows, smFilter);
  const smPersonnel = sumOpExpense(opexRows, r => smFilter(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const smOther     = sm - smPersonnel;

  // ── G&A ───────────────────────────────────────────────────────
  const gaFilter = r => keyIs(r,6) && mappingIs(r,'G&A') && r.companyCode===compCode && r.accountParent===MC_OPEX_PARENT;
  const ga = sumOpExpense(opexRows, gaFilter);
  const gaPersonnel = sumOpExpense(opexRows, r => gaFilter(r) && String(r.glAccountGroup||'').startsWith('6030'));
  const gaOther     = ga - gaPersonnel;

  const ebitda  = grossProfit + sm + ga;
  const ebitdaM = revenue ? ebitda / revenue : 0;

  // ── D&A ───────────────────────────────────────────────────────
  const grossDA = sumTBExpense(tbISRows, r =>
    parentIncludes(r, 'fixed assets depreciation')
  );
  const rouDA   = sumTBExpense(tbISRows, r =>
    parentIncludes(r, 'right of use assets amortization')
  );
  const rechargeSLA = computeRechargeSLA(salesRows);
  const totalDA     = grossDA + rouDA + rechargeSLA;

  // ── Financial Items ───────────────────────────────────────────
  const financialExpenses = sumTBExpense(tbISRows, r => parentIncludes(r, 'financial expenses'));
  const leaseLiabInt      = sumTBExpense(tbISRows, r => parentIncludes(r, 'lease liabilities interest'));
  const creditInterest    = sumTBIncome(tbISRows,  r => parentIncludes(r, 'credit interest'));
  const leaseBackcharge   = sumTBIncome(tbISRows,  r =>
    r.account === 61601099 || r.account === 61901099
  );
  const otherIncome       = sumTBIncome(tbISRows,  r =>
    parentIncludes(r, 'other income') &&
    r.account !== 61601099 && r.account !== 61901099
  );
  const capitalGain       = sumTBIncome(tbISRows,  r => parentIncludes(r, 'capital gain'));

  // ── Provisions ────────────────────────────────────────────────
  const provisionsBal = sumTBExpense(tbISRows, r =>
    [69001090, 69001400, 69001500].includes(r.account)
  );
  const provisionsDebit = tbISRows
    .filter(r => [69001040, 69001060].includes(r.account))
    .reduce((s, r) => {
      const useYTD = tbISRows._periodKey === 'ytd' || tbISRows._periodKey === 'sply';
      return s - Math.abs(useYTD ? (r.adjustedDebit || 0) : (r.debitOfMonth || 0));
    }, 0);
  const provisions    = provisionsBal + provisionsDebit;
  const provisionsNLR = asIncome(sumTBCredit(tbISRows, r => r.account === 69001040));
  const takaful       = sumTBExpense(tbISRows, r => r.account === 69001200);

  // ── FX ────────────────────────────────────────────────────────
  const unrealizedFX = sumTB(tbISRows, r =>
    String(r.accountName || '').toLowerCase().includes('currency valuation-unrealized')
  );
  const realizedFX   = sumTB(tbISRows, r =>
    String(r.accountName || '').toLowerCase().includes('currency valuation-realized')
  );

  // ── EBT ───────────────────────────────────────────────────────
  const ebt =
    ebitda + totalDA + financialExpenses + leaseLiabInt +
    creditInterest + leaseBackcharge + otherIncome + capitalGain +
    provisions + provisionsNLR + takaful + unrealizedFX + realizedFX;
  const ebtM = revenue ? ebt / revenue : 0;

  // ── Tax ───────────────────────────────────────────────────────
  const incomeTax   = sumTBExpense(tbISRows, r => r.account === 69001100);
  const deferredTax = sumTBExpense(tbISRows, r => r.account === 69001600);
  const netProfit   = ebt + incomeTax + deferredTax;
  const netM        = revenue ? netProfit / revenue : 0;

  return {
    revenue, consumptionCost, industrialPayroll, manufacturingCost, sla, cogs,
    grossProfit, gpm,
    sm, smPersonnel, smOther, ga, gaPersonnel, gaOther,
    ebitda, ebitdaM,
    grossDA, rouDA, rechargeSLA, totalDA,
    financialExpenses, leaseLiabInt, creditInterest,
    leaseBackcharge, otherIncome, capitalGain,
    provisions, provisionsNLR, takaful,
    unrealizedFX, realizedFX,
    ebt, ebtM, incomeTax, deferredTax, netProfit, netM,
  };
}

// ── Build IS for all periods ───────────────────────────────────
function buildMasriaIS(entityFolder, filters) {
  const compCode = entityCompanyCode(entityFolder);  // '1000'
  const tbIS = STATE.tbRows.filter(r =>
    r.entityFolder === entityFolder && r.bsOrPL === 'IS'
  );
  const opex = STATE.opexRows.filter(r => r.companyCode === compCode);
  const salesEntityFolders = ['Masria Cards', 'modupay Cards'];
  // Mirrors _getSalesRows(mcFolders, year, month, { includeIntercompany: true })
  // from sales-shared.js — includes ALL rows (intercompany included) with
  // _salesEntityAllowed applied, so revenue matches Revenues tab exactly.
  const sales = (STATE.salesRows || []).filter(r =>
    salesEntityFolders.includes(r.entityFolder) &&
    (typeof _salesEntityAllowed !== 'function' || _salesEntityAllowed(r.entityFolder))
    // includeIntercompany: true → no code-1001090 exclusion
  );

  const periods = ['ytd', 'standalone', 'splm', 'ytdBudget', 'sply'];
  const result  = {};
  for (const p of periods) {
    const tbP    = getStatementTBRows(tbIS,  p, filters);
    const opP    = getPeriodRows(opex,  p, filters);
    const salesP = getPeriodRows(sales, p, filters);
    result[p]    = computeMasriaIS(tbP, opP, compCode, salesP);
  }

  // Override ytdBudget with actual budget file data (EGP)
  if (typeof getBudgetISData === 'function') {
    const budgetIS = getBudgetISData(entityFolder, filters.year, filters.month);
    const hasData  = Object.values(budgetIS).some(v => typeof v === 'number' && v !== 0);
    if (hasData) result.ytdBudget = budgetIS;
  }

  // ── USD versions ────────────────────────────────────────────────
  // For TB rows: use getPeriodRows (all months 1..M, each with balanceOfMonth)
  // so each month is converted by its own FX rate before summing.
  // OpEx and Sales already come from getPeriodRows → already per-month → correct.

  // YTD USD: all months 1..M, balanceOfMonth ÷ each month's FX
  const tbYTD_USD    = getPeriodRows(tbIS, 'ytd', filters);
  const opYTD        = getPeriodRows(opex, 'ytd', filters);
  const salesYTD     = getPeriodRows(sales,'ytd', filters);
  result._ytdUSD     = computeMasriaIS_USD(tbYTD_USD, opYTD, compCode, salesYTD);

  // Standalone USD: current month balanceOfMonth ÷ that month's FX
  const tbSA_USD     = getPeriodRows(tbIS, 'standalone', filters);
  const opSA         = getPeriodRows(opex, 'standalone', filters);
  const salesSA      = getPeriodRows(sales,'standalone', filters);
  result._standaloneUSD = computeMasriaIS_USD(tbSA_USD, opSA, compCode, salesSA);

  // SPLM USD: same month prior year ÷ that month's FX
  const tbSPLM_USD   = getPeriodRows(tbIS, 'splm', filters);
  const opSPLM       = getPeriodRows(opex, 'splm', filters);
  const salesSPLM    = getPeriodRows(sales,'splm', filters);
  result._splmUSD    = computeMasriaIS_USD(tbSPLM_USD, opSPLM, compCode, salesSPLM);

  // SPLY USD: all months 1..M in prior year, balanceOfMonth ÷ each month's FX
  const tbSPLY_USD   = getPeriodRows(tbIS, 'sply', filters);
  const opSPLY       = getPeriodRows(opex, 'sply', filters);
  const salesSPLY    = getPeriodRows(sales,'sply', filters);
  result._splyUSD    = computeMasriaIS_USD(tbSPLY_USD, opSPLY, compCode, salesSPLY);

  result._entity   = entityFolder;
  result._isMasria = true;
  return result;
}

// ── Build BS ───────────────────────────────────────────────────
function buildMasriaBS(entityFolder, year, month) {
  return buildEntityBS(entityFolder, year, month, MC_BS_STRUCTURE);
}
