'use strict';
/* ============================================================
   LOADER-TB.JS — TB CSV/TXT parser
   Handles SAP exports with heavy whitespace in column names
   ============================================================ */

// ── Split one CSV/TSV line ────────────────────────────────────
function splitTBLine(line, delim) {
  if (delim === '\t') return line.split('\t');
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break; }
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
      fields.push(f);
      if (i < line.length) i++;
    }
  }
  return fields;
}

// ── Normalize a header string for matching ────────────────────
// Removes all extra whitespace, lowercases, removes punctuation
function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ── Find column index by partial match on normalized header ───
function findColIdx(headers, ...searches) {
  const normalized = headers.map(normalizeHeader);
  for (const search of searches) {
    const s = search.toLowerCase().replace(/\s+/g, ' ').trim();
    // exact match first
    let idx = normalized.indexOf(s);
    if (idx !== -1) return idx;
    // partial match
    idx = normalized.findIndex(h => h.includes(s));
    if (idx !== -1) return idx;
    // regex match
    if (search instanceof RegExp) {
      idx = normalized.findIndex(h => search.test(h));
      if (idx !== -1) return idx;
    }
  }
  return -1;
}

// ── Build Unique ID for a TB row ─────────────────────────────
function buildTBUniqueId(entityFolder, account, year, month) {
  const prefix = ENTITY_UID_PREFIX[entityFolder] || '10';
  return prefix + String(account) + String(year) + String(month).padStart(2, '0');
}

// ── Parse one TB file ─────────────────────────────────────────
function parseTBFile(entityFolder, filename, text) {

  // Step 1 — month/year from filename
  const stripped = filename.replace(/\.(txt|csv)$/i, '');
  const parts    = stripped.split('-');
  if (parts.length < 2) return [];
  const month = parseInt(parts[0]);
  const year  = parseInt(parts[1]);
  if (!month || !year || month < 1 || month > 12) return [];

  // Step 2 — entity enrichment
  const ent            = MASTER.entity[entityFolder] || {};
  const companyName    = ent.companyName  || entityFolder;
  const entitySegment  = ent.segmentName  || ent.segment || '';
  const entityCurrency = ent.currency     || '';

  // Step 3 — clean and split into lines
  const content = text.replace(/^\uFEFF/, '');
  const lines   = content.split(/\r?\n/);

  // Step 4 — detect delimiter (tab vs comma)
  // Look at first non-empty line
  const sampleLine = lines.find(l => l.trim().length > 10) || '';
  const tabs   = (sampleLine.match(/\t/g)   || []).length;
  const commas = (sampleLine.match(/,/g)    || []).length;
  const DELIM  = tabs >= commas ? '\t' : ',';

  // Step 5 — find header row
  // Look for a line that contains both a G/L account pattern AND balance columns
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const upper = lines[i].toUpperCase();
    if (
      (upper.includes('G/L') || upper.includes('GL ACCT') || upper.includes('G.L')) &&
      (upper.includes('BALANCE') || upper.includes('DEBIT') || upper.includes('CREDIT'))
    ) {
      headerIdx = i;
      break;
    }
  }
  // fallback — any line with 'Accumulated Balance'
  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      if (lines[i].toUpperCase().includes('ACCUMULATED BALANCE')) {
        headerIdx = i;
        break;
      }
    }
  }
  if (headerIdx === -1) {
    console.warn(`[TB] No header found in ${filename}`);
    return [];
  }

  // Step 6 — parse headers (keep raw for split, normalize for matching)
  const rawHeaders = splitTBLine(lines[headerIdx], DELIM);

  // Debug: log the headers we found
  console.log(`[TB] ${filename} — delimiter: "${DELIM === '\t' ? 'TAB' : 'COMMA'}", headers:`,
    rawHeaders.map(h => `"${normalizeHeader(h)}"`).join(' | '));

  // Step 7 — find column indices
  const iAccount = findColIdx(rawHeaders, 'g/l acct', 'gl acct', 'g.l acct', 'account');
  const iCarry   = findColIdx(rawHeaders, 'balance carryforward', 'carryforward');
  const iPrior   = findColIdx(rawHeaders, 'balance of prior periods', 'prior periods');
  const iDebit   = findColIdx(rawHeaders, 'debit blnce of reportng period', 'debit bl', 'debit balance');
  const iCredit  = findColIdx(rawHeaders, 'credit balance reporting per', 'credit bal');
  const iAccBal  = findColIdx(rawHeaders, 'accumulated balance', 'accum balance');

  console.log(`[TB] ${filename} — cols: account=${iAccount} carry=${iCarry} prior=${iPrior} debit=${iDebit} credit=${iCredit} accum=${iAccBal}`);

  if (iAccount === -1) {
    console.warn(`[TB] Cannot find account column in ${filename}`);
    return [];
  }

  const date = new Date(year, month, 0);
  const rows = [];

  // Step 8 — parse data rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    const cols = splitTBLine(line, DELIM);

    // Account number — take only digits
    const accountRaw = String(cols[iAccount] || '').trim();
    const account    = parseInt(accountRaw.replace(/\D/g, ''));
    if (!account || isNaN(account) || account < 1000) continue;

    // Raw value getter
    const getRaw = (idx) => idx === -1 || cols[idx] == null ? '' : String(cols[idx]).trim();

    // Deobfuscate all 5 amount columns
    const balanceCarryforward   = deobfuscateAmount(getRaw(iCarry));
    const balanceOfPriorPeriods = deobfuscateAmount(getRaw(iPrior));
    const debit                 = deobfuscateAmount(getRaw(iDebit));
    const credit                = deobfuscateAmount(getRaw(iCredit));
    const accumulatedBalance    = deobfuscateAmount(getRaw(iAccBal));

    // Skip rows with no amounts at all
    if (
      accumulatedBalance === 0 &&
      debit === 0 &&
      credit === 0 &&
      balanceCarryforward === 0 &&
      balanceOfPriorPeriods === 0
    ) continue;

    // ── Unique ID: entity-aware prefix ───────────────────────
    const uniqueIdStr = buildTBUniqueId(entityFolder, account, year, month);
    const uniqueId    = parseInt(uniqueIdStr);

    // ── GL enrichment: time-variant lookup first ─────────────
    // glLookup() is defined in mapping.js
    const gl   = glLookup(uniqueIdStr, account);
    const note = ACCOUNTS_TO_ADJUST.has(account) ? 'Should be adjusted' : '';

    // Adj entries
    const adj        = (ADJ[entityFolder] || {})[uniqueId] || {};
    const adjDebit   = adj['Adjustment/Reclass Debit']  ?? 0;
    const adjCredit  = adj['Adjustment/Reclass Credit'] ?? 0;

    const adjustedBalance = accumulatedBalance + adjDebit - adjCredit;
    const adjustedDebit   = debit  + adjDebit;
    const adjustedCredit  = credit + adjCredit;

    rows.push({
      source:               'tb',
      date,
      month,
      year,
      uniqueId,
      entityFolder,
      companyCode:          entityFolder,
      companyName,
      entitySegment,
      entityCurrency,
      account,
      accountName:          gl.accountName    || '',
      glAccountGroup:       gl.glAccountGroup || '',
      accountParent:        gl.accountParent  || '',
      subCategory:          gl.subCategory    || '',
      groupNameV1:          gl.groupNameV1    || '',
      disclosureV1:         gl.disclosureV1   || '',
      accountType:          gl.accountType    || '',
      bsOrPL:               gl.bsOrPL         || '',
      balanceCarryforward,
      balanceOfPriorPeriods,
      debit,
      credit,
      accumulatedBalance,
      note,
      adjReclassDebit:      adjDebit,
      adjReclassCredit:     adjCredit,
      adjustedBalance,
      adjustedDebit,
      adjustedCredit,
      debitOfMonth:         0,
      creditOfMonth:        0,
      balanceOfMonth:       0,
    });
  }

  return rows;
}

