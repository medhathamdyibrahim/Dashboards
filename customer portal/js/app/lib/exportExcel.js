// lib/exportExcel.js — compiled from src/lib/exportExcel.ts (readable, unminified)
__modules__.define("lib/exportExcel", function (module, exports, require) {
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
var exportExcel_exports = {};
__export(exportExcel_exports, {
  exportRowsToExcel: () => exportRowsToExcel,
  exportSheetsToExcel: () => exportSheetsToExcel,
  readExcelFile: () => readExcelFile
});
module.exports = __toCommonJS(exportExcel_exports);
var XLSX = __toESM(require("xlsx"));
var import_exceljs = __toESM(require("exceljs"));
var import_ui = require("./ui");
const HEADER_FILL = import_ui.BRAND_BLUE.replace("#", "FF").toUpperCase();
const BORDER_COLOR = import_ui.BRAND_GRAY.replace("#", "FF").toUpperCase();
const thinBorder = { style: "thin", color: { argb: BORDER_COLOR } };
function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  });
  row.height = 20;
}
__name(styleHeaderRow, "styleHeaderRow");
function styleDataRow(row) {
  row.eachCell((cell) => {
    cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
    if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
    if (cell.value instanceof Date) cell.numFmt = "dd-mmm-yyyy";
  });
}
__name(styleDataRow, "styleDataRow");
function autoWidth(ws, rows) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  ws.columns = keys.map((k) => {
    const longest = Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length));
    return { header: k, key: k, width: Math.min(Math.max(longest + 2, 10), 42) };
  });
}
__name(autoWidth, "autoWidth");
async function exportRowsToExcel(filename, sheetName, rows) {
  if (rows.length === 0) {
    alert("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0635\u062F\u064A\u0631");
    return;
  }
  const wb = new import_exceljs.default.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  autoWidth(ws, rows);
  ws.addRow(Object.keys(rows[0]));
  styleHeaderRow(ws.getRow(1));
  for (const r of rows) {
    const row = ws.addRow(Object.values(r));
    styleDataRow(row);
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await wb.xlsx.writeBuffer();
  downloadWorkbookBuffer(buffer, `${filename}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
}
__name(exportRowsToExcel, "exportRowsToExcel");
async function exportSheetsToExcel(filename, sheets) {
  const wb = new import_exceljs.default.Workbook();
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;
    const ws = wb.addWorksheet(sheet.name.slice(0, 31));
    autoWidth(ws, sheet.rows);
    ws.addRow(Object.keys(sheet.rows[0]));
    styleHeaderRow(ws.getRow(1));
    for (const r of sheet.rows) styleDataRow(ws.addRow(Object.values(r)));
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  if (wb.worksheets.length === 0) {
    alert("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0635\u062F\u064A\u0631");
    return;
  }
  const buffer = await wb.xlsx.writeBuffer();
  downloadWorkbookBuffer(buffer, `${filename}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
}
__name(exportSheetsToExcel, "exportSheetsToExcel");
function downloadWorkbookBuffer(buffer, filename) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
__name(downloadWorkbookBuffer, "downloadWorkbookBuffer");
async function readExcelFile(file, sheetName) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellFormula: false, cellHTML: false, cellDates: true });
  let targetName = workbook.SheetNames[0];
  if (sheetName) {
    const match = workbook.SheetNames.find((n) => n.trim().toLowerCase() === sheetName.trim().toLowerCase());
    if (match) targetName = match;
  }
  const sheet = workbook.Sheets[targetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}
__name(readExcelFile, "readExcelFile");

});
