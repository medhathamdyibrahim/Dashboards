/* ═══════════════════════════════════════════════════════════════════
   EXPORT.JS  —  CEO-grade Excel export via ExcelJS
   6 sheets: Cover / Summary / By Dept / By CC / Drill-Down / Raw Data
   Full styling + Last Year (SPLY) columns on every analytical sheet
═══════════════════════════════════════════════════════════════════ */
'use strict';

// ── BRAND PALETTE ────────────────────────────────────────────────
const XL = {
  NAVY:         'FF1D4ED8',
  WHITE:        'FFFFFFFF',
  LIGHT_BLUE:   'FFEFF6FF',
  DARK_TEXT:    'FF1E293B',
  MID_GREY:     'FF64748B',
  RED_LIGHT:    'FFFEE2E2',
  RED_TEXT:     'FFDC2626',
  GREEN_LIGHT:  'FFDCFCE7',
  GREEN_TEXT:   'FF16A34A',
  AMBER_LIGHT:  'FFFEF9C3',
  AMBER_TEXT:   'FFB45309',
  PURPLE_LIGHT: 'FFEDE9FE',
  PURPLE_TEXT:  'FF6D28D9',
  SECTION_BG:   'FFDBEAFE',
  LY_BG:        'FFF8FAFC',
};

// ── STYLE HELPERS ────────────────────────────────────────────────
const xlFill = argb => ({ type:'pattern', pattern:'solid', fgColor:{ argb } });
const xlFont = (o={}) => ({ name:'Arial', size:o.size||10, bold:o.bold||false, color:{ argb:o.color||'FF1E293B' } });
const THIN       = { style:'thin', color:{ argb:'FFCBD5E1' } };
const FULL_BDR   = { top:THIN, bottom:THIN, left:THIN, right:THIN };
const THICK_BTM  = { bottom:{ style:'medium', color:{ argb:'FF1D4ED8' } } };
const xlAlign    = (h='left',v='middle') => ({ horizontal:h, vertical:v });

const MAPPING_BADGE = {
  'COGS': { fill:'FFFEF9C3', font:{ color:'FFB45309', bold:true, size:9 } },
  'G&A':  { fill:'FFEDE9FE', font:{ color:'FF6D28D9', bold:true, size:9 } },
  'S&M':  { fill:'FFDCFCE7', font:{ color:'FF16A34A', bold:true, size:9 } },
};

function varStyle(v) {
  if (!v) return null;
  return v > 0 ? { fill:'FFFEE2E2', font:{ color:'FFDC2626' } }
               : { fill:'FFDCFCE7', font:{ color:'FF16A34A' } };
}

function setColWidths(ws, widths) {
  widths.forEach((w,i) => { ws.getColumn(i+1).width = w; });
}
function addAutoFilter(ws, lastCol) {
  ws.autoFilter = { from:{ row:1, column:1 }, to:{ row:1, column:lastCol } };
}

// Row of navy header cells
function headerRow(ws, rowNum, headers, colStart=1) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  headers.forEach((h, i) => {
    const c = row.getCell(colStart+i);
    c.value = h;
    c.fill  = xlFill('FF1D4ED8');
    c.font  = xlFont({ bold:true, color:'FFFFFFFF', size:10 });
    c.alignment = xlAlign('center');
    c.border = FULL_BDR;
  });
}

// Grouped sub-header row (above column headers)
function subHeaderRow(ws, rowNum, groups, colStart=1) {
  const row = ws.getRow(rowNum);
  row.height = 14;
  let col = colStart;
  groups.forEach(({ label, span, fill='FF1E3A5F' }) => {
    if (span > 1) ws.mergeCells(rowNum, col, rowNum, col+span-1);
    const c = row.getCell(col);
    c.value = label;
    c.fill  = xlFill(fill);
    c.font  = xlFont({ bold:true, color:'FFFFFFFF', size:9 });
    c.alignment = xlAlign('center');
    c.border = { top:THIN, bottom:THIN, left:THIN, right:THIN };
    col += span;
  });
}

function sectionTitle(ws, rowNum, text, numCols) {
  ws.getRow(rowNum).height = 20;
  for (let i=1; i<=numCols; i++) {
    const c = ws.getCell(rowNum, i);
    c.fill   = xlFill('FFDBEAFE');
    c.border = THICK_BTM;
  }
  const c = ws.getCell(rowNum, 1);
  c.value = '  '+text;
  c.font  = xlFont({ bold:true, size:11, color:'FF1D4ED8' });
  c.alignment = xlAlign('left');
  c.border = THICK_BTM;
}

