// lib/secureClient.js — compiled from src/lib/secureClient.ts (readable, unminified)
__modules__.define("lib/secureClient", function (module, exports, require) {
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
var secureClient_exports = {};
__export(secureClient_exports, {
  decryptRowFor: () => decryptRowFor,
  decryptValue: () => import_crypto.decryptValue,
  encryptValue: () => import_crypto.encryptValue,
  secureFrom: () => secureFrom
});
module.exports = __toCommonJS(secureClient_exports);
var import_supabaseClient = require("./supabaseClient");
var import_encryptedFields = require("./encryptedFields");
var import_crypto = require("./crypto");
function encryptRow(table, row) {
  const fields = import_encryptedFields.ENCRYPTED_FIELDS[table];
  if (!fields || !row) return row;
  const out = { ...row };
  for (const f of fields) {
    if (f in out && out[f] !== void 0) out[f] = (0, import_crypto.encryptValue)(out[f]);
  }
  return out;
}
__name(encryptRow, "encryptRow");
function encryptPayload(table, payload) {
  if (Array.isArray(payload)) return payload.map((r) => encryptRow(table, r));
  return encryptRow(table, payload);
}
__name(encryptPayload, "encryptPayload");
function decryptRow(table, row) {
  const fields = import_encryptedFields.ENCRYPTED_FIELDS[table];
  if (!fields || !row || typeof row !== "object") return row;
  const out = { ...row };
  for (const f of fields) {
    if (f in out && out[f] !== void 0 && out[f] !== null) out[f] = (0, import_crypto.decryptValue)(out[f]);
  }
  return out;
}
__name(decryptRow, "decryptRow");
function decryptResult(table, result) {
  const r = result;
  if (r && r.data) {
    r.data = Array.isArray(r.data) ? r.data.map((row) => decryptRow(table, row)) : decryptRow(table, r.data);
  }
  return r;
}
__name(decryptResult, "decryptResult");
function wrapBuilder(obj, table) {
  if (obj === null || typeof obj !== "object") return obj;
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop === "then") {
        const originalThen = target.then?.bind(target);
        if (!originalThen) return void 0;
        return (onFulfilled, onRejected) => originalThen(
          (result) => {
            const decrypted = decryptResult(table, result);
            return onFulfilled ? onFulfilled(decrypted) : decrypted;
          },
          onRejected
        );
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      const bound = value.bind(target);
      if (prop === "insert" || prop === "upsert") {
        return (payload, ...rest) => wrapBuilder(bound(encryptPayload(table, payload), ...rest), table);
      }
      if (prop === "update") {
        return (payload, ...rest) => wrapBuilder(bound(encryptRow(table, payload), ...rest), table);
      }
      return (...args) => wrapBuilder(bound(...args), table);
    }
  });
}
__name(wrapBuilder, "wrapBuilder");
function secureFrom(table) {
  const real = import_supabaseClient.supabase.from(table);
  if (!(0, import_encryptedFields.isEncryptedTable)(table)) return real;
  return wrapBuilder(real, table);
}
__name(secureFrom, "secureFrom");
function decryptRowFor(table, row) {
  return decryptRow(table, row);
}
__name(decryptRowFor, "decryptRowFor");

});
