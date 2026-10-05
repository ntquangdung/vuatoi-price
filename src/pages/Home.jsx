import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, configured, firebaseSetupError } from "../firebase/config";
import { login, logout } from "../firebase/auth";
import {
  saveCalculation,
  watchProducts,
  watchAccess,
  watchDealerAccess,
  watchDealerPrices,
} from "../services/data";
import { snapshotCalculation } from "../utils/calculation";
import {
  discountAmount,
  formatMoney,
  quantityValue,
  sectionTotal,
} from "../utils/currency";
import ProductSearch from "../components/ProductSearch";
import Icon from "../components/Icon";
import useOnline from "../hooks/useOnline";
const newSection = () => ({
  id: crypto.randomUUID(),
  name: "Mục 1",
  items: [],
});
export default function Home() {
  const online = useOnline();
  const [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [authError, setAuthError] = useState(""),
    [signingIn, setSigningIn] = useState(false),
    [isAdmin, setIsAdmin] = useState(false),
    [isDealerViewer, setIsDealerViewer] = useState(false),
    [dealerPrices, setDealerPrices] = useState({}),
    [dealerReady, setDealerReady] = useState(false),
    [dealerPriceError, setDealerPriceError] = useState("");
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(configured),
    [error, setError] = useState("");
  const [sections, setSections] = useState(() => [newSection()]),
    [showDealerPrice, setShowDealerPrice] = useState(false),
    [discountType, setDiscountType] = useState("percent"),
    [discountValue, setDiscountValue] = useState(""),
    [calculated, setCalculated] = useState(null),
    [saved, setSaved] = useState(false),
    [saving, setSaving] = useState(false),
    [saveMessage, setSaveMessage] = useState(""),
    [saveError, setSaveError] = useState("");
  const revision = useRef(0);
  const canViewDealer = isAdmin || isDealerViewer;
  const dealerVisible = canViewDealer && dealerReady && showDealerPrice;
  const pricedProducts = products.map((product) => ({
    ...product,
    dealerPrice:
      canViewDealer && dealerReady ? (dealerPrices[product.id] ?? null) : null,
  }));
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthReady(true);
      },
      () => {
        setAuthError(
          "Không thể kiểm tra đăng nhập Google. Vui lòng tải lại trang.",
        );
        setAuthReady(true);
      },
    );
  }, []);
  useEffect(() => {
    if (!configured || !user) {
      setProducts([]);
      return;
    }
    setLoading(true);
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
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.email) {
      setIsAdmin(false);
      setIsDealerViewer(false);
      return;
    }
    const onAccessError = () => {
      setIsAdmin(false);
      setIsDealerViewer(false);
      setDealerPriceError("Không thể kiểm tra quyền xem giá đại lý.");
    };
    const stopAdmin = watchAccess(user.email, setIsAdmin, onAccessError);
    const stopDealer = watchDealerAccess(
      user.email,
      setIsDealerViewer,
      onAccessError,
    );
    return () => {
      stopAdmin();
      stopDealer();
    };
  }, [user?.email]);
  useEffect(() => {
    if (!canViewDealer) {
      setShowDealerPrice(false);
      setDealerPrices({});
      setDealerReady(false);
      return;
    }
    setDealerReady(false);
    return watchDealerPrices(
      (prices) => {
        setDealerPrices(prices);
        setDealerReady(true);
        setDealerPriceError("");
      },
      () => {
        setDealerPriceError("Không thể tải giá đại lý. Vui lòng thử lại.");
        setDealerPrices({});
        setDealerReady(false);
        setShowDealerPrice(false);
      },
    );
  }, [canViewDealer]);
  useEffect(() => {
    revision.current += 1;
    setSaveMessage("");
    setSaveError("");
    setCalculated(null);
    setSaved(false);
  }, [
    sections,
    products,
    dealerPrices,
    canViewDealer,
    dealerReady,
    discountType,
    discountValue,
  ]);
  const signIn = async () => {
    setAuthError("");
    setSigningIn(true);
    try {
      await login();
    } catch (error) {
      const messages = {
        "auth/popup-closed-by-user":
          "Bạn đã đóng cửa sổ đăng nhập. Hãy thử lại.",
        "auth/popup-blocked":
          "Trình duyệt chặn cửa sổ Google. Hãy cho phép popup rồi thử lại.",
        "auth/unauthorized-domain":
          "Domain local chưa được thêm vào Firebase Auth.",
        "auth/network-request-failed":
          "Không thể kết nối Google. Hãy kiểm tra mạng rồi thử lại.",
      };
      setAuthError(
        messages[error.code] || "Đăng nhập chưa hoàn tất. Hãy thử lại.",
      );
    } finally {
      setSigningIn(false);
    }
  };
  const update = (id, fn) =>
    setSections((ss) => ss.map((s) => (s.id === id ? fn(s) : s)));
  const setQuantity = (sectionId, itemId, quantity) =>
    update(sectionId, (s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
    }));
  const formatDealerTotal = (total) =>
    total === null ? "Chưa đủ giá" : formatMoney(total);
  const retailSubtotal = sections.reduce(
    (sum, s) => sum + sectionTotal(s.items, products),
    0,
  );
  const discount = discountAmount(retailSubtotal, discountType, discountValue);
  const calculateAndSave = async () => {
    setSaveMessage("");
    setSaveError("");
    let snapshot;
    try {
      snapshot = snapshotCalculation(
        sections,
        pricedProducts,
        discountType,
        discountValue,
      );
    } catch (error) {
      setSaveError(error.message);
      return;
    }
    setCalculated(snapshot);
    setSaved(false);
    const currentRevision = revision.current;
    if (!online) {
      setSaveError("Đã tính tổng nhưng chưa lưu vì đang mất kết nối mạng.");
      return;
    }
    setSaving(true);
    try {
      if (!user?.email) throw new Error("missing-email");
      await saveCalculation(snapshot, user.email);
      if (revision.current === currentRevision) {
        setSaved(true);
        setSaveMessage("Đã tính tổng và lưu vào lịch sử cho Admin kiểm tra.");
      }
    } catch (error) {
      const messages = {
        "auth/popup-closed-by-user":
          "Bạn đã đóng cửa sổ đăng nhập. Đăng nhập Google để lưu lần tính.",
        "auth/popup-blocked":
          "Trình duyệt chặn cửa sổ đăng nhập. Cho phép popup rồi thử lại.",
        "auth/unauthorized-domain":
          "Domain này chưa được cho phép đăng nhập trên Firebase Auth.",
        "auth/network-request-failed":
          "Không thể kết nối Google/Firebase. Vui lòng thử lại.",
        "permission-denied": "Tài khoản Google chưa được phép lưu lịch sử.",
      };
      if (revision.current === currentRevision)
        setSaveError(
          messages[error.code] || "Không thể lưu lần tính. Vui lòng thử lại.",
        );
    } finally {
      setSaving(false);
    }
  };
  const resetCalculation = () => {
    setSections([newSection()]);
    setDiscountType("percent");
    setDiscountValue("");
    setShowDealerPrice(false);
    setCalculated(null);
    setSaved(false);
    setSaveMessage("");
    setSaveError("");
  };
  if (!configured || !authReady || !user)
    return (
      <main className="auth-card card home-auth">
        <span className="auth-icon">
          <Icon name="calculator" />
        </span>
        <p className="eyebrow">BẢNG TÍNH GIÁ VUA TỎI</p>
        <h1>Đăng nhập để bắt đầu.</h1>
        <p>
          Đăng nhập bằng Google để xem sản phẩm và tính giá. Giá đại lý chỉ hiện
          với Gmail được Admin cấp quyền.
        </p>
        {!configured && (
          <p role="alert" className="notice error">
            {firebaseSetupError || "Chưa cấu hình Firebase."}
          </p>
        )}
        {authError && (
          <p role="alert" className="notice error">
            {authError}
          </p>
        )}
        {!online && (
          <p role="alert" className="notice error">
            Đang mất kết nối mạng.
          </p>
        )}
        {configured && authReady && (
          <button
            className="login-button"
            disabled={signingIn || !online}
            onClick={signIn}
          >
            {signingIn ? "Đang đăng nhập…" : "Đăng nhập với Google"}
            <Icon name="arrow" />
          </button>
        )}
        {configured && !authReady && (
          <p role="status">Đang kiểm tra đăng nhập…</p>
        )}
      </main>
    );
  return (
    <main className="calculator-page">
      <div className="intro">
        <div>
          <p className="eyebrow">BẢNG GIÁ VUA TỎI</p>
          <h1>
            Tính giá sản phẩm<span className="title-dot">.</span>
          </h1>
          <p>Chọn sản phẩm, nhập số lượng rồi bấm Tính tổng.</p>
          <div className="home-account">
            <span className="status-dot" />
            <span>{user.email}</span>
            <button type="button" className="text-button" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </div>
        <div className="intro-actions">
          {!loading && configured && !error && online && (
            <span className="availability">
              <span className="status-dot" />
              {products.length} sản phẩm đang bán
            </span>
          )}
          {canViewDealer && !dealerPriceError ? (
            <button
              type="button"
              className={`dealer-toggle ${dealerVisible ? "active" : ""}`}
              aria-pressed={dealerVisible}
              disabled={!dealerReady}
              onClick={() => setShowDealerPrice((visible) => !visible)}
            >
              <span className="dealer-toggle-icon">
                <Icon name="eye" />
              </span>
              <span>
                <strong>
                  {dealerVisible ? "Đang hiện giá đại lý" : "Xem giá đại lý"}
                </strong>
                <small>
                  {dealerReady
                    ? dealerVisible
                      ? "Bấm để ẩn"
                      : "Giá và tổng riêng"
                    : "Đang tải giá…"}
                </small>
              </span>
            </button>
          ) : !canViewDealer ? (
            <span className="dealer-locked">
              <Icon name="eye" /> Giá đại lý cần Admin cấp quyền
            </span>
          ) : null}
        </div>
      </div>
      {dealerPriceError && (
        <p role="alert" className="notice error">
          {dealerPriceError}
        </p>
      )}
      {dealerVisible && (
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
              const p = pricedProducts.find((p) => p.id === item.productId);
              return (
                <div className="product-row" key={item.id}>
                  <div className="row-product">
                    <strong>{p?.name ?? "Sản phẩm không còn đang bán"}</strong>
                    <div className="muted">
                      {p
                        ? `Giá bán lẻ: ${formatMoney(p.price)} / ${p.unit}`
                        : "Chọn sản phẩm khác để tiếp tục"}
                    </div>
                    {dealerVisible && p && (
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
                      {dealerVisible ? "Thành tiền bán lẻ" : "Thành tiền"}
                    </small>
                    <strong>
                      {formatMoney(
                        (p?.price ?? 0) * quantityValue(item.quantity),
                      )}
                    </strong>
                    {dealerVisible && (
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
            {calculated && (
              <div className="section-total">
                <div className="total-pair">
                  <span>
                    Tổng {dealerVisible ? "bán lẻ " : ""}
                    {s.name || `Mục ${index + 1}`}
                  </span>
                  <strong>{formatMoney(calculated.retailSubtotal)}</strong>
                </div>
                {dealerVisible && (
                  <div className="total-pair dealer-total-pair">
                    <span>Tổng đại lý {s.name || `Mục ${index + 1}`}</span>
                    <strong>{formatDealerTotal(calculated.dealerTotal)}</strong>
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      <div className="discount-card card">
        <div>
          <p className="eyebrow">ƯU ĐÃI</p>
          <h2>Chiết khấu đơn hàng</h2>
          <p>Áp dụng cho tổng bán lẻ. Giá đại lý được tính riêng.</p>
        </div>
        <div className="discount-fields">
          <label>
            Hình thức
            <select
              value={discountType}
              onChange={(e) => {
                setDiscountType(e.target.value);
                setDiscountValue("");
              }}
            >
              <option value="percent">Giảm theo phần trăm (%)</option>
              <option value="amount">Giảm trực tiếp (đ)</option>
            </select>
          </label>
          <label>
            Mức chiết khấu
            <span className="discount-input">
              <input
                type="number"
                min="0"
                max={discountType === "percent" ? "100" : "1000000000000"}
                step="any"
                placeholder="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
              <span>{discountType === "percent" ? "%" : "đ"}</span>
            </span>
          </label>
        </div>
        <div className="discount-result" aria-live="polite">
          <span>Dự kiến giảm</span>
          <strong>
            {discount > 0 ? `-${formatMoney(discount)}` : formatMoney(0)}
          </strong>
        </div>
      </div>
      <div className="calculate-actions">
        <button
          type="button"
          disabled={saving || saved || !configured || loading}
          onClick={calculateAndSave}
        >
          <Icon name="calculator" />
          {saving
            ? "Đang lưu…"
            : calculated && !saved
              ? "Thử lưu lại"
              : "Tính tổng"}
        </button>
        {calculated && (
          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={resetCalculation}
          >
            Nhập lại từ 0
          </button>
        )}
      </div>
      <div className="grand-total">
        <span className="total-icon">
          <Icon name="calculator" />
        </span>
        <div className="grand-total-label">
          <span>
            {calculated?.discountAmount > 0
              ? "TỔNG SAU CHIẾT KHẤU"
              : dealerVisible
                ? "TỔNG BÁN LẺ"
                : "TỔNG TẤT CẢ"}
          </span>
          <small>
            {calculated
              ? `${calculated.lineCount} dòng sản phẩm`
              : "Chưa tính tổng"}
          </small>
        </div>
        <strong>{formatMoney(calculated?.total ?? 0)}</strong>
        {calculated?.discountAmount > 0 && (
          <div className="grand-discount-breakdown">
            <span>
              Tổng bán lẻ trước giảm: {formatMoney(calculated.retailSubtotal)}
            </span>
            <span>Chiết khấu: -{formatMoney(calculated.discountAmount)}</span>
          </div>
        )}
        {dealerVisible && (
          <div className="grand-dealer-total">
            <span>TỔNG ĐẠI LÝ</span>
            <strong>
              {calculated
                ? formatDealerTotal(calculated.dealerTotal)
                : formatMoney(0)}
            </strong>
          </div>
        )}
      </div>
      <p className="calculation-hint">
        Bấm Tính tổng để lưu lần tính vào lịch sử cho Admin kiểm tra.
      </p>
      {saveMessage && (
        <p role="status" className="notice">
          {saveMessage}
        </p>
      )}
      {saveError && (
        <p role="alert" className="notice error">
          {saveError}
        </p>
      )}
    </main>
  );
}
