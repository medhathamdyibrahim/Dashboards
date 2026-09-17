// lib/aggregates.js — compiled from src/lib/aggregates.ts (readable, unminified)
__modules__.define("lib/aggregates", function (module, exports, require) {
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
var aggregates_exports = {};
__export(aggregates_exports, {
  getInvoiceAging: () => getInvoiceAging,
  getInvoiceTotals: () => getInvoiceTotals,
  getInvoiceTotalsMap: () => getInvoiceTotalsMap,
  getMonthlyRevenue: () => getMonthlyRevenue,
  getPoAllocated: () => getPoAllocated,
  getRevenueByCustomer: () => getRevenueByCustomer,
  getRevenueByRegion: () => getRevenueByRegion,
  getSoFulfillment: () => getSoFulfillment,
  getTotalOutstandingBalance: () => getTotalOutstandingBalance
});
module.exports = __toCommonJS(aggregates_exports);
var import_secureClient = require("./secureClient");
var import_fx = require("./fx");
async function getInvoiceTotals(invoiceId) {
  const [invRes, paymentsRes] = await Promise.all([
    (0, import_secureClient.secureFrom)("invoices").select("invoice_value").eq("id", invoiceId).single(),
    (0, import_secureClient.secureFrom)("payments").select("amount").eq("invoice_id", invoiceId)
  ]);
  const invoiceTotal = Number(invRes.data?.invoice_value) || 0;
  const paidTotal = (paymentsRes.data || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { invoiceTotal, paidTotal, balanceDue: invoiceTotal - paidTotal };
}
__name(getInvoiceTotals, "getInvoiceTotals");
async function getInvoiceTotalsMap(invoiceIds) {
  const map = /* @__PURE__ */ new Map();
  if (invoiceIds.length === 0) return map;
  const [invRes, paymentsRes] = await Promise.all([
    (0, import_secureClient.secureFrom)("invoices").select("id, invoice_value").in("id", invoiceIds),
    (0, import_secureClient.secureFrom)("payments").select("invoice_id, amount").in("invoice_id", invoiceIds)
  ]);
  const paid = /* @__PURE__ */ new Map();
  for (const row of paymentsRes.data || []) paid.set(row.invoice_id, (paid.get(row.invoice_id) || 0) + (Number(row.amount) || 0));
  for (const row of invRes.data || []) {
    const invoiceTotal = Number(row.invoice_value) || 0;
    const paidTotal = paid.get(row.id) || 0;
    map.set(row.id, { invoiceTotal, paidTotal, balanceDue: invoiceTotal - paidTotal });
  }
  return map;
}
__name(getInvoiceTotalsMap, "getInvoiceTotalsMap");
async function getSoFulfillment(soId) {
  const [soRes, dispRes, invRes] = await Promise.all([
    (0, import_secureClient.secureFrom)("sales_orders").select("so_quantity").eq("id", soId).single(),
    (0, import_secureClient.secureFrom)("dispatches").select("dispatch_quantity").eq("so_id", soId),
    (0, import_secureClient.secureFrom)("invoices").select("invoice_quantity").eq("so_id", soId)
  ]);
  const soQty = Number(soRes.data?.so_quantity) || 0;
  const dispatchedQty = (dispRes.data || []).reduce((s, d) => s + (Number(d.dispatch_quantity) || 0), 0);
  const invoicedQty = (invRes.data || []).reduce((s, i) => s + (Number(i.invoice_quantity) || 0), 0);
  return { soQty, dispatchedQty, invoicedQty };
}
__name(getSoFulfillment, "getSoFulfillment");
async function getPoAllocated(poId) {
  const [poRes, soRes] = await Promise.all([
    (0, import_secureClient.secureFrom)("purchase_orders").select("po_quantity").eq("id", poId).single(),
    (0, import_secureClient.secureFrom)("sales_orders").select("so_quantity").eq("po_id", poId)
  ]);
  const poQty = Number(poRes.data?.po_quantity) || 0;
  const allocatedQty = (soRes.data || []).reduce((s, so) => s + (Number(so.so_quantity) || 0), 0);
  return { poQty, allocatedQty };
}
__name(getPoAllocated, "getPoAllocated");
async function getTotalOutstandingBalance() {
  const { data: invoices } = await (0, import_secureClient.secureFrom)("invoices").select("id, invoice_value, currency, invoice_date").neq("status", "cancelled");
  const rows = invoices || [];
  if (rows.length === 0) return 0;
  const [map, rates] = await Promise.all([getInvoiceTotalsMap(rows.map((i) => i.id)), (0, import_fx.loadFxRates)()]);
  return rows.reduce((sum, inv) => {
    const t = map.get(inv.id);
    if (!t) return sum;
    return sum + (0, import_fx.convertToUsd)(t.balanceDue, inv.currency, inv.invoice_date, rates).usd;
  }, 0);
}
__name(getTotalOutstandingBalance, "getTotalOutstandingBalance");
async function getInvoiceCustomerRows() {
  const { data } = await (0, import_secureClient.secureFrom)("invoices").select("id, customer_id, region, currency, invoice_date, invoice_value, customers(name)").neq("status", "cancelled");
  return (data || []).map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    region: r.region,
    currency: r.currency,
    invoice_date: r.invoice_date,
    customer_name: r.customers?.name || ""
  }));
}
__name(getInvoiceCustomerRows, "getInvoiceCustomerRows");
async function getRevenueByRegion() {
  const rows = await getInvoiceCustomerRows();
  if (rows.length === 0) return [];
  const [totalsMap, rates] = await Promise.all([getInvoiceTotalsMap(rows.map((r) => r.id)), (0, import_fx.loadFxRates)()]);
  const byRegion = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const region = r.region || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
    const t = totalsMap.get(r.id) || { invoiceTotal: 0, paidTotal: 0, balanceDue: 0 };
    const cur = byRegion.get(region) || { region, invoicesCount: 0, totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0 };
    cur.invoicesCount += 1;
    cur.totalInvoiced += (0, import_fx.convertToUsd)(t.invoiceTotal, r.currency, r.invoice_date, rates).usd;
    cur.totalCollected += (0, import_fx.convertToUsd)(t.paidTotal, r.currency, r.invoice_date, rates).usd;
    cur.totalOutstanding += (0, import_fx.convertToUsd)(t.balanceDue, r.currency, r.invoice_date, rates).usd;
    byRegion.set(region, cur);
  }
  return Array.from(byRegion.values()).sort((a, b) => b.totalInvoiced - a.totalInvoiced);
}
__name(getRevenueByRegion, "getRevenueByRegion");
async function getRevenueByCustomer() {
  const rows = await getInvoiceCustomerRows();
  if (rows.length === 0) return [];
  const [totalsMap, rates] = await Promise.all([getInvoiceTotalsMap(rows.map((r) => r.id)), (0, import_fx.loadFxRates)()]);
  const byCustomer = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const t = totalsMap.get(r.id) || { invoiceTotal: 0, paidTotal: 0, balanceDue: 0 };
    const cur = byCustomer.get(r.customer_id) || {
      customerId: r.customer_id,
      customerName: r.customer_name,
      region: r.region,
      invoicesCount: 0,
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0
    };
    cur.invoicesCount += 1;
    cur.totalInvoiced += (0, import_fx.convertToUsd)(t.invoiceTotal, r.currency, r.invoice_date, rates).usd;
    cur.totalCollected += (0, import_fx.convertToUsd)(t.paidTotal, r.currency, r.invoice_date, rates).usd;
    cur.totalOutstanding += (0, import_fx.convertToUsd)(t.balanceDue, r.currency, r.invoice_date, rates).usd;
    byCustomer.set(r.customer_id, cur);
  }
  return Array.from(byCustomer.values()).sort((a, b) => b.totalInvoiced - a.totalInvoiced);
}
__name(getRevenueByCustomer, "getRevenueByCustomer");
async function getInvoiceAging() {
  const { data: invoices } = await (0, import_secureClient.secureFrom)("invoices").select("id, invoice_number, due_date, currency, status, customers(name)");
  const rows = data_or_empty(invoices).filter((i) => i.status !== "draft" && i.status !== "cancelled");
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const totalsMap = await getInvoiceTotalsMap(ids);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const result = [];
  for (const inv of rows) {
    const t = totalsMap.get(inv.id) || { invoiceTotal: 0, paidTotal: 0, balanceDue: 0 };
    if (t.balanceDue <= 0) continue;
    let bucket;
    if (!inv.due_date) bucket = "\u0628\u062F\u0648\u0646 \u062A\u0627\u0631\u064A\u062E \u0627\u0633\u062A\u062D\u0642\u0627\u0642";
    else if (inv.due_date >= today) bucket = "\u0644\u0645 \u064A\u062D\u0646 \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0628\u0639\u062F";
    else {
      const days = Math.floor((new Date(today).getTime() - new Date(inv.due_date).getTime()) / 864e5);
      bucket = days <= 30 ? "1-30 \u064A\u0648\u0645" : days <= 60 ? "31-60 \u064A\u0648\u0645" : days <= 90 ? "61-90 \u064A\u0648\u0645" : "\u0623\u0643\u062A\u0631 \u0645\u0646 90 \u064A\u0648\u0645";
    }
    result.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      dueDate: inv.due_date,
      currency: inv.currency,
      customerName: inv.customers?.name || "",
      invoiceTotal: t.invoiceTotal,
      paidTotal: t.paidTotal,
      balanceDue: t.balanceDue,
      agingBucket: bucket
    });
  }
  return result.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
}
__name(getInvoiceAging, "getInvoiceAging");
function data_or_empty(d) {
  return d || [];
}
__name(data_or_empty, "data_or_empty");
async function getMonthlyRevenue() {
  const { data: invoices } = await (0, import_secureClient.secureFrom)("invoices").select("id, currency, invoice_date, status").neq("status", "cancelled");
  const rows = invoices || [];
  if (rows.length === 0) return [];
  const [totalsMap, rates] = await Promise.all([getInvoiceTotalsMap(rows.map((r) => r.id)), (0, import_fx.loadFxRates)()]);
  const byMonth = /* @__PURE__ */ new Map();
  for (const inv of rows) {
    const month = (inv.invoice_date || "").slice(0, 7);
    const t = totalsMap.get(inv.id) || { invoiceTotal: 0, paidTotal: 0, balanceDue: 0 };
    const cur = byMonth.get(month) || { month, invoicesCount: 0, totalInvoiced: 0, totalCollected: 0 };
    cur.invoicesCount += 1;
    cur.totalInvoiced += (0, import_fx.convertToUsd)(t.invoiceTotal, inv.currency, inv.invoice_date, rates).usd;
    cur.totalCollected += (0, import_fx.convertToUsd)(t.paidTotal, inv.currency, inv.invoice_date, rates).usd;
    byMonth.set(month, cur);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}
__name(getMonthlyRevenue, "getMonthlyRevenue");

});
