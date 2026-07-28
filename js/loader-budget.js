'use strict';
/* ============================================================
   LOADER-BUDGET.JS — Loads budget Excel files from GitHub
   Files expected:
     Budget/PnL/modupay Budget (BL).xlsx          ← single file, two sheets
       Sheet 0: "modupay Cards | P&L Budget"
       Sheet 1: "modupay DP | P&L Budget"
     Budget/Revenues/modupay Cards Revenues Budget.xlsx
     Budget/Revenues/modupay DP Revenues Budget.xlsx
   All P&L budget figures are in USD (obfuscated on GitHub).
   getBudgetISData() returns EGP by multiplying raw USD × BUDGET_FX_RATE (48).
   ============================================================ */

// ── Deobfuscate a budget cell (same algo as OpEx) ─────────────
function _deobfBudget(raw) {
  if (raw == null || raw === '') return 0;
  const s = String(raw).trim();
  if (/^-?[\d,.\s]+$/.test(s)) return parseFloat(s.replace(/,/g,'')) || 0;
  try { return deobfuscateAmount(raw) || 0; } catch { return 0; }
}

// ── Convert Excel serial number to { year, month } ────────────
// Excel serial: days since 1899-12-30. Valid range 40000-60000 covers ~2009-2064.
function _excelSerialToYM(serial) {
  if (typeof serial !== 'number' || serial < 40000 || serial > 60000) return null;
  const ms = (serial - 25569) * 86400 * 1000;  // convert to Unix ms
  const d  = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// ── Extract month columns from header row ─────────────────────
// SheetJS returns date cells as Excel serial integers even with cellDates:true
// in browser environments. Handles both Date objects and serial numbers.
// Returns { monthCols: [{ colIdx, year, month }], fyCol }
function _extractMonthCols(headerRow) {
  const monthCols = [];
  let fyCol = -1;
  for (let c = 0; c < headerRow.length; c++) {
    const cell = headerRow[c];
    // Case 1: proper Date object
    if (cell instanceof Date && !isNaN(cell)) {
      monthCols.push({ colIdx: c, year: cell.getUTCFullYear(), month: cell.getUTCMonth() + 1 });
      continue;
    }
    // Case 2: Excel serial number (integer)
    const ym = _excelSerialToYM(cell);
    if (ym) {
      monthCols.push({ colIdx: c, ...ym });
      continue;
    }
    // Case 3: FY total column — string like "2026FY\nBudget"
    const s = String(cell || '').replace(/\s/g, '').toLowerCase();
    if (s.includes('fy') || s.includes('budget')) fyCol = c;
  }
  return { monthCols, fyCol };
}

// ── Parse one P&L budget worksheet into a keyed store ─────────
// Returns { key: { 'YYYY-MM': usdValue, 'YYYY-FY': usdValue } }
// rowMap: array of { rowIdx, key, addRowIdxs? }
//   rowIdx     — 0-based row index in the sheet (after sheet_to_json)
//   key        — storage key  e.g. 'revenue', 'sm'
//   addRowIdxs — optional extra row indices whose values are summed into this key
function _parseBudgetSheet(rows, rowMap) {
  if (rows.length < 2) return {};

  const headerRow = rows[1];   // row index 1 is the header (dates)
  const { monthCols, fyCol } = _extractMonthCols(headerRow);
  if (!monthCols.length) {
    console.warn('[Budget] No date columns found in sheet header');
    return {};
  }
  const fyYear = monthCols[0]?.year || new Date().getFullYear();

  const result = {};
  for (const { rowIdx, key, addRowIdxs } of rowMap) {
    result[key] = {};
    const idxList = [rowIdx, ...(addRowIdxs || [])];
    for (const { colIdx, year, month } of monthCols) {
      const periodKey = `${year}-${String(month).padStart(2,'0')}`;
      result[key][periodKey] = idxList.reduce((sum, ri) => {
        const row = rows[ri];
        return sum + (row ? _deobfBudget(row[colIdx]) : 0);
      }, 0);
    }
    if (fyCol >= 0) {
      const fyKey = `${fyYear}-FY`;
      result[key][fyKey] = idxList.reduce((sum, ri) => {
        const row = rows[ri];
        return sum + (row ? _deobfBudget(row[fyCol]) : 0);
      }, 0);
    }
  }
  return result;
}

// ── Row map for modupay Cards sheet ───────────────────────────
// Row indices are 0-based after sheet_to_json with header:1.
// Transportation (row 7) and mdp Digital (row 8) are summed into manufacturingCost.
const _MC_ROW_MAP = [
  { rowIdx:  2, key: 'revenue'           },
  { rowIdx:  5, key: 'consumptionCost'   },
  { rowIdx:  6, key: 'industrialPayroll' },
  { rowIdx:  9, key: 'manufacturingCost', addRowIdxs: [7, 8] },  // +Transportation +mdp Digital
  { rowIdx: 10, key: 'sla'               },
  { rowIdx: 14, key: 'sm'                },
  { rowIdx: 15, key: 'smPersonnel'       },
  { rowIdx: 16, key: 'smMarketing'       },
  { rowIdx: 17, key: 'smOther'           },
  { rowIdx: 18, key: 'ga'                },
  { rowIdx: 19, key: 'gaPersonnel'       },
  { rowIdx: 20, key: 'gaOther'           },
  { rowIdx: 21, key: 'ebitda'            },
  { rowIdx: 23, key: 'totalDA'           },
  { rowIdx: 24, key: 'grossDA'           },
  { rowIdx: 25, key: 'rouDA'             },
  { rowIdx: 26, key: 'rechargeSLA'       },
  { rowIdx: 27, key: 'ebit'              },
  { rowIdx: 29, key: 'leaseLiabInt'      },
  { rowIdx: 30, key: 'financialExpenses' },
  { rowIdx: 31, key: 'creditInterest'    },
  { rowIdx: 32, key: 'otherIncome'       },
  { rowIdx: 33, key: 'provisions'        },
  { rowIdx: 34, key: 'takaful'           },
  { rowIdx: 35, key: 'unrealizedFX'      },
  { rowIdx: 36, key: 'ebt'               },
  { rowIdx: 38, key: 'incomeTax'         },
  { rowIdx: 39, key: 'netProfit'         },
];

// ── Row map for modupay DP sheet ──────────────────────────────
// New Office Depreciation (row 37) is summed into grossDA.
const _DP_ROW_MAP = [
  { rowIdx:  2, key: 'revenue'            },
  { rowIdx:  3, key: 'issuanceRevenue'    },
  { rowIdx:  4, key: 'issuanceCards'      },
  { rowIdx:  5, key: 'issuancePerso'      },
  { rowIdx:  6, key: 'issuanceCost'       },
  { rowIdx:  7, key: 'issuanceGrossProfit'},
  { rowIdx:  9, key: 'processingRevenues' },
  { rowIdx: 10, key: 'processingCost'     },
  { rowIdx: 11, key: 'personnel'          },
  { rowIdx: 12, key: 'infoSecOpEx'        },
  { rowIdx: 13, key: 'atm'                },
  { rowIdx: 14, key: 'sms'                },
  { rowIdx: 15, key: 'cyberSec'           },
  { rowIdx: 16, key: 'sla'                },
  { rowIdx: 19, key: 'totalGrossProfit'   },
  { rowIdx: 21, key: 'sm'                 },
  { rowIdx: 22, key: 'smPersonnel'        },
  { rowIdx: 23, key: 'smOther'            },
  { rowIdx: 24, key: 'ga'                 },
  { rowIdx: 25, key: 'gaPersonnel'        },
  { rowIdx: 26, key: 'leaseExpenses6F'    },
  { rowIdx: 27, key: 'gaOther'            },
  { rowIdx: 28, key: 'productDevCost'     },
  { rowIdx: 29, key: 'labsPersonnel'      },
  { rowIdx: 30, key: 'labsOtherOpEx'      },
  { rowIdx: 32, key: 'ebitda'             },
  { rowIdx: 34, key: 'totalDA'            },
  { rowIdx: 35, key: 'grossDA', addRowIdxs: [37] },  // +New Office Depreciation
  { rowIdx: 36, key: 'rouDA'              },
  { rowIdx: 38, key: 'ebit'               },
  { rowIdx: 40, key: 'leaseInterest2F'    },
  { rowIdx: 41, key: 'leaseLiabInt'       },
  { rowIdx: 42, key: 'takaful'            },
  { rowIdx: 43, key: 'provisions'         },
  { rowIdx: 44, key: 'otherIncome'        },
  { rowIdx: 45, key: 'financialExpenses'  },
  { rowIdx: 46, key: 'creditInterest'     },
  { rowIdx: 47, key: 'unrealizedFX'       },
  { rowIdx: 48, key: 'ebt'                },
  { rowIdx: 50, key: 'incomeTax'          },
  { rowIdx: 51, key: 'netProfit'          },
];

// ── Load one Revenues budget Excel file ──────────────────────
// Revenue files still use text month headers (e.g. "Jan-26") — keep these helpers.
function _revBudgetMonthIdx(header) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const s = String(header || '').trim();
  for (let i = 0; i < MONTHS.length; i++) {
    if (s.toLowerCase().startsWith(MONTHS[i].toLowerCase())) return i + 1;
  }
  return 0;
}
function _revBudgetYear(header) {
  const s = String(header || '').trim();
  const m = s.match(/[- ](\d{2})$/);
  if (m) { let yr = parseInt(m[1]); return yr < 100 ? yr + 2000 : yr; }
  const m2 = s.match(/(\d{4})/);
  return m2 ? parseInt(m2[1]) : 0;
}