// Write a single styled cell
function wc(row, ci, val, { fmt='@', align='left', fill, font={}, border } = {}) {
  const c = row.getCell(ci);
  c.value = val === undefined ? null : val;
  if (fill)   c.fill  = xlFill(fill);
  c.font  = xlFont({ size:10, ...font });
  c.alignment = xlAlign(align, 'middle');
  if (fmt) c.numFmt = fmt;
  if (border) c.border = border;
  return c;
}

function getPeriodLabel() {
  const el = document.getElementById('header-period');
  return el ? el.textContent : 'Report';
}

// ════════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════
async function exportToExcel() {
  if (!STATE.filtActual.length) {
    showToast('No data to export — apply filters first.', 'error');
    return;
  }
  showToast('⏳ Building CEO-grade Excel…', 'info', 12000);

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PCI Dashboard';
    wb.created = wb.modified = new Date();

    const period   = getPeriodLabel();
    const splyRows = getSPLY(STATE.actualRows, false);   // same period last year

    buildCoverSheet(wb, period);
    buildSummarySheet(wb, period, splyRows);
    buildByDeptSheet(wb, splyRows);
    buildByCCSheet(wb, splyRows);
    buildDrillDownSheet(wb, splyRows);
    buildRawDataSheet(wb);

    // Tab colors
    const TABS = { 'Cover':'FF1D4ED8','Summary':'FF0EA5E9','By Department':'FF8B5CF6',
                   'By Cost Center':'FFEC4899','Drill-Down':'FFF59E0B','Raw Data':'FF10B981' };
    wb.worksheets.forEach(ws => { if (TABS[ws.name]) ws.properties.tabColor = { argb:TABS[ws.name] }; });

    // Filename
    const { year, month } = STATE.filters;
    const ytd = STATE.filters.ytdUpToMonth;
    let ps = 'All_Periods';
    if (year) {
      if (month && month.length===1) ps = `${MONTH_NAMES[parseInt(month[0])]}_${year}`;
      else if (month && month.length>1) ps = `${month.length}_Months_${year}`;
      else if (ytd) ps = `YTD_${MONTH_NAMES[ytd]}_${year}`;
      else ps = `FY_${year}`;
    }
    const filename = `Personnel_Cost_${ps}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ Exported: ${filename}`, 'success');

  } catch (err) {
    showToast(`❌ Export failed: ${err.message}`, 'error');
    console.error('[Export]', err);
  }
}

