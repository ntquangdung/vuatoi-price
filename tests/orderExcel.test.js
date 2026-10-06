import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildOrderWorkbook } from "../src/utils/orderExcel.js";

const entry = {
  id: "internal-record-1",
  savedBy: "customer@gmail.com",
  createdAt: { toDate: () => new Date("2026-10-06T02:30:00.000Z") },
  sections: [
    {
      name: "Nguyễn Văn A",
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

test("one retail order notice excludes internal IDs, Gmail and all dealer prices", async () => {
  const buffer = await buildOrderWorkbook(
    entry,
    ExcelJS,
    false,
  ).xlsx.writeBuffer();
  const readBack = new ExcelJS.Workbook();
  await readBack.xlsx.load(buffer);
  const sheet = readBack.getWorksheet("Thông báo đơn hàng");
  assert.equal(sheet.getCell("A1").value, "Công Ty TNHH Thảo Dược CMA Vua Tỏi");
  assert.equal(
    sheet.getCell("A2").value,
    "Địa chỉ : 450 Nguyễn Lương Bằng - Đà Nẵng",
  );
  assert.equal(sheet.getCell("A3").value, "Sđt : 0935.176.188");
  assert.equal(sheet.getCell("A5").value, "THÔNG BÁO ĐƠN HÀNG");
  assert.equal(sheet.getCell("A8").value, "Thông tin khách hàng");
  assert.equal(sheet.getCell("C8").value, "Nguyễn Văn A");
  assert.equal(sheet.getCell("C9").value, "450 Nguyễn Lương Bằng - Đà Nẵng");
  assert.equal(sheet.getCell("C10").value, "TK A Định - LP");
  assert.equal(sheet.getCell("B13").value, "Tỏi đen");
  assert.equal(sheet.getCell("F13").value, 500000);
  assert.equal(sheet.getCell("F16").value, 450000);
  assert.equal(sheet.columnCount, 6);
  const values = JSON.stringify(sheet.getSheetValues());
  assert.doesNotMatch(
    values,
    /customer@gmail.com|internal-record-1|200000|400000/,
  );
});

test("authorized dealer order notice includes retail and saved dealer prices", async () => {
  const buffer = await buildOrderWorkbook(
    entry,
    ExcelJS,
    true,
  ).xlsx.writeBuffer();
  const readBack = new ExcelJS.Workbook();
  await readBack.xlsx.load(buffer);
  const sheet = readBack.getWorksheet("Thông báo đơn hàng");
  assert.equal(sheet.getCell("E13").value, 250000);
  assert.equal(sheet.getCell("G13").value, 200000);
  assert.equal(sheet.getCell("H13").value, 400000);
  assert.equal(sheet.getCell("F16").value, 450000);
  assert.equal(sheet.getCell("H17").value, 400000);
});

test("dealer columns stay hidden when the saved order lacks complete dealer prices", () => {
  const incomplete = {
    ...entry,
    dealerTotal: null,
    sections: [
      {
        ...entry.sections[0],
        items: [{ ...entry.sections[0].items[0], dealerPrice: null }],
      },
    ],
  };
  const sheet = buildOrderWorkbook(incomplete, ExcelJS, true).getWorksheet(
    "Thông báo đơn hàng",
  );
  assert.equal(sheet.columnCount, 6);
  assert.equal(sheet.getCell("G13").value, null);
});
