'use strict';
/* ============================================================
   LOADER-OPEX.JS — OpEx CSV parser + preprocessing
   ============================================================
   Preprocessing steps (in order):
   1. Exclude [Offsetting Account] = "22001040"  (intercompany)
   2. Exclude accounts: 69001500, 69001060, 69001400
   3. CC Segment (Adj): override segment for account 60801020
      + CC 1030101180 + docNum in {3100011601, 9900001813} → "Corporate"
   4. Sign correction: SAP signs are reversed — negate all amounts
      so Revenue is positive, expenses are positive costs

   Key derivations:
   • year / month   ← "Posting Date" (SAP serial / DD/MM/YYYY / YYYY-MM-DD)
   • account        ← "G/L Account" or "Account"
   • costCenter     ← "Cost Center"
   • companyCode    ← MASTER.cc[costCenter].companyCode
   • Unique ID      ← [2-digit prefix][account][YYYY][MM]
   • All GL metadata ← MASTER.gl via glLookup(uniqueId, account)
   • CC metadata     ← MASTER.cc[costCenter]
   ============================================================ */

const CC_COMPANY_TO_PREFIX = {
  '1000': '10',   // modupay Cards (Masria)
  '1200': '12',   // modupay DP   (mdp)
};

// ── Exclusion sets ─────────────────────────────────────────────
const OPEX_EXCLUDED_ACCOUNTS = new Set([69001500, 69001060, 69001400]);
const OPEX_INTERCO_ACCOUNT   = '22001040';

// ── Parse SAP Posting Date ─────────────────────────────────────
function parsePostingDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return { year: 0, month: 0 };

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-');
    return { year: parseInt(y), month: parseInt(m) };
  }
  // DD/MM/YYYY or DD.MM.YYYY
  if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(s)) {
    const parts = s.split(/[\/\.]/);
    return { year: parseInt(parts[2]), month: parseInt(parts[1]) };
  }
  // SAP serial (days since 1899-12-30)
  const n = parseInt(s);
  if (!isNaN(n) && n > 30000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }
  return { year: 0, month: 0 };
}

// ── OpEx category classification ──────────────────────────────
function classifyOpEx(row) {
  const glGroup    = row.glAccountGroup || '';
  const acctParent = row.accountParent  || '';

  if (glGroup.startsWith('6030'))
    return { opexCategory: 'Personnel', opexSubCategory: glGroup };

  if (acctParent === 'G&A, Industrial, Selling & Marketing Expenses')
    return { opexCategory: 'Industrial & SG&P', opexSubCategory: acctParent };

  return { opexCategory: 'Other OpEx', opexSubCategory: acctParent };
}