// Returns array of row objects with monthly volumes and revenues
async function _loadRevBudgetFile(token, username, repo, path, isMC) {
  const result = [];
  try {
    const bytes = await fetchFileBytes(token, username, repo, path);
    if (!bytes?.length) return result;

    const wb = XLSX.read(bytes, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) return result;

    const headerRow = rows[0];
    // Find Volume and Revenue month columns by scanning two header rows
    // Structure: [meta cols...] [vol months...] [rev months...]
    // Both MC and DP have similar patterns — detect by month names
    const volCols = [], revCols = [];
    let inRevSection = false;
    let metaCols = isMC ? 8 : 6;  // # of meta cols before volumes

    for (let c = metaCols; c < headerRow.length; c++) {
      const mo = _revBudgetMonthIdx(headerRow[c]);
      if (!mo) { if (volCols.length > 0 && !inRevSection) inRevSection = true; continue; }
      const yr = _revBudgetYear(headerRow[c]);
      if (!inRevSection) volCols.push({ colIdx: c, year: yr, month: mo });
      else               revCols.push({ colIdx: c, year: yr, month: mo });
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const code = parseInt(String(row[isMC?0:1] || ''));
      if (!code) continue;

      const obj = {
        code,
        shortName:  String(row[isMC?1:2] || '').trim(),
        country:    isMC ? String(row[3]||'').trim() : '',
        mainRegion: isMC ? String(row[4]||'').trim() : String(row[3]||'').trim(),
        entity:     isMC ? String(row[5]||'').trim() : '',
        category:   isMC ? String(row[6]||'').trim() : String(row[0]||'').trim(),
        productType:isMC ? String(row[7]||'').trim() : String(row[4]||'').trim(),
        volumes: {},
        revenues: {},
      };

      // Look up enrichment from Sales Master
      const custMeta = (SALES_MASTER?.customers || {})[code] || {};
      if (!obj.mainRegion && custMeta.mainRegion) obj.mainRegion = custMeta.mainRegion;
      if (!obj.shortName  && custMeta.shortName)  obj.shortName  = custMeta.shortName;

      for (const { colIdx, year, month } of volCols) {
        const key = `${year}-${String(month).padStart(2,'0')}`;
        obj.volumes[key] = _deobfBudget(row[colIdx]);
      }
      for (const { colIdx, year, month } of revCols) {
        const key = `${year}-${String(month).padStart(2,'0')}`;
        // Revenues budget is in USD — store as-is
        obj.revenues[key] = _deobfBudget(row[colIdx]);
      }

      result.push(obj);
    }
  } catch (e) {
    console.warn(`[Budget] Could not load revenue budget ${path}:`, e.message);
  }
  return result;
}