// ════════════════════════════════════════════════════════════════
//  COVER SHEET
// ════════════════════════════════════════════════════════════════
function buildCoverSheet(wb, period) {
  const ws = wb.addWorksheet('Cover');
  ws.views = [{ showGridLines:false }];
  ws.getColumn(1).width = 4;
  [18,18,18,18,18].forEach((w,i) => ws.getColumn(i+2).width = w);
  ws.getColumn(7).width = 4;

  for (let r=1; r<=5; r++) { ws.getRow(r).height=15; for (let c=1;c<=7;c++) ws.getCell(r,c).fill=xlFill('FF1D4ED8'); }

  ws.getRow(8).height=42; ws.getRow(9).height=42;
  ws.mergeCells('B8:F9');
  const t = ws.getCell('B8');
  t.value='PERSONNEL COST INTELLIGENCE'; t.font={ name:'Arial',bold:true,size:22,color:{argb:'FF1D4ED8'} }; t.alignment=xlAlign('left');

  ws.getRow(10).height=24;
  ws.mergeCells('B10:F10');
  const s = ws.getCell('B10');
  s.value=`Executive Report  ·  ${period}`; s.font={ name:'Arial',size:13,color:{argb:'FF64748B'} }; s.alignment=xlAlign('left');

  ws.getRow(11).height=4; ws.mergeCells('B11:F11'); ws.getCell('B11').fill=xlFill('FF1D4ED8');

  ws.getRow(13).height=18; ws.mergeCells('B13:F13');
  const co=ws.getCell('B13'); const creds=getCreds();
  co.value=creds?`${creds.user} / ${creds.repo}`:'Masria Digital Payments';
  co.font={ name:'Arial',bold:true,size:12,color:{argb:'FF1E293B'} }; co.alignment=xlAlign('left');

  ws.getRow(14).height=16; ws.mergeCells('B14:F14');
  const dt=ws.getCell('B14');
  dt.value=`Generated: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}`;
  dt.font={ name:'Arial',size:9,color:{argb:'FF64748B'} }; dt.alignment=xlAlign('left');

  ws.getRow(17).height=20; ws.mergeCells('B17:F17');
  const ct=ws.getCell('B17');
  ct.value='  REPORT CONTENTS'; ct.fill=xlFill('FFDBEAFE');
  ct.font={ name:'Arial',bold:true,size:11,color:{argb:'FF1D4ED8'} }; ct.alignment=xlAlign('left');

  [
    ['1','Summary',        'KPIs vs Budget & Last Year, headcount'],
    ['2','By Department',  'Dept breakdown: Actual vs Budget vs Last Year'],
    ['3','By Cost Center', 'CC detail: Actual vs Budget vs Last Year + HC'],
    ['4','Drill-Down',     '3-level hierarchy: Dept → CC → GL Account'],
    ['5','Raw Data',       'Full transaction-level data with auto-filter'],
  ].forEach(([num,title,desc],i) => {
    const r=18+i, even=i%2===0, bg=even?'FFEFF6FF':'FFFFFFFF';
    ws.getRow(r).height=20;
    const nc=ws.getCell(r,2); nc.value=num; nc.fill=xlFill('FF1D4ED8'); nc.font={name:'Arial',bold:true,size:10,color:{argb:'FFFFFFFF'}}; nc.alignment=xlAlign('center');
    const tc=ws.getCell(r,3); tc.value=title; tc.fill=xlFill(bg); tc.font={name:'Arial',bold:true,size:10,color:{argb:'FF1E293B'}}; tc.alignment=xlAlign('left');
    ws.mergeCells(r,4,r,6);
    const dc=ws.getCell(r,4); dc.value=desc; dc.fill=xlFill(bg); dc.font={name:'Arial',size:9,color:{argb:'FF64748B'}}; dc.alignment=xlAlign('left');
  });

  for (let r=28;r<=32;r++) { ws.getRow(r).height=15; for (let c=1;c<=7;c++) ws.getCell(r,c).fill=xlFill('FF1D4ED8'); }
  ws.mergeCells('B29:F29');
  const cf=ws.getCell('B29');
  cf.value='CONFIDENTIAL — FOR INTERNAL USE ONLY'; cf.font={name:'Arial',size:9,color:{argb:'FF93C5FD'}}; cf.alignment=xlAlign('center');
}

