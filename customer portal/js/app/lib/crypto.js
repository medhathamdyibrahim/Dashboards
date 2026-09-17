// lib/crypto.js — compiled from src/lib/crypto.ts (readable, unminified)
__modules__.define("lib/crypto", function (module, exports, require) {
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var crypto_exports = {};
__export(crypto_exports, {
  decryptValue: () => decryptValue,
  encryptValue: () => encryptValue
});
module.exports = __toCommonJS(crypto_exports);
const import_meta = {};
var import_crypto_js = __toESM(require("crypto-js"));
const FALLBACK_DEV_KEY = "dev-only-insecure-key-change-me";
function getKey() {
  const runtime = typeof window !== "undefined" ? window.__APP_CONFIG__ : void 0;
  const key = runtime?.ENCRYPTION_KEY || import_meta.env.VITE_ENCRYPTION_KEY || "";
  if (!key) {
    console.warn(
      "ENCRYPTION_KEY is missing from config.js \u2014 falling back to an insecure development key. Set ENCRYPTION_KEY in config.js before going to production."
    );
    return FALLBACK_DEV_KEY;
  }
  return key;
}
__name(getKey, "getKey");
const PREFIX = "enc:v1:";
function encryptValue(value) {
  if (value === null || value === void 0) return value;
  const json = JSON.stringify(value);
  const ciphertext = import_crypto_js.default.AES.encrypt(json, getKey()).toString();
  return PREFIX + ciphertext;
}
__name(encryptValue, "encryptValue");
function decryptValue(stored) {
  if (typeof stored !== "string" || !stored.startsWith(PREFIX)) {
    return stored;
  }
  try {
    const ciphertext = stored.slice(PREFIX.length);
    const bytes = import_crypto_js.default.AES.decrypt(ciphertext, getKey());
    const json = bytes.toString(import_crypto_js.default.enc.Utf8);
    if (!json) throw new Error("empty");
    return JSON.parse(json);
  } catch {
    return "\u{1F512} (\u062A\u0639\u0630\u0631 \u0641\u0643 \u0627\u0644\u062A\u0634\u0641\u064A\u0631)";
  }
}
__name(decryptValue, "decryptValue");

});
