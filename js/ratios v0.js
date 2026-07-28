'use strict';
/* ============================================================
   RATIOS.JS — Financial ratio analysis with visual indicators
   ============================================================ */

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

function _card(label, val, note, gauge='', trend='', sub='') {
  const cls=val&&val!=='—'?(val.startsWith('-')||val.startsWith('(')?'rt-val-neg':'rt-val-pos'):'rt-val-neu';
  return `<div class="rt-card">
    <div class="rt-card-head"><span class="rt-card-label">${escHtml(label)}</span>${trend}</div>
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

function _buildRatioSections(IS, BS) {
  const ytd=IS?.ytd||{}, sply=IS?.sply||{};
  const rev=ytd.revenue||0, gp=ytd.grossProfit||ytd.totalGrossProfit||0;
  const ebitda=ytd.ebitda||0, da=ytd.totalDA||0, ebit=ebitda+da;
  const ebt=ytd.ebt||0, net=ytd.netProfit||0;
  const cogs=Math.abs(ytd.cogs||(Math.abs(ytd.issuanceCost||0)+Math.abs(ytd.processingCost||0)));
  const finExp=Math.abs(ytd.financialExpenses||0);
  const lyRev=sply.revenue||0, lyGP=sply.grossProfit||sply.totalGrossProfit||0;
  const lyEb=sply.ebitda||0, lyNet=sply.netProfit||0;
  const gpm=_p(gp,rev), ebm=_p(ebitda,rev), netm=_p(net,rev);
  const lyGpm=_p(lyGP,lyRev), lyEbm=_p(lyEb,lyRev), lyNetm=_p(lyNet,lyRev);

  // Extract BS
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

  return [
    _sec('📈','Profitability',[
      _card('Gross Margin',   _fp(gpm),            'Gross Profit / Revenue',      _gauge(gpm),  _trend(gpm,lyGpm),   lyGpm!=null?`LY: ${_fp(lyGpm)}`:''),
      _card('EBITDA Margin',  _fp(ebm),            'EBITDA / Revenue',            _gauge(ebm),  _trend(ebm,lyEbm),   lyEbm!=null?`LY: ${_fp(lyEbm)}`:''),
      _card('EBIT Margin',    _fp(_p(ebit,rev)),   'EBIT / Revenue',              _gauge(_p(ebit,rev)), '', ''),
      _card('EBT Margin',     _fp(_p(ebt,rev)),    'EBT / Revenue',               _gauge(_p(ebt,rev)),  '', ''),
      _card('Net Margin',     _fp(netm),           'Net Profit / Revenue',        _gauge(netm), _trend(netm,lyNetm), lyNetm!=null?`LY: ${_fp(lyNetm)}`:''),
      _card('ROA',            _fp(_p(net,totalAssets||null)), 'Net / Total Assets',_gauge(_p(net,totalAssets||null)),'',''),
      _card('ROE',            _fp(_p(net,equity||null)),      'Net / Equity',      _gauge(_p(net,equity||null)),    '',''),
      _card('COGS Ratio',     _fp(_p(cogs,rev)),   'COGS / Revenue',              _gauge(_p(-cogs,rev),false),'',''),
    ]),
    _sec('💧','Liquidity',[
      _card('Current Ratio', _fx(_x(currentAssets,currentLiab||null)),            'Current Assets / Current Liabilities','','', currentLiab?`CA ${FMT.compact(currentAssets)} / CL ${FMT.compact(currentLiab)}`:''),
      _card('Quick Ratio',   _fx(_x(currentAssets-inventory,currentLiab||null)),  '(CA − Inventory) / Current Liabilities','','',''),
      _card('Cash Ratio',    _fx(_x(cash,currentLiab||null)),                     'Cash / Current Liabilities','','',cash?`Cash: ${FMT.compact(cash)}`:''),
      _card('Working Capital',currentAssets&&currentLiab?FMT.compact(currentAssets-currentLiab):'—','Current Assets − Current Liabilities','','',''),
    ]),
    _sec('⚙️','Efficiency',[
      _card('Asset Turnover',      _fx(_x(rev,totalAssets||null)),    'Revenue / Total Assets','','',''),
      _card('Receivables Days',    _fd(_days(receivables,rev||null)), 'Receivables / Revenue × 365','','',receivables?`${FMT.compact(receivables)}`:''),
      _card('Fixed Asset Turnover',_fx(_x(rev,nonCurrAssets||null)), 'Revenue / Non-Current Assets','','',''),
    ]),
    _sec('🏦','Leverage',[
      _card('Debt / Equity',  equity?_fx(_x(totalLiab,equity)):'—',      'Total Liabilities / Equity','','',''),
      _card('Debt / Assets',  _fx(_x(totalLiab,totalAssets||null)),       'Total Liabilities / Total Assets',_gauge(_p(-totalLiab,totalAssets||null),false),'',''),
      _card('Equity Ratio',   _fx(_x(equity,totalAssets||null)),          'Equity / Total Assets',_gauge(_p(equity,totalAssets||null)),'',''),
      _card('Interest Cover', finExp>0?_fx(_x(ebit,finExp)):'—',         'EBIT / Financial Expenses','','',''),
    ]),
    _sec('🚀','Growth vs Prior Year',[
      _card('Revenue Growth',    lyRev?_fp(_p(rev-lyRev,lyRev)):'—',      'YTD Revenue vs SPLY',        _gauge(lyRev?_p(rev-lyRev,lyRev):null), '','LY: '+FMT.compact(lyRev)),
      _card('GP Growth',         lyGP?_fp(_p(gp-lyGP,lyGP)):'—',         'YTD Gross Profit vs SPLY',   _gauge(lyGP?_p(gp-lyGP,lyGP):null),    '','LY: '+FMT.compact(lyGP)),
      _card('EBITDA Growth',     lyEb?_fp(_p(ebitda-lyEb,lyEb)):'—',     'YTD EBITDA vs SPLY',         _gauge(lyEb?_p(ebitda-lyEb,lyEb):null),'',''),
      _card('Net Profit Growth', lyNet?_fp(_p(net-lyNet,lyNet)):'—',      'YTD Net Profit vs SPLY',     _gauge(lyNet?_p(net-lyNet,lyNet):null), '','LY: '+FMT.compact(lyNet)),
      _card('GM Improvement',    lyGpm!=null&&gpm!=null?_fpp(gpm-lyGpm):'—','Gross Margin change vs LY','','',''),
      _card('EBITDA M Δ',        lyEbm!=null&&ebm!=null?_fpp(ebm-lyEbm):'—','EBITDA Margin change vs LY','','',''),
      _card('Net M Δ',           lyNetm!=null&&netm!=null?_fpp(netm-lyNetm):'—','Net Margin change vs LY','','',''),
    ]),
  ];
}

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

  const sections=_buildRatioSections(IS, BS);
  return `
    <div class="rt-entity" id="rt-${id}">
      <div class="rt-entity-hdr" onclick="toggleRatiosSection('${id}')">
        <span class="rt-entity-name">${escHtml(name)}</span>
        <span class="rt-toggle-icon" id="ratios-toggle-${id}">−</span>
      </div>
      <div id="ratios-body-${id}">
        ${flowHtml}
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
