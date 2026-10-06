const companyLines = [
  "Công Ty TNHH Thảo Dược CMA Vua Tỏi",
  "Địa chỉ : 450 Nguyễn Lương Bằng - Đà Nẵng",
  "Sđt : 0935.176.188",
];

const moneyFormat = '#,##0" đ"';
const green = "31583B";
const pale = "EAF1E8";
const textOr = (value, fallback) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;
const dateText = (timestamp) => {
  const date = timestamp?.toDate?.();
  return date
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date)
    : "Chưa có thời gian";
};

export function buildOrderWorkbook(entry, ExcelJS, dealerAuthorized) {
  const section = entry.sections?.[0];
  if (!section) throw new Error("Lần tính này không có thông tin đơn hàng.");
  const items = section.items || [];
  const showDealer = Boolean(
    dealerAuthorized &&
    entry.dealerTotal != null &&
    items.length &&
    items.every((item) => typeof item.dealerPrice === "number"),
  );
  const lastColumn = showDealer ? 8 : 6;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VUA TỎI PRICE";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Thông báo đơn hàng", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
    },
  });
  sheet.columns = [
    { width: 7 },
    { width: 38 },
    { width: 16 },
    { width: 14 },
    { width: 22 },
    { width: 24 },
    ...(showDealer ? [{ width: 21 }, { width: 24 }] : []),
  ];
  const mergeFull = (row) => sheet.mergeCells(row, 1, row, lastColumn);
  for (let index = 0; index < companyLines.length; index += 1) {
    const row = index + 1;
    mergeFull(row);
    const cell = sheet.getCell(row, 1);
    cell.value = companyLines[index];
    cell.font = {
      name: "Times New Roman",
      size: 12,
      bold: true,
      italic: true,
      color: { argb: "FF1E261F" },
    };
    cell.alignment = { vertical: "middle" };
    sheet.getRow(row).height = 20;
  }
  mergeFull(5);
  sheet.getCell(5, 1).value = "THÔNG BÁO ĐƠN HÀNG";
  sheet.getCell(5, 1).font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: `FF${green}` },
  };
  sheet.getRow(5).height = 30;
  mergeFull(6);
  sheet.getCell(6, 1).value = `Ngày lập: ${dateText(entry.createdAt)}`;
  sheet.getCell(6, 1).font = {
    name: "Arial",
    size: 10,
    color: { argb: "FF596B5C" },
  };

  let row = 8;
  for (const [label, value] of [
    ["Thông tin khách hàng", textOr(section.name, "Chưa nhập")],
    ["Địa chỉ", textOr(section.address, "Chưa nhập")],
    ["Thanh toán", textOr(section.paymentMethod, "Chưa chọn")],
  ]) {
    sheet.mergeCells(row, 1, row, 2);
    sheet.mergeCells(row, 3, row, lastColumn);
    const labelCell = sheet.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: `FF${green}` },
    };
    const valueCell = sheet.getCell(row, 3);
    valueCell.value = value;
    valueCell.alignment = { vertical: "middle", wrapText: true };
    sheet.getRow(row).height =
      label === "Địa chỉ"
        ? Math.max(29, Math.ceil(String(value).length / 95) * 18)
        : 23;
    row += 1;
  }
  row += 1;
  const headers = [
    "STT",
    "Sản phẩm",
    "Đơn vị",
    "Số lượng",
    "Đơn giá bán lẻ",
    "Thành tiền bán lẻ",
    ...(showDealer ? ["Giá đại lý", "Thành tiền đại lý"] : []),
  ];
  headers.forEach((header, column) => {
    const cell = sheet.getCell(row, column + 1);
    cell.value = header;
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: `FF${green}` },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${pale}` },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  sheet.getRow(row).height = 30;
  row += 1;
  for (const [index, item] of items.entries()) {
    const values = [
      index + 1,
      item.name,
      item.unit,
      item.quantity,
      item.price,
      item.quantity * item.price,
      ...(showDealer
        ? [item.dealerPrice, item.quantity * item.dealerPrice]
        : []),
    ];
    values.forEach((value, column) => {
      const cell = sheet.getCell(row, column + 1);
      cell.value = value;
      cell.alignment = { vertical: "middle", wrapText: column === 1 };
      if (column >= 4 && typeof value === "number") cell.numFmt = moneyFormat;
      if (index % 2 === 1)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F9F5" },
        };
    });
    sheet.getRow(row).height = Math.max(
      25,
      Math.ceil(String(item.name || "").length / 35) * 18,
    );
    row += 1;
  }
  for (const [label, value] of [
    ["Tổng bán lẻ", entry.retailSubtotal],
    [
      entry.discountType === "percent"
        ? `Chiết khấu (${entry.discountValue}%)`
        : `Chiết khấu (${entry.discountValue} đ)`,
      -entry.discountAmount,
    ],
    ["TỔNG SAU GIẢM", entry.total],
  ]) {
    sheet.mergeCells(row, 1, row, 5);
    sheet.getCell(row, 1).value = label;
    const amount = sheet.getCell(row, 6);
    amount.value = value;
    amount.numFmt = moneyFormat;
    if (label === "TỔNG SAU GIẢM") {
      for (const column of [1, 6]) {
        const cell = sheet.getCell(row, column);
        cell.font = {
          name: "Arial",
          size: 11,
          bold: true,
          color: { argb: `FF${green}` },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${pale}` },
        };
      }
    }
    sheet.getRow(row).height = 24;
    row += 1;
  }
  if (showDealer) {
    sheet.mergeCells(row, 1, row, 7);
    sheet.getCell(row, 1).value = "TỔNG ĐẠI LÝ";
    sheet.getCell(row, 1).font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: `FF${green}` },
    };
    const dealerTotal = sheet.getCell(row, 8);
    dealerTotal.value = entry.dealerTotal;
    dealerTotal.numFmt = moneyFormat;
    dealerTotal.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: `FF${green}` },
    };
    sheet.getRow(row).height = 24;
  }
  sheet.pageSetup.printArea = `A1:${showDealer ? "H" : "F"}${row}`;
  return workbook;
}
