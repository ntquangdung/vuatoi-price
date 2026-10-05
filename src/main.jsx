import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Icon from "./components/Icon";
import { usingEmulators } from "./firebase/config";
import "./style.css";
function App() {
  return (
    <BrowserRouter>
      <header>
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <img src="/vua-toi-logo.png" alt="" />
          </span>
          <span className="brand-name">
            VUA TỎI <small>BẢNG TÍNH GIÁ</small>
          </span>
        </Link>
        {usingEmulators && <span className="environment-badge">BẢN LOCAL</span>}
        <nav className="header-nav" aria-label="Điều hướng chính">
          <NavLink to="/" end>
            <Icon name="calculator" />
            <span>Tính giá</span>
          </NavLink>
          <NavLink to="/admin">
            <Icon name="users" />
            <span>Admin</span>
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer>
        <span>VUA TỎI</span> · Tính giá sản phẩm nội bộ
      </footer>
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
