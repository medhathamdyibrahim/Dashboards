'use strict';
/* ============================================================
   CHARTS.JS — Entity-separated chart sections
   Requires: Chart.js 4.x + chartjs-plugin-datalabels (registered globally)
   ============================================================ */

function destroyChart(id) {
  if (STATE.charts && STATE.charts[id]) { STATE.charts[id].destroy(); delete STATE.charts[id]; }
}

function _cc() {
  const d = STATE.theme === 'dark';
  return {
    blue:'#3b82f6', blueA:'#3b82f618',
    teal: d?'#22d3ee':'#0891b2', tealA: d?'#22d3ee18':'#0891b218',
    green: d?'#10b981':'#059669', greenA: d?'#10b98118':'#05966918',
    purple:'#8b5cf6', orange:'#f97316', rose:'#f43f5e', amber:'#f59e0b',
    grid: d?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)',
    tick: d?'#94a3b8':'#64748b', text: d?'#f1f5f9':'#0f172a',
    muted:d?'#475569':'#94a3b8', surface:d?'#1a2740':'#ffffff',
  };
}

function _opts(cfg = {}) {
  const c = _cc();
  const pctY = cfg.pctY || false;
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 500, easing: 'easeOutQuart' },
    plugins: {
      legend: { labels: { color:c.text, font:{family:"'Plus Jakarta Sans'",size:11}, padding:14, usePointStyle:true, pointStyleWidth:7 } },
      tooltip: {
        backgroundColor:c.surface, titleColor:c.text, bodyColor:c.tick,
        borderColor:c.grid, borderWidth:1, padding:12, cornerRadius:8,
        callbacks: { label: ctx => {
          const v = ctx.parsed?.y ?? ctx.parsed;
          return pctY ? ` ${ctx.dataset.label}: ${(+v).toFixed(1)}%` : ' ' + FMT.compact(v);
        }}
      },
      // datalabels enabled per-dataset via dataset.datalabels property
      datalabels: { display: false },  // off by default for this chart
    },
    scales: {
      x: { ticks:{color:c.tick,font:{size:11}}, grid:{color:c.grid}, border:{display:false} },
      y: {
        ticks: pctY
          ? { color:c.tick, font:{family:"'JetBrains Mono'",size:10}, callback:v=>v.toFixed(0)+'%' }
          : { color:c.tick, font:{family:"'JetBrains Mono'",size:10}, callback:v=>FMT.compact(v) },
        grid:{color:c.grid}, border:{display:false}
      },
    },
    ...(cfg.extra||{}),
  };
}

// Datalabel config helper
function _dl(color, formatter, extra={}) {
  return { display:'auto', color, font:{size:8,weight:700,family:"'JetBrains Mono'"}, formatter, anchor:'end', align:'top', offset:2, clamp:true, ...extra };
}

// ── Per-month IS — standalone (balanceOfMonth), consistent with P&L ──
function _moIS(ef, year, mo) {
  const cc  = entityCompanyCode(ef);
  const isMC= cc === '1000';
  const mcF = ['Masria Cards','modupay Cards'];
  const dpF = ['mdp','modupay DP'];
  const tb  = STATE.tbRows.filter(r=>r.entityFolder===ef&&r.bsOrPL==='IS'&&r.year===year&&r.month===mo);
  tb._periodKey = 'standalone';
  const op  = STATE.opexRows.filter(r=>r.companyCode===cc&&r.year===year&&r.month===mo);
  const sl  = (STATE.salesRows||[]).filter(r=>(isMC?mcF:dpF).includes(r.entityFolder)&&r.year===year&&r.month===mo);
  const msl = (STATE.salesRows||[]).filter(r=>mcF.includes(r.entityFolder)&&r.year===year&&r.month===mo);
  return isMC ? computeMasriaIS(tb,op,cc,sl) : computeMdpIS(tb,op,cc,msl,sl);
}

