'use strict';
/* ============================================================
   LOADER-AGING.JS — AR Aging CSV loader
   ============================================================
   Folder structure on GitHub:
     Aging/
       Masria Aging/  → Apr-26.csv, Mar-26.csv, …   entity: 'mc'
       mdp Aging/     → Apr-26.csv, Mar-26.csv, …   entity: 'dp'

   Each CSV row:
     SAP Code | Invoice No. | Invoice Date | Invoice Balance |
     Credit Term | Aging Report Date | Days

   Invoice Balance is XOR+Base64 obfuscated → deobfuscateAmount()
   Invoice Date & Aging Report Date are Excel serial numbers.

   Customer enrichment uses SALES_MASTER.customers (loaded by
   loader-sales.js which runs before this loader at startup).

   Bucket modes
   ────────────
   Standard (bucketStd):
     Not Due | 01-30 | 31-60 | 61-90 | 91-120 | 121-150 | 151-180 | >180

   Granular (bucketGran):
     Not Due | 01-30 | 31-60 | 61-90 | 91-120 | 121-150 | 151-180 |
     181-210 | 211-240 | 241-270 | 271-300 | 301-330 | 331-360 | >360
   ============================================================ */

// ── Entity folder mapping ──────────────────────────────────────
const AGING_ENTITY_DIRS = {
  'Masria Aging': 'mc',
  'mdp Aging':    'dp',
};

// ── Standard bucket definitions ────────────────────────────────
const AGING_BUCKETS_STD = [
  { key: 'Not Due',  label: 'Not Due',  min: 0,   max: 0   },
  { key: '01-30',    label: '01-30',    min: 1,   max: 30  },
  { key: '31-60',    label: '31-60',    min: 31,  max: 60  },
  { key: '61-90',    label: '61-90',    min: 61,  max: 90  },
  { key: '91-120',   label: '91-120',   min: 91,  max: 120 },
  { key: '121-150',  label: '121-150',  min: 121, max: 150 },
  { key: '151-180',  label: '151-180',  min: 151, max: 180 },
  { key: '>180',     label: '>180',     min: 181, max: Infinity },
];

// ── Granular bucket definitions ────────────────────────────────
const AGING_BUCKETS_GRAN = [
  { key: 'Not Due',  label: 'Not Due',  min: 0,   max: 0   },
  { key: '01-30',    label: '01-30',    min: 1,   max: 30  },
  { key: '31-60',    label: '31-60',    min: 31,  max: 60  },
  { key: '61-90',    label: '61-90',    min: 61,  max: 90  },
  { key: '91-120',   label: '91-120',   min: 91,  max: 120 },
  { key: '121-150',  label: '121-150',  min: 121, max: 150 },
  { key: '151-180',  label: '151-180',  min: 151, max: 180 },
  { key: '181-210',  label: '181-210',  min: 181, max: 210 },
  { key: '211-240',  label: '211-240',  min: 211, max: 240 },
  { key: '241-270',  label: '241-270',  min: 241, max: 270 },
  { key: '271-300',  label: '271-300',  min: 271, max: 300 },
  { key: '301-330',  label: '301-330',  min: 301, max: 330 },
  { key: '331-360',  label: '331-360',  min: 331, max: 360 },
  { key: '>360',     label: '>360',     min: 361, max: Infinity },
];

// ── Exported bucket lists for use in dashboard ─────────────────
// (referenced by aging-dashboard.js)
const AGING_STD_KEYS  = AGING_BUCKETS_STD.map(b => b.key);
const AGING_GRAN_KEYS = AGING_BUCKETS_GRAN.map(b => b.key);

// ── Assign both bucket keys for a given days value ─────────────
function assignAgingBuckets(days) {
  const d = parseInt(days) || 0;

  let bucketStd = '>180';
  for (const b of AGING_BUCKETS_STD) {
    if (d >= b.min && d <= b.max) { bucketStd = b.key; break; }
  }

  let bucketGran = '>360';
  for (const b of AGING_BUCKETS_GRAN) {
    if (d >= b.min && d <= b.max) { bucketGran = b.key; break; }
  }

  return { bucketStd, bucketGran };
}