// ════════════════════════════════════════════════════════════════
//  SUMMARY SHEET
// ════════════════════════════════════════════════════════════════
function buildSummarySheet(wb, period, splyRows) {
  const ws = wb.addWorksheet('Summary');
  ws.views = [{ showGridLines:false }];
  // pad | label | actual | budget | bud-var | bud-var% | LY | LY-var | LY-var% | pad
  setColWidths(ws, [2,32,16,16,16,10,16,16,10,2]);

  const actual = STATE.filtActual;
  const budget = STATE.filtBudget;
  const months = getFilteredMonths();
  const mc     = months.length || 1;
  const curYear  = parseInt(STATE.filters.year) || new Date().getFullYear();
  const prevYear = curYear - 1;

  // Banner
  ws.getRow(2).height=36; ws.mergeCells('B2:I2');
  const ban=ws.getCell('B2'); ban.value='PERSONNEL COST INTELLIGENCE — EXECUTIVE SUMMARY';
  ban.fill=xlFill('FF1D4ED8'); ban.font={name:'Arial',bold:true,size:14,color:{argb:'FFFFFFFF'}}; ban.alignment=xlAlign('center');
  for (let c=2;c<=9;c++) ws.getCell(2,c).fill=xlFill('FF1D4ED8');

  ws.getRow(3).height=16; ws.mergeCells('B3:I3');
  const per=ws.getCell('B3'); per.value=`Period: ${period}   ·   Generated: ${new Date().toLocaleString('en-GB')}`;
  per.fill=xlFill('FF1E3A5F'); per.font={name:'Arial',size:9,color:{argb:'FFBFDBFE'}}; per.alignment=xlAlign('center');
  for (let c=2;c<=9;c++) ws.getCell(3,c).fill=xlFill('FF1E3A5F');

  ws.getRow(4).height=8;

  // KPI section
  sectionTitle(ws, 5, 'KEY PERFORMANCE INDICATORS', 9);
  subHeaderRow(ws, 6, [
    { label:'Metric',                         span:2, fill:'FF1D4ED8' },
    { label:'vs Budget',                      span:3, fill:'FF1E40AF' },
    { label:`vs Same Period ${prevYear}`,      span:3, fill:'FF1E3A5F' },
  ], 2);
  headerRow(ws, 7, ['Metric','Actual YTD','Budget YTD','Bud Variance','Bud Var %',`LY (${prevYear})`,'LY Variance','LY Var %'], 2);

  const maps = ['COGS','G&A','S&M'];
  const kpiRows = [
    { label:'Total Personnel Cost', a:sumAmount(actual), b:sumAmount(budget), ly:sumAmount(splyRows) },
    ...maps.map(m => ({
      label:m,
      a:  sumAmount(actual.filter(r=>r.mapping===m)),
      b:  sumAmount(budget.filter(r=>r.mapping===m)),
      ly: sumAmount(splyRows.filter(r=>r.mapping===m)),
    })),
  ];

  kpiRows.forEach((k,i) => {
    const r=8+i, even=i%2===0, bg=even?'FFEFF6FF':'FFFFFFFF';
    ws.getRow(r).height=18;
    const bv=k.a-k.b, bp=k.b?(bv/k.b):null;
    const lv=k.a-k.ly, lp=k.ly?(lv/k.ly):null;
    const bvS=varStyle(bv), lvS=varStyle(lv);
    const isTotal=i===0;
    const row=ws.getRow(r);

    [
      { ci:2, val:k.label,    fmt:'@',                 fill:bg,                   align:'left',  font:{bold:isTotal} },
      { ci:3, val:k.a,        fmt:'#,##0',             fill:bg,                   align:'right', font:{bold:isTotal} },
      { ci:4, val:k.b||null,  fmt:'#,##0',             fill:bg,                   align:'right', font:{} },
      { ci:5, val:bv||null,   fmt:'#,##0;[Red](#,##0)',fill:bvS?bvS.fill:bg,      align:'right', font:bvS?bvS.font:{} },
      { ci:6, val:bp,         fmt:'0.0%',              fill:bvS?bvS.fill:bg,      align:'right', font:bvS?bvS.font:{} },
      { ci:7, val:k.ly||null, fmt:'#,##0',             fill:'FFF8FAFC',           align:'right', font:{color:'FF64748B'} },
      { ci:8, val:lv||null,   fmt:'#,##0;[Red](#,##0)',fill:lvS?lvS.fill:'FFF8FAFC', align:'right', font:lvS?lvS.font:{} },
      { ci:9, val:lp,         fmt:'0.0%',              fill:lvS?lvS.fill:'FFF8FAFC', align:'right', font:lvS?lvS.font:{} },
    ].forEach(({ ci,val,fmt,fill,align,font }) => {
      const c=row.getCell(ci); c.value=val; c.fill=xlFill(fill); c.font=xlFont({size:10,...font});
      c.alignment=xlAlign(align,'middle'); c.numFmt=fmt; c.border=FULL_BDR;
    });
  });

  // Headcount section
  const hcStart=8+kpiRows.length+2;
  sectionTitle(ws, hcStart, 'HEADCOUNT SUMMARY', 9);
  headerRow(ws, hcStart+1, ['Metric','Value','','','','','',''], 2);

  const allCCIds=[...new Set(actual.map(r=>r.ccId))];
  const totalHCA=allCCIds.reduce((s,id)=>s+getLatestHCSnapshot(id,true),0);
  const totalHCB=allCCIds.reduce((s,id)=>s+getLatestHCSnapshot(id,false),0);
  const avgCost=totalHCA>0?sumAmount(actual)/mc/totalHCA:null;

  [
    { label:'Actual Headcount (Latest Month)', value:totalHCA||null },
    { label:'Budget Headcount',                value:totalHCB||null },
    { label:'Avg Cost / Head / Month (EGP)',   value:avgCost||null },
  ].forEach((hc,i) => {
    const r=hcStart+2+i, even=i%2===0, bg=even?'FFEFF6FF':'FFFFFFFF';
    ws.getRow(r).height=18;
    const lc=ws.getRow(r).getCell(2); lc.value=hc.label; lc.fill=xlFill(bg); lc.font=xlFont({size:10}); lc.alignment=xlAlign('left','middle'); lc.border=FULL_BDR;
    const vc=ws.getRow(r).getCell(3); vc.value=hc.value; vc.fill=xlFill(bg); vc.font=xlFont({bold:true,size:10}); vc.alignment=xlAlign('right','middle'); vc.numFmt='#,##0'; vc.border=FULL_BDR;
  });
}

