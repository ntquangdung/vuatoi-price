const companyLines = [
  "Công Ty TNHH Thảo Dược CMA Vua Tỏi",
  "Địa chỉ : 450 Nguyễn Lương Bằng - Đà Nẵng",
  "Sđt : 0935.176.188",
];

const moneyFormat = '#,##0" đ"';
const green = "31583B";
const pale = "EAF1E8";
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
const textOr = (value, fallback) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export function buildHistoryWorkbook(entries, ExcelJS) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VUA TỎI PRICE";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Lịch sử tính giá", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
    },
  });
  sheet.columns = [
    { width: 7 },
    { width: 37 },
    { width: 16 },
    { width: 14 },
    { width: 21 },
    { width: 23 },
    { width: 21 },
    { width: 23 },
  ];
  for (let index = 0; index < companyLines.length; index += 1) {
    const row = index + 1;
    sheet.mergeCells(row, 1, row, 8);
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
  sheet.mergeCells("A5:H5");
  sheet.getCell("A5").value = "LỊCH SỬ TÍNH GIÁ";
  sheet.getCell("A5").font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: `FF${green}` },
  };
  sheet.getRow(5).height = 29;
  sheet.mergeCells("A6:H6");
  sheet.getCell("A6").value =
    `Xuất lúc ${dateText({ toDate: () => new Date() })} · ${entries.length} lần tính`;
  sheet.getCell("A6").font = {
    name: "Arial",
    size: 10,
    color: { argb: "FF596B5C" },
  };

  let row = 8;
  if (!entries.length) {
    sheet.mergeCells(row, 1, row, 8);
    sheet.getCell(row, 1).value = "Chưa có lần tính nào được lưu.";
    return workbook;
  }
  for (const [index, entry] of entries.entries()) {
    const section = entry.sections?.[0] || {};
    sheet.mergeCells(row, 1, row, 8);
    const heading = sheet.getCell(row, 1);
    heading.value = `LẦN TÍNH ${index + 1}  ·  ${dateText(entry.createdAt)}`;
    heading.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${green}` },
    };
    heading.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    heading.alignment = { vertical: "middle" };
    sheet.getRow(row).height = 27;
    row += 1;
    for (const [label, value] of [
      ["Mã lưu", entry.id || "—"],
      ["Gmail lưu", entry.savedBy || "—"],
      ["Tên mục", textOr(section.name, "Mục 1")],
      ["Địa chỉ", textOr(section.address, "Chưa nhập")],
      ["Thanh toán", textOr(section.paymentMethod, "Chưa chọn")],
    ]) {
      sheet.mergeCells(row, 1, row, 2);
      sheet.mergeCells(row, 3, row, 8);
      sheet.getCell(row, 1).value = label;
      sheet.getCell(row, 1).font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: `FF${green}` },
      };
      const valueCell = sheet.getCell(row, 3);
      valueCell.value = value;
      valueCell.alignment = { vertical: "middle", wrapText: true };
      sheet.getRow(row).height = label === "Địa chỉ"
        ? Math.max(30, Math.ceil(String(value).length / 105) * 18)
        : 21;
      row += 1;
    }
    const headers = [
      "STT",
      "Sản phẩm",
      "Đơn vị",
      "Số lượng",
      "Đơn giá bán lẻ",
      "Thành tiền bán lẻ",
      "Giá đại lý",
      "Thành tiền đại lý",
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
    for (const [itemIndex, item] of (section.items || []).entries()) {
      const values = [
        itemIndex + 1,
        item.name,
        item.unit,
        item.quantity,
        item.price,
        item.quantity * item.price,
        item.dealerPrice ?? "Chưa có giá",
        item.dealerPrice == null ? "" : item.quantity * item.dealerPrice,
      ];
      values.forEach((value, column) => {
        const cell = sheet.getCell(row, column + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: column === 1 };
        if ([4, 5, 6, 7].includes(column) && typeof value === "number")
          cell.numFmt = moneyFormat;
        if (itemIndex % 2 === 1)
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF7F9F5" },
          };
      });
      sheet.getRow(row).height = Math.max(25, Math.ceil(String(item.name || "").length / 35) * 18);
      row += 1;
    }
    const totalLines = [
      ["Tổng bán lẻ", entry.retailSubtotal],
      [
        entry.discountType === "percent"
          ? `Chiết khấu (${entry.discountValue}%)`
          : `Chiết khấu (${entry.discountValue} đ)`,
        -entry.discountAmount,
      ],
      ["TỔNG SAU GIẢM", entry.total],
    ];
    for (const [label, value] of totalLines) {
      sheet.mergeCells(row, 1, row, 5);
      sheet.getCell(row, 1).value = label;
      sheet.getCell(row, 6).value = value;
      sheet.getCell(row, 6).numFmt = moneyFormat;
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
        sheet.getCell(row, 7).value = "Tổng đại lý";
        sheet.getCell(row, 7).font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: `FF${green}` },
        };
        const dealerCell = sheet.getCell(row, 8);
        dealerCell.value = entry.dealerTotal ?? "Chưa đủ giá";
        if (entry.dealerTotal != null) dealerCell.numFmt = moneyFormat;
        dealerCell.font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: `FF${green}` },
        };
      }
      sheet.getRow(row).height = 24;
      row += 1;
    }
    row += 2;
  }
  sheet.views = [{ state: "frozen", ySplit: 6 }];
  return workbook;
}
