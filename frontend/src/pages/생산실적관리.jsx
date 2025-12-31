import React, { useEffect, useMemo, useState } from "react";
import "../css/pages/생산계획.css";

const API = {
  items: "http://localhost:8080/api/item",
  bom: "http://localhost:8080/api/bom",
  stocks: "http://localhost:8080/api/stocks",
  whs: "http://localhost:8080/api/whs",
  prods: "http://localhost:8080/api/prods",
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const STATUS = {
  "01": "준비(기획중)",
  "02": "확정됨(MRP준비)",
  "03": "생산대기(예약완료)",
  "04": "생산중(자재소모)",
  "05": "생산완료(입고대기)",
  "09": "취소",
};

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function aggregateBom(bomRows) {
  const map = new Map();
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
  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [plan, setPlan] = useState({
    prodNo: "",
    prodDt: todayYYYYMMDD(),
    itemCd: "",
    itemNm: "",
    planQty: 0,
    status: "01",
    remark: "",
    storeWhCd: "",

    // ✅ 불량
    badQty: 0,
    badRes: "",

    // ✅ (추가) 생산완료 실적 저장용 창고 (TB_PROD_RESULT.WH_CD)
    resultWhCd: "",
  });

  const goodQty = useMemo(() => {
    const g = safeNum(plan.planQty) - safeNum(plan.badQty);
    return g < 0 ? 0 : g;
  }, [plan.planQty, plan.badQty]);

  const [bomRows, setBomRows] = useState([]);
  const [bomAgg, setBomAgg] = useState([]);
  const [mrp, setMrp] = useState({});
  const [loadingMrp, setLoadingMrp] = useState(false);

  const [selectedMatCd, setSelectedMatCd] = useState("");
  const [message, setMessage] = useState("");

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

  const visibleProducts = useMemo(() => {
    const kw = productSearch.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) => {
      const cd = String(p.itemCd ?? "");
      const nm = String(p.itemNm ?? "").toLowerCase();
      return cd.toLowerCase().includes(kw) || nm.includes(kw);
    });
  }, [products, productSearch]);

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
      return { whCd, stockQty, allocQty, availQty: stockQty - allocQty };
    });

    const stockSum = mapped.reduce((a, c) => a + safeNum(c.stockQty), 0);
    const allocSum = mapped.reduce((a, c) => a + safeNum(c.allocQty), 0);
    return {
      totals: { stockQty: stockSum, allocQty: allocSum, availQty: stockSum - allocSum },
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
            { required, useQtyPerOne: safeNum(useQty), totals: one.totals, rows: one.rows, ok },
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
      badQty: 0,
      badRes: "",
      resultWhCd: "", // ✅ 초기화
    }));

    if (safeNum(plan.planQty) > 0) {
      await calcMrp(itemCd, safeNum(plan.planQty));
    } else {
      setBomRows([]);
      setBomAgg([]);
      setMrp({});
    }
  };

  const handlePlanChange = (e) => {
    const { name, value } = e.target;
    setPlan((prev) => ({
      ...prev,
      [name]:
        name === "planQty" || name === "badQty"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

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

  const allMrpOk = useMemo(() => {
    const keys = Object.keys(mrp);
    if (keys.length === 0) return false;
    return keys.every((k) => mrp[k]?.ok === true);
  }, [mrp]);

  // -----------------------
  // ✅ DB 저장 (POST/PUT)
  // -----------------------
  const saveProdToDb = async (nextStatus) => {
    const payload = {
      prodNo: plan.prodNo,
      prodDt: plan.prodDt,
      itemCd: plan.itemCd,
      planQty: Number(plan.planQty || 0),
      status: nextStatus ?? plan.status,
      remark: plan.remark || "",
    };

    const chk = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}`);
    const exists = chk.ok;

    const res = await fetch(exists ? `${API.prods}/${encodeURIComponent(plan.prodNo)}` : `${API.prods}`, {
      method: exists ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "save failed");
    }
  };

  const handleSavePlan = async () => {
    if (!plan.itemCd) return alert("제품을 선택하세요.");
    if (!plan.prodNo) return alert("PROD_NO를 입력하세요.");
    if (!plan.prodDt) return alert("PROD_DT를 입력하세요.");
    if (safeNum(plan.planQty) <= 0) return alert("PLAN_QTY를 1 이상 입력하세요.");

    try {
      await saveProdToDb(plan.status || "01");
      setMessage("✅ 생산계획 DB 저장 완료");
    } catch (e) {
      console.error(e);
      alert(`저장 실패\n${String(e.message || e)}`);
    }
  };

  const goStatus = async (ns) => {
    setPlan((p) => ({ ...p, status: ns }));
    await saveProdToDb(ns);
  };

  const handleNext = async () => {
    if (!plan.itemCd) return alert("제품 선택 필요");
    if (!plan.prodNo) return alert("PROD_NO 필요");
    if (safeNum(plan.planQty) <= 0) return alert("PLAN_QTY 필요");

    try {
      // 01 -> 02
      if (plan.status === "01") {
        await goStatus("02");
        setMessage("➡ 01 → 02 (확정됨)");
        return;
      }

      // 02 -> 03 (예약)
      if (plan.status === "02") {
        if (!allMrpOk) return alert("MRP 부족입니다. 부족 자재는 발주로 연결하세요.");

        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/reserve`, { method: "POST" });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          return alert(`예약 실패\n${txt}`);
        }

        await goStatus("03");
        setMessage("➡ 02 → 03 (예약 완료)");
        await calcMrp(plan.itemCd, safeNum(plan.planQty));
        return;
      }

      // 03 -> 04 (소모 전환)
      if (plan.status === "03") {
        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/consume`, { method: "POST" });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          return alert(`소모 전환 실패\n${txt}`);
        }
        await goStatus("04");
        setMessage("➡ 03 → 04 (생산중: 예약→소모)");
        await calcMrp(plan.itemCd, safeNum(plan.planQty));
        return;
      }

      // 04 -> 05 (생산완료)
      if (plan.status === "04") {
        if (!plan.resultWhCd) return alert("생산완료 실적창고(WH_CD)를 선택하세요.");
        if (safeNum(plan.badQty) < 0) return alert("불량수량은 0 이상이어야 합니다.");
        if (goodQty < 0) return alert("정상품 수량이 음수입니다.");

        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/results2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resultDt: plan.prodDt,
            whCd: plan.resultWhCd,     // ✅ 핵심: WH_CD 전달
            goodQty: goodQty,
            badQty: Number(plan.badQty || 0),
            badRes: plan.badRes || null,
            remark: "생산완료",
          }),
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          return alert(`생산완료 저장 실패\n${txt}`);
        }

        setPlan((p) => ({ ...p, status: "05" }));
        await saveProdToDb("05");
        setMessage(`➡ 04 → 05 (생산완료) 정상품=${goodQty}, 불량=${safeNum(plan.badQty)}`);
        return;
      }
    } catch (e) {
      console.error(e);
      alert(`단계 전환 오류\n${String(e.message || e)}`);
    }
  };

  // ✅ 이전단계 버튼: 02에서도 보이게
  // - 02 -> 01 : 그냥 상태만 내리면 됨
  // - 03 -> 02 : 예약해제 API 호출 필요(기존 그대로)
  const handlePrev = async () => {
    try {
      if (plan.status === "02") {
        await goStatus("01");
        setMessage("⬅ 02 → 01 (준비 단계로 이동)");
        return;
      }

      if (plan.status === "03") {
        if (!window.confirm("생산대기(예약)를 해제하고 이전단계(확정)로 돌아갈까요?")) return;

        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/unreserve`, { method: "POST" });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          return alert(`예약해제 실패\n${txt}`);
        }
        await goStatus("02");
        setMessage("⬅ 03 → 02 (예약해제 완료)");
        await calcMrp(plan.itemCd, safeNum(plan.planQty));
      }
    } catch (e) {
      console.error(e);
      alert(`이전단계 오류\n${String(e.message || e)}`);
    }
  };

  const handleCancel = async () => {
    if (!plan.itemCd) return;
    if (!window.confirm("정말 취소하시겠습니까?")) return;

    try {
      const res = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/cancel`, {
        method: "PUT",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return alert(`취소 실패\n${txt}`);
      }
      setPlan((p) => ({ ...p, status: "09" }));
      setMessage("⛔ 취소 처리됨 (03이면 예약해제 포함)");
      await calcMrp(plan.itemCd, safeNum(plan.planQty));
    } catch (e) {
      console.error(e);
      alert("취소 중 오류");
    }
  };

  const handleReceive = async () => {
    if (plan.status !== "05") return alert("생산완료(05)에서만 입고 가능합니다.");
    if (!plan.storeWhCd) return alert("입고 창고 선택 필요");
    if (goodQty <= 0) return alert("정상품 수량이 0입니다.");

    const res = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whCd: plan.storeWhCd,
        qty: goodQty,
        remark: "완제품 입고",
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return alert(`입고 실패\n${txt}`);
    }

    setMessage(`✅ 입고 완료 (정상품 ${goodQty}개)`);
  };

  const selectedMrp = selectedMatCd ? mrp[selectedMatCd] : null;

  return (
    <div className="prodplan-container">
      <div className="prodplan-header">
        <div className="prodplan-title">생산 계획</div>
        <div className="prodplan-header-right">
          <div className="prodplan-stage">현재: {STATUS[plan.status] ?? plan.status}</div>

          {/* ✅ 02,03에서 이전단계 버튼 표시 */}
          {(plan.status === "02" || plan.status === "03") && (
            <button className="pp-btn" onClick={handlePrev}>
              이전단계
            </button>
          )}

          <button className="pp-btn btn-cancel" onClick={handleCancel} disabled={!plan.itemCd || plan.status === "09"}>
            취소
          </button>
        </div>
      </div>

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
                      <td colSpan={5} className="pp-empty">제품이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* C: 생산계획 입력 */}
        <section className="pp-panel pp-c">
          <div className="pp-panel-header">
            <div>📝 생산계획 입력</div>
            <div className="pp-actions">
              <button className="pp-btn btn-save" onClick={handleSavePlan} disabled={plan.status === "09"}>
                저장
              </button>
              <button className="pp-btn btn-next" onClick={handleNext} disabled={plan.status === "09" || !plan.itemCd}>
                다음단계
              </button>
            </div>
          </div>

          <div className="pp-panel-body pp-scroll">
            <div className="pp-form">
              <div className="pp-row">
                <div className="pp-field">
                  <label>PROD_NO</label>
                  <input className="pp-input" name="prodNo" value={plan.prodNo} onChange={handlePlanChange} />
                </div>
                <div className="pp-field">
                  <label>PROD_DT</label>
                  <input className="pp-input" type="date" name="prodDt" value={plan.prodDt} onChange={handlePlanChange} />
                </div>
              </div>

              <div className="pp-row">
                <div className="pp-field">
                  <label>제품</label>
                  <input className="pp-input" value={plan.itemCd ? `${plan.itemCd} - ${plan.itemNm}` : ""} readOnly />
                </div>
              </div>

              <div className="pp-row">
                <div className="pp-field">
                  <label>PLAN_QTY</label>
                  <input className="pp-input" type="number" name="planQty" value={plan.planQty} onChange={handlePlanChange} />
                </div>
                <div className="pp-field">
                  <label>STATUS</label>
                  <input className="pp-input" value={STATUS[plan.status] ?? plan.status} readOnly />
                </div>
              </div>

              {/* ✅ 생산중(04)에서 불량 + 실적창고 선택 */}
              {plan.status === "04" && (
                <>
                  <div className="pp-row">
                    <div className="pp-field">
                      <label>불량수량(BAD_QTY)</label>
                      <input className="pp-input" type="number" name="badQty" value={plan.badQty} onChange={handlePlanChange} />
                    </div>
                    <div className="pp-field">
                      <label>정상품(GOOD_QTY = PLAN - BAD)</label>
                      <input className="pp-input" value={goodQty} readOnly />
                    </div>
                  </div>
                  <div className="pp-row">
                    <div className="pp-field">
                      <label>불량내역(BAD_RES)</label>
                      <input className="pp-input" name="badRes" value={plan.badRes} onChange={handlePlanChange} />
                    </div>
                  </div>

                  <div className="pp-row">
                    <div className="pp-field">
                      <label>생산완료 실적창고(WH_CD)</label>
                      <select className="pp-input" name="resultWhCd" value={plan.resultWhCd} onChange={handlePlanChange}>
                        <option value="">-- 선택 --</option>
                        {whs.map((w) => (
                          <option key={w.whCd ?? w.WH_CD} value={w.whCd ?? w.WH_CD}>
                            {w.whCd ?? w.WH_CD} {w.whNm ? `- ${w.whNm}` : w.WH_NM ? `- ${w.WH_NM}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ✅ 생산완료(05)에서 입고 */}
              {plan.status === "05" && (
                <>
                  <div className="pp-row">
                    <div className="pp-field">
                      <label>정상품(GOOD_QTY)</label>
                      <input className="pp-input" value={goodQty} readOnly />
                    </div>
                    <div className="pp-field">
                      <label>입고 창고</label>
                      <select className="pp-input" name="storeWhCd" value={plan.storeWhCd} onChange={handlePlanChange}>
                        <option value="">-- 선택 --</option>
                        {whs.map((w) => (
                          <option key={w.whCd ?? w.WH_CD} value={w.whCd ?? w.WH_CD}>
                            {w.whCd ?? w.WH_CD} {w.whNm ? `- ${w.whNm}` : w.WH_NM ? `- ${w.WH_NM}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="pp-actions" style={{ justifyContent: "flex-end" }}>
                    <button className="pp-btn btn-save" onClick={handleReceive}>입고 처리</button>
                  </div>
                </>
              )}

              <div className="pp-row">
                <div className="pp-field">
                  <label>비고</label>
                  <textarea className="pp-input" rows={3} name="remark" value={plan.remark} onChange={handlePlanChange} />
                </div>
              </div>

              {message && <div className="pp-message">{message}</div>}
            </div>
          </div>
        </section>

        {/* B: MRP */}
        <section className="pp-panel pp-b">
          <div className="pp-panel-header">
            <div>🧾 MRP</div>
            {loadingMrp && <div className="pp-badge">계산중...</div>}
          </div>

          <div className="pp-panel-body pp-scroll">
            {!plan.itemCd ? (
              <div className="pp-empty">제품을 선택하면 MRP가 계산됩니다.</div>
            ) : safeNum(plan.planQty) <= 0 ? (
              <div className="pp-empty">PLAN_QTY를 입력하세요.</div>
            ) : bomAgg.length === 0 ? (
              <div className="pp-empty">BOM이 없습니다.</div>
            ) : (
              <div className="pp-table-scroll">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>자재코드</th>
                      <th>자재명</th>
                      <th style={{ width: 120 }}>1개당 소요</th>
                      <th style={{ width: 120 }}>필요수량</th>
                      <th style={{ width: 120 }}>가용수량</th>
                      <th style={{ width: 60 }}>OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomAgg.map((m) => {
                      const matCd = m.sItemCd;
                      const row = mrp[matCd];
                      const ok = row?.ok === true;
                      return (
                        <tr
                          key={matCd}
                          className={selectedMatCd === matCd ? "selected" : ""}
                          onClick={() => setSelectedMatCd(matCd)}
                        >
                          <td>{matCd}</td>
                          <td style={{ textAlign: "left" }}>{getItemNm(matCd) || "-"}</td>
                          <td style={{ textAlign: "right" }}>{row?.useQtyPerOne ?? m.useQtySum}</td>
                          <td style={{ textAlign: "right" }}>{row?.required ?? 0}</td>
                          <td style={{ textAlign: "right" }}>{row?.totals?.availQty ?? 0}</td>
                          <td style={{ fontWeight: 800, color: ok ? "#2e7d32" : "#d32f2f" }}>{ok ? "✓" : "✕"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pp-section-title" style={{ marginTop: 12 }}>선택 자재 창고별 재고</div>
            {!selectedMrp ? (
              <div className="pp-empty">자재를 클릭하세요.</div>
            ) : (
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
                      <tr><td colSpan={4} className="pp-empty">재고가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* D: 상태 요약 */}
        <section className="pp-panel pp-d">
          <div className="pp-panel-header">
            <div>📌 상태 요약</div>
          </div>
          <div className="pp-panel-body">
            <div className="pp-card">
              <div>상태: <b>{STATUS[plan.status] ?? plan.status}</b></div>
              <div>제품: <b>{plan.itemCd}</b> {plan.itemNm ? `(${plan.itemNm})` : ""}</div>
              <div>계획수량: <b>{plan.planQty}</b></div>
              <div>불량: <b>{safeNum(plan.badQty)}</b> / 정상품: <b>{goodQty}</b></div>
              <div>실적창고(04→05): <b>{plan.resultWhCd || "-"}</b></div>
              <div>입고창고(05): <b>{plan.storeWhCd || "-"}</b></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
