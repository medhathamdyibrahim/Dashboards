// lib/aging.js — compiled from src/lib/aging.ts (readable, unminified)
__modules__.define("lib/aging", function (module, exports, require) {
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
var aging_exports = {};
__export(aging_exports, {
  AgingImportError: () => AgingImportError,
  applyInferredCollections: () => applyInferredCollections,
  findInferredCollections: () => findInferredCollections,
  parseAgingReport: () => parseAgingReport
});
module.exports = __toCommonJS(aging_exports);
var import_exportExcel = require("./exportExcel");
var import_secureClient = require("./secureClient");
var import_aggregates = require("./aggregates");
var import_mutations = require("./repository/mutations");
const HEADER_ALIASES = {
  sapCode: ["sap code", "sapcode"],
  invoiceNo: ["invoice no.", "invoice no", "invoice number"],
  invoiceDate: ["invoice date"],
  invoiceBalance: ["invoice balance"],
  creditTerm: ["credit term"],
  agingReportDate: ["aging report date"],
  days: ["days"]
};
function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}
__name(normalizeHeader, "normalizeHeader");
function excelDateToIso(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const ms = Math.round((value - 25569) * 86400 * 1e3);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = String(value || "").trim();
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s;
}
__name(excelDateToIso, "excelDateToIso");
const _AgingImportError = class _AgingImportError extends Error {
};
__name(_AgingImportError, "AgingImportError");
let AgingImportError = _AgingImportError;
async function parseAgingReport(file) {
  const rawRows = await (0, import_exportExcel.readExcelFile)(file);
  if (rawRows.length === 0) throw new AgingImportError("\u0627\u0644\u0645\u0644\u0641 \u0641\u0627\u0631\u063A \u0623\u0648 \u0644\u0627 \u064A\u0645\u0643\u0646 \u0642\u0631\u0627\u0621\u062A\u0647.");
  const sampleKeys = Object.keys(rawRows[0]).map((k) => ({ raw: k, norm: normalizeHeader(k) }));
  const colMap = {};
  for (const field of Object.keys(HEADER_ALIASES)) {
    const match = sampleKeys.find((k) => HEADER_ALIASES[field].includes(k.norm));
    if (match) colMap[field] = match.raw;
  }
  const required = ["invoiceNo", "invoiceBalance"];
  const missing = required.filter((f) => !colMap[f]);
  if (missing.length > 0) {
    throw new AgingImportError(
      `\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0639\u0645\u062F\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0644\u0641: ${missing.join(", ")}. \u0627\u0644\u0623\u0639\u0645\u062F\u0629 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629: ${sampleKeys.map((k) => k.raw).join(", ")}`
    );
  }
  return rawRows.map((r) => ({
    sapCode: String(r[colMap.sapCode || ""] ?? ""),
    invoiceNo: String(r[colMap.invoiceNo] ?? "").trim(),
    invoiceDate: colMap.invoiceDate ? excelDateToIso(r[colMap.invoiceDate]) : "",
    invoiceBalance: Number(r[colMap.invoiceBalance]) || 0,
    creditTerm: String(r[colMap.creditTerm || ""] ?? ""),
    agingReportDate: colMap.agingReportDate ? excelDateToIso(r[colMap.agingReportDate]) : "",
    days: Number(r[colMap.days || ""]) || 0
  })).filter((r) => r.invoiceNo);
}
__name(parseAgingReport, "parseAgingReport");
async function findInferredCollections(agingDate, reportRows) {
  const reportedInvoiceNumbers = new Set(reportRows.map((r) => r.invoiceNo));
  const { data: invoices } = await (0, import_secureClient.secureFrom)("invoices").select("id, invoice_number, invoice_date, currency, status, customers(name)").lt("invoice_date", agingDate).in("status", ["issued", "partially_paid", "overdue"]);
  const rows = invoices || [];
  if (rows.length === 0) return [];
  const totalsMap = await (0, import_aggregates.getInvoiceTotalsMap)(rows.map((r) => r.id));
  return rows.filter((inv) => !reportedInvoiceNumbers.has(inv.invoice_number)).map((inv) => {
    const t = totalsMap.get(inv.id) || { invoiceTotal: 0, paidTotal: 0, balanceDue: 0 };
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      customerName: inv.customers?.name || "",
      currency: inv.currency,
      balanceDue: t.balanceDue
    };
  }).filter((r) => r.balanceDue > 0).sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
}
__name(findInferredCollections, "findInferredCollections");
async function applyInferredCollections(agingDate, items, createdBy) {
  let succeeded = 0;
  const failed = [];
  for (const item of items) {
    const { error: payError } = await (0, import_mutations.createPayment)({
      invoice_id: item.invoiceId,
      amount: item.balanceDue,
      currency: item.currency,
      payment_date: agingDate,
      reference_no: `Aging Import ${agingDate}`,
      notes: `\u0645\u064F\u0633\u062A\u0646\u062A\u062C \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0645\u0646 \u062A\u0642\u0631\u064A\u0631 \u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0628\u062A\u0627\u0631\u064A\u062E ${agingDate} (\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u062A\u0642\u0631\u064A\u0631).`,
      created_by: createdBy
    });
    if (payError) {
      failed.push({ invoiceNumber: item.invoiceNumber, error: payError.message || String(payError) });
      continue;
    }
    const { error: statusError } = await (0, import_secureClient.secureFrom)("invoices").update({ status: "paid" }).eq("id", item.invoiceId);
    if (statusError) {
      failed.push({ invoiceNumber: item.invoiceNumber, error: statusError.message });
      continue;
    }
    succeeded += 1;
  }
  return { succeeded, failed };
}
__name(applyInferredCollections, "applyInferredCollections");

});
