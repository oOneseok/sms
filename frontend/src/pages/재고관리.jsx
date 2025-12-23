// src/pages/재고관리.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../css/pages/재고관리.css";

/**
 * ✅ API 경로 (프로젝트에 맞게 수정)
 * - 품목: /api/item (네가 만든 ItemController 경로)
 * - 창고: /api/whs (네가 만든 창고관리 경로)
 * - 재고: /api/stocks (ItemStockController 경로)
 */
const API = {
  stocks: "http://localhost:8080/api/stocks",
  items: "http://localhost:8080/api/item", // ✅ 중요: /api/items ❌ -> /api/item ✅
  whs: "http://localhost:8080/api/whs",
};

/**
 * ✅ 재고 응답 정규화
 * - 서버가 { id: {itemCd, whCd}, stockQty, allocQty } 형태든
 * - { itemCd, whCd, stockQty, allocQty } 형태든 대응
 * - 페이징(Page)면 content도 처리
 */
const normalizeStock = (raw = {}) => {
  const id = raw.id ?? raw.ID ?? null;

  const itemCd =
    raw.itemCd ?? raw.ITEM_CD ?? (id ? id.itemCd ?? id.ITEM_CD : "") ?? "";
  const whCd =
    raw.whCd ?? raw.WH_CD ?? (id ? id.whCd ?? id.WH_CD : "") ?? "";

  const stockQty = raw.stockQty ?? raw.STOCK_QTY ?? 0;
  const allocQty = raw.allocQty ?? raw.ALLOC_QTY ?? 0;

  return {
    itemCd: String(itemCd ?? ""),
    whCd: String(whCd ?? ""),
    stockQty: Number(stockQty ?? 0),
    allocQty: Number(allocQty ?? 0),
  };
};

const emptyForm = () => ({
  itemCd: "",
  whCd: "",
  stockQty: 0,
  allocQty: 0,
});

