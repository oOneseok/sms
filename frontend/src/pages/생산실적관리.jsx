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

// ✅ [수정] 상태 라벨 정의
const STATUS_LABEL = {
  "01": "준비",
  "02": "MRP확정",
  "03": "생산예약",
  "04": "생산중",
  "05": "생산완료", // 불량입력 단계
  "06": "창고배정", // 창고지정 단계
  "07": "공정완료",
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
    prodNo: "", prodDt: todayYYYYMMDD(), itemCd: "", itemNm: "", planQty: 0,
    status: "01", remark: "", badQty: 0, badRes: "",
  });

  const [bomRows, setBomRows] = useState([]);
  const [bomAgg, setBomAgg] = useState([]);
  const [mrp, setMrp] = useState({});
  const [loadingMrp, setLoadingMrp] = useState(false);
  const [selectedMatCd, setSelectedMatCd] = useState("");
  const [message, setMessage] = useState("");

  const [manualAlloc, setManualAlloc] = useState({});
  const [receiveLines, setReceiveLines] = useState([{ whCd: "", qty: 0 }]);

  const [showLog, setShowLog] = useState(false);
  const [prodList, setProdList] = useState([]);
  
  const [detailLogs, setDetailLogs] = useState([]); 
  
  // 07(공정완료) 상태면 끝
  const isProcessDone = plan.status === "07";

  const goodQty = useMemo(() => {
    const g = safeNum(plan.planQty) - safeNum(plan.badQty);
    return g < 0 ? 0 : g;
  }, [plan.planQty, plan.badQty]);

  const totalReceiveQty = useMemo(() => {
    return receiveLines.reduce((sum, line) => sum + safeNum(line.qty), 0);
  }, [receiveLines]);

  const visibleProducts = useMemo(() => {
    const kw = productSearch.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) => {
      const cd = String(p.itemCd ?? "");
      const nm = String(p.itemNm ?? "").toLowerCase();
      return cd.toLowerCase().includes(kw) || nm.includes(kw);
    });
  }, [products, productSearch]);

  const selectedMrp = selectedMatCd ? mrp[selectedMatCd] : null;
  const allMrpOk = useMemo(() => {
    const keys = Object.keys(mrp);
    if (keys.length === 0) return false;
    return keys.every((k) => mrp[k]?.ok === true);
  }, [mrp]);

  // 잠금 조건
  const isPlanLocked = plan.status >= "03" || plan.status === "09";
  const isFullyLocked = plan.status === "07"; 

  // --- Helpers ---
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

  const getItemNm = (itemCd) => itemMap.get(String(itemCd))?.itemNm ?? "";
  const getWhNm = (whCd) => whMap.get(String(whCd))?.whNm ?? "";

  // --- Initial Data ---
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.items);
        const d = await r.json();
        const rows = Array.isArray(d) ? d : [];
        setItems(rows);
        setProducts(rows.filter((x) => String(x.itemFlag ?? x.ITEM_FLAG) === "02"));
      } catch { setItems([]); }

      try {
        const r = await fetch(API.whs);
        const d = await r.json();
        setWhs(Array.isArray(d) ? d : []);
      } catch { setWhs([]); }
    })();
  }, []);

  // --- Logic ---
  const fetchBom = async (pItemCd) => {
    const r = await fetch(`${API.bom}/${encodeURIComponent(pItemCd)}`);
    return await r.json();
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
      setMrp({});
    } finally {
      setLoadingMrp(false);
    }
  };

  const fetchDetailLogs = async (prodNo) => {
    try {
        const res = await fetch(`${API.prods}/${encodeURIComponent(prodNo)}/logs`);
        if(res.ok) {
            const logs = await res.json();
            setDetailLogs(logs);
            
            const reserved = logs.filter(l => l.ioType === "RESERVE");
            const restored = {};
            reserved.forEach(log => {
                const iCd = log.itemMst?.itemCd || log.itemCd;
                const wCd = log.toWh?.whCd || log.whCd;
                const qty = log.qty;
                if(iCd && wCd) {
                    if(!restored[iCd]) restored[iCd] = {};
                    restored[iCd][wCd] = (restored[iCd][wCd] || 0) + qty;
                }
            });
            setManualAlloc(restored);
        }
    } catch(e) { console.error(e); }
  };

  // --- Handlers ---
  const handleSelectProduct = async (p) => {
    if (isPlanLocked) return alert("진행 중인 계획은 제품을 변경할 수 없습니다.");

    setSelectedProduct(p);
    setSelectedMatCd("");
    setMessage("");
    setManualAlloc({}); 
    setDetailLogs([]);
    setReceiveLines([{ whCd: "", qty: 0 }]); 

    const itemCd = String(p.itemCd ?? "");
    setPlan((prev) => ({
      ...prev,
      itemCd,
      itemNm: String(p.itemNm ?? ""),
      status: "01",
      planQty: prev.planQty ?? 0,
      prodNo: "", 
    }));
    if (safeNum(plan.planQty) > 0) {
      await calcMrp(itemCd, safeNum(plan.planQty));
    } else {
      setMrp({});
    }
  };

  const handlePlanChange = (e) => {
    const { name, value } = e.target;
    if (isFullyLocked) return;
    if (isPlanLocked && (name === 'planQty' || name === 'prodDt' || name === 'prodNo')) return;

    setPlan((prev) => ({
      ...prev,
      [name]: (name === "planQty" || name === "badQty") ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  useEffect(() => {
    if (!selectedProduct) return;
    const qty = safeNum(plan.planQty);
    if (qty <= 0) { setMrp({}); return; }
    const timer = setTimeout(() => calcMrp(selectedProduct.itemCd, qty), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [plan.planQty, selectedProduct?.itemCd]);

  const handleAllocChange = (matCd, whCd, val) => {
    if (isPlanLocked) return; 
    setManualAlloc(prev => ({
      ...prev,
      [matCd]: { ...(prev[matCd] || {}), [whCd]: Number(val) }
    }));
  };

  const handleReceiveLineChange = (idx, field, val) => {
    if (isProcessDone) return;
    const newLines = [...receiveLines];
    newLines[idx][field] = field === "qty" ? Number(val) : val;
    setReceiveLines(newLines);
  };
  const addReceiveLine = () => setReceiveLines([...receiveLines, { whCd: "", qty: 0 }]);
  const removeReceiveLine = (idx) => {
      if(receiveLines.length === 1) return;
      setReceiveLines(receiveLines.filter((_, i) => i !== idx));
  };

  const handleShowLog = async () => {
    try {
      const res = await fetch(`${API.prods}?size=1000&sort=prodNo,desc`);
      if(res.ok) {
        const data = await res.json();
        setProdList(data.content || []);
        setShowLog(true);
      }
    } catch(e) { alert("네트워크 오류"); }
  };

  const handleResumeFromLog = async (targetProdNo) => {
    if (!targetProdNo) return;
    try {
      const res = await fetch(`${API.prods}/${encodeURIComponent(targetProdNo)}`);
      if (!res.ok) throw new Error("계획 조회 실패");
      const prodData = await res.json();

      const foundItem = items.find(it => String(it.itemCd) === String(prodData.itemCd));
      const newItemNm = foundItem ? foundItem.itemNm : "";

      setPlan({
        prodNo: prodData.prodNo,
        prodDt: prodData.prodDt,
        itemCd: prodData.itemCd,
        itemNm: newItemNm,
        planQty: prodData.planQty,
        status: prodData.status,
        remark: prodData.remark || "",
        storeWhCd: "", 
        badQty: (prodData.status >= "05") ? (prodData.badQty || 0) : 0, 
        badRes: "",
      });
      
      if (foundItem) setSelectedProduct(foundItem);
      if (prodData.itemCd && prodData.planQty > 0) {
        await calcMrp(prodData.itemCd, prodData.planQty);
      }

      await fetchDetailLogs(prodData.prodNo);
      
      setMessage(`✅ [${targetProdNo}] 불러오기 완료`);
      setShowLog(false);
    } catch (e) {
      console.error(e);
      alert("불러오기 실패");
    }
  };

  const saveProdToDb = async (nextStatus) => {
    const payload = { ...plan, planQty: Number(plan.planQty || 0), status: nextStatus ?? plan.status };
    const isNew = !plan.prodNo;
    const url = isNew ? `${API.prods}` : `${API.prods}/${encodeURIComponent(plan.prodNo)}`;
    const method = isNew ? "POST" : "PUT";

    try {
        const res = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        
        const saved = await res.json();
        setPlan(prev => ({ ...prev, prodNo: saved.prodNo, status: saved.status }));
        if(isNew) setMessage(`✅ 생성 완료 (${saved.prodNo})`);
        else setMessage("✅ 저장되었습니다.");
        
    } catch(e) {
        console.error(e);
        alert(e.message);
        throw e;
    }
  };

  const handlePrevStep = async () => {
    if (plan.status === "03") {
        if (!window.confirm("예약을 취소하고 확정 단계(02)로 돌아가시겠습니까?")) return;
        try {
            const res = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/unreserve`, { method: "POST" });
            if (!res.ok) throw new Error(await res.text());

            await saveProdToDb("02"); 
            setPlan(p => ({...p, status: "02"}));
            await fetchDetailLogs(plan.prodNo);
            await calcMrp(plan.itemCd, plan.planQty); 
            setMessage("⏪ 예약 취소 완료 (자재 반환됨)");
        } catch(e) { alert(e.message); }
    } 
    else if (plan.status === "02") {
        if (!window.confirm("확정을 취소하고 기획 단계로 돌아가시겠습니까?")) return;
        try {
            await saveProdToDb("01"); 
            setPlan(p => ({...p, status: "01"}));
            setMessage("⏪ 확정 취소됨 (상태: 기획)");
        } catch(e) { alert(e.message); }
    }
  };

  const handleCancel = async () => {
     if (!plan.prodNo) return;
     if (plan.status === "09") return alert("이미 취소된 건입니다.");
     if (plan.status >= "04") return alert("생산 진행 중이거나 완료된 건은 취소 불가합니다.");

     if (!window.confirm("정말 이 생산 계획을 취소하시겠습니까?\n(예약된 자재는 모두 반환됩니다)")) return;

     try {
       const res = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/cancel`, { method: "PUT" });
       if (!res.ok) return alert(await res.text());
       
       setPlan(p => ({...p, status: "09"}));
       await calcMrp(plan.itemCd, plan.planQty); 
       await fetchDetailLogs(plan.prodNo);

       setMessage("⛔ 취소됨 (자재 반환 완료)");
     } catch(e) { alert(e.message); }
  };

  const handleNext = async () => {
    if (isFullyLocked) return alert("이미 공정 완료된 건입니다.");
    if (!plan.itemCd || safeNum(plan.planQty) <= 0) return alert("제품과 수량을 입력하세요.");

    try {
      // 01 -> 02
      if (plan.status === "01" || !plan.prodNo) {
        await saveProdToDb("02");
        return; 
      }

      // 02 -> 03 (예약)
      if (plan.status === "02") {
        if (!allMrpOk) {
            const shortages = [];
            Object.entries(mrp).forEach(([matCd, data]) => {
                if (!data.ok) {
                    const needed = data.required;
                    const avail = data.totals?.availQty || 0;
                    const missing = needed - avail;
                    if (missing > 0) shortages.push({ code: matCd, name: getItemNm(matCd), qty: missing });
                }
            });

            const msgList = shortages.map(s => ` • ${s.name}: ${s.qty}개`).join("\n");
            if (window.confirm(`자재 재고가 부족합니다.\n\n[부족 내역]\n${msgList}\n\n부족한 만큼 신규 발주를 진행하시겠습니까?`)) {
                 const paramStr = shortages.map(s => `${s.code}:${s.qty}`).join(",");
                 window.location.href = `/구매영업관리/발주관리?autoOrder=${encodeURIComponent(paramStr)}`; 
                 return;
            } else {
                 return;
            }
        }
        
        const allocList = [];
        Object.keys(manualAlloc).forEach(matCd => {
          Object.keys(manualAlloc[matCd]).forEach(whCd => {
            const qty = manualAlloc[matCd][whCd];
            if(qty > 0) allocList.push({ itemCd: matCd, whCd: whCd, qty });
          });
        });

        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/reserve`, { 
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remark: plan.remark, allocations: allocList })
        });
        if (!r.ok) return alert(await r.text());

        await saveProdToDb("03"); 
        setPlan(p => ({...p, status: "03"}));
        await fetchDetailLogs(plan.prodNo);
        return;
      }

      // 03 -> 04 (생산시작/소모)
      if (plan.status === "03") {
        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/consume`, { method: "POST" });
        if (!r.ok) return alert(await r.text());
        
        setPlan(p => ({...p, status: "04"}));
        await saveProdToDb("04");
        await fetchDetailLogs(plan.prodNo);
        setMessage("⚙ 생산중... (자재가 투입되었습니다)");
        return;
      }

      // 04 -> 05 (생산완료 - 불량 수량 입력 화면 진입)
      if (plan.status === "04") {
        await saveProdToDb("05"); // 상태만 05로 변경
        setPlan(p => ({...p, status: "05"}));
        setMessage("✅ 생산 종료. 불량 수량을 입력하세요.");
        return;
      }

      // 05 -> 06 (결과저장 -> 창고배정으로 이동)
      if (plan.status === "05") {
        if (safeNum(plan.badQty) < 0) return alert("불량수량 오류");
        
        // 결과 저장 API 호출
        const r = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/results2`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resultDt: plan.prodDt, whCd: "TEMP", 
            goodQty: goodQty, badQty: Number(plan.badQty || 0), badRes: plan.badRes, remark: "생산완료"
          }),
        });
        if (!r.ok) return alert(await r.text());

        // 상태를 06(창고배정)으로 변경
        await saveProdToDb("06");
        setPlan(p => ({...p, status: "06"}));
        await fetchDetailLogs(plan.prodNo);
        setMessage("📦 창고를 배정해 주세요.");
        return;
      }

    } catch (e) { alert(e.message); }
  };

  // ✅ [수정] 입고 실행 (06 -> 07 종료)
  const handleReceive = async () => {
    if (plan.status !== "06") return; 
    if (isProcessDone) return alert("이미 공정 완료되었습니다.");
    if (goodQty <= 0) return alert("입고할 수량이 없습니다.");
    
    // 검증
    const invalidLines = receiveLines.filter(l => safeNum(l.qty) > 0 && !l.whCd);
    if (invalidLines.length > 0) return alert("창고가 선택되지 않은 항목이 있습니다.");

    if (totalReceiveQty !== goodQty) {
        return alert(`입고 수량 합계(${totalReceiveQty})가 정상품 수량(${goodQty})과 다릅니다.`);
    }

    const allocations = receiveLines.filter(l => l.whCd && l.qty > 0);
    if(allocations.length === 0) return alert("입고할 창고와 수량을 입력하세요.");

    try {
        const res = await fetch(`${API.prods}/${encodeURIComponent(plan.prodNo)}/receive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allocations: allocations,
            remark: "완제품 입고"
          }),
        });
        if (!res.ok) return alert(await res.text());
        
        // 상태 07 (공정완료)
        await saveProdToDb("07"); 
        setPlan(p => ({...p, status: "07"}));
        setMessage(`🏁 공정 완료! (모든 절차가 종료되었습니다)`);
        await fetchDetailLogs(plan.prodNo);
    } catch(e) { alert("입고 오류 발생"); }
  };

  return (
    <div className="prodplan-container">
      <div className="prodplan-header">
        <div className="prodplan-title">생산 계획</div>
        <div className="prodplan-header-right">
          <div className="prodplan-stage">현재: {STATUS_LABEL[plan.status] ?? plan.status}</div>
          <button className="pp-btn" onClick={handleShowLog}>📜 생산 이력</button>
          
          <button className="pp-btn btn-cancel" onClick={handleCancel} disabled={isFullyLocked || plan.status === '09'}>
              {plan.status === '09' ? '취소됨' : '취소'}
          </button>
        </div>
      </div>

      <div className="prodplan-grid">
        <section className="pp-panel pp-a">
            <div className="pp-panel-header">📦 제품 목록</div>
            <div className="pp-panel-body pp-scroll">
             <table className="pp-table">
                <thead><tr><th>No</th><th>코드</th><th>명칭</th></tr></thead>
                <tbody>
                  {visibleProducts.map((p, i) => (
                    <tr key={p.itemCd} className={selectedProduct?.itemCd === p.itemCd ? "selected" : ""} onClick={() => handleSelectProduct(p)}>
                      <td>{i + 1}</td><td>{p.itemCd}</td><td style={{textAlign:"left"}}>{p.itemNm}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
            </div>
        </section>

        <section className="pp-panel pp-c">
           <div className="pp-panel-header">
             <div>📝 계획 입력</div>
             <div className="pp-actions">
               {!isFullyLocked && plan.status !== '09' && <button className="pp-btn btn-save" onClick={() => saveProdToDb()}>저장</button>}
               
               {(plan.status === "02" || plan.status === "03") && (
                   <button className="pp-btn" onClick={handlePrevStep} style={{backgroundColor:"#fff3e0", color:"#e65100", border:"1px solid #ffcc80"}}>
                       {plan.status === "03" ? "⏪ 예약취소" : "⏪ 확정취소"}
                   </button>
               )}

               {!isFullyLocked && plan.status !== '09' && (
                   <button className="pp-btn btn-next" onClick={handleNext}>
                     {/* 상태별 버튼 텍스트 변경 */}
                     {plan.status === "02" ? "예약실행" 
                      : plan.status === "03" ? "생산시작(소모)" 
                      : plan.status === "04" ? "생산종료"
                      : plan.status === "05" ? "창고배정"
                      : "다음단계"}
                   </button>
               )}
             </div>
           </div>
           <div className="pp-panel-body pp-scroll">
              <div className="pp-form">
                 <div className="pp-row">
                    <div className="pp-field"><label>NO (자동)</label>
                        <input className="pp-input" value={plan.prodNo} readOnly placeholder="저장 시 자동생성" style={{background:"#f5f5f5", color:"#888"}}/>
                    </div>
                    <div className="pp-field"><label>일자</label>
                        <input className="pp-input" type="date" value={plan.prodDt} onChange={handlePlanChange} name="prodDt" readOnly={isPlanLocked}/>
                    </div>
                 </div>
                 <div className="pp-row">
                    <div className="pp-field"><label>수량</label>
                        <input className="pp-input" type="number" value={plan.planQty} onChange={handlePlanChange} name="planQty" readOnly={isPlanLocked}/>
                    </div>
                    <div className="pp-field"><label>상태</label>
                        <input className="pp-input" value={STATUS_LABEL[plan.status]} readOnly/>
                    </div>
                 </div>
                 
                 {/* 05(생산완료) 이상이면 불량수량 입력창 표시 */}
                 {plan.status >= "05" && (
                    <div className="pp-row" style={{border:"2px solid #2196f3", padding:10, borderRadius:4, background:"#e3f2fd"}}>
                        <div className="pp-field"><label style={{color:"#1565c0", fontWeight:"bold"}}>불량수량 입력</label>
                            <input className="pp-input" type="number" name="badQty" value={plan.badQty} onChange={handlePlanChange} 
                                   readOnly={plan.status >= "06"} autoFocus={plan.status === "05"}/>
                        </div>
                        <div className="pp-field"><label>정상품 (계산됨)</label>
                            <input className="pp-input" value={goodQty} readOnly style={{fontWeight:"bold"}}/>
                        </div>
                    </div>
                 )}

                 {/* 06(창고배정) 이상이면 창고배정 UI 표시 */}
                 {plan.status >= "06" && (
                    <div className="pp-receive-box">
                        <div className="pp-section-title">
                            입고 창고 지정 
                            <span style={{color: (goodQty - totalReceiveQty) !== 0 ? "red" : "green", marginLeft: 8}}>
                                (잔여: {goodQty - totalReceiveQty})
                            </span>
                        </div>
                        {receiveLines.map((line, idx) => (
                            <div key={idx} className="pp-row" style={{marginBottom:4}}>
                                <select className="pp-input" style={{flex:2}} value={line.whCd} onChange={(e) => handleReceiveLineChange(idx, 'whCd', e.target.value)} disabled={isFullyLocked}>
                                    <option value="">창고선택</option>
                                    {whs.map(w => <option key={w.whCd} value={w.whCd}>{w.whNm}</option>)}
                                </select>
                                <input className="pp-input" style={{flex:1}} type="number" value={line.qty} onChange={(e) => handleReceiveLineChange(idx, 'qty', e.target.value)} disabled={isFullyLocked} placeholder="수량"/>
                                {!isFullyLocked && <button className="pp-btn" onClick={() => removeReceiveLine(idx)}>-</button>}
                            </div>
                        ))}
                        {!isFullyLocked && <button className="pp-btn" style={{width:"100%", marginBottom:10}} onClick={addReceiveLine}>+ 창고 추가</button>}
                        
                        <button className="pp-btn btn-save" style={{width:"100%"}} onClick={handleReceive} disabled={isFullyLocked}>
                            {isFullyLocked ? "🏁 공정 완료됨" : "입고 및 공정종료"}
                        </button>
                    </div>
                 )}
              </div>
           </div>
        </section>

        <section className="pp-panel pp-b">
          <div className="pp-panel-header">🧾 MRP 및 자재 사용 내역</div>
          <div className="pp-panel-body pp-scroll">
             <div style={{height: "40%", overflow:"auto", borderBottom:"1px solid #eee"}}>
               <table className="pp-table">
                 <thead><tr><th>자재</th><th>필요</th><th>가용</th><th>OK</th></tr></thead>
                 <tbody>
                    {bomAgg.map(m => {
                        const row = mrp[m.sItemCd];
                        const ok = row?.ok;
                        return (
                            <tr key={m.sItemCd} className={selectedMatCd === m.sItemCd ? "selected" : ""} onClick={() => setSelectedMatCd(m.sItemCd)}>
                                <td>{m.sItemCd}</td><td>{row?.required}</td><td>{row?.totals?.availQty}</td>
                                <td style={{color: ok ? "green" : "red"}}>{ok ? "✓" : "부족"}</td>
                            </tr>
                        );
                    })}
                 </tbody>
               </table>
             </div>
             
             <div className="pp-section-title" style={{marginTop: 10}}>
                {plan.status < "04" ? "🏗 투입 창고 및 수량 지정 (선택)" : "🔒 자재 투입 내역"}
             </div>
             <div style={{height: "50%", overflow:"auto"}}>
               {plan.status < "04" ? (
                   selectedMrp ? (
                     <table className="pp-table">
                       <thead>
                         <tr><th>창고</th><th>재고</th><th>가용</th><th style={{width: 80, background: "#fff3e0"}}>투입(입력)</th></tr>
                       </thead>
                       <tbody>
                         {selectedMrp.rows.map((r, idx) => {
                           const manualVal = manualAlloc[selectedMatCd]?.[r.whCd] ?? "";
                           return (
                             <tr key={idx}>
                               <td style={{textAlign:"left"}}>{r.whCd} {getWhNm(r.whCd)}</td>
                               <td style={{textAlign:"right"}}>{r.stockQty}</td>
                               <td style={{textAlign:"right"}}>{r.availQty}</td>
                               <td style={{padding:0}}>
                                 <input type="number" className="pp-input" 
                                        style={{width:"100%", border:"none", textAlign:"right", background:"#fff3e0"}}
                                        placeholder="자동"
                                        value={manualVal}
                                        readOnly={plan.status === "03" || plan.status === "09"} 
                                        onChange={(e) => handleAllocChange(selectedMatCd, r.whCd, e.target.value)}
                                 />
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   ) : <div className="pp-empty">자재를 선택하면 창고별 재고가 표시됩니다.</div>
               ) : (
                   <table className="pp-table">
                        <thead><tr><th>자재</th><th>창고</th><th>수량</th><th>유형</th></tr></thead>
                        <tbody>
                            {detailLogs.filter(l => l.ioType === "PROD_USED" || l.ioType === "RESERVE").map((log, i) => (
                                <tr key={i}>
                                    <td>{log.itemMst?.itemNm}</td>
                                    <td>{log.fromWh?.whCd || log.toWh?.whCd}</td>
                                    <td style={{textAlign:"right"}}>{log.qty}</td>
                                    <td>{log.ioType === "RESERVE" ? "예약됨" : "투입됨"}</td>
                                </tr>
                            ))}
                            {detailLogs.length === 0 && <tr><td colSpan={4} className="pp-empty">내역 없음</td></tr>}
                        </tbody>
                    </table>
               )}
             </div>
          </div>
        </section>

        <section className="pp-panel pp-d">
           <div className="pp-panel-header">📌 요약 및 결과</div>
           <div className="pp-panel-body pp-scroll">
              <div className="pp-card">
                 <div>PROD: <b>{plan.prodNo}</b></div>
                 <div>제품: {plan.itemCd}</div>
                 <div>수량: {plan.planQty}</div>
                 <hr/>
                 <div className="pp-section-title">🎁 완제품 입고 결과</div>
                 {detailLogs.filter(l => l.ioType === "PROD_RESULT").map((log, i) => (
                     <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px dashed #eee"}}>
                         <span>📍 {log.toWh?.whNm} ({log.toWh?.whCd})</span>
                         <b>{log.qty} 개</b>
                     </div>
                 ))}
                 {detailLogs.filter(l => l.ioType === "PROD_RESULT").length === 0 && <div style={{color:"#999", fontSize:12}}>아직 입고되지 않았습니다.</div>}
              </div>
           </div>
        </section>
      </div>

      {showLog && (
        <div className="pp-modal-overlay">
          <div className="pp-modal" style={{width: "700px"}}>
            <div className="pp-modal-header"><span>📜 전체 생산 이력 (최신순)</span><button onClick={() => setShowLog(false)}>X</button></div>
            <div className="pp-modal-body">
              <table className="pp-table">
                 <thead><tr><th>일자</th><th>NO</th><th>상태</th><th>제품</th><th>수량</th></tr></thead>
                 <tbody>
                    {prodList.map((row, i) => (
                       <tr key={i} onDoubleClick={() => handleResumeFromLog(row.prodNo)} style={{cursor:"pointer"}}>
                         <td>{row.prodDt}</td><td style={{fontWeight:"bold"}}>{row.prodNo}</td>
                         <td>{STATUS_LABEL[row.status] || row.status}</td><td>{getItemNm(row.itemCd)}</td><td style={{textAlign:"right"}}>{row.planQty}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}