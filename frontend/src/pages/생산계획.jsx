import React, { useEffect, useMemo, useState } from "react";
import "../css/pages/생산계획.css";

/**
 * 사용 API (현재 너희 프로젝트 기준)
 * - 제품목록: GET /api/item  (ITEM_FLAG=02만 제품)
 * - BOM:     GET /api/bom/{pItemCd}
 * - 재고:    GET /api/stocks?itemCd=xxx&size=1000   (창고별 재고)
 *
 * ※ 생산계획/실적/입출고 저장 API는 아직 없다고 보고 UI만 만들어둠 (TODO 표시)
 */

const API = {
  items: "http://localhost:8080/api/item",
  bom: "http://localhost:8080/api/bom",
  stocks: "http://localhost:8080/api/stocks",
  whs: "http://localhost:8080/api/whs",
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const STATUS = {
  "01": "준비(기획중)",
  "02": "확정됨(MRP준비)",
  "03": "생산대기(MRP완료)",
  "04": "생산중",
  "05": "생산완료",
  "09": "취소",
};

const ORDER = ["01", "02", "03", "04", "05"]; // 정상 진행 순서

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// BOM에서 동일 자재가 여러 줄일 수 있으니 useQty 합산
function aggregateBom(bomRows) {
  const map = new Map(); // sItemCd -> {sItemCd, useQtySum, rawRows[]}
  for (const b of bomRows) {
    const cd = String(b?.sItemCd ?? b?.sitem?.itemCd ?? "");
    if (!cd) continue;
    const useQty = safeNum(b?.useQty);
    const prev = map.get(cd);
    if (!prev) map.set(cd, { sItemCd: cd, useQtySum: useQty, rawRows: [b] });
    else {
      prev.useQtySum += useQty;
      prev.rawRows.push(b);
      map.set(cd, prev);
    }
  }
  return Array.from(map.values());
}

export default function 생산계획() {
  // ====== 마스터 ======
  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);

  // ====== 화면 A: 제품 목록 ======
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ====== 화면 C: 계획 입력 ======
  const [plan, setPlan] = useState({
    prodNo: "",          // 문자열
    prodDt: todayYYYYMMDD(), // date
    itemCd: "",
    itemNm: "",
    planQty: 0,
    status: "01",
    remark: "",
    storeWhCd: "",       // 입고용(완제품 들어갈 창고)
  });

  // ====== BOM + MRP ======
  const [bomRows, setBomRows] = useState([]);           // 원본 BOM
  const [bomAgg, setBomAgg] = useState([]);             // 자재코드별 useQty 합산
  // mrp[matCd] = { required, totals:{stock,alloc,avail}, rows:[{whCd,stockQty,allocQty,avail}] , ok }
  const [mrp, setMrp] = useState({});
  const [loadingMrp, setLoadingMrp] = useState(false);

  // ====== 선택(자재) ======
  const [selectedMatCd, setSelectedMatCd] = useState("");

  // ====== 화면 상태 ======
  const [message, setMessage] = useState("");

  // ====== Map ======
  const itemMap = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(String(it.itemCd ?? it.ITEM_CD), it));
    return m;
  }, [items]);

  const whMap = useMemo(() => {
    const m = new Map();
    whs.forEach((w) => m.set(String(w.whCd ?? w.WH_CD), w));
    return m;
  }, [whs]);

  const getItem = (itemCd) => itemMap.get(String(itemCd));
  const getItemNm = (itemCd) => getItem(itemCd)?.itemNm ?? getItem(itemCd)?.ITEM_NM ?? "";
  const getWhNm = (whCd) => whMap.get(String(whCd))?.whNm ?? whMap.get(String(whCd))?.WH_NM ?? "";

  // ====== 로딩: 제품/창고 ======
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.items);
        const d = await r.json();
        const rows = Array.isArray(d) ? d : [];
        setItems(rows);
        setProducts(rows.filter((x) => String(x.itemFlag ?? x.ITEM_FLAG) === "02"));
      } catch {
        setItems([]);
        setProducts([]);
      }

      try {
        const r = await fetch(API.whs);
        const d = await r.json();
        const rows = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
        setWhs(rows);
      } catch {
        setWhs([]);
      }
    })();
  }, []);

  // ====== A 영역: 제품 검색 ======
  const visibleProducts = useMemo(() => {
    const kw = productSearch.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) => {
      const cd = String(p.itemCd ?? "");
      const nm = String(p.itemNm ?? "").toLowerCase();
      return cd.toLowerCase().includes(kw) || nm.includes(kw);
    });
  }, [products, productSearch]);

  // ====== BOM / 재고 ======
  const fetchBom = async (pItemCd) => {
    const r = await fetch(`${API.bom}/${encodeURIComponent(pItemCd)}`);
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  };

  const fetchStocksByItem = async (itemCd) => {
    const r = await fetch(`${API.stocks}?itemCd=${encodeURIComponent(itemCd)}&size=1000`);
    const d = await r.json();
    const rows = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
    const mapped = rows.map((x) => {
      const whCd = x?.id?.whCd ?? "";
      const stockQty = safeNum(x?.stockQty);
      const allocQty = safeNum(x?.allocQty);
      return {
        whCd,
        stockQty,
        allocQty,
        availQty: stockQty - allocQty,
      };
    });

    const stockSum = mapped.reduce((a, c) => a + safeNum(c.stockQty), 0);
    const allocSum = mapped.reduce((a, c) => a + safeNum(c.allocQty), 0);
    return {
      totals: { stockQty: stockSum, allocQty: allocSum, availQty: stockSum - allocSum, whCnt: mapped.length },
      rows: mapped,
    };
  };

  const calcMrp = async (pItemCd, planQty) => {
    setLoadingMrp(true);
    try {
      const bom = await fetchBom(pItemCd);
      setBomRows(bom);

      const agg = aggregateBom(bom);
      setBomAgg(agg);

      const uniqMat = agg.map((x) => x.sItemCd);

      const results = await Promise.all(
        uniqMat.map(async (matCd) => {
          const one = await fetchStocksByItem(matCd);
          const useQty = agg.find((x) => x.sItemCd === matCd)?.useQtySum ?? 0;
          const required = safeNum(useQty) * safeNum(planQty);

          const ok = Number(one?.totals?.availQty ?? 0) >= Number(required);

          return [
            matCd,
            {
              required,
              useQtyPerOne: safeNum(useQty),
              totals: one.totals,
              rows: one.rows,
              ok,
            },
          ];
        })
      );

      const next = {};
      results.forEach(([matCd, v]) => (next[matCd] = v));
      setMrp(next);
    } catch (e) {
      console.error(e);
      setBomRows([]);
      setBomAgg([]);
      setMrp({});
    } finally {
      setLoadingMrp(false);
    }
  };

  // ====== A 영역: 제품 선택 ======
  const handleSelectProduct = async (p) => {
    setSelectedProduct(p);
    setSelectedMatCd("");
    setMessage("");

    const itemCd = String(p.itemCd ?? "");
    const itemNm = String(p.itemNm ?? "");

    setPlan((prev) => ({
      ...prev,
      itemCd,
      itemNm,
      status: "01",
      planQty: prev.planQty ?? 0,
    }));

    // planQty가 0이면 계산 의미가 없어서, 1로 임시 계산하지 않고 그냥 비워둠
    if (safeNum(plan.planQty) > 0) {
      await calcMrp(itemCd, safeNum(plan.planQty));
    } else {
      setBomRows([]);
      setBomAgg([]);
      setMrp({});
    }
  };

  // ====== C 영역: 입력 변경 ======
  const handlePlanChange = (e) => {
    const { name, value } = e.target;

    setPlan((prev) => ({
      ...prev,
      [name]: name === "planQty" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  // planQty 변경 시 MRP 다시 계산(제품 선택되어 있을 때)
  useEffect(() => {
    if (!selectedProduct) return;
    const qty = safeNum(plan.planQty);
    if (qty <= 0) {
      setMrp({});
      return;
    }
    calcMrp(selectedProduct.itemCd, qty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.planQty, selectedProduct?.itemCd]);

  // ====== 진행 단계 계산 ======
  const stage = useMemo(() => {
    const s = plan.status;
    if (s === "09") return "취소됨";
    if (s === "01") return "1) 준비";
    if (s === "02") return "2) MRP";
    if (s === "03") return "2) MRP (확인완료)";
    if (s === "04") return "3) 생산중";
    if (s === "05") return "4) 생산완료 → 5) 입고";
    return s;
  }, [plan.status]);

  const allMrpOk = useMemo(() => {
    const keys = Object.keys(mrp);
    if (keys.length === 0) return false;
    return keys.every((k) => mrp[k]?.ok === true);
  }, [mrp]);

  const canGoNext = useMemo(() => {
    if (!plan.itemCd) return false;
    if (plan.status === "09" || plan.status === "05") return false;

    // 01 -> 02 : 저장/확정 느낌 (가능)
    if (plan.status === "01") return true;

    // 02 -> 03 : MRP 확인 완료는 "모든 자재 OK"일 때만
    if (plan.status === "02") return allMrpOk;

    // 03 -> 04 : 생산중 진입
    if (plan.status === "03") return true;

    // 04 -> 05 : 생산완료
    if (plan.status === "04") return true;

    return false;
  }, [plan.status, plan.itemCd, allMrpOk]);

  const nextStatus = useMemo(() => {
    const idx = ORDER.indexOf(plan.status);
    if (idx < 0) return plan.status;
    return ORDER[Math.min(idx + 1, ORDER.length - 1)];
  }, [plan.status]);

  // ====== C 영역: 저장(계획 저장) ======
  const handleSavePlan = async () => {
    if (!plan.itemCd) return alert("제품을 선택하세요.");
    if (!plan.prodNo) return alert("생산계획번호(PROD_NO)를 입력하세요. (문자)");
    if (!plan.prodDt) return alert("계획일자(PROD_DT)를 입력하세요. (date)");
    if (safeNum(plan.planQty) <= 0) return alert("계획수량(PLAN_QTY)을 1 이상 입력하세요.");

    // TODO: 실제 저장 API 붙이면 여기서 POST
    // 예) POST /api/prod  { prodNo, prodDt, itemCd, planQty, status, remark }
    setMessage("✅ (UI) 생산계획 저장 처리됨 (실제 저장 API 연결 필요)");
  };

  // ====== 다음단계 ======
  const handleGoNext = async () => {
    if (!canGoNext) {
      if (plan.status === "02" && !allMrpOk) {
        return alert("MRP 결과가 부족합니다. (자재 부족 ✕) 인 항목을 확인하세요.");
      }
      return;
    }

    const ns = nextStatus;
    setPlan((p) => ({ ...p, status: ns }));
    setMessage(`➡ 상태 변경: ${STATUS[plan.status]} → ${STATUS[ns]}`);

    // TODO: 실제 저장 API 연결 시, 상태 업데이트도 서버에 반영
  };

  // ====== 취소(언제든지) ======
  const handleCancel = async () => {
    if (!plan.itemCd) return;
    if (!window.confirm("정말 취소하시겠습니까?")) return;

    setPlan((p) => ({ ...p, status: "09" }));
    setMessage("⛔ 취소 처리됨");

    // TODO: 서버 상태도 09로 업데이트
  };

  // ====== D 영역: 입고 처리(완제품 창고 입고 + IO_TYPE 기록) ======
  const handleStoreFinished = async () => {
    if (plan.status !== "05") return alert("생산완료(05) 상태에서만 입고 처리할 수 있어요.");
    if (!plan.storeWhCd) return alert("입고할 창고를 선택하세요.");

    // TODO:
    // 1) 완제품 재고 증가 (ItemStock에 +planQty)
    // 2) IO_TYPE 기록 남기기
    // 3) 완료 메시지/화면 처리
    setMessage("✅ (UI) 입고 처리됨 (실제 입고/IO 기록 API 연결 필요)");
  };

  // ====== D 영역: 선택된 자재 상세 ======
  const selectedMrp = selectedMatCd ? mrp[selectedMatCd] : null;

  return (
    <div className="prodplan-container">
      {/* 상단 타이틀 */}
      <div className="prodplan-header">
        <div className="prodplan-title">생산 계획</div>
        <div className="prodplan-header-right">
          <div className="prodplan-stage">현재: {STATUS[plan.status] ?? plan.status} / {stage}</div>
          <button className="pp-btn btn-cancel" onClick={handleCancel} disabled={!plan.itemCd || plan.status === "09"}>
            취소
          </button>
        </div>
      </div>

      {/* 2x2 그리드 */}
      <div className="prodplan-grid">
        {/* A: 제품 목록 */}
        <section className="pp-panel pp-a">
          <div className="pp-panel-header">
            <div>📦 제품 목록</div>
            <input
              className="pp-input"
              placeholder="코드/명 검색"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="pp-panel-body">
            <div className="pp-table-scroll">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>No</th>
                    <th style={{ width: 140 }}>코드</th>
                    <th>명칭</th>
                    <th style={{ width: 90 }}>규격</th>
                    <th style={{ width: 90 }}>단가</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p, i) => (
                    <tr
                      key={p.itemCd}
                      className={selectedProduct?.itemCd === p.itemCd ? "selected" : ""}
                      onClick={() => handleSelectProduct(p)}
                    >
                      <td>{i + 1}</td>
                      <td>{p.itemCd}</td>
                      <td style={{ textAlign: "left" }}>{p.itemNm}</td>
                      <td>{p.itemSpec ?? ""}</td>
                      <td style={{ textAlign: "right" }}>{p.itemCost ?? ""}</td>
                    </tr>
                  ))}
                  {visibleProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="pp-empty">
                        제품이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* C: 무엇을/몇개/상태 */}
        <section className="pp-panel pp-c">
          <div className="pp-panel-header">
            <div>📝 생산계획 입력</div>
            <div className="pp-actions">
              <button className="pp-btn btn-save" onClick={handleSavePlan} disabled={plan.status === "09"}>
                저장
              </button>
              <button className="pp-btn btn-next" onClick={handleGoNext} disabled={!canGoNext || plan.status === "09"}>
                다음단계
              </button>
            </div>
          </div>

          <div className="pp-panel-body pp-scroll">
            <div className="pp-form">
              <div className="pp-row">
                <div className="pp-field">
                  <label>PROD_NO (문자)</label>
                  <input
                    className="pp-input"
                    name="prodNo"
                    value={plan.prodNo}
                    onChange={handlePlanChange}
                    placeholder="예: PRD202501-001"
                    disabled={plan.status === "09"}
                  />
                </div>
                <div className="pp-field">
                  <label>PROD_DT (date)</label>
                  <input
                    className="pp-input"
                    type="date"
                    name="prodDt"
                    value={plan.prodDt}
                    onChange={handlePlanChange}
                    disabled={plan.status === "09"}
                  />
                </div>
              </div>

              <div className="pp-row">
                <div className="pp-field">
                  <label>무엇을 만들지 (제품)</label>
                  <input className="pp-input" value={plan.itemCd ? `${plan.itemCd} - ${plan.itemNm}` : ""} readOnly />
                </div>
              </div>

              <div className="pp-row">
                <div className="pp-field">
                  <label>몇 개 만들지 (PLAN_QTY)</label>
                  <input
                    className="pp-input"
                    type="number"
                    name="planQty"
                    value={plan.planQty}
                    onChange={handlePlanChange}
                    disabled={!plan.itemCd || plan.status === "09"}
                  />
                </div>
                <div className="pp-field">
                  <label>진행상태 (STATUS)</label>
                  <input className="pp-input" value={STATUS[plan.status] ?? plan.status} readOnly />
                </div>
              </div>

              <div className="pp-row">
                <div className="pp-field">
                  <label>비고</label>
                  <textarea
                    className="pp-input"
                    rows={3}
                    name="remark"
                    value={plan.remark}
                    onChange={handlePlanChange}
                    disabled={plan.status === "09"}
                  />
                </div>
              </div>

              {message && <div className="pp-message">{message}</div>}

              <div className="pp-hint">
                - “다음단계”는 상태에 따라 조건이 있어요. <br />
                - 특히 <b>확정됨(02) → 생산대기(03)</b>는 <b>MRP가 전부 ✓</b>일 때만 가능하게 해뒀어.
              </div>
            </div>
          </div>
        </section>

        {/* B: 단계 표시(준비/MRP/생산중/완료/입고) */}
        <section className="pp-panel pp-b">
          <div className="pp-panel-header">
            <div>🧭 진행 단계</div>
          </div>

          <div className="pp-panel-body">
            <ol className="pp-steps">
              <li className={plan.status === "01" ? "on" : ""}>1) 준비</li>
              <li className={plan.status === "02" || plan.status === "03" ? "on" : ""}>2) MRP (BOM/자재가능 여부)</li>
              <li className={plan.status === "04" ? "on" : ""}>3) 생산중</li>
              <li className={plan.status === "05" ? "on" : ""}>4) 생산완료</li>
              <li className={plan.status === "05" ? "on" : ""}>5) 입고 + IO 기록</li>
              <li className={plan.status === "09" ? "cancel" : ""}>취소(09)</li>
            </ol>

            <div className="pp-mini">
              <div><b>MRP 결과:</b> {Object.keys(mrp).length === 0 ? "-" : allMrpOk ? "✅ 가능" : "❌ 부족"}</div>
              <div><b>선택 자재:</b> {selectedMatCd ? `${selectedMatCd} (${getItemNm(selectedMatCd)})` : "-"}</div>
            </div>
          </div>
        </section>

        {/* D: 상태별 상세 (MRP/생산중/완료/입고) */}
        <section className="pp-panel pp-d">
          <div className="pp-panel-header">
            <div>📌 상태별 상세</div>
            {loadingMrp && <div className="pp-badge">MRP 계산중...</div>}
          </div>

          <div className="pp-panel-body pp-scroll">
            {!plan.itemCd ? (
              <div className="pp-empty">A영역에서 제품을 선택하면 진행됩니다.</div>
            ) : plan.status === "09" ? (
              <div className="pp-empty">취소된 계획입니다.</div>
            ) : (
              <>
                {/* 준비/확정/대기 단계: MRP */}
                {(plan.status === "01" || plan.status === "02" || plan.status === "03") && (
                  <>
                    <div className="pp-section-title">MRP (BOM 기준 자재 필요수량 계산)</div>

                    {safeNum(plan.planQty) <= 0 ? (
                      <div className="pp-empty">PLAN_QTY를 입력하면 MRP가 계산됩니다.</div>
                    ) : bomAgg.length === 0 ? (
                      <div className="pp-empty">이 제품의 BOM 자재가 없습니다.</div>
                    ) : (
                      <div className="pp-table-scroll">
                        <table className="pp-table">
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>OK</th>
                              <th style={{ width: 120 }}>자재코드</th>
                              <th>자재명</th>
                              <th style={{ width: 120 }}>1개당 소요</th>
                              <th style={{ width: 120 }}>필요수량</th>
                              <th style={{ width: 120 }}>가용수량</th>
                              <th style={{ width: 90 }}>창고수</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bomAgg.map((m) => {
                              const matCd = m.sItemCd;
                              const row = mrp[matCd];
                              const ok = row?.ok === true;
                              const required = row?.required ?? 0;
                              const avail = row?.totals?.availQty ?? 0;

                              return (
                                <tr
                                  key={matCd}
                                  className={selectedMatCd === matCd ? "selected" : ""}
                                  onClick={() => setSelectedMatCd(matCd)}
                                  title="클릭하면 아래에 창고별 재고 상세가 나옵니다"
                                >
                                  <td style={{ fontWeight: 800, color: ok ? "#2e7d32" : "#d32f2f" }}>
                                    {ok ? "✓" : "✕"}
                                  </td>
                                  <td>{matCd}</td>
                                  <td style={{ textAlign: "left" }}>{getItemNm(matCd) || "-"}</td>
                                  <td style={{ textAlign: "right" }}>{row?.useQtyPerOne ?? m.useQtySum}</td>
                                  <td style={{ textAlign: "right" }}>{required}</td>
                                  <td style={{ textAlign: "right" }}>{avail}</td>
                                  <td>{row?.totals?.whCnt ?? 0}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 선택 자재 창고별 상세 */}
                    <div className="pp-section-title" style={{ marginTop: 12 }}>
                      선택 자재의 창고별 재고
                    </div>

                    {!selectedMrp ? (
                      <div className="pp-empty">위 MRP 표에서 자재를 클릭하세요.</div>
                    ) : (
                      <>
                        <div className="pp-summaryline">
                          <span>
                            자재: <b>{selectedMatCd}</b> {getItemNm(selectedMatCd) ? `(${getItemNm(selectedMatCd)})` : ""}
                          </span>
                          <span>
                            필요: <b>{selectedMrp.required}</b> / 가용:{" "}
                            <b style={{ color: selectedMrp.ok ? "#2e7d32" : "#d32f2f" }}>
                              {selectedMrp.totals.availQty}
                            </b>
                          </span>
                        </div>

                        <div className="pp-table-scroll">
                          <table className="pp-table">
                            <thead>
                              <tr>
                                <th style={{ width: 180 }}>창고</th>
                                <th style={{ width: 120 }}>재고</th>
                                <th style={{ width: 120 }}>예약</th>
                                <th style={{ width: 120 }}>가용</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedMrp.rows.map((r, idx) => (
                                <tr key={`${selectedMatCd}-${r.whCd}-${idx}`}>
                                  <td style={{ textAlign: "left" }}>
                                    {r.whCd} {getWhNm(r.whCd) ? `/ ${getWhNm(r.whCd)}` : ""}
                                  </td>
                                  <td style={{ textAlign: "right" }}>{r.stockQty}</td>
                                  <td style={{ textAlign: "right" }}>{r.allocQty}</td>
                                  <td style={{ textAlign: "right" }}>{r.availQty}</td>
                                </tr>
                              ))}
                              {selectedMrp.rows.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="pp-empty">
                                    창고 재고가 없습니다.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {!selectedMrp.ok && (
                          <div className="pp-warning">
                            ❗ 자재가 부족합니다. (가용수량 &lt; 필요수량) → 생산대기(03)로 넘어갈 수 없게 막아둠
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* 생산중 */}
                {plan.status === "04" && (
                  <>
                    <div className="pp-section-title">생산중(계획 재확인)</div>
                    <div className="pp-card">
                      <div>제품: <b>{plan.itemCd}</b> {plan.itemNm ? `(${plan.itemNm})` : ""}</div>
                      <div>계획수량: <b>{plan.planQty}</b></div>
                      <div>계획일자: <b>{plan.prodDt}</b></div>
                      <div>비고: {plan.remark || "-"}</div>
                    </div>
                    <div className="pp-hint">※ 실제로는 여기서 작업지시/실적 등록 화면으로 연결하면 좋아.</div>
                  </>
                )}

                {/* 생산완료 → 입고 */}
                {plan.status === "05" && (
                  <>
                    <div className="pp-section-title">생산완료</div>
                    <div className="pp-card">
                      ✅ 생산이 완료되었습니다. 이제 <b>완제품 입고</b>를 진행하세요.
                    </div>

                    <div className="pp-section-title" style={{ marginTop: 12 }}>
                      5) 입고 처리(완제품을 창고에 넣기)
                    </div>

                    <div className="pp-row" style={{ gap: 8 }}>
                      <div className="pp-field" style={{ flex: 1 }}>
                        <label>입고 창고 선택</label>
                        <select
                          className="pp-input"
                          name="storeWhCd"
                          value={plan.storeWhCd}
                          onChange={handlePlanChange}
                        >
                          <option value="">-- 선택 --</option>
                          {whs.map((w) => (
                            <option key={w.whCd ?? w.WH_CD} value={w.whCd ?? w.WH_CD}>
                              {w.whCd ?? w.WH_CD} {w.whNm ? `- ${w.whNm}` : w.WH_NM ? `- ${w.WH_NM}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pp-field" style={{ flex: 1 }}>
                        <label>입고 수량</label>
                        <input className="pp-input" value={plan.planQty} readOnly />
                      </div>
                    </div>

                    <div className="pp-actions" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                      <button className="pp-btn btn-save" onClick={handleStoreFinished}>
                        입고 처리
                      </button>
                    </div>

                    <div className="pp-hint" style={{ marginTop: 10 }}>
                      TODO: 여기서<br />
                      1) 완제품(ItemStock) 재고 +PLAN_QTY<br />
                      2) IO_TYPE 입출고 이력 저장<br />
                      을 서버 API로 연결하면 “끝”이야.
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
