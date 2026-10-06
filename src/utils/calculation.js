import {
  dealerSectionTotal,
  discountAmount,
  quantityValue,
} from "./currency.js";
import { paymentMethods } from "./paymentMethods.js";

export const snapshotCalculation = (
  sections,
  products,
  discountType,
  discountValue,
) => {
  const entries = sections
    .map((section) => {
      if (
        section.items.length > 0 &&
        !paymentMethods.includes(section.paymentMethod)
      )
        throw new Error("Hãy chọn phương thức thanh toán trước khi tính tổng.");
      return {
        name: section.name.trim().slice(0, 100) || "Thông tin khách hàng",
        address: (section.address || "").trim().slice(0, 300),
        paymentMethod: section.paymentMethod,
        items: section.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          const quantity = quantityValue(item.quantity);
          if (!product || !Number.isFinite(quantity) || quantity > 1000000)
            throw new Error(
              "Có sản phẩm hoặc số lượng không hợp lệ. Vui lòng kiểm tra lại.",
            );
          return {
            name: product.name,
            unit: product.unit,
            price: product.price,
            dealerPrice: product.dealerPrice ?? null,
            quantity,
          };
        }),
      };
    })
    .filter((section) => section.items.length > 0);
  const lineCount = entries.reduce(
    (count, section) => count + section.items.length,
    0,
  );
  if (lineCount === 0)
    throw new Error("Hãy thêm sản phẩm trước khi lưu lịch sử.");
  if (entries.length !== 1 || lineCount > 100)
    throw new Error(
      "Mỗi lần tính chỉ dùng một mục và tối đa 100 dòng sản phẩm.",
    );
  const retailSubtotal = entries.reduce(
    (sum, section) =>
      sum +
      section.items.reduce(
        (value, item) => value + item.price * item.quantity,
        0,
      ),
    0,
  );
  const rawDiscount = Number(discountValue) || 0;
  const normalizedDiscount = Math.max(
    0,
    Math.min(rawDiscount, discountType === "percent" ? 100 : 1000000000000),
  );
  const reduction = discountAmount(
    retailSubtotal,
    discountType,
    normalizedDiscount,
  );
  const dealerTotals = sections.map((section) =>
    dealerSectionTotal(section.items, products),
  );
  return {
    sections: entries,
    lineCount,
    retailSubtotal,
    discountType,
    discountValue: normalizedDiscount,
    discountAmount: reduction,
    total: retailSubtotal - reduction,
    dealerTotal: dealerTotals.every((value) => value !== null)
      ? dealerTotals.reduce((sum, value) => sum + value, 0)
      : null,
  };
};
