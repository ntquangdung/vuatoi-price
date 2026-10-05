import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMoney,
  quantityValue,
  sectionTotal,
  dealerSectionTotal,
} from "../src/utils/currency.js";
test("Vietnamese currency and numeric quantity validation", () => {
  assert.equal(formatMoney(1250000), "1.250.000đ");
  assert.equal(quantityValue(-2), 0);
  assert.equal(quantityValue("bad"), 0);
  assert.equal(quantityValue("0.5"), 0.5);
});
test("Multiple sections reflect price updates, product removal and quantity edits", () => {
  const products = [
    { id: "a", price: 250000, dealerPrice: 200000 },
    { id: "b", price: 450000, dealerPrice: 360000 },
  ];
  const items = [
    { productId: "a", quantity: 2 },
    { productId: "b", quantity: 1 },
  ];
  assert.equal(sectionTotal(items, products), 950000);
  assert.equal(dealerSectionTotal(items, products), 760000);
  assert.equal(
    sectionTotal([{ productId: "a", quantity: 0.5 }], products),
    125000,
  );
  assert.equal(sectionTotal(items, [{ id: "a", price: 300000 }]), 600000);
  assert.equal(sectionTotal([], products), 0);
  assert.equal(sectionTotal([{ productId: "a", quantity: "" }], products), 0);
  assert.equal(
    dealerSectionTotal(
      [{ productId: "a", quantity: 1 }],
      [{ id: "a", price: 250000 }],
    ),
    null,
  );
  assert.equal(
    dealerSectionTotal(
      [{ productId: "a", quantity: 0 }],
      [{ id: "a", price: 250000 }],
    ),
    0,
  );
});
