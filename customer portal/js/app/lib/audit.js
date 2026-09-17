// lib/audit.js — compiled from src/lib/audit.ts (readable, unminified)
__modules__.define("lib/audit", function (module, exports, require) {
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var audit_exports = {};
__export(audit_exports, {
  AUDITED_TABLES: () => AUDITED_TABLES,
  TABLE_LABELS: () => TABLE_LABELS,
  actionLabel: () => actionLabel,
  decryptSnapshot: () => decryptSnapshot,
  fetchAuditLog: () => fetchAuditLog,
  restoreAuditEntry: () => restoreAuditEntry
});
module.exports = __toCommonJS(audit_exports);
var import_supabaseClient = require("./supabaseClient");
var import_secureClient = require("./secureClient");
var import_encryptedFields = require("./encryptedFields");
const AUDITED_TABLES = [
  "customers",
  "products",
  "purchase_orders",
  "sales_orders",
  "dispatches",
  "invoices",
  "payments",
  "fx_rates"
];
const TABLE_LABELS = {
  customers: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
  products: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A",
  purchase_orders: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (POs)",
  sales_orders: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO)",
  dispatches: "\u0627\u0644\u0634\u062D\u0646\u0627\u062A",
  invoices: "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631",
  payments: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A",
  fx_rates: "\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0635\u0631\u0641 (FX Rates)"
};
const ACTION_LABELS = {
  INSERT: "\u0625\u0646\u0634\u0627\u0621",
  UPDATE: "\u062A\u0639\u062F\u064A\u0644",
  DELETE: "\u062D\u0630\u0641"
};
function actionLabel(a) {
  return ACTION_LABELS[a] || a;
}
__name(actionLabel, "actionLabel");
function decryptSnapshot(table, snapshot) {
  if (!snapshot) return snapshot;
  const fields = import_encryptedFields.ENCRYPTED_FIELDS[table];
  if (!fields) return snapshot;
  const out = { ...snapshot };
  for (const f of fields) {
    if (f in out && out[f] !== void 0 && out[f] !== null) out[f] = (0, import_secureClient.decryptValue)(out[f]);
  }
  return out;
}
__name(decryptSnapshot, "decryptSnapshot");
async function fetchAuditLog(params) {
  let query = import_supabaseClient.supabase.from("audit_log").select("*, profiles(full_name, email)", { count: "exact" }).order("changed_at", { ascending: false });
  if (params.table) query = query.eq("table_name", params.table);
  if (params.action) query = query.eq("action", params.action);
  if (params.from) query = query.gte("changed_at", params.from);
  if (params.to) query = query.lte("changed_at", params.to);
  if (params.search) query = query.eq("record_id", params.search);
  const start = params.page * params.pageSize;
  const end = start + params.pageSize - 1;
  const { data, error, count } = await query.range(start, end);
  return { data: data || [], error, count: count || 0 };
}
__name(fetchAuditLog, "fetchAuditLog");
async function restoreAuditEntry(entry) {
  const table = entry.table_name;
  const snapshot = entry.action === "DELETE" ? entry.old_data : entry.old_data;
  if (!snapshot) return { error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u0633\u062E\u0629 \u0633\u0627\u0628\u0642\u0629 \u064A\u0645\u0643\u0646 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0625\u0644\u064A\u0647\u0627." };
  const decrypted = decryptSnapshot(table, snapshot);
  const { id, created_at, updated_at: _updatedAt, ...patch } = decrypted;
  void _updatedAt;
  if (entry.action === "DELETE") {
    const { error: error2 } = await (0, import_secureClient.secureFrom)(table).insert({ id, ...patch });
    return { error: error2?.message || null };
  }
  const { error } = await (0, import_secureClient.secureFrom)(table).update(patch).eq("id", entry.record_id);
  return { error: error?.message || null };
}
__name(restoreAuditEntry, "restoreAuditEntry");

});
