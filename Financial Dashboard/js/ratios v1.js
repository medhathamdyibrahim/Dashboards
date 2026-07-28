'use strict';
/* ============================================================
   RATIOS.JS — Financial ratio analysis with visual indicators
   ============================================================
   Sections:
     1. Formatters & small visual helpers
     2. Shared PL/BS extraction (used by both the main cards and
        the historical trend series)
     3. Entity-specific DSO (Receivables Days) — mirrors the exact
        methodology used in aging-dashboard.js (_calcDSO)
     4. Card + section builders (with formula tooltips)
     5. Entity + page renderers
     6. Ratio trend — registry, monthly series, modal, chart
     7. Formula tooltip (hover ⓘ) — show/hide
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 1. FORMATTERS & SMALL VISUAL HELPERS
// ─────────────────────────────────────────────────────────────
function _p(n,d)   { return d ? n/d : null; }
function _x(n,d)   { return d ? n/d : null; }
function _days(n,d){ return d ? (n/d)*365 : null; }
function _fp(v)    { return v!=null ? FMT.pct(v) : '—'; }
function _fx(v)    { return v!=null ? v.toFixed(2)+'x' : '—'; }
function _fd(v)    { return v!=null ? Math.round(v)+' d' : '—'; }
function _fpp(v)   { return v!=null ? (v>=0?'+':'')+((v)*100).toFixed(1)+'pp' : '—'; }

function _gauge(pct, good=true) {
  if(pct==null) return '';
  const w=Math.min(Math.abs(pct*100),100).toFixed(0);
  const col=pct<0?'var(--red)': good?'var(--green)':'var(--orange)';
  return `<div class="rt-gauge"><div class="rt-gauge-bar" style="width:${w}%;background:${col}"></div></div>`;
}

function _trend(c,p) {
  if(c==null||p==null) return '';
  const up=c>p;
  return `<span class="rt-arrow ${up?'rt-up':'rt-dn'}">${up?'▲':'▼'}</span>`;
}

// Build the (raw, unescaped) HTML for a formula tooltip.
// title  — the formula in words, e.g. "Gross Margin = Gross Profit ÷ Revenue"
// plug   — the same formula with the actual numbers plugged in
// result — the final formatted value (redundant with the card, but confirms it)
// extra  — optional breakdown line for compound figures (e.g. EBIT = EBITDA + D&A)
function _fml(title, plug, result, extra='') {
  return `<div class="rt-info-f">${title}</div>`
       + `<div class="rt-info-p">${plug}</div>`
       + (extra ? `<div class="rt-info-x">${extra}</div>` : '')
       + `<div class="rt-info-r">= ${result}</div>`;
}

// ─────────────────────────────────────────────────────────────
// 2. SHARED PL/BS EXTRACTION
//    Used by both the main (YTD-based) cards and the monthly
//    trend series (standalone-based), so the two never drift.
// ─────────────────────────────────────────────────────────────
function _extractPL(P, PLY) {
  P   = P   || {};
  PLY = PLY || {};
  const rev=P.revenue||0, gp=P.grossProfit||P.totalGrossProfit||0;
  const ebitda=P.ebitda||0, da=P.totalDA||0, ebit=ebitda+da;
  const ebt=P.ebt||0, net=P.netProfit||0;
  const cogs=Math.abs(P.cogs||(Math.abs(P.issuanceCost||0)+Math.abs(P.processingCost||0)));
  const finExp=Math.abs(P.financialExpenses||0);
  const lyRev=PLY.revenue||0, lyGP=PLY.grossProfit||PLY.totalGrossProfit||0;
  const lyEb=PLY.ebitda||0, lyNet=PLY.netProfit||0;
  const gpm=_p(gp,rev), ebm=_p(ebitda,rev), netm=_p(net,rev);
  const lyGpm=_p(lyGP,lyRev), lyEbm=_p(lyEb,lyRev), lyNetm=_p(lyNet,lyRev);
  return { rev,gp,ebitda,da,ebit,ebt,net,cogs,finExp, lyRev,lyGP,lyEb,lyNet, gpm,ebm,netm, lyGpm,lyEbm,lyNetm };
}

function _extractBS(BS) {
  let totalAssets=0,equity=0,currentAssets=0,currentLiab=0,cash=0,receivables=0,inventory=0;
  if(BS?.sections){
    for(const s of BS.sections){
      if(s.key==='nonCurrentAssets'||s.key==='currentAssets') totalAssets+=s.totalCurrent||0;
      if(s.key==='currentAssets') currentAssets=s.totalCurrent||0;
      if(s.key==='equity') equity=s.totalCurrent||0;
      if(s.key==='currentLiabilities') currentLiab=Math.abs(s.totalCurrent||0);
      for(const l of (s.lines||[])){
        const lb=(l.label||'').toLowerCase(), v=l.current||0;
        if(lb.includes('cash')||lb.includes('bank')) cash+=Math.abs(v);
        if(lb.includes('receiv')||lb.includes('debtor')) receivables+=Math.abs(v);
        if(lb.includes('inventor')||lb.includes('raw')) inventory+=Math.abs(v);
      }
    }
    if(!totalAssets) totalAssets=BS.totalAssets||0;
  }
  const totalLiab=Math.abs((BS?.totalEqLiab||0)-equity);
  const nonCurrAssets=totalAssets-currentAssets;
  return { totalAssets,equity,currentAssets,currentLiab,cash,receivables,inventory,totalLiab,nonCurrAssets };
}

// ─────────────────────────────────────────────────────────────
// 3. ENTITY-SPECIFIC DSO (Receivables Days)
//    Same exact methodology as aging-dashboard.js's _calcDSO:
//    DSO = AR Balance ÷ (Annualized Revenue ÷ 365), annualized
//    from the YTD-through-this-month revenue, sister-company
//    codes excluded, MC includes intercompany code by design.
// ─────────────────────────────────────────────────────────────
function _entityDSODetail(ef, year, month) {
  year = parseInt(year); month = parseInt(month);
  if (!year || !month) return null;
  if (typeof _calcDSO !== 'function' || typeof _getSalesRows !== 'function') return null; // aging module not loaded yet

  const rows = STATE.agingRows || [];
  if (!rows.length) return null;

  const entityCode = ef === 'mdp' ? 'dp' : 'mc';
  const label = `${MONTH_NAMES[month]}-${String(year).slice(-2)}`;

  const monthRows = rows.filter(r => r.reportLabel === label && r.entity === entityCode);
  if (!monthRows.length) return null;
  const arBalance = monthRows.reduce((s, r) => s + r.balance, 0);

  const daysYTD = _cumulativeDaysThroughMonth(year, month);
  const folders = entityCode === 'mc' ? ['modupay Cards', 'Masria Cards'] : ['modupay DP', 'mdp'];
  const opts    = entityCode === 'mc' ? { includeIntercompany: true } : {};
  const salesRows = _getSalesRows(folders, year, month, opts).curr;

  let revenue = 0;
  for (const r of salesRows) {
    if (AGING_DSO_EXCLUDED_SALES_CODES.has(r.code)) continue;
    revenue += _salesRowUSD(r);
  }

  const annualizedRevenue = revenue > 0 ? revenue * (365 / daysYTD) : 0;
  const dso = _calcDSO(arBalance, revenue, daysYTD);
  return { dso, arBalance, revenue, daysYTD, annualizedRevenue, label };
}

function _entityDSO(ef, year, month) {
  const d = _entityDSODetail(ef, year, month);
  return d ? d.dso : null;
}

// Fallback DSO when no Aging snapshot exists for a given month: same
// annualization math as _calcDSO (AR ÷ (Annualized Revenue ÷ 365)), just
// fed from the Balance Sheet's Receivables line and the Jan→month YTD
// revenue instead of the Aging module's AR balance. Using a single
// month's revenue here (instead of YTD) would overstate Days by ~12×,
// which was the bug — this keeps the same annualization logic as the
// real DSO calc, just with a lower-fidelity revenue source.
function _fallbackReceivablesDays(ef, year, month, receivables) {
  if (!receivables) return null;
  let ytdRev = 0;
  if (typeof _moIS === 'function') {
    for (let mo = 1; mo <= month; mo++) ytdRev += (_moIS(ef, year, mo)?.revenue || 0);
  }
  if (!ytdRev) return null;
  const daysYTD = (typeof _cumulativeDaysThroughMonth === 'function')
    ? _cumulativeDaysThroughMonth(year, month)
    : month * 30.4;
  return (typeof _calcDSO === 'function')
    ? _calcDSO(receivables, ytdRev, daysYTD)
    : _days(receivables, ytdRev);
}

// ─────────────────────────────────────────────────────────────
// 4. CARD + SECTION BUILDERS
// ─────────────────────────────────────────────────────────────
// key    — ratio id used by the trend chart (RATIO_DEFS)
// ef     — entity folder ('Masria Cards' | 'mdp'), needed to build the trend series
// formula— pre-built HTML (via _fml) shown in the ⓘ tooltip
function _card(label, val, note, gauge='', trend='', sub='', key=null, ef=null, formula='') {
  const cls=val&&val!=='—'?(val.startsWith('-')||val.startsWith('(')?'rt-val-neg':'rt-val-pos'):'rt-val-neu';
  const infoHtml = formula
    ? `<span class="rt-info-wrap"><span class="rt-info-icon" data-tip="${escHtml(formula)}" onmouseenter="_ratioInfoShow(this)" onmouseleave="_ratioInfoHide()" onclick="event.stopPropagation()">ⓘ</span></span>`
    : '';
  const clickable = key && ef;
  const onclick = clickable ? ` onclick="showRatioTrend('${key}','${ef}')"` : '';
  return `<div class="rt-card${clickable?' rt-card-clickable':''}"${onclick}>
    <div class="rt-card-head"><span class="rt-card-label">${escHtml(label)}${infoHtml}</span>${trend}</div>
    <div class="rt-card-val ${cls}">${escHtml(val)}</div>
    ${gauge}
    ${sub?`<div class="rt-card-sub">${escHtml(sub)}</div>`:''}
    <div class="rt-card-note">${escHtml(note)}</div>
  </div>`;
}

function _sec(icon, title, cards) {
  return `<div class="rt-sec">
    <div class="rt-sec-hdr"><span class="rt-sec-icon">${icon}</span><span class="rt-sec-title">${escHtml(title)}</span></div>
    <div class="rt-sec-grid">${cards.join('')}</div>
  </div>`;
}

function _buildRatioSections(ef, IS, BS) {
  const { year, month } = STATE.filters;
  const PL = _extractPL(IS?.ytd, IS?.sply);
  const B  = _extractBS(BS);
  const { rev,gp,ebitda,da,ebit,ebt,net,cogs,finExp, lyRev,lyGP,lyEb,lyNet, gpm,ebm,netm, lyGpm,lyEbm,lyNetm } = PL;
  const { totalAssets,equity,currentAssets,currentLiab,cash,receivables,inventory,totalLiab,nonCurrAssets } = B;

  const dsoDetail = _entityDSODetail(ef, year, month);
  const recDays   = dsoDetail?.dso ?? _fallbackReceivablesDays(ef, parseInt(year), parseInt(month), receivables);
  const recFormula = dsoDetail
    ? _fml('Receivables Days (DSO) = AR Balance ÷ (Annualized Revenue ÷ 365)',
        `${FMT.compact(dsoDetail.arBalance)} ÷ (${FMT.compact(dsoDetail.annualizedRevenue)} ÷ 365)`,
        _fd(dsoDetail.dso),
        `Annualized Revenue = YTD Revenue ${FMT.compact(dsoDetail.revenue)} × 365 ÷ ${Math.round(dsoDetail.daysYTD)} days covered · same methodology as the AR Aging tab`)
    : _fml('Receivables Days = Receivables ÷ (YTD Revenue annualized ÷ 365)',
        `${FMT.compact(receivables)} ÷ (Annualized YTD Revenue ÷ 365)`,
        _fd(recDays),
        'No matching Aging snapshot for this month — showing the balance-sheet estimate instead (still annualized, not a raw single-month figure)');

  return [
    _sec('📈','Profitability',[
      _card('Gross Margin',   _fp(gpm),            'Gross Profit / Revenue',      _gauge(gpm),  _trend(gpm,lyGpm),   lyGpm!=null?`LY: ${_fp(lyGpm)}`:'',
        'grossMargin', ef, _fml('Gross Margin = Gross Profit ÷ Revenue', `${FMT.compact(gp)} ÷ ${FMT.compact(rev)}`, _fp(gpm))),
      _card('EBITDA Margin',  _fp(ebm),            'EBITDA / Revenue',            _gauge(ebm),  _trend(ebm,lyEbm),   lyEbm!=null?`LY: ${_fp(lyEbm)}`:'',
        'ebitdaMargin', ef, _fml('EBITDA Margin = EBITDA ÷ Revenue', `${FMT.compact(ebitda)} ÷ ${FMT.compact(rev)}`, _fp(ebm))),
      _card('EBIT Margin',    _fp(_p(ebit,rev)),   'EBIT / Revenue',              _gauge(_p(ebit,rev)), '', '',
        'ebitMargin', ef, _fml('EBIT Margin = EBIT ÷ Revenue', `${FMT.compact(ebit)} ÷ ${FMT.compact(rev)}`, _fp(_p(ebit,rev)), `EBIT = EBITDA ${FMT.compact(ebitda)} + D&A ${FMT.compact(da)}`)),
      _card('EBT Margin',     _fp(_p(ebt,rev)),    'EBT / Revenue',               _gauge(_p(ebt,rev)),  '', '',
        'ebtMargin', ef, _fml('EBT Margin = EBT ÷ Revenue', `${FMT.compact(ebt)} ÷ ${FMT.compact(rev)}`, _fp(_p(ebt,rev)))),
      _card('Net Margin',     _fp(netm),           'Net Profit / Revenue',        _gauge(netm), _trend(netm,lyNetm), lyNetm!=null?`LY: ${_fp(lyNetm)}`:'',
        'netMargin', ef, _fml('Net Margin = Net Profit ÷ Revenue', `${FMT.compact(net)} ÷ ${FMT.compact(rev)}`, _fp(netm))),
      _card('ROA',            _fp(_p(net,totalAssets||null)), 'Net / Total Assets',_gauge(_p(net,totalAssets||null)),'','',
        'roa', ef, _fml('ROA = Net Profit ÷ Total Assets', `${FMT.compact(net)} ÷ ${FMT.compact(totalAssets)}`, _fp(_p(net,totalAssets||null)))),
      _card('ROE',            _fp(_p(net,equity||null)),      'Net / Equity',      _gauge(_p(net,equity||null)),    '','',
        'roe', ef, _fml('ROE = Net Profit ÷ Equity', `${FMT.compact(net)} ÷ ${FMT.compact(equity)}`, _fp(_p(net,equity||null)))),
      _card('COGS Ratio',     _fp(_p(cogs,rev)),   'COGS / Revenue',              _gauge(_p(-cogs,rev),false),'','',
        'cogsRatio', ef, _fml('COGS Ratio = COGS ÷ Revenue', `${FMT.compact(cogs)} ÷ ${FMT.compact(rev)}`, _fp(_p(cogs,rev)))),
    ]),
    _sec('💧','Liquidity',[
      _card('Current Ratio', _fx(_x(currentAssets,currentLiab||null)),            'Current Assets / Current Liabilities','','', currentLiab?`CA ${FMT.compact(currentAssets)} / CL ${FMT.compact(currentLiab)}`:'',
        'currentRatio', ef, _fml('Current Ratio = Current Assets ÷ Current Liabilities', `${FMT.compact(currentAssets)} ÷ ${FMT.compact(currentLiab)}`, _fx(_x(currentAssets,currentLiab||null)))),
      _card('Quick Ratio',   _fx(_x(currentAssets-inventory,currentLiab||null)),  '(CA − Inventory) / Current Liabilities','','','',
        'quickRatio', ef, _fml('Quick Ratio = (Current Assets − Inventory) ÷ Current Liabilities', `(${FMT.compact(currentAssets)} − ${FMT.compact(inventory)}) ÷ ${FMT.compact(currentLiab)}`, _fx(_x(currentAssets-inventory,currentLiab||null)))),
      _card('Cash Ratio',    _fx(_x(cash,currentLiab||null)),                     'Cash / Current Liabilities','','',cash?`Cash: ${FMT.compact(cash)}`:'',
        'cashRatio', ef, _fml('Cash Ratio = Cash ÷ Current Liabilities', `${FMT.compact(cash)} ÷ ${FMT.compact(currentLiab)}`, _fx(_x(cash,currentLiab||null)))),
      _card('Working Capital',currentAssets&&currentLiab?FMT.compact(currentAssets-currentLiab):'—','Current Assets − Current Liabilities','','','',
        'workingCapital', ef, _fml('Working Capital = Current Assets − Current Liabilities', `${FMT.compact(currentAssets)} − ${FMT.compact(currentLiab)}`, FMT.compact(currentAssets-currentLiab))),
    ]),
    _sec('⚙️','Efficiency',[
      _card('Asset Turnover',      _fx(_x(rev,totalAssets||null)),    'Revenue / Total Assets','','','',
        'assetTurnover', ef, _fml('Asset Turnover = Revenue ÷ Total Assets', `${FMT.compact(rev)} ÷ ${FMT.compact(totalAssets)}`, _fx(_x(rev,totalAssets||null)))),
      _card('Receivables Days',    _fd(recDays), dsoDetail?'AR Balance ÷ Annualized Revenue × 365 (DSO)':'Receivables / Revenue × 365','','',receivables?`AR: ${FMT.compact(receivables)}`:'',
        'receivablesDays', ef, recFormula),
      _card('Fixed Asset Turnover',_fx(_x(rev,nonCurrAssets||null)), 'Revenue / Non-Current Assets','','','',
        'fixedAssetTurnover', ef, _fml('Fixed Asset Turnover = Revenue ÷ Non-Current Assets', `${FMT.compact(rev)} ÷ ${FMT.compact(nonCurrAssets)}`, _fx(_x(rev,nonCurrAssets||null)))),
    ]),
    _sec('🏦','Leverage',[
      _card('Debt / Equity',  equity?_fx(_x(totalLiab,equity)):'—',      'Total Liabilities / Equity','','','',
        'debtEquity', ef, _fml('Debt / Equity = Total Liabilities ÷ Equity', `${FMT.compact(totalLiab)} ÷ ${FMT.compact(equity)}`, equity?_fx(_x(totalLiab,equity)):'—')),
      _card('Debt / Assets',  _fx(_x(totalLiab,totalAssets||null)),       'Total Liabilities / Total Assets',_gauge(_p(-totalLiab,totalAssets||null),false),'','',
        'debtAssets', ef, _fml('Debt / Assets = Total Liabilities ÷ Total Assets', `${FMT.compact(totalLiab)} ÷ ${FMT.compact(totalAssets)}`, _fx(_x(totalLiab,totalAssets||null)))),
      _card('Equity Ratio',   _fx(_x(equity,totalAssets||null)),          'Equity / Total Assets',_gauge(_p(equity,totalAssets||null)),'','',
        'equityRatio', ef, _fml('Equity Ratio = Equity ÷ Total Assets', `${FMT.compact(equity)} ÷ ${FMT.compact(totalAssets)}`, _fx(_x(equity,totalAssets||null)))),
      _card('Interest Cover', finExp>0?_fx(_x(ebit,finExp)):'—',         'EBIT / Financial Expenses','','','',
        'interestCover', ef, _fml('Interest Cover = EBIT ÷ Financial Expenses', `${FMT.compact(ebit)} ÷ ${FMT.compact(finExp)}`, finExp>0?_fx(_x(ebit,finExp)):'—')),
    ]),
    _sec('🚀','Growth vs Prior Year',[
      _card('Revenue Growth',    lyRev?_fp(_p(rev-lyRev,lyRev)):'—',      'YTD Revenue vs SPLY',        _gauge(lyRev?_p(rev-lyRev,lyRev):null), '','LY: '+FMT.compact(lyRev),
        'revenueGrowth', ef, _fml('Revenue Growth = (Revenue − LY Revenue) ÷ LY Revenue', `(${FMT.compact(rev)} − ${FMT.compact(lyRev)}) ÷ ${FMT.compact(lyRev)}`, lyRev?_fp(_p(rev-lyRev,lyRev)):'—')),
      _card('GP Growth',         lyGP?_fp(_p(gp-lyGP,lyGP)):'—',         'YTD Gross Profit vs SPLY',   _gauge(lyGP?_p(gp-lyGP,lyGP):null),    '','LY: '+FMT.compact(lyGP),
        'gpGrowth', ef, _fml('GP Growth = (Gross Profit − LY Gross Profit) ÷ LY Gross Profit', `(${FMT.compact(gp)} − ${FMT.compact(lyGP)}) ÷ ${FMT.compact(lyGP)}`, lyGP?_fp(_p(gp-lyGP,lyGP)):'—')),
      _card('EBITDA Growth',     lyEb?_fp(_p(ebitda-lyEb,lyEb)):'—',     'YTD EBITDA vs SPLY',         _gauge(lyEb?_p(ebitda-lyEb,lyEb):null),'','',
        'ebitdaGrowth', ef, _fml('EBITDA Growth = (EBITDA − LY EBITDA) ÷ LY EBITDA', `(${FMT.compact(ebitda)} − ${FMT.compact(lyEb)}) ÷ ${FMT.compact(lyEb)}`, lyEb?_fp(_p(ebitda-lyEb,lyEb)):'—')),
      _card('Net Profit Growth', lyNet?_fp(_p(net-lyNet,lyNet)):'—',      'YTD Net Profit vs SPLY',     _gauge(lyNet?_p(net-lyNet,lyNet):null), '','',
        'netProfitGrowth', ef, _fml('Net Profit Growth = (Net Profit − LY Net Profit) ÷ LY Net Profit', `(${FMT.compact(net)} − ${FMT.compact(lyNet)}) ÷ ${FMT.compact(lyNet)}`, lyNet?_fp(_p(net-lyNet,lyNet)):'—')),
      _card('GM Improvement',    lyGpm!=null&&gpm!=null?_fpp(gpm-lyGpm):'—','Gross Margin change vs LY','','','',
        'gmImprovement', ef, _fml('GM Improvement = Gross Margin − LY Gross Margin', `${_fp(gpm)} − ${_fp(lyGpm)}`, lyGpm!=null&&gpm!=null?_fpp(gpm-lyGpm):'—')),
      _card('EBITDA M Δ',        lyEbm!=null&&ebm!=null?_fpp(ebm-lyEbm):'—','EBITDA Margin change vs LY','','','',
        'ebitdaMDelta', ef, _fml('EBITDA Margin Δ = EBITDA Margin − LY EBITDA Margin', `${_fp(ebm)} − ${_fp(lyEbm)}`, lyEbm!=null&&ebm!=null?_fpp(ebm-lyEbm):'—')),
      _card('Net M Δ',           lyNetm!=null&&netm!=null?_fpp(netm-lyNetm):'—','Net Margin change vs LY','','','',
        'netMDelta', ef, _fml('Net Margin Δ = Net Margin − LY Net Margin', `${_fp(netm)} − ${_fp(lyNetm)}`, lyNetm!=null&&netm!=null?_fpp(netm-lyNetm):'—')),
    ]),
  ];
}

// ─────────────────────────────────────────────────────────────
// 5. ENTITY + PAGE RENDERERS
// ─────────────────────────────────────────────────────────────
function _renderEntityRatios(ef, name, IS, BS) {
  const id=ef.replace(/\s/g,'_');
  const ytd=IS?.ytd||{};
  const rev=ytd.revenue||0, gp=ytd.grossProfit||ytd.totalGrossProfit||0;
  const ebitda=ytd.ebitda||0, net=ytd.netProfit||0;
  const fmt=v=>FMT.compact(v);
  const arrow=(v,ly)=>{ if(!ly) return ''; const up=v>ly; return `<span style="color:${up?'var(--green)':'var(--red)'};">${up?'▲':'▼'} ${FMT.pct(Math.abs((v-ly)/Math.abs(ly)))}</span>`; };
  const lyRev=IS?.sply?.revenue||0, lyNet=IS?.sply?.netProfit||0;

  const flowHtml=`
    <div class="rt-flow">
      <div class="rt-flow-item"><div class="rt-flow-label">Revenue</div><div class="rt-flow-val">${fmt(rev)}</div><div class="rt-flow-yoy">${arrow(rev,lyRev)}</div></div>
      <div class="rt-flow-arrow">→</div>
      <div class="rt-flow-item"><div class="rt-flow-label">Gross Profit</div><div class="rt-flow-val">${fmt(gp)}</div><div class="rt-flow-pct">${FMT.pct(rev?gp/rev:0)} margin</div></div>
      <div class="rt-flow-arrow">→</div>
      <div class="rt-flow-item"><div class="rt-flow-label">EBITDA</div><div class="rt-flow-val">${fmt(ebitda)}</div><div class="rt-flow-pct">${FMT.pct(rev?ebitda/rev:0)} margin</div></div>
      <div class="rt-flow-arrow">→</div>
      <div class="rt-flow-item ${net>=0?'rt-flow-pos':'rt-flow-neg'}"><div class="rt-flow-label">Net Profit</div><div class="rt-flow-val">${fmt(net)}</div><div class="rt-flow-yoy">${arrow(net,lyNet)}</div></div>
    </div>`;

  const sections=_buildRatioSections(ef, IS, BS);
  return `
    <div class="rt-entity" id="rt-${id}">
      <div class="rt-entity-hdr" onclick="toggleRatiosSection('${id}')">
        <span class="rt-entity-name">${escHtml(name)}</span>
        <span class="rt-toggle-icon" id="ratios-toggle-${id}">−</span>
      </div>
      <div id="ratios-body-${id}">
        ${flowHtml}
        <div class="rt-hint">💡 Click any ratio card for its monthly trend · hover the ⓘ icon for the exact formula and numbers used</div>
        <div class="rt-sections">${sections.join('')}</div>
      </div>
    </div>`;
}

function renderRatios() {
  const el=document.getElementById('ratios-container'); if(!el) return;
  const {year,month,company}=STATE.filters;
  if(!year||!month){ el.innerHTML='<div class="empty-state"><div class="empty-state-title">Select a period</div></div>'; return; }
  const stmts=STATE.statements;
  if(!stmts||!Object.keys(stmts).length){ el.innerHTML='<div class="empty-state"><div class="empty-state-title">No data loaded</div></div>'; return; }
  const entities=company?[company]:ENTITY_FOLDERS;
  let html='<div class="rt-page">';
  for(const ef of entities){
    const stmt=stmts[ef]; if(!stmt) continue;
    const raw=MASTER.entity[ef]?.companyName||ef;
    const name=raw==='Masria Cards'?'modupay Cards':raw==='mdp'?'modupay DP':raw;
    html+=_renderEntityRatios(ef, name, stmt.IS, stmt.BS);
  }
  el.innerHTML=html+'</div>';
}

function toggleRatiosSection(id) {
  const body=document.getElementById(`ratios-body-${id}`);
  const icon=document.getElementById(`ratios-toggle-${id}`);
  if(!body) return;
  const hidden=body.style.display==='none';
  body.style.display=hidden?'':'none';
  if(icon) icon.textContent=hidden?'−':'+';
}

// ─────────────────────────────────────────────────────────────
// 6. RATIO TREND — registry, monthly series, modal, chart
// ─────────────────────────────────────────────────────────────
const RATIO_DEFS = {
  grossMargin:        { label: 'Gross Margin',        fmt: 'pct'  },
  ebitdaMargin:       { label: 'EBITDA Margin',       fmt: 'pct'  },
  ebitMargin:         { label: 'EBIT Margin',         fmt: 'pct'  },
  ebtMargin:          { label: 'EBT Margin',          fmt: 'pct'  },
  netMargin:          { label: 'Net Margin',          fmt: 'pct'  },
  roa:                { label: 'ROA',                 fmt: 'pct'  },
  roe:                { label: 'ROE',                 fmt: 'pct'  },
  cogsRatio:          { label: 'COGS Ratio',          fmt: 'pct'  },
  currentRatio:       { label: 'Current Ratio',       fmt: 'x'    },
  quickRatio:         { label: 'Quick Ratio',         fmt: 'x'    },
  cashRatio:          { label: 'Cash Ratio',          fmt: 'x'    },
  workingCapital:     { label: 'Working Capital',     fmt: 'amt'  },
  assetTurnover:      { label: 'Asset Turnover',      fmt: 'x'    },
  receivablesDays:    { label: 'Receivables Days',    fmt: 'days' },
  fixedAssetTurnover: { label: 'Fixed Asset Turnover',fmt: 'x'    },
  debtEquity:         { label: 'Debt / Equity',       fmt: 'x'    },
  debtAssets:         { label: 'Debt / Assets',       fmt: 'x'    },
  equityRatio:        { label: 'Equity Ratio',        fmt: 'x'    },
  interestCover:      { label: 'Interest Cover',       fmt: 'x'    },
  revenueGrowth:      { label: 'Revenue Growth',      fmt: 'pct'  },
  gpGrowth:           { label: 'GP Growth',           fmt: 'pct'  },
  ebitdaGrowth:       { label: 'EBITDA Growth',       fmt: 'pct'  },
  netProfitGrowth:    { label: 'Net Profit Growth',   fmt: 'pct'  },
  gmImprovement:      { label: 'GM Improvement',      fmt: 'pp'   },
  ebitdaMDelta:       { label: 'EBITDA Margin Δ',     fmt: 'pp'   },
  netMDelta:          { label: 'Net Margin Δ',        fmt: 'pp'   },
};

// Last `limit` distinct (year, month) combos that actually have data,
// in chronological order — drawn from TB + OpEx rows (same universe
// buildEntityIS/buildEntityBSForEntity rely on).
function _ratioTrendMonths(limit=12) {
  const set = new Set();
  for (const r of (STATE.tbRows||[]))   if (r.year && r.month) set.add(r.year*100+r.month);
  for (const r of (STATE.opexRows||[])) if (r.year && r.month) set.add(r.year*100+r.month);
  return Array.from(set).sort((a,b)=>a-b).slice(-limit).map(v => ({ year: Math.floor(v/100), month: v%100 }));
}

// All ratio metrics for a single month, on a standalone (month-only) P&L
// basis and a point-in-time Balance Sheet — this is what makes the trend
// a genuine "month by month" picture rather than a converging YTD line.
// Reuses _moIS() (charts.js) — the same lightweight standalone-IS helper
// already used by the other monthly trend charts in this dashboard.
function _ratioMonthMetrics(ef, ym) {
  const P   = (typeof _moIS === 'function') ? _moIS(ef, ym.year,   ym.month) : {};
  const PLY = (typeof _moIS === 'function') ? _moIS(ef, ym.year-1, ym.month) : {};
  const BSm = buildEntityBSForEntity(ef, ym.year, ym.month);
  const PL  = _extractPL(P, PLY);
  const B   = _extractBS(BSm);
  const dso = _entityDSO(ef, ym.year, ym.month);

  return {
    grossMargin:        PL.gpm,
    ebitdaMargin:        PL.ebm,
    ebitMargin:          _p(PL.ebit, PL.rev),
    ebtMargin:           _p(PL.ebt, PL.rev),
    netMargin:           PL.netm,
    roa:                 _p(PL.net, B.totalAssets||null),
    roe:                 _p(PL.net, B.equity||null),
    cogsRatio:           _p(PL.cogs, PL.rev),
    currentRatio:        _x(B.currentAssets, B.currentLiab||null),
    quickRatio:          _x(B.currentAssets-B.inventory, B.currentLiab||null),
    cashRatio:           _x(B.cash, B.currentLiab||null),
    workingCapital:      (B.currentAssets && B.currentLiab) ? (B.currentAssets-B.currentLiab) : null,
    assetTurnover:       _x(PL.rev, B.totalAssets||null),
    receivablesDays:     dso!=null ? dso : _fallbackReceivablesDays(ef, ym.year, ym.month, B.receivables),
    fixedAssetTurnover:  _x(PL.rev, B.nonCurrAssets||null),
    debtEquity:          B.equity ? _x(B.totalLiab, B.equity) : null,
    debtAssets:          _x(B.totalLiab, B.totalAssets||null),
    equityRatio:         _x(B.equity, B.totalAssets||null),
    interestCover:       PL.finExp>0 ? _x(PL.ebit, PL.finExp) : null,
    revenueGrowth:       PL.lyRev ? _p(PL.rev-PL.lyRev, PL.lyRev) : null,
    gpGrowth:            PL.lyGP  ? _p(PL.gp-PL.lyGP, PL.lyGP)   : null,
    ebitdaGrowth:        PL.lyEb  ? _p(PL.ebitda-PL.lyEb, PL.lyEb) : null,
    netProfitGrowth:     PL.lyNet ? _p(PL.net-PL.lyNet, PL.lyNet) : null,
    gmImprovement:       (PL.lyGpm!=null && PL.gpm!=null) ? (PL.gpm-PL.lyGpm) : null,
    ebitdaMDelta:        (PL.lyEbm!=null && PL.ebm!=null) ? (PL.ebm-PL.lyEbm) : null,
    netMDelta:           (PL.lyNetm!=null && PL.netm!=null) ? (PL.netm-PL.lyNetm) : null,
  };
}

function _computeRatioSeries(key, ef, limit=12) {
  const months = _ratioTrendMonths(limit);
  return months.map(ym => ({
    label: `${MONTH_NAMES[ym.month]}-${String(ym.year).slice(-2)}`,
    value: _ratioMonthMetrics(ef, ym)[key],
  }));
}

// Value shown on the chart (scaled/rounded per format)
function _ratioTrendChartVal(v, fmt) {
  if (v==null || isNaN(v)) return null;
  if (fmt==='pct' || fmt==='pp') return +(v*100).toFixed(2);
  if (fmt==='x')    return +v.toFixed(2);
  if (fmt==='days') return Math.round(v);
  return v; // amt — raw, formatted at display time via FMT.compact
}

// Axis/tooltip label per format
function _ratioTrendLabel(v, fmt) {
  if (v==null || isNaN(v)) return '';
  if (fmt==='pct') return v.toFixed(1)+'%';
  if (fmt==='pp')  return (v>=0?'+':'')+v.toFixed(1)+'pp';
  if (fmt==='x')   return v.toFixed(2)+'x';
  if (fmt==='days')return Math.round(v)+'d';
  if (fmt==='amt') return FMT.compact(v);
  return String(v);
}

const RATIO_TREND_STATE = { chart: null };

function _ratioTrendEscHandler(e) {
  if (e.key === 'Escape') closeRatioTrend();
}

function showRatioTrend(key, ef) {
  const def = RATIO_DEFS[key];
  if (!def) return;
  const raw = MASTER.entity[ef]?.companyName || ef;
  const entityName = raw==='Masria Cards' ? 'modupay Cards' : raw==='mdp' ? 'modupay DP' : raw;

  let overlay = document.getElementById('rt-trend-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rt-trend-overlay';
    overlay.className = 'rt-trend-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="rt-trend-panel" onclick="event.stopPropagation()">
      <div class="rt-trend-header">
        <div>
          <div class="rt-trend-title">${escHtml(def.label)}</div>
          <div class="rt-trend-sub">${escHtml(entityName)} · last 12 months</div>
        </div>
        <button class="rt-trend-close" onclick="closeRatioTrend()">✕</button>
      </div>
      <div class="rt-trend-body">
        <div class="rt-trend-chart-wrap"><canvas id="rt-trend-canvas" height="110"></canvas></div>
      </div>
    </div>`;
  overlay.style.display = 'flex';
  overlay.onclick = () => closeRatioTrend();
  document.addEventListener('keydown', _ratioTrendEscHandler);

  requestAnimationFrame(() => _drawRatioTrendChart(key, ef));
}

function closeRatioTrend() {
  const overlay = document.getElementById('rt-trend-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  if (RATIO_TREND_STATE.chart) { try { RATIO_TREND_STATE.chart.destroy(); } catch(e){} RATIO_TREND_STATE.chart = null; }
  document.removeEventListener('keydown', _ratioTrendEscHandler);
}

function _drawRatioTrendChart(key, ef) {
  const canvas = document.getElementById('rt-trend-canvas');
  if (!canvas) return;
  const def = RATIO_DEFS[key];
  const series = _computeRatioSeries(key, ef, 12);

  if (RATIO_TREND_STATE.chart) { try { RATIO_TREND_STATE.chart.destroy(); } catch(e){} }

  const isDark = STATE.theme === 'dark';
  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textC  = isDark ? '#94a3b8' : '#64748b';
  const color  = '#2563eb';

  const values = series.map(s => _ratioTrendChartVal(s.value, def.fmt));

  RATIO_TREND_STATE.chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.map(s => s.label),
      datasets: [{
        label: def.label,
        data: values,
        borderColor: color,
        backgroundColor: color + '14',
        fill: true, tension: 0.35, pointRadius: 4, pointHoverRadius: 6,
        spanGaps: true,
        datalabels: (typeof _dl === 'function')
          ? _dl(color, v => v!=null ? _ratioTrendLabel(v, def.fmt) : '', { anchor:'end', align:'top', font:{size:11,weight:800} })
          : undefined,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.parsed.y!=null ? ' '+_ratioTrendLabel(ctx.parsed.y, def.fmt) : ' No data' } },
      },
      scales: {
        x: { ticks: { color: textC, font: { size: 12 } }, grid: { color: gridC } },
        y: { ticks: { color: textC, font: { size: 12 }, callback: v => _ratioTrendLabel(v, def.fmt) }, grid: { color: gridC } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 7. FORMULA TOOLTIP (hover ⓘ) — show/hide
//    A single shared tooltip fixed to the viewport (so it is
//    never clipped by any card/section's overflow:hidden).
// ─────────────────────────────────────────────────────────────
function _ratioInfoShow(el) {
  let tip = document.getElementById('rt-info-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'rt-info-tooltip';
    tip.className = 'rt-info-tooltip';
    document.body.appendChild(tip);
  }
  tip.innerHTML = el.getAttribute('data-tip') || '';
  tip.style.display = 'block';
  tip.style.visibility = 'hidden';

  const r  = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = r.left + r.width/2 - tw/2;
  let top  = r.top - th - 8;
  if (top < 8) top = r.bottom + 8;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

  tip.style.left = left + 'px';
  tip.style.top  = top + 'px';
  tip.style.visibility = 'visible';
}

function _ratioInfoHide() {
  const tip = document.getElementById('rt-info-tooltip');
  if (tip) tip.style.display = 'none';
}