// ── Main budget loader (called from loadAllData) ──────────────
async function loadAllBudget(token, username, repo) {
  STATE.budgetPL       = {};
  STATE.budgetRevenues = {};

  // ── P&L budget: single file, two sheets ──────────────────────
  const PL_PATH = 'Budget/PnL/modupay Budget (BL).xlsx';
  let mcPL = {}, dpPL = {};
  try {
    const bytes = await fetchFileBytes(token, username, repo, PL_PATH);
    if (bytes?.length) {
      const wb = XLSX.read(bytes, { type: 'array', cellDates: true });

      // Sheet 0 → modupay Cards
      const mcWs   = wb.Sheets[wb.SheetNames[0]];
      const mcRows = XLSX.utils.sheet_to_json(mcWs, { header: 1, defval: '' });
      mcPL = _parseBudgetSheet(mcRows, _MC_ROW_MAP);

      // Sheet 1 → modupay DP
      const dpWs   = wb.Sheets[wb.SheetNames[1]];
      const dpRows = XLSX.utils.sheet_to_json(dpWs, { header: 1, defval: '' });
      dpPL = _parseBudgetSheet(dpRows, _DP_ROW_MAP);

      console.log(`[Budget] Loaded P&L budget: MC=${Object.keys(mcPL).length} keys, DP=${Object.keys(dpPL).length} keys`);
    } else {
      console.warn(`[Budget] File not found or empty: ${PL_PATH}`);
    }
  } catch (e) {
    console.warn(`[Budget] Could not load ${PL_PATH}:`, e.message);
  }
  STATE.budgetPL['Masria Cards'] = mcPL;
  STATE.budgetPL['mdp']          = dpPL;

  // ── Revenue budgets (unchanged) ───────────────────────────────
  const [mcRev, dpRev] = await Promise.all([
    _loadRevBudgetFile(token, username, repo, 'Budget/Revenues/modupay Cards Revenues Budget.xlsx', true),
    _loadRevBudgetFile(token, username, repo, 'Budget/Revenues/modupay DP Revenues Budget.xlsx',    false),
  ]);
  STATE.budgetRevenues['Masria Cards'] = mcRev;
  STATE.budgetRevenues['mdp']          = dpRev;

  console.log(`[Budget] Loaded Revenue budget: MC=${mcRev.length} clients, DP=${dpRev.length} clients`);
}

