'use strict';
/* ============================================================
   BS-STRUCTURE.JS
   Controls the Balance Sheet layout.
   Each line is sourced from TB rows where Account Parent contains
   the listed parentMatch text.
   ============================================================ */

const BS_STRUCTURE_CONFIG = {
  nonCurrentAssets: {
    label: 'Non-Current Assets',
    source: 'TB BS asset rows, raw adjustedBalance',
    lines: [
      { label: 'Fixed assets (net)', parentMatch: 'Fixed Assets' },
      { label: 'Right of use assets', parentMatch: 'Right of Use Assets' },
      { label: 'Projects under construction', parentMatch: 'Projects Under Construction' },
      { label: 'Intangible assets (net)', parentMatch: 'Intangible Assets' },
      { label: 'Financial investments', parentMatch: 'Financial Investments' },
    ],
  },
  currentAssets: {
    label: 'Current Assets',
    source: 'TB BS asset rows, raw adjustedBalance',
    lines: [
      { label: 'Inventory', parentMatch: 'Inventory' },
      { label: "Account's receivables", parentMatch: "Account's receivables" },
      { label: 'Debtors and other debit bal.', parentMatch: 'Debtors and other debit balances' },
      { label: 'Due from Related parties', parentMatch: 'Due from Related parties' },
      { label: 'Advances to suppliers', parentMatch: "Advances to Suppliers", matchMode: 'exact' },
      { label: 'Cash on hand and at banks', parentMatch: 'Cash' },
    ],
  },
  equity: {
    label: 'Equity',
    source: 'TB BS equity rows, adjustedBalance negated',
    lines: [
      { label: 'Issued and paid-up Capital', parentMatch: 'Issued and paid-up Capital' },
      { label: 'Legal Reserve', parentMatch: 'Legal Reserve' },
      { label: 'Retained Earnings', parentMatch: 'Retained Earnings' },
      { label: 'Treasury stock', parentMatch: 'Treasury Stock' },
      { label: 'OCI', parentMatch: 'OCI' },
      { label: 'Net profit for the year', sourceType: 'isNetProfit' },
    ],
  },
  nonCurrentLiabilities: {
    label: 'Non-Current Liabilities',
    source: 'TB BS liability rows, adjustedBalance negated',
    lines: [
      { label: 'Deferred tax liability', parentMatch: 'Deferred tax liability' },
      { label: 'Long-term financial lease', parentMatch: 'Long-term financial lease' },
      { label: 'Long-Term Borrowing', parentMatch: 'Short-term loans' },
    ],
  },
  currentLiabilities: {
    label: 'Current Liabilities',
    source: 'TB BS liability rows, adjustedBalance negated',
    lines: [
      { label: "Banks' overdrafts", parentMatch: "Banks’ overdrafts" },
      { label: 'Provisions', parentMatch: 'Provisions' },
      { label: 'Short-term loans', parentMatch: 'Short Term Loans' },
      { label: 'Suppliers', parentMatch: "Suppliers", matchMode: 'exact' },
      { label: 'Creditors and other credit', parentMatch: 'Creditors' },
      { label: 'Due to Related parties', parentMatch: 'Due To Related Parties' },
      { label: 'Short-term lease liability', parentMatch: 'Short Term Lease' },
      { label: 'Dividends Payable', parentMatch: 'Dividends Payable' },
      { label: 'Income Tax Payable', parentMatch: 'Income Tax Payable' },
      { label: "Takaful contribution's", parentMatch: 'Takaful' },
    ],
  },
};

function getBSStructure() {
  return BS_STRUCTURE_CONFIG;
}