// ════════════════════════════════════════════════════════════════
//  BY DEPARTMENT
// ════════════════════════════════════════════════════════════════
function buildByDeptSheet(wb, splyRows) {
  const ws = wb.addWorksheet('By Department');
  ws.views = [{ showGridLines:false, state:'frozen', ySplit:2 }];
  setColWidths(ws, [32,16,16,16,10,16,16,10,10,10,18,12]);

  const months=getFilteredMonths(), mc=months.length||1;
  const curYear=parseInt(STATE.filters.year)||new Date().getFullYear(), prevYear=curYear-1;
  const depts=[...new Set(STATE.filtActual.map(r=>r.dept))].sort();
  const splyByDept={}; splyRows.forEach(r=>{ splyByDept[r.dept]=(splyByDept[r.dept]||0)+r.amount; });

  subHeaderRow(ws, 1, [
    { label:'',                            span:1, fill:'FF1D4ED8' },
    { label:'Actual',                      span:1, fill:'FF1D4ED8' },
    { label:'vs Budget',                   span:3, fill:'FF1E40AF' },
    { label:`vs Same Period ${prevYear}`,  span:3, fill:'FF1E3A5F' },
    { label:'Headcount',                   span:2, fill:'FF065F46' },
    { label:'Efficiency',                  span:1, fill:'FF374151' },
    { label:'',                            span:1, fill:'FF1D4ED8' },
  ]);
  headerRow(ws, 2, [
    'Department','Actual YTD',
    'Budget YTD','Bud Variance','Bud Var %',
    `LY (${prevYear})`,'LY Variance','LY Var %',
    'HC Actual','HC Budget','Avg Cost/Head/Mo','Mapping',
  ]);

  depts.forEach((d,i) => {
    const r=3+i, even=i%2===0, bg=even?'FFEFF6FF':'FFFFFFFF';
    const row=ws.getRow(r); row.height=18;
    const a=sumAmount(STATE.filtActual.filter(x=>x.dept===d));
    const b=sumAmount(STATE.filtBudget.filter(x=>x.dept===d));
    const ly=splyByDept[d]||0;
    const bv=a-b, bp=b?(bv/b):null;
    const lv=a-ly, lp=ly?(lv/ly):null;
    const bvS=varStyle(bv), lvS=varStyle(lv);
    const ccIds=[...new Set(STATE.filtActual.filter(x=>x.dept===d).map(x=>x.ccId))];
    const hca=ccIds.reduce((s,id)=>s+getLatestHCSnapshot(id,true),0);
    const hcb=ccIds.reduce((s,id)=>s+getLatestHCSnapshot(id,false),0);
    const avg=hca>0?a/mc/hca:null;
    const map=STATE.filtActual.find(x=>x.dept===d)?.mapping||'';
    const badge=MAPPING_BADGE[map];

    [
      { ci:1,  val:d,       fmt:'@',                 fill:bg,                 align:'left',   font:{} },
      { ci:2,  val:a,       fmt:'#,##0',             fill:bg,                 align:'right',  font:{bold:true} },
      { ci:3,  val:b||null, fmt:'#,##0',             fill:bg,                 align:'right',  font:{} },
      { ci:4,  val:bv||null,fmt:'#,##0;[Red](#,##0)',fill:bvS?bvS.fill:bg,    align:'right',  font:bvS?bvS.font:{} },
      { ci:5,  val:bp,      fmt:'0.0%',              fill:bvS?bvS.fill:bg,    align:'right',  font:bvS?bvS.font:{} },
      { ci:6,  val:ly||null,fmt:'#,##0',             fill:'FFF8FAFC',         align:'right',  font:{color:'FF64748B'} },
      { ci:7,  val:lv||null,fmt:'#,##0;[Red](#,##0)',fill:lvS?lvS.fill:'FFF8FAFC', align:'right', font:lvS?lvS.font:{} },
      { ci:8,  val:lp,      fmt:'0.0%',              fill:lvS?lvS.fill:'FFF8FAFC', align:'right', font:lvS?lvS.font:{} },
      { ci:9,  val:hca||null,fmt:'#,##0',            fill:bg,                 align:'right',  font:{} },
      { ci:10, val:hcb||null,fmt:'#,##0',            fill:bg,                 align:'right',  font:{} },
      { ci:11, val:avg,     fmt:'#,##0',             fill:bg,                 align:'right',  font:{} },
      { ci:12, val:map,     fmt:'@',                 fill:badge?badge.fill:bg,align:'center', font:badge?badge.font:{} },
    ].forEach(({ ci,val,fmt,fill,align,font }) => {
      const c=row.getCell(ci); c.value=val; c.fill=xlFill(fill); c.font=xlFont({size:10,...font});
      c.alignment=xlAlign(align,'middle'); c.numFmt=fmt; c.border={ top:THIN, bottom:THIN };
    });
  });
  addAutoFilter(ws, 12);
}

