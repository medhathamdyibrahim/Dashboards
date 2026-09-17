// lib/supabaseClient.js — compiled from src/lib/supabaseClient.ts (readable, unminified)
__modules__.define("lib/supabaseClient", function (module, exports, require) {
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
var supabaseClient_exports = {};
__export(supabaseClient_exports, {
  REMEMBER_ME_KEY: () => REMEMBER_ME_KEY,
  setRememberMe: () => setRememberMe,
  supabase: () => supabase
});
module.exports = __toCommonJS(supabaseClient_exports);
const import_meta = {};
var import_supabase_js = require("@supabase/supabase-js");
const runtimeConfig = typeof window !== "undefined" ? window.__APP_CONFIG__ : void 0;
const supabaseUrl = runtimeConfig?.SUPABASE_URL || import_meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = runtimeConfig?.SUPABASE_ANON_KEY || import_meta.env.VITE_SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase config is missing. Edit config.js (production) or .env (local dev) with your project URL/anon key."
  );
}
const REMEMBER_ME_KEY = "remember_me";
function rememberMeEnabled() {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== "false";
  } catch {
    return true;
  }
}
__name(rememberMeEnabled, "rememberMeEnabled");
function setRememberMe(remember) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
  } catch {
  }
}
__name(setRememberMe, "setRememberMe");
const rememberAwareStorage = {
  getItem: /* @__PURE__ */ __name((key) => {
    try {
      return (rememberMeEnabled() ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  }, "getItem"),
  setItem: /* @__PURE__ */ __name((key, value) => {
    try {
      (rememberMeEnabled() ? localStorage : sessionStorage).setItem(key, value);
    } catch {
    }
  }, "setItem"),
  removeItem: /* @__PURE__ */ __name((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
    }
  }, "removeItem")
};
const supabase = (0, import_supabase_js.createClient)(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  { auth: { storage: rememberAwareStorage, persistSession: true, autoRefreshToken: true } }
);

});
