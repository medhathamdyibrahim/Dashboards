// lib/customerReportExcel.js — compiled from src/lib/customerReportExcel.ts (readable, unminified)
__modules__.define("lib/customerReportExcel", function (module, exports, require) {
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
var customerReportExcel_exports = {};
__export(customerReportExcel_exports, {
  buildCustomerReportWorkbook: () => buildCustomerReportWorkbook,
  downloadBlob: () => downloadBlob
});
module.exports = __toCommonJS(customerReportExcel_exports);
var import_exceljs = __toESM(require("exceljs"));
var import_ui = require("./ui");
const BLUE = import_ui.BRAND_BLUE.replace("#", "FF").toUpperCase();
const GRAY = import_ui.BRAND_GRAY.replace("#", "FF").toUpperCase();
const ORANGE = import_ui.BRAND_ORANGE.replace("#", "FF").toUpperCase();
const SO_FILL = "FFE0E9F7";
const WHITE = "FFFFFFFF";
const thin = { style: "thin", color: { argb: "FFC8C8C8" } };
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt;
}
__name(fmtDate, "fmtDate");
function safeSheetName(name, used) {
  let base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Customer";
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}
__name(safeSheetName, "safeSheetName");
async function buildCustomerReportWorkbook(customers) {
  const wb = new import_exceljs.default.Workbook();
  wb.creator = "Deal Tracker";
  wb.created = /* @__PURE__ */ new Date();
  const usedNames = /* @__PURE__ */ new Set();
  for (const c of customers) {
    let writeRow = function(level, hierarchy, ref, desc, qty, value, date, status, notes, fill, fontColor, bold) {
      const values = [hierarchy, ref, desc, qty, value, date, status, notes];
      values.forEach((v, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = v;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.font = { color: { argb: fontColor }, bold };
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        if (i === 3) cell.numFmt = "#,##0";
        if (i === 4 && typeof v === "number") cell.numFmt = "#,##0.00";
        if (i === 5 && v instanceof Date) cell.numFmt = "dd-mmm-yyyy";
      });
      ws.getRow(r).outlineLevel = level;
      r += 1;
    };
    __name(writeRow, "writeRow");
    const ws = wb.addWorksheet(safeSheetName(c.customer_name, usedNames), { views: [{ state: "frozen", ySplit: 8 }] });
    ws.columns = [
      { width: 14 },
      { width: 22 },
      { width: 34 },
      { width: 12 },
      { width: 14 },
      { width: 13 },
      { width: 14 },
      { width: 30 }
    ];
    ws.mergeCells("A1:H1");
    const titleCell = ws.getCell("A1");
    titleCell.value = c.customer_name;
    titleCell.font = { bold: true, size: 16, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(1).height = 26;
    ws.getCell("A2").value = "Customer Code:";
    ws.getCell("A2").font = { bold: true };
    ws.getCell("B2").value = c.sap_code || "\u2014";
    ws.getCell("D2").value = "Region:";
    ws.getCell("D2").font = { bold: true };
    ws.getCell("E2").value = c.region || "\u2014";
    ws.getCell("A3").value = "Local / Export:";
    ws.getCell("A3").font = { bold: true };
    ws.getCell("B3").value = c.local_export || "\u2014";
    ws.getCell("D3").value = "Owner:";
    ws.getCell("D3").font = { bold: true };
    ws.getCell("E3").value = c.owner_name || "\u2014";
    const kpiLabels = ["Total POs", "Total PO Value", "Total SO Value", "Total Dispatched Qty", "Total Invoiced", "Total Collected", "Outstanding"];
    const kpiValues = [
      c.totals.poCount,
      c.totals.poValue,
      c.totals.soValue,
      c.totals.dispatchedQty,
      c.totals.invoicedValue,
      c.totals.collectedValue,
      c.totals.outstanding
    ];
    kpiLabels.forEach((label, i) => {
      const cell = ws.getCell(5, i + 1);
      cell.value = label;
      cell.font = { bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { horizontal: "center" };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
      const vCell = ws.getCell(6, i + 1);
      vCell.value = kpiValues[i];
      const isOutstanding = label === "Outstanding" && Number(kpiValues[i]) > 0;
      vCell.numFmt = i === 0 || i === 3 ? "#,##0" : "#,##0.00";
      vCell.font = { bold: true, color: { argb: isOutstanding ? WHITE : "FF000000" } };
      vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isOutstanding ? ORANGE : GRAY } };
      vCell.alignment = { horizontal: "center" };
      vCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    const headerRow = 8;
    const headers = ["Hierarchy", "Reference", "Description / Product", "Quantity", "Value", "Date", "Status", "Notes"];
    headers.forEach((h, i) => {
      const cell = ws.getCell(headerRow, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { horizontal: "center" };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    });
    let r = headerRow + 1;
    if (c.purchase_orders.length === 0) {
      writeRow(0, "-", "-", "No PO data found for this client yet", "", "", "", "", "", WHITE, "FF000000", false);
    }
    for (const po of c.purchase_orders) {
      writeRow(1, "PO", po.po_number, po.item_name || "", po.quantity, po.value, fmtDate(po.po_date), po.is_itemized ? "Itemized" : "", "", BLUE, WHITE, true);
      for (const item of po.items) {
        writeRow(2, "PO Line", "", item.item_name || "", item.quantity, item.value, "", "", "", SO_FILL, "FF002B7A", false);
      }
      for (const so of po.sales_orders) {
        writeRow(2, "SO", so.sap_so_number || so.so_number, so.product_description || "", so.quantity, so.value, fmtDate(so.so_date), "", so.factory_so_number ? `Access SO ${so.factory_so_number}` : "", SO_FILL, BLUE, true);
        for (const item of so.items) {
          const notes = `Ver. ${item.version || ""} | Proof ${item.proof_number || ""} | Type ${item.so_type || ""}`.trim();
          writeRow(3, "SO Line", "", item.product_description || "", item.quantity, item.value, "", "", notes, GRAY, "FF002B7A", false);
        }
        if (so.dispatches.length === 0) {
          writeRow(3, "Dispatch", "-", "No dispatch data yet", "", "", "", "", "", GRAY, "FF8C8C8C", false);
        } else {
          for (const d of so.dispatches) {
            writeRow(3, "Dispatch", d.dispatch_number, d.awb_tracking || "", d.quantity, "", fmtDate(d.dispatch_date), d.status || "", d.delivery_date ? `Delivered: ${d.delivery_date}` : "", GRAY, "FF505050", false);
          }
        }
        if (so.invoices.length === 0) {
          writeRow(3, "Invoice", "-", "No invoice data yet", "", "", "", "", "", GRAY, "FF8C8C8C", false);
        } else {
          for (const inv of so.invoices) {
            const balance = inv.value - inv.paid;
            writeRow(3, "Invoice", inv.invoice_number, balance > 0 ? `Outstanding: ${balance.toLocaleString()}` : "Fully collected", inv.quantity, inv.value, fmtDate(inv.invoice_date), inv.status || "", "", balance > 0 ? ORANGE : GRAY, balance > 0 ? WHITE : "FF505050", balance > 0);
            if (inv.payments.length === 0) {
              writeRow(4, "Collection", "-", "No collection data yet", "", "", "", "", "", WHITE, "FF969696", false);
            } else {
              for (const p of inv.payments) {
                writeRow(4, "Collection", inv.invoice_number, "Payment received", "", p.amount, fmtDate(p.payment_date), "", "", WHITE, "FF141414", false);
              }
            }
          }
        }
      }
    }
    ws.properties.outlineLevelRow = 1;
    if (typeof ws.outlineProperties === "object") {
      ws.outlineProperties = { summaryBelow: false };
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
__name(buildCustomerReportWorkbook, "buildCustomerReportWorkbook");
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
__name(downloadBlob, "downloadBlob");

});
