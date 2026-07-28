'use strict';
/* ============================================================
   PIVOT.JS — Excel-style OpEx Pivot
   ============================================================ */

// ── State ──────────────────────────────────────────────────────
const PIVOT = {
  rowFields: [],
  expanded:  new Set(),
  sortCol:   'curr',
  sortDir:   'desc',
};

const PIVOT_FIELDS = [
  { id: 'account', label: 'GL Account'  },
  { id: 'cc',      label: 'Cost Center' },
  { id: 'mapping', label: 'Mapping'     },
  { id: 'dept',    label: 'Department'  },
];

// ── Account Group Name cache (built once on first use) ─────────
let _groupNameCache = null;

function _buildGroupNameCache() {
  if (_groupNameCache) return;
  _groupNameCache = new Map();  // "6900" → "Provisions"

  const sources = [
    MASTER.glByAccount && Object.entries(MASTER.glByAccount),
    MASTER.gl          && Object.entries(MASTER.gl),
  ].filter(Boolean);

  for (const entries of sources) {
    for (const [acct, meta] of entries) {
      if (!meta.groupNameV1) continue;
      const prefix = String(acct).substring(0, 4);
      if (!_groupNameCache.has(prefix)) {
        _groupNameCache.set(prefix, meta.groupNameV1);
      }
    }
  }
}

function _acctGroupName(prefix4) {
  _buildGroupNameCache();
  return _groupNameCache.get(prefix4) || prefix4;
}

function _acctGroup(account) {
  return String(account || '').substring(0, 4);
}

// ── Period label ───────────────────────────────────────────────
function _pivotPeriodLabel(year, month, isSPLY) {
  const y  = parseInt(year);
  const m  = parseInt(month);
  const yr = isSPLY ? y - 1 : y;
  if (m === 12) return `FY ${yr}`;
  if (m === 6)  return `H1 ${yr}`;
  if (m === 3)  return `Q1 ${yr}`;
  if (m === 9)  return `9M ${yr}`;
  return `YTD ${MONTH_NAMES[m] || m} ${yr}`;
}

// ── Field value for a row ──────────────────────────────────────
function _fieldVal(r, fieldId) {
  switch (fieldId) {
    case 'account': return {
      key:   String(r.account),
      label: r.account + (r.accountName ? ' — ' + r.accountName : ''),
    };
    case 'cc': return {
      key:   String(r.ccCode || '0'),
      label: r.ccCode ? (r.ccCode + (r.ccName ? ' — ' + r.ccName : '')) : 'No CC',
    };
    case 'mapping': return { key: r.mapping || 'Other', label: r.mapping || 'Other' };
    case 'dept':    return { key: r.department || 'Other', label: r.department || 'Other' };
    default:        return { key: '—', label: '—' };
  }
}

// ── Build aggregation map (flat, keyed by path) ────────────────
// Much faster than recursive tree — single pass through rows
function _buildAggMap(rows, fields) {
  const map = new Map();   // pathKey → { label, amount, parentPath, depth, hasChildren }

  for (const r of rows) {
    const pathParts  = [];
    const labelParts = [];

    for (let d = 0; d < fields.length; d++) {
      const fieldId = fields[d];

      if (fieldId === 'account') {
        // Level d: Account Group
        const g4    = _acctGroup(r.account);
        const gKey  = 'grp_' + g4;
        const gLabel = _acctGroupName(g4);
        pathParts.push(gKey);
        labelParts.push(gLabel);
        const gPath = pathParts.join('|||');
        const gParent = pathParts.slice(0,-1).join('|||');

        if (!map.has(gPath)) {
          map.set(gPath, { label: gLabel, amount: 0, parent: gParent, depth: d, hasChildren: true });
        }
        map.get(gPath).amount += (r.amount || 0);

        // Level d+1: Individual Account
        const aKey   = String(r.account);
        const aLabel = r.account + (r.accountName ? ' — ' + r.accountName : '');
        const aPath  = gPath + '|||' + aKey;

        if (!map.has(aPath)) {
          map.set(aPath, { label: aLabel, amount: 0, parent: gPath, depth: d + 1, hasChildren: false });
        }
        map.get(aPath).amount += (r.amount || 0);
        break;  // account is always last
      } else {
        const fv = _fieldVal(r, fieldId);
        pathParts.push(fv.key);
        labelParts.push(fv.label);
        const path   = pathParts.join('|||');
        const parent = pathParts.slice(0,-1).join('|||');

        if (!map.has(path)) {
          map.set(path, { label: fv.label, amount: 0, parent, depth: d, hasChildren: fields[d+1] != null });
        }
        map.get(path).amount += (r.amount || 0);
      }
    }
  }

  return map;
}