// ── 1. Monthly Revenue & EBITDA vs Prior Year ──────────────────
function _chartRevenue(ef, cid) {
  destroyChart(cid);
  const cv=document.getElementById(cid); if(!cv) return;
  const {year,month}=STATE.filters; const y=+year,m=+month;
  const mos=Array.from({length:m},(_,i)=>i+1);
  const curr=mos.map(mo=>_moIS(ef,y,mo));
  const prev=mos.map(mo=>_moIS(ef,y-1,mo));
  const c=_cc();
  const fmt=v=>FMT.compact(v);
  STATE.charts[cid]=new Chart(cv,{
    type:'bar',
    data:{
      labels:mos.map(i=>MONTH_NAMES[i]),
      datasets:[
        { label:`Revenue ${y}`,
          data:curr.map(d=>d.revenue||0),
          backgroundColor:c.blue+'bb', borderRadius:5, order:2,
          datalabels:_dl(c.blue,v=>FMT.compact(v)) },
        { label:`Revenue ${y-1}`,
          data:prev.map(d=>d.revenue||0),
          backgroundColor:c.muted+'44', borderRadius:5, order:2,
          datalabels:{display:false} },
        { label:`EBITDA ${y}`,
          data:curr.map(d=>d.ebitda||0),
          type:'line', borderColor:c.teal, backgroundColor:c.tealA, fill:true,
          tension:0.35, pointRadius:5, pointHoverRadius:7, order:1,
          datalabels:_dl(c.teal,v=>FMT.compact(v),{align:'bottom'}) },
      ]
    },
    options:_opts(),
  });
}

// ── 2. Margin Trends ───────────────────────────────────────────
function _chartMargins(ef, cid) {
  destroyChart(cid);
  const cv=document.getElementById(cid); if(!cv) return;
  const {year,month}=STATE.filters; const y=+year,m=+month;
  const mos=Array.from({length:m},(_,i)=>i+1);
  const data=mos.map(mo=>_moIS(ef,y,mo));
  const c=_cc(); const isMC=entityCompanyCode(ef)==='1000';
  const gpKey=isMC?'gpm':'totalGPM';
  const dlPct=(col)=>_dl(col,v=>v.toFixed(1)+'%',{align:'top'});
  const opts=_opts({pctY:true});
  STATE.charts[cid]=new Chart(cv,{
    type:'line',
    data:{labels:mos.map(i=>MONTH_NAMES[i]),datasets:[
      { label:'GP Margin %',     data:data.map(d=>(d[gpKey]||0)*100),   borderColor:c.green,  backgroundColor:'transparent', tension:0.35, pointRadius:5, borderWidth:2.5, borderDash:[4,3], datalabels:dlPct(c.green) },
      { label:'EBITDA Margin %', data:data.map(d=>(d.ebitdaM||0)*100), borderColor:c.blue,   backgroundColor:c.blueA, fill:true, tension:0.35, pointRadius:5, borderWidth:2.5, datalabels:dlPct(c.blue) },
      { label:'Net Margin %',    data:data.map(d=>(d.netM||0)*100),    borderColor:c.orange, backgroundColor:'transparent', tension:0.35, pointRadius:5, borderWidth:2.5, datalabels:dlPct(c.orange) },
    ]},
    options:opts,
  });
}

// ── 3. Revenue Mix Donut ───────────────────────────────────────
function _chartMix(ef, cid) {
  destroyChart(cid);
  const cv=document.getElementById(cid); if(!cv) return;
  const {year,month}=STATE.filters; const y=+year,m=+month;
  const c=_cc(); const isMC=entityCompanyCode(ef)==='1000';
  let labels,values,colors;
  if(isMC) {
    const mcF=['Masria Cards','modupay Cards'];
    const rows=(STATE.salesRows||[]).filter(r=>mcF.includes(r.entityFolder)&&r.year===y&&r.month>=1&&r.month<=m);
    const cards=rows.filter(r=>r.categorization==='Cards').reduce((s,r)=>s+(r.value||0),0);
    const perso=rows.filter(r=>r.categorization==='Perso').reduce((s,r)=>s+(r.value||0),0);
    const others=Math.max(0,rows.reduce((s,r)=>s+(r.value||0),0)-cards-perso);
    labels=['Cards','Perso','Others']; values=[cards,perso,others]; colors=[c.blue,c.teal,c.amber];
  } else {
    const ytd=STATE.statements[ef]?.IS?.ytd||{};
    labels=['Processing','Issuance'];
    values=[Math.abs(ytd.processingRevenues||0),Math.abs(ytd.issuanceRevenues||0)];
    colors=[c.blue,c.purple];
  }
  const fil=(_,i)=>values[i]>0;
  labels=labels.filter(fil); colors=colors.filter(fil); values=values.filter(v=>v>0);
  if(!values.length) return;
  const total=values.reduce((a,b)=>a+b,0);
  STATE.charts[cid]=new Chart(cv,{
    type:'doughnut',
    data:{labels,datasets:[{
      data:values,
      backgroundColor:colors.map(x=>x+'dd'),
      borderWidth:0, hoverOffset:10,
      datalabels:{
        display:true,
        color:'#fff',
        font:{size:11,weight:700},
        formatter:(v,ctx)=>{
          const pct=(v/total*100).toFixed(0)+'%';
          return ctx.chart.data.labels[ctx.dataIndex]+'\n'+pct;
        },
        textAlign:'center',
      }
    }]},
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'62%',
      animation:{duration:600},
      plugins:{
        legend:{position:'right',labels:{color:c.text,font:{size:11},padding:10,usePointStyle:true}},
        tooltip:{backgroundColor:c.surface,bodyColor:c.tick,borderColor:c.grid,borderWidth:1,
          callbacks:{label:ctx=>`${ctx.label}: ${FMT.compact(ctx.parsed)} (${(ctx.parsed/total*100).toFixed(1)}%)`}},
        datalabels:{display:true},
      }
    }
  });
}

