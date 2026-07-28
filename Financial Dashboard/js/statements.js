'use strict';
/* ============================================================
   STATEMENTS.JS — Orchestrator (replaces the old monolithic file)

   Load order in index.html:
     1. statements-shared.js   ← helpers (sumTB, computeBSLine, …)
     2. statements-mc.js       ← modupay Cards IS + BS
     3. statements-dp.js       ← modupay DP IS + BS
     4. statements.js          ← this file (buildAllStatements)

   Each entity file exposes:
     buildMasriaIS(entityFolder, filters)  → result[period]
     buildMasriaBS(entityFolder, y, m)
     buildMdpIS(entityFolder, filters)
     buildMdpBS(entityFolder, y, m)
   ============================================================ */

/**
 * Determine whether an entityFolder maps to modupay Cards (companyCode 1000).
 */
function _isMasriaEntity(entityFolder) {
  return entityCompanyCode(entityFolder) === '1000';
}

/**
 * Build IS for a single entity across all standard periods.
 * Delegates to the entity-specific module.
 */
function buildEntityIS(entityFolder, filters) {
  return _isMasriaEntity(entityFolder)
    ? buildMasriaIS(entityFolder, filters)
    : buildMdpIS(entityFolder, filters);
}

/**
 * Build BS for a single entity.
 * Delegates to the entity-specific module (which carries the correct BS structure).
 */
function buildEntityBSForEntity(entityFolder, year, month) {
  return _isMasriaEntity(entityFolder)
    ? buildMasriaBS(entityFolder, year, month)
    : buildMdpBS(entityFolder, year, month);
}

/**
 * Build IS + BS for every entity folder and store in STATE.statements.
 */
function buildAllStatements() {
  const { year, month } = STATE.filters;
  if (!year || !month) return;
  STATE.statements = {};
  for (const entityFolder of ENTITY_FOLDERS) {
    STATE.statements[entityFolder] = {
      IS: buildEntityIS(entityFolder, STATE.filters),
      BS: buildEntityBSForEntity(entityFolder, parseInt(year), parseInt(month)),
    };
  }
}