// ── Get root-level paths (no parent) ──────────────────────────
function _rootPaths(map) {
  return [...map.keys()].filter(k => !map.get(k).parent);
}

// ── Get children of a path ─────────────────────────────────────
function _childPaths(map, parentPath) {
  return [...map.keys()].filter(k => map.get(k).parent === parentPath);
}

// ── Sort paths by column ───────────────────────────────────────
function _sortPaths(paths, currMap, splyMap) {
  return paths.slice().sort((a, b) => {
    const aC = currMap.get(a)?.amount || 0;
    const bC = currMap.get(b)?.amount || 0;
    const aS = splyMap.get(a) || 0;
    const bS = splyMap.get(b) || 0;
    let av, bv;
    switch (PIVOT.sortCol) {
      case 'curr':   av = aC;     bv = bC;     break;
      case 'sply':   av = aS;     bv = bS;     break;
      case 'var':    av = aC-aS;  bv = bC-bS;  break;
      case 'varPct':
        av = aS ? (aC-aS)/Math.abs(aS) : 0;
        bv = bS ? (bC-bS)/Math.abs(bS) : 0;
        break;
      default: av = aC; bv = bC;
    }
    return PIVOT.sortDir === 'asc' ? av - bv : bv - av;
  });
}

// ── Entity folder → companyCode helper ────────────────────────
function _entityToCode(entityFolder) {
  const prefix = (ENTITY_UID_PREFIX || {})[entityFolder];
  if (prefix === '10') return '1000';
  if (prefix === '12') return '1200';
  return null;
}

// ── Get filtered rows (respects table + pivot filters) ─────────
function _getPivotRows() {
  const { year, month } = STATE.filters;
  if (!year || !month) return { curr: [], sply: [] };
  const m = parseInt(month), y = parseInt(year);

  // Entity filter: prefer tableEntity, fallback to global company filter
  const entityFilter = STATE.tableEntity || STATE.filters.company;
  const targetCode   = entityFilter ? _entityToCode(entityFilter) : null;

  const byComp = r => {
    if (!entityFilter) return true;
    return r.entityFolder === entityFilter || (targetCode && r.companyCode === targetCode);
  };

  // Account parent filter
  const parentFilter = STATE.tableAccountParent || '';
  const byParent = r => {
    if (!parentFilter) return true;
    return String(r.accountParent || '').toLowerCase()
      .includes(parentFilter.toLowerCase());
  };

  const base = r => r.month >= 1 && r.month <= m && byComp(r) && byParent(r);
  const curr = STATE.opexRows.filter(r => r.year === y   && base(r));
  const sply = STATE.opexRows.filter(r => r.year === y-1 && base(r));
  return { curr, sply };
}

// ── Sort icon ──────────────────────────────────────────────────
function _sortIcon(col) {
  if (PIVOT.sortCol !== col) return '<span class="pv-sort-idle">⇅</span>';
  return PIVOT.sortDir === 'desc'
    ? '<span class="pv-sort-active">↓</span>'
    : '<span class="pv-sort-active">↑</span>';
}

function pivotSort(col) {
  PIVOT.sortDir = (PIVOT.sortCol === col && PIVOT.sortDir === 'desc') ? 'asc' : 'desc';
  PIVOT.sortCol = col;
  _renderPivotTable();
}

// ══════════════════════════════════════════════════════════════
//  FIELD CHOOSER
// ══════════════════════════════════════════════════════════════
function initPivotUI() {
  _renderFieldChooser();

  const pc = document.getElementById('opex-pivot-container');
  if (pc && !pc._pivotInit) {
    pc._pivotInit = true;
    pc.addEventListener('click', e => {
      const row = e.target.closest('[data-pivot-node]');
      if (!row) return;
      const key = row.dataset.pivotNode;
      if (PIVOT.expanded.has(key)) PIVOT.expanded.delete(key);
      else PIVOT.expanded.add(key);
      _renderPivotTable();
    });
  }
}

