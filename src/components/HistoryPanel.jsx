import { useEffect, useState } from "react";
import { watchCalculations } from "../services/data";
import { formatMoney } from "../utils/currency";

const formatDate = (timestamp) => {
  const date = timestamp?.toDate?.();
  return date
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
    : "Đang cập nhật thời gian…";
};

const formatDiscount = (entry) =>
  entry.discountType === "percent"
    ? `${entry.discountValue}%`
    : formatMoney(entry.discountValue);

export default function HistoryPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(
    () =>
      watchCalculations(
        (data) => {
          setEntries(data);
          setLoading(false);
          setError("");
        },
        () => {
          setLoading(false);
          setError(
            "Không thể tải lịch sử. Kiểm tra kết nối và quyền Admin rồi thử lại.",
          );
        },
      ),
    [],
  );

  const term = search.trim().toLocaleLowerCase("vi");
  const filtered = entries.filter(
    (entry) =>
      !term ||
      entry.savedBy?.toLocaleLowerCase("vi").includes(term) ||
      entry.sections?.some(
        (section) =>
          section.name?.toLocaleLowerCase("vi").includes(term) ||
          section.items?.some((item) =>
            item.name?.toLocaleLowerCase("vi").includes(term),
          ),
      ),
  );

  return (
    <section className="history-panel">
      <div className="catalog-heading">
        <div>
          <h2>Lịch sử tính giá</h2>
          <p className="muted">100 lần lưu gần nhất · Chỉ Admin xem được</p>
        </div>
        <span className="muted">{filtered.length} lần tính</span>
      </div>
      <label className="history-search">
        <span className="sr-only">Tìm lịch sử theo Gmail hoặc sản phẩm</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm Gmail, mục hoặc sản phẩm…"
        />
      </label>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="notice">
          Đang tải lịch sử…
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="notice">
          {term
            ? "Không có lần tính nào khớp tìm kiếm."
            : "Chưa có lần tính nào được lưu từ trang Tính giá."}
        </p>
      )}
      <div className="history-list">
        {filtered.map((entry) => (
          <details className="card history-entry" key={entry.id}>
            <summary>
              <span className="history-entry-meta">
                <strong>{formatDate(entry.createdAt)}</strong>
                <small>{entry.savedBy}</small>
                <small>{entry.lineCount} dòng sản phẩm</small>
              </span>
              <span className="history-entry-total">
                <small>TỔNG SAU GIẢM</small>
                <strong>{formatMoney(entry.total)}</strong>
              </span>
            </summary>
            <div className="history-entry-body">
              {entry.sections?.map((section, index) => (
                <div className="history-section" key={`${entry.id}-${index}`}>
                  <h3>{section.name}</h3>
                  {section.items?.map((item, itemIndex) => (
                    <div
                      className="history-item"
                      key={`${item.name}-${itemIndex}`}
                    >
                      <span>
                        {item.name}{" "}
                        <small>
                          · {item.quantity} {item.unit} ×{" "}
                          {formatMoney(item.price)}
                        </small>
                      </span>
                      <strong>{formatMoney(item.quantity * item.price)}</strong>
                    </div>
                  ))}
                </div>
              ))}
              <div className="history-totals">
                <div>
                  <span>Tổng bán lẻ</span>
                  <strong>{formatMoney(entry.retailSubtotal)}</strong>
                </div>
                <div>
                  <span>Chiết khấu ({formatDiscount(entry)})</span>
                  <strong>-{formatMoney(entry.discountAmount)}</strong>
                </div>
                <div className="history-final">
                  <span>Tổng sau giảm</span>
                  <strong>{formatMoney(entry.total)}</strong>
                </div>
                <div>
                  <span>Tổng đại lý</span>
                  <strong>
                    {entry.dealerTotal == null
                      ? "Chưa đủ giá"
                      : formatMoney(entry.dealerTotal)}
                  </strong>
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
