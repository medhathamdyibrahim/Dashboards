'use strict';
/* ============================================================
   KPIS.JS — KPI cards rendered inline inside each entity block
   MC: Revenue (Local/Export YoY), Cards Volume, GP, EBITDA, Net Profit
   DP: Revenue (Issuance/Processing YoY), GP Iss/Proc, Total GP, EBITDA, Net
   ============================================================ */

function _kpiAmt(v)  { return STATE.usdMode ? '$' + FMT.compact(v) : FMT.compact(v); }
function _kpiPct(v)  { return v == null ? '—' : FMT.pct(v); }
function _kpiVol(v)  { return v == null ? '—' : (v / 1e6).toFixed(2) + ' Mn'; }
function _yoyPct(curr, prior) { return prior ? (curr - prior) / Math.abs(prior) : null; }
function _posCls(v)  { return v == null ? '' : v >= 0 ? 'positive' : 'negative'; }

function _getIS(stmt, period) {
  if (!stmt?.IS) return null;
  if (STATE.usdMode) return stmt.IS[`_${period}USD`] || stmt.IS[period] || null;
  return stmt.IS[period] || null;
}

// ── Budget vs BL helper ───────────────────────────────────────
// Returns a sub-line object for "vs BL +X%" with correct color class.
// blRaw  : the raw EGP value from getBudgetISData()
// actual : the actual value already in display currency (EGP or USD)
function _vsBL(actual, blRaw) {
  if (blRaw == null || blRaw === 0) return null;
  const budgetAmt = STATE.usdMode ? blRaw / BUDGET_FX_RATE : blRaw;
  const varPct    = (actual - budgetAmt) / Math.abs(budgetAmt);
  return { text: `var% BUD ${FMT.pct(varPct)}`, cls: _posCls(actual - budgetAmt) };
}