// ── Parse one CSV text ─────────────────────────────────────────
function parseOpExFile(filename, csvText) {
  if (!csvText || csvText.length < 10) {
    console.warn(`[OpEx] ${filename}: empty (${csvText?.length} chars)`);
    return [];
  }

  function parseCSV(text) {
    const result = [];
    const lines  = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    if (!lines.length) return result;

    const sample = lines[0] || '';
    const delim  = (sample.match(/\t/g) || []).length >= (sample.match(/,/g) || []).length
                   ? '\t' : ',';

    function parseLine(line) {
      if (delim === '\t') return line.split('\t').map(f => f.trim());
      const fields = [];
      let i = 0;
      while (i < line.length) {
        if (line[i] === '"') {
          let f = ''; i++;
          while (i < line.length) {
            if (line[i] === '"' && line[i+1] === '"') { f += '"'; i += 2; }
            else if (line[i] === '"') { i++; break; }
            else f += line[i++];
          }
          fields.push(f);
          if (line[i] === ',') i++;
        } else {
          let f = '';
          while (i < line.length && line[i] !== ',') f += line[i++];
          fields.push(f.trim());
          if (i < line.length) i++;
        }
      }
      return fields;
    }

    const headers = parseLine(lines[0]);
    console.log(`[OpEx] ${filename} — ${headers.length} cols | ${headers.slice(0,5).join(' | ')}`);

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = parseLine(lines[i]);
      const row  = {};
      headers.forEach((h, idx) => { row[h.trim()] = vals[idx] ?? ''; });
      result.push(row);
    }
    return result;
  }

  const rawRows = parseCSV(csvText);
  console.log(`[OpEx] ${filename} — ${rawRows.length} raw rows`);
  if (!rawRows.length) return [];

  const output = [];
  let skipped  = 0;

  for (const raw of rawRows) {

    // ── Posting Date → year + month ───────────────────────────
    const { year, month } = parsePostingDate(raw['Posting Date']);
    if (!month || month < 1 || month > 12 || !year) { skipped++; continue; }

    // ── Account ───────────────────────────────────────────────
    const accountRaw = String(raw['G/L Account'] || raw['Account'] || '').trim().replace(/\D/g, '');
    const account    = parseInt(accountRaw) || 0;
    if (!account) { skipped++; continue; }

    // ── Exclusion 1: Intercompany offsetting ──────────────────
    const offsetting = String(raw['Offsetting Account'] || '').trim();
    if (offsetting === OPEX_INTERCO_ACCOUNT) { skipped++; continue; }

    // ── Exclusion 2: Specific accounts ───────────────────────
    if (OPEX_EXCLUDED_ACCOUNTS.has(account)) { skipped++; continue; }

    // ── Cost center + document ────────────────────────────────
    const costCenter     = parseInt(String(raw['Cost Center'] || '').trim()) || 0;
    const documentNumber = parseInt(raw['Document Number'] || '') || 0;

    // ── CC enrichment ─────────────────────────────────────────
    const cc          = MASTER.cc[String(costCenter)] || {};
    const companyCode = cc.companyCode || '';

    // ── CC Segment (Adj) ──────────────────────────────────────
    // Override segment for specific account + CC + document combos
    const segmentName = cc.segmentName || raw['Segment'] || '';
    const ccSegAdj =
      (account === 60801020 &&
       costCenter === 1030101180 &&
       [3100011601, 9900001813].includes(documentNumber))
      ? 'Corporate'
      : segmentName;

    // ── Build Unique ID ───────────────────────────────────────
    const uidPrefix   = CC_COMPANY_TO_PREFIX[companyCode] || '10';
    const uniqueIdStr = uidPrefix + String(account) + String(year) + String(month).padStart(2, '0');
    const uniqueId    = parseInt(uniqueIdStr) || 0;

    // ── GL enrichment (time-variant) ──────────────────────────
    const gl = glLookup(uniqueIdStr, account);

    // ── Sign correction ───────────────────────────────────────
    // SAP signs are inverted: negate to make Revenue +ve, Expenses +ve costs
    const rawAmount    = deobfuscateAmount(raw['Amount in Local Currency']);
    const rawAmountDoc = deobfuscateAmount(raw['Amount in Doc. Curr.']);
    const amount       = -rawAmount;
    const amountDoc    = -rawAmountDoc;

    const row = {
      source:           'opex',
      year,
      month,
      postingDate:      raw['Posting Date']      || '',
      documentDate:     raw['Document Date']     || '',
      documentNumber,
      documentType:     raw['Document type']     || '',
      companyCode,
      companyName:      cc.companyName           || '',
      segment:          raw['Segment']           || cc.segment || '',
      ccSegAdj,                                             // ← always use this
      ccCode:           costCenter,
      ccName:           cc.ccName                || '',
      ccGroup:          cc.ccGroup               || '',
      department:       cc.department            || '',
      responsibility:   cc.responsibility        || '',
      mapping:          cc.mapping               || '',     // COGS / G&A / S&M
      account,
      accountName:      gl.accountName           || '',
      glAccountGroup:   gl.glAccountGroup        || '',
      accountParent:    gl.accountParent         || '',
      subCategory:      gl.subCategory           || '',
      groupNameV1:      gl.groupNameV1           || '',
      disclosureV1:     gl.disclosureV1          || '',
      accountType:      gl.accountType           || raw['Account type'] || '',
      bsOrPL:           gl.bsOrPL                || '',
      assignment:       raw['Assignment']        || '',
      text:             raw['Text']              || '',
      offsettingAccount: offsetting,
      vendor:           raw['Vendor']            || '',
      customer:         raw['Customer']          || '',
      salesDocument:    raw['Sales document']    || '',
      invoiceReference: raw['Invoice Reference'] || '',
      postingKey:       raw['Posting Key']       || '',
      clearingDate:     raw['Clearing Date']     || '',
      profitCenter:     raw['Profit Center']     || '',
      debitCreditInd:   raw['Debit/Credit ind']  || '',
      amount,       // sign-corrected
      amountDoc,    // sign-corrected
      documentCurrency: raw['Document Currency'] || raw['Local Currency'] || '',
      uniqueId,
      opexCategory:     '',
      opexSubCategory:  '',
    };

    const cls           = classifyOpEx(row);
    row.opexCategory    = cls.opexCategory;
    row.opexSubCategory = cls.opexSubCategory;

    output.push(row);
  }

  console.log(`[OpEx] ${filename} — kept:${output.length} skipped:${skipped}`);
  return output;
}

// ── Load all OpEx files ────────────────────────────────────────
async function loadAllOpEx(token, user, repo) {
  const allRows = [];

  setLoadingProgress(55, 'Listing OpEx files…', 'OpEx/');
  const items    = await listFolder(token, user, repo, 'OpEx');
  const csvFiles = items.filter(f => f.type === 'file' && f.name.endsWith('.csv'));

  for (let fi = 0; fi < csvFiles.length; fi++) {
    const file = csvFiles[fi];
    setLoadingProgress(55 + (fi / csvFiles.length) * 20, 'Loading OpEx…', file.name);
    try {
      const text = await fetchFileText(token, user, repo, `OpEx/${file.name}`, file.sha, file.download_url);
      const rows = parseOpExFile(file.name, text);
      allRows.push(...rows);
    } catch (err) {
      console.warn(`OpEx error [${file.name}]:`, err.message);
    }
  }

  console.log(`✓ OpEx loaded — ${allRows.length} rows`);
  return allRows;
}