// ── Helper: get YTD USD value for a stored key ───────────────
// Sums monthly values from month 1 up to `month` for the given year.
// Returns raw USD (multiply by BUDGET_FX_RATE to get EGP).
function _getBudgetKeyYTD(entity, key, year, month) {
  const store = (STATE.budgetPL[entity] || {})[key];
  if (!store) return 0;
  const y = parseInt(year), m = parseInt(month);
  let total = 0;
  for (let mo = 1; mo <= m; mo++) {
    total += store[`${y}-${String(mo).padStart(2,'0')}`] || 0;
  }
  return total;
}

// ── Build an IS-shaped budget object for a given entity / period ─
// Returns values in EGP (raw USD × BUDGET_FX_RATE = 48).
// entityFolder: same folder string used in statements-mc/dp
function getBudgetISData(entityFolder, year, month) {
  function _isMasria(ef) {
    const prefix = (typeof ENTITY_UID_PREFIX !== 'undefined' && ENTITY_UID_PREFIX)
      ? ENTITY_UID_PREFIX[ef] : null;
    if (prefix === '10') return true;
    if (prefix === '12') return false;
    return ef === 'Masria Cards' || ef === 'modupay Cards';
  }

  const isMasria = _isMasria(entityFolder);
  const entity   = isMasria ? 'Masria Cards' : 'mdp';
  const FX       = BUDGET_FX_RATE;  // 48 EGP/USD

  // getK: YTD USD × FX → EGP  (sign kept as-is from file)
  const getK = key => _getBudgetKeyYTD(entity, key, year, month) * FX;
  // neg: force negative for expense lines stored as negative in the file
  const neg  = key => -Math.abs(getK(key));

  if (isMasria) {
    // ── modupay Cards ─────────────────────────────────────────
    const revenue            = getK('revenue');
    const consumptionCost    = neg('consumptionCost');
    const industrialPayroll  = neg('industrialPayroll');
    const manufacturingCost  = neg('manufacturingCost');  // includes Transportation + mdp Digital
    const sla                = neg('sla');
    const cogs               = consumptionCost + industrialPayroll + manufacturingCost + sla;
    const grossProfit        = revenue + cogs;
    const gpm                = revenue ? grossProfit / revenue : 0;

    const sm                 = neg('sm');
    const ga                 = neg('ga');
    const ebitda             = grossProfit + sm + ga;
    const ebitdaM            = revenue ? ebitda / revenue : 0;

    const grossDA            = neg('grossDA');
    const rouDA              = neg('rouDA');
    const rechargeSLA        = Math.abs(getK('rechargeSLA'));  // income — take absolute
    const totalDA            = grossDA + rouDA + rechargeSLA;

    const leaseLiabInt       = neg('leaseLiabInt');
    const financialExpenses  = neg('financialExpenses');
    const creditInterest     = Math.abs(getK('creditInterest'));
    const leaseBackcharge    = 0;
    const otherIncome        = Math.abs(getK('otherIncome'));
    const capitalGain        = 0;
    const provisions         = neg('provisions');
    const provisionsNLR      = 0;
    const takaful            = neg('takaful');
    const unrealizedFX       = getK('unrealizedFX');
    const realizedFX         = 0;

    const ebt =
      ebitda + totalDA + financialExpenses + leaseLiabInt +
      creditInterest + leaseBackcharge + otherIncome + capitalGain +
      provisions + provisionsNLR + takaful + unrealizedFX + realizedFX;
    const ebtM = revenue ? ebt / revenue : 0;

    const incomeTax   = neg('incomeTax');
    const deferredTax = 0;
    const netProfit   = ebt + incomeTax + deferredTax;
    const netM        = revenue ? netProfit / revenue : 0;

    return {
      revenue, consumptionCost, industrialPayroll, manufacturingCost, sla, cogs,
      grossProfit, gpm, sm, ga, ebitda, ebitdaM,
      grossDA, rouDA, rechargeSLA, totalDA,
      financialExpenses, leaseLiabInt, creditInterest,
      leaseBackcharge, otherIncome, capitalGain,
      provisions, provisionsNLR, takaful, unrealizedFX, realizedFX,
      ebt, ebtM, incomeTax, deferredTax, netProfit, netM,
    };

  } else {
    // ── modupay DP ────────────────────────────────────────────
    const processingRevenues  = getK('processingRevenues');
    const issuanceRevenues    = getK('issuanceRevenue') ||
                                (getK('issuanceCards') + getK('issuancePerso'));
    const digitalRevenues     = 0;
    const revenue             = processingRevenues + issuanceRevenues + digitalRevenues;

    const personnel           = neg('personnel');
    const sla                 = neg('sla');
    const infoSecOpEx         = neg('infoSecOpEx');
    const processingCost      = personnel + infoSecOpEx + sla;
    const processingGrossProfit = processingRevenues + processingCost;
    const processingGPM       = processingRevenues ? processingGrossProfit / processingRevenues : 0;

    const issuanceCost        = neg('issuanceCost');
    const issuanceGrossProfit = issuanceRevenues + issuanceCost;
    const issuanceGPM         = issuanceRevenues ? issuanceGrossProfit / issuanceRevenues : 0;

    const totalGrossProfit    = getK('totalGrossProfit');
    const totalGPM            = revenue ? totalGrossProfit / revenue : 0;

    const productDevCost      = neg('productDevCost');
    const digitalGrossProfit  = digitalRevenues + productDevCost;
    const digitalGPM          = 0;

    const smBudget            = neg('sm');
    const gaBudget            = neg('ga');
    const sga                 = smBudget + gaBudget;

    const ebitda              = getK('ebitda');
    const ebitdaM             = revenue ? ebitda / revenue : 0;

    const grossDA             = neg('grossDA');  // includes New Office Depreciation
    const rouDA               = neg('rouDA');
    const totalDA             = getK('totalDA');

    const financialExpenses   = neg('financialExpenses');
    const leaseInterest2F     = neg('leaseInterest2F');
    const leaseLiabInt        = neg('leaseLiabInt');
    const otherIncome         = Math.abs(getK('otherIncome'));
    const creditInterest      = Math.abs(getK('creditInterest'));
    const provisions          = neg('provisions');
    const takaful             = neg('takaful');
    const unrealizedFX        = getK('unrealizedFX');
    const realizedFX          = 0;
    const solidarity          = 0;

    const ebt                 = getK('ebt');
    const ebtM                = revenue ? ebt / revenue : 0;
    const incomeTax           = neg('incomeTax');
    const deferredTax         = 0;
    const netProfit           = getK('netProfit');
    const netM                = revenue ? netProfit / revenue : 0;

    return {
      processingRevenues, issuanceRevenues, digitalRevenues, revenue,
      personnel, infoSecOpEx, sla, processingCost,
      processingGrossProfit, processingGPM,
      issuanceCost, issuanceGrossProfit, issuanceGPM,
      totalGrossProfit, totalGPM,
      productDevCost, digitalGrossProfit, digitalGPM,
      sga, ebitda, ebitdaM,
      grossDA, rouDA, totalDA,
      financialExpenses, leaseInterest2F, leaseLiabInt, otherIncome, creditInterest,
      solidarity, provisions, takaful, unrealizedFX, realizedFX,
      ebt, ebtM, incomeTax, deferredTax, netProfit, netM,
    };
  }
}

// ── Get YTD budget revenues (USD) from revenue budget files ──────
// Returns { totalUSD, byProduct } — for use in sales dashboard
function getBudgetRevenues(entity, year, month) {
  const rows = STATE.budgetRevenues[entity] || [];
  if (!rows.length) return { totalUSD: 0, rows: [] };
  const y = parseInt(year), m = parseInt(month);
  let totalUSD = 0;
  const out = [];
  for (const r of rows) {
    let ytdRev = 0;
    for (let mo = 1; mo <= m; mo++) {
      const key = `${y}-${String(mo).padStart(2,'0')}`;
      ytdRev += r.revenues[key] || 0;
    }
    totalUSD += ytdRev;
    if (ytdRev) out.push({ ...r, ytdRevUSD: ytdRev });
  }
  return { totalUSD, rows: out };
}