// ── Build MC KPI cards ────────────────────────────────────────
function _buildMCKPIs(entityFolder, filters) {
  const stmt = STATE.statements[entityFolder];
  if (!stmt) return [];
  const ytd  = _getIS(stmt, 'ytd');
  const sply = _getIS(stmt, 'sply');
  if (!ytd) return [];

  const { year, month } = filters;
  const y = parseInt(year), m = parseInt(month);
  const mcFolders = ['Masria Cards', 'modupay Cards'];

  function salesVal(r) {
    const v = r.value || 0;
    if (STATE.usdMode) {
      const rate = (Number.isFinite(r.fxRate) && r.fxRate > 1) ? r.fxRate : (_fxRate(r) || 1);
      return v / rate;
    }
    return v;
  }
  const isLocal  = r => (r.jurisdiction || '').trim() === 'Local';
  const isExport = r => !isLocal(r);
  const isCards  = r => r.categorization === 'Cards';

  const curr  = (STATE.salesRows || []).filter(r => mcFolders.includes(r.entityFolder) && r.year === y     && r.month >= 1 && r.month <= m);
  const prior = (STATE.salesRows || []).filter(r => mcFolders.includes(r.entityFolder) && r.year === y - 1 && r.month >= 1 && r.month <= m);

  const revLoc   = curr.filter(isLocal).reduce((s,r)  => s + salesVal(r), 0);
  const revExp   = curr.filter(isExport).reduce((s,r) => s + salesVal(r), 0);
  const revLocLY = prior.filter(isLocal).reduce((s,r)  => s + salesVal(r), 0);
  const revExpLY = prior.filter(isExport).reduce((s,r) => s + salesVal(r), 0);
  const revTot   = revLoc + revExp;
  const revTotLY = revLocLY + revExpLY;

  const volLoc   = curr.filter(r  => isLocal(r)  && isCards(r)).reduce((s,r) => s + (r.volume||0), 0);
  const volExp   = curr.filter(r  => isExport(r) && isCards(r)).reduce((s,r) => s + (r.volume||0), 0);
  const volLocLY = prior.filter(r => isLocal(r)  && isCards(r)).reduce((s,r) => s + (r.volume||0), 0);
  const volExpLY = prior.filter(r => isExport(r) && isCards(r)).reduce((s,r) => s + (r.volume||0), 0);
  const volTot   = volLoc + volExp;
  const volTotLY = volLocLY + volExpLY;

  const gp      = ytd.grossProfit || 0;  const gpLY     = sply?.grossProfit || 0;
  const gpm     = ytd.gpm         || 0;  const gpmLY    = sply?.gpm         || 0;
  const ebitda  = ytd.ebitda      || 0;  const ebitdaLY = sply?.ebitda      || 0;
  const ebitdaM = ytd.ebitdaM     || 0;  const ebitdaMLY= sply?.ebitdaM     || 0;
  const net     = ytd.netProfit   || 0;  const netLY    = sply?.netProfit   || 0;
  const netM    = ytd.netM        || 0;  const netMLY   = sply?.netM        || 0;

  // ── Budget data (EGP) ─────────────────────────────────────────
  const bl        = (typeof getBudgetISData === 'function')
                    ? getBudgetISData(entityFolder, year, month)
                    : null;
  const hasBL     = bl && (bl.revenue || 0) !== 0;
  const blRevRaw  = hasBL ? (bl.revenue         || 0) : null;
  const blGPRaw   = hasBL ? (bl.grossProfit      || 0) : null;
  const blGPM     = hasBL ? (bl.gpm              || 0) : null;
  const blEbitdaRaw = hasBL ? (bl.ebitda         || 0) : null;
  const blEbitdaM   = hasBL ? (bl.ebitdaM        || 0) : null;
  const blNetRaw  = hasBL ? (bl.netProfit         || 0) : null;
  const blNetM    = hasBL ? (bl.netM              || 0) : null;

  // BL amounts in display currency for showing on cards
  const fx = STATE.usdMode ? BUDGET_FX_RATE : 1;
  const blRev    = hasBL ? blRevRaw   / fx : null;
  const blNet    = hasBL ? blNetRaw   / fx : null;

  const mk = (label, value, subs) => ({ label, value, subs });
  const yp = (c,p) => { const v=_yoyPct(c,p); return { text:`YoY ${v!=null?FMT.pct(v):'—'}`, cls:_posCls(v) }; };

  // Revenue card budget sub-line: "BUD [amount]  |  var% BUD [+/-X%]"
  const revBLSub  = hasBL ? (() => {
    const vsBL = _vsBL(revTot, blRevRaw);
    return { text: `BUD ${_kpiAmt(blRev)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  // GP budget sub-line: "BUD Margin [X%]  |  var% BUD [+/-X%]"
  const gpBLSub   = hasBL ? (() => {
    const vsBL = _vsBL(gp, blGPRaw);
    return { text: `BUD Margin ${_kpiPct(blGPM)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  // EBITDA budget sub-line: "BUD Margin [X%]  |  var% BUD [+/-X%]"
  const ebitdaBLSub = hasBL ? (() => {
    const vsBL = _vsBL(ebitda, blEbitdaRaw);
    return { text: `BUD Margin ${_kpiPct(blEbitdaM)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  // Net Profit budget sub-line: "BUD [amount]  |  var% BUD [+/-X%]"
  const netBLSub  = hasBL ? (() => {
    const vsBL = _vsBL(net, blNetRaw);
    return { text: `BUD ${_kpiAmt(blNet)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  return [
    mk('Revenue', _kpiAmt(revTot), [
      yp(revTot, revTotLY),
      { text:`Local ${_kpiAmt(revLoc)}  |  Export ${_kpiAmt(revExp)}`, cls:'' },
      ...(revBLSub ? [revBLSub] : []),
      { text:`LY: Local ${_kpiAmt(revLocLY)}  |  Export ${_kpiAmt(revExpLY)}`, cls:'muted' },
    ]),
    mk('Cards Volume', _kpiVol(volTot), [
      yp(volTot, volTotLY),
      { text:`Local ${_kpiVol(volLoc)}  |  Export ${_kpiVol(volExp)}`, cls:'' },
      { text:`LY: Local ${_kpiVol(volLocLY)}  |  Export ${_kpiVol(volExpLY)}`, cls:'muted' },
    ]),
    mk('Gross Profit', _kpiAmt(gp), [
      { text:`Margin ${_kpiPct(gpm)}  |  LY ${_kpiPct(gpmLY)}`, cls:'' },
      ...(gpBLSub ? [gpBLSub] : []),
      yp(gp, gpLY),
    ]),
    mk('EBITDA', _kpiAmt(ebitda), [
      { text:`Margin ${_kpiPct(ebitdaM)}  |  LY ${_kpiPct(ebitdaMLY)}`, cls:'' },
      ...(ebitdaBLSub ? [ebitdaBLSub] : []),
      yp(ebitda, ebitdaLY),
    ]),
    mk('Net Profit', _kpiAmt(net), [
      { text:`Margin ${_kpiPct(netM)}  |  LY ${_kpiPct(netMLY)}`, cls:'' },
      ...(netBLSub ? [netBLSub] : []),
      yp(net, netLY),
    ]),
  ];
}

// ── Build DP KPI cards ────────────────────────────────────────
function _buildDPKPIs(entityFolder, filters) {
  const stmt = STATE.statements[entityFolder];
  if (!stmt) return [];
  const ytd  = _getIS(stmt, 'ytd');
  const sply = _getIS(stmt, 'sply');
  if (!ytd) return [];

  const { year, month } = filters;

  const mk = (label, value, subs) => ({ label, value, subs });
  const yp = (c,p) => { const v=_yoyPct(c,p); return { text:`YoY ${v!=null?FMT.pct(v):'—'}`, cls:_posCls(v) }; };

  const revIss    = ytd.issuanceRevenues    ||0; const revIssLY    = sply?.issuanceRevenues    ||0;
  const revProc   = ytd.processingRevenues  ||0; const revProcLY   = sply?.processingRevenues  ||0;
  const revTot    = ytd.revenue             ||0; const revTotLY    = sply?.revenue             ||0;
  const gpIss     = ytd.issuanceGrossProfit ||0; const gpIssLY     = sply?.issuanceGrossProfit ||0;
  const gpIssM    = ytd.issuanceGPM         ||0; const gpIssMLY    = sply?.issuanceGPM         ||0;
  const gpProc    = ytd.processingGrossProfit||0;const gpProcLY    = sply?.processingGrossProfit||0;
  const gpProcM   = ytd.processingGPM       ||0; const gpProcMLY   = sply?.processingGPM       ||0;
  const gpTot     = ytd.totalGrossProfit    ||0; const gpTotLY     = sply?.totalGrossProfit    ||0;
  const gpTotM    = ytd.totalGPM            ||0; const gpTotMLY    = sply?.totalGPM            ||0;
  const ebitda    = ytd.ebitda              ||0; const ebitdaLY    = sply?.ebitda              ||0;
  const ebitdaM   = ytd.ebitdaM             ||0; const ebitdaMLY   = sply?.ebitdaM             ||0;
  const net       = ytd.netProfit           ||0; const netLY       = sply?.netProfit           ||0;
  const netM      = ytd.netM                ||0; const netMLY      = sply?.netM                ||0;

  // ── Budget data (EGP) ─────────────────────────────────────────
  const bl      = (typeof getBudgetISData === 'function')
                  ? getBudgetISData(entityFolder, year, month)
                  : null;
  const hasBL   = bl && (bl.revenue || 0) !== 0;

  const fx = STATE.usdMode ? BUDGET_FX_RATE : 1;

  // Raw EGP values from budget
  const blRevRaw      = hasBL ? (bl.revenue               || 0) : null;
  const blGpIssRaw    = hasBL ? (bl.issuanceGrossProfit    || 0) : null;
  const blGpIssM      = hasBL ? (bl.issuanceGPM            || 0) : null;
  const blGpProcRaw   = hasBL ? (bl.processingGrossProfit  || 0) : null;
  const blGpProcM     = hasBL ? (bl.processingGPM          || 0) : null;
  const blGpTotRaw    = hasBL ? (bl.totalGrossProfit       || 0) : null;
  const blGpTotM      = hasBL ? (bl.totalGPM               || 0) : null;
  const blEbitdaRaw   = hasBL ? (bl.ebitda                 || 0) : null;
  const blEbitdaM     = hasBL ? (bl.ebitdaM                || 0) : null;
  const blNetRaw      = hasBL ? (bl.netProfit              || 0) : null;
  const blNetM        = hasBL ? (bl.netM                   || 0) : null;

  // Display-currency amounts for BL labels
  const blRev  = hasBL ? blRevRaw  / fx : null;
  const blNet  = hasBL ? blNetRaw  / fx : null;

  // Sub-line builders
  const revBLSub = hasBL ? (() => {
    const vsBL = _vsBL(revTot, blRevRaw);
    return { text: `BUD ${_kpiAmt(blRev)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  const gpIssBLSub = hasBL ? (() => {
    const vsBL = _vsBL(gpIss, blGpIssRaw);
    return { text: `BUD Margin ${_kpiPct(blGpIssM)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  const gpProcBLSub = hasBL ? (() => {
    const vsBL = _vsBL(gpProc, blGpProcRaw);
    return { text: `BUD Margin ${_kpiPct(blGpProcM)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  const gpTotBLSub = hasBL ? (() => {
    const vsBL = _vsBL(gpTot, blGpTotRaw);
    return { text: `BUD Margin ${_kpiPct(blGpTotM)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  const ebitdaBLSub = hasBL ? (() => {
    const vsBL = _vsBL(ebitda, blEbitdaRaw);
    return { text: `BUD Margin ${_kpiPct(blEbitdaM)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  const netBLSub = hasBL ? (() => {
    const vsBL = _vsBL(net, blNetRaw);
    return { text: `BUD ${_kpiAmt(blNet)}  |  ${vsBL ? vsBL.text : '—'}`, cls: vsBL ? vsBL.cls : '' };
  })() : null;

  return [
    mk('Revenue', _kpiAmt(revTot), [
      yp(revTot, revTotLY),
      { text:`Issuance ${_kpiAmt(revIss)}  |  Processing ${_kpiAmt(revProc)}`, cls:'' },
      ...(revBLSub ? [revBLSub] : []),
      { text:`LY: Iss. ${_kpiAmt(revIssLY)}  |  Proc. ${_kpiAmt(revProcLY)}`, cls:'muted' },
    ]),
    mk('GP — Issuance', _kpiAmt(gpIss), [
      { text:`Margin ${_kpiPct(gpIssM)}  |  LY ${_kpiPct(gpIssMLY)}`, cls:'' },
      ...(gpIssBLSub ? [gpIssBLSub] : []),
      yp(gpIss, gpIssLY),
    ]),
    mk('GP — Processing', _kpiAmt(gpProc), [
      { text:`Margin ${_kpiPct(gpProcM)}  |  LY ${_kpiPct(gpProcMLY)}`, cls:'' },
      ...(gpProcBLSub ? [gpProcBLSub] : []),
      yp(gpProc, gpProcLY),
    ]),
    mk('Total Gross Profit', _kpiAmt(gpTot), [
      { text:`Margin ${_kpiPct(gpTotM)}  |  LY ${_kpiPct(gpTotMLY)}`, cls:'' },
      ...(gpTotBLSub ? [gpTotBLSub] : []),
      yp(gpTot, gpTotLY),
    ]),
    mk('EBITDA', _kpiAmt(ebitda), [
      { text:`Margin ${_kpiPct(ebitdaM)}  |  LY ${_kpiPct(ebitdaMLY)}`, cls:'' },
      ...(ebitdaBLSub ? [ebitdaBLSub] : []),
      yp(ebitda, ebitdaLY),
    ]),
    mk('Net Profit', _kpiAmt(net), [
      { text:`Margin ${_kpiPct(netM)}  |  LY ${_kpiPct(netMLY)}`, cls:'' },
      ...(netBLSub ? [netBLSub] : []),
      yp(net, netLY),
    ]),
  ];
}

// ── Render just the card grid HTML (no entity header — header is the entity block) ──
function _renderEntityKPICards(cards) {
  if (!cards || !cards.length) return '';
  return `<div class="entity-kpi-strip">
    ${cards.map(c => `
      <div class="kpi-card">
        <div class="kpi-label">${escHtml(c.label)}</div>
        <div class="kpi-value">${escHtml(c.value)}</div>
        ${c.subs.map(s => `<div class="kpi-sub ${s.cls||''}">${escHtml(s.text)}</div>`).join('')}
      </div>`).join('')}
  </div>`;
}

// ── renderKPIs: re-inject KPI cards into already-rendered entity blocks ──
function renderKPIs() {
  const { year, month, company } = STATE.filters;
  if (!year || !month) return;

  const entities = company ? [company] : ENTITY_FOLDERS;
  for (const ef of entities) {
    const id      = ef.replace(/\s/g, '_');
    const slot    = document.getElementById(`kpi-${id}`);
    if (!slot) continue;
    const isMasria = ef === 'Masria Cards' || ef === 'modupay Cards';
    const cards    = isMasria ? _buildMCKPIs(ef, { year, month })
                              : _buildDPKPIs(ef, { year, month });
    slot.innerHTML = _renderEntityKPICards(cards);
  }
}
