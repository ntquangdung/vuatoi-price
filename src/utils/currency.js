export const formatMoney = (value) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)}đ`;
export const quantityValue = (value) =>
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
export const sectionTotal = (items, products) =>
  items.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => p.id === item.productId)?.price ?? 0) *
        quantityValue(item.quantity),
    0,
  );
export const dealerSectionTotal = (items, products) =>
  items.reduce((sum, item) => {
    if (sum === null) return null;
    const quantity = quantityValue(item.quantity);
    if (quantity === 0) return sum;
    const dealerPrice = products.find(
      (p) => p.id === item.productId,
    )?.dealerPrice;
    return Number.isFinite(dealerPrice) ? sum + dealerPrice * quantity : null;
  }, 0);
