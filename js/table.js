'use strict';
/* ============================================================
   TABLE.JS — OpEx detail table (sortable, searchable, paged)
   ============================================================ */

const TABLE_COLS = [
  { key: 'companyCode',    label: 'Company',    sortable: true  },
  { key: 'month',          label: 'Month',      sortable: true  },
  { key: 'year',           label: 'Year',       sortable: true  },
  { key: 'postingDate',    label: 'Date',       sortable: true  },
  { key: 'documentNumber', label: 'Doc #',      sortable: true  },
  { key: 'accountName',    label: 'Account',    sortable: true  },
  { key: 'opexCategory',   label: 'Category',   sortable: true  },
  { key: 'ccName',         label: 'Cost Center',sortable: true  },
  { key: 'department',     label: 'Department', sortable: true  },
  { key: 'text',           label: 'Description',sortable: false },
  { key: 'amount',         label: 'Amount',     sortable: true  },
];

// Category badge HTML
function catBadge(cat) {
  const map = {
    'Personnel':       'cat-personnel',
    'Industrial & SG&P': 'cat-industrial',
    'Other OpEx':      'cat-other',
    'Bond Interest':   'cat-bond',
  };
  const cls = map[cat] || 'cat-other';
  return `<span class="cat-badge ${cls}">${escHtml(cat)}</span>`;
}