function _renderFieldChooser() {
  const wrap = document.getElementById('pivot-field-chooser');
  if (!wrap) return;

  const available = PIVOT_FIELDS.filter(f => !PIVOT.rowFields.includes(f.id));
  const active    = PIVOT.rowFields
    .map(id => PIVOT_FIELDS.find(f => f.id === id))
    .filter(Boolean);

  wrap.innerHTML = `
    <div class="pivot-chooser">

      <div class="pivot-chooser-section">
        <div class="pivot-chooser-label">Available Fields</div>
        <div class="pivot-field-pool" id="pivot-pool"
          ondragover="event.preventDefault()"
          ondrop="pivotDropToPool(event)">
          ${available.map(f => `
            <div class="pivot-field-chip"
              draggable="true"
              ondragstart="pivotDragStart(event,'${f.id}')"
              ondragend="pivotDragEnd(event)">
              ${f.label}
            </div>`).join('')}
          ${available.length === 0
            ? '<span class="pivot-pool-empty">All fields in use</span>'
            : ''}
        </div>
      </div>

      <div class="pivot-chooser-section">
        <div class="pivot-chooser-label">Row Fields (drag to reorder)</div>
        <div class="pivot-field-active" id="pivot-active"
          ondragover="pivotDragOverActive(event)"
          ondrop="pivotDropToActive(event)">
          ${active.length === 0
            ? '<span class="pivot-pool-empty">↑ Drag fields here</span>'
            : active.map((f, i) => `
              <div class="pivot-field-chip pivot-field-chip--active"
                draggable="true"
                ondragstart="pivotDragStart(event,'${f.id}')"
                ondragend="pivotDragEnd(event)">
                <span class="pivot-chip-order">${i + 1}</span>
                ${f.label}
                <span class="pivot-chip-remove"
                  onclick="event.stopPropagation();pivotRemoveField('${f.id}')">✕</span>
              </div>`).join('')}
        </div>
      </div>

      ${active.length > 0 ? `
        <div class="pivot-chooser-actions">
          <button class="pivot-clear-btn" onclick="pivotCollapseAll()">Collapse All</button>
          <button class="pivot-clear-btn" onclick="pivotExpandAll()">Expand All</button>
          <button class="pivot-clear-btn pivot-clear-btn--danger" onclick="pivotClearAll()">✕ Clear</button>
        </div>` : ''}
    </div>`;
}

// ── Drag handlers ──────────────────────────────────────────────
let _dragField = null;

function pivotDragStart(e, id) {
  _dragField = id;
  e.dataTransfer.effectAllowed = 'move';
  // Use class instead of inline style so !important doesn't block it
  requestAnimationFrame(() => {
    if (e.target) e.target.classList.add('dragging');
  });
}
function pivotDragEnd(e) {
  if (e.target) e.target.classList.remove('dragging');
  _dragField = null;
}
function pivotDragOverActive(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}
function pivotDropToActive(e) {
  e.preventDefault();
  if (!_dragField) return;
  if (!PIVOT.rowFields.includes(_dragField)) PIVOT.rowFields.push(_dragField);
  _dragField = null;
  PIVOT.expanded.clear();
  _groupNameCache = null;  // reset cache on field change
  _renderFieldChooser();
  _renderPivotTable();
}
function pivotDropToPool(e) {
  e.preventDefault();
  if (_dragField) pivotRemoveField(_dragField);
}
function pivotRemoveField(id) {
  PIVOT.rowFields = PIVOT.rowFields.filter(f => f !== id);
  PIVOT.expanded.clear();
  _renderFieldChooser();
  _renderPivotTable();
}
function pivotClearAll()    { PIVOT.rowFields = []; PIVOT.expanded.clear(); _renderFieldChooser(); _renderPivotTable(); }
function pivotCollapseAll() { PIVOT.expanded.clear(); _renderPivotTable(); }
function pivotExpandAll()   {
  const { curr } = _getPivotRows();
  if (!curr.length || !PIVOT.rowFields.length) return;
  const currMap = _buildAggMap(curr, PIVOT.rowFields);
  for (const [path, node] of currMap) {
    if (node.depth === 0) PIVOT.expanded.add(path);
  }
  _renderPivotTable();
}