// ── Convert Excel serial → Date object ────────────────────────
function agingSerialToDate(serial) {
  const n = parseInt(serial);
  if (isNaN(n) || n < 1) return null;
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
}

// ── Format Date → "Apr-26" label ──────────────────────────────
function formatAgingMonthLabel(date) {
  if (!date) return '';
  const mon = ['Jan','Feb','Mar','Apr','May','Jun',
               'Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = date.getUTCMonth();
  const y = String(date.getUTCFullYear()).slice(-2);
  return `${mon[m]}-${y}`;
}

// ── Parse one CSV text (tab or comma delimited) ────────────────
function parseAgingCSV(csvText, entity, filename) {
  if (!csvText || csvText.length < 10) {
    console.warn(`[Aging] ${filename}: empty`);
    return [];
  }

  // ── detect delimiter ─────────────────────────────────────────
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length < 2) return [];

  const sample = lines[0] || '';
  const delim  = (sample.match(/\t/g) || []).length >=
                 (sample.match(/,/g)  || []).length ? '\t' : ',';

  function parseLine(line) {
    if (delim === '\t') return line.split('\t').map(f => f.trim());
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let f = ''; i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { f += '"'; i += 2; }
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
  console.log(`[Aging] ${filename} — cols: ${headers.join(' | ')}`);

  const output = [];
  let skipped  = 0;

  // ── collect all reportLabels to pick dominant one ────────────
  // (handles edge case where file contains mixed dates)
  const labelCount = {};

  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseLine(lines[i]);
    const raw  = {};
    headers.forEach((h, idx) => { raw[h.trim()] = vals[idx] ?? ''; });
    rawRows.push(raw);
  }

  // ── pass 1: count reportLabels ───────────────────────────────
  for (const raw of rawRows) {
    const agingDateSerial = String(raw['Aging Report Date'] || '').trim();
    const agingDate       = agingSerialToDate(agingDateSerial);
    const label           = formatAgingMonthLabel(agingDate);
    if (label) labelCount[label] = (labelCount[label] || 0) + 1;
  }

  // dominant label = the one that appears most
  const dominantLabel = Object.keys(labelCount).sort(
    (a, b) => labelCount[b] - labelCount[a]
  )[0] || '';

  // ── pass 2: build output rows ─────────────────────────────────
  for (const raw of rawRows) {
    // SAP Code
    const sapCode = parseInt(String(raw['SAP Code'] || '').trim()) || 0;
    if (!sapCode) { skipped++; continue; }

    // Invoice No — kept as a string, NOT parseInt'd. MC invoice numbers are
    // purely numeric, but DP invoice numbers are strings like "INV-12345" —
    // parseInt("INV-12345") returns NaN (→ 0 → shows as "—"), silently
    // dropping every DP invoice number. Keep the raw trimmed string instead.
    const invoiceNo = String(raw['Invoice No.'] || '').trim();

    // Invoice Date
    const invoiceDateSerial = String(raw['Invoice Date'] || '').trim();
    const invoiceDate       = agingSerialToDate(invoiceDateSerial);

    // Invoice Balance (obfuscated USD)
    const balance = deobfuscateAmount(raw['Invoice Balance']);

    // Credit Term
    const creditTerm = parseInt(String(raw['Credit Term'] || '').trim()) || 0;

    // Aging Report Date
    const agingDateSerial = String(raw['Aging Report Date'] || '').trim();
    const agingDate       = agingSerialToDate(agingDateSerial);
    const reportLabel     = formatAgingMonthLabel(agingDate) || dominantLabel;

    // Days
    const days = parseInt(String(raw['Days'] || '').trim()) || 0;

    // Buckets
    const { bucketStd, bucketGran } = assignAgingBuckets(days);

    // Customer enrichment from SALES_MASTER
    const custMeta    = (typeof SALES_MASTER !== 'undefined' && SALES_MASTER.customers)
                        ? (SALES_MASTER.customers[sapCode] || {})
                        : {};
    const customerName = custMeta.shortName || custMeta.fullName || String(sapCode);
    const mainRegion   = custMeta.mainRegion || 'Unknown';
    const country      = custMeta.country    || '';
    const bankFintech  = custMeta.bankFintech || '';

    output.push({
      entity,            // 'mc' | 'dp'
      reportLabel,       // 'Apr-26'
      sapCode,
      invoiceNo,
      invoiceDate,       // Date object | null
      balance,           // USD, deobfuscated
      creditTerm,
      agingDate,         // Date object | null
      days,
      bucketStd,
      bucketGran,
      customerName,
      mainRegion,
      country,
      bankFintech,
    });
  }

  console.log(`[Aging] ${filename} — kept:${output.length} skipped:${skipped} label:"${dominantLabel}"`);
  return output;
}

