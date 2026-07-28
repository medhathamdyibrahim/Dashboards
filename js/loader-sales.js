'use strict';
/* ============================================================
   LOADER-SALES.JS — Sales CSV + Sales Master Data.xlsx loader
   ============================================================
   Folder structure on GitHub:
     Sales Data/
       modupay Cards/  → 2024.csv, 2025.csv …
       modupay DP/     → 2024.csv …
     Sales Master Data.xlsx
       • Customers DB  → Code, Country, Full Customer Name,
                         Short Customer Name, Bank/FinTech,
                         Region, Jurisdiction, Main Region, Account Manager
       • Products DB   → Adj. Product Type, Product order, Categorization

   Each CSV row: Date | Invo no: | Code | Product Type | Volume | Value | FX rate
   Volume + Value are obfuscated → deobfuscateAmount()

   Customer code 1001090 is loaded and only excluded by dashboard filters
   when Entity = All Entities.
   Main Category: Categorization "Cards" or "Perso" → "Issuance", else → categorization
   ============================================================ */

const SALES_EXCL_CODE    = 1001090;
const SALES_ENTITY_DIRS  = ['modupay Cards', 'modupay DP'];

// In-memory master lookups (populated by loadSalesMasterData)
const SALES_MASTER = {
  customers: {},   // keyed by SAP code (number)
  products:  {},   // keyed by Adj. Product Type (string)
};

// ── Load Sales Master Data.xlsx ───────────────────────────────
async function loadSalesMasterData(token, user, repo) {
  const bytes = await fetchFileBytes(token, user, repo, 'Sales Master Data.xlsx');
  const wb    = XLSX.read(bytes, { type: 'array', raw: false });

  // Customers DB
  const custSheet = wb.Sheets['Customers DB'];
  if (custSheet) {
    const rows = XLSX.utils.sheet_to_json(custSheet, { defval: '' });
    for (const r of rows) {
      const code = parseInt(r['Code']) || 0;
      if (!code) continue;
      SALES_MASTER.customers[code] = {
        country:           String(r['Country']            || '').trim(),
        fullName:          String(r['Full Customer Name'] || '').trim(),
        shortName:         String(r['Short Customer Name']|| '').trim(),
        bankFintech:       String(r['Bank/FinTech']       || '').trim(),
        region:            String(r['Region']             || '').trim(),
        jurisdiction:      String(r['Jurisdiction']       || '').trim(),
        mainRegion:        String(r['Main Region']        || '').trim(),
        accountManager:    String(r['Account Manager']    || '').trim(),
      };
    }
    console.log(`✓ Customers DB — ${Object.keys(SALES_MASTER.customers).length} customers`);
  }

  // Products DB
  const prodSheet = wb.Sheets['Products DB'];
  if (prodSheet) {
    const rows = XLSX.utils.sheet_to_json(prodSheet, { defval: '' });
    for (const r of rows) {
      const type = String(r['Adj. Product Type'] || '').trim();
      if (!type) continue;
      const cat = String(r['Categorization'] || '').trim();
      SALES_MASTER.products[type.toLowerCase()] = {
        productType:    type,
        order:          parseInt(r['Product order']) || 99,
        categorization: cat,
        // Main category: Cards or Perso → Issuance, else use categorization
        mainCategory:   (cat === 'Cards' || cat === 'Perso') ? 'Issuance' : cat,
      };
    }
    console.log(`✓ Products DB — ${Object.keys(SALES_MASTER.products).length} product types`);
  }
}

