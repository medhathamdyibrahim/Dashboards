// lib/backup.js — compiled from src/lib/backup.ts (readable, unminified)
__modules__.define("lib/backup", function (module, exports, require) {
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
var backup_exports = {};
__export(backup_exports, {
  buildFullBackup: () => buildFullBackup,
  downloadBackupJson: () => downloadBackupJson
});
module.exports = __toCommonJS(backup_exports);
var import_supabaseClient = require("./supabaseClient");
var import_secureClient = require("./secureClient");
var import_encryptedFields = require("./encryptedFields");
const BACKUP_TABLES = [
  "roles",
  "role_permissions",
  "profiles",
  "currencies",
  "fx_rates",
  "regions",
  "user_regions",
  "customers",
  "products",
  "purchase_orders",
  "sales_orders",
  "dispatches",
  "invoices",
  "payments"
];
async function buildFullBackup(onProgress) {
  const backup = {};
  let done = 0;
  for (const table of BACKUP_TABLES) {
    const client = (0, import_encryptedFields.isEncryptedTable)(table) ? (0, import_secureClient.secureFrom)(table) : import_supabaseClient.supabase.from(table);
    const { data, error } = await client.select("*");
    if (error) throw new Error(`\u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u062C\u062F\u0648\u0644 ${table}: ${error.message}`);
    backup[table] = data || [];
    done += 1;
    onProgress?.({ table, done, total: BACKUP_TABLES.length });
  }
  return {
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    app: "ModuPay CRM",
    tables: backup
  };
}
__name(buildFullBackup, "buildFullBackup");
function downloadBackupJson(backup) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `modupay-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
__name(downloadBackupJson, "downloadBackupJson");

});