export default function 재고관리() {
  const [list, setList] = useState([]);
  const [searchText, setSearchText] = useState("");

  // ✅ 품목구분 필터: ALL / 01(자재) / 02(제품)
  const [filterType, setFilterType] = useState("ALL");

  // 상세 패널
  const [formData, setFormData] = useState(emptyForm());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 마스터 (품목/창고)
  const [items, setItems] = useState([]); // ItemMst 리스트
  const [whs, setWhs] = useState([]); // Wh 리스트

  /** itemMap: itemCd -> item 객체 */
  const itemMap = useMemo(() => {
    const m = new Map();
    items.forEach((it) => {
      const cd = it.itemCd ?? it.ITEM_CD;
      if (!cd) return;
      m.set(String(cd), it);
    });
    return m;
  }, [items]);

  /** whMap: whCd -> wh 객체 */
  const whMap = useMemo(() => {
    const m = new Map();
    whs.forEach((w) => {
      const cd = w.whCd ?? w.WH_CD;
      if (!cd) return;
      m.set(String(cd), w);
    });
    return m;
  }, [whs]);

  const getItemNm = (itemCd) => {
    const it = itemMap.get(String(itemCd));
    return it?.itemNm ?? it?.ITEM_NM ?? "";
  };

  const getWhNm = (whCd) => {
    const w = whMap.get(String(whCd));
    return w?.whNm ?? w?.WH_NM ?? "";
  };

  /**
   * ✅ (2번) 품목구분 라벨링: ItemMst.itemFlag 기준
   * - 01 = 자재
   * - 02 = 제품
   */
  const getItemTypeLabel = (itemCd) => {
    const it = itemMap.get(String(itemCd));
    const flag = it?.itemFlag ?? it?.ITEM_FLAG;

    if (flag === "01") return "자재";
    if (flag === "02") return "제품";
    return flag ? String(flag) : "-";
  };

  /** 품목/창고 마스터 로딩 */
  const fetchMasters = async () => {
    // items
    try {
      const r = await fetch(API.items);
      if (r.ok) {
        const d = await r.json();
        const rows = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
        setItems(rows);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }

    // whs
    try {
      const r = await fetch(API.whs);
      if (r.ok) {
        const d = await r.json();
        const rows = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
        setWhs(rows);
      } else {
        setWhs([]);
      }
    } catch {
      setWhs([]);
    }
  };

  /** 재고 목록 조회 */
  const fetchList = async () => {
    try {
      const res = await fetch(API.stocks);
      const data = await res.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : [];

      let normalized = rows.map(normalizeStock);

      // ✅ 품목구분 필터 (ALL/01/02)
      if (filterType !== "ALL") {
        normalized = normalized.filter((r) => {
          const it = itemMap.get(String(r.itemCd));
          const flag = it?.itemFlag ?? it?.ITEM_FLAG;
          return String(flag ?? "") === String(filterType);
        });
      }

      // ✅ 검색: 품목코드/창고코드/품목명/창고명
      const kw = searchText.trim().toLowerCase();
      if (kw) {
        normalized = normalized.filter((r) => {
          const itemNm = (getItemNm(r.itemCd) || "").toLowerCase();
          const whNm = (getWhNm(r.whCd) || "").toLowerCase();
          return (
            String(r.itemCd).toLowerCase().includes(kw) ||
            String(r.whCd).toLowerCase().includes(kw) ||
            itemNm.includes(kw) ||
            whNm.includes(kw)
          );
        });
      }

      setList(normalized);
    } catch (e) {
      console.error(e);
      setList([]);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  // 마스터 로딩 후 목록 조회(이름/구분 매핑 위해)
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, whs]);

  /** 신규 */
  const handleNew = () => {
    setFormData(emptyForm());
    setIsEditMode(false);
    setIsDetailOpen(true);
  };

  /** 행 클릭(수정) */
  const handleRowClick = (row) => {
    setFormData({
      ...emptyForm(),
      itemCd: row.itemCd,
      whCd: row.whCd,
      stockQty: row.stockQty,
      allocQty: row.allocQty,
    });
    setIsEditMode(true);
    setIsDetailOpen(true);
  };

  /** 입력 변경 */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "stockQty" || name === "allocQty") {
      setFormData((p) => ({ ...p, [name]: value === "" ? "" : Number(value) }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
  };

  /** 저장 */
  const handleSave = async () => {
    const { itemCd, whCd } = formData;
    if (!itemCd || !whCd) return alert("품목코드 / 창고코드는 필수입니다.");

    const stockQty = Number(formData.stockQty ?? 0);
    const allocQty = Number(formData.allocQty ?? 0);
    if (allocQty > stockQty) return alert("예약수량(ALLOC)이 재고수량(STOCK)보다 클 수 없습니다.");

    // ✅ EmbeddedId 형태로 전송
    const payload = {
      id: { itemCd, whCd },
      stockQty,
      allocQty,
    };

    try {
      let res;

      if (isEditMode) {
        res = await fetch(
          `${API.stocks}/${encodeURIComponent(itemCd)}/${encodeURIComponent(whCd)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(API.stocks, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("SAVE FAIL:", res.status, txt);
        alert(`저장 실패 (status=${res.status})\n${txt}`);
        return;
      }

      alert("저장됨");
      setIsEditMode(true);
      await fetchList();
    } catch (e) {
      console.error(e);
      alert("저장 중 오류");
    }
  };

  /** 삭제 */
  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    const { itemCd, whCd } = formData;
    try {
      const res = await fetch(
        `${API.stocks}/${encodeURIComponent(itemCd)}/${encodeURIComponent(whCd)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`삭제 실패 (status=${res.status})\n${txt}`);
        return;
      }

      alert("삭제됨");
      setIsDetailOpen(false);
      setIsEditMode(false);
      setFormData(emptyForm());
      await fetchList();
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류");
    }
  };

  return (
    <div className="stock-management-container">
      <div className="stock-management-wrapper">
        {/* 헤더 */}
        <div className="stock-header">
          <h2 className="stock-title">재고 관리</h2>
          <div className="header-buttons">
            <button className="excel-btn excel-btn-new" onClick={handleNew}>
              신규
            </button>
          </div>
        </div>

        {/* 검색/필터 */}
        <div className="stock-search">
          <label className="search-label">검색</label>
          <input
            className="search-input"
            placeholder="품목코드/명, 창고코드/명"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchList()}
          />

          <label className="search-label">품목구분</label>
          <select
            className="search-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">전체</option>
            <option value="01">자재</option>
            <option value="02">제품</option>
          </select>

          <button className="excel-btn" onClick={fetchList}>
            조회
          </button>
        </div>

        {/* 본문 */}
        <div className={`stock-content-layout ${isDetailOpen ? "split" : "full"}`}>
          {/* 리스트 */}
          <div className="stock-list-panel">
            <div className="list-table-wrapper">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{ width: "50px" }}>No</th>
                    <th className="excel-th" style={{ width: "80px" }}>품목구분</th>
                    <th className="excel-th" style={{ width: "120px" }}>품목코드</th>
                    <th className="excel-th">품목명</th>
                    <th className="excel-th" style={{ width: "160px" }}>창고</th>
                    <th className="excel-th" style={{ width: "90px" }}>재고수량</th>
                    <th className="excel-th" style={{ width: "90px" }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, idx) => {
                    const itemNm = getItemNm(row.itemCd);
                    const whNm = getWhNm(row.whCd);

                    // ✅ 비고는 ItemMst.remark 사용
                    const remark =
                      (itemMap.get(String(row.itemCd))?.remark ??
                        itemMap.get(String(row.itemCd))?.REMARK ??
                        "") || "";

                    return (
                      <tr
                        key={`${row.itemCd}-${row.whCd}-${idx}`}
                        className={`excel-tr ${
                          formData.itemCd === row.itemCd && formData.whCd === row.whCd
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handleRowClick(row)}
                      >
                        <td className="excel-td">{idx + 1}</td>
                        <td className="excel-td">{getItemTypeLabel(row.itemCd)}</td>
                        <td className="excel-td">{row.itemCd}</td>
                        <td className="excel-td" style={{ textAlign: "left" }}>
                          {itemNm || "-"}
                        </td>
                        <td className="excel-td" style={{ textAlign: "left" }}>
                          {whNm ? `${row.whCd} / ${whNm}` : row.whCd}
                        </td>
                        <td className="excel-td">{row.stockQty}</td>
                        <td className="excel-td" style={{ textAlign: "left" }}>
                          {remark || "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {list.length === 0 && (
                    <tr>
                      <td className="excel-td" colSpan={7} style={{ padding: "16px", color: "#777" }}>
                        조회된 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 상세 */}
          {isDetailOpen && (
            <div className="stock-detail-panel">
              <div className="detail-header">
                <h3 className="detail-title">상세 정보</h3>
                <button className="detail-close-btn" onClick={() => setIsDetailOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="detail-content">
                <div className="detail-row">
                  <div className="detail-field">
                    <label>품목코드</label>
                    {items.length > 0 ? (
                      <select
                        className="detail-input"
                        name="itemCd"
                        value={formData.itemCd}
                        onChange={handleChange}
                        disabled={isEditMode}
                      >
                        <option value="">선택</option>
                        {items.map((it, i) => {
                          const cd = it.itemCd ?? it.ITEM_CD ?? "";
                          const nm = it.itemNm ?? it.ITEM_NM ?? "";
                          return (
                            <option key={`${cd}-${i}`} value={cd}>
                              {cd} {nm ? `- ${nm}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        className="detail-input"
                        name="itemCd"
                        value={formData.itemCd}
                        onChange={handleChange}
                        readOnly={isEditMode}
                        placeholder="ITEM_CD"
                      />
                    )}
                  </div>

                  <div className="detail-field">
                    <label>품목명</label>
                    <input
                      className="detail-input"
                      value={formData.itemCd ? getItemNm(formData.itemCd) : ""}
                      readOnly
                      placeholder="자동 표시"
                    />
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-field">
                    <label>창고코드</label>
                    {whs.length > 0 ? (
                      <select
                        className="detail-input"
                        name="whCd"
                        value={formData.whCd}
                        onChange={handleChange}
                        disabled={isEditMode}
                      >
                        <option value="">선택</option>
                        {whs.map((w, i) => {
                          const cd = w.whCd ?? w.WH_CD ?? "";
                          const nm = w.whNm ?? w.WH_NM ?? "";
                          return (
                            <option key={`${cd}-${i}`} value={cd}>
                              {cd} {nm ? `- ${nm}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        className="detail-input"
                        name="whCd"
                        value={formData.whCd}
                        onChange={handleChange}
                        readOnly={isEditMode}
                        placeholder="WH_CD"
                      />
                    )}
                  </div>

                  <div className="detail-field">
                    <label>창고명</label>
                    <input
                      className="detail-input"
                      value={formData.whCd ? getWhNm(formData.whCd) : ""}
                      readOnly
                      placeholder="자동 표시"
                    />
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-field">
                    <label>재고수량(STOCK)</label>
                    <input
                      className="detail-input"
                      type="number"
                      name="stockQty"
                      value={formData.stockQty}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>

                  <div className="detail-field">
                    <label>예약수량(ALLOC)</label>
                    <input
                      className="detail-input"
                      type="number"
                      name="allocQty"
                      value={formData.allocQty}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                </div>

                <div className="detail-row detail-row-full">
                  <div className="detail-field">
                    <label>가용수량</label>
                    <input
                      className="detail-input"
                      value={Number(formData.stockQty || 0) - Number(formData.allocQty || 0)}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="detail-footer">
                <button className="excel-btn excel-btn-save" onClick={handleSave}>
                  저장
                </button>
                {isEditMode && (
                  <button className="excel-btn excel-btn-delete" onClick={handleDelete}>
                    삭제
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