// ── Load all Aging files from both entity folders ──────────────
async function loadAllAging(token, user, repo) {
  const allRows = [];
  const folders = Object.keys(AGING_ENTITY_DIRS);

  for (let fi = 0; fi < folders.length; fi++) {
    const folderName = folders[fi];
    const entity     = AGING_ENTITY_DIRS[folderName];
    const folderPath = `Aging Data/${folderName}`;

    setLoadingProgress(
      91 + (fi / folders.length) * 2,
      'Loading Aging data…',
      folderPath
    );

    let items = [];
    try {
      items = await listFolder(token, user, repo, folderPath);
    } catch (err) {
      console.warn(`[Aging] listFolder failed for "${folderPath}":`, err.message);
      continue;
    }

    const csvFiles = items.filter(
      f => f.type === 'file' && /\.csv$/i.test(f.name)
    );

    if (csvFiles.length === 0) {
      console.warn(`[Aging] No CSV files found in ${folderPath}`);
      continue;
    }

    for (let ci = 0; ci < csvFiles.length; ci++) {
      const file = csvFiles[ci];
      setLoadingProgress(
        91 + ((fi + ci / csvFiles.length) / folders.length) * 2,
        'Loading Aging…',
        `${folderName} / ${file.name}`
      );
      try {
        const text = await fetchFileText(
          token, user, repo,
          `${folderPath}/${file.name}`,
          file.sha
        );
        const rows = parseAgingCSV(text, entity, file.name);
        allRows.push(...rows);
      } catch (err) {
        console.warn(`[Aging] parse error [${file.name}]:`, err.message);
      }
    }
  }

  // ── Sort by reportLabel chronologically then entity ───────────
  allRows.sort((a, b) => {
    if (a.reportLabel < b.reportLabel) return -1;
    if (a.reportLabel > b.reportLabel) return  1;
    return a.entity < b.entity ? -1 : 1;
  });

  console.log(`✓ Aging loaded — ${allRows.length} rows across ${
    [...new Set(allRows.map(r => r.reportLabel))].length
  } months`);

  return allRows;
}

// ── Helper: get sorted unique report months from agingRows ─────
function getAgingMonths() {
  if (!STATE.agingRows || !STATE.agingRows.length) return [];
  const labels = [...new Set(STATE.agingRows.map(r => r.reportLabel))];

  // Sort chronologically using the Date object reconstruction
  labels.sort((a, b) => {
    return agingLabelToSortKey(a) - agingLabelToSortKey(b);
  });
  return labels;
}

// ── Helper: convert "Apr-26" to a numeric sort key ─────────────
function agingLabelToSortKey(label) {
  if (!label) return 0;
  const mon = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,
                Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const parts = label.split('-');
  if (parts.length !== 2) return 0;
  const m = mon[parts[0]] || 0;
  const y = parseInt('20' + parts[1]) || 0;
  return y * 100 + m;
}

// ── Helper: get distinct regions from agingRows ────────────────
function getAgingRegions() {
  if (!STATE.agingRows || !STATE.agingRows.length) return [];
  const regions = [...new Set(STATE.agingRows.map(r => r.mainRegion).filter(Boolean))];
  return regions.sort();
}