// ── 4. YTD P&L Waterfall ──────────────────────────────────────
function _chartWaterfall(ef, cid) {
  destroyChart(cid);
  const cv=document.getElementById(cid); if(!cv) return;
  const stmt=STATE.statements[ef]?.IS; if(!stmt) return;
  const ytd=STATE.usdMode?(stmt._ytdUSD||stmt.ytd):stmt.ytd; if(!ytd) return;
  const c=_cc(); const isMC=entityCompanyCode(ef)==='1000';
  let labels,values;
  if(isMC) {
    labels=['Revenue','COGS','Gross Profit','S&M','G&A','EBITDA','D&A','Below EBITDA','Net Profit'];
    const below=(ytd.financialExpenses||0)+(ytd.leaseLiabInt||0)+(ytd.provisions||0)+
                (ytd.takaful||0)+(ytd.creditInterest||0)+(ytd.otherIncome||0)+
                (ytd.unrealizedFX||0)+(ytd.realizedFX||0)+(ytd.incomeTax||0)+(ytd.deferredTax||0);
    values=[ytd.revenue||0,ytd.cogs||0,ytd.grossProfit||0,ytd.sm||0,ytd.ga||0,ytd.ebitda||0,ytd.totalDA||0,below,ytd.netProfit||0];
  } else {
    labels=['Revenue','Iss. Cost','Proc. Cost','Total GP','SG&A','EBITDA','D&A','Below EBITDA','Net Profit'];
    const below=(ytd.financialExpenses||0)+(ytd.leaseInterest2F||0)+(ytd.provisions||0)+
                (ytd.creditInterest||0)+(ytd.otherIncome||0)+
                (ytd.unrealizedFX||0)+(ytd.realizedFX||0)+(ytd.incomeTax||0)+(ytd.deferredTax||0);
    values=[ytd.revenue||0,ytd.issuanceCost||0,ytd.processingCost||0,ytd.totalGrossProfit||0,ytd.sga||0,ytd.ebitda||0,ytd.totalDA||0,below,ytd.netProfit||0];
  }
  const colors=values.map((v,i)=>{
    if(i===0||i===labels.length-1) return c.blue+'cc';
    if(labels[i].includes('Profit')||labels[i]==='EBITDA'||labels[i].includes('GP')) return c.teal+'cc';
    return v<0?c.rose+'cc':c.green+'cc';
  });
  STATE.charts[cid]=new Chart(cv,{
    type:'bar',
    data:{labels,datasets:[{
      data:values, backgroundColor:colors, borderRadius:5, borderSkipped:false,
      datalabels:_dl(c.text,v=>FMT.compact(v),{color:c.text,font:{size:9,weight:700}})
    }]},
    options:_opts({extra:{plugins:{legend:{display:false}}}}),
  });
}