// ════════════════════════════════════════════════════════════════
//  BY COST CENTER
// ════════════════════════════════════════════════════════════════
function buildByCCSheet(wb, splyRows) {
  const ws = wb.addWorksheet('By Cost Center');
  ws.views = [{ showGridLines:false, state:'frozen', ySplit:2 }];
  setColWidths(ws, [16,28,28,10,16,16,16,10,16,16,10,10,10,18,20]);

  const months=getFilteredMonths(), mc=months.length||1;
  const curYear=parseInt(STATE.filters.year)||new Date().getFullYear(), prevYear=curYear-1;
  const splyByCC={}; splyRows.forEach(r=>{ splyByCC[r.ccId]=(splyByCC[r.ccId]||0)+r.amount; });

  const ccMap={};
  STATE.filtActual.forEach(r=>{
    if (!ccMap[r.ccId]) ccMap[r.ccId]={ actual:0, name:r.ccName, dept:r.dept, mapping:r.mapping, responsibility:r.responsibility };
    ccMap[r.ccId].actual+=r.amount;
  });

  subHeaderRow(ws, 1, [
    { label:'',                           span:4,  fill:'FF1D4ED8' },
    { label:'Actual',                     span:1,  fill:'FF1D4ED8' },
    { label:'vs Budget',                  span:3,  fill:'FF1E40AF' },
    { label:`vs Same Period ${prevYear}`, span:3,  fill:'FF1E3A5F' },
    { label:'Headcount',                  span:2,  fill:'FF065F46' },
    { label:'Efficiency',                 span:1,  fill:'FF374151' },
    { label:'',                           span:1,  fill:'FF1D4ED8' },
  ]);
  headerRow(ws, 2, [
    'CC Code','CC Name','Department','Mapping',
    'Actual YTD',
    'Budget YTD','Bud Variance','Bud Var %',
    `LY (${prevYear})`,'LY Variance','LY Var %',
    'HC Actual','HC Budget','Avg Cost/Head/Mo','Responsibility',
  ]);

  Object.entries(ccMap).sort((a,b)=>b[1].actual-a[1].actual).forEach(([ccId,cc],i) => {
    const r=3+i, even=i%2===0, bg=even?'FFEFF6FF':'FFFFFFFF';
    const row=ws.getRow(r); row.height=18;
    const bAmt=sumAmount(STATE.filtBudget.filter(x=>x.ccId===ccId));
    const ly=splyByCC[ccId]||0;
    const bv=cc.actual-bAmt, bp=bAmt?(bv/bAmt):null;
    const lv=cc.actual-ly, lp=ly?(lv/ly):null;
    const bvS=varStyle(bv), lvS=varStyle(lv);
    const hca=getLatestHCSnapshot(ccId,true), hcb=getLatestHCSnapshot(ccId,false);
    const avg=hca>0?cc.actual/mc/hca:null;
    const over=cc.actual>bAmt*1.1&&bAmt>0;
    const badge=MAPPING_BADGE[cc.mapping];

    [
      { ci:1,  val:ccId,              fmt:'@',                 fill:bg,                 align:'center', font:{} },
      { ci:2,  val:cc.name,           fmt:'@',                 fill:bg,                 align:'left',   font:{} },
      { ci:3,  val:cc.dept,           fmt:'@',                 fill:bg,                 align:'left',   font:{} },
      { ci:4,  val:cc.mapping,        fmt:'@',                 fill:badge?badge.fill:bg,align:'center', font:badge?badge.font:{} },
      { ci:5,  val:cc.actual,         fmt:'#,##0',             fill:over?'FFFEE2E2':bg, align:'right',  font:over?{color:'FFDC2626',bold:true}:{bold:true} },
      { ci:6,  val:bAmt||null,        fmt:'#,##0',             fill:bg,                 align:'right',  font:{} },
      { ci:7,  val:bv||null,          fmt:'#,##0;[Red](#,##0)',fill:bvS?bvS.fill:bg,    align:'right',  font:bvS?bvS.font:{} },
      { ci:8,  val:bp,                fmt:'0.0%',              fill:bvS?bvS.fill:bg,    align:'right',  font:bvS?bvS.font:{} },
      { ci:9,  val:ly||null,          fmt:'#,##0',             fill:'FFF8FAFC',         align:'right',  font:{color:'FF64748B'} },
      { ci:10, val:lv||null,          fmt:'#,##0;[Red](#,##0)',fill:lvS?lvS.fill:'FFF8FAFC', align:'right', font:lvS?lvS.font:{} },
      { ci:11, val:lp,                fmt:'0.0%',              fill:lvS?lvS.fill:'FFF8FAFC', align:'right', font:lvS?lvS.font:{} },
      { ci:12, val:hca||null,         fmt:'#,##0',             fill:bg,                 align:'right',  font:{} },
      { ci:13, val:hcb||null,         fmt:'#,##0',             fill:bg,                 align:'right',  font:{} },
      { ci:14, val:avg,               fmt:'#,##0',             fill:bg,                 align:'right',  font:{} },
      { ci:15, val:cc.responsibility, fmt:'@',                 fill:bg,                 align:'left',   font:{} },
    ].forEach(({ ci,val,fmt,fill,align,font }) => {
      const c=row.getCell(ci); c.value=val; c.fill=xlFill(fill); c.font=xlFont({size:10,...font});
      c.alignment=xlAlign(align,'middle'); c.numFmt=fmt; c.border={ top:THIN, bottom:THIN };
    });
  });
  addAutoFilter(ws, 15);
}