function renderOpExTable() {
  const container = document.getElementById('opex-table-container');
  if (!container) return;

  const { year, month } = STATE.filters;
  if (!year || !month) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Select a year and month to view OpEx detail</div></div>';
    return;
  }

  // Filter rows
  let rows = STATE.opexRows.filter(r => {
    const y = parseInt(year);
    const m = parseInt(month);
    return r.year === y && r.month === m;
  });

  // Entity filter — map entityFolder name → companyCode
  // entityFolder 'Masria Cards' → companyCode '1000'
  // entityFolder 'mdp'          → companyCode '1200'
  const entityFilter = STATE.tableEntity || STATE.filters.company;
  if (entityFilter) {
    const prefix = (ENTITY_UID_PREFIX || {})[entityFilter];
    const targetCode = prefix === '10' ? '1000' : prefix === '12' ? '1200' : null;
    rows = rows.filter(r =>
      r.entityFolder === entityFilter ||
      (targetCode && r.companyCode === targetCode)
    );
  }

  // Category chip filter
  if (STATE.tableCategory) {
    rows = rows.filter(r => r.opexCategory === STATE.tableCategory);
  }

  // Account Parent filter
  if (STATE.tableAccountParent) {
    rows = rows.filter(r =>
      String(r.accountParent || '').toLowerCase()
        .includes(STATE.tableAccountParent.toLowerCase())
    );
  }

  // Search filter
  const search = STATE.tableSearch.toLowerCase().trim();
  if (search) {
    rows = rows.filter(r => {
      return (
        String(r.text || '').toLowerCase().includes(search) ||
        String(r.accountName || '').toLowerCase().includes(search) ||
        String(r.ccName || '').toLowerCase().includes(search) ||
        String(r.department || '').toLowerCase().includes(search) ||
        String(r.opexCategory || '').toLowerCase().includes(search) ||
        String(r.documentNumber || '').includes(search) ||
        String(r.amount || '').includes(search)
      );
    });
  }

  // Sort
  const { col, dir } = STATE.tableSort;
  rows.sort((a, b) => {
    let va = a[col], vb = b[col];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const total    = rows.length;
  const pageSize = STATE.tablePageSize;
  const page     = Math.min(STATE.tablePage, Math.ceil(total / pageSize) || 1);
  const start    = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const totalAmt = rows.reduce((s, r) => s + (r.amount || 0), 0);

  // Build header
  let html = `
<div class="stmt-table-wrap">
<table class="detail-table">
<thead><tr>`;

  for (const col of TABLE_COLS) {
    let cls = '';
    if (col.sortable) {
      if (STATE.tableSort.col === col.key) {
        cls = ` class="sort-${STATE.tableSort.dir}"`;
      }
    }
    const sortAttr = col.sortable ? ` data-sort="${col.key}"` : '';
    html += `<th${cls}${sortAttr}>${escHtml(col.label)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const row of pageRows) {
    const amtCls = row.amount < 0 ? ' negative' : row.amount > 0 ? ' positive' : '';
    html += `<tr>
      <td>${escHtml(row.companyCode || '')}</td>
      <td>${MONTH_NAMES[row.month] || row.month}</td>
      <td>${row.year}</td>
      <td>${escHtml(row.postingDate || '')}</td>
      <td style="font-family:monospace;font-size:11px">${row.documentNumber || ''}</td>
      <td title="${escHtml(row.accountName || '')}">${escHtml((row.accountName || '').substring(0, 30))}</td>
      <td>${catBadge(row.opexCategory)}</td>
      <td title="${escHtml(row.ccName || '')}">${escHtml((row.ccName || '').substring(0, 25))}</td>
      <td title="${escHtml(row.department || '')}">${escHtml((row.department || '').substring(0, 20))}</td>
      <td title="${escHtml(row.text || '')}">${escHtml((row.text || '').substring(0, 40))}</td>
      <td class="amount-cell${amtCls}">${FMT.amount(row.amount)}</td>
    </tr>`;
  }

  // Total row
  html += `<tr style="font-weight:800;background:var(--surface2)">
    <td colspan="10" style="text-align:right;padding-right:12px">Total (${total.toLocaleString()} rows)</td>
    <td class="amount-cell">${FMT.amount(totalAmt)}</td>
  </tr>`;

  html += '</tbody></table></div>';

  // Pagination
  const totalPages = Math.ceil(total / pageSize) || 1;
  html += buildPagination(page, totalPages, total, start + 1, Math.min(start + pageSize, total));

  container.innerHTML = html;

  // Wire sort
  container.querySelectorAll('[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const newCol = th.dataset.sort;
      if (STATE.tableSort.col === newCol) {
        STATE.tableSort.dir = STATE.tableSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        STATE.tableSort.col = newCol;
        STATE.tableSort.dir = 'desc';
      }
      STATE.tablePage = 1;
      renderOpExTable();
    });
  });
}

function buildPagination(page, total, rowCount, from, to) {
  if (total <= 1) return '';
  let html = `<div class="pagination">
    <div class="pagination-info">Showing ${from}–${to} of ${rowCount.toLocaleString()} rows</div>
    <div class="pagination-btns">`;

  html += `<button class="page-btn" onclick="changePage(1)" ${page===1?'disabled':''}>«</button>`;
  html += `<button class="page-btn" onclick="changePage(${page-1})" ${page===1?'disabled':''}>‹</button>`;

  const start = Math.max(1, page - 2);
  const end   = Math.min(total, page + 2);
  for (let p = start; p <= end; p++) {
    html += `<button class="page-btn ${p===page?'active':''}" onclick="changePage(${p})">${p}</button>`;
  }

  html += `<button class="page-btn" onclick="changePage(${page+1})" ${page===total?'disabled':''}>›</button>`;
  html += `<button class="page-btn" onclick="changePage(${total})" ${page===total?'disabled':''}>»</button>`;
  html += '</div></div>';
  return html;
}

function changePage(p) {
  STATE.tablePage = p;
  renderOpExTable();
}

// ── Category chip filter ──────────────────────────────────────
function renderCategoryChips() {
  const wrap = document.getElementById('category-chips');
  if (!wrap) return;

  const cats = ['', 'Personnel', 'Industrial & SG&P', 'Other OpEx', 'Bond Interest'];
  wrap.innerHTML = cats.map(c => {
    const active = STATE.tableCategory === c;
    const label  = c || 'All Categories';
    return `<button class="filter-chip ${active ? 'active' : ''}" onclick="setCategoryFilter('${c}')">${escHtml(label)}</button>`;
  }).join('');
}

function setCategoryFilter(cat) {
  STATE.tableCategory = cat;
  STATE.tablePage = 1;
  renderCategoryChips();
  renderOpExTable();
}

// ── Init table tab ────────────────────────────────────────────
function initTableTab() {
  renderCategoryChips();
  renderOpExFilterBar();

  const searchInput = document.getElementById('table-search');
  if (searchInput && !searchInput._initDone) {
    searchInput._initDone = true;
    searchInput.addEventListener('input', () => {
      STATE.tableSearch = searchInput.value;
      STATE.tablePage = 1;
      renderOpExTable();
    });
  }
}

// ── Build Account Parent + Entity filter bar ───────────────────
function renderOpExFilterBar() {
  const wrap = document.getElementById('opex-extra-filters');
  if (!wrap) return;

  // Collect unique account parents from loaded data
  const parents = [...new Set(
    STATE.opexRows
      .map(r => r.accountParent)
      .filter(p => p && p.trim())
  )].sort();

  // Entity options
  const entityOpts = ENTITY_FOLDERS.map(ef => {
    const name = (() => {
      const raw = MASTER.entity[ef]?.companyName || ef;
      return raw === 'Masria Cards' ? 'modupay Cards'
           : raw === 'mdp'          ? 'modupay DP'
           : raw;
    })();
    const sel = STATE.tableEntity === ef ? 'selected' : '';
    return `<option value="${escHtml(ef)}" ${sel}>${escHtml(name)}</option>`;
  }).join('');

  // Account parent options
  const parentOpts = parents.map(p => {
    const sel = STATE.tableAccountParent === p ? 'selected' : '';
    return `<option value="${escHtml(p)}" ${sel}>${escHtml(p)}</option>`;
  }).join('');

  wrap.innerHTML = `
    <div class="opex-filter-group">
      <label class="opex-filter-label">Entity</label>
      <select class="opex-filter-select" id="opex-entity-filter" onchange="setOpexEntityFilter(this.value)">
        <option value="">All Entities</option>
        ${entityOpts}
      </select>
    </div>
    <div class="opex-filter-group">
      <label class="opex-filter-label">Account Parent</label>
      <select class="opex-filter-select" id="opex-parent-filter" onchange="setOpexParentFilter(this.value)">
        <option value="">All Account Parents</option>
        ${parentOpts}
      </select>
    </div>
    <button class="opex-filter-clear" onclick="clearOpexFilters()">✕ Clear Filters</button>`;
}

function setOpexEntityFilter(val) {
  STATE.tableEntity = val;
  STATE.tablePage   = 1;
  renderOpExTable();
  renderOpExPivot();
}

function setOpexParentFilter(val) {
  STATE.tableAccountParent = val;
  STATE.tablePage           = 1;
  renderOpExTable();
  renderOpExPivot();
}

function clearOpexFilters() {
  STATE.tableEntity        = '';
  STATE.tableAccountParent = '';
  STATE.tableCategory      = '';
  STATE.tableSearch        = '';
  STATE.tablePage          = 1;
  const s = document.getElementById('table-search');
  if (s) s.value = '';
  renderCategoryChips();
  renderOpExFilterBar();
  renderOpExTable();
  renderOpExPivot();
}