// ── 5. OpEx Breakdown (YTD) ────────────────────────────────────
function _chartOpEx(ef, cid) {
  destroyChart(cid);
  const cv=document.getElementById(cid); if(!cv) return;
  const {year,month}=STATE.filters; const y=+year,m=+month;
  const cc=entityCompanyCode(ef);
  const rows=(STATE.opexRows||[]).filter(r=>r.companyCode===cc&&r.year===y&&r.month>=1&&r.month<=m);
  if(!rows.length) return;
  const c=_cc();
  const grp={};
  for(const r of rows){
    const mapping=String(r.mapping||'').trim()||'Other';
    const isP=String(r.glAccountGroup||'').startsWith('6030');
    const key=mapping+(isP?' — Personnel':' — Other');
    grp[key]=(grp[key]||0)+Math.abs(r.amount||0);
  }
  const sorted=Object.entries(grp).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,10);
  const labels=sorted.map(([k])=>k), values=sorted.map(([,v])=>v);
  const pal=[c.blue,c.blue+'88',c.teal,c.teal+'88',c.purple,c.purple+'88',c.orange,c.amber,c.rose,c.green];
  const total=values.reduce((a,b)=>a+b,0);
  STATE.charts[cid]=new Chart(cv,{
    type:'bar',
    data:{labels,datasets:[{
      data:values,
      backgroundColor:labels.map((_,i)=>pal[i%pal.length]),
      borderRadius:5, borderSkipped:false,
      datalabels:{display:'auto',color:c.text,font:{size:8,weight:700,family:"'JetBrains Mono'"},
        formatter:v=>FMT.compact(v),anchor:'end',align:'right',clamp:true}
    }]},
    options:{
      ..._opts(),
      indexAxis:'y',
      plugins:{..._opts().plugins, legend:{display:false},
        datalabels:{display:'auto',color:c.text,font:{size:8,weight:700},formatter:v=>FMT.compact(v),anchor:'end',align:'right'}},
      scales:{
        x:{ticks:{color:c.tick,callback:v=>FMT.compact(v)},grid:{color:c.grid},border:{display:false}},
        y:{ticks:{color:c.text,font:{size:9}},grid:{display:false},border:{display:false}},
      }
    }
  });
}

// ── 6. Net Profit vs Prior Year ────────────────────────────────
function _chartNet(ef, cid) {
  destroyChart(cid);
  const cv=document.getElementById(cid); if(!cv) return;
  const {year,month}=STATE.filters; const y=+year,m=+month;
  const mos=Array.from({length:m},(_,i)=>i+1);
  const curr=mos.map(mo=>_moIS(ef,y,mo));
  const prev=mos.map(mo=>_moIS(ef,y-1,mo));
  const c=_cc();
  STATE.charts[cid]=new Chart(cv,{
    type:'bar',
    data:{labels:mos.map(i=>MONTH_NAMES[i]),datasets:[
      { label:`Net Profit ${y}`,
        data:curr.map(d=>d.netProfit||0),
        backgroundColor:curr.map(d=>(d.netProfit||0)>=0?c.green+'bb':c.rose+'bb'),
        borderRadius:5, order:2,
        datalabels:_dl(c.text,v=>FMT.compact(v)) },
      { label:`Net Profit ${y-1}`,
        data:prev.map(d=>d.netProfit||0),
        type:'line', borderColor:c.muted, backgroundColor:'transparent',
        borderDash:[5,4], tension:0.35, pointRadius:3, order:1,
        datalabels:{display:false} },
    ]},
    options:_opts(),
  });
}

// ── Hero summary row ───────────────────────────────────────────
function _heroHtml(ef) {
  const stmt=STATE.statements[ef]; if(!stmt?.IS?.ytd) return '';
  const isMC=entityCompanyCode(ef)==='1000';
  const get=(period,key)=>{
    if(STATE.usdMode){ const u=stmt.IS[`_${period}USD`]; return u?.[key]??stmt.IS[period]?.[key]??0; }
    return stmt.IS[period]?.[key]??0;
  };
  const rev=get('ytd','revenue'),gp=get('ytd',isMC?'grossProfit':'totalGrossProfit');
  const eb=get('ytd','ebitda'),nt=get('ytd','netProfit');
  const revLY=get('sply','revenue'),gpLY=get('sply',isMC?'grossProfit':'totalGrossProfit');
  const ebLY=get('sply','ebitda'),ntLY=get('sply','netProfit');
  const fmt=v=>STATE.usdMode?'$'+FMT.compact(v):FMT.compact(v);
  const badge=(c,p)=>{if(!p)return '';const r=(c-p)/Math.abs(p),up=r>=0;
    return `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${up?'#10b98118':'#f8717118'};color:${up?'#10b981':'#f87171'}">${up?'▲':'▼'} ${FMT.pct(Math.abs(r))}</span>`;};
  const cards=[
    {label:'Revenue',val:fmt(rev),badge:badge(rev,revLY),sub:''},
    {label:'Gross Profit',val:fmt(gp),badge:badge(gp,gpLY),sub:FMT.pct(rev?gp/rev:0)+' margin'},
    {label:'EBITDA',val:fmt(eb),badge:badge(eb,ebLY),sub:FMT.pct(rev?eb/rev:0)+' margin'},
    {label:'Net Profit',val:fmt(nt),badge:badge(nt,ntLY),sub:FMT.pct(rev?nt/rev:0)+' margin'},
  ];
  return `<div class="ch-hero">${cards.map(k=>`
    <div class="ch-hero-card">
      <div class="ch-hero-label">${k.label}</div>
      <div class="ch-hero-val">${k.val} ${k.badge}</div>
      ${k.sub?`<div class="ch-hero-sub">${k.sub}</div>`:''}
    </div>`).join('')}</div>`;
}