// ── Parse one Sales CSV ───────────────────────────────────────
// year parameter kept for signature compatibility but IGNORED — year always comes from Date column
function parseSalesCSV(csvText, entityFolder, _filenameYear) {
  if (!csvText || csvText.length < 10) return [];

  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length < 2) return [];

  const sample = lines[0] || '';
  const delim  = (sample.match(/\t/g) || []).length >= (sample.match(/,/g) || []).length ? '\t' : ',';

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
  const output  = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseLine(lines[i]);
    const raw  = {};
    headers.forEach((h, idx) => { raw[h.trim()] = vals[idx] ?? ''; });

    // Customer code
    const code = parseInt(String(raw['Code'] || '').trim()) || 0;
    if (!code) continue;

    // Date → year + month (always from the Date column, never from filename)
    const dateRaw = String(raw['Date'] || '').trim();
    let rowYear = 0, month = 0;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      // ISO: 2024-01-15
      const parts = dateRaw.split('-');
      rowYear = parseInt(parts[0]);
      month   = parseInt(parts[1]);
    } else if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(dateRaw)) {
      // D/M/YYYY or D.M.YYYY
      const parts = dateRaw.split(/[\/\.]/);
      month   = parseInt(parts[1]);
      rowYear = parseInt(parts[2]);
    } else {
      // SAP serial number (e.g. 44592 → 2022-02-01)
      const n = parseInt(dateRaw);
      if (!isNaN(n) && n > 30000) {
        const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
        rowYear = d.getUTCFullYear();
        month   = d.getUTCMonth() + 1;
      }
    }

    if (!rowYear || !month) continue;

    // Product type
    const productType = String(raw['Product Type'] || '').trim();
    const prodMeta    = SALES_MASTER.products[productType.toLowerCase()] || {};

    // Customer metadata
    const custMeta = SALES_MASTER.customers[code] || {};

    // Amounts (obfuscated)
    const value  = deobfuscateAmount(raw['Value']);
    const volume = deobfuscateAmount(raw['Volume']);
    const fxRaw  = String(raw['FX rate'] || '').replace(/,/g, '').trim();
    const fxRate = fxRaw === '' ? null : parseFloat(fxRaw);

    output.push({
      entityFolder,
      year:  rowYear,
      month,
      date:           dateRaw,
      dateIndex:      parseSalesDateIndex(dateRaw, rowYear, month),
      invoiceNo:      String(raw['Invo no:'] || raw['Invoice No'] || '').trim(),
      code,
      productType,
      productOrder:   prodMeta.order          || 99,
      categorization: prodMeta.categorization || productType,
      mainCategory:   prodMeta.mainCategory   || productType,
      volume,
      value,
      fxRate,
      // Customer enrichment
      shortName:      custMeta.shortName      || String(code),
      fullName:       custMeta.fullName       || String(code),
      country:        custMeta.country        || '',
      region:         custMeta.region         || '',
      mainRegion:     custMeta.mainRegion     || '',
      jurisdiction:   custMeta.jurisdiction   || '',
      accountManager: custMeta.accountManager || '',
      bankFintech:    custMeta.bankFintech    || '',
    });
  }

  return output;
}

function parseSalesDateIndex(dateRaw, year, month) {
  const s = String(dateRaw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(n => parseInt(n));
    return Date.UTC(y, m - 1, d) / 86400000;
  }
  if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(s)) {
    const [d, m, y] = s.split(/[\/\.]/).map(n => parseInt(n));
    return Date.UTC(y, m - 1, d) / 86400000;
  }
  const n = parseInt(s);
  if (!isNaN(n) && n > 30000) return n;
  return Date.UTC(year, month - 1, 1) / 86400000;
}

function repairMissingSalesFXRates(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.entityFolder}|${r.year}|${String(r.month).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  let repaired = 0;
  for (const groupRows of groups.values()) {
    // Valid = has a real FX rate (not missing, not zero, not the default fallback of 1)
    const valid = groupRows.filter(r => Number.isFinite(r.fxRate) && r.fxRate > 1);

    // Use the MAX FX rate of the same month/year as the replacement.
    const maxRate = valid.length > 0 ? Math.max(...valid.map(r => r.fxRate)) : null;

    for (const r of groupRows) {
      if (Number.isFinite(r.fxRate) && r.fxRate > 1) continue;  // skip if already has real rate
      r.fxRate = maxRate || 1;
      r.fxRateEstimated = maxRate != null;
      repaired++;
    }
  }
  if (repaired) console.log(`[Sales] repaired ${repaired} missing/zero FX rates using max rate of same month`);
  return rows;
}

// ── Load all Sales files ───────────────────────────────────────
async function loadAllSales(token, user, repo) {
  const allRows = [];

  // Load master data first
  setLoadingProgress(85, 'Loading Sales Master Data…');
  try {
    await loadSalesMasterData(token, user, repo);
  } catch (err) {
    console.warn('[Sales] Could not load Sales Master Data.xlsx:', err.message);
  }

  // Load CSVs per entity folder
  for (const entityDir of SALES_ENTITY_DIRS) {
    setLoadingProgress(87, `Listing Sales files…`, `Sales Data/${entityDir}/`);
    const items = await listFolder(token, user, repo, `Sales Data/${entityDir}`);
    const csvs  = items.filter(f => f.type === 'file' && f.name.endsWith('.csv'));

    for (const file of csvs) {
      // year is no longer extracted from filename — each row gets its year from the Date column
      setLoadingProgress(88, `Loading Sales…`, `${entityDir}/${file.name}`);
      try {
        const text = await fetchFileText(token, user, repo,
          `Sales Data/${entityDir}/${file.name}`, file.sha, file.download_url);
        const rows = parseSalesCSV(text, entityDir, 0);
        allRows.push(...rows);
        console.log(`[Sales] ${entityDir}/${file.name} → ${rows.length} rows`);
      } catch (err) {
        console.warn(`[Sales] Error ${entityDir}/${file.name}:`, err.message);
      }
    }
  }

  repairMissingSalesFXRates(allRows);
  console.log(`✓ Sales loaded — ${allRows.length} rows`);
  return allRows;
}
