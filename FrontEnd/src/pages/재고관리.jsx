import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/pages/management-common.css";
import "../css/pages/재고관리.css";

const API_BASE = "http://localhost:8080";

const API = {
  items: `${API_BASE}/api/item`,
  whs: `${API_BASE}/api/whs`,
  stocks: `${API_BASE}/api/stocks`,
  history: `${API_BASE}/api/stock_his`,
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const formatNum = (v) => safeNum(v).toLocaleString();

const getWhTypeLabel = (type) => {
  const t = (type || "").toString();
  switch (t) {
    case "자재":
    case "MATERIAL":
      return "자재";
    case "제품":
    case "PRODUCT":
      return "제품";
    case "자재+제품":
    case "자재 + 제품":
    case "MIXED":
    case "출하":
    case "혼합":
      return "자재+제품";
    case "반품":
    case "RETURN":
      return "반품";
    default:
      return t || "-";
  }
};

// ✅ ioType 정규화 (공백/개행/하이픈/중간공백 모두 통일)
const normalizeIoType = (type) => {
  return String(type ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
};

export default function 재고관리() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ITEM / WH
  const [viewMode, setViewMode] = useState("ITEM");

  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);

  const [selectedTarget, setSelectedTarget] = useState(null); // item or wh
  const [stockList, setStockList] = useState([]); // ITEM: 창고별 / WH: 보유품목
  const [historyList, setHistoryList] = useState([]);
  const [infoEdit, setInfoEdit] = useState({ val1: "", val2: "", remark: "" });

  // ✅ 입력값/적용값 분리(검색 버튼 눌러야 적용)
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");

  // ✅ ITEM만 사용 (01/02)
  const [filterType, setFilterType] = useState("ALL");

  // ✅ WH 탭용: 창고 선택 드롭다운
  const [selectedWh, setSelectedWh] = useState(""); // "" = 전체

  const [itemTotalStockMap, setItemTotalStockMap] = useState({});
  const [saveToast, setSaveToast] = useState(false);

  const [loadingMasters, setLoadingMasters] = useState(true);

  const whNameMap = useMemo(() => {
    const m = new Map();
    (whs || []).forEach((w) => m.set(String(w.whCd), w.whNm));
    return m;
  }, [whs]);

  const itemNameMap = useMemo(() => {
    const m = new Map();
    (items || []).forEach((it) => m.set(String(it.itemCd), it.itemNm));
    return m;
  }, [items]);

  // -------------------------
  // Load masters + totals
  // -------------------------
  useEffect(() => {
    (async () => {
      setLoadingMasters(true);
      await Promise.all([fetchMasters(), fetchTotalStocks()]);
      setLoadingMasters(false);
    })();
  }, []);

  useEffect(() => {
    if (saveToast) {
      const t = setTimeout(() => setSaveToast(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saveToast]);

  const fetchMasters = async () => {
    try {
      const [resItems, resWhs] = await Promise.all([
        fetch(API.items).then((r) => (r.ok ? r.json() : [])),
        fetch(API.whs).then((r) => (r.ok ? r.json() : [])),
      ]);

      // fallback sample (백엔드 없을 때)
      const itemsData = Array.isArray(resItems)
        ? resItems
        : [
            { itemCd: "ITM001", itemNm: "알루미늄 판재", itemFlag: "01", minQty: 50, maxQty: 500, remark: "주문 처리용" },
            { itemCd: "ITM002", itemNm: "조립 완제품 A", itemFlag: "02", minQty: 10, maxQty: 200, remark: "출고 대기 제품" },
            { itemCd: "ITM003", itemNm: "나사 세트", itemFlag: "01", minQty: 100, maxQty: 800, remark: "소량 부품" },
          ];

      const whsData = Array.isArray(resWhs)
        ? resWhs
        : [
            { whCd: "WH001", whNm: "자재창고", whType: "자재", useFlag: "Y", remark: "원자재 보관" },
            { whCd: "WH002", whNm: "완제품창고", whType: "제품", useFlag: "Y", remark: "완성 제품 보관" },
            { whCd: "WH003", whNm: "혼합창고", whType: "자재+제품", useFlag: "Y", remark: "임시 보관소" },
            { whCd: "WH004", whNm: "반품창고", whType: "반품", useFlag: "Y", remark: "반품 처리용" },
          ];

      setItems(itemsData);
      setWhs(whsData);
    } catch (e) {
      console.error("마스터 로딩 실패:", e);
    }
  };

  // 품목 리스트의 "총재고"용
  const fetchTotalStocks = async () => {
    try {
      const r = await fetch(`${API.stocks}?size=10000`);
      if (!r.ok) throw new Error("stocks fetch fail");
      const d = await r.json();
      const rows = Array.isArray(d) ? d : d.content || [];

      const map = {};
      rows.forEach((row) => {
        const iCd = row.id?.itemCd;
        const qty = safeNum(row.stockQty);
        if (!iCd) return;
        map[iCd] = (map[iCd] || 0) + qty;
      });
      setItemTotalStockMap(map);
    } catch (e) {
      // fallback
      setItemTotalStockMap({ ITM001: 480, ITM002: 320, ITM003: 2150 });
    }
  };

  // -------------------------
  // Tabs / Search / Reset
  // -------------------------
  const handleTabChange = (mode) => {
    setViewMode(mode);

    // 공통 초기화
    setSelectedTarget(null);
    setStockList([]);
    setHistoryList([]);
    setInfoEdit({ val1: "", val2: "", remark: "" });

    // ✅ 툴바 초기화
    setSearchText("");
    setAppliedSearchText("");

    // 탭별 필터 초기화
    setFilterType("ALL");
    setSelectedWh("");
  };

  // ✅ 검색 버튼(또는 Enter) 눌러야 적용
  const handleSearchClick = () => {
    const trimmed = (searchText || "").trim();
    setSearchText(trimmed);
    setAppliedSearchText(trimmed);
  };

  const handleResetFilters = () => {
    setSearchText("");
    setAppliedSearchText("");

    setFilterType("ALL");
    setSelectedWh("");

    setSelectedTarget(null);
    setStockList([]);
    setHistoryList([]);
    setInfoEdit({ val1: "", val2: "", remark: "" });
  };

  const handleRowClick = async (target) => {
    setSelectedTarget(target);

    // ✅ 상세 입력 세팅
    if (viewMode === "ITEM") {
      setInfoEdit({
        val1: target.minQty ?? "",
        val2: target.maxQty ?? "",
        remark: target.remark ?? "",
      });
    } else {
      setInfoEdit({
        val1: target.whType ?? "",
        val2: target.useFlag ?? "Y",
        remark: target.remark ?? "",
      });
    }

    // ✅ 1) 재고 현황 (ITEM: 창고별 / WH: 보유 품목)
    try {
      let url = `${API.stocks}?size=1000`;
      if (viewMode === "ITEM") url += `&itemCd=${encodeURIComponent(target.itemCd)}`;
      else url += `&whCd=${encodeURIComponent(target.whCd)}`;

      const r = await fetch(url);
      if (!r.ok) throw new Error("stocks query fail");

      const d = await r.json();
      const rows = Array.isArray(d) ? d : d.content || [];

      const mapped = rows.map((row) => ({
        itemCd: row.id?.itemCd,
        whCd: row.id?.whCd,
        stockQty: safeNum(row.stockQty),
        allocQty: safeNum(row.allocQty),
      }));

      setStockList(mapped);
    } catch (e) {
      // fallback sample
      if (viewMode === "ITEM") {
        setStockList([
          { itemCd: target.itemCd, whCd: "WH001", stockQty: 250, allocQty: 50 },
          { itemCd: target.itemCd, whCd: "WH002", stockQty: 150, allocQty: 30 },
          { itemCd: target.itemCd, whCd: "WH003", stockQty: 80, allocQty: 20 },
        ]);
      } else {
        setStockList([
          { itemCd: "ITM001", whCd: target.whCd, stockQty: 500, allocQty: 100 },
          { itemCd: "ITM002", whCd: target.whCd, stockQty: 300, allocQty: 50 },
          { itemCd: "ITM003", whCd: target.whCd, stockQty: 1200, allocQty: 200 },
        ]);
      }
    }

    // ✅ 2) 입출고 이력 (ITEM 기준 or WH 기준)
    try {
      const params = new URLSearchParams();
      params.append("size", "100");
      params.append("sort", "trxDt,desc");

      if (viewMode === "ITEM") params.append("itemCd", target.itemCd);
      else params.append("whCd", target.whCd);

      const r = await fetch(`${API.history}?${params.toString()}`);
      if (!r.ok) throw new Error("history fetch fail");

      const d = await r.json();
      const rows = Array.isArray(d) ? d : d.content || [];
      setHistoryList(rows);
    } catch (e) {
      // fallback sample
      setHistoryList([
        { ioDt: "2025-01-05", ioType: "IN", whCd: "WH001", itemCd: "ITM001", qty: 100, allocQty: 0, balance: 350, custNm: "공급사 A", custCd: "CUST001" },
        { ioDt: "2025-01-03", ioType: "OUT", whCd: "WH001", itemCd: "ITM001", qty: -50, allocQty: 0, balance: 250, custNm: "주문처 B", custCd: "CUST002" },
        { ioDt: "2025-01-01", ioType: "PROD_RESULT", whCd: "WH002", itemCd: "ITM002", qty: 200, allocQty: 0, balance: 500, custNm: "생산부", custCd: null },
      ]);
    }
  };

  // (선택) 재고 부족 시 더블클릭 이동
  const handleItemDoubleClick = (item, currentQty) => {
    if (viewMode !== "ITEM") return;
    const minQty = safeNum(item.minQty);
    if (minQty > 0 && currentQty < minQty) {
      const returnUrl = encodeURIComponent(location.pathname);
      if (item.itemFlag === "01") {
        if (window.confirm(`[자재: ${item.itemNm}] 재고가 부족합니다.\n발주 관리 화면으로 이동하시겠습니까?`)) {
          navigate(`/구매영업관리/발주관리?itemCd=${item.itemCd}&returnPath=${returnUrl}`);
        }
      } else if (item.itemFlag === "02") {
        if (window.confirm(`[제품: ${item.itemNm}] 재고가 부족합니다.\n생산 실적 관리 화면으로 이동하시겠습니까?`)) {
          navigate(`/생산관리/생산실적관리?itemCd=${item.itemCd}&returnPath=${returnUrl}`);
        }
      }
    }
  };

  // ✅ 검색은 appliedSearchText 기준
  const filteredList = useMemo(() => {
    const kw = (appliedSearchText || "").toLowerCase();

    if (viewMode === "ITEM") {
      return (items || []).filter((it) => {
        if (filterType !== "ALL" && it.itemFlag !== filterType) return false;
        if (!kw) return true;
        return (
          String(it.itemCd || "").toLowerCase().includes(kw) ||
          String(it.itemNm || "").toLowerCase().includes(kw)
        );
      });
    }

    // WH
    let base = [...(whs || [])];
    if (selectedWh) base = base.filter((w) => String(w.whCd) === String(selectedWh));
    if (!kw) return base;

    return base.filter((wh) => {
      return (
        String(wh.whCd || "").toLowerCase().includes(kw) ||
        String(wh.whNm || "").toLowerCase().includes(kw) ||
        String(getWhTypeLabel(wh.whType) || "").toLowerCase().includes(kw)
      );
    });
  }, [items, whs, viewMode, filterType, selectedWh, appliedSearchText]);

  // 선택된 재고 합계
  const totalStockSummary = useMemo(() => {
    if (!stockList || stockList.length === 0) return null;
    return {
      stockQty: stockList.reduce((a, cur) => a + safeNum(cur.stockQty), 0),
      allocQty: stockList.reduce((a, cur) => a + safeNum(cur.allocQty), 0),
    };
  }, [stockList]);

  // -------------------------
  // Save (ITEM only)
  // -------------------------
  const handleSave = async () => {
    if (!selectedTarget) return;
    if (viewMode === "WH") return;
    if (!window.confirm("변경 내용을 저장하시겠습니까?")) return;

    try {
      const itemPayload = {
        ...selectedTarget,
        minQty: infoEdit.val1 === "" ? null : Number(infoEdit.val1),
        maxQty: infoEdit.val2 === "" ? null : Number(infoEdit.val2),
        remark: infoEdit.remark,
      };

      await fetch(API.items, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemPayload),
      });

      setSaveToast(true);
      await fetchMasters();
      setSelectedTarget(itemPayload);
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfoEdit((prev) => ({ ...prev, [name]: value }));
  };

  // -------------------------
  // Badges ✅ 여기 “통째로 해결됨”
  // -------------------------
  const getIoTypeBadge = (type) => {
    const t = normalizeIoType(type);

    let label = type || "-";
    let cls = "badge-soft";

    if (t.startsWith("PURCHASE_IN") || t === "IN") {
      label = "구매입고";
      cls = "badge-in";
    } else if (t === "OUT" || t === "SALES_OUT" || t === "SHIP_OUT" || t.startsWith("OUT")) {
      label = "출고";
      cls = "badge-out";
    } else if (t === "PROD_RESULT" || t.startsWith("PRODUCTION_IN")) {
      label = "생산입고";
      cls = "badge-prod";
    } else if (t === "PROD_USED" || t.startsWith("MATERIAL_USED")) {
      label = "자재사용";
      cls = "badge-used";
    } else if (t === "RESERVE" || t.startsWith("RESERVE")) {
      label = "예약";
      cls = "badge-reserve";
    } else if (t === "UNRESERVE" || t.startsWith("UNRESERVE")) {
      label = "예약해제";
      cls = "badge-gray";
    } else if (t === "WAIT_IN") {
      label = "입고대기";
      cls = "badge-soft";
    } else if (t === "WAIT_OUT") {
      label = "출고대기";
      cls = "badge-soft";
    } else {
      label = type || "-";
      cls = "badge-soft";
    }

    return <span className={`badge-pill ${cls}`}>{label}</span>;
  };

  if (loadingMasters) {
    return (
      <div className="inventory-page">
        <div className="customer-header">
          <h2>재고 관리</h2>
        </div>
        <div style={{ padding: 20, color: "#666" }}>데이터 로딩중...</div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <div className="customer-header">
        <h2>재고 관리</h2>
        {saveToast && <span className="save-toast">저장되었습니다.</span>}
      </div>

      <div className="inventory-layout">
        {/* ================= LEFT ================= */}
        <div className="left-pane">
          <div className="list-card">
            <div className="list-toolbar">
              <div className="toolbar-tabs">
                <button className={`tab-btn ${viewMode === "ITEM" ? "active" : ""}`} onClick={() => handleTabChange("ITEM")}>
                  품목
                </button>
                <button className={`tab-btn ${viewMode === "WH" ? "active" : ""}`} onClick={() => handleTabChange("WH")}>
                  창고
                </button>
              </div>

              <div className="toolbar-filters">
                {viewMode === "ITEM" && (
                  <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="ALL">전체</option>
                    <option value="01">자재</option>
                    <option value="02">제품</option>
                  </select>
                )}

                {viewMode === "WH" && (
                  <select
                    className="filter-select"
                    value={selectedWh}
                    onChange={(e) => {
                      setSelectedWh(e.target.value);
                      setSelectedTarget(null);
                      setStockList([]);
                      setHistoryList([]);
                      setInfoEdit({ val1: "", val2: "", remark: "" });
                    }}
                  >
                    <option value="">전체</option>
                    {(whs || []).map((w) => (
                      <option key={w.whCd} value={w.whCd}>
                        {w.whNm}
                      </option>
                    ))}
                  </select>
                )}

                <div className="search-box">
                  <input
                    placeholder={viewMode === "ITEM" ? "코드/품명 검색" : "코드/창고명 검색"}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchClick();
                    }}
                  />
                </div>

                <div className="filter-actions">
                  <button className="filter-search-btn" onClick={handleSearchClick}>
                    검색
                  </button>
                  <button className="filter-reset-btn" onClick={handleResetFilters}>
                    초기화
                  </button>
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table className={`inventory-table ${viewMode === "ITEM" ? "excel-mode" : ""}`}>
                <thead>
                  <tr>
                    {viewMode === "ITEM" ? (
                      <>
                        <th className="narrow-col">구분</th>
                        <th className="code-col">코드</th>
                        <th>품명</th>
                        <th className="number-col">총 재고</th>
                      </>
                    ) : (
                      <>
                        <th style={{ width: "110px" }}>창고 번호</th>
                        <th style={{ textAlign: "center" }}>창고 이름</th>
                        <th style={{ width: "110px", textAlign: "center" }}>창고 분류</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={viewMode === "ITEM" ? 4 : 3} className="empty-cell">
                        {viewMode === "ITEM" ? "조회된 품목이 없습니다." : "조회된 창고가 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((row, idx) => {
                      const isSelected =
                        viewMode === "ITEM" ? selectedTarget?.itemCd === row.itemCd : selectedTarget?.whCd === row.whCd;

                      let rowStyle = {};
                      let titleText = "";
                      if (viewMode === "ITEM") {
                        const totalQty = itemTotalStockMap[row.itemCd] || 0;
                        const min = safeNum(row.minQty);
                        const max = safeNum(row.maxQty);
                        if (min > 0 && totalQty < min) {
                          rowStyle = { backgroundColor: "#fff1f0", color: "#cf1322" };
                          titleText = "⚠️ 재고 부족";
                        } else if (max > 0 && totalQty > max) {
                          rowStyle = { backgroundColor: "#fffbe6", color: "#d48806" };
                          titleText = "⚠️ 재고 과다";
                        }
                      }

                      return (
                        <tr
                          key={idx}
                          className={isSelected ? "active-row" : ""}
                          style={isSelected ? {} : rowStyle}
                          title={titleText}
                          onClick={() => handleRowClick(row)}
                          onDoubleClick={() => viewMode === "ITEM" && handleItemDoubleClick(row, itemTotalStockMap[row.itemCd] || 0)}
                        >
                          {viewMode === "ITEM" ? (
                            <>
                              <td style={{ textAlign: "center" }}>
                                <span className={`badge-pill ${row.itemFlag === "01" ? "type-material" : "type-product"}`}>
                                  {row.itemFlag === "01" ? "자재" : "제품"}
                                </span>
                              </td>
                              <td className="code-cell">{row.itemCd}</td>
                              <td className="name-line" style={{ textAlign: "center" }}>
                                {row.itemNm}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "bold", color: "#555" }}>
                                {formatNum(itemTotalStockMap[row.itemCd] || 0)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="code-cell">{row.whCd}</td>
                              <td style={{ textAlign: "center" }}>{row.whNm}</td>
                              <td style={{ textAlign: "center" }}>
                                <span className="badge-soft">{getWhTypeLabel(row.whType)}</span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= MIDDLE ================= */}
        <div className="middle-pane">
          <div className="detail-card">
            <div className="detail-header">
              <div>
                <div className="detail-title-row">
                  <h3 className="detail-title">
                    {!selectedTarget ? "항목을 선택하세요" : viewMode === "ITEM" ? selectedTarget.itemNm : selectedTarget.whNm}
                  </h3>

                  {viewMode === "ITEM" && selectedTarget && (
                    <span className={`badge-pill ${selectedTarget.itemFlag === "01" ? "type-material" : "type-product"}`}>
                      {selectedTarget.itemFlag === "01" ? "자재" : "제품"}
                    </span>
                  )}
                </div>

                <div className="detail-sub">
                  {!selectedTarget ? "-" : viewMode === "ITEM" ? selectedTarget.itemCd : selectedTarget.whCd}
                </div>
              </div>

              {viewMode === "ITEM" && (
                <button className="excel-btn excel-btn-save" onClick={handleSave} disabled={!selectedTarget}>
                  저장
                </button>
              )}
            </div>

            <div className="detail-fields">
              {viewMode === "ITEM" && (
                <>
                  <div className="field-grid two-col read-only">
                    <label>총 재고</label>
                    <input type="text" value={formatNum(totalStockSummary?.stockQty || 0)} disabled />
                    <label>총 예약 재고</label>
                    <input type="text" value={formatNum(totalStockSummary?.allocQty || 0)} disabled />
                    <label>총 가용 재고</label>
                    <input
                      type="text"
                      value={formatNum((totalStockSummary?.stockQty || 0) - (totalStockSummary?.allocQty || 0))}
                      disabled
                    />
                  </div>

                  <div className="field-grid two-col">
                    <label>최소 재고</label>
                    <input name="val1" value={infoEdit.val1} onChange={handleInfoChange} type="number" disabled={!selectedTarget} />
                    <label>최대 재고</label>
                    <input name="val2" value={infoEdit.val2} onChange={handleInfoChange} type="number" disabled={!selectedTarget} />
                    <label>비고</label>
                    <input name="remark" value={infoEdit.remark} onChange={handleInfoChange} disabled={!selectedTarget} />
                  </div>
                </>
              )}

              {viewMode === "WH" && (
                <div className="field-grid two-col">
                  <label>창고 분류</label>
                  <input name="val1" value={infoEdit.val1} onChange={handleInfoChange} type="text" disabled />
                  <label>사용여부</label>
                  <input name="val2" value={infoEdit.val2} onChange={handleInfoChange} type="text" disabled />
                  <label>비고</label>
                  <input name="remark" value={infoEdit.remark} onChange={handleInfoChange} disabled />
                </div>
              )}
            </div>

            <div className="subsection">
              <div className="subsection-header">{viewMode === "ITEM" ? "🏠 창고별 재고 현황" : "📦 보유 품목 현황"}</div>

              <div className="table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center" }}>{viewMode === "ITEM" ? "창고" : "품목"}</th>
                      <th className="number-col">재고수량</th>
                      <th className="number-col">예약수량</th>
                      <th className="number-col">가용수량</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stockList.length > 0 && totalStockSummary && (
                      <tr style={{ backgroundColor: "#fafafa", borderBottom: "2px solid #ddd" }}>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>[전체 합계]</td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatNum(totalStockSummary.stockQty)}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatNum(totalStockSummary.allocQty)}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", color: "#0078d4" }}>
                          {formatNum(totalStockSummary.stockQty - totalStockSummary.allocQty)}
                        </td>
                      </tr>
                    )}

                    {stockList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      stockList.map((row, idx) => {
                        const name =
                          viewMode === "ITEM"
                            ? whNameMap.get(String(row.whCd)) || row.whCd
                            : itemNameMap.get(String(row.itemCd)) || row.itemCd;

                        return (
                          <tr key={idx}>
                            <td style={{ textAlign: "center" }}>{name}</td>
                            <td className="number-cell" style={{ fontWeight: "bold" }}>
                              {formatNum(row.stockQty)}
                            </td>
                            <td className="number-cell">{formatNum(row.allocQty)}</td>
                            <td className="number-cell" style={{ color: "#0078d4" }}>
                              {formatNum(row.stockQty - row.allocQty)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="right-pane">
          <div className="history-card">
            <div className="history-header">📊 입출고 이력</div>

            <div className="table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th style={{ width: "90px" }}>날짜</th>
                    <th style={{ width: "90px" }}>구분</th>
                    <th>{viewMode === "ITEM" ? "창고명" : "품목"}</th>
                    <th style={{ width: "80px", textAlign: "right" }}>변동량</th>
                    <th style={{ width: "110px", textAlign: "right" }}>예약 변동량</th>
                    <th style={{ width: "80px", textAlign: "right" }}>잔고</th>
                    <th style={{ width: "110px" }}>거래처</th>
                  </tr>
                </thead>

                <tbody>
                  {!selectedTarget ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        -
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        입출고 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    historyList.map((h, i) => {
                      const qty = safeNum(h.qty);
                      const allocDelta = safeNum(h.allocQty);

                      const thirdCol =
                        viewMode === "ITEM"
                          ? whNameMap.get(String(h.whCd)) || h.whCd
                          : itemNameMap.get(String(h.itemCd)) || h.itemCd;

                      return (
                        <tr key={i}>
                          <td className="date-cell" style={{ fontSize: "11px", textAlign: "center" }}>
                            {(h.ioDt || "").toString().substring(0, 10)}
                          </td>
                          <td style={{ textAlign: "center" }}>{getIoTypeBadge(h.ioType)}</td>
                          <td style={{ fontSize: "11px", textAlign: "center" }}>{thirdCol}</td>

                          <td className="number-cell" style={{ fontWeight: "bold", textAlign: "center" }}>
                            <span style={{ color: qty > 0 ? "#0078d4" : qty < 0 ? "#d13438" : "inherit" }}>
                              {qty > 0 ? `+${formatNum(qty)}` : formatNum(qty)}
                            </span>
                          </td>

                          <td
                            className="number-cell"
                            style={{
                              color: allocDelta > 0 ? "#70ad47" : allocDelta < 0 ? "#d13438" : "#999",
                              textAlign: "center",
                            }}
                          >
                            {allocDelta > 0 ? `+${formatNum(allocDelta)}` : formatNum(allocDelta)}
                          </td>

                          <td className="number-cell" style={{ textAlign: "center" }}>
                            {h.balance != null ? formatNum(h.balance) : "-"}
                          </td>

                          <td style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
                            {h.custNm || h.custCd || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
