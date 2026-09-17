// lib/usePaginatedList.js — compiled from src/lib/usePaginatedList.ts (readable, unminified)
__modules__.define("lib/usePaginatedList", function (module, exports, require) {
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
var usePaginatedList_exports = {};
__export(usePaginatedList_exports, {
  usePaginatedList: () => usePaginatedList
});
module.exports = __toCommonJS(usePaginatedList_exports);
var import_react = require("react");
var import_supabaseClient = require("./supabaseClient");
var import_fx = require("./fx");
async function sumGrandTotal(rows, column, currencyColumn, dateColumn) {
  if (!currencyColumn || !dateColumn) {
    return rows.reduce((s, r) => s + Number(r[column] || 0), 0);
  }
  const rates = await (0, import_fx.loadFxRates)();
  return rows.reduce((s, r) => s + (0, import_fx.convertToUsd)(Number(r[column] || 0), r[currencyColumn], r[dateColumn], rates).usd, 0);
}
__name(sumGrandTotal, "sumGrandTotal");
function usePaginatedList(options) {
  const {
    view,
    pageSize = 20,
    searchColumns,
    orderColumn,
    orderAscending = false,
    grandTotalColumn,
    grandTotalCurrencyColumn,
    grandTotalDateColumn,
    filters = {},
    fetchFn
  } = options;
  const filtersKey = JSON.stringify(filters);
  const [rows, setRows] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [page, setPage] = (0, import_react.useState)(0);
  const [search, setSearch] = (0, import_react.useState)("");
  const [totalCount, setTotalCount] = (0, import_react.useState)(0);
  const [grandTotal, setGrandTotal] = (0, import_react.useState)(0);
  const [reloadToken, setReloadToken] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    setPage(0);
  }, [search, filtersKey]);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    function applyCommon(query) {
      for (const [col, val] of Object.entries(filters)) {
        if (val) query = query.eq(col, val);
      }
      if (search.trim()) {
        const term = search.trim().replace(/[%,]/g, "");
        const orExpr = searchColumns.map((c) => `${c}.ilike.%${term}%`).join(",");
        query = query.or(orExpr);
      }
      return query;
    }
    __name(applyCommon, "applyCommon");
    async function load() {
      setLoading(true);
      if (fetchFn) {
        const { data: data2, count: count2 } = await fetchFn({ search: search.trim(), filters, limit: pageSize, offset: page * pageSize });
        if (cancelled) return;
        setRows(data2 || []);
        setTotalCount(count2 || 0);
        setLoading(false);
        if (grandTotalColumn) {
          const { data: allData } = await fetchFn({ search: search.trim(), filters, limit: 1e5, offset: 0 });
          if (cancelled) return;
          const total = await sumGrandTotal(allData || [], grandTotalColumn, grandTotalCurrencyColumn, grandTotalDateColumn);
          if (cancelled) return;
          setGrandTotal(total);
        }
        return;
      }
      let query = import_supabaseClient.supabase.from(view).select("*", { count: "exact" });
      query = applyCommon(query);
      query = query.order(orderColumn, { ascending: orderAscending });
      query = query.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count } = await query;
      if (cancelled) return;
      setRows(data || []);
      setTotalCount(count || 0);
      setLoading(false);
      if (grandTotalColumn) {
        const selectCols = [grandTotalColumn, grandTotalCurrencyColumn, grandTotalDateColumn].filter(Boolean).join(",");
        let sumQuery = import_supabaseClient.supabase.from(view).select(selectCols);
        sumQuery = applyCommon(sumQuery);
        const { data: sumData } = await sumQuery;
        if (cancelled) return;
        const total = await sumGrandTotal(sumData || [], grandTotalColumn, grandTotalCurrencyColumn, grandTotalDateColumn);
        if (cancelled) return;
        setGrandTotal(total);
      }
    }
    __name(load, "load");
    load();
    return () => {
      cancelled = true;
    };
  }, [view, page, pageSize, search, filtersKey, orderColumn, orderAscending, grandTotalColumn, grandTotalCurrencyColumn, grandTotalDateColumn, reloadToken]);
  return {
    rows,
    loading,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    totalCount,
    grandTotal,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    /** Re-fetch the current page/search/filters — use after any insert/update/delete
     * that should be reflected in this list, since setPage(0) is a no-op when
     * already on page 0 and won't otherwise trigger a refetch. */
    refresh: /* @__PURE__ */ __name(() => setReloadToken((t) => t + 1), "refresh")
  };
}
__name(usePaginatedList, "usePaginatedList");

});