// ════════════════════════════════════════════════════════════════
//  DRILL-DOWN — 3 levels with Budget & LY columns
// ════════════════════════════════════════════════════════════════
function buildDrillDownSheet(wb, splyRows) {
  const ws = wb.addWorksheet('Drill-Down');
  ws.views = [{ showGridLines:false, state:'frozen', ySplit:2 }];
  // Level | Name | Code | Actual | Budget | Bud-Var | Bud-Var% | LY | LY-Var | LY-Var% | HC-A | HC-B | Avg
  setColWidths(ws, [14,40,14,16,16,16,10,16,16,10,10,10,18]);

  const months=getFilteredMonths(), mc=months.length||1;
  const curYear=parseInt(STATE.filters.year)||new Date().getFullYear(), prevYear=curYear-1;
  const hierarchy=buildHierarchy(STATE.filtActual, STATE.filtBudget, splyRows, months, mc);

  subHeaderRow(ws, 1, [
    { label:'',                           span:3, fill:'FF1D4ED8' },
    { label:'Actual',                     span:1, fill:'FF1D4ED8' },
    { label:'vs Budget',                  span:3, fill:'FF1E40AF' },
    { label:`vs Same Period ${prevYear}`, span:3, fill:'FF1E3A5F' },
    { label:'Headcount',                  span:2, fill:'FF065F46' },
    { label:'Efficiency',                 span:1, fill:'FF374151' },
  ]);
  headerRow(ws, 2, [
    'Level','Department / Cost Center / GL Account','Code',
    'Actual YTD',
    'Budget YTD','Bud Variance','Bud Var %',
    `LY (${prevYear})`,'LY Variance','LY Var %',
    'HC Actual','HC Budget','Avg Cost/Head/Mo',
  ]);

  const LSTYLE = {
    'Department': { fill:'FF1D4ED8', font:{ bold:true,  size:11, color:'FFFFFFFF' }, height:22 },
    'Cost Center':{ fill:'FFDBEAFE', font:{ bold:true,  size:10, color:'FF1D4ED8' }, height:19 },
    'GL Account': { fill:'FFFFFFFF', font:{ bold:false, size:9,  color:'FF1E293B' }, height:17 },
  };
  const INDENT = { 'Department':'', 'Cost Center':'    ', 'GL Account':'        ' };

  let rowNum=3;

  function writeDrillRow(level,name,code,actual,budget,lastYear,hca,hcb,avg) {
    const st=LSTYLE[level];
    const row=ws.getRow(rowNum++);
    row.height=st.height;
    const bv=(actual||0)-(budget||0), bp=budget?(bv/budget):null;
    const lv=(actual||0)-(lastYear||0), lp=lastYear?(lv/lastYear):null;
    const bvS=varStyle(bv), lvS=varStyle(lv);
    const label=INDENT[level]+(name||'');

    [
      { ci:1,  val:level,       fill:st.fill, font:st.font, fmt:'@',                 align:'center' },
      { ci:2,  val:label,       fill:st.fill, font:st.font, fmt:'@',                 align:'left'   },
      { ci:3,  val:code||null,  fill:st.fill, font:st.font, fmt:'@',                 align:'center' },
      { ci:4,  val:actual,      fill:st.fill, font:st.font, fmt:'#,##0',             align:'right'  },
      { ci:5,  val:budget||null,fill:st.fill, font:st.font, fmt:'#,##0',             align:'right'  },
      { ci:6,  val:bv||null,    fill:bvS?bvS.fill:st.fill, font:bvS?{...st.font,...bvS.font}:st.font, fmt:'#,##0;[Red](#,##0)', align:'right' },
      { ci:7,  val:bp,          fill:bvS?bvS.fill:st.fill, font:bvS?{...st.font,...bvS.font}:st.font, fmt:'0.0%',               align:'right' },
      { ci:8,  val:lastYear||null, fill:st.fill, font:{...st.font,color:'FF64748B'}, fmt:'#,##0',   align:'right' },
      { ci:9,  val:lv||null,    fill:lvS?lvS.fill:st.fill, font:lvS?{...st.font,...lvS.font}:st.font, fmt:'#,##0;[Red](#,##0)', align:'right' },
      { ci:10, val:lp,          fill:lvS?lvS.fill:st.fill, font:lvS?{...st.font,...lvS.font}:st.font, fmt:'0.0%',               align:'right' },
      { ci:11, val:hca||null,   fill:st.fill, font:st.font, fmt:'#,##0',             align:'right'  },
      { ci:12, val:hcb||null,   fill:st.fill, font:st.font, fmt:'#,##0',             align:'right'  },
      { ci:13, val:avg||null,   fill:st.fill, font:st.font, fmt:'#,##0',             align:'right'  },
    ].forEach(({ ci,val,fill,font,fmt,align }) => {
      const c=row.getCell(ci);
      c.value=val;
      c.fill=xlFill(fill);
      c.font=xlFont({ size:font.size||10, bold:font.bold||false, color:font.color||'FF1E293B' });
      c.alignment=xlAlign(align,'middle');
      c.numFmt=fmt;
      c.border={ top:THIN, bottom:THIN };
    });
  }

  Object.entries(hierarchy).sort((a,b)=>b[1].actual-a[1].actual).forEach(([deptName,dept]) => {
    writeDrillRow('Department',deptName,null,dept.actual,dept.budget,dept.lastYear,dept.hcActual,dept.hcBudget,dept.avgCost);
    Object.entries(dept.costCenters).sort((a,b)=>b[1].actual-a[1].actual).forEach(([,cc]) => {
      writeDrillRow('Cost Center',cc.name,cc.id,cc.actual,cc.budget,cc.lastYear,cc.hcActual,cc.hcBudget,cc.avgCost);
      Object.entries(cc.glAccounts).sort((a,b)=>b[1].actual-a[1].actual).forEach(([,gl]) => {
        writeDrillRow('GL Account',gl.name,gl.account,gl.actual,gl.budget||0,gl.lastYear||0,null,null,null);
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  RAW DATA
// ════════════════════════════════════════════════════════════════
function buildRawDataSheet(wb) {
  const ws = wb.addWorksheet('Raw Data');
  ws.views = [{ showGridLines:false, state:'frozen', ySplit:1 }];
  setColWidths(ws, [8,8,13,18,18,30,14,30,10,20,12,30,22,16,16]);

  headerRow(ws, 1, ['Year','Month','Date Serial','Company','Segment','Department',
                    'CC Code','CC Name','Mapping','Responsibility',
                    'GL Account','GL Account Name','GL Group','Account Type','Amount (EGP)']);

  STATE.filtActual.forEach((r,i) => {
    const rowNum=2+i, even=i%2===0, bg=even?'FFEFF6FF':'FFFFFFFF';
    const row=ws.getRow(rowNum); row.height=16;
    const badge=MAPPING_BADGE[r.mapping];
    [
      r.year, r.month, r.dateSerial,
      r.company, r.segmentName||r.segment, r.dept,
      r.ccId, r.ccName, r.mapping, r.responsibility,
      r.account, r.accountName, r.groupNameV1||r.glGroup, r.accountType, r.amount,
    ].forEach((val,ci) => {
      const c=row.getCell(ci+1);
      c.value=val;
      const isMappingCol=ci===8, isAmountCol=ci===14;
      c.fill=xlFill(isMappingCol&&badge?badge.fill:bg);
      c.font=xlFont({ size:9, ...(isMappingCol&&badge?badge.font:{}) });
      c.alignment=xlAlign(isAmountCol?'right':isMappingCol?'center':'left','middle');
      c.numFmt=isAmountCol?'#,##0.00':'@';
      c.border={ top:THIN, bottom:THIN };
    });
  });
  addAutoFilter(ws, 15);
}
