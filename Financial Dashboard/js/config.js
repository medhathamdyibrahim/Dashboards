'use strict';
/* ============================================================
   CONFIG.JS — Paths, entity config, STATE, formatters
   ============================================================ */

// ── Entity folders (must match GitHub repo folder names exactly) ──
const ENTITY_FOLDERS = ['Masria Cards', 'mdp'];

// ── Unique ID prefix per entity folder ───────────────────────────
// Unique ID format: [2-digit prefix] + [GL account] + [YYYY] + [MM]
// 10 = Masria Cards (modupay card / company code 1000)
// 12 = mdp          (modupay DP   / company code 1200)
const ENTITY_UID_PREFIX = {
  'Masria Cards': '10',
  'mdp':          '12',
};

// ── Adj entry file mapping ────────────────────────────────────────
const ADJ_FILES = {
  'Masria Cards': 'Masria Adj Entries (OutSAP).xlsx',
  'mdp':          'mdp Adj Entries (OutSAP).xlsx',
};

// ── Accounts that should have adj entries applied ─────────────────
const ACCOUNTS_TO_ADJUST = new Set([
  17101100, 17109200, 17913000, 17913010, 17916000,
  21001000, 24101000, 24102000, 24107000, 24108000,
  24109200, 24301000, 24916000, 24918000, 17301000, 17919100
]);

// ── OpEx excluded accounts ───────────────────────────────────────
const EXCLUDED_ACCOUNTS = new Set([69001500, 69001060, 69001400]);
const INTERCO_OFFSETTING = '22001040';

// ── In-memory lookups ────────────────────────────────────────────
const MASTER = {
  gl:            {},   // keyed by Unique ID string  — time-variant, exact match
  glByAccount:   {},   // keyed by Account string    — fallback (last date wins)
  cc:            {},
  product:       {},
  entity:        {},
  loaded:        false,
};

// Adj entries keyed by entity → uniqueId → row
const ADJ = {};

// ── Month name arrays ────────────────────────────────────────────
const MONTH_NAMES = ['', 'Jan','Feb','Mar','Apr','May','Jun',
                          'Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['', 'January','February','March','April','May','June',
                          'July','August','September','October','November','December'];

// ── Global application state ──────────────────────────────────────
const STATE = {
  tbRows:         [],
  opexRows:       [],
  statements:     {},
  filters: {
    year:    '',
    month:   '',
    company: '',
  },
  exclusions:     {},
  theme:          'light',
  activeTab:      'statements',
  tableSort:      { col: 'amount', dir: 'desc' },
  tableSearch:    '',
  tableCategory:  '',
  tablePage:      1,
  tablePageSize:  100,
  expandedGroups: new Set(),
  charts:         {},
  chartPrefs:     {},
  salesRows:      [],
  salesFilters:   { entity: 'all', year: '', region: '', category: '' },
  pivotBy:        { account: false, cc: false },
  tableEntity:         '',
  tableAccountParent:  '',
  // USD toggle
  usdMode:        false,
  // FX monthly rates: { 'YYYY-MM': rate } (EGP per 1 USD)
  fxRates:        {},
  // Budget P&L data per entity
  budgetPL:       {},
  // Budget Revenues data
  budgetRevenues: {},
  // AR Aging rows (all months, both entities)
  agingRows:      [],
};

// ── Number formatters ─────────────────────────────────────────────
const FMT = {
  // Thousands with sign, 0 decimals — e.g. "(1,234)" or "5,678"
  amount(n) {
    if (n == null || isNaN(n)) return '—';
    if (n === 0) return '—';
    const abs = Math.abs(n);
    const s = Math.round(abs).toLocaleString('en-US');
    return n < 0 ? `(${s})` : s;
  },

  // Same but always show zero
  amountZ(n) {
    if (n == null || isNaN(n)) return '0';
    const abs = Math.abs(n);
    const s = Math.round(abs).toLocaleString('en-US');
    return n < 0 ? `(${s})` : s;
  },

  // Percentage — e.g. "12.3%" or "(4.5%)"
  pct(n) {
    if (n == null || isNaN(n) || !isFinite(n)) return '—';
    const abs = Math.abs(n * 100);
    const s = abs.toFixed(1) + '%';
    return n < 0 ? `(${s})` : s;
  },

  // Compact — e.g. "1.2M" or "(456K)"
  compact(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    let s;
    if (abs >= 1e9)      s = (abs / 1e9).toFixed(1) + 'B';
    else if (abs >= 1e6) s = (abs / 1e6).toFixed(1) + 'M';
    else if (abs >= 1e3) s = (abs / 1e3).toFixed(0) + 'K';
    else                 s = Math.round(abs).toString();
    return n < 0 ? `(${s})` : s;
  },
};

// ── Credentials helpers ───────────────────────────────────────────
function saveCreds(token, username, repo) {
  localStorage.setItem('pnl_creds', JSON.stringify({ token, username, repo }));
}

function loadCreds() {
  try {
    return JSON.parse(localStorage.getItem('pnl_creds') || 'null');
  } catch { return null; }
}

function clearCreds() {
  localStorage.removeItem('pnl_creds');
}

function saveTheme(theme) {
  localStorage.setItem('pnl_theme', theme);
}

function loadTheme() {
  return localStorage.getItem('pnl_theme') || 'light';
}

// ── Show toast notification ───────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:15px">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  const container = document.getElementById('toast-container');
  if (!container) return;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'all 0.25s ease';
    setTimeout(() => el.remove(), 280);
  }, duration);
}

// ── Loading bar helpers ───────────────────────────────────────────
function setLoadingProgress(pct, status, detail = '') {
  const fill   = document.getElementById('loading-bar-fill');
  const stat   = document.getElementById('loading-status');
  const det    = document.getElementById('loading-detail');
  if (fill && pct != null) fill.style.width = Math.min(100, pct) + '%';
  if (stat)  stat.textContent  = status;
  if (det)   det.textContent   = detail;
}

// ── Variance CSS class ────────────────────────────────────────────
function varianceColorClass(value, isExpense) {
  if (value == null || isNaN(value) || value === 0) return 'var-neutral';
  if (isExpense) return value > 0 ? 'var-red' : 'var-green';
  return value > 0 ? 'var-green' : 'var-red';
}

// ── IS line expense check ─────────────────────────────────────────
const EXPENSE_LINES = new Set([
  'cogs','consumptionCost','industrialPayroll','manufacturingCost','sla',
  'sm','ga',
  'totalDA','grossDA','rouDA',
  'financialExpenses','leaseLiabInt','leaseBackcharge',
  'provisions','takaful',
  'incomeTax','deferredTax',
]);
