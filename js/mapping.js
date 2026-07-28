'use strict';
/* ============================================================
   MAPPING.JS — Master Mapping.xlsx loader → MASTER lookups
   ============================================================
   GL Mapping sheet new structure:
   Date | Company Code | Account | Key | GL Account Group |
   Unique ID | Account Name | Account Parent | Sub Category |
   Account group name (v1) | Disclosure (v1) | Account type | BS / P&L

   MASTER.gl          → keyed by Unique ID (string)  — time-variant, exact match
   MASTER.glByAccount → keyed by Account (string)    — fallback, last row wins
   ============================================================ */

async function loadMasterMapping(token, user, repo) {
  setLoadingProgress(5, 'Loading Master Mapping…', 'Master Mapping.xlsx');

  const bytes = await fetchFileBytes(token, user, repo, 'Master Mapping.xlsx');
  const wb    = XLSX.read(bytes, { type: 'array' });

  // ── Sheet 1: GL Mapping ──────────────────────────────────────
  const glSheet = wb.Sheets['GL Mapping'];
  if (!glSheet) throw new Error('Sheet "GL Mapping" not found in Master Mapping.xlsx');

  // dateNF ensures Date column is parsed as a string, not a serial number
  const glRows = XLSX.utils.sheet_to_json(glSheet, { defval: '', raw: false });

  MASTER.gl          = {};   // keyed by Unique ID  (primary)
  MASTER.glByAccount = {};   // keyed by Account    (fallback)

  for (const row of glRows) {
    const acct     = String(row['Account']   || '').trim();
    const uid      = String(row['Unique ID'] || '').trim();
    if (!acct) continue;

    const entry = {
      accountName:     String(row['Account Name']              || '').trim(),
      glAccountGroup:  String(row['GL Account Group']          || '').trim(),
      accountParent:   String(row['Account Parent']            || '').trim(),
      subCategory:     String(row['Sub Category']              || '').trim(),
      groupNameV1:     String(row['Account group name (v1)']   || '').trim(),
      disclosureV1:    String(row['Disclosure (v1)']           || '').trim(),
      accountType:     String(row['Account type']              || '').trim(),
      bsOrPL:          String(row['BS / P&L']                  || '').trim().toUpperCase(),
      // extra columns now available in new structure
      glKey:           String(row['Key']          || '').trim(),   // first digit of account
      companyCode:     String(row['Company Code'] || '').trim(),
      date:            String(row['Date']         || '').trim(),
    };

    // Primary: by Unique ID (handles time-variant mapping)
    if (uid) {
      MASTER.gl[uid] = entry;
    }

    // Fallback: by Account — last row with this account wins
    // (most recent date will naturally overwrite older ones if rows are date-sorted)
    MASTER.glByAccount[acct] = entry;
  }

  console.log(
    `✓ MASTER.gl loaded — ${Object.keys(MASTER.gl).length} unique-ID entries, ` +
    `${Object.keys(MASTER.glByAccount).length} accounts`
  );

  // ── Sheet 2: CC Mapping ──────────────────────────────────────
  const ccSheet = wb.Sheets['CC Mapping'];
  if (ccSheet) {
    const ccRows = XLSX.utils.sheet_to_json(ccSheet, { defval: '' });
    MASTER.cc = {};
    for (const row of ccRows) {
      const code = String(row['Cost Center Code'] || '').trim();
      if (!code) continue;
      MASTER.cc[code] = {
        ccName:           String(row['Cost Center Name']           || '').trim(),
        ccGroup:          String(row['Cost Center Group']          || '').trim(),
        department:       String(row['Department Name']            || '').trim(),
        responsibility:   String(row['Cost Center Responsibility'] || '').trim(),
        companyCode:      String(row['Company Code']               || '').trim(),
        companyName:      String(row['Company Name']               || '').trim(),
        segment:          String(row['Segment']                    || '').trim(),
        segmentName:      String(row['Segment name']               || '').trim(),
        mapping:          String(row['Mapping']                    || '').trim(),
      };
    }
  }

  // ── Sheet 3: Product Mapping ─────────────────────────────────
  const prodSheet = wb.Sheets['Product Mapping'];
  if (prodSheet) {
    const prodRows = XLSX.utils.sheet_to_json(prodSheet, { defval: '' });
    MASTER.product = {};
    for (const row of prodRows) {
      const code = String(row['Product Code'] || '').trim();
      if (!code) continue;
      MASTER.product[code] = {
        productName:    String(row['Product Name']    || '').trim(),
        productGroup:   String(row['Product Group']   || '').trim(),
        productType:    String(row['Product Type']    || '').trim(),
        revenueStream:  String(row['Revenue Stream']  || '').trim(),
      };
    }
  }

  // ── Sheet 4: Entity Mapping ──────────────────────────────────
  const entSheet = wb.Sheets['Entity Mapping'];
  if (entSheet) {
    const entRows = XLSX.utils.sheet_to_json(entSheet, { defval: '' });
    MASTER.entity = {};
    for (const row of entRows) {
      const code = String(row['Company Code'] || '').trim();
      if (!code) continue;
      MASTER.entity[code] = {
        companyName:     String(row['Company Name']  || '').trim(),
        segment:         String(row['Segment']       || '').trim(),
        segmentName:     String(row['Segment Name']  || '').trim(),
        currency:        String(row['Currency']      || '').trim(),
      };
    }
  }

  MASTER.loaded = true;
  console.log(`✓ MASTER loaded — GL: ${Object.keys(MASTER.gl).length}, CC: ${Object.keys(MASTER.cc).length}, Entities: ${Object.keys(MASTER.entity).length}`);
}

// ── GL lookup helper (used by loaders) ───────────────────────
// Tries exact Unique ID match first, falls back to account-only.
// uniqueId should be the full numeric ID as a string.
function glLookup(uniqueId, account) {
  return MASTER.gl[String(uniqueId)]
      || MASTER.glByAccount[String(account)]
      || {};
}

// ── Load adj entries for a single entity ──────────────────────
async function loadAdjEntries(token, user, repo, entityFolder) {
  const filename = ADJ_FILES[entityFolder];
  if (!filename) return;

  try {
    setLoadingProgress(null, `Loading adj entries…`, filename);
    const bytes = await fetchFileBytes(token, user, repo, filename);
    const wb    = XLSX.read(bytes, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    ADJ[entityFolder] = {};
    for (const row of rows) {
      const uid = parseInt(row['Unique ID']);
      if (!uid || isNaN(uid)) continue;
      ADJ[entityFolder][uid] = {
        'Adjustment/Reclass Debit':  parseFloat(row['Adjustment/Reclass Debit'])  || 0,
        'Adjustment/Reclass Credit': parseFloat(row['Adjustment/Reclass Credit']) || 0,
      };
    }
    console.log(`✓ ADJ[${entityFolder}] loaded — ${Object.keys(ADJ[entityFolder]).length} entries`);
  } catch (err) {
    console.warn(`Could not load adj entries for ${entityFolder}:`, err.message);
    ADJ[entityFolder] = {};
  }
}
