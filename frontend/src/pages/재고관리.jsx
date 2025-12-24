// src/pages/재고관리.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../css/pages/재고관리.css";

const API = {
  items: "http://localhost:8080/api/item", // ItemController
  whs: "http://localhost:8080/api/whs",
  bom: "http://localhost:8080/api/bom", // GET /api/bom/{pItemCd}
  stocks: "http://localhost:8080/api/stocks", // GET /api/stocks?itemCd=&whCd=&page=&size=
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export default function 재고관리() {
  // ====== 마스터 ======
  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);

  // 좌측 목록(제품/자재)
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);

  // ====== 선택 ======
  const [selectedProduct, setSelectedProduct] = useState(null); // ItemMst
  const [selectedMaterialCd, setSelectedMaterialCd] = useState(""); // 상세에 띄울 자재 itemCd

  // ====== BOM ======
  const [bomList, setBomList] = useState([]); // [{sItemCd, sitem:{...}, useQty...}, ...]

  // ====== 검색/필터 ======
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL / 01(자재) / 02(제품)

  // ====== 구조도용: 자재별 창고 재고 데이터 ======
  // materialStocks[itemCd] = { totals:{stockQty,allocQty,availQty,whCnt}, rows:[{whCd,stockQty,allocQty}] }
  const [materialStocks, setMaterialStocks] = useState({});

  // ====== 우측 상세 ======
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 상세: ITEMMST 편집(min/max/remark)
  const [itemEdit, setItemEdit] = useState({ minQty: "", maxQty: "", remark: "" });

  // 상세: 창고별 재고(수정)
  const [whRows, setWhRows] = useState([]); // [{itemCd, whCd, stockQty, allocQty}]

  // ====== 맵 ======
  const itemMap = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(String(it.itemCd), it));
    return m;
  }, [items]);

  const whMap = useMemo(() => {
    const m = new Map();
    whs.forEach((w) => m.set(String(w.whCd ?? w.WH_CD), w));
    return m;
  }, [whs]);

  const getItem = (itemCd) => itemMap.get(String(itemCd));
  const getItemNm = (itemCd) => getItem(itemCd)?.itemNm ?? "";
  const getWhNm = (whCd) => whMap.get(String(whCd))?.whNm ?? whMap.get(String(whCd))?.WH_NM ?? "";

  const getItemTypeLabel = (itemCd) => {
    const flag = getItem(itemCd)?.itemFlag;
    if (flag === "01") return "자재";
    if (flag === "02") return "제품";
    return flag ? String(flag) : "-";
  };

  // ====== 로딩 ======
  const fetchMasters = async () => {
    // items
    try {
      const r = await fetch(API.items);
      const d = await r.json();
      const rows = Array.isArray(d) ? d : [];
      setItems(rows);
      setProducts(rows.filter((x) => x.itemFlag === "02"));
      setMaterials(rows.filter((x) => x.itemFlag === "01"));
    } catch {
      setItems([]);
      setProducts([]);
      setMaterials([]);
    }

    // whs
    try {
      const r = await fetch(API.whs);
      const d = await r.json();
      const rows = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
      setWhs(rows);
    } catch {
      setWhs([]);
    }
  };

  // 제품 선택 시 BOM 불러오기
  const fetchBom = async (pItemCd) => {
    const r = await fetch(`${API.bom}/${encodeURIComponent(pItemCd)}`);
    const d = await r.json();
    const rows = Array.isArray(d) ? d : [];
    setBomList(rows);
    return rows;
  };

  // 특정 자재의 "창고별 재고" 가져오기
  const fetchStockRowsByItem = async (itemCd) => {
    // Page 응답 대비
    const r = await fetch(`${API.stocks}?itemCd=${encodeURIComponent(itemCd)}&size=1000`);
    const d = await r.json();
    const rows = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];

    const mapped = rows.map((x) => ({
      itemCd: x?.id?.itemCd ?? itemCd,
      whCd: x?.id?.whCd ?? "",
      stockQty: safeNum(x?.stockQty),
      allocQty: safeNum(x?.allocQty),
    }));

    const stockSum = mapped.reduce((a, c) => a + safeNum(c.stockQty), 0);
    const allocSum = mapped.reduce((a, c) => a + safeNum(c.allocQty), 0);

    return {
      totals: {
        stockQty: stockSum,
        allocQty: allocSum,
        availQty: stockSum - allocSum,
        whCnt: mapped.length,
      },
      rows: mapped,
    };
  };

  // 제품 클릭하면: BOM 자재 전체에 대해 재고를 한 번에 세팅
  const loadProductStocks = async (pItemCd) => {
    const bomRows = await fetchBom(pItemCd);

    // BOM에 등장하는 자재코드 수집
    const matCds = bomRows
      .map((b) => b.sItemCd ?? b?.sitem?.itemCd)
      .filter(Boolean)
      .map(String);

    // 중복 제거
    const uniq = Array.from(new Set(matCds));

    // 자재별로 창고재고 가져오기(병렬)
    const results = await Promise.all(
      uniq.map(async (cd) => {
        try {
          const one = await fetchStockRowsByItem(cd);
          return [cd, one];
        } catch {
          return [cd, { totals: { stockQty: 0, allocQty: 0, availQty: 0, whCnt: 0 }, rows: [] }];
        }
      })
    );

    const next = {};
    results.forEach(([cd, v]) => (next[cd] = v));
    setMaterialStocks(next);
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  // ====== 이벤트 ======
  const handleProductClick = async (p) => {
    setSelectedProduct(p);
    setSelectedMaterialCd("");
    setIsDetailOpen(false);
    setWhRows([]);
    setItemEdit({ minQty: "", maxQty: "", remark: "" });

    await loadProductStocks(p.itemCd);
  };

  // 자재 클릭(우측 상세 열기)
  const openMaterialDetail = async (itemCd) => {
    setSelectedMaterialCd(itemCd);
    setIsDetailOpen(true);

    // 1) ITEMMST 편집값 세팅
    const it = getItem(itemCd);
    setItemEdit({
      minQty: it?.minQty ?? "",
      maxQty: it?.maxQty ?? "",
      remark: it?.remark ?? "",
    });

    // 2) 창고별 재고 세팅(구조도에서 이미 로딩된 경우 재사용)
    let data = materialStocks[itemCd];
    if (!data) data = await fetchStockRowsByItem(itemCd);

    setWhRows(data.rows);
  };

  // 검색/필터 적용된 “구조도에 보여줄 자재 리스트”
  const visibleBomMaterials = useMemo(() => {
    if (!selectedProduct) return [];

    const kw = searchText.trim().toLowerCase();

    // BOM에 있는 자재 목록을 "자재코드 기준"으로 유니크하게 보여주기
    const cds = bomList
      .map((b) => String(b.sItemCd ?? b?.sitem?.itemCd ?? ""))
      .filter(Boolean);

    const uniq = Array.from(new Set(cds));

    return uniq.filter((cd) => {
      // 품목구분 필터
      if (filterType !== "ALL") {
        const flag = getItem(cd)?.itemFlag;
        if (String(flag ?? "") !== String(filterType)) return false;
      }
      if (!kw) return true;

      const nm = (getItemNm(cd) || "").toLowerCase();
      return cd.toLowerCase().includes(kw) || nm.includes(kw);
    });
  }, [selectedProduct, bomList, searchText, filterType, items]);

  // 최소재고 경고(우측 상세 기준: 합산 재고 기준)
  const isLowStock = useMemo(() => {
    if (!selectedMaterialCd) return false;
    const min = getItem(selectedMaterialCd)?.minQty;
    if (min === null || min === undefined || min === "") return false;
    const total = materialStocks[selectedMaterialCd]?.totals?.stockQty ?? 0;
    return Number(total) <= Number(min);
  }, [selectedMaterialCd, materialStocks, items]);

  // ====== 입력 변경 ======
  const handleItemEditChange = (e) => {
    const { name, value } = e.target;
    setItemEdit((p) => ({ ...p, [name]: value }));
  };

  const handleWhRowChange = (idx, field, value) => {
    setWhRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value === "" ? "" : Number(value) };
      return next;
    });
  };

  // ====== 저장(우측 상세) ======
  const handleSaveAll = async () => {
    const itemCd = selectedMaterialCd;
    if (!itemCd) return alert("자재를 선택하세요.");

    // (A) ITEMMST 저장(POST /api/item)
    const origin = getItem(itemCd);
    if (!origin) return alert("ITEMMST 데이터가 없습니다. /api/item 확인!");

    const itemPayload = {
      ...origin,
      minQty: itemEdit.minQty === "" ? null : Number(itemEdit.minQty),
      maxQty: itemEdit.maxQty === "" ? null : Number(itemEdit.maxQty),
      remark: itemEdit.remark ?? "",
    };

    // (B) 창고별 재고 검증
    for (const r of whRows) {
      const s = Number(r.stockQty ?? 0);
      const a = Number(r.allocQty ?? 0);
      if (a > s) return alert(`예약수량이 재고수량보다 큽니다: ${r.whCd}`);
    }

    try {
      // 1) ITEMMST 저장
      const itemRes = await fetch(API.items, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemPayload),
      });

      if (!itemRes.ok) {
        const txt = await itemRes.text().catch(() => "");
        alert(`ITEMMST 저장 실패\n${txt}`);
        return;
      }

      // 2) 창고별 재고 저장 (PUT /api/stocks/{itemCd}/{whCd})
      for (const r of whRows) {
        const payload = {
          id: { itemCd: r.itemCd, whCd: r.whCd },
          stockQty: Number(r.stockQty ?? 0),
          allocQty: Number(r.allocQty ?? 0),
        };

        const res = await fetch(
          `${API.stocks}/${encodeURIComponent(r.itemCd)}/${encodeURIComponent(r.whCd)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          alert(`재고 저장 실패: ${r.itemCd}/${r.whCd}\n${txt}`);
          return;
        }
      }

      // 재로딩(현재 제품의 자재 재고 다시)
      alert("저장 완료");
      await fetchMasters();
      if (selectedProduct) await loadProductStocks(selectedProduct.itemCd);
      // 상세 갱신
      await openMaterialDetail(itemCd);
    } catch (e) {
      console.error(e);
      alert("저장 중 오류");
    }
  };

  // ====== 렌더 ======
  const detailTotals = selectedMaterialCd ? materialStocks[selectedMaterialCd]?.totals : null;
  const detailStock = detailTotals?.stockQty ?? 0;
  const detailAlloc = detailTotals?.allocQty ?? 0;
  const detailAvail = detailTotals?.availQty ?? 0;

  const resetAll = () => {
    setSelectedProduct(null);
    setBomList([]);
    setMaterialStocks({});
    setSelectedMaterialCd("");
    setIsDetailOpen(false);
    setWhRows([]);
    setItemEdit({ minQty: "", maxQty: "", remark: "" });
    setSearchText("");
    setFilterType("ALL");
  };

  return (
    <div className="stock-management-container">
      <div className="stock-management-wrapper">
        {/* 헤더 */}
        <div className="stock-header">
          <h2 className="stock-title">재고 관리</h2>
          <div className="header-buttons">
            <button className="excel-btn excel-btn-new" onClick={resetAll}>
              신규
            </button>
          </div>
        </div>

        {/* 상단 검색 */}
        <div className="stock-search">
          <label className="search-label">검색</label>
          <input
            className="search-input"
            placeholder="자재코드/명"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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

          <button className="excel-btn" onClick={() => {}}>
            조회
          </button>
        </div>

        {/* ====== BOM 같은 3단 레이아웃 ====== */}
        <div className={`stock-bom-layout ${isDetailOpen ? "split" : "full"}`}>
          {/* 좌측: 제품/자재 목록 */}
          <div className="stock-bom-left">
            {/* 제품 목록 */}
            <div className="panel-box">
              <div className="panel-header">📦 제품 목록</div>
              <div className="table-scroll-area">
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th className="excel-th" style={{ width: 50 }}>
                        No
                      </th>
                      <th className="excel-th" style={{ width: 120 }}>
                        코드
                      </th>
                      <th className="excel-th">품명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr
                        key={p.itemCd}
                        className={`excel-tr ${
                          selectedProduct?.itemCd === p.itemCd ? "selected" : ""
                        }`}
                        onClick={() => handleProductClick(p)}
                      >
                        <td className="excel-td">{i + 1}</td>
                        <td className="excel-td">{p.itemCd}</td>
                        <td className="excel-td" style={{ textAlign: "left" }}>
                          {p.itemNm}
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td
                          className="excel-td"
                          colSpan={3}
                          style={{ padding: 12, color: "#777" }}
                        >
                          제품이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 자재 목록(전체 자재) */}
            <div className="panel-box" style={{ marginTop: 12 }}>
              <div className="panel-header">🔩 자재 목록</div>
              <div className="table-scroll-area">
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th className="excel-th" style={{ width: 50 }}>
                        No
                      </th>
                      <th className="excel-th" style={{ width: 120 }}>
                        코드
                      </th>
                      <th className="excel-th">품명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m, i) => (
                      <tr
                        key={m.itemCd}
                        className={`excel-tr ${selectedMaterialCd === m.itemCd ? "selected" : ""}`}
                        onClick={() => openMaterialDetail(m.itemCd)}
                      >
                        <td className="excel-td">{i + 1}</td>
                        <td className="excel-td">{m.itemCd}</td>
                        <td className="excel-td" style={{ textAlign: "left" }}>
                          {m.itemNm}
                        </td>
                      </tr>
                    ))}
                    {materials.length === 0 && (
                      <tr>
                        <td
                          className="excel-td"
                          colSpan={3}
                          style={{ padding: 12, color: "#777" }}
                        >
                          자재가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 중앙: 구조도(제품 선택하면 BOM 자재 + 창고별 재고를 쭉 표시) */}
          <div className="stock-bom-center">
            <div className="panel-header" style={{ marginBottom: 10 }}>
              구조도
            </div>

            {!selectedProduct ? (
              <div style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
                제품을 선택하세요
              </div>
            ) : (
              <div>
                <div className="bom-tree-root">
                  📦 {selectedProduct.itemNm} ({selectedProduct.itemCd})
                </div>

                {visibleBomMaterials.length === 0 ? (
                  <div style={{ marginLeft: 16, color: "#999" }}>(BOM 자재 없음)</div>
                ) : (
                  visibleBomMaterials.map((matCd) => {
                    const totals =
                      materialStocks[matCd]?.totals ?? {
                        stockQty: 0,
                        allocQty: 0,
                        availQty: 0,
                        whCnt: 0,
                      };
                    const rows = materialStocks[matCd]?.rows ?? [];

                    const minQty = getItem(matCd)?.minQty;
                    const low =
                      minQty !== null &&
                      minQty !== undefined &&
                      minQty !== "" &&
                      Number(totals.stockQty) <= Number(minQty);

                    return (
                      <div key={matCd} className="bom-tree-block">
                        <div
                          className={`bom-tree-node ${
                            selectedMaterialCd === matCd ? "selected-node" : ""
                          }`}
                          onClick={() => openMaterialDetail(matCd)}
                          title="클릭하면 우측 상세에서 수정/저장"
                        >
                          📄 {getItemNm(matCd) || matCd} ({matCd})
                          <div className="bom-tree-sub">
                            합산 재고:{" "}
                            <b className={low ? "text-low" : ""}>{totals.stockQty}</b> / 예약:{" "}
                            {totals.allocQty} / 가용: {totals.availQty}{" "}
                            <span style={{ color: "#777" }}>(창고 {totals.whCnt})</span>
                          </div>
                          {low && (
                            <div className="stock-warning" style={{ marginTop: 6 }}>
                              ⚠ 최소재고({minQty}) 이하입니다. 보충이 필요합니다.
                            </div>
                          )}
                        </div>

                        {/* ✅ “어느 창고에 얼마나 있는지” 표시 */}
                        <div className="bom-tree-warehouses">
                          {rows.length === 0 ? (
                            <div style={{ marginLeft: 18, color: "#999" }}>(창고 재고 없음)</div>
                          ) : (
                            <table className="excel-table" style={{ marginTop: 6 }}>
                              <thead>
                                <tr>
                                  <th className="excel-th" style={{ width: 160 }}>
                                    창고
                                  </th>
                                  <th className="excel-th" style={{ width: 120 }}>
                                    재고
                                  </th>
                                  <th className="excel-th" style={{ width: 120 }}>
                                    예약
                                  </th>
                                  <th className="excel-th">가용</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, idx) => (
                                  <tr key={`${matCd}-${r.whCd}-${idx}`} className="excel-tr">
                                    <td className="excel-td" style={{ textAlign: "left" }}>
                                      {r.whCd} {getWhNm(r.whCd) ? `/ ${getWhNm(r.whCd)}` : ""}
                                    </td>
                                    <td className="excel-td">{r.stockQty}</td>
                                    <td className="excel-td">{r.allocQty}</td>
                                    <td className="excel-td">
                                      {Number(r.stockQty || 0) - Number(r.allocQty || 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 우측: 상세(수정/저장) */}
          {isDetailOpen && (
            <div className="stock-detail-panel">
              {/* ✅ 헤더에 저장 버튼 (항상 보이게) */}
              <div className="detail-header detail-header-sticky">
                <h3 className="detail-title">상세 정보</h3>
                <div className="detail-header-actions">
                  <button className="excel-btn excel-btn-save" onClick={handleSaveAll}>
                    저장
                  </button>
                  <button className="detail-close-btn" onClick={() => setIsDetailOpen(false)}>
                    ✕
                  </button>
                </div>
              </div>

              {/* ✅ 상세 패널 전체 스크롤 */}
              <div className="detail-content detail-content-scroll">
                {/* 제품/자재 표시 */}
                <div className="detail-row">
                  <div className="detail-field">
                    <label>제품코드</label>
                    <input className="detail-input" value={selectedProduct?.itemCd ?? ""} readOnly />
                  </div>
                  <div className="detail-field">
                    <label>제품명</label>
                    <input className="detail-input" value={selectedProduct?.itemNm ?? ""} readOnly />
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-field">
                    <label>품목코드</label>
                    <input className="detail-input" value={selectedMaterialCd} readOnly />
                  </div>
                  <div className="detail-field">
                    <label>품목명</label>
                    <input
                      className="detail-input"
                      value={selectedMaterialCd ? getItemNm(selectedMaterialCd) : ""}
                      readOnly
                    />
                  </div>
                </div>

                {/* 합산 */}
                <div className="detail-row">
                  <div className="detail-field">
                    <label>재고수량(합산)</label>
                    <input
                      className={`detail-input ${isLowStock ? "stock-low" : ""}`}
                      value={detailStock}
                      readOnly
                    />
                    {isLowStock && (
                      <div className="stock-warning">⚠ 최소재고 이하입니다. 보충이 필요합니다.</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>예약수량(합산)</label>
                    <input className="detail-input" value={detailAlloc} readOnly />
                  </div>
                </div>

                <div className="detail-row detail-row-full">
                  <div className="detail-field">
                    <label>가용수량</label>
                    <input className="detail-input" value={detailAvail} readOnly />
                  </div>
                </div>

                {/* MIN/MAX/REMARK 수정 */}
                <div className="detail-row">
                  <div className="detail-field">
                    <label>최소재고(MIN_QTY)</label>
                    <input
                      className="detail-input"
                      name="minQty"
                      type="number"
                      value={itemEdit.minQty}
                      onChange={handleItemEditChange}
                    />
                  </div>
                  <div className="detail-field">
                    <label>최대재고(MAX_QTY)</label>
                    <input
                      className="detail-input"
                      name="maxQty"
                      type="number"
                      value={itemEdit.maxQty}
                      onChange={handleItemEditChange}
                    />
                  </div>
                </div>

                <div className="detail-row detail-row-full">
                  <div className="detail-field">
                    <label>비고(REMARK)</label>
                    <textarea
                      className="detail-input"
                      name="remark"
                      rows={3}
                      value={itemEdit.remark}
                      onChange={handleItemEditChange}
                    />
                  </div>
                </div>

                {/* 창고별 재고 수정 (✅ 테이블만 따로 스크롤 X, 우측 전체 스크롤로 처리) */}
                <div className="detail-row detail-row-full">
                  <div className="detail-field">
                    <label>창고별 재고(수정 가능)</label>

                    <table className="excel-table" style={{ marginTop: 6 }}>
                      <thead>
                        <tr>
                          <th className="excel-th">창고코드</th>
                          <th className="excel-th">창고명</th>
                          <th className="excel-th">재고수량</th>
                          <th className="excel-th">예약수량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {whRows.map((r, idx) => (
                          <tr key={`${r.whCd}-${idx}`} className="excel-tr">
                            <td className="excel-td">{r.whCd}</td>
                            <td className="excel-td" style={{ textAlign: "left" }}>
                              {getWhNm(r.whCd) || "-"}
                            </td>
                            <td className="excel-td">
                              <input
                                type="number"
                                value={r.stockQty}
                                onChange={(e) => handleWhRowChange(idx, "stockQty", e.target.value)}
                                style={{ width: "100%" }}
                              />
                            </td>
                            <td className="excel-td">
                              <input
                                type="number"
                                value={r.allocQty}
                                onChange={(e) => handleWhRowChange(idx, "allocQty", e.target.value)}
                                style={{ width: "100%" }}
                              />
                            </td>
                          </tr>
                        ))}

                        {whRows.length === 0 && (
                          <tr>
                            <td className="excel-td" colSpan={4} style={{ padding: 12, color: "#777" }}>
                              이 자재의 창고별 재고가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 패널 하단 여백(스크롤 끝에서 입력 안 잘리게) */}
                <div style={{ height: 24 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