// ── SECOND PASS: monthly movement ────────────────────────────
function computeMonthlyMovements(tbRowsRaw) {
  const index = new Map();
  for (const row of tbRowsRaw) {
    index.set(`${row.entityFolder}|${row.account}|${row.year}|${row.month}`, row);
  }
  for (const row of tbRowsRaw) {
    const { entityFolder, account, year, month, bsOrPL } = row;

    // Income Statement (P&L) accounts reset to zero at the start of each
    // fiscal year in SAP, so January's own cumulative-to-date figure IS
    // already the standalone monthly movement — there is nothing to
    // subtract. December of the PRIOR year holds that entire prior
    // year's P&L total, not a comparable "previous period" balance, so
    // subtracting it (as the generic month-1 → month-12/prior-year
    // lookup below would do) corrupts every January standalone figure.
    // Balance Sheet accounts genuinely carry their balance across the
    // year boundary, so they still need the cross-year lookup.
    if (bsOrPL === 'IS' && month === 1) {
      row.debitOfMonth   = row.adjustedDebit;
      row.creditOfMonth  = row.adjustedCredit;
      row.balanceOfMonth = row.debitOfMonth - row.creditOfMonth;
      continue;
    }

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const prev      = index.get(`${entityFolder}|${account}|${prevYear}|${prevMonth}`);
    row.debitOfMonth   = row.adjustedDebit  - (prev?.adjustedDebit  ?? 0);
    row.creditOfMonth  = row.adjustedCredit - (prev?.adjustedCredit ?? 0);
    row.balanceOfMonth = row.debitOfMonth   - row.creditOfMonth;
  }
  return tbRowsRaw;
}

// ── Load all TB files ─────────────────────────────────────────
async function loadAllTB(token, user, repo) {
  const allRows = [];

  for (let ei = 0; ei < ENTITY_FOLDERS.length; ei++) {
    const entityFolder = ENTITY_FOLDERS[ei];
    const pctBase = 15 + (ei / ENTITY_FOLDERS.length) * 35;
    setLoadingProgress(pctBase, `Listing TB files…`, `Trial Balance/${entityFolder}/`);

    const items   = await listFolder(token, user, repo, `Trial Balance/${entityFolder}`);
    const tbFiles = items.filter(f => f.type === 'file' && /\.(txt|csv)$/i.test(f.name));

    if (tbFiles.length === 0) {
      console.warn(`[TB] No .txt/.csv files found in Trial Balance/${entityFolder}/`);
    }

    for (let fi = 0; fi < tbFiles.length; fi++) {
      const file = tbFiles[fi];
      const pct  = pctBase + (fi / Math.max(tbFiles.length, 1)) * (35 / ENTITY_FOLDERS.length);
      setLoadingProgress(pct, `Loading TB…`, `${entityFolder} / ${file.name}`);
      try {
        // Pass file.sha so fetchFileText can skip the metadata request if cached
        const text = await fetchFileText(token, user, repo, `Trial Balance/${entityFolder}/${file.name}`, file.sha);
        const rows = parseTBFile(entityFolder, file.name, text);
        console.log(`  ✓ ${file.name} → ${rows.length} rows`);
        allRows.push(...rows);
      } catch (err) {
        console.warn(`TB parse error [${entityFolder}/${file.name}]:`, err.message);
      }
    }
  }

  setLoadingProgress(50, 'Computing monthly movements…');
  computeMonthlyMovements(allRows);
  console.log(`✓ TB loaded — ${allRows.length} total rows`);
  return allRows;
}
