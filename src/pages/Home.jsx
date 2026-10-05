import { useEffect, useState } from "react";
import { configured, firebaseSetupError } from "../firebase/config";
import { watchProducts } from "../services/data";
import {
  dealerSectionTotal,
  formatMoney,
  quantityValue,
  sectionTotal,
} from "../utils/currency";
import ProductSearch from "../components/ProductSearch";
import Icon from "../components/Icon";
import useOnline from "../hooks/useOnline";
const newSection = (n) => ({
  id: crypto.randomUUID(),
  name: `Mục ${n}`,
  items: [],
});
export default function Home() {
  const online = useOnline();
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(configured),
    [error, setError] = useState("");
  const [sections, setSections] = useState(() => [newSection(1)]),
    [nextNumber, setNextNumber] = useState(2),
    [showDealerPrice, setShowDealerPrice] = useState(false);
  useEffect(() => {
    if (!configured) return;
    return watchProducts(
      false,
      (p) => {
        setProducts(p);
        setLoading(false);
        setError("");
      },
      () => {
        setError(
          "Không thể kết nối Firebase. Vui lòng thử lại hoặc kiểm tra kết nối mạng.",
        );
        setLoading(false);
      },
    );
  }, []);
  const update = (id, fn) =>
    setSections((ss) => ss.map((s) => (s.id === id ? fn(s) : s)));
  const setQuantity = (sectionId, itemId, quantity) =>
    update(sectionId, (s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
    }));
  const dealerTotals = sections.map((s) =>
    dealerSectionTotal(s.items, products),
  );
  const grandDealerTotal = dealerTotals.every((total) => total !== null)
    ? dealerTotals.reduce((sum, total) => sum + total, 0)
    : null;
  const formatDealerTotal = (total) =>
    total === null ? "Chưa đủ giá" : formatMoney(total);
  return (
    <main className="calculator-page">
      <div className="intro">
        <div>
          <p className="eyebrow">BẢNG GIÁ VUA TỎI</p>
          <h1>
            Tính giá sản phẩm<span className="title-dot">.</span>
          </h1>
          <p>Chọn sản phẩm, nhập số lượng. Tổng tiền tự cập nhật.</p>
        </div>
        <div className="intro-actions">
          {!loading && configured && !error && online && (
            <span className="availability">
              <span className="status-dot" />
              {products.length} sản phẩm đang bán
            </span>
          )}
          <button
            type="button"
            className={`dealer-toggle ${showDealerPrice ? "active" : ""}`}
            aria-pressed={showDealerPrice}
            onClick={() => setShowDealerPrice((visible) => !visible)}
          >
            <span className="dealer-toggle-icon">
              <Icon name="eye" />
            </span>
            <span>
              <strong>
                {showDealerPrice ? "Đang hiện giá đại lý" : "Xem giá đại lý"}
              </strong>
              <small>
                {showDealerPrice ? "Bấm để ẩn" : "Giá và tổng riêng"}
              </small>
            </span>
          </button>
        </div>
      </div>
      {showDealerPrice && (
        <p className="dealer-note">
          Tổng giá đại lý được tính riêng; tổng bán lẻ vẫn giữ nguyên.
        </p>
      )}
      {!configured && (
        <p role="alert" className="notice">
          {firebaseSetupError ||
            "Chưa cấu hình Firebase. Điền cấu hình project vuatoi-price vào .env.local để tải sản phẩm."}
        </p>
      )}
      {!online && configured && (
        <p role="alert" className="notice error">
          Đang mất kết nối mạng. Giá sản phẩm chưa được cập nhật từ Firebase.
        </p>
      )}
      {loading && online && (
        <p role="status" className="notice">
          Đang tải sản phẩm…
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!loading && online && configured && !error && !products.length && (
        <p className="notice">
          Chưa có sản phẩm đang bán. Admin có thể thêm sản phẩm để bắt đầu.
        </p>
      )}
      <div className="section-list">
        {sections.map((s, index) => (
          <section
            className="card price-section"
            key={s.id}
            aria-label={s.name || `Mục ${index + 1}`}
          >
            <div className="section-heading">
              <span className="section-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="section-name">
                <input
                  aria-label={`Tên mục ${index + 1}`}
                  value={s.name}
                  placeholder={`Mục ${index + 1}`}
                  onChange={(e) =>
                    update(s.id, (v) => ({ ...v, name: e.target.value }))
                  }
                />
                <small>Nhấn vào tên để đổi tên mục</small>
              </div>
              <button
                className="quiet remove-section"
                onClick={() =>
                  setSections((ss) => ss.filter((v) => v.id !== s.id))
                }
                aria-label={`Xóa ${s.name || "mục"}`}
              >
                <Icon name="trash" />
                <span>Xóa mục</span>
              </button>
            </div>
            {!s.items.length && (
              <div className="section-empty">
                <span className="empty-icon">
                  <Icon name="package" />
                </span>
                <div>
                  <strong>Thêm sản phẩm đầu tiên</strong>
                  <p>Tìm và chọn sản phẩm bên dưới để bắt đầu tính giá.</p>
                </div>
              </div>
            )}
            {s.items.map((item) => {
              const p = products.find((p) => p.id === item.productId);
              return (
                <div className="product-row" key={item.id}>
                  <div className="row-product">
                    <strong>{p?.name ?? "Sản phẩm không còn đang bán"}</strong>
                    <div className="muted">
                      {p
                        ? `Giá bán lẻ: ${formatMoney(p.price)} / ${p.unit}`
                        : "Chọn sản phẩm khác để tiếp tục"}
                    </div>
                    {showDealerPrice && p && (
                      <div className="dealer-price">
                        <span>GIÁ ĐẠI LÝ</span>
                        <strong>
                          {p.dealerPrice == null
                            ? "Chưa có giá"
                            : `${formatMoney(p.dealerPrice)} / ${p.unit}`}
                        </strong>
                      </div>
                    )}
                    <select
                      aria-label="Đổi sản phẩm"
                      value={p?.id ?? ""}
                      onChange={(e) =>
                        update(s.id, (v) => ({
                          ...v,
                          items: v.items.map((i) =>
                            i.id === item.id
                              ? { ...i, productId: e.target.value }
                              : i,
                          ),
                        }))
                      }
                    >
                      <option value="" disabled>
                        Đổi sản phẩm
                      </option>
                      {products.map((v) => (
                        <option value={v.id} key={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="quantity-label">
                    Số lượng
                    <span className="quantity-control">
                      <button
                        type="button"
                        className="quantity-button"
                        aria-label={`Giảm số lượng ${p?.name ?? "sản phẩm"}`}
                        disabled={quantityValue(item.quantity) === 0}
                        onClick={() =>
                          setQuantity(
                            s.id,
                            item.id,
                            Math.max(0, quantityValue(item.quantity) - 1),
                          )
                        }
                      >
                        <Icon name="minus" />
                      </button>
                      <input
                        aria-label={`Số lượng ${p?.name ?? "sản phẩm"}`}
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          setQuantity(
                            s.id,
                            item.id,
                            e.target.value === ""
                              ? ""
                              : quantityValue(e.target.value),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="quantity-button"
                        aria-label={`Tăng số lượng ${p?.name ?? "sản phẩm"}`}
                        onClick={() =>
                          setQuantity(
                            s.id,
                            item.id,
                            quantityValue(item.quantity) + 1,
                          )
                        }
                      >
                        <Icon name="plus" />
                      </button>
                    </span>
                  </label>
                  <div className="line-total">
                    <small>
                      {showDealerPrice ? "Thành tiền bán lẻ" : "Thành tiền"}
                    </small>
                    <strong>
                      {formatMoney(
                        (p?.price ?? 0) * quantityValue(item.quantity),
                      )}
                    </strong>
                    {showDealerPrice && (
                      <div className="dealer-line-total">
                        <small>THÀNH TIỀN ĐẠI LÝ</small>
                        <strong>
                          {p?.dealerPrice == null
                            ? "Chưa có giá"
                            : formatMoney(
                                p.dealerPrice * quantityValue(item.quantity),
                              )}
                        </strong>
                      </div>
                    )}
                  </div>
                  <button
                    className="quiet remove-row"
                    aria-label={`Xóa dòng ${p?.name ?? ""}`}
                    onClick={() =>
                      update(s.id, (v) => ({
                        ...v,
                        items: v.items.filter((i) => i.id !== item.id),
                      }))
                    }
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              );
            })}
            <ProductSearch
              products={products}
              label="Thêm sản phẩm"
              onSelect={(productId) =>
                update(s.id, (v) => ({
                  ...v,
                  items: [
                    ...v.items,
                    { id: crypto.randomUUID(), productId, quantity: 1 },
                  ],
                }))
              }
            />
            <div className="section-total">
              <div className="total-pair">
                <span>
                  Tổng {showDealerPrice ? "bán lẻ " : ""}
                  {s.name || `Mục ${index + 1}`}
                </span>
                <strong>{formatMoney(sectionTotal(s.items, products))}</strong>
              </div>
              {showDealerPrice && (
                <div className="total-pair dealer-total-pair">
                  <span>Tổng đại lý {s.name || `Mục ${index + 1}`}</span>
                  <strong>{formatDealerTotal(dealerTotals[index])}</strong>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
      <button
        className="add-section"
        onClick={() => {
          setSections((s) => [...s, newSection(nextNumber)]);
          setNextNumber((n) => n + 1);
        }}
      >
        <Icon name="plus" />
        Tạo mục mới
      </button>
      <div className="grand-total">
        <span className="total-icon">
          <Icon name="calculator" />
        </span>
        <div className="grand-total-label">
          <span>{showDealerPrice ? "TỔNG BÁN LẺ" : "TỔNG TẤT CẢ"}</span>
          <small>
            {sections.length} mục ·{" "}
            {sections.reduce((n, s) => n + s.items.length, 0)} dòng sản phẩm
          </small>
        </div>
        <strong>
          {formatMoney(
            sections.reduce(
              (sum, s) => sum + sectionTotal(s.items, products),
              0,
            ),
          )}
        </strong>
        {showDealerPrice && (
          <div className="grand-dealer-total">
            <span>TỔNG ĐẠI LÝ</span>
            <strong>{formatDealerTotal(grandDealerTotal)}</strong>
          </div>
        )}
      </div>
    </main>
  );
}
