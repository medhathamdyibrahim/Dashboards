'use strict';
/* ============================================================
   AGING-DASHBOARD.JS — AR Aging Dashboard
   ============================================================
   Sections:
     1. AGING_STATE & helpers
     2. Data computation (filter, KPIs, buckets, by-customer, pareto)
     3. Controls bar
     4. KPI strip (single + compare mode)
     5. Charts (bucket bar, trend line, top-10 customers)
     6. Pareto table (standard + granular, single + compare)
     7. Detail table (all invoices, sortable, paginated)
     8. Export to Excel (ExcelJS)
     9. Entry point: renderAgingDashboard()
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 1. STATE
// ─────────────────────────────────────────────────────────────
const AGING_STATE = {
  entity:          'all',   // 'all' | 'mc' | 'dp'
  monthA:          '',      // primary month  e.g. 'Jun-26'
  monthB:          '',      // compare month  e.g. 'May-26' ('' = disabled)
  region:          'all',
  search:          '',
  bucketMode:      'std',   // 'std' | 'gran'
  paretoThreshold: 80,      // 70–95
  detailVisible:   false,
  detailPage:      1,
  detailPageSize:  50,
  detailSortCol:   'days',
  detailSortDir:   'desc',
  collapsedRegions: new Set(),  // region names currently collapsed in Pareto table
  _monthAIsFallback: false, // true when global Year/Month filter has no matching Aging snapshot
  invoiceSort: { col: 'balance', dir: 'desc' },  // Open Invoices table sort (Customer 360 modal)
  invoicePage: 1,
  invoicePageSize: 10,
  _current360SapCode: null,  // sapCode of the currently-open Customer 360 modal, for sort refresh
  _charts:         {},      // Chart.js instances keyed by id (incl. 'c360rev','c360aging' for Customer 360 modal)
};

// HTML escape
function _aEsc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Sync helpers: derive Aging's entity/month from the global top-nav
// filters (Year / Month / Entity), so there is a single source of truth
// instead of two separate, disconnected filter rows.
function _agingEntityFromGlobalFilter() {
  const c = STATE.filters?.company || '';
  if (c === 'Masria Cards' || c === 'modupay Cards') return 'mc';
  if (c === 'mdp' || c === 'modupay DP') return 'dp';
  return 'all';
}

function _agingLabelFromGlobalFilter() {
  const year  = parseInt(STATE.filters?.year)  || 0;
  const month = parseInt(STATE.filters?.month) || 0;
  if (!year || !month) return null;
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mon[month - 1]}-${String(year).slice(-2)}`;
}

// Sync AGING_STATE.entity/monthA from the global filters. Falls back to the
// latest available Aging snapshot if the global Year/Month has none.
function _syncAgingWithGlobalFilters() {
  AGING_STATE.entity = _agingEntityFromGlobalFilter();

  const months = getAgingMonths();
  const wanted = _agingLabelFromGlobalFilter();

  if (wanted && months.includes(wanted)) {
    AGING_STATE.monthA = wanted;
    AGING_STATE._monthAIsFallback = false;
  } else {
    AGING_STATE.monthA = months[months.length - 1] || '';
    AGING_STATE._monthAIsFallback = !!wanted;
  }
}

// Format USD amount  e.g. "$1,234,567"
function _aFmt(n) {
  if (n == null || isNaN(n)) return '$—';
  return '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
}

// Compact USD  e.g. "$1.2M"
function _aCompact(n) {
  if (n == null || isNaN(n)) return '$—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (abs / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(abs).toLocaleString('en-US');
}

// Format percentage
function _aPct(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return '—';
  return (n * 100).toFixed(1) + '%';
}

// Destroy a chart safely
function _destroyChart(id) {
  if (AGING_STATE._charts[id]) {
    try { AGING_STATE._charts[id].destroy(); } catch(e) {}
    delete AGING_STATE._charts[id];
  }
}

// Active bucket keys based on current mode
function _bucketKeys() {
  return AGING_STATE.bucketMode === 'gran' ? AGING_GRAN_KEYS : AGING_STD_KEYS;
}

// Overdue bucket keys (everything except 'Not Due')
function _overdueKeys() {
  return _bucketKeys().filter(k => k !== 'Not Due');
}

// Bucket severity color (for badges and charts) — 8-stop gradient green→red
const BUCKET_COLORS = {
  'Not Due':  '#059669',  // green
  '01-30':    '#65a30d',  // lime
  '31-60':    '#ca8a04',  // amber
  '61-90':    '#d97706',  // orange
  '91-120':   '#ea580c',  // orange-red
  '121-150':  '#dc2626',  // red
  '151-180':  '#b91c1c',  // dark red
  '>180':     '#7f1d1d',  // very dark red
  '181-210':  '#b91c1c',
  '211-240':  '#991b1b',
  '241-270':  '#7f1d1d',
  '271-300':  '#6b1414',
  '301-330':  '#5a0f0f',
  '331-360':  '#4a0a0a',
  '>360':     '#3b0000',
};

function _bucketColor(key) {
  return BUCKET_COLORS[key] || '#94a3b8';
}

// Bucket badge CSS class
function _bucketBadgeClass(key) {
  if (key === 'Not Due') return 'aging-b-notdue';
  if (key === '01-30')   return 'aging-b-1-30';
  if (key === '31-60' || key === '61-90') return 'aging-b-31-90';
  return 'aging-b-overdue';
}

// ─────────────────────────────────────────────────────────────
// 2. DATA COMPUTATION
// ─────────────────────────────────────────────────────────────

// Filter rows by current AGING_STATE settings
function _agingFilter(monthLabel) {
  return _agingFilterEntity(monthLabel, AGING_STATE.entity);
}

// Same as _agingFilter but with an explicit entity override — used by the
// Excel export to build one sheet per entity regardless of the currently
// synced (global-filter-driven) entity.
function _agingFilterEntity(monthLabel, entityOverride) {
  const rows = STATE.agingRows || [];
  return rows.filter(r => {
    if (monthLabel && r.reportLabel !== monthLabel) return false;
    if (entityOverride !== 'all' && r.entity !== entityOverride) return false;
    if (AGING_STATE.region !== 'all' && r.mainRegion !== AGING_STATE.region) return false;
    if (AGING_STATE.search) {
      const q = AGING_STATE.search.toLowerCase();
      if (!String(r.sapCode).includes(q) &&
          !r.customerName.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// Compute KPI object from a set of rows
function _computeKPIs(rows) {
  const bucketKeys = _bucketKeys();
  let total = 0, notDue = 0, overdue = 0, oldestDays = 0;
  const overdueCustomers = new Set();
  const bucketTotals = {};
  bucketKeys.forEach(k => { bucketTotals[k] = 0; });

  for (const r of rows) {
    total += r.balance;
    const bk = AGING_STATE.bucketMode === 'gran' ? r.bucketGran : r.bucketStd;
    if (bucketTotals[bk] !== undefined) bucketTotals[bk] += r.balance;
    if (r.days === 0) {
      notDue += r.balance;
    } else {
      overdue += r.balance;
      overdueCustomers.add(r.sapCode);
    }
    if (r.days > oldestDays) oldestDays = r.days;
  }

  return {
    total,
    notDue,
    overdue,
    overdueRatio: total > 0 ? overdue / total : 0,
    oldestDays,
    overdueCustomers: overdueCustomers.size,
    bucketTotals,
  };
}

// Group rows by customer → array of customer objects
function _byCustomer(rows) {
  const map = {};
  const bucketKeys = _bucketKeys();

  for (const r of rows) {
    if (!map[r.sapCode]) {
      map[r.sapCode] = {
        sapCode:      r.sapCode,
        customerName: r.customerName,
        mainRegion:   r.mainRegion,
        invoices:     [],
        buckets:      {},
        total:        0,
        totalDue:     0,
        worstDays:    0,
        worstBucket:  'Not Due',
      };
      bucketKeys.forEach(k => { map[r.sapCode].buckets[k] = 0; });
    }
    const c  = map[r.sapCode];
    const bk = AGING_STATE.bucketMode === 'gran' ? r.bucketGran : r.bucketStd;
    c.invoices.push(r);
    if (c.buckets[bk] !== undefined) c.buckets[bk] += r.balance;
    c.total += r.balance;
    if (r.days > 0) c.totalDue += r.balance;
    if (r.days > c.worstDays) {
      c.worstDays   = r.days;
      c.worstBucket = bk;
    }
  }

  return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
}

// Compute pareto clients covering >=threshold% of total due
function _paretoClients(byCustomer, threshold) {
  const totalDue = byCustomer.reduce((s, c) => s + c.totalDue, 0);
  if (totalDue === 0) return byCustomer;

  const target = totalDue * (threshold / 100);
  let running   = 0;
  const result  = [];
  for (const c of byCustomer) {
    if (c.totalDue <= 0) continue;
    result.push(c);
    running += c.totalDue;
    if (running >= target) break;
  }
  return result;
}

// Safe DOM-id fragment from a region name
function _regionId(region) {
  return String(region || 'Unknown').replace(/[^a-zA-Z0-9]+/g, '_');
}

// Determine the worst (most severe) bucket key with a non-zero total,
// given the bucket keys are ordered from least to most severe.
function _worstBucketFromTotals(bucketTotals, keys) {
  for (let i = keys.length - 1; i >= 0; i--) {
    if ((bucketTotals[keys[i]] || 0) > 0) return keys[i];
  }
  return 'Not Due';
}

// ── Sales YTD helpers (shared by Pareto table + Customer 360) ─────
// USD value for a sales row regardless of the global usdMode toggle —
// the Aging dashboard always shows USD. MC rows are stored in EGP
// natively (÷ fxRate → USD); DP rows are stored in USD natively (as-is).
function _salesRowUSD(r) {
  const v = r.value || 0;
  if (r.entityFolder === 'modupay DP') return v;
  const rate = (Number.isFinite(r.fxRate) && r.fxRate > 0) ? r.fxRate : 1;
  return v / rate;
}

// Number of calendar days in a given 1-based month of a given year
function _daysInMonth(year, month1based) {
  return new Date(Date.UTC(year, month1based, 0)).getUTCDate();
}

// Cumulative calendar days from Jan 1 through the end of `uptoMonth` (1-based, inclusive)
function _cumulativeDaysThroughMonth(year, uptoMonth) {
  let days = 0;
  for (let m = 1; m <= uptoMonth; m++) days += _daysInMonth(year, m);
  return days;
}

// Determine the YTD window: the SAME global period (year + month) that
// drives the "Total Revenues" figure on the Revenues tab (STATE.filters),
// so Aging's YTD Revenue always ties out to that tab. Falls back to the
// latest year/month found in the raw data only if no global period is set.
function _salesYTDWindow() {
  const fYear  = parseInt(STATE.filters?.year)  || 0;
  const fMonth = parseInt(STATE.filters?.month) || 0;
  if (fYear && fMonth) {
    return { year: fYear, month: fMonth, daysYTD: _cumulativeDaysThroughMonth(fYear, fMonth) };
  }

  const rows = STATE.salesRows || [];
  if (!rows.length) return null;
  let latestYear = 0;
  for (const r of rows) if (r.year > latestYear) latestYear = r.year;
  if (!latestYear) return null;

  let latestMonth = 0;
  for (const r of rows) {
    if (r.year === latestYear && r.month > latestMonth) latestMonth = r.month;
  }
  if (!latestMonth) latestMonth = 12;

  return { year: latestYear, month: latestMonth, daysYTD: _cumulativeDaysThroughMonth(latestYear, latestMonth) };
}

// Sister/intercompany "customer" codes — their balances were never booked
// in AR at all, so their revenue must be excluded from the YTD Revenue used
// in DSO (AR ÷ Revenue): including it would understate DSO by inflating the
// denominator with revenue that has no matching AR to collect.
const AGING_DSO_EXCLUDED_SALES_CODES = new Set([1001590, 1001090, 1200, 1000, 1000322]);

// Build a { sapCode -> { revenue, volume } } map for the YTD window (USD revenue).
// Uses the shared _getSalesRows() helper (same one the Revenues tab calls) so
// the row selection is byte-for-byte identical: modupay Cards' "Total Revenues"
// includes intercompany code 1001090, modupay DP's excludes it by default —
// summing STATE.salesRows directly (as before) ignored that asymmetry and
// silently overstated DP-related totals whenever that code had DP rows.
// On top of that, sister-company codes (AGING_DSO_EXCLUDED_SALES_CODES) are
// always excluded here regardless of entity, since their revenue has no
// corresponding AR balance to be collected against.
function _buildSalesYTDMap(ytdWindow) {
  const map = {};
  if (!ytdWindow) return map;
  const { year, month } = ytdWindow;

  const mcRows = _getSalesRows(['modupay Cards', 'Masria Cards'], year, month, { includeIntercompany: true }).curr;
  const dpRows = _getSalesRows(['modupay DP', 'mdp'], year, month).curr;

  for (const r of [...mcRows, ...dpRows]) {
    if (AGING_DSO_EXCLUDED_SALES_CODES.has(r.code)) continue;
    if (!map[r.code]) map[r.code] = { revenue: 0, volume: 0 };
    map[r.code].revenue += _salesRowUSD(r);
    map[r.code].volume  += (r.volume || 0);
  }
  return map;
}

// DSO = AR Balance ÷ (Annualized Revenue ÷ 365)
// Annualized Revenue = YTD Revenue × (365 ÷ days covered by the YTD window)
function _calcDSO(arBalance, ytdRevenue, daysYTD) {
  if (!ytdRevenue || ytdRevenue <= 0 || !daysYTD) return null;
  const annualizedRevenue = ytdRevenue * (365 / daysYTD);
  if (annualizedRevenue <= 0) return null;
  return arBalance / (annualizedRevenue / 365);
}

// Parse an Aging report label like "Jun-26" into { year, month }
function _parseAgingLabelToYM(label) {
  const m = /^([A-Za-z]{3})-(\d{2})$/.exec(String(label || '').trim());
  if (!m) return null;
  const monNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mi = monNames.indexOf(m[1]);
  if (mi < 0) return null;
  return { year: 2000 + parseInt(m[2], 10), month: mi + 1 };
}

// Company-wide DSO for each of the last 12 Aging report months — always
// whole-company (all entities, ignoring the on-screen Region/Search filters),
// each month's DSO annualizing that single month's own revenue (excluding
// sister-company codes, same exclusion as the main DSO calc).
function _computeCompanyDSOTrend() {
  const months = getAgingMonths();
  if (!months.length) return [];
  const last12 = months.slice(-12);
  const entity = AGING_STATE.entity; // 'all' | 'mc' | 'dp' — reacts to the Entity filter
  const region = AGING_STATE.region; // 'all' or a region name — reacts to the Region filter

  return last12.map(label => {
    const ym = _parseAgingLabelToYM(label);

    // Customers present in Aging for this month — same entity/region filters
    // as the table (_agingFilter), so the two stay in lockstep.
    const monthRows = (STATE.agingRows || []).filter(r => r.reportLabel === label
      && (entity === 'all' || r.entity === entity)
      && (region === 'all' || r.mainRegion === region));
    const arBalance = monthRows.reduce((s, r) => s + r.balance, 0);

    if (!ym) return { month: label, dso: null, arBalance, revenue: 0 };

    // Same customer-join methodology as the table's per-region "YTD Rev."
    // column: sum THESE customers' own YTD revenue (Jan → this month) — a
    // sales row's region tag and a customer's Aging region tag can diverge,
    // and a customer with sales but no AR entry this month must not be
    // counted. EXCEPTION: when no region is selected (whole company), match
    // the table's Grand Total row instead, which uses TOTAL company sales —
    // not just AR-holding customers' sales — otherwise revenue is understated.
    const ytdWindowM = { year: ym.year, month: ym.month, daysYTD: _cumulativeDaysThroughMonth(ym.year, ym.month) };
    const ytdMapM = _buildSalesYTDMap(ytdWindowM);
    let revenue;
    if (region === 'all') {
      revenue = Object.values(ytdMapM).reduce((s, v) => s + v.revenue, 0);
    } else {
      const byCustomerMonth = _byCustomer(monthRows);
      revenue = byCustomerMonth.reduce((s, c) => s + (ytdMapM[c.sapCode]?.revenue || 0), 0);
    }

    const dso = _calcDSO(arBalance, revenue, ytdWindowM.daysYTD);
    return { month: label, dso, arBalance, revenue };
  });
}

// Group customers by mainRegion; within each region compute the clients
// covering `threshold`% of that region's own Total Due (region-level pareto),
// and aggregate the remainder into a single "Other Clients" row.
// Regions are sorted descending by their own Total Due.
function _paretoByRegion(byCustomer, threshold, byCustomerB) {
  const keys = _bucketKeys();
  const groups = {};
  for (const c of byCustomer) {
    const reg = c.mainRegion || 'Unknown';
    (groups[reg] = groups[reg] || []).push(c);
  }

  const mapB = {};
  if (byCustomerB) byCustomerB.forEach(c => { mapB[c.sapCode] = c; });

  const regions = Object.keys(groups).map(region => {
    const clients = groups[region].slice().sort((a, b) => b.totalDue - a.totalDue);
    const regionTotalDue = clients.reduce((s, c) => s + c.totalDue, 0);
    const regionTotal    = clients.reduce((s, c) => s + c.total,    0);
    const target = regionTotalDue * (threshold / 100);

    let running = 0;
    const top   = [];
    const other = [];
    for (const c of clients) {
      if (c.totalDue > 0 && running < target) {
        top.push(c);
        running += c.totalDue;
      } else {
        other.push(c);
      }
    }

    let otherAgg = null;
    if (other.length) {
      const buckets = {};
      keys.forEach(k => { buckets[k] = 0; });
      let total = 0, totalDue = 0, totalB = 0;
      for (const c of other) {
        total    += c.total;
        totalDue += c.totalDue;
        keys.forEach(k => { buckets[k] += (c.buckets[k] || 0); });
        if (mapB[c.sapCode]) totalB += mapB[c.sapCode].total;
      }
      otherAgg = {
        isOther:      true,
        count:        other.length,
        customerName: `Other Clients (${other.length})`,
        mainRegion:   region,
        buckets, total, totalDue, totalB,
        worstBucket:  _worstBucketFromTotals(buckets, keys),
      };
    }

    return { region, clients, top, other, otherAgg, regionTotalDue, regionTotal };
  });

  regions.sort((a, b) => b.regionTotalDue - a.regionTotalDue);
  return regions;
}

// ─────────────────────────────────────────────────────────────
// 3. CONTROLS BAR
// ─────────────────────────────────────────────────────────────
function _renderControls() {
  const months  = getAgingMonths();   // sorted chronological
  const regions = getAgingRegions();
  const mA      = AGING_STATE.monthA;
  const mB      = AGING_STATE.monthB;

  // Month options newest-first for picker
  const monthsDesc = [...months].reverse();

  function monthOpts(selected, excludeVal) {
    return monthsDesc
      .filter(m => m !== excludeVal)
      .map(m => `<option value="${_aEsc(m)}" ${m === selected ? 'selected' : ''}>${_aEsc(m)}</option>`)
      .join('');
  }

  const entityLabel = AGING_STATE.entity === 'mc' ? 'modupay Cards'
                     : AGING_STATE.entity === 'dp' ? 'modupay DP' : 'All Entities';

  return `
  <div class="aging-controls">

    <!-- Row 1: Synced entity/month indicator + Month pickers + Region + Search -->
    <div class="aging-controls-row1">

      <!-- Entity + Month — synced from the Year/Month/Entity filters above -->
      <div class="aging-synced-indicator">
        <span class="aging-ctrl-label">Showing</span>
        <div class="aging-synced-value">
          <span class="aging-synced-chip">${_aEsc(entityLabel)}</span>
          <span class="aging-synced-chip">${_aEsc(mA || '—')}</span>
        </div>
        ${AGING_STATE._monthAIsFallback
          ? `<div class="aging-synced-note">No Aging snapshot for the selected Year/Month — showing latest available (${_aEsc(mA)})</div>`
          : `<div class="aging-synced-note aging-synced-note-muted">synced with Year / Month / Entity above</div>`}
      </div>

      <!-- Month B (compare) -->
      <div class="aging-filter-group">
        <label class="aging-ctrl-label">Compare To</label>
        <select class="aging-select" onchange="agingSetMonthB(this.value)">
          <option value="">None</option>
          ${monthOpts(mB, mA)}
        </select>
      </div>

      <!-- Region -->
      <div class="aging-filter-group">
        <label class="aging-ctrl-label">Region</label>
        <select class="aging-select" onchange="agingSetRegion(this.value)">
          <option value="all">All Regions</option>
          ${regions.map(r => `<option value="${_aEsc(r)}" ${r===AGING_STATE.region?'selected':''}>${_aEsc(r)}</option>`).join('')}
        </select>
      </div>

      <!-- Search -->
      <div class="aging-search-wrap">
        <label class="aging-ctrl-label">Search Client</label>
        <div class="aging-search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="aging-search-input"
            placeholder="SAP Code or name…"
            value="${_aEsc(AGING_STATE.search)}"
            oninput="agingSetSearch(this.value)">
        </div>
      </div>

      <!-- Export button -->
      <div class="aging-filter-group" style="justify-content:flex-end;align-self:flex-end">
        <button class="aging-export-btn" onclick="exportAgingToExcel()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Excel
        </button>
      </div>
    </div>

    <!-- Row 2: Bucket mode + Pareto slider -->
    <div class="aging-controls-row2">

      <!-- Bucket mode -->
      <div class="aging-bucket-mode-group">
        <span class="aging-ctrl-label">Bucket View</span>
        <div class="aging-toggle-btns">
          <button class="aging-toggle-btn ${AGING_STATE.bucketMode==='std' ?'active':''}"
            onclick="agingSetBucketMode('std')">Standard</button>
          <button class="aging-toggle-btn ${AGING_STATE.bucketMode==='gran' ?'active':''}"
            onclick="agingSetBucketMode('gran')">Granular</button>
        </div>
      </div>

      <!-- Pareto threshold: number input + presets -->
      <div class="aging-pareto-group">
        <label class="aging-ctrl-label">Top Clients covering % of Total Due</label>
        <div class="aging-pareto-input-row">
          <div class="aging-pareto-input-wrap">
            <input type="number" id="aging-pareto-input" class="aging-pareto-input"
              min="1" max="100" step="1"
              value="${AGING_STATE.paretoThreshold}"
              onchange="agingSetPareto(this.value)">
            <span class="aging-pareto-input-suffix">%</span>
          </div>
          <div class="aging-pareto-presets">
            <button class="aging-pareto-preset-btn ${AGING_STATE.paretoThreshold===50?'active':''}" onclick="agingSetPareto(50)">50%</button>
            <button class="aging-pareto-preset-btn ${AGING_STATE.paretoThreshold===80?'active':''}" onclick="agingSetPareto(80)">80%</button>
            <button class="aging-pareto-preset-btn ${AGING_STATE.paretoThreshold===100?'active':''}" onclick="agingSetPareto(100)">100%</button>
          </div>
        </div>
      </div>

      <!-- Currency badge -->
      <div class="aging-currency-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 9h8M8 15h8"/>
        </svg>
        All amounts in USD
      </div>

    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// 4. KPI STRIP
// ─────────────────────────────────────────────────────────────
function _renderKPIs(kpiA, kpiB) {
  const compare = !!AGING_STATE.monthB && kpiB;

  function delta(a, b, isRatio) {
    if (!compare || b == null) return '';
    const d    = a - b;
    const pct  = b !== 0 ? d / Math.abs(b) : 0;
    const sign = d >= 0 ? '+' : '';
    const cls  = d >= 0 ? 'aging-delta-up' : 'aging-delta-dn';
    if (isRatio) {
      return `<span class="aging-delta ${cls}">${sign}${(d*100).toFixed(1)}pp</span>`;
    }
    return `<span class="aging-delta ${cls}">${sign}${_aPct(Math.abs(pct))} (${d>=0?'+':''}${_aCompact(d)})</span>`;
  }

  function card(label, valA, valB, deltaHtml, sub, icon) {
    return `
    <div class="aging-kpi-card">
      <div class="aging-kpi-icon">${icon}</div>
      <div class="aging-kpi-label">${_aEsc(label)}</div>
      <div class="aging-kpi-values ${compare?'compare':''}">
        <div class="aging-kpi-primary">
          <span class="aging-kpi-badge-month">${_aEsc(AGING_STATE.monthA||'—')}</span>
          <span class="aging-kpi-val">${valA}</span>
        </div>
        ${compare ? `
        <div class="aging-kpi-secondary">
          <span class="aging-kpi-badge-month compare">${_aEsc(AGING_STATE.monthB)}</span>
          <span class="aging-kpi-val secondary">${valB}</span>
        </div>` : ''}
      </div>
      ${deltaHtml ? `<div class="aging-kpi-delta">${deltaHtml}</div>` : ''}
      ${sub ? `<div class="aging-kpi-sub">${sub}</div>` : ''}
    </div>`;
  }

  const cards = [
    card('Total Outstanding',
      _aCompact(kpiA.total),
      compare ? _aCompact(kpiB.total) : null,
      delta(kpiA.total, kpiB?.total),
      '',
      '💰'),

    card('Not Due',
      _aCompact(kpiA.notDue),
      compare ? _aCompact(kpiB?.notDue) : null,
      delta(kpiA.notDue, kpiB?.notDue),
      kpiA.total > 0 ? `${_aPct(kpiA.notDue/kpiA.total)} of total` : '',
      '✅'),

    card('Total Overdue',
      _aCompact(kpiA.overdue),
      compare ? _aCompact(kpiB?.overdue) : null,
      delta(kpiA.overdue, kpiB?.overdue),
      '',
      '⚠️'),

    card('Overdue %',
      _aPct(kpiA.overdueRatio),
      compare ? _aPct(kpiB?.overdueRatio) : null,
      compare ? delta(kpiA.overdueRatio, kpiB?.overdueRatio, true) : '',
      'of total outstanding',
      '📊'),

    card('Oldest Invoice',
      kpiA.oldestDays + ' days',
      compare ? (kpiB?.oldestDays + ' days') : null,
      '',
      '',
      '🕐'),

    card('Overdue Clients',
      kpiA.overdueCustomers,
      compare ? kpiB?.overdueCustomers : null,
      compare ? delta(kpiA.overdueCustomers, kpiB?.overdueCustomers) : '',
      'unique customers',
      '👥'),
  ];

  return `<div class="aging-kpi-strip">${cards.join('')}</div>`;
}

// ─────────────────────────────────────────────────────────────
// 5. CHARTS
// ─────────────────────────────────────────────────────────────

// ── 5a. Bucket Distribution Bar Chart ─────────────────────────
function _renderBucketChart(kpiA, kpiB) {
  return `
  <div class="aging-card aging-chart-card">
    <div class="aging-card-title">
      Aging Bucket Distribution
      <span class="aging-card-subtitle">${AGING_STATE.bucketMode === 'gran' ? 'Granular View' : 'Standard View'}</span>
    </div>
    <div class="aging-chart-wrap">
      <canvas id="aging-chart-bucket" height="180"></canvas>
    </div>
  </div>`;
}

function _drawBucketChart(kpiA, kpiB) {
  _destroyChart('bucket');
  const canvas = document.getElementById('aging-chart-bucket');
  if (!canvas) return;

  const keys    = _bucketKeys();
  const compare = !!AGING_STATE.monthB && kpiB;
  const isDark  = STATE.theme === 'dark';
  const _fmtK = v => '$' + (Math.abs(v)>=1e6 ? (v/1e6).toFixed(1)+'M' : Math.abs(v)>=1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v));

  const datasetsA = {
    label:           AGING_STATE.monthA || 'Month A',
    data:            keys.map(k => Math.round(kpiA.bucketTotals[k] || 0)),
    backgroundColor: keys.map(k => _bucketColor(k)),
    borderRadius:    4,
    borderSkipped:   false,
    datalabels: _dl(isDark ? '#e2e8f0' : '#1e293b', v => v > 0 ? _fmtK(v) : '', { anchor:'end', align:'top', font:{size:12,weight:800} }),
  };

  const datasets = compare ? [
    {
      label:           AGING_STATE.monthA || 'Month A',
      data:            keys.map(k => Math.round(kpiA.bucketTotals[k] || 0)),
      backgroundColor: keys.map(k => _bucketColor(k)),
      borderRadius:    4,
      borderSkipped:   false,
      datalabels: _dl(isDark ? '#e2e8f0' : '#1e293b', v => v > 0 ? _fmtK(v) : '', { anchor:'end', align:'top', font:{size:11,weight:800} }),
    },
    {
      label:           AGING_STATE.monthB,
      data:            keys.map(k => Math.round(kpiB.bucketTotals[k] || 0)),
      backgroundColor: keys.map(k => _bucketColor(k) + '88'),
      borderRadius:    4,
      borderSkipped:   false,
      datalabels: _dl(isDark ? '#94a3b8' : '#64748b', v => v > 0 ? _fmtK(v) : '', { anchor:'end', align:'top', font:{size:11,weight:800} }),
    },
  ] : [datasetsA];

  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textC  = isDark ? '#94a3b8' : '#64748b';

  AGING_STATE._charts['bucket'] = new Chart(canvas, {
    type: 'bar',
    data: { labels: keys, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: { top: 22 } },
      plugins: {
        legend: { display: compare, position: 'top',
          labels: { color: textC, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US')}`,
          }
        }
      },
      scales: {
        x: { ticks: { color: textC, font:{size:13} }, grid:{color:gridC} },
        y: {
          ticks: {
            color: textC, font:{size:13},
            callback: v => '$' + (v>=1e6 ? (v/1e6).toFixed(1)+'M' : v>=1e3 ? (v/1e3).toFixed(0)+'K' : v),
          },
          grid: { color: gridC },
        }
      }
    }
  });
}

// ── 5b. AR Trend Line Chart ────────────────────────────────────
function _renderTrendChart() {
  return `
  <div class="aging-card aging-chart-card">
    <div class="aging-card-title">AR Balance Trend</div>
    <div class="aging-chart-wrap">
      <canvas id="aging-chart-trend" height="160"></canvas>
    </div>
  </div>`;
}

function _drawTrendChart() {
  _destroyChart('trend');
  const canvas = document.getElementById('aging-chart-trend');
  if (!canvas) return;

  const months = getAgingMonths();
  if (!months.length) return;

  // For each month, compute totals filtered by entity+region (ignore monthA/B filter here)
  const entityFilter = AGING_STATE.entity;
  const regionFilter = AGING_STATE.region;

  const totals   = [];
  const notDues  = [];
  const overdues = [];

  for (const m of months) {
    const rows = (STATE.agingRows || []).filter(r => {
      if (r.reportLabel !== m) return false;
      if (entityFilter !== 'all' && r.entity !== entityFilter) return false;
      if (regionFilter !== 'all' && r.mainRegion !== regionFilter) return false;
      return true;
    });
    const kpi = _computeKPIs(rows);
    totals.push(Math.round(kpi.total));
    notDues.push(Math.round(kpi.notDue));
    overdues.push(Math.round(kpi.overdue));
  }

  const isDark = STATE.theme === 'dark';
  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textC  = isDark ? '#94a3b8' : '#64748b';
  const _fmtK  = v => '$' + (Math.abs(v)>=1e6 ? (v/1e6).toFixed(1)+'M' : Math.abs(v)>=1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v));

  AGING_STATE._charts['trend'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Total AR',
          data: totals,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          datalabels: _dl('#2563eb', v => _fmtK(v), { anchor:'end', align:'top', font:{size:12,weight:800} }),
        },
        {
          label: 'Not Due',
          data: notDues,
          borderColor: '#059669',
          backgroundColor: 'transparent',
          tension: 0.35,
          borderDash: [4, 3],
          pointRadius: 3,
          datalabels: { display: false },
        },
        {
          label: 'Overdue',
          data: overdues,
          borderColor: '#dc2626',
          backgroundColor: 'transparent',
          tension: 0.35,
          borderDash: [4, 3],
          pointRadius: 3,
          datalabels: { display: false },
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { position: 'top', labels: { color: textC, font:{size:13} } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US')}`,
          }
        }
      },
      scales: {
        x: { ticks: { color: textC, font:{size:13} }, grid:{color:gridC} },
        y: {
          ticks: {
            color: textC, font:{size:13},
            callback: v => '$' + (v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v),
          },
          grid: { color: gridC },
        }
      }
    }
  });
}

// ── 5c. Top 10 Customers Horizontal Bar ───────────────────────
function _renderTop10Chart() {
  return `
  <div class="aging-card aging-chart-card">
    <div class="aging-card-title">Top 10 Clients by Total AR</div>
    <div class="aging-chart-wrap">
      <canvas id="aging-chart-top10" height="160"></canvas>
    </div>
  </div>`;
}

function _drawTop10Chart(byCustomer) {
  _destroyChart('top10');
  const canvas = document.getElementById('aging-chart-top10');
  if (!canvas) return;

  const top10 = byCustomer.slice(0, 10);
  const labels = top10.map(c => c.customerName.length > 20
    ? c.customerName.slice(0, 18) + '…' : c.customerName);
  const totals = top10.map(c => Math.round(c.total));
  const colors = top10.map(c => _bucketColor(c.worstBucket));

  const isDark = STATE.theme === 'dark';
  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textC  = isDark ? '#94a3b8' : '#64748b';
  const _fmtK  = v => '$' + (Math.abs(v)>=1e6 ? (v/1e6).toFixed(1)+'M' : Math.abs(v)>=1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v));

  AGING_STATE._charts['top10'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total AR Balance',
        data:  totals,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
        datalabels: _dl(isDark ? '#e2e8f0' : '#1e293b', v => _fmtK(v), { anchor:'end', align:'right', font:{size:12,weight:800} }),
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: { right: 36 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` $${ctx.parsed.x.toLocaleString('en-US')}`,
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textC, font:{size:12},
            callback: v => '$'+(v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v),
          },
          grid: { color: gridC },
        },
        y: { ticks: { color: textC, font:{size:13} }, grid:{display:false} },
      }
    }
  });
}

// ── 5d. Company DSO Trend — last 12 months (whole company) ───
function _renderDSOTrendChart() {
  const entityLabel = AGING_STATE.entity === 'mc' ? 'modupay Cards'
                     : AGING_STATE.entity === 'dp' ? 'modupay DP' : 'whole company';
  const regionLabel = AGING_STATE.region !== 'all' ? ` · ${AGING_STATE.region}` : '';
  return `
  <div class="aging-card aging-chart-card">
    <div class="aging-card-title">
      DSO Trend
      <span class="aging-card-subtitle">last 12 months · ${entityLabel}${regionLabel} · same YTD Revenue methodology as the table (resets each January)</span>
    </div>
    <div class="aging-chart-wrap">
      <canvas id="aging-chart-dso-trend" height="90"></canvas>
    </div>
  </div>`;
}

function _drawDSOTrendChart() {
  _destroyChart('dsoTrend');
  const canvas = document.getElementById('aging-chart-dso-trend');
  if (!canvas) return;

  const data = _computeCompanyDSOTrend();
  if (!data.length) return;

  const isDark = STATE.theme === 'dark';
  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textC  = isDark ? '#94a3b8' : '#64748b';

  AGING_STATE._charts['dsoTrend'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'DSO (days)',
        data: data.map(d => d.dso != null ? Math.round(d.dso) : null),
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.08)',
        fill: true, tension: 0.35, pointRadius: 4, pointHoverRadius: 6,
        spanGaps: true,
        datalabels: _dl('#7c3aed', v => v != null ? v + 'd' : '', { anchor:'end', align:'top', font:{size:12,weight:800} }),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.parsed.y != null ? ` ${ctx.parsed.y} days` : ' No data' } },
      },
      scales: {
        x: { ticks: { color: textC, font:{size:13} }, grid:{color:gridC} },
        y: { ticks: { color: textC, font:{size:13}, callback: v => v+'d' }, grid:{color:gridC}, beginAtZero:true },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 6. PARETO TABLE
// ─────────────────────────────────────────────────────────────
function _renderParetoTable(byCustomerA, byCustomerB) {
  const compare   = !!AGING_STATE.monthB && byCustomerB;
  const keys      = _bucketKeys();
  const overdueK  = _overdueKeys();
  const threshold = AGING_STATE.paretoThreshold;

  const regions   = _paretoByRegion(byCustomerA, threshold, compare ? byCustomerB : null);

  // YTD Revenue (latest sales year) + DSO, per customer
  const ytdWindow = _salesYTDWindow();
  const ytdMap    = _buildSalesYTDMap(ytdWindow);
  const ytdCol    = ytdWindow ? `YTD Rev.<br>${_salesPeriodLabel(ytdWindow.year, ytdWindow.month, false).replace('YTD ','')}` : 'YTD Rev.';

  // Grand totals across ALL clients (top + other), used for the Total/% rows
  // so the footer ties out to the full population shown across regions.
  const allDueA     = byCustomerA.reduce((s,c) => s + c.totalDue, 0);
  const totalTotalA = byCustomerA.reduce((s,c) => s + c.total,    0);
  const colTotA     = {};
  keys.forEach(k => { colTotA[k] = byCustomerA.reduce((s,c) => s + (c.buckets[k]||0), 0); });
  const totalClients   = byCustomerA.length;
  const totalTopClients = regions.reduce((s,r) => s + r.top.length, 0);
  // Total company YTD Revenue — ALL sales, not just customers who happen to
  // carry an AR balance this month (a fully-paid customer still counts here).
  const grandYTDRevenue = Object.values(ytdMap).reduce((s, v) => s + v.revenue, 0);
  const grandDSO        = _calcDSO(totalTotalA, grandYTDRevenue, ytdWindow?.daysYTD);

  const mapB = {};
  if (compare) byCustomerB.forEach(c => { mapB[c.sapCode] = c; });
  const totalTotalB = compare ? byCustomerA.reduce((s,c) => s + (mapB[c.sapCode]?.total||0), 0) : 0;

  // Column count for region-header colspan: Client + AR(A) + [AR(B)] + buckets + Due + % + YTD Rev + DSO + 360-btn
  const colCount = 1 + 1 + (compare ? 1 : 0) + keys.length + 1 + 1 + 1 + 1 + 1;

  // ── Table header ─────────────────────────────────────────────
  let thead = `<tr class="aging-tbl-header">
    <th class="aging-col-client">Client</th>
    <th class="aging-col-num">AR Bal.<br>${_aEsc(AGING_STATE.monthA||'—')}</th>`;
  if (compare) thead += `<th class="aging-col-num">AR Bal.<br>${_aEsc(AGING_STATE.monthB)}</th>`;
  keys.forEach(k => {
    thead += `<th class="aging-col-num aging-col-bucket" style="border-top:3px solid ${_bucketColor(k)}">${_aEsc(k)}</th>`;
  });
  thead += `<th class="aging-col-num aging-col-due">Total Due</th>
    <th class="aging-col-pct">%</th>
    <th class="aging-col-num aging-col-ytd">${ytdCol}</th>
    <th class="aging-col-num aging-col-dso">DSO</th>
    <th class="aging-col-360">360°</th>
  </tr>`;

  function clientRow(c, isOther, ytdRevenue, dso) {
    const pct = allDueA > 0 ? c.totalDue / allDueA * 100 : 0;
    const worstCls = _bucketBadgeClass(c.worstBucket);
    const cB = !isOther && compare ? mapB[c.sapCode] : null;
    const bVal = isOther ? (compare ? c.totalB : null) : (cB ? cB.total : null);

    let row = `<tr class="aging-tbl-row ${isOther ? 'aging-other-row' : ''}">
      <td class="aging-col-client">
        <div class="aging-client-name">${_aEsc(c.customerName)}</div>
        <div class="aging-client-meta">
          <span class="aging-bucket-badge ${worstCls}">${_aEsc(c.worstBucket)}</span>
        </div>
      </td>
      <td class="aging-col-num">${_aFmt(c.total)}</td>`;
    if (compare) row += `<td class="aging-col-num">${bVal != null ? _aFmt(bVal) : '—'}</td>`;
    keys.forEach(k => {
      const v = c.buckets[k] || 0;
      const cls = k === 'Not Due' ? 'aging-num-notdue'
                : k === '01-30'   ? 'aging-num-mild'
                : overdueK.includes(k) && v > 0 ? 'aging-num-overdue' : '';
      row += `<td class="aging-col-num ${cls}">${v > 0 ? _aFmt(v) : '<span class="aging-zero">$</span>'}</td>`;
    });
    row += `
      <td class="aging-col-num aging-col-due-val">${_aFmt(c.totalDue)}</td>
      <td class="aging-col-pct">${pct.toFixed(1)}%</td>
      <td class="aging-col-num aging-col-ytd">${ytdRevenue > 0 ? _aFmt(ytdRevenue) : '<span class="aging-zero">$</span>'}</td>
      <td class="aging-col-num aging-col-dso">${dso != null ? Math.round(dso)+'d' : '—'}</td>
      <td class="aging-col-360">${isOther
        ? '<span class="aging-zero">—</span>'
        : `<button class="aging-360-btn" onclick="event.stopPropagation();openCustomer360(${c.sapCode})" title="Customer 360 View">360</button>`}</td>
    </tr>`;
    return row;
  }

  // ── Regions ───────────────────────────────────────────────────
  let regionsHtml = '';
  for (const r of regions) {
    const rid       = _regionId(r.region);
    const collapsed = AGING_STATE.collapsedRegions.has(r.region);
    const pctOfGrand = allDueA > 0 ? (r.regionTotalDue / allDueA * 100) : 0;

    const regionYTDRevenue = r.clients.reduce((s,c) => s + (ytdMap[c.sapCode]?.revenue||0), 0);
    const regionDSO = _calcDSO(r.regionTotal, regionYTDRevenue, ytdWindow?.daysYTD);

    let bodyRows = r.top.map(c => clientRow(c, false, ytdMap[c.sapCode]?.revenue||0,
      _calcDSO(c.total, ytdMap[c.sapCode]?.revenue||0, ytdWindow?.daysYTD))).join('');
    if (r.otherAgg) {
      const otherYTDRevenue = r.other.reduce((s,c) => s + (ytdMap[c.sapCode]?.revenue||0), 0);
      const otherDSO = _calcDSO(r.otherAgg.total, otherYTDRevenue, ytdWindow?.daysYTD);
      bodyRows += clientRow(r.otherAgg, true, otherYTDRevenue, otherDSO);
    }

    regionsHtml += `
    <tbody>
      <tr class="aging-region-header" data-region="${_aEsc(r.region)}" onclick="agingToggleRegion('${_aEsc(r.region).replace(/'/g,"\\'")}')">
        <td colspan="${colCount}">
          <div class="aging-region-header-row">
            <div class="aging-region-header-left">
              <span class="aging-region-toggle-icon" id="aging-region-icon-${rid}">${collapsed ? '▶' : '▼'}</span>
              <span class="aging-region-name">${_aEsc(r.region)}</span>
              <span class="aging-region-count-badge">${r.clients.length} clients · ${r.top.length} top (${threshold}%+)</span>
            </div>
            <div class="aging-region-stats-chips">
              <span class="aging-region-stat-chip"><span class="aging-region-stat-label">Total AR</span><span class="aging-region-stat-value">${_aFmt(r.regionTotal)}</span></span>
              <span class="aging-region-stat-chip"><span class="aging-region-stat-label">Due</span><span class="aging-region-stat-value">${_aFmt(r.regionTotalDue)}</span></span>
              <span class="aging-region-stat-chip"><span class="aging-region-stat-label">% of Total</span><span class="aging-region-stat-value">${pctOfGrand.toFixed(1)}%</span></span>
              <span class="aging-region-stat-chip"><span class="aging-region-stat-label">YTD Rev.</span><span class="aging-region-stat-value">${_aFmt(regionYTDRevenue)}</span></span>
              <span class="aging-region-stat-chip aging-region-stat-chip-dso"><span class="aging-region-stat-label">DSO</span><span class="aging-region-stat-value">${regionDSO != null ? Math.round(regionDSO)+'d' : '—'}</span></span>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
    <tbody id="aging-region-body-${rid}" style="${collapsed ? 'display:none' : ''}">
      ${bodyRows}
    </tbody>`;
  }

  // ── Grand Total row ───────────────────────────────────────────
  let totalRow = `<tr class="aging-tbl-total">
    <td class="aging-col-client"><strong>Total</strong><div class="aging-client-meta">${totalClients} clients</div></td>
    <td class="aging-col-num"><strong>${_aFmt(totalTotalA)}</strong></td>`;
  if (compare) totalRow += `<td class="aging-col-num"><strong>${_aFmt(totalTotalB)}</strong></td>`;
  keys.forEach(k => {
    totalRow += `<td class="aging-col-num"><strong>${colTotA[k] > 0 ? _aFmt(colTotA[k]) : '<span class="aging-zero">$</span>'}</strong></td>`;
  });
  totalRow += `
    <td class="aging-col-num aging-col-due-val"><strong>${_aFmt(allDueA)}</strong></td>
    <td class="aging-col-pct"><strong>100%</strong></td>
    <td class="aging-col-num aging-col-ytd"><strong>${_aFmt(grandYTDRevenue)}</strong></td>
    <td class="aging-col-num aging-col-dso"><strong>${grandDSO != null ? Math.round(grandDSO)+'d' : '—'}</strong></td>
    <td class="aging-col-360"></td>
  </tr>`;

  // ── Percentage row ────────────────────────────────────────────
  let pctRow = `<tr class="aging-tbl-pct">
    <td class="aging-col-client">%</td>
    <td class="aging-col-num">100%</td>`;
  if (compare) pctRow += `<td class="aging-col-num">—</td>`;
  keys.forEach(k => {
    const pct = totalTotalA > 0 ? (colTotA[k] / totalTotalA * 100) : 0;
    pctRow += `<td class="aging-col-num">${pct > 0 ? pct.toFixed(0)+'%' : '—'}</td>`;
  });
  pctRow += `
    <td class="aging-col-num">${totalTotalA > 0 ? (allDueA/totalTotalA*100).toFixed(0)+'%' : '—'}</td>
    <td class="aging-col-pct">—</td>
    <td class="aging-col-num aging-col-ytd">—</td>
    <td class="aging-col-num aging-col-dso">—</td>
    <td class="aging-col-360"></td>
  </tr>`;

  return `
  <div class="aging-card aging-pareto-card">
    <div class="aging-card-title">
      Top Clients — ${threshold}% of Total Due <span class="aging-card-subtitle-tag">per region</span>
      <span class="aging-card-subtitle">${regions.length} regions · ${totalTopClients} top clients · ${_aFmt(allDueA)} total due${ytdWindow ? ` · ${_salesPeriodLabel(ytdWindow.year, ytdWindow.month, false)} Revenue ${_aFmt(grandYTDRevenue)} · DSO ${grandDSO != null ? Math.round(grandDSO)+'d' : '—'}` : ''}</span>
      <div class="aging-region-bulk-btns">
        <button class="aging-region-bulk-btn" onclick="agingExpandAllRegions()">Expand All</button>
        <button class="aging-region-bulk-btn" onclick="agingCollapseAllRegions()">Collapse All</button>
      </div>
    </div>
    <div class="aging-pareto-wrap">
      <table class="aging-tbl">
        <thead>${thead}</thead>
        ${regionsHtml}
        <tfoot>${totalRow}${pctRow}</tfoot>
      </table>
    </div>
  </div>`;
}

function agingExpandAllRegions() {
  document.querySelectorAll('.aging-region-header[data-region]').forEach(el => {
    AGING_STATE.collapsedRegions.delete(el.dataset.region);
  });
  _agingRefreshPareto();
}

function agingCollapseAllRegions() {
  document.querySelectorAll('.aging-region-header[data-region]').forEach(el => {
    AGING_STATE.collapsedRegions.add(el.dataset.region);
  });
  _agingRefreshPareto();
}

// ─────────────────────────────────────────────────────────────
// 7. DETAIL TABLE
// ─────────────────────────────────────────────────────────────
function _renderDetailTable(rowsA) {
  // Sort
  const col = AGING_STATE.detailSortCol;
  const dir = AGING_STATE.detailSortDir === 'asc' ? 1 : -1;
  const sorted = [...rowsA].sort((a, b) => {
    if (col === 'days')        return dir * (a.days    - b.days);
    if (col === 'balance')     return dir * (a.balance - b.balance);
    if (col === 'invoiceDate') return dir * ((a.invoiceDate||0) - (b.invoiceDate||0));
    if (col === 'customer')    return dir * a.customerName.localeCompare(b.customerName);
    return 0;
  });

  // Paginate
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / AGING_STATE.detailPageSize));
  const page  = Math.max(1, Math.min(AGING_STATE.detailPage, pages));
  const start = (page - 1) * AGING_STATE.detailPageSize;
  const slice = sorted.slice(start, start + AGING_STATE.detailPageSize);

  function sortTh(label, colKey) {
    const active = col === colKey;
    const arrow  = active ? (AGING_STATE.detailSortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<th class="aging-tbl-th ${active?'sort-active':''}" style="cursor:pointer"
      onclick="agingDetailSort('${colKey}')">${_aEsc(label)}${arrow}</th>`;
  }

  // Format invoice date
  function fmtDate(d) {
    if (!d) return '—';
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getUTCDate()} ${mon[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  const rows = slice.map(r => {
    const bk = AGING_STATE.bucketMode === 'gran' ? r.bucketGran : r.bucketStd;
    return `<tr class="aging-tbl-row">
      <td class="aging-col-code">${r.sapCode}</td>
      <td class="aging-col-client-sm">${_aEsc(r.customerName)}</td>
      <td class="aging-col-num">${r.invoiceNo || '—'}</td>
      <td class="aging-col-num">${fmtDate(r.invoiceDate)}</td>
      <td class="aging-col-num">${r.creditTerm}d</td>
      <td class="aging-col-num ${r.days > 0 ? 'aging-num-overdue' : 'aging-num-notdue'}">${r.days}</td>
      <td><span class="aging-bucket-badge ${_bucketBadgeClass(bk)}">${_aEsc(bk)}</span></td>
      <td class="aging-col-num aging-col-due-val">${_aFmt(r.balance)}</td>
    </tr>`;
  }).join('');

  // Pagination
  const paginationBtns = [];
  const maxBtns = 7;
  let pStart = Math.max(1, page - Math.floor(maxBtns/2));
  let pEnd   = Math.min(pages, pStart + maxBtns - 1);
  if (pEnd - pStart < maxBtns - 1) pStart = Math.max(1, pEnd - maxBtns + 1);

  if (page > 1) paginationBtns.push(`<button class="aging-page-btn" onclick="agingDetailPage(${page-1})">‹</button>`);
  for (let p = pStart; p <= pEnd; p++) {
    paginationBtns.push(`<button class="aging-page-btn ${p===page?'active':''}" onclick="agingDetailPage(${p})">${p}</button>`);
  }
  if (page < pages) paginationBtns.push(`<button class="aging-page-btn" onclick="agingDetailPage(${page+1})">›</button>`);

  return `
  <div class="aging-card aging-detail-card">
    <div class="aging-detail-header">
      <div class="aging-card-title">All Invoices
        <span class="aging-card-subtitle">${total.toLocaleString()} invoices · ${_aEsc(AGING_STATE.monthA||'—')}</span>
      </div>
      <button class="aging-collapse-btn" onclick="agingToggleDetail()">
        ${AGING_STATE.detailVisible ? '▲ Collapse' : '▼ Expand'}
      </button>
    </div>
    ${AGING_STATE.detailVisible ? `
    <div class="aging-detail-body">
      <div class="aging-pareto-wrap">
        <table class="aging-tbl">
          <thead>
            <tr class="aging-tbl-header">
              <th class="aging-tbl-th">SAP Code</th>
              ${sortTh('Client', 'customer')}
              <th class="aging-tbl-th">Invoice No.</th>
              ${sortTh('Invoice Date', 'invoiceDate')}
              <th class="aging-tbl-th">Term</th>
              ${sortTh('Days', 'days')}
              <th class="aging-tbl-th">Bucket</th>
              ${sortTh('Balance (USD)', 'balance')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="aging-pagination">
        <span class="aging-page-info">Showing ${start+1}–${Math.min(start+AGING_STATE.detailPageSize, total)} of ${total.toLocaleString()}</span>
        <div class="aging-page-btns">${paginationBtns.join('')}</div>
      </div>
    </div>` : ''}
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// 7b. CUSTOMER 360 VIEW — merges Aging + SALES_MASTER/Sales data
// ─────────────────────────────────────────────────────────────

// Gather everything needed for one customer's 360 view
// Format a Date as "DD Mon YYYY" for display
function _fmtInvoiceDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTH_NAMES[d.getUTCMonth()+1]} ${d.getUTCFullYear()}`;
}

// Revenue-stream breakdown for an invoice — NOTE: Aging data has no
// per-invoice category detail (Cards/Perso/Processing etc.); that split
// only exists as monthly aggregates per customer in the Sales data. This
// is therefore a proxy: the customer's revenue by category for the
// invoice's month, not a literal line-item match to that specific invoice.
function _invoiceRevenueBreakdown(sapCode, invoiceDate, entity) {
  if (!invoiceDate || !(invoiceDate instanceof Date) || isNaN(invoiceDate.getTime())) return null;
  const y = invoiceDate.getUTCFullYear();
  const m = invoiceDate.getUTCMonth() + 1;
  const rows = (STATE.salesRows || []).filter(r => r.code === sapCode && r.year === y && r.month === m);
  if (!rows.length) return { year: y, month: m, byCat: {}, showVolume: entity !== 'dp' };

  const byCat = {};
  for (const r of rows) {
    const cat = r.categorization || r.mainCategory || r.productType || 'Other';
    if (!byCat[cat]) byCat[cat] = { revenue: 0, volume: 0 };
    byCat[cat].revenue += _salesRowUSD(r);
    byCat[cat].volume  += (r.volume || 0);
  }
  return { year: y, month: m, byCat, showVolume: entity !== 'dp' };
}

function _renderInvoiceBreakdownHTML(monthly) {
  if (!monthly || !Object.keys(monthly.byCat).length) {
    return `<div class="aging-invoice-breakdown-empty">No sales data found for ${monthly ? MONTH_NAMES[monthly.month]+' '+monthly.year : "this invoice's month"} — showing revenue stream isn't possible for this invoice.</div>`;
  }
  const chips = Object.entries(monthly.byCat).map(([cat, v]) => {
    const rev = _aCompact(v.revenue);
    const vol = monthly.showVolume && v.volume ? ` <span class="aging-invoice-breakdown-vol">· Vol ${Math.round(v.volume).toLocaleString('en-US')}</span>` : '';
    return `<span class="aging-invoice-breakdown-chip"><strong>${_aEsc(cat)}:</strong> ${rev}${vol}</span>`;
  }).join('');
  return `<div class="aging-invoice-breakdown">
    <span class="aging-invoice-breakdown-label">Revenue stream — ${MONTH_NAMES[monthly.month]} ${monthly.year} (proxy: this customer's monthly sales, not a line-item invoice match):</span>
    <div class="aging-invoice-breakdown-chips">${chips}</div>
  </div>`;
}

function _customer360Data(sapCode) {
  const allAgingRows = (STATE.agingRows || []).filter(r => r.sapCode === sapCode);
  const custMeta = (typeof SALES_MASTER !== 'undefined' && SALES_MASTER.customers)
    ? (SALES_MASTER.customers[sapCode] || {}) : {};
  const sample = allAgingRows[0] || {};

  // Current-month snapshot (whatever month is selected on the dashboard)
  const currentRows = allAgingRows.filter(r => r.reportLabel === AGING_STATE.monthA);
  const keys = _bucketKeys();
  const buckets = {};
  keys.forEach(k => { buckets[k] = 0; });
  let currentTotal = 0, currentDue = 0, oldestDays = 0;
  currentRows.forEach(r => {
    const bk = AGING_STATE.bucketMode === 'gran' ? r.bucketGran : r.bucketStd;
    if (buckets[bk] !== undefined) buckets[bk] += r.balance;
    currentTotal += r.balance;
    if (r.days > 0) currentDue += r.balance;
    if (r.days > oldestDays) oldestDays = r.days;
  });
  const worstBucket = _worstBucketFromTotals(buckets, keys);
  const entity = (currentRows[0] || sample).entity || null;   // 'mc' | 'dp'

  // Aging trend across all available report months
  const months = getAgingMonths();
  const agingTrend = months.map(m => ({
    month: m,
    total: allAgingRows.filter(r => r.reportLabel === m).reduce((s, r) => s + r.balance, 0),
  }));

  // Sales — YTD Revenue & Volume, using the exact same period + row
  // selection as the Revenues tab (see _salesYTDWindow / _buildSalesYTDMap)
  const ytdWindow = _salesYTDWindow();
  const ytdMap    = _buildSalesYTDMap(ytdWindow);
  const ytdEntry  = ytdMap[sapCode] || { revenue: 0, volume: 0 };
  const ytdRevenue = ytdEntry.revenue;
  const ytdVolume  = ytdEntry.volume;
  const dso = _calcDSO(currentTotal, ytdRevenue, ytdWindow?.daysYTD);
  const ytdLabel = ytdWindow ? _salesPeriodLabel(ytdWindow.year, ytdWindow.month, false) : null;

  // Revenue trend (last 12 months with data) still spans full history — a
  // trend chart, unlike the YTD KPI cards, is meant to show change over time
  const salesRows = (STATE.salesRows || []).filter(r => r.code === sapCode);
  const revByMonth = {};
  for (const r of salesRows) {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
    revByMonth[key] = (revByMonth[key] || 0) + _salesRowUSD(r);
  }
  const monthKeys = Object.keys(revByMonth).sort();
  const revenueTrend = monthKeys.slice(-12).map(k => ({ month: k, revenue: revByMonth[k] }));

  return {
    sapCode,
    customerName:   sample.customerName   || custMeta.shortName || custMeta.fullName || String(sapCode),
    mainRegion:     sample.mainRegion     || custMeta.mainRegion || 'Unknown',
    country:        sample.country        || custMeta.country    || '',
    bankFintech:    sample.bankFintech    || custMeta.bankFintech || '',
    accountManager: custMeta.accountManager || '',
    entity,
    currentTotal, currentDue, oldestDays, buckets, worstBucket, dso,
    currentRowsCount: currentRows.length,
    agingTrend, revenueTrend,
    ytdYear:      ytdWindow?.year || null,
    ytdLabel,
    ytdRevenue, ytdVolume,
    hasYTDSales:  !!ytdMap[sapCode],
    openInvoices: currentRows.filter(r => r.days > 0 && Math.abs(r.balance) >= 0.5).sort((a, b) => b.days - a.days),
  };
}

// Enrich a customer's open invoices with (proxy) Sales Value + revenue
// breakdown, and sort per AGING_STATE.invoiceSort. Shared by the modal
// render and the "Export Invoices" button so both stay in sync.
function _customer360SortedInvoices(sapCode, d) {
  const enriched = d.openInvoices.map(r => {
    const monthly = _invoiceRevenueBreakdown(sapCode, r.invoiceDate, d.entity);
    const salesValue = monthly ? Object.values(monthly.byCat).reduce((s, c) => s + c.revenue, 0) : 0;
    return { ...r, salesValue, monthly };
  });

  const { col: sortCol, dir: sortDir } = AGING_STATE.invoiceSort;
  const sortMul = sortDir === 'asc' ? 1 : -1;
  const bucketOf = r => AGING_STATE.bucketMode === 'gran' ? r.bucketGran : r.bucketStd;
  enriched.sort((a, b) => {
    let av, bv;
    switch (sortCol) {
      case 'invoiceNo':   av = a.invoiceNo || '';         bv = b.invoiceNo || '';         return sortMul * String(av).localeCompare(String(bv));
      case 'invoiceDate': av = a.invoiceDate?.getTime()||0; bv = b.invoiceDate?.getTime()||0; break;
      case 'bucket':      av = bucketOf(a);               bv = bucketOf(b);               return sortMul * String(av).localeCompare(String(bv));
      case 'salesValue':  av = a.salesValue;               bv = b.salesValue;             break;
      case 'balance':     av = a.balance;                  bv = b.balance;                break;
      case 'days': default: av = a.days;                   bv = b.days;                   break;
    }
    return sortMul * (av - bv);
  });

  return { enriched, bucketOf, sortCol, sortDir };
}

function _renderCustomer360Modal(sapCode) {
  const d = _customer360Data(sapCode);
  AGING_STATE._current360SapCode = sapCode;

  const { enriched, bucketOf, sortCol, sortDir } = _customer360SortedInvoices(sapCode, d);

  const all = enriched;
  const sortIcon = c => sortCol === c ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  // Pagination
  const pageSize  = AGING_STATE.invoicePageSize;
  const pages     = Math.max(1, Math.ceil(all.length / pageSize));
  const page      = Math.min(Math.max(1, AGING_STATE.invoicePage), pages);
  const pgStart   = (page - 1) * pageSize;
  const pageItems = all.slice(pgStart, pgStart + pageSize);

  const invoiceRows = pageItems.map((r, i) => {
    const rid = `c360inv_${pgStart + i}`;
    const bk  = bucketOf(r);
    return `
    <tr>
      <td><button class="aging-invoice-link" onclick="agingToggleInvoiceDetail('${rid}')">${_aEsc(r.invoiceNo || '—')}</button></td>
      <td>${_fmtInvoiceDate(r.invoiceDate)}</td>
      <td class="${r.days > 0 ? 'aging-num-overdue' : 'aging-num-notdue'}">${r.days}</td>
      <td><span class="aging-bucket-badge ${_bucketBadgeClass(bk)}">${_aEsc(bk)}</span></td>
      <td>${r.salesValue > 0 ? _aFmt(r.salesValue) : '<span class="aging-zero">—</span>'}</td>
      <td class="aging-col-due-val">${_aFmt(r.balance)}</td>
    </tr>
    <tr id="inv-detail-${rid}" class="aging-invoice-detail-row" style="display:none">
      <td colspan="6">${_renderInvoiceBreakdownHTML(r.monthly)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="aging-empty-msg">No open invoices for ${_aEsc(AGING_STATE.monthA||'the selected month')}</td></tr>`;

  // Pagination buttons (same pattern as the Detail table)
  const invPagBtns = [];
  const maxBtns = 7;
  let ipStart = Math.max(1, page - Math.floor(maxBtns/2));
  let ipEnd   = Math.min(pages, ipStart + maxBtns - 1);
  if (ipEnd - ipStart < maxBtns - 1) ipStart = Math.max(1, ipEnd - maxBtns + 1);
  if (page > 1) invPagBtns.push(`<button class="aging-page-btn" onclick="agingInvoicePage(${page-1})">‹</button>`);
  for (let p = ipStart; p <= ipEnd; p++) {
    invPagBtns.push(`<button class="aging-page-btn ${p===page?'active':''}" onclick="agingInvoicePage(${p})">${p}</button>`);
  }
  if (page < pages) invPagBtns.push(`<button class="aging-page-btn" onclick="agingInvoicePage(${page+1})">›</button>`);

  const invoicePagination = all.length ? `
    <div class="aging-pagination">
      <span class="aging-page-info">Showing ${all.length ? pgStart+1 : 0}–${Math.min(pgStart+pageSize, all.length)} of ${all.length.toLocaleString()}</span>
      <div class="aging-page-btns">${invPagBtns.join('')}</div>
    </div>` : '';

  const totalSalesValue = all.reduce((s, r) => s + r.salesValue, 0);
  const totalBalance    = all.reduce((s, r) => s + r.balance, 0);
  const invoiceTotalRow = all.length ? `
    <tr class="aging-tbl-total">
      <td colspan="4"><strong>Total (${all.length} invoice${all.length===1?'':'s'})</strong></td>
      <td><strong>${totalSalesValue > 0 ? _aFmt(totalSalesValue) : '—'}</strong></td>
      <td class="aging-col-due-val"><strong>${_aFmt(totalBalance)}</strong></td>
    </tr>` : '';

  return `
  <div class="aging-360-panel" onclick="event.stopPropagation()">
    <div class="aging-360-header">
      <div>
        <div class="aging-360-title">${_aEsc(d.customerName)}</div>
        <div class="aging-360-meta">
          SAP ${d.sapCode} &nbsp;·&nbsp; ${_aEsc(d.mainRegion)}
          ${d.country ? `&nbsp;·&nbsp; ${_aEsc(d.country)}` : ''}
          ${d.bankFintech ? `&nbsp;·&nbsp; ${_aEsc(d.bankFintech)}` : ''}
          ${d.accountManager ? `&nbsp;·&nbsp; AM: ${_aEsc(d.accountManager)}` : ''}
        </div>
      </div>
      <button class="aging-360-close" onclick="closeCustomer360()">✕</button>
    </div>

    <div class="aging-360-kpi-strip">
      <div class="aging-360-kpi"><div class="aging-360-kpi-label">AR Balance</div><div class="aging-360-kpi-val">${_aCompact(d.currentTotal)}</div><div class="aging-360-kpi-sub">${_aEsc(AGING_STATE.monthA||'—')}</div></div>
      <div class="aging-360-kpi"><div class="aging-360-kpi-label">Overdue</div><div class="aging-360-kpi-val">${_aCompact(d.currentDue)}</div><div class="aging-360-kpi-sub"><span class="aging-bucket-badge ${_bucketBadgeClass(d.worstBucket)}">${_aEsc(d.worstBucket)}</span></div></div>
      <div class="aging-360-kpi"><div class="aging-360-kpi-label">DSO</div><div class="aging-360-kpi-val">${d.dso != null ? Math.round(d.dso) + 'd' : '—'}</div><div class="aging-360-kpi-sub">${d.ytdLabel ? 'based on '+d.ytdLabel : 'no sales data'}</div></div>
      <div class="aging-360-kpi"><div class="aging-360-kpi-label">YTD Revenue</div><div class="aging-360-kpi-val">${_aCompact(d.ytdRevenue)}</div><div class="aging-360-kpi-sub">${d.hasYTDSales ? d.ytdLabel+' · USD' : (d.ytdLabel ? 'no sales · '+d.ytdLabel : 'no sales data')}</div></div>
      ${d.entity !== 'dp' ? `<div class="aging-360-kpi"><div class="aging-360-kpi-label">YTD Volume</div><div class="aging-360-kpi-val">${d.ytdVolume ? _aCompact(d.ytdVolume) : '—'}</div><div class="aging-360-kpi-sub">${d.ytdLabel || ''}</div></div>` : ''}
    </div>

    <div class="aging-360-grid">
      <div class="aging-360-section">
        <div class="aging-card-title">Revenue Trend <span class="aging-card-subtitle">last 12 months</span></div>
        <div class="aging-chart-wrap">
          ${d.revenueTrend.length ? '<canvas id="aging-360-chart-rev" height="140"></canvas>' : '<div class="aging-empty-msg">No sales history for this customer</div>'}
        </div>
      </div>
      <div class="aging-360-section">
        <div class="aging-card-title">Aging Trend <span class="aging-card-subtitle">total AR balance by month</span></div>
        <div class="aging-chart-wrap">
          <canvas id="aging-360-chart-aging" height="140"></canvas>
        </div>
      </div>
    </div>

    <div class="aging-360-section aging-360-section-full">
      <div class="aging-card-title">
        Open Invoices <span class="aging-card-subtitle">click an invoice number for its revenue stream · ${_aEsc(AGING_STATE.monthA||'—')}</span>
        <button class="aging-invoice-export-btn" onclick="exportCustomer360Invoices(${sapCode})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>
      <div class="aging-360-tbl-scroll">
        <table class="aging-tbl aging-360-tbl aging-360-tbl-center">
          <thead><tr>
            <th class="aging-sortable-th" onclick="agingSortInvoices('invoiceNo')">Invoice No.${sortIcon('invoiceNo')}</th>
            <th class="aging-sortable-th" onclick="agingSortInvoices('invoiceDate')">Invoice Date${sortIcon('invoiceDate')}</th>
            <th class="aging-sortable-th" onclick="agingSortInvoices('days')">Days${sortIcon('days')}</th>
            <th class="aging-sortable-th" onclick="agingSortInvoices('bucket')">Bucket${sortIcon('bucket')}</th>
            <th class="aging-sortable-th" onclick="agingSortInvoices('salesValue')">Sales Value${sortIcon('salesValue')}</th>
            <th class="aging-sortable-th" onclick="agingSortInvoices('balance')">Balance${sortIcon('balance')}</th>
          </tr></thead>
          <tbody>${invoiceRows}</tbody>
          <tfoot>${invoiceTotalRow}</tfoot>
        </table>
      </div>
      ${invoicePagination}
    </div>
  </div>`;
}

function agingInvoicePage(p) {
  AGING_STATE.invoicePage = p;
  _refreshCustomer360Modal();
}

function agingSortInvoices(col) {
  if (AGING_STATE.invoiceSort.col === col) {
    AGING_STATE.invoiceSort.dir = AGING_STATE.invoiceSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    AGING_STATE.invoiceSort.col = col;
    AGING_STATE.invoiceSort.dir = (col === 'invoiceNo' || col === 'bucket') ? 'asc' : 'desc';
  }
  AGING_STATE.invoicePage = 1;
  _refreshCustomer360Modal();
}

function agingToggleInvoiceDetail(rid) {
  const row = document.getElementById('inv-detail-' + rid);
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
}

function _refreshCustomer360Modal() {
  const sapCode = AGING_STATE._current360SapCode;
  const overlay = document.getElementById('aging-360-overlay');
  if (!sapCode || !overlay) return;
  overlay.innerHTML = _renderCustomer360Modal(sapCode);
  requestAnimationFrame(() => _drawCustomer360Charts(sapCode));
}

async function exportCustomer360Invoices(sapCode) {
  const d = _customer360Data(sapCode);
  const { enriched } = _customer360SortedInvoices(sapCode, d);
  if (!enriched.length) {
    showToast('No open invoices to export.', 'warning');
    return;
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Financial Dashboard';
    wb.created = new Date();

    const ws = wb.addWorksheet('Open Invoices');
    ws.columns = [
      { header:'Invoice No.',  key:'invoiceNo',  width:16 },
      { header:'Invoice Date', key:'invDate',    width:14 },
      { header:'Days',         key:'days',       width:8  },
      { header:'Bucket',       key:'bucket',     width:14 },
      { header:'Sales Value',  key:'salesValue', width:16 },
      { header:'Balance (USD)',key:'balance',    width:16 },
    ];

    const hdrFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1E3A5F'} };
    const hdrFont = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} };
    const totFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF2563EB'} };
    const totFont = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} };
    const whtFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFFFF'} };
    const altFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF8FAFC'} };
    const numFmt  = '#,##0';
    const thinBorder = {
      top:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}},
      left:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}},
    };

    const hdr = ws.addRow(ws.columns.map(c => c.header));
    hdr.eachCell(c => { c.fill = hdrFill; c.font = hdrFont; c.border = thinBorder;
      c.alignment = { horizontal:'center', vertical:'middle' }; });
    ws.getRow(1).height = 20;

    const bucketOf = r => AGING_STATE.bucketMode === 'gran' ? r.bucketGran : r.bucketStd;
    enriched.forEach((r, i) => {
      const row = ws.addRow([
        r.invoiceNo || '', _fmtInvoiceDate(r.invoiceDate), r.days, bucketOf(r),
        Math.round(r.salesValue), Math.round(r.balance),
      ]);
      row.eachCell((cell, ci) => {
        cell.fill = i % 2 === 0 ? whtFill : altFill;
        cell.border = thinBorder;
        if (ci >= 3 && ci !== 4) { cell.numFmt = numFmt; cell.alignment = { horizontal:'center' }; }
        else cell.alignment = { horizontal:'center' };
      });
    });

    const totRow = ws.addRow(['', '', '', 'TOTAL',
      Math.round(enriched.reduce((s,r)=>s+r.salesValue,0)),
      Math.round(enriched.reduce((s,r)=>s+r.balance,0))]);
    totRow.eachCell(c => { c.fill = totFill; c.font = totFont; c.border = thinBorder;
      c.numFmt = numFmt; c.alignment = { horizontal:'center' }; });

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url;
    a.download = `OpenInvoices_${d.sapCode}_${AGING_STATE.monthA}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Open Invoices exported.', 'success');
  } catch (err) {
    console.error('[Aging] Open Invoices export failed:', err);
    showToast('Export failed: ' + err.message, 'error');
  }
}

function _drawCustomer360Charts(sapCode) {
  const d = _customer360Data(sapCode);
  const isDark = STATE.theme === 'dark';
  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textC  = isDark ? '#94a3b8' : '#64748b';
  const _fmtK  = v => '$' + (Math.abs(v)>=1e6 ? (v/1e6).toFixed(1)+'M' : Math.abs(v)>=1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v));

  _destroyChart('c360rev');
  const revCanvas = document.getElementById('aging-360-chart-rev');
  if (revCanvas && d.revenueTrend.length) {
    AGING_STATE._charts['c360rev'] = new Chart(revCanvas, {
      type: 'bar',
      data: {
        labels: d.revenueTrend.map(m => m.month),
        datasets: [{
          label: 'Revenue (USD)',
          data: d.revenueTrend.map(m => Math.round(m.revenue)),
          backgroundColor: '#2563eb',
          borderRadius: 4,
          borderSkipped: false,
          datalabels: _dl(isDark ? '#e2e8f0' : '#1e293b', v => v > 0 ? _fmtK(v) : '', { anchor:'end', align:'top', font:{size:12,weight:800} }),
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString('en-US')}` } },
        },
        scales: {
          x: { ticks: { color: textC, font:{size:12} }, grid:{display:false} },
          y: { ticks: { color: textC, font:{size:12}, callback: v => '$'+(v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v) }, grid:{color:gridC} },
        },
      },
    });
  }

  _destroyChart('c360aging');
  const agingCanvas = document.getElementById('aging-360-chart-aging');
  if (agingCanvas) {
    AGING_STATE._charts['c360aging'] = new Chart(agingCanvas, {
      type: 'line',
      data: {
        labels: d.agingTrend.map(m => m.month),
        datasets: [{
          label: 'Total AR',
          data: d.agingTrend.map(m => Math.round(m.total)),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.08)',
          fill: true, tension: 0.35, pointRadius: 3,
          datalabels: _dl('#dc2626', v => v > 0 ? _fmtK(v) : '', { anchor:'end', align:'top', font:{size:12,weight:800} }),
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString('en-US')}` } },
        },
        scales: {
          x: { ticks: { color: textC, font:{size:12} }, grid:{display:false} },
          y: { ticks: { color: textC, font:{size:12}, callback: v => '$'+(v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v) }, grid:{color:gridC} },
        },
      },
    });
  }
}

function _customer360EscHandler(e) {
  if (e.key === 'Escape') closeCustomer360();
}

function openCustomer360(sapCode) {
  sapCode = parseInt(sapCode);
  if (!sapCode) return;
  AGING_STATE.invoicePage = 1;

  let overlay = document.getElementById('aging-360-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'aging-360-overlay';
    overlay.className = 'aging-360-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = _renderCustomer360Modal(sapCode);
  overlay.style.display = 'flex';
  overlay.onclick = () => closeCustomer360();
  document.addEventListener('keydown', _customer360EscHandler);

  requestAnimationFrame(() => _drawCustomer360Charts(sapCode));
}

function closeCustomer360() {
  const overlay = document.getElementById('aging-360-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  _destroyChart('c360rev');
  _destroyChart('c360aging');
  AGING_STATE._current360SapCode = null;
  document.removeEventListener('keydown', _customer360EscHandler);
}

// ─────────────────────────────────────────────────────────────
// 8. EXPORT TO EXCEL
// ─────────────────────────────────────────────────────────────
async function exportAgingToExcel() {
  if (!STATE.agingRows || !STATE.agingRows.length) {
    showToast('No aging data to export.', 'error');
    return;
  }
  if (!AGING_STATE.monthA) {
    showToast('Select a month first.', 'warning');
    return;
  }

  showToast('⏳ Building Aging Excel…', 'info', 8000);

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Financial Dashboard';
    wb.created = new Date();

    const rowsA = _agingFilter(AGING_STATE.monthA);
    const kpiA  = _computeKPIs(rowsA);
    const byCA  = _byCustomer(rowsA);

    const rowsB = AGING_STATE.monthB ? _agingFilter(AGING_STATE.monthB) : [];
    const kpiB  = AGING_STATE.monthB ? _computeKPIs(rowsB) : null;
    const mapB  = {};
    if (AGING_STATE.monthB) {
      _byCustomer(rowsB).forEach(c => { mapB[c.sapCode] = c; });
    }

    const keys = _bucketKeys();

    // ── Styles ──────────────────────────────────────────────────
    const hdrFill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1E3A5F'} };
    const totFill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF2563EB'} };
    const pctFill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF0F4FF'} };
    const whtFill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFFFF'} };
    const altFill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF8FAFC'} };
    const hdrFont  = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} };
    const totFont  = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} };
    const bodyFont = { name:'Calibri', size:10 };
    const boldFont = { name:'Calibri', size:10, bold:true };
    const numFmt   = '#,##0';
    const thinBorder = {
      top:    { style:'thin', color:{argb:'FFE2E8F0'} },
      bottom: { style:'thin', color:{argb:'FFE2E8F0'} },
      left:   { style:'thin', color:{argb:'FFE2E8F0'} },
      right:  { style:'thin', color:{argb:'FFE2E8F0'} },
    };

    function styleHdr(cell) {
      cell.fill = hdrFill; cell.font = hdrFont;
      cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
      cell.border = thinBorder;
    }
    function styleNum(cell, bold) {
      cell.numFmt = numFmt;
      cell.font   = bold ? boldFont : bodyFont;
      cell.alignment = { horizontal:'right' };
      cell.border = thinBorder;
    }
    function styleText(cell, bold) {
      cell.font   = bold ? boldFont : bodyFont;
      cell.border = thinBorder;
    }

    // ── Sheet 1: KPI Summary ─────────────────────────────────────
    const wsKPI = wb.addWorksheet('KPI Summary');
    wsKPI.columns = [
      { width: 28 }, { width: 18 }, { width: 18 }, { width: 16 }
    ];
    const kpiHdr = wsKPI.addRow(['Metric', AGING_STATE.monthA,
      AGING_STATE.monthB || '—', 'Δ Change']);
    kpiHdr.eachCell(c => styleHdr(c));
    wsKPI.getRow(1).height = 22;

    const kpiData = [
      ['Total Outstanding (USD)', kpiA.total,  kpiB?.total,  kpiB ? kpiA.total - kpiB.total : null],
      ['Not Due (USD)',           kpiA.notDue, kpiB?.notDue, kpiB ? kpiA.notDue - kpiB.notDue : null],
      ['Total Overdue (USD)',     kpiA.overdue,kpiB?.overdue, kpiB ? kpiA.overdue - kpiB.overdue : null],
      ['Overdue % of Total',      kpiA.overdueRatio, kpiB?.overdueRatio, kpiB ? kpiA.overdueRatio - kpiB.overdueRatio : null],
      ['Oldest Invoice (Days)',   kpiA.oldestDays, kpiB?.oldestDays, null],
      ['Overdue Clients (#)',     kpiA.overdueCustomers, kpiB?.overdueCustomers, null],
    ];

    kpiData.forEach((d, i) => {
      const row = wsKPI.addRow(d);
      row.getCell(1).font   = bodyFont;
      row.getCell(1).border = thinBorder;
      row.getCell(2).numFmt = i === 3 ? '0.0%' : numFmt;
      styleNum(row.getCell(2));
      styleNum(row.getCell(3));
      styleNum(row.getCell(4));
      row.eachCell(c => { c.fill = i%2===0 ? whtFill : altFill; });
    });

    // ── Sheet 2: Bucket Summary ──────────────────────────────────
    const wsBucket = wb.addWorksheet('Bucket Summary');
    const bCols = [{ width:20 }, { width:18 }, { width:18 }];
    wsBucket.columns = bCols;

    const bHdrRow = AGING_STATE.monthB
      ? ['Bucket', AGING_STATE.monthA, AGING_STATE.monthB, 'Δ Change']
      : ['Bucket', AGING_STATE.monthA];
    const bHdr = wsBucket.addRow(bHdrRow);
    bHdr.eachCell(c => styleHdr(c));

    keys.forEach((k, i) => {
      const vA = kpiA.bucketTotals[k] || 0;
      const vB = kpiB ? (kpiB.bucketTotals[k] || 0) : null;
      const rowData = AGING_STATE.monthB ? [k, vA, vB, vA - (vB||0)] : [k, vA];
      const row = wsBucket.addRow(rowData);
      styleText(row.getCell(1));
      for (let ci = 2; ci <= rowData.length; ci++) styleNum(row.getCell(ci));
      row.eachCell(c => { c.fill = i%2===0 ? whtFill : altFill; });
    });

    // Total row
    const bTotData = AGING_STATE.monthB
      ? ['Total', kpiA.total, kpiB?.total || 0, kpiA.total - (kpiB?.total||0)]
      : ['Total', kpiA.total];
    const bTot = wsBucket.addRow(bTotData);
    bTot.eachCell(c => { c.fill = totFill; c.font = totFont; c.border = thinBorder; });

    // ── Sheet 3 & 4: Top Clients per entity (100% of Total Due, grouped by Region) ──
    // Always exports ALL clients (100%), independent of the on-screen Pareto
    // threshold slider — one sheet per entity, so modupay Cards and modupay DP
    // don't mix in a single sheet.
    const ytdWindowX = _salesYTDWindow();
    const ytdMapX    = _buildSalesYTDMap(ytdWindowX);
    const regionFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDCE7F5'} };
    const regionFont = { name:'Calibri', size:10, bold:true, color:{argb:'FF1E3A5F'} };
    const otherFont  = { name:'Calibri', size:10, italic:true, color:{argb:'FF64748B'} };

    function buildTopClientsSheet(entityKey, sheetName) {
      const eRowsA = _agingFilterEntity(AGING_STATE.monthA, entityKey);
      const eByCA  = _byCustomer(eRowsA);
      if (!eByCA.length) return;   // skip empty sheet (e.g. entity has no data for this month)

      const eRowsB = AGING_STATE.monthB ? _agingFilterEntity(AGING_STATE.monthB, entityKey) : [];
      const eMapB  = {};
      if (AGING_STATE.monthB) _byCustomer(eRowsB).forEach(c => { eMapB[c.sapCode] = c; });

      const eRegions = _paretoByRegion(eByCA, 100, AGING_STATE.monthB ? _byCustomer(eRowsB) : null);

      const ws = wb.addWorksheet(sheetName);
      const colDefs = [
        { header:'SAP Code',     key:'sapCode',  width:12 },
        { header:'Client',       key:'name',     width:30 },
        { header:'Region',       key:'region',   width:18 },
        { header:'Worst Bucket', key:'worst',    width:14 },
        { header:`AR Bal. ${AGING_STATE.monthA}`, key:'totalA', width:16 },
      ];
      if (AGING_STATE.monthB) colDefs.push({ header:`AR Bal. ${AGING_STATE.monthB}`, key:'totalB', width:16 });
      keys.forEach(k => colDefs.push({ header:k, key:k, width:14 }));
      colDefs.push(
        { header:'Total Due', key:'due', width:16 }, { header:'%', key:'pct', width:8 },
        { header:`YTD Revenue ${ytdWindowX ? _salesPeriodLabel(ytdWindowX.year, ytdWindowX.month, false) : ''}`, key:'ytdRev', width:18 },
        { header:'DSO (days)', key:'dso', width:12 },
      );

      ws.columns = colDefs;
      const hdr = ws.addRow(colDefs.map(c => c.header));
      hdr.eachCell(c => styleHdr(c));
      ws.getRow(1).height = 22;

      const allDue = eByCA.reduce((s,c) => s + c.totalDue, 0);

      function writeClientRow(c, isOther, rowIdx, ytdRev, dso) {
        const cB  = isOther ? { total: c.totalB } : eMapB[c.sapCode];
        const pct = allDue > 0 ? c.totalDue / allDue : 0;
        const vals = [isOther ? '' : c.sapCode, c.customerName, c.mainRegion, c.worstBucket, c.total];
        if (AGING_STATE.monthB) vals.push(cB?.total || 0);
        keys.forEach(k => vals.push(c.buckets[k] || 0));
        vals.push(c.totalDue, pct, ytdRev || 0, dso != null ? Math.round(dso) : '');
        const row = ws.addRow(vals);
        const pctColIdx = vals.length - 2;   // '%' column (before YTD Rev, DSO)
        row.eachCell((cell, ci) => {
          cell.fill   = isOther ? whtFill : (rowIdx % 2 === 0 ? whtFill : altFill);
          cell.border = thinBorder;
          cell.font   = isOther ? otherFont : bodyFont;
          if (ci > 4) {
            cell.numFmt = ci === pctColIdx ? '0.0%' : numFmt;
            cell.alignment = { horizontal:'right' };
          }
        });
      }

      eRegions.forEach(r => {
        const regionYTDRev = r.clients.reduce((s,c) => s + (ytdMapX[c.sapCode]?.revenue||0), 0);
        const regionDSO    = _calcDSO(r.regionTotal, regionYTDRev, ytdWindowX?.daysYTD);

        const regHdrVals = ['', `${r.region}  —  ${r.clients.length} clients`, '', '', r.regionTotal];
        if (AGING_STATE.monthB) regHdrVals.push('');
        keys.forEach(() => regHdrVals.push(''));
        regHdrVals.push(r.regionTotalDue, allDue > 0 ? r.regionTotalDue / allDue : 0,
          regionYTDRev, regionDSO != null ? Math.round(regionDSO) : '');
        const regRow = ws.addRow(regHdrVals);
        const regPctIdx = regHdrVals.length - 2;
        regRow.eachCell((cell, ci) => {
          cell.fill = regionFill; cell.font = regionFont; cell.border = thinBorder;
          if (ci > 4) { cell.alignment = { horizontal:'right' }; cell.numFmt = ci === regPctIdx ? '0.0%' : numFmt; }
        });

        r.top.forEach((c, i) => writeClientRow(c, false, i, ytdMapX[c.sapCode]?.revenue||0,
          _calcDSO(c.total, ytdMapX[c.sapCode]?.revenue||0, ytdWindowX?.daysYTD)));
        if (r.otherAgg) {
          const otherYTDRev = r.other.reduce((s,c) => s + (ytdMapX[c.sapCode]?.revenue||0), 0);
          writeClientRow(r.otherAgg, true, 0, otherYTDRev, _calcDSO(r.otherAgg.total, otherYTDRev, ytdWindowX?.daysYTD));
        }
      });

      // Grand Total — across ALL clients (top + other) in every region, this entity only
      const grandYTDRev = eByCA.reduce((s,c) => s + (ytdMapX[c.sapCode]?.revenue||0), 0);
      const grandDSO     = _calcDSO(eByCA.reduce((s,c)=>s+c.total,0), grandYTDRev, ytdWindowX?.daysYTD);
      const totVals = ['', 'GRAND TOTAL', '', '', eByCA.reduce((s,c)=>s+c.total,0)];
      if (AGING_STATE.monthB) totVals.push(eByCA.reduce((s,c)=>s+(eMapB[c.sapCode]?.total||0),0));
      const colTotals = {};
      keys.forEach(k => { colTotals[k] = eByCA.reduce((s,c)=>s+(c.buckets[k]||0),0); });
      keys.forEach(k => totVals.push(colTotals[k]));
      totVals.push(allDue, 1, grandYTDRev, grandDSO != null ? Math.round(grandDSO) : '');
      const totRow = ws.addRow(totVals);
      totRow.eachCell(c => { c.fill = totFill; c.font = totFont; c.border = thinBorder;
        c.alignment = { horizontal:'right' }; });
    }

    buildTopClientsSheet('mc', 'Top Clients - modupay Cards');
    buildTopClientsSheet('dp', 'Top Clients - modupay DP');

    // ── Sheet 4: All Invoices ─────────────────────────────────────
    const wsDetail = wb.addWorksheet('All Invoices');
    wsDetail.columns = [
      { header:'SAP Code',     key:'sapCode',    width:12 },
      { header:'Client',       key:'customer',   width:30 },
      { header:'Region',       key:'region',     width:18 },
      { header:'Invoice No.',  key:'invoiceNo',  width:14 },
      { header:'Invoice Date', key:'invDate',    width:14 },
      { header:'Credit Term',  key:'term',       width:12 },
      { header:'Days',         key:'days',       width:8  },
      { header:'Bucket (Std)', key:'bucketStd',  width:14 },
      { header:'Bucket (Gran)',key:'bucketGran', width:14 },
      { header:'Balance (USD)',key:'balance',    width:16 },
    ];
    const dH = wsDetail.addRow(wsDetail.columns.map(c => c.header));
    dH.eachCell(c => styleHdr(c));
    wsDetail.getRow(1).height = 22;

    function fmtDateXL(d) {
      if (!d) return '';
      const pad = n => String(n).padStart(2,'0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
    }

    rowsA.forEach((r, i) => {
      const row = wsDetail.addRow([
        r.sapCode, r.customerName, r.mainRegion,
        r.invoiceNo, fmtDateXL(r.invoiceDate), r.creditTerm,
        r.days, r.bucketStd, r.bucketGran, r.balance,
      ]);
      row.eachCell((cell, ci) => {
        cell.fill   = i%2===0 ? whtFill : altFill;
        cell.font   = bodyFont;
        cell.border = thinBorder;
        if (ci === 10) { cell.numFmt = numFmt; cell.alignment = { horizontal:'right' }; }
        if (ci === 7)  { cell.alignment = { horizontal:'right' }; }
      });
    });

    // ── Tab colors ────────────────────────────────────────────────
    wb.getWorksheet('KPI Summary').properties.tabColor     = { argb:'FF2563EB' };
    wb.getWorksheet('Bucket Summary').properties.tabColor  = { argb:'FF059669' };
    const wsMC = wb.getWorksheet('Top Clients - modupay Cards');
    const wsDP = wb.getWorksheet('Top Clients - modupay DP');
    if (wsMC) wsMC.properties.tabColor = { argb:'FFD97706' };
    if (wsDP) wsDP.properties.tabColor = { argb:'FFB45309' };
    wb.getWorksheet('All Invoices').properties.tabColor    = { argb:'FF7C3AED' };

    // ── Download ──────────────────────────────────────────────────
    const filename = `Aging_${AGING_STATE.monthA}${AGING_STATE.monthB ? '_vs_'+AGING_STATE.monthB : ''}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    showToast('✓ Aging Excel exported!', 'success');
  } catch (err) {
    console.error('Aging export error:', err);
    showToast('Export failed: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// 9. EVENT HANDLERS (called from inline onclick)
// ─────────────────────────────────────────────────────────────
function agingSetMonthB(val) {
  AGING_STATE.monthB = val;
  renderAgingDashboard();
}
function agingSetRegion(val) {
  AGING_STATE.region = val;
  AGING_STATE.detailPage = 1;
  renderAgingDashboard();
}
function agingSetSearch(val) {
  AGING_STATE.search = val;
  AGING_STATE.detailPage = 1;
  _agingRefreshTable();
}
function agingSetBucketMode(val) {
  AGING_STATE.bucketMode = val;
  renderAgingDashboard();
}
function agingSetPareto(val) {
  let n = parseInt(val);
  if (!Number.isFinite(n)) n = 80;
  n = Math.max(1, Math.min(100, n));
  AGING_STATE.paretoThreshold = n;

  const input = document.getElementById('aging-pareto-input');
  if (input) input.value = n;
  document.querySelectorAll('.aging-pareto-preset-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === n);
  });

  _agingRefreshPareto();
}
function agingDetailSort(col) {
  if (AGING_STATE.detailSortCol === col) {
    AGING_STATE.detailSortDir = AGING_STATE.detailSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    AGING_STATE.detailSortCol = col;
    AGING_STATE.detailSortDir = 'desc';
  }
  AGING_STATE.detailPage = 1;
  _agingRefreshTable();
}
function agingDetailPage(p) {
  AGING_STATE.detailPage = p;
  _agingRefreshTable();
}
function agingToggleDetail() {
  AGING_STATE.detailVisible = !AGING_STATE.detailVisible;
  AGING_STATE.detailPage = 1;
  _agingRefreshTable();
}
function agingToggleRegion(region) {
  const set = AGING_STATE.collapsedRegions;
  if (set.has(region)) set.delete(region); else set.add(region);
  const rid  = _regionId(region);
  const body = document.getElementById('aging-region-body-' + rid);
  const icon = document.getElementById('aging-region-icon-' + rid);
  if (body) body.style.display = set.has(region) ? 'none' : '';
  if (icon) icon.textContent = set.has(region) ? '▶' : '▼';
}

// ── Partial refresh — pareto only (slider change) ─────────────
function _agingRefreshPareto() {
  if (!AGING_STATE.monthA) return;
  const rowsA = _agingFilter(AGING_STATE.monthA);
  const byCA  = _byCustomer(rowsA);
  const rowsB = AGING_STATE.monthB ? _agingFilter(AGING_STATE.monthB) : [];
  const byCB  = AGING_STATE.monthB ? _byCustomer(rowsB) : null;

  const slot = document.getElementById('aging-pareto-slot');
  if (slot) slot.innerHTML = _renderParetoTable(byCA, byCB);
}

// ── Partial refresh — detail table only ───────────────────────
function _agingRefreshTable() {
  if (!AGING_STATE.monthA) return;
  const rowsA = _agingFilter(AGING_STATE.monthA);
  const slot  = document.getElementById('aging-detail-slot');
  if (slot) slot.innerHTML = _renderDetailTable(rowsA);
}

// ─────────────────────────────────────────────────────────────
// 10. ENTRY POINT
// ─────────────────────────────────────────────────────────────
function renderAgingDashboard() {
  const container = document.getElementById('aging-container');
  if (!container) return;

  // Guard: no data loaded
  if (!STATE.agingRows || !STATE.agingRows.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-title">No Aging Data Loaded</div>
        <div class="empty-state-body">
          Make sure aging CSV files exist in<br>
          <code>Aging/Masria Aging/</code> and <code>Aging/mdp Aging/</code>
        </div>
      </div>`;
    return;
  }

  // Sync entity + month from the global Year/Month/Entity filters (single
  // source of truth — see _syncAgingWithGlobalFilters)
  _syncAgingWithGlobalFilters();

  // ── Compute data ─────────────────────────────────────────────
  const rowsA   = _agingFilter(AGING_STATE.monthA);
  const kpiA    = _computeKPIs(rowsA);
  const byCA    = _byCustomer(rowsA);

  const rowsB   = AGING_STATE.monthB ? _agingFilter(AGING_STATE.monthB) : [];
  const kpiB    = AGING_STATE.monthB ? _computeKPIs(rowsB) : null;
  const byCB    = AGING_STATE.monthB ? _byCustomer(rowsB) : null;

  // ── Build HTML ───────────────────────────────────────────────
  const html = `
  <div class="aging-page">

    <!-- Controls -->
    ${_renderControls()}

    <!-- KPI Strip -->
    ${AGING_STATE.monthA
      ? _renderKPIs(kpiA, kpiB)
      : '<div class="aging-empty-msg">Select a month to view KPIs</div>'}

    ${AGING_STATE.monthA ? `

    <!-- Bucket Chart + Trend + Top 10, side by side -->
    <div class="aging-charts-row aging-charts-row-triple">
      ${_renderBucketChart(kpiA, kpiB)}
      ${_renderTrendChart()}
      ${_renderTop10Chart()}
    </div>

    <!-- Company DSO Trend (whole company, last 12 months) -->
    <div class="aging-charts-row aging-chart-row-full">
      ${_renderDSOTrendChart()}
    </div>

    <!-- Pareto Table -->
    <div id="aging-pareto-slot">
      ${_renderParetoTable(byCA, byCB)}
    </div>

    <!-- Detail Table -->
    <div id="aging-detail-slot">
      ${_renderDetailTable(rowsA)}
    </div>

    ` : ''}
  </div>`;

  container.innerHTML = html;

  // ── Draw charts after DOM is ready ───────────────────────────
  if (AGING_STATE.monthA) {
    requestAnimationFrame(() => {
      _drawBucketChart(kpiA, kpiB);
      _drawTrendChart();
      _drawTop10Chart(byCA);
      _drawDSOTrendChart();
    });
  }
}
