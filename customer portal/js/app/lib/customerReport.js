// lib/customerReport.js — compiled from src/lib/customerReport.ts (readable, unminified)
__modules__.define("lib/customerReport", function (module, exports, require) {
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
var customerReport_exports = {};
__export(customerReport_exports, {
  buildCustomerReportTree: () => buildCustomerReportTree,
  filterAndSortReport: () => filterAndSortReport
});
module.exports = __toCommonJS(customerReport_exports);
var import_queries = require("./repository/queries");
function inRange(date, from, to) {
  if (!from && !to) return true;
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
__name(inRange, "inRange");
async function buildCustomerReportTree() {
  const [rows, amounts, poItemsByPo, soItemsBySo] = await Promise.all([
    (0, import_queries.listCustomerReportRows)(),
    (0, import_queries.getCustomerReportAmounts)(),
    (0, import_queries.getAllPoItemsGrouped)(),
    (0, import_queries.getAllSoItemsGrouped)()
  ]);
  const byCustomer = /* @__PURE__ */ new Map();
  function getCustomer(r) {
    let c = byCustomer.get(r.customer_id);
    if (!c) {
      c = {
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        short_name: r.short_name,
        sap_code: r.sap_code,
        region: r.region,
        local_export: r.local_export,
        owner_name: r.owner_name,
        account_manager_name: r.account_manager_name,
        purchase_orders: [],
        totals: { poCount: 0, poValue: 0, soValue: 0, dispatchedQty: 0, invoicedValue: 0, collectedValue: 0, outstanding: 0 }
      };
      byCustomer.set(r.customer_id, c);
    }
    return c;
  }
  __name(getCustomer, "getCustomer");
  for (const r of rows) {
    const c = getCustomer(r);
    let po;
    if (r.po_id) {
      po = c.purchase_orders.find((p) => p.id === r.po_id);
      if (!po) {
        const amt = amounts.po.get(r.po_id) || { po_quantity: 0, asp: 0, po_value: 0 };
        const items = (poItemsByPo.get(r.po_id) || []).map((it) => ({ id: it.id, item_name: it.item_name, quantity: it.quantity, price: it.price, value: it.quantity * it.price }));
        po = {
          id: r.po_id,
          po_number: r.po_number || "",
          item_name: r.po_item_name,
          po_date: r.po_date,
          currency: r.po_currency,
          is_itemized: items.length > 0,
          quantity: amt.po_quantity,
          asp: amt.asp,
          value: amt.po_value,
          items,
          sales_orders: []
        };
        c.purchase_orders.push(po);
      }
    }
    let so;
    if (po && r.so_id) {
      so = po.sales_orders.find((s) => s.id === r.so_id);
      if (!so) {
        const amt = amounts.so.get(r.so_id) || { so_quantity: 0, so_value: 0 };
        const items = (soItemsBySo.get(r.so_id) || []).map((it) => ({
          id: it.id,
          product_description: it.product_description,
          proof_number: it.proof_number,
          version: it.version,
          so_type: it.so_type,
          quantity: it.quantity,
          price: it.price,
          value: it.quantity * it.price
        }));
        so = {
          id: r.so_id,
          so_number: r.so_number || "",
          sap_so_number: r.sap_so_number,
          factory_so_number: r.factory_so_number,
          product_description: r.product_description,
          so_date: r.so_date,
          currency: r.so_currency,
          quantity: amt.so_quantity,
          value: amt.so_value,
          items,
          dispatches: [],
          invoices: []
        };
        po.sales_orders.push(so);
      }
    }
    if (so && r.dispatch_id && !so.dispatches.find((d) => d.id === r.dispatch_id)) {
      const amt = amounts.dispatch.get(r.dispatch_id) || { dispatch_quantity: 0 };
      so.dispatches.push({
        id: r.dispatch_id,
        dispatch_number: r.dispatch_number || "",
        dispatch_date: r.dispatch_date,
        status: r.dispatch_status,
        awb_tracking: r.awb_tracking,
        delivery_date: r.delivery_date,
        quantity: amt.dispatch_quantity
      });
    }
    if (so && r.invoice_id && !so.invoices.find((i) => i.id === r.invoice_id)) {
      const amt = amounts.invoice.get(r.invoice_id) || { invoice_quantity: 0, invoice_value: 0 };
      so.invoices.push({
        id: r.invoice_id,
        invoice_number: r.invoice_number || "",
        invoice_date: r.invoice_date,
        status: r.invoice_status,
        currency: r.invoice_currency,
        quantity: amt.invoice_quantity,
        value: amt.invoice_value,
        payments: [],
        paid: 0
      });
    }
    if (so && r.invoice_id && r.payment_id) {
      const inv = so.invoices.find((i) => i.id === r.invoice_id);
      if (inv && !inv.payments.find((p) => p.id === r.payment_id)) {
        const amt = amounts.payment.get(r.payment_id) || { amount: 0 };
        inv.payments.push({ id: r.payment_id, payment_date: r.payment_date, amount: amt.amount });
        inv.paid += amt.amount;
      }
    }
  }
  for (const c of byCustomer.values()) {
    c.totals.poCount = c.purchase_orders.length;
    c.totals.poValue = c.purchase_orders.reduce((s, p) => s + p.value, 0);
    for (const po of c.purchase_orders) {
      for (const so of po.sales_orders) {
        c.totals.soValue += so.value;
        c.totals.dispatchedQty += so.dispatches.reduce((s, d) => s + d.quantity, 0);
        c.totals.invoicedValue += so.invoices.reduce((s, i) => s + i.value, 0);
        c.totals.collectedValue += so.invoices.reduce((s, i) => s + i.paid, 0);
      }
    }
    c.totals.outstanding = c.totals.invoicedValue - c.totals.collectedValue;
  }
  return Array.from(byCustomer.values()).sort((a, b) => a.customer_name.localeCompare(b.customer_name));
}
__name(buildCustomerReportTree, "buildCustomerReportTree");
function passesDateRangeLayer(c, range) {
  if (!range.from && !range.to) return true;
  const dates = [];
  for (const po of c.purchase_orders) {
    if (range.field === "po_date") dates.push(po.po_date);
    for (const so of po.sales_orders) {
      if (range.field === "so_date") dates.push(so.so_date);
      if (range.field === "invoice_date") for (const inv of so.invoices) dates.push(inv.invoice_date);
    }
  }
  return dates.some((d) => inRange(d, range.from, range.to));
}
__name(passesDateRangeLayer, "passesDateRangeLayer");
function filterAndSortReport(tree, filters, canSeeRegion) {
  let rows = tree.filter((c) => canSeeRegion(c.region));
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter((c) => c.customer_name.toLowerCase().includes(q) || (c.sap_code || "").toLowerCase().includes(q) || (c.short_name || "").toLowerCase().includes(q));
  }
  if (filters.regions.length > 0) rows = rows.filter((c) => c.region && filters.regions.includes(c.region));
  if (filters.owner) rows = rows.filter((c) => c.owner_name === filters.owner);
  for (const layer of filters.dateRanges) {
    if (layer.from || layer.to) rows = rows.filter((c) => passesDateRangeLayer(c, layer));
  }
  const dir = filters.sortDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    switch (filters.sortBy) {
      case "region":
        return dir * (a.region || "").localeCompare(b.region || "");
      case "invoiced":
        return dir * (a.totals.invoicedValue - b.totals.invoicedValue);
      case "outstanding":
        return dir * (a.totals.outstanding - b.totals.outstanding);
      default:
        return dir * a.customer_name.localeCompare(b.customer_name);
    }
  });
  return rows;
}
__name(filterAndSortReport, "filterAndSortReport");

});