// ══════════════════════════════════════════════════════════════
//  PIVOT TABLE RENDER
// ══════════════════════════════════════════════════════════════
function _renderPivotTable() {
  const container = document.getElementById('opex-pivot-container');
  const tableEl   = document.getElementById('opex-table-container');
  if (!container) return;

  if (PIVOT.rowFields.length === 0) {
    container.innerHTML = '';
    if (tableEl) tableEl.style.display = '';
    return;
  }
  if (tableEl) tableEl.style.display = 'none';

  const { year, month } = STATE.filters;
  if (!year || !month) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Select a period first</div></div>';
    return;
  }

  const { curr, sply } = _getPivotRows();
  if (!curr.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No OpEx data for this period</div></div>';
    return;
  }

  // Build aggregation maps (single pass each)
  const currMap = _buildAggMap(curr, PIVOT.rowFields);
  const splyMap = _buildAggMap(sply, PIVOT.rowFields);

  const grandCurr   = curr.reduce((s, r) => s + (r.amount || 0), 0);
  const grandSply   = sply.reduce((s, r) => s + (r.amount || 0), 0);
  const grandVar    = grandCurr - grandSply;
  const grandVarPct = grandSply ? grandVar / Math.abs(grandSply) : null;

  const currLabel = _pivotPeriodLabel(year, month, false);
  const splyLabel = _pivotPeriodLabel(year, month, true);

  const th = (col, lbl) =>
    `<th class="pivot-num-col pivot-th-sort" onclick="pivotSort('${col}')">${lbl}${_sortIcon(col)}</th>`;

  let html = `
    <div class="pivot-table-wrap">
    <table class="pivot-table">
      <thead><tr>
        <th class="pivot-label-col">Description</th>
        ${th('curr',   currLabel)}
        ${th('sply',   splyLabel)}
        ${th('var',    'Variance')}
        ${th('varPct', 'Var %')}
      </tr></thead>
      <tbody>`;

  // Render recursively using the flat map
  function renderPath(path, depth) {
    const node     = currMap.get(path);
    if (!node) return;
    const splyAmt  = splyMap.get(path)?.amount || 0;
    const varAmt   = node.amount - splyAmt;
    const varPct   = splyAmt ? varAmt / Math.abs(splyAmt) : null;
    const varCls   = varAmt > 0 ? 'pv-pos' : varAmt < 0 ? 'pv-neg' : '';
    const indent   = 12 + depth * 22;
    const rowCls   = `pv-row-l${Math.min(depth, 2)}`;
    const isExp    = PIVOT.expanded.has(path);
    const children = _childPaths(currMap, path);

    const btn = children.length
      ? `<button class="pv-expand-btn">${isExp ? '−' : '+'}</button>`
      : `<span class="pv-expand-spacer"></span>`;

    html += `
      <tr class="${rowCls}"
        data-pivot-node="${escHtml(path)}"
        style="cursor:${children.length ? 'pointer' : 'default'}">
        <td class="pivot-label-col" style="padding-left:${indent}px">
          ${btn}${escHtml(node.label)}
        </td>
        <td class="pivot-num-col">${FMT.amount(node.amount)}</td>
        <td class="pivot-num-col">${splyAmt ? FMT.amount(splyAmt) : '—'}</td>
        <td class="pivot-num-col ${varCls}">${FMT.amount(varAmt)}</td>
        <td class="pivot-num-col ${varCls}">${varPct != null ? FMT.pct(varPct) : '—'}</td>
      </tr>`;

    if (children.length && isExp) {
      const sorted = _sortPaths(children, currMap, splyMap);
      for (const child of sorted) renderPath(child, depth + 1);
    }
  }

  // Wrapper to use splyMap for amount lookup
  // Override _sortPaths to use flat map amounts
  function _sortPaths(paths, cMap, sMap) {
    return paths.slice().sort((a, b) => {
      const aC = cMap.get(a)?.amount || 0;
      const bC = cMap.get(b)?.amount || 0;
      const aS = sMap.get(a)?.amount || 0;
      const bS = sMap.get(b)?.amount || 0;
      let av, bv;
      switch (PIVOT.sortCol) {
        case 'curr':   av = aC;     bv = bC;     break;
        case 'sply':   av = aS;     bv = bS;     break;
        case 'var':    av = aC-aS;  bv = bC-bS;  break;
        case 'varPct':
          av = aS ? (aC-aS)/Math.abs(aS) : 0;
          bv = bS ? (bC-bS)/Math.abs(bS) : 0;
          break;
        default: av = aC; bv = bC;
      }
      return PIVOT.sortDir === 'asc' ? av - bv : bv - av;
    });
  }

  const rootPaths = _sortPaths(_rootPaths(currMap), currMap, splyMap);
  for (const path of rootPaths) renderPath(path, 0);

  const gVarCls = grandVar > 0 ? 'pv-pos' : grandVar < 0 ? 'pv-neg' : '';
  html += `
      <tr class="pv-row-total">
        <td class="pivot-label-col" style="padding-left:12px"><strong>Grand Total</strong></td>
        <td class="pivot-num-col"><strong>${FMT.amount(grandCurr)}</strong></td>
        <td class="pivot-num-col"><strong>${grandSply ? FMT.amount(grandSply) : '—'}</strong></td>
        <td class="pivot-num-col ${gVarCls}"><strong>${FMT.amount(grandVar)}</strong></td>
        <td class="pivot-num-col ${gVarCls}"><strong>${grandVarPct != null ? FMT.pct(grandVarPct) : '—'}</strong></td>
      </tr>
    </tbody></table></div>`;

  container.innerHTML = html;
}

// ── Public ─────────────────────────────────────────────────────
function renderOpExPivot() { initPivotUI(); _renderPivotTable(); }
function clearPivot()      { pivotClearAll(); }
