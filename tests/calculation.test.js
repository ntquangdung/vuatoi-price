import test from "node:test";
import assert from "node:assert/strict";
import { snapshotCalculation } from "../src/utils/calculation.js";

test("saved history preserves products, quantities, retail discount and dealer total", () => {
  const sections = [
    { name: "Mục 1", items: [{ productId: "a", quantity: 2 }] },
  ];
  const products = [
    { id: "a", name: "Tỏi", unit: "kg", price: 250000, dealerPrice: 200000 },
  ];
  const snapshot = snapshotCalculation(sections, products, "percent", "10");
  assert.equal(snapshot.total, 450000);
  assert.equal(snapshot.dealerTotal, 400000);
  assert.equal(snapshot.discountAmount, 50000);
  assert.deepEqual(snapshot.sections[0].items[0], {
    name: "Tỏi",
    unit: "kg",
    price: 250000,
    dealerPrice: 200000,
    quantity: 2,
  });
  products[0].price = 300000;
  assert.equal(snapshot.sections[0].items[0].price, 250000);
});
