import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { configured, auth, firebaseSetupError } from "../firebase/config";
import { login, logout } from "../firebase/auth";
import {
  watchAccess,
  watchProducts,
  watchAdmins,
  saveProduct,
  toggleProduct,
  saveAdmin,
  toggleAdmin,
  removeAdmin,
  normalizeEmail,
} from "../services/data";
import { formatMoney } from "../utils/currency";
import useOnline from "../hooks/useOnline";
import Icon from "../components/Icon";
const blank = {
  name: "",
  unit: "kg",
  price: "",
  dealerPrice: "",
  active: true,
};
export default function Admin() {
  const online = useOnline();
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [allowed, setAllowed] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(""),
    [signingIn, setSigningIn] = useState(false);
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAllowed(false);
      setChecking(Boolean(u));
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (!user?.email) return;
    return watchAccess(
      user.email,
      (a) => {
        setAllowed(a);
        setChecking(false);
      },
      () => {
        setAllowed(false);
        setChecking(false);
        setError("Không thể kiểm tra quyền truy cập Firebase.");
      },
    );
  }, [user]);
  const act = async (fn) => {
    if (!online && !user) {
      setError(
        "Đang mất kết nối mạng. Vui lòng kết nối lại để đăng nhập Google.",
      );
      return;
    }
    setSigningIn(true);
    try {
      setError("");
      await fn();
    } catch (error) {
      console.info("Firebase Auth:", error.code);
      const messages = {
        "auth/popup-closed-by-user":
          "Cửa sổ đăng nhập đã đóng. Vui lòng đăng nhập lại và hoàn tất chọn tài khoản Google.",
        "auth/popup-blocked":
          "Trình duyệt chặn cửa sổ đăng nhập. Cho phép popup cho trang này rồi thử lại.",
        "auth/cancelled-popup-request":
          "Một lần đăng nhập khác đang được xử lý. Vui lòng thử lại.",
        "auth/unauthorized-domain":
          "Domain này chưa được cho phép đăng nhập. Vui lòng liên hệ Admin để cập nhật Firebase Auth.",
        "auth/network-request-failed":
          "Không thể kết nối Google/Firebase. Kiểm tra mạng rồi thử lại.",
        "auth/operation-not-allowed":
          "Google Login chưa được bật trên Firebase. Vui lòng liên hệ Admin.",
      };
      setError(
        messages[error.code] ?? "Đăng nhập chưa hoàn tất. Vui lòng thử lại.",
      );
    } finally {
      setSigningIn(false);
    }
  };
  if (!configured)
    return (
      <main>
        <h1>Admin</h1>
        <p role="alert" className="notice">
          {firebaseSetupError || "Chưa cấu hình Firebase trong .env.local."}
        </p>
      </main>
    );
  if (!ready || checking)
    return (
      <main>
        {online ? (
          <p role="status">Đang kiểm tra quyền truy cập…</p>
        ) : (
          <p role="alert" className="notice error">
            Đang mất kết nối mạng. Vui lòng kết nối lại để kiểm tra quyền truy
            cập.
          </p>
        )}
      </main>
    );
  if (!user || !allowed)
    return (
      <main className="auth-card card">
        <span className="auth-icon">
          <Icon name="users" />
        </span>
        <p className="eyebrow">VUA TỎI / ADMIN</p>
        <h1>Quản lý bảng giá</h1>
        <p>
          {user
            ? "Tài khoản không có quyền truy cập"
            : "Đăng nhập bằng Gmail được cấp quyền để quản lý sản phẩm và đơn giá."}
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!online && (
          <p role="alert" className="notice error">
            Đang mất kết nối mạng. Vui lòng kết nối lại để kiểm tra quyền truy
            cập.
          </p>
        )}
        <button
          className="login-button"
          disabled={signingIn}
          onClick={() => act(user ? logout : login)}
        >
          {!user && (
            <svg aria-hidden="true" className="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.4Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 5-1 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"
              />
              <path
                fill="#EA4335"
                d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"
              />
            </svg>
          )}
          {signingIn
            ? "Đang đăng nhập…"
            : user
              ? "Đăng xuất để đổi tài khoản"
              : "Đăng nhập với Google"}
        </button>
      </main>
    );
  return <Dashboard user={user} />;
}
function Dashboard({ user }) {
  const online = useOnline();
  const [products, setProducts] = useState([]),
    [admins, setAdmins] = useState([]),
    [loading, setLoading] = useState(true),
    [dataError, setDataError] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState(""),
    [form, setForm] = useState(blank),
    [edit, setEdit] = useState(null),
    [email, setEmail] = useState(""),
    [emailActive, setEmailActive] = useState(true);
  const tab = useLocation().pathname.endsWith("/admins")
    ? "admins"
    : "products";
  useEffect(() => {
    const fail = () => {
      setDataError(
        "Không thể tải dữ liệu Firebase. Vui lòng tải lại trang để thử lại.",
      );
      setLoading(false);
    };
    const a = watchProducts(
        true,
        (p) => {
          setProducts(p);
          setLoading(false);
        },
        fail,
      ),
      b = watchAdmins(setAdmins, fail);
    return () => {
      a();
      b();
    };
  }, []);
  useEffect(() => {
    setError("");
    setMessage("");
  }, [tab]);
  const run = async (fn) => {
    if (!online && fn !== logout) {
      setMessage("");
      setError(
        "Chưa lưu thay đổi vì đang mất kết nối mạng. Vui lòng kết nối lại rồi lưu.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage("Đã cập nhật thành công.");
    } catch {
      setError(
        "Không thể lưu thay đổi. Kiểm tra kết nối và quyền Admin rồi thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const price = Number(form.price);
    const dealerPrice =
      form.dealerPrice === "" ? null : Number(form.dealerPrice);
    if (
      !form.name.trim() ||
      !form.unit.trim() ||
      form.price === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1e12 ||
      (dealerPrice !== null &&
        (!Number.isFinite(dealerPrice) ||
          dealerPrice < 0 ||
          dealerPrice > 1e12))
    ) {
      setError("Vui lòng nhập tên, đơn vị và giá bán lẻ/giá đại lý hợp lệ.");
      return;
    }
    run(async () => {
      await saveProduct(edit, {
        ...form,
        name: form.name.trim(),
        unit: form.unit.trim(),
        price,
        dealerPrice,
      });
      setForm(blank);
      setEdit(null);
    });
  };
  const filteredProducts = products.filter((p) =>
    p.name
      .toLocaleLowerCase("vi")
      .includes(search.trim().toLocaleLowerCase("vi")),
  );
  return (
    <main className="admin-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Quản lý bảng giá</h1>
          <p className="account-email">
            <span className="status-dot" />
            {user.email}
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => run(logout)}
        >
          Đăng xuất
        </button>
      </div>
      <nav className="tabs" aria-label="Quản trị">
        <Link
          className={tab === "products" ? "selected" : ""}
          to="/admin/products"
          aria-current={tab === "products" ? "page" : undefined}
        >
          <Icon name="package" />
          Sản phẩm<span className="tab-count">{products.length}</span>
        </Link>
        <Link
          className={tab === "admins" ? "selected" : ""}
          to="/admin/admins"
          aria-current={tab === "admins" ? "page" : undefined}
        >
          <Icon name="users" />
          Gmail quản lý<span className="tab-count">{admins.length}</span>
        </Link>
      </nav>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {dataError && (
        <p role="alert" className="notice error">
          {dataError}
        </p>
      )}
      {!online && (
        <p role="alert" className="notice error">
          Đang mất kết nối mạng. Dữ liệu hiển thị có thể chưa cập nhật; thay đổi
          chỉ được lưu sau khi kết nối lại.
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {loading && <p role="status">Đang tải dữ liệu…</p>}
      {tab === "products" ? (
        <div className="admin-layout">
          <form className="card form-grid product-form" onSubmit={submit}>
            <div className="form-heading">
              <span className="form-icon">
                <Icon name={edit ? "edit" : "plus"} />
              </span>
              <div>
                <h2>{edit ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
                <p>Điền thông tin và lưu vào bảng giá.</p>
              </div>
            </div>
            <label>
              Tên sản phẩm
              <input
                required
                maxLength="200"
                disabled={busy}
                placeholder="Nhập tên sản phẩm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Đơn vị
              <input
                required
                maxLength="30"
                disabled={busy}
                placeholder="kg, hộp, gói…"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </label>
            <label>
              Giá bán lẻ (đ)
              <input
                required
                type="number"
                disabled={busy}
                min="0"
                max="1000000000000"
                step="any"
                placeholder="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label>
              Giá đại lý (đ)
              <input
                type="number"
                disabled={busy}
                min="0"
                max="1000000000000"
                step="any"
                placeholder="Chưa có giá đại lý"
                value={form.dealerPrice}
                onChange={(e) =>
                  setForm({ ...form, dealerPrice: e.target.value })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={busy}
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Đang bán
            </label>
            <div className="actions">
              <button disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu sản phẩm"}
                <Icon name="arrow" />
              </button>
              {edit && (
                <button
                  type="button"
                  disabled={busy}
                  className="secondary"
                  onClick={() => {
                    setEdit(null);
                    setForm(blank);
                  }}
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>
          <div className="catalog-panel">
            <div className="catalog-heading">
              <h2>Danh sách sản phẩm</h2>
              <span className="muted">{filteredProducts.length} sản phẩm</span>
            </div>
            <label className="search-label">
              <span className="sr-only">Tìm kiếm sản phẩm</span>
              <span className="search-control">
                <Icon name="search" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nhập tên sản phẩm…"
                />
              </span>
            </label>
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Đơn vị</th>
                    <th>Giá bán lẻ</th>
                    <th>Giá đại lý</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="product-name-cell" data-label="Sản phẩm">
                        {p.name}
                      </td>
                      <td data-label="Đơn vị">{p.unit}</td>
                      <td className="money-cell" data-label="Giá bán lẻ">
                        {formatMoney(p.price)}
                      </td>
                      <td className="money-cell" data-label="Giá đại lý">
                        {p.dealerPrice == null
                          ? "—"
                          : formatMoney(p.dealerPrice)}
                      </td>
                      <td data-label="Trạng thái">
                        <span className={`badge ${p.active ? "" : "inactive"}`}>
                          {p.active ? "Đang bán" : "Đã ngừng"}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            setEdit(p.id);
                            setForm({
                              name: p.name,
                              unit: p.unit,
                              price: p.price,
                              dealerPrice: p.dealerPrice ?? "",
                              active: p.active,
                            });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Icon name="edit" />
                          Sửa
                        </button>
                        <button
                          className="quiet"
                          disabled={busy}
                          onClick={() => run(() => toggleProduct(p))}
                        >
                          {p.active ? "Ngừng bán" : "Bật lại"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredProducts.length && (
                <div className="table-empty">
                  <Icon name="package" />
                  <strong>
                    {search ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"}
                  </strong>
                  <p>
                    {search
                      ? "Thử tìm bằng tên khác."
                      : "Thêm sản phẩm bằng form bên cạnh."}
                  </p>
                </div>
              )}
            </div>
            <p className="muted">
              Xóa sản phẩm bằng cách ngừng bán. Bạn có thể bật lại bất cứ lúc
              nào.
            </p>
          </div>
        </div>
      ) : (
        <div className="admin-layout">
          <form
            className="card form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const normalized = normalizeEmail(email);
              if (!/^[a-z0-9._%+-]+@gmail\.com$/.test(normalized)) {
                setError("Vui lòng nhập địa chỉ @gmail.com hợp lệ.");
                return;
              }
              if (admins.some((a) => a.id === normalized)) {
                setError("Gmail đã có trong danh sách.");
                return;
              }
              run(async () => {
                await saveAdmin(normalized, emailActive);
                setEmail("");
              });
            }}
          >
            <div className="form-heading">
              <span className="form-icon">
                <Icon name="users" />
              </span>
              <div>
                <h2>Thêm Gmail quản lý</h2>
                <p>Cấp quyền quản lý bảng giá.</p>
              </div>
            </div>
            <label>
              Email
              <input
                required
                type="email"
                disabled={busy}
                value={email}
                placeholder="ten@gmail.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={busy}
                checked={emailActive}
                onChange={(e) => setEmailActive(e.target.checked)}
              />
              Được phép
            </label>
            <button disabled={busy}>
              {busy ? "Đang lưu…" : "Thêm Gmail"}
              <Icon name="plus" />
            </button>
          </form>
          <div className="catalog-panel">
            <div className="catalog-heading">
              <h2>Gmail quản lý</h2>
              <span className="muted">{admins.length} tài khoản</span>
            </div>
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td
                        className="product-name-cell email-cell"
                        data-label="Email"
                      >
                        {a.email}
                      </td>
                      <td data-label="Trạng thái">
                        <span className={`badge ${a.active ? "" : "inactive"}`}>
                          {a.active ? "Được phép" : "Đã tắt"}
                        </span>
                      </td>
                      <td className="actions">
                        {a.id === normalizeEmail(user.email) ? (
                          <span className="muted">Tài khoản hiện tại</span>
                        ) : (
                          <>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => run(() => toggleAdmin(a))}
                            >
                              {a.active ? "Tắt quyền" : "Bật quyền"}
                            </button>
                            <button
                              className="quiet"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Xóa quyền Admin của ${a.email}?`,
                                  )
                                )
                                  run(() => removeAdmin(a.id));
                              }}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Không thể tự xóa hoặc tắt quyền tài khoản hiện tại.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