// ── Main render ────────────────────────────────────────────────
function updateCharts() {
  const grid=document.getElementById('charts-grid');
  if(!grid||STATE.activeTab!=='charts') return;
  const {year,month,company}=STATE.filters;
  if(!year||!month){grid.innerHTML='<div class="empty-state"><div class="empty-state-title">Select a period</div></div>';return;}
  if(STATE.charts) Object.keys(STATE.charts).forEach(k=>{try{STATE.charts[k].destroy();}catch(e){}delete STATE.charts[k];});
  STATE.charts={};
  const entities=company?[company]:ENTITY_FOLDERS;
  grid.innerHTML='';
  for(const ef of entities){
    const stmt=STATE.statements[ef]; if(!stmt) continue;
    const raw=MASTER.entity[ef]?.companyName||ef;
    const name=raw==='Masria Cards'?'modupay Cards':raw==='mdp'?'modupay DP':raw;
    const id=ef.replace(/\s/g,'_');
    const ccy=STATE.usdMode?'USD':(MASTER.entity[ef]?.currency||'EGP');
    const sec=document.createElement('div');
    sec.className='ch-section';
    sec.innerHTML=`
      <div class="ch-section-header">
        <span class="ch-section-name">${escHtml(name)}</span>
        <span class="ch-section-period">${year} YTD · ${MONTH_NAMES[+month]} · ${ccy}</span>
      </div>
      ${_heroHtml(ef)}
      <div class="ch-row ch-row-2">
        <div class="ch-card"><div class="ch-card-title">Monthly Revenue &amp; EBITDA vs Prior Year</div><div class="ch-canvas"><canvas id="c1-${id}"></canvas></div></div>
        <div class="ch-card"><div class="ch-card-title">Margin Trends (Monthly %)</div><div class="ch-canvas"><canvas id="c2-${id}"></canvas></div></div>
      </div>
      <div class="ch-row ch-row-3">
        <div class="ch-card"><div class="ch-card-title">Revenue Mix — YTD</div><div class="ch-canvas ch-canvas-sm"><canvas id="c3-${id}"></canvas></div></div>
        <div class="ch-card"><div class="ch-card-title">YTD P&amp;L Waterfall</div><div class="ch-canvas ch-canvas-sm"><canvas id="c4-${id}"></canvas></div></div>
        <div class="ch-card"><div class="ch-card-title">OpEx Breakdown — YTD</div><div class="ch-canvas ch-canvas-sm"><canvas id="c5-${id}"></canvas></div></div>
      </div>
      <div class="ch-row ch-row-1">
        <div class="ch-card"><div class="ch-card-title">Net Profit — ${year} vs ${+year-1} (Monthly)</div><div class="ch-canvas ch-canvas-sm"><canvas id="c6-${id}"></canvas></div></div>
      </div>`;
    grid.appendChild(sec);
    setTimeout(()=>{
      _chartRevenue(ef, `c1-${id}`);
      _chartMargins(ef, `c2-${id}`);
      _chartMix(ef,     `c3-${id}`);
      _chartWaterfall(ef,`c4-${id}`);
      _chartOpEx(ef,    `c5-${id}`);
      _chartNet(ef,     `c6-${id}`);
    },80);
  }
}
