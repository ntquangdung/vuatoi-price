import { useEffect, useState } from "react";
import {
  canExportDealerPricesForEmail,
  deleteExpiredCalculations,
  saveHistorySettings,
  watchCalculations,
  watchHistorySettings,
} from "../services/data";
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
  const [cleanupError, setCleanupError] = useState("");
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [retentionDays, setRetentionDays] = useState(7);
  const [draftDays, setDraftDays] = useState(7);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [search, setSearch] = useState("");
  const [exportState, setExportState] = useState({
    id: null,
    busy: false,
    error: "",
    message: "",
  });

  useEffect(() => {
    const unsubscribe = watchCalculations(
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
    );
    return unsubscribe;
  }, []);

  useEffect(
    () =>
      watchHistorySettings(
        (days) => {
          setRetentionDays(days);
          setDraftDays(days);
          setSettingsReady(true);
          setSettingsError("");
        },
        () => {
          setSettingsReady(false);
          setSettingsError("Không thể tải thời hạn lưu lịch sử.");
        },
      ),
    [],
  );

  useEffect(() => {
    if (!settingsReady) return;
    let active = true;
    setCleanupError("");
    setCleanupMessage("");
    deleteExpiredCalculations(retentionDays)
      .then((count) => {
        if (active && count > 0)
          setCleanupMessage(
            `Đã dọn ${count} lần tính quá ${retentionDays} ngày.`,
          );
      })
      .catch(() => {
        if (active)
          setCleanupError(
            "Chưa dọn được lịch sử quá hạn. Vui lòng tải lại trang khi có kết nối.",
          );
      });
    return () => {
      active = false;
    };
  }, [settingsReady, retentionDays]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      await saveHistorySettings(draftDays);
      setSettingsMessage("Đã lưu thời hạn. Lịch sử quá hạn sẽ được dọn ngay.");
    } catch {
      setSettingsError(
        "Không thể lưu thời hạn. Kiểm tra kết nối và quyền Admin.",
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  const exportOrder = async (entry) => {
    setExportState({ id: entry.id, busy: true, error: "", message: "" });
    try {
      const dealerAuthorized = await canExportDealerPricesForEmail(
        entry.savedBy,
      );
      const [{ default: ExcelJS }, { buildOrderWorkbook }] = await Promise.all([
        import("exceljs"),
        import("../utils/orderExcel"),
      ]);
      const workbook = buildOrderWorkbook(entry, ExcelJS, dealerAuthorized);
      const bytes = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      const date = entry.createdAt?.toDate?.() || new Date();
      const stamp = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .format(date)
        .replace(/[ :]/g, "-");
      anchor.download = `thong-bao-don-hang-${stamp}.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setExportState({
        id: entry.id,
        busy: false,
        error: "",
        message: "Đã xuất thông báo đơn hàng.",
      });
    } catch {
      setExportState({
        id: entry.id,
        busy: false,
        error: "Không thể xuất đơn này. Vui lòng kiểm tra kết nối rồi thử lại.",
        message: "",
      });
    }
  };

  const term = search.trim().toLocaleLowerCase("vi");
  const filtered = entries.filter(
    (entry) =>
      !term ||
      entry.savedBy?.toLocaleLowerCase("vi").includes(term) ||
      entry.sections?.some(
        (section) =>
          section.name?.toLocaleLowerCase("vi").includes(term) ||
          section.address?.toLocaleLowerCase("vi").includes(term) ||
          section.paymentMethod?.toLocaleLowerCase("vi").includes(term) ||
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
          <p className="muted">
            Hiển thị 100 lần gần nhất · Mở từng lần tính để xuất đơn riêng
          </p>
        </div>
        <span className="muted">{filtered.length} lần tính</span>
      </div>
      <div className="card history-settings">
        <div>
          <h3>Thời gian lưu lịch sử</h3>
          <p>
            Lần tính đã lưu quá {retentionDays} ngày được xóa khi Admin mở Lịch
            sử. Chọn thời hạn mới để dọn ngay các bản ghi quá hạn.
          </p>
        </div>
        <form onSubmit={saveSettings}>
          <label>
            Giữ lịch sử trong
            <select
              value={draftDays}
              disabled={!settingsReady || settingsBusy}
              onChange={(event) => {
                setDraftDays(Number(event.target.value));
                setSettingsMessage("");
              }}
            >
              <option value={3}>3 ngày</option>
              <option value={7}>7 ngày</option>
              <option value={10}>10 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
          </label>
          <button
            disabled={
              !settingsReady || settingsBusy || draftDays === retentionDays
            }
          >
            {settingsBusy ? "Đang lưu…" : "Lưu thời hạn"}
          </button>
        </form>
      </div>
      {settingsError && (
        <p role="alert" className="notice error">
          {settingsError}
        </p>
      )}
      {settingsMessage && (
        <p role="status" className="notice">
          {settingsMessage}
        </p>
      )}
      {cleanupMessage && (
        <p role="status" className="notice">
          {cleanupMessage}
        </p>
      )}
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
      {cleanupError && (
        <p role="alert" className="notice error">
          {cleanupError}
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
                  <p className="history-section-detail">
                    <strong>Địa chỉ:</strong> {section.address || "Chưa nhập"}
                  </p>
                  <p className="history-section-detail">
                    <strong>Thanh toán:</strong>{" "}
                    {section.paymentMethod || "Chưa chọn"}
                  </p>
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
              <div className="history-export">
                <button
                  type="button"
                  className="secondary"
                  disabled={exportState.busy}
                  onClick={() => exportOrder(entry)}
                >
                  {exportState.busy && exportState.id === entry.id
                    ? "Đang xuất…"
                    : "Xuất Excel đơn này"}
                </button>
                {exportState.id === entry.id && exportState.error && (
                  <p role="alert" className="notice error">
                    {exportState.error}
                  </p>
                )}
                {exportState.id === entry.id && exportState.message && (
                  <p role="status" className="notice">
                    {exportState.message}
                  </p>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
