import { useEffect, useId, useRef, useState } from "react";
import { formatMoney } from "../utils/currency";
import Icon from "./Icon";

export default function ProductSearch({
  products,
  onSelect,
  label = "Thêm sản phẩm",
}) {
  const id = useId();
  const input = useRef(null);
  const list = useRef(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [panel, setPanel] = useState({ above: false, maxHeight: 260 });
  const matches = products.filter((p) =>
    p.name
      .toLocaleLowerCase("vi")
      .includes(search.trim().toLocaleLowerCase("vi")),
  );

  useEffect(() => {
    if (open && active >= 0)
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const placePanel = () => {
      const rect = input.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const below = bottom - rect.bottom - 8;
      const above = rect.top - top - 40;
      const opensAbove =
        below < Math.min(310, matches.length * 65 + 50) && above > below;
      setPanel({
        above: opensAbove,
        maxHeight: Math.max(
          60,
          Math.min(260, (opensAbove ? above : below) - 48),
        ),
      });
    };
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, { passive: true });
    window.visualViewport?.addEventListener("resize", placePanel);
    window.visualViewport?.addEventListener("scroll", placePanel);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel);
      window.visualViewport?.removeEventListener("resize", placePanel);
      window.visualViewport?.removeEventListener("scroll", placePanel);
    };
  }, [open, matches.length]);

  const choose = (productId) => {
    onSelect(productId);
    setSearch("");
    setActive(-1);
    input.current?.focus();
    setOpen(false);
  };

  return (
    <div
      className="product-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>
        <Icon name="plus" />
        {label}
      </label>
      <div className="search-control">
        <Icon name="search" />
        <input
          ref={input}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && matches[active] ? `${id}-option-${active}` : undefined
          }
          placeholder={
            products.length
              ? "Tìm và chọn sản phẩm…"
              : "Chưa có sản phẩm đang bán"
          }
          disabled={!products.length}
          value={search}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                !matches.length
                  ? -1
                  : e.key === "ArrowDown"
                    ? Math.min(n + 1, matches.length - 1)
                    : Math.max(n - 1, 0),
              );
            } else if (e.key === "Enter" && open && matches[active]) {
              e.preventDefault();
              choose(matches[active].id);
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
        />
        <button
          className="picker-toggle"
          type="button"
          aria-label="Mở danh sách sản phẩm"
          disabled={!products.length}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            input.current?.focus();
            setOpen(!open);
          }}
        >
          <Icon name="chevron" />
        </button>
      </div>
      {open && (
        <div className={`picker-panel ${panel.above ? "above" : ""}`}>
          <div className="picker-caption" role="status">
            {matches.length
              ? `${matches.length} sản phẩm · Chọn để thêm vào mục`
              : "Không tìm thấy sản phẩm"}
          </div>
          <div
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label="Sản phẩm đang bán"
            className="picker-list"
            style={{ maxHeight: panel.maxHeight }}
          >
            {matches.map((p, index) => (
              <button
                type="button"
                role="option"
                aria-selected={active === index}
                tabIndex={-1}
                id={`${id}-option-${index}`}
                key={p.id}
                className={`picker-option ${active === index ? "highlighted" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p.id)}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>Đơn vị: {p.unit}</small>
                </span>
                <span className="picker-price">
                  {formatMoney(p.price)}
                  <Icon name="plus" />
                </span>
              </button>
            ))}
          </div>
          {!matches.length && (
            <p className="picker-empty">Thử tên sản phẩm khác.</p>
          )}
        </div>
      )}
    </div>
  );
}
