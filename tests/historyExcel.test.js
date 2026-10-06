import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildHistoryWorkbook } from "../src/utils/historyExcel.js";

test("admin export keeps company header and full saved calculation data in XLSX", async () => {
  const entry = {
    id: "record-1",
    savedBy: "customer@gmail.com",
    createdAt: { toDate: () => new Date("2026-10-06T02:30:00.000Z") },
    sections: [
      {
        name: "Mục khách hàng",
        address: "450 Nguyễn Lương Bằng - Đà Nẵng",
        paymentMethod: "TK A Định - LP",
        items: [
          {
            name: "Tỏi đen",
            unit: "kg",
            quantity: 2,
            price: 250000,
            dealerPrice: 200000,
          },
        ],
      },
    ],
    retailSubtotal: 500000,
    discountType: "percent",
    discountValue: 10,
    discountAmount: 50000,
    total: 450000,
    dealerTotal: 400000,
  };
  const buffer = await buildHistoryWorkbook(
    [entry],
    ExcelJS,
  ).xlsx.writeBuffer();
  const readBack = new ExcelJS.Workbook();
  await readBack.xlsx.load(buffer);
  const sheet = readBack.getWorksheet("Lịch sử tính giá");
  assert.equal(sheet.getCell("A1").value, "Công Ty TNHH Thảo Dược CMA Vua Tỏi");
  assert.equal(
    sheet.getCell("A2").value,
    "Địa chỉ : 450 Nguyễn Lương Bằng - Đà Nẵng",
  );
  assert.equal(sheet.getCell("A3").value, "Sđt : 0935.176.188");
  assert.equal(sheet.getCell("C10").value, "customer@gmail.com");
  assert.equal(sheet.getCell("C11").value, "Mục khách hàng");
  assert.equal(sheet.getCell("C12").value, "450 Nguyễn Lương Bằng - Đà Nẵng");
  assert.equal(sheet.getCell("C13").value, "TK A Định - LP");
  assert.equal(sheet.getCell("B15").value, "Tỏi đen");
  assert.equal(sheet.getCell("F15").value, 500000);
  assert.equal(sheet.getCell("F18").value, 450000);
  assert.equal(sheet.getCell("H18").value, 400000);
});

test("older history without address or payment method exports clearly", async () => {
  const workbook = buildHistoryWorkbook(
    [
      {
        id: "old",
        sections: [{ name: "Mục 1", items: [] }],
        retailSubtotal: 0,
        discountType: "amount",
        discountValue: 0,
        discountAmount: 0,
        total: 0,
        dealerTotal: null,
      },
    ],
    ExcelJS,
  );
  const sheet = workbook.getWorksheet("Lịch sử tính giá");
  assert.equal(sheet.getCell("C12").value, "Chưa nhập");
  assert.equal(sheet.getCell("C13").value, "Chưa chọn");
  assert.equal(sheet.getCell("H17").value, "Chưa đủ giá");
});
