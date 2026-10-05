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
import "./style.css";
function App() {
  return (
    <BrowserRouter>
      <header>
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path
                d="M21 6c-3 3-2 6-1 9M20 14c-5-4-14 4-13 12 1 7 7 9 13 9s12-2 13-9c1-8-8-16-13-12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M20 14c-4 6-6 13-2 20M20 14c4 6 6 13 2 20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="brand-name">
            VUA TỎI <small>BẢNG TÍNH GIÁ</small>
          </span>
        </Link>
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
