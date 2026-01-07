import React, { useEffect, useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar'
import '../css/pages/생산관리.css'
import { useLocation } from 'react-router-dom'

const API = {
  items: "http://localhost:8080/api/item",
  bom: "http://localhost:8080/api/bom",
  stocks: "http://localhost:8080/api/stocks",
  whs: "http://localhost:8080/api/whs",
  prods: "http://localhost:8080/api/prods",
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const STATE_STEPS = [
  { code: '01', label: '기획' },
  { code: '02', label: '확정(MRP)' },
  { code: '03', label: '자재예약' },
  { code: '04', label: '생산중' },
  { code: '05', label: '생산완료' },
  { code: '06', label: '창고배정' },
  { code: '07', label: '공정종료' },
  { code: '08', label: '취소됨' }
];

const getStatusLabel = (code) => STATE_STEPS.find(s => s.code === code)?.label || code;

const getLogTypeLabel = (type) => {
    switch (type) {
        case 'RESERVE': return '자재예약';
        case 'UNRESERVE': return '예약취소';
        case 'PROD_USED': return '자재사용';
        case 'PROD_RESULT': return '생산입고';
        case 'IN': return '구매입고';
        case 'OUT': return '출고';
        default: return type;
    }
};

function aggregateBom(bomRows) {
  const map = new Map();
  for (const b of bomRows) {
    const cd = String(b?.sItemCd ?? b?.sitem?.itemCd ?? "");
    if (!cd) continue;
    const useQty = safeNum(b?.useQty);
    const prev = map.get(cd);
    if (!prev) map.set(cd, { sItemCd: cd, itemNm: b.itemNm, useQtySum: useQty });
    else {
      prev.useQtySum += useQty;
      map.set(cd, prev);
    }
  }
  return Array.from(map.values());
}

export default function 생산관리() {
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);
  const [prodList, setProdList] = useState([]);
  const [selectedProd, setSelectedProd] = useState(null);

  // 검색 필터
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchType, setSearchType] = useState('prodNo'); // 기본값 변경
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // MRP 및 수동 할당 상태
  const [selectedMrpItem, setSelectedMrpItem] = useState(null) 
  const [warehouseStockMap, setWarehouseStockMap] = useState({});
  const [manualAllocations, setManualAllocations] = useState({}); 
  const [currentInputMap, setCurrentInputMap] = useState({});

  const [sortConfig, setSortConfig] = useState({ key: 'prodDt', direction: 'desc' });

  const [bomRows, setBomRows] = useState([]);
  const [bomAgg, setBomAgg] = useState([]);
  const [mrp, setMrp] = useState({});
  const [loading, setLoading] = useState(false);
  const [detailLogs, setDetailLogs] = useState([]);

  const [planForm, setPlanForm] = useState({
    prodNo: '', prodDt: '', planQty: '', itemCd: '', itemNm: '', remark: ''
  });
  const [resultForm, setResultForm] = useState({ badQty: 0, badReason: '' });
  const [warehouseInputMap, setWarehouseInputMap] = useState({});

  const products = useMemo(() => items.filter(i => i.itemFlag === '02'), [items]);
  
  const materialList = useMemo(() => {
    if (!selectedProd) return [];
    return bomAgg.map(b => {
      const mrpData = mrp[b.sItemCd];
      const reqQty = safeNum(b.useQtySum) * safeNum(planForm.planQty || selectedProd.planQty);
      const avail = mrpData?.totals?.availQty || 0;
      
      const manualAlloc = manualAllocations[b.sItemCd];
      const allocatedQty = manualAlloc ? manualAlloc.reduce((sum, a) => sum + a.qty, 0) : 0;
      const isAllocated = manualAlloc && allocatedQty === reqQty;

      return {
        itemCd: b.sItemCd,
        itemNm: items.find(i => i.itemCd === b.sItemCd)?.itemNm || b.sItemCd,
        reqQty: reqQty,
        availQty: avail,
        shortQty: Math.max(0, reqQty - avail),
        isOk: avail >= reqQty,
        isAllocated: isAllocated 
      };
    });
  }, [bomAgg, mrp, planForm.planQty, selectedProd, items, manualAllocations]);

  const isAllMaterialOk = materialList.every(m => m.isOk);
  const goodQty = Math.max(0, safeNum(selectedProd?.planQty) - safeNum(resultForm.badQty));

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchProdList();
  }, [sortConfig]);

  const materialWhs = useMemo(
    () => whs.filter(w => w.whType === '01' || w.whType === '03'),
    [whs]
  );

  const normalizeWhCd = (whCd) => {
    if (!whCd) return null;
    const v = String(whCd).replace(/^WH/, '');
    return `WH${v.padStart(2, '0')}`;
  };

  const fetchMasters = async () => {
    try {
      const [rItems, rWhs] = await Promise.all([
        fetch(API.items).then(r => r.ok ? r.json() : []),
        fetch(API.whs).then(r => r.ok ? r.json() : [])
      ]);
      setItems(rItems);
      setWhs(rWhs);
    } catch (e) { console.error(e); }
  };

  const fetchProdList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API.prods}?size=1000&sort=${sortConfig.key},${sortConfig.direction}`);
      if (res.ok) {
        const data = await res.json();
        setProdList(data.content || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSortChange = (key) => {
    setSortConfig(prev => {
      const isSameKey = prev.key === key;
      const newDirection = isSameKey && prev.direction === 'desc' ? 'asc' : 'desc';
      return { key, direction: newDirection };
    });
  };

  const fetchBom = async (itemCd) => {
    try {
      const res = await fetch(`${API.bom}/${encodeURIComponent(itemCd)}`);
      return res.ok ? await res.json() : [];
    } catch { return []; }
  };

  const fetchWarehouseStock = async (itemCd) => {
    const res = await fetch(`${API.stocks}?itemCd=${encodeURIComponent(itemCd)}`);
    if (!res.ok) return;

    const data = await res.json();
    const rows = Array.isArray(data) ? data : data.content || [];

    const map = {};
    rows.forEach(r => {
      const whCd = r.id?.whCd;
      if (!whCd) return;
      map[normalizeWhCd(whCd)] = {
        stockQty: safeNum(r.stockQty),
        allocQty: safeNum(r.allocQty),
        availQty: safeNum(r.stockQty) - safeNum(r.allocQty)
      };
    });
    setWarehouseStockMap(map);
  };

  const fetchStock = async (itemCd) => {
    try {
      const res = await fetch(`${API.stocks}?itemCd=${encodeURIComponent(itemCd)}`);
      const data = await res.json();
      const rows = data.content || [];
      const totalStock = rows.reduce((acc, r) => acc + safeNum(r.stockQty), 0);
      const totalAlloc = rows.reduce((acc, r) => acc + safeNum(r.allocQty), 0);
      return { totals: { stockQty: totalStock, allocQty: totalAlloc, availQty: totalStock - totalAlloc }, rows };
    } catch { return { totals: {}, rows: [] }; }
  };

  const calcMrp = async (itemCd, qty) => {
    if (!itemCd || qty <= 0) return;
    const boms = await fetchBom(itemCd);
    setBomRows(boms);
    const agg = aggregateBom(boms);
    setBomAgg(agg);

    const newMrp = {};
    await Promise.all(agg.map(async (b) => {
      const stockInfo = await fetchStock(b.sItemCd);
      newMrp[b.sItemCd] = stockInfo;
    }));
    setMrp(newMrp);
  };

  const fetchDetailLogs = async (prodNo) => {
    try {
        const res = await fetch(`${API.prods}/${encodeURIComponent(prodNo)}/logs`);
        if(res.ok) setDetailLogs(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleSelectProd = async (prod) => {
    if (prod.prodNo === selectedProd?.prodNo) return;
    
    const foundItem = items.find(i => i.itemCd === prod.itemCd);
    const prodName = prod.itemNm || foundItem?.itemNm || '';

    setSelectedProd({ ...prod, itemNm: prodName });
    setPlanForm({
      prodNo: prod.prodNo, prodDt: prod.prodDt, planQty: prod.planQty,
      itemCd: prod.itemCd, itemNm: prodName,
      remark: prod.remark || ''
    });
    
    setResultForm({ badQty: 0, badReason: '' });
    setWarehouseInputMap({});
    setManualAllocations({});
    setSelectedMrpItem(null);
    setCurrentInputMap({});

    await calcMrp(prod.itemCd, prod.planQty);
    await fetchDetailLogs(prod.prodNo);
  };

  useEffect(() => {
    if (location.state?.focusId && prodList.length > 0) {
      const targetId = location.state.focusId;
      const targetRow = prodList.find(p => p.prodNo === targetId);

      if (targetRow) {
        // 1. 상세 정보 열기
        handleSelectProd(targetRow);

        // 2. 해당 행으로 스크롤 이동
        setTimeout(() => {
             const rowElement = document.getElementById(`excel-row-${targetId}`);
             if (rowElement) {
                 rowElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
             }
        }, 100);

        // 3. state 초기화
        window.history.replaceState({}, document.title);
      }
    }
  }, [prodList, location.state]);

  const handleCreateClick = () => {
    const temp = {
      prodNo: 'TEMP', prodDt: new Date().toISOString().split('T')[0],
      itemCd: '', itemNm: '', planQty: '', status: '01', remark: ''
    };
    setProdList(prev => [temp, ...prev]);
    handleSelectProd(temp);
  };

  const handleItemChange = async (e) => {
    const code = e.target.value;
    const item = items.find(i => i.itemCd === code);
    setPlanForm(prev => ({ ...prev, itemCd: code, itemNm: item?.itemNm || '' }));
    if (planForm.planQty > 0) await calcMrp(code, planForm.planQty);
  };

  const saveProdToDb = async (nextStatus) => {
    const isNew = selectedProd.prodNo === 'TEMP';
    const payload = {
        ...planForm, 
        prodNo: isNew ? null : planForm.prodNo,
        planQty: Number(planForm.planQty),
        status: nextStatus || selectedProd.status 
    };
    const url = isNew ? API.prods : `${API.prods}/${encodeURIComponent(selectedProd.prodNo)}`;
    const method = isNew ? "POST" : "PUT";

    try {
        const res = await fetch(url, {
            method, headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error(await res.text());
        
        const saved = await res.json();
        const foundItem = items.find(i => i.itemCd === saved.itemCd);
        saved.itemNm = foundItem?.itemNm || saved.itemNm;

        setProdList(prev =>
            isNew
              ? [saved, ...prev.filter(p => p.prodNo !== 'TEMP')]
              : prev.map(p => p.prodNo === saved.prodNo ? saved : p)
        );
        
        // 목록 갱신 및 상태 업데이트
        await fetchProdList();
        const updated = saved;
        updated.itemNm = foundItem?.itemNm || updated.itemNm;
        setSelectedProd(updated);
        setPlanForm(prev => ({...prev, prodNo: saved.prodNo}));
        
        return saved;
    } catch(e) {
        alert("저장 실패: " + e.message);
        throw e;
    }
  };

  const handlePrev = async () => {
    if (!selectedProd) return;
    const current = selectedProd.status;

    if (current >= '04') {
        alert("생산이 시작된 이후에는 이전 단계로 돌아갈 수 없습니다.");
        return;
    }

    try {
        if (current === '02') {
            await saveProdToDb('01');
        } else if (current === '03') {
            // 03(예약) -> 02(MRP): 예약 취소 수행
            if (window.confirm("이전 단계로 돌아가면 창고에 배정된 자재 예약이 취소됩니다.\n계속하시겠습니까?")) {
                const res = await fetch(`${API.prods}/${encodeURIComponent(selectedProd.prodNo)}/unreserve`, {
                    method: "POST"
                });
                
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt);
                }
                
                await fetchDetailLogs(selectedProd.prodNo);
                await saveProdToDb('02');
                
                // 배정 상태 초기화
                setManualAllocations({});
                setCurrentInputMap({});
                setSelectedMrpItem(null);
                
                alert("자재 예약이 취소되고 이전 단계로 이동했습니다.");
            }
        }
    } catch (e) {
        console.error(e);
        alert("이전 단계 이동 실패: " + e.message);
    }
  };

  const handleNext = async () => {
    if (!selectedProd) return;
    const current = selectedProd.status;

    try {
        if (current === '01') {
            if(!planForm.itemCd || !planForm.planQty) return alert("제품과 수량을 입력하세요.");
            await saveProdToDb('02');
        }
        else if (current === '02') {
          // MRP -> 자재예약 (예약 API 호출 X, 상태만 변경)
          if (!isAllMaterialOk) {
             if(!window.confirm("자재가 부족합니다. 발주가 필요할 수 있습니다. 그래도 예약 단계로 이동하시겠습니까?")) return;
          }
          await saveProdToDb('03');
        }
        else if (current === '03') {
            // 자재예약 -> 생산중 (여기서 예약 + 소모 처리)
            
            const allocations = [];
            Object.entries(manualAllocations).forEach(([itemCd, list]) => {
                list.forEach(a => {
                    if (a.qty > 0) {
                        allocations.push({
                            itemCd: itemCd,
                            whCd: normalizeWhCd(a.whCd), 
                            qty: a.qty
                        });
                    }
                });
            });

            // 할당 정보가 없으면 자동 할당 (빈 객체)
            const body = allocations.length > 0 ? { allocations } : {};

            // 1. 예약
            const res = await fetch(`${API.prods}/${encodeURIComponent(selectedProd.prodNo)}/reserve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorMsg = await res.text();
                throw new Error(errorMsg); 
            }
            
            await fetchDetailLogs(selectedProd.prodNo);
            
            // 2. 소모
            const res2 = await fetch(`${API.prods}/${encodeURIComponent(selectedProd.prodNo)}/consume`, {
                method: "POST"
            });
            if(!res2.ok) throw new Error(await res2.text());

            await saveProdToDb('04');
        }
        else if (current === '04') {
            await saveProdToDb('05');
        }
        else if (current === '05') {
            const res = await fetch(`${API.prods}/${encodeURIComponent(selectedProd.prodNo)}/results2`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resultDt: planForm.prodDt,
                    whCd: "TEMP", 
                    goodQty: goodQty,
                    badQty: Number(resultForm.badQty),
                    badRes: resultForm.badReason,
                    remark: "실적등록"
                })
            });
            if(!res.ok) throw new Error(await res.text());
            await saveProdToDb('06');
        }
        else if (current === '06') {
            const totalAssign = Object.values(warehouseInputMap).reduce((a,b)=>a+b, 0);
            if(totalAssign !== goodQty) return alert(`입고 수량 합계(${totalAssign})가 정상품 수량(${goodQty})과 다릅니다.`);

            const allocs = Object.entries(warehouseInputMap)
                .filter(([_, qty]) => qty > 0)
                .map(([whCd, qty]) => ({ whCd, qty }));

            const res = await fetch(`${API.prods}/${encodeURIComponent(selectedProd.prodNo)}/receive`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ allocations: allocs, remark: "완제품입고" })
            });
            if(!res.ok) throw new Error(await res.text());
            
            await saveProdToDb('07');
            await fetchDetailLogs(selectedProd.prodNo);
        }
    } catch (e) { 
        console.error(e); 
        alert(e.message || "오류가 발생했습니다."); 
    }
  };

  const handleCancel = async () => {
      if(!selectedProd || selectedProd.status >= '04') return alert("생산 중이거나 완료된 건은 취소할 수 없습니다.");
      if(!window.confirm("취소하시겠습니까? (예약된 자재는 반환됩니다)")) return;

      const res = await fetch(`${API.prods}/${encodeURIComponent(selectedProd.prodNo)}/cancel`, { method: "PUT" });
      if(res.ok) {
          const updated = await res.json();
          const foundItem = items.find(i => i.itemCd === updated.itemCd);
          updated.itemNm = foundItem?.itemNm || updated.itemNm;

          setProdList(prev => prev.map(p => p.prodNo === updated.prodNo ? updated : p));
          setSelectedProd(updated);
          await fetchDetailLogs(updated.prodNo);
      }
  };

  const filteredList = useMemo(() => {
    return prodList.filter(p => {
      if (startDate && p.prodDt < startDate) return false;
      if (endDate && p.prodDt > endDate) return false;
      if (!includeCanceled && (p.status === '08' || p.status === '09')) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (appliedSearchTerm) {
        if (searchType === 'prodNo' && !p.prodNo?.includes(appliedSearchTerm)) return false;
        if (searchType === 'itemNm' && !p.itemNm?.includes(appliedSearchTerm)) return false;
      }
      return true;
    });
  }, [prodList, startDate, endDate, includeCanceled, statusFilter, appliedSearchTerm, searchType]);

  const renderPlanPanel = () => (
    <div className="form-section">
      <h3 className="section-title">📄 생산 계획 수립</h3>
      <div className="form-row">
        <label>제품</label>
        <select value={planForm.itemCd} onChange={handleItemChange} disabled={selectedProd.status !== '01'}>
          <option value="">제품 선택</option>
          {products.map(p => <option key={p.itemCd} value={p.itemCd}>{p.itemNm}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label>계획수량</label>
        <input type="number" value={planForm.planQty} 
               onChange={e => {
                   setPlanForm({...planForm, planQty: e.target.value});
                   if(planForm.itemCd) calcMrp(planForm.itemCd, e.target.value);
               }} 
               disabled={selectedProd.status !== '01'}/>
      </div>
      <div className="form-row">
        <label>계획일자</label>
        <input type="date" value={planForm.prodDt} onChange={e => setPlanForm({...planForm, prodDt: e.target.value})} disabled={selectedProd.status !== '01'}/>
      </div>
      <div className="form-row">
        <label>비고</label>
        <input value={planForm.remark} onChange={e => setPlanForm({...planForm, remark: e.target.value})} disabled={selectedProd.status !== '01'}/>
      </div>
    </div>
  );

  const renderMRPPanel = () => {
    let totalAlloc = 0;
    if (selectedMrpItem) {
        Object.values(currentInputMap).forEach(qty => totalAlloc += qty);
    }
    
    // ✅ [수정] 자재 예약('03') 단계에서만 배정 입력 가능
    const isInputEnabled = selectedProd && selectedProd.status === '03';
    
    let guideText = "";
    if (selectedProd.status === '02') guideText = "※ 현재는 MRP 확인 단계입니다. 배정은 [다음단계]에서 진행해주세요.";
    else if (selectedProd.status === '03') guideText = "※ 수동 배정을 하지 않은 자재는 [다음단계] 클릭 시 시스템이 자동으로 배정합니다.";
    else guideText = "※ 생산이 시작되어 자재를 수정할 수 없습니다.";

    return (
    <div className="form-section">
      <div className="section-title">🔧 자재 소요량 확인 (MRP)</div>
      <table className="excel-table">
        <thead>
          <tr>
            <th className="excel-th">자재명</th>
            <th className="excel-th">필요</th>
            <th className="excel-th">가용</th>
            <th className="excel-th">상태</th>
            <th className="excel-th">배정방식</th>
          </tr>
        </thead>
        <tbody>
          {materialList.map((m, i) => (
            <tr
              key={i}
              className={`excel-tr ${!m.isOk ? 'mrp-shortage' : 'mrp-complete'} ${selectedMrpItem?.itemCd === m.itemCd ? 'selected-row' : ''}`}
              onClick={() => {
                setSelectedMrpItem({...m});
                
                const saved = manualAllocations[m.itemCd] || [];
                const initInput = {};
                saved.forEach(s => {
                    initInput[s.whCd] = s.qty;
                });
                setCurrentInputMap(initInput);

                fetchWarehouseStock(m.itemCd);
              }}
              style={{cursor:'pointer'}}
            >
              <td className="excel-td">{m.itemNm}</td>
              <td className="excel-td">{m.reqQty}</td>
              <td className="excel-td">{m.availQty}</td>
              <td className="excel-td">{m.isOk ? "확보가능" : `부족 (${m.shortQty})`}</td>
              <td className="excel-td">
                  {m.isAllocated ? <span style={{color:'green', fontWeight:'bold'}}>수동배정</span> : <span style={{color:'#999'}}>자동배정</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {selectedMrpItem && (
        <div className="form-section" style={{marginTop:'10px', borderTop:'1px dashed #ccc', paddingTop:'10px'}}>
          <div className="section-title">
            📦 창고별 배정 ({selectedMrpItem.itemNm})
          </div>

          <table className="excel-table">
            <thead>
              <tr>
                <th className="excel-th">창고</th>
                <th className="excel-th">재고</th>
                <th className="excel-th">예약</th>
                <th className="excel-th">가용</th>
                <th className="excel-th">투입(수동)</th>
              </tr>
            </thead>
            <tbody>
              {materialWhs
                .filter(w => w.whType === "01" || w.whType === "03")
                .map((w) => {
                  const normWhCd = normalizeWhCd(w.whCd); 
                  const stock = warehouseStockMap[normWhCd] || {
                    stockQty: 0,
                    allocQty: 0,
                    availQty: 0
                  };
                  
                  return (
                    <tr key={w.whCd} className="excel-tr">
                      <td className="excel-td">{w.whNm}</td>
                      <td className="excel-td">{stock.stockQty}</td>
                      <td className="excel-td">{stock.allocQty}</td>
                      <td className="excel-td" style={{fontWeight:'bold', color:'#3b82f6'}}>{stock.availQty}</td>
                      <td className="excel-td">
                         <input 
                            type="number"
                            min="0"
                            max={stock.availQty}
                            className="pp-input"
                            style={{width:'80px', textAlign:'right'}}
                            value={currentInputMap[normWhCd] || ''}
                            // ✅ 03 단계일 때만 입력 가능
                            disabled={!isInputEnabled}
                            onChange={e => {
                                const val = Number(e.target.value);
                                if (val > stock.availQty) {
                                    alert(`가용재고(${stock.availQty})보다 많이 배정할 수 없습니다.`);
                                    return;
                                }
                                setCurrentInputMap(prev => ({
                                    ...prev,
                                    [normWhCd]: val
                                }));
                            }}
                         />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          
          <div className="warehouse-action-bar" style={{justifyContent:'flex-end', marginTop:'10px'}}>
              <span style={{marginRight:'10px', fontSize:'14px'}}>
                  필요: <b>{selectedMrpItem.reqQty}</b> / 배정: <b style={{color: totalAlloc === selectedMrpItem.reqQty ? 'green' : 'red'}}>{totalAlloc}</b>
              </span>
              {/* ✅ 03 단계일 때만 버튼 표시 */}
              {isInputEnabled && (
                  <button className="excel-btn" onClick={() => {
                      if (totalAlloc !== selectedMrpItem.reqQty) {
                          alert(`배정 수량 합계(${totalAlloc})가 필요 수량(${selectedMrpItem.reqQty})과 일치해야 합니다.`);
                          return;
                      }
                      
                      const allocList = Object.entries(currentInputMap)
                        .filter(([_, qty]) => qty > 0)
                        .map(([whCd, qty]) => ({ whCd, qty }));
                        
                      setManualAllocations(prev => ({
                          ...prev,
                          [selectedMrpItem.itemCd]: allocList
                      }));
                      
                      alert(`${selectedMrpItem.itemNm} 수동 배정이 완료되었습니다.`);
                  }}>
                      배정 확정
                  </button>
              )}
          </div>
        </div>
      )}

      <div className="hint-text" style={{marginTop:'15px'}}>
         {guideText}
      </div>
    </div>
  );
  }

  const renderResultPanel = () => (
      <div className="form-section">
          <div className="section-title">📦 생산 실적 등록</div>
          <div className="form-row">
              <label>불량 수량</label>
              <input type="number" value={resultForm.badQty} onChange={e => setResultForm({...resultForm, badQty: Number(e.target.value)})} />
          </div>
          <div className="form-row">
              <label>불량 사유</label>
              <input value={resultForm.badReason} onChange={e => setResultForm({...resultForm, badReason: e.target.value})} />
          </div>
          <div className="form-row">
              <label>정상품</label>
              <input value={goodQty} readOnly style={{fontWeight:'bold', color:'blue'}} />
          </div>
      </div>
  );

  const renderWarehousePanel = () => {
      const assigned = Object.values(warehouseInputMap).reduce((a,b)=>a+b,0);
      return (
        <div className="form-section">
            <div className="section-title">🏬 완제품 입고 창고 배정</div>
            <div className="form-row">
                <label>입고 대상</label>
                <input value={goodQty} readOnly />
            </div>
            <div className="form-row">
                <label>배정 합계</label>
                <input value={assigned} readOnly style={{color: assigned===goodQty ? 'green' : 'red'}} />
            </div>
            
            <table className="excel-table mt-12">
                <thead><tr><th className="excel-th">창고</th><th className="excel-th">배정수량</th></tr></thead>
                <tbody>
                    {whs.filter(w => w.whType !== '자재').map(w => (
                        <tr key={w.whCd} className="excel-tr">
                            <td className="excel-td">{w.whNm}</td>
                            <td className="excel-td" style={{padding:0}}>
                                <input type="number" className="pp-input" style={{border:'none', textAlign:'center'}}
                                       value={warehouseInputMap[w.whCd] || ''}
                                       onChange={e => setWarehouseInputMap({...warehouseInputMap, [w.whCd]: Number(e.target.value)})} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      );
  };

  const renderCompletePanel = () => (
      <div className="form-section">
          <div className="section-title">✅ 공정 완료 정보</div>
          <div className="form-row"><label>상태</label><span>최종 완료</span></div>
          <div className="form-row"><label>입고일</label><span>{new Date().toLocaleDateString()}</span></div>
          
          <div className="section-title mt-16">📜 공정 로그</div>
          <table className="excel-table">
              <thead>
                  <tr>
                      <th className="excel-th" style={{width:'90px'}}>날짜</th>
                      <th className="excel-th" style={{width:'70px'}}>구분</th>
                      <th className="excel-th">품목</th>
                      <th className="excel-th">창고</th>
                      <th className="excel-th" style={{width:'60px'}}>수량</th>
                  </tr>
              </thead>
              <tbody>
                  {detailLogs.map((l, i) => {
                      const whInfo = l.toWh?.whNm || l.toWh?.whCd || l.fromWh?.whNm || l.fromWh?.whCd || '-';
                      return (
                          <tr key={i} className="excel-tr">
                              <td className="excel-td">{l.ioDt ? l.ioDt.substring(0, 10) : '-'}</td>
                              <td className="excel-td">{getLogTypeLabel(l.ioType)}</td>
                              <td className="excel-td">{l.itemMst?.itemNm}</td>
                              <td className="excel-td">{whInfo}</td>
                              <td className="excel-td">{l.qty}</td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>
  );

  const renderContent = () => {
      if (!selectedProd) return <div className="empty-view">계획을 선택해주세요</div>;
      switch(selectedProd.status) {
          case '01': return renderPlanPanel();
          case '02': return <>{renderPlanPanel()}{renderMRPPanel()}</>;
          case '03': return <>{renderPlanPanel()}{renderMRPPanel()}</>; 
          case '04': return <>{renderPlanPanel()}{renderMRPPanel()}</>; 
          case '05': return renderResultPanel();
          case '06': return renderWarehousePanel();
          case '07': return renderCompletePanel();
          default: return <div className="empty-view">취소된 계획입니다.</div>;
      }
  };

  return (
    <div className="order-management-container">
      <div className="header-left-section">
        <h2 className="page-title">생산계획 관리</h2>
      </div>

      <div className="order-content-layout">
        {/* LEFT: LIST */}
        <div className="order-list-panel">
          <div className="list-table-wrapper">
            <div className="panel-header">
              <div className="panel-title">📋 생산계획 목록</div>
              <div className="statistics-info">
                <span className="stat-label">완료:</span>
                <span className="stat-value">{prodList.filter(p=>p.status==='07').length}</span>
              </div>
              <button className="filter-toggle-btn" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <span>{isFilterOpen ? '▲' : '▼'} 검색 필터</span>
              </button>
              <div className="right-actions">
                <button className="excel-btn excel-btn-new" onClick={handleCreateClick}>새 생산계획</button>
              </div>
            </div>

            {/* 필터 영역 */}
            <div className={`filter-slide ${isFilterOpen ? 'open' : ''}`}>
              <div className="advanced-filter-panel">
                <div className="filter-row">
                    <div className="filter-field filter-top">
                        <label className="filter-label">기간</label>
                        <div className="date-range-filter">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="date-separator">~</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="filter-field filter-top">
                        <label className="filter-label">검색</label>
                        <SearchBar
                            searchOptions={[
                              { value: 'prodNo', label: '생산번호' },
                              { value: 'itemNm', label: '제품명' }
                            ]}
                            searchType={searchType}
                            onSearchTypeChange={setSearchType}
                            searchTerm={searchTerm}
                            onSearchTermChange={setSearchTerm}
                        />
                    </div>
                    <div className="filter-field filter-bottom">
                        <label className="filter-label">상태</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="ALL">전체</option>
                            {STATE_STEPS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                    </div>
                    <div className="filter-field filter-bottom">
                         <label className="filter-label">취소 포함</label>
                         <div className="checkbox-row">
                             <input type="checkbox" checked={includeCanceled} onChange={e => setIncludeCanceled(e.target.checked)} />
                         </div>
                    </div>
                    <div className="filter-actions filter-bottom">
                        <button className="excel-btn excel-btn-new" onClick={()=>setAppliedSearchTerm(searchTerm)}>검색</button>
                        <button className="excel-btn excel-btn-new" onClick={()=>{
                            setStartDate(''); setEndDate(''); setSearchTerm(''); setAppliedSearchTerm(''); setStatusFilter('ALL'); setIncludeCanceled(false);
                        }}>초기화</button>
                    </div>
                </div>
              </div>
            </div>

            <table className="excel-table">
              <thead>
                <tr>
                  <th className="excel-th" style={{width:'40px'}}>No</th>
                  <th className="excel-th" style={{width:'90px', cursor:'pointer'}} onClick={() => handleSortChange('prodDt')}>
                    계획일자 {sortConfig.key === 'prodDt' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="excel-th">생산번호</th>
                  <th className="excel-th">제품명</th>
                  <th className="excel-th" style={{width:'60px'}}>수량</th>
                  <th className="excel-th" style={{width:'60px'}}>상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((p, i) => (
                  <tr key={p.prodNo} className={`excel-tr ${selectedProd?.prodNo === p.prodNo ? 'selected' : ''}`} onClick={() => handleSelectProd(p)}>
                    <td className="excel-td">{i + 1}</td>
                    <td className="excel-td">{p.prodDt}</td>
                    <td className="excel-td">{p.prodNo}</td>
                    <td className="excel-td" style={{textAlign:'left'}}>
                      {p.itemNm || items.find(it => it.itemCd === p.itemCd)?.itemNm || '-'}
                    </td>
                    <td className="excel-td" style={{textAlign:'right'}}>{p.planQty}</td>
                    <td className={`excel-td ${p.status === '08' || p.status === '09' ? 'status-cancel' : ''}`}>
                        {getStatusLabel(p.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: DETAIL */}
        <div className="order-detail-panel">
          {selectedProd ? (
            <>
              <div className="detail-header">
                <h3 className="detail-title">{selectedProd.prodNo} - {selectedProd.itemNm}</h3>
              </div>
              
              <div className="detail-meta-bar">
                <div className="state-progress">
                    {STATE_STEPS.map(s => (
                        <span key={s.code} className={`state-step ${s.code === selectedProd.status ? 'active' : ''} ${s.code < selectedProd.status ? 'done' : ''}`}>
                            {s.label}
                        </span>
                    ))}
                </div>
                <div className="meta-section">
                    <button className="excel-btn" onClick={()=>saveProdToDb()}>저장</button>
                    {/* ✅ 이전 단계 버튼 */}
                    {(selectedProd.status === '02' || selectedProd.status === '03') && (
                        <button className="excel-btn excel-btn-default" style={{marginRight:'5px'}} onClick={handlePrev}>&lt; 이전단계</button>
                    )}
                    {selectedProd.status < '07' && selectedProd.status !== '09' && 
                        <button className="excel-btn excel-btn-modify" onClick={handleNext}>다음단계 &gt;</button>
                    }
                </div>
              </div>

              <div className="detail-content">
                {renderContent()}
              </div>

              <div className="detail-footer">
                <button className="excel-btn excel-btn-delete" onClick={handleCancel}>계획 취소</button>
              </div>
            </>
          ) : (
            <div className="empty-view">좌측 목록에서 계획을 선택하거나 신규 생성하세요.</div>
          )}
        </div>
      </div>
    </div>
  )
}