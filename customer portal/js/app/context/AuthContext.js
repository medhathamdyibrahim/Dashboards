// context/AuthContext.js — compiled from src/context/AuthContext.tsx (readable, unminified)
__modules__.define("context/AuthContext", function (module, exports, require) {
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
var AuthContext_exports = {};
__export(AuthContext_exports, {
  AuthProvider: () => AuthProvider,
  useAuth: () => useAuth
});
module.exports = __toCommonJS(AuthContext_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_supabaseClient = require("../lib/supabaseClient");
const AuthContext = (0, import_react.createContext)(void 0);
function AuthProvider({ children }) {
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [userId, setUserId] = (0, import_react.useState)(null);
  const [profile, setProfile] = (0, import_react.useState)(null);
  const [permissions, setPermissions] = (0, import_react.useState)([]);
  const [myRegions, setMyRegions] = (0, import_react.useState)([]);
  async function loadProfile(uid) {
    const { data: prof } = await import_supabaseClient.supabase.from("profiles").select("*, roles(*)").eq("id", uid).maybeSingle();
    setProfile(prof);
    if (prof?.role_id) {
      const { data: perms } = await import_supabaseClient.supabase.from("role_permissions").select("*").eq("role_id", prof.role_id);
      setPermissions(perms || []);
    } else {
      setPermissions([]);
    }
    const { data: regionRows } = await import_supabaseClient.supabase.from("user_regions").select("region").eq("profile_id", uid);
    setMyRegions((regionRows || []).map((r) => r.region));
  }
  __name(loadProfile, "loadProfile");
  async function refreshProfile() {
    if (userId) await loadProfile(userId);
  }
  __name(refreshProfile, "refreshProfile");
  (0, import_react.useEffect)(() => {
    import_supabaseClient.supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) await loadProfile(uid);
      setLoading(false);
    });
    const { data: sub } = import_supabaseClient.supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        await loadProfile(uid);
      } else {
        setProfile(null);
        setPermissions([]);
        setMyRegions([]);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const isAdmin = profile?.roles?.name === "admin";
  const allRegions = isAdmin || !!profile?.all_regions;
  const can = (0, import_react.useMemo)(() => {
    return (module2, action) => {
      if (isAdmin) return true;
      const p = permissions.find((x) => x.module === module2);
      if (!p) return false;
      switch (action) {
        case "view":
          return p.can_view;
        case "create":
          return p.can_create;
        case "edit":
          return p.can_edit;
        case "delete":
          return p.can_delete;
        case "approve":
          return p.can_approve;
      }
    };
  }, [permissions, isAdmin]);
  const canSeeRegion = (0, import_react.useMemo)(() => {
    return (region) => {
      if (allRegions) return true;
      if (!region) return true;
      return myRegions.includes(region);
    };
  }, [allRegions, myRegions]);
  async function signOut() {
    await import_supabaseClient.supabase.auth.signOut();
  }
  __name(signOut, "signOut");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthContext.Provider, { value: { loading, userId, profile, permissions, isAdmin, can, allRegions, myRegions, canSeeRegion, refreshProfile, signOut }, children });
}
__name(AuthProvider, "AuthProvider");
function useAuth() {
  const ctx = (0, import_react.useContext)(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
__name(useAuth, "useAuth");

});
