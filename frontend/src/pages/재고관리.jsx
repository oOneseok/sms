import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import "../css/pages/재고관리.css"; // CSS 파일 경로는 프로젝트에 맞게 확인해주세요

const API_BASE = "http://localhost:8080";

const API = {
  items: `${API_BASE}/api/item`, 
  whs: `${API_BASE}/api/whs`,
  stocks: `${API_BASE}/api/stocks`,
  // ✅ [수정] 백엔드 컨트롤러(@RequestMapping("/api/stock_his"))와 일치시킴
  history: `${API_BASE}/api/stock_his`, 
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export default function 재고관리() {
  const navigate = useNavigate();
  const location = useLocation(); 

  const [viewMode, setViewMode] = useState("ITEM"); 
  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null); 
  const [stockList, setStockList] = useState([]); 
  const [historyList, setHistoryList] = useState([]);
  const [infoEdit, setInfoEdit] = useState({ val1: "", val2: "", remark: "" });
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("ALL"); 
  const [itemTotalStockMap, setItemTotalStockMap] = useState({});

  const whMap = useMemo(() => {
    const m = new Map();
    whs.forEach((w) => m.set(String(w.whCd), w.whNm));
    return m;
  }, [whs]);

  const itemMap = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(String(it.itemCd), it.itemNm));
    return m;
  }, [items]);

  useEffect(() => {
    fetchMasters();
    fetchTotalStocks(); 
  }, []);

  const fetchMasters = async () => {
    try {
      const [rItems, rWhs] = await Promise.all([
        fetch(API.items).then(r => r.json()),
        fetch(API.whs).then(r => r.json())
      ]);
      setItems(Array.isArray(rItems) ? rItems : []);
      setWhs(Array.isArray(rWhs) ? rWhs : []);
    } catch (err) {
      console.error("마스터 로딩 실패", err);
    }
  };

  const fetchTotalStocks = async () => {
      try {
          const r = await fetch(`${API.stocks}?size=10000`); 
          const d = await r.json();
          const rows = Array.isArray(d) ? d : (d.content || []);
          
          const map = {};
          rows.forEach(row => {
              const iCd = row.id?.itemCd;
              const qty = safeNum(row.stockQty);
              if(map[iCd]) map[iCd] += qty;
              else map[iCd] = qty;
          });
          setItemTotalStockMap(map);
      } catch(e) {
          console.error(e);
      }
  };

  const handleTabChange = (mode) => {
    setViewMode(mode);
    setSelectedTarget(null);
    setStockList([]);
    setHistoryList([]);
    setSearchText("");
    setFilterType("ALL");
  };

  const handleRowClick = async (target) => {
    setSelectedTarget(target);

    // 상세 정보(우측 상단 폼) 세팅
    if (viewMode === 'ITEM') {
        setInfoEdit({
            val1: target.minQty ?? "",
            val2: target.maxQty ?? "",
            remark: target.remark ?? ""
        });
    } else {
        setInfoEdit({
            val1: target.whType ?? "",
            val2: target.useFlag ?? "",
            remark: target.remark ?? ""
        });
    }

    // 1. 재고 현황 조회 (중앙 하단 테이블)
    try {
      let url = `${API.stocks}?size=1000`;
      if (viewMode === 'ITEM') url += `&itemCd=${target.itemCd}`;
      else url += `&whCd=${target.whCd}`;

      const r = await fetch(url);
      const d = await r.json();
      const rows = Array.isArray(d) ? d : (d.content || []);
      
      const mapped = rows.map(row => ({
        itemCd: row.id?.itemCd,
        whCd: row.id?.whCd,
        stockQty: safeNum(row.stockQty),
        allocQty: safeNum(row.allocQty)
      }));

      setStockList(mapped);
    } catch (e) {
      setStockList([]);
    }

    // 2. ✅ [수정] 입출고 이력 조회 (잔고 포함)
    // 백엔드 ItemStockHisController의 파라미터(itemCd, whCd)에 맞춰 호출
    try {
        const params = new URLSearchParams();
        // size 등을 늘려서 전체 이력을 가져오거나 페이징 처리 필요 (여기선 100개 가정)
        params.append("size", "100"); 
        
        if (viewMode === 'ITEM') {
            params.append("itemCd", target.itemCd);
        } else {
            params.append("whCd", target.whCd);
        }

        const r = await fetch(`${API.history}?${params.toString()}`);
        const d = await r.json();
        // Page 객체(content)로 오는지 배열로 오는지 체크
        const rows = Array.isArray(d) ? d : (d.content || []);
        
        setHistoryList(rows);
    } catch (e) {
        console.error("이력 조회 실패", e);
        setHistoryList([]);
    }
  };

  const handleItemDoubleClick = (item, currentQty) => {
    const minQty = safeNum(item.minQty);
    
    if (minQty > 0 && currentQty < minQty) {
        const returnUrl = encodeURIComponent(location.pathname);
        if (item.itemFlag === '01') {
            if (window.confirm(`[자재: ${item.itemNm}] 재고가 부족합니다.\n발주 관리 화면으로 이동하시겠습니까?`)) {
                navigate(`/구매영업관리/발주관리?itemCd=${item.itemCd}&returnPath=${returnUrl}`);
            }
        } 
        else if (item.itemFlag === '02') {
            if (window.confirm(`[제품: ${item.itemNm}] 재고가 부족합니다.\n생산 실적 관리 화면으로 이동하시겠습니까?`)) {
                navigate(`/생산관리/생산실적관리?itemCd=${item.itemCd}&returnPath=${returnUrl}`);
            }
        }
    }
  };

  const filteredList = useMemo(() => {
    const kw = searchText.toLowerCase();
    if (viewMode === 'ITEM') {
        return items.filter(it => {
            if (filterType !== "ALL" && it.itemFlag !== filterType) return false;
            return !kw || it.itemCd.toLowerCase().includes(kw) || it.itemNm.toLowerCase().includes(kw);
        });
    } else {
        return whs.filter(wh => {
            return !kw || wh.whCd.toLowerCase().includes(kw) || wh.whNm.toLowerCase().includes(kw);
        });
    }
  }, [items, whs, viewMode, filterType, searchText]);

  const handleSave = async () => {
    if (!selectedTarget) return;
    if (viewMode === 'WH') return; 
    if (!window.confirm("변경 내용을 저장하시겠습니까?")) return;

    try {
        const itemPayload = {
            ...selectedTarget,
            minQty: infoEdit.val1 === "" ? null : Number(infoEdit.val1),
            maxQty: infoEdit.val2 === "" ? null : Number(infoEdit.val2),
            remark: infoEdit.remark
        };
        await fetch(API.items, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemPayload)
        });
        alert("저장되었습니다.");
        fetchMasters();
        const updatedTarget = items.find(i => i.itemCd === selectedTarget.itemCd);
        if(updatedTarget) handleRowClick(updatedTarget);
    } catch (e) {
        alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleInfoChange = (e) => {
      const { name, value } = e.target;
      setInfoEdit(prev => ({ ...prev, [name]: value }));
  };

  const totalStockSummary = useMemo(() => {
      if (stockList.length === 0) return null;
      return {
          stockQty: stockList.reduce((acc, cur) => acc + cur.stockQty, 0),
          allocQty: stockList.reduce((acc, cur) => acc + cur.allocQty, 0),
      };
  }, [stockList]);

  return (
    <div className="stock-page-container">
      <div className="stock-header">
        <h2>재고 관리</h2>
      </div>

      <div className="stock-body-layout">
        {/* LEFT PANEL */}
        <div className="layout-panel panel-left">
            <div className="panel-tab-area">
                <button className={`tab-btn ${viewMode === 'ITEM' ? 'active' : ''}`} onClick={() => handleTabChange('ITEM')}>📦 품목 목록</button>
                <button className={`tab-btn ${viewMode === 'WH' ? 'active' : ''}`} onClick={() => handleTabChange('WH')}>🏭 창고 목록</button>
            </div>
            
            <div className="list-search-box">
                {viewMode === 'ITEM' && (
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="ALL">전체</option>
                        <option value="01">자재</option>
                        <option value="02">제품</option>
                    </select>
                )}
                <input placeholder={viewMode === 'ITEM' ? "코드/품명 검색" : "코드/창고명 검색"} value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>

            <div className="table-wrapper">
                <table className="excel-table hoverable">
                    <thead>
                        <tr>
                            {viewMode === 'ITEM' ? (
                                <> <th style={{width:'50px'}}>구분</th> <th>코드</th> <th>품명 (재고)</th> </>
                            ) : (
                                <> <th style={{width:'80px'}}>창고코드</th> <th>창고명</th> <th style={{width:'60px'}}>유형</th> </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map((item, idx) => {
                            let rowStyle = {};
                            const totalQty = itemTotalStockMap[item.itemCd] || 0;
                            let titleText = "";

                            if (viewMode === 'ITEM') {
                                const min = safeNum(item.minQty);
                                const max = safeNum(item.maxQty);

                                if (min > 0 && totalQty < min) {
                                    rowStyle = { backgroundColor: '#fff1f0', color: '#cf1322' }; 
                                    titleText = item.itemFlag === '01' 
                                        ? "⚠️ 재고 부족 (더블클릭 → 발주관리)" 
                                        : "⚠️ 재고 부족 (더블클릭 → 생산실적관리)";
                                } else if (max > 0 && totalQty > max) {
                                    rowStyle = { backgroundColor: '#fffbe6', color: '#d48806' };
                                    titleText = "⚠️ 재고 과다";
                                }
                            }

                            return (
                                <tr key={idx} 
                                    className={(viewMode === 'ITEM' && selectedTarget?.itemCd === item.itemCd) || (viewMode === 'WH' && selectedTarget?.whCd === item.whCd) ? "selected" : ""}
                                    style={rowStyle}
                                    onClick={() => handleRowClick(item)}
                                    onDoubleClick={() => viewMode === 'ITEM' && handleItemDoubleClick(item, totalQty)}
                                    title={titleText}
                                >
                                    {viewMode === 'ITEM' ? (
                                        <>
                                            <td style={{textAlign:'center'}}>
                                                <span className={`type-badge type-${item.itemFlag}`}>
                                                    {item.itemFlag === '01' ? '자재' : '제품'}
                                                </span>
                                            </td>
                                            <td>{item.itemCd}</td>
                                            <td>{item.itemNm} <span style={{fontWeight:'bold', fontSize:'11px', marginLeft:'4px', color:'inherit'}}>(총: {totalQty})</span></td>
                                        </>
                                    ) : (
                                        <> <td>{item.whCd}</td> <td>{item.whNm}</td> <td style={{textAlign:'center'}}>{item.whType}</td> </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* CENTER PANEL */}
        <div className="layout-panel panel-center">
            <div className="panel-title-row">
                <span className="panel-title-text">{viewMode === 'ITEM' ? "📝 품목 상세 정보" : "📝 창고 상세 정보"}</span>
                {viewMode === 'ITEM' && <button className="btn-save" onClick={handleSave} disabled={!selectedTarget}>저장</button>}
            </div>

            {!selectedTarget ? <div className="empty-msg">좌측 목록에서 항목을 선택해주세요.</div> : (
                <div className="detail-content">
                    <div className="selected-info-header">
                        <div className="info-title">{viewMode === 'ITEM' ? selectedTarget.itemNm : selectedTarget.whNm}</div>
                        <div className="info-sub">{viewMode === 'ITEM' ? selectedTarget.itemCd : selectedTarget.whCd}</div>
                    </div>
                    <div className="compact-grid">
                        <div className="form-group">
                            <label>{viewMode==='ITEM' ? "최소재고" : "창고유형"}</label>
                            <input name="val1" value={infoEdit.val1} onChange={handleInfoChange} type={viewMode==='ITEM' ? "number" : "text"} readOnly={viewMode === 'WH'} className={viewMode === 'WH' ? 'read-only' : ''} />
                        </div>
                        <div className="form-group">
                            <label>{viewMode==='ITEM' ? "최대재고" : "사용여부"}</label>
                            <input name="val2" value={infoEdit.val2} onChange={handleInfoChange} type={viewMode==='ITEM' ? "number" : "text"} readOnly={viewMode === 'WH'} className={viewMode === 'WH' ? 'read-only' : ''} />
                        </div>
                        <div className="form-group" style={{gridColumn: 'span 2'}}>
                            <label>비고</label>
                            <input name="remark" value={infoEdit.remark} onChange={handleInfoChange} readOnly={viewMode === 'WH'} className={viewMode === 'WH' ? 'read-only' : ''} />
                        </div>
                    </div>
                    <div className="divider"></div>
                    <div className="sub-title">{viewMode === 'ITEM' ? "🏠 창고별 재고 현황" : "📦 보유 품목 현황"}</div>
                    <div className="table-wrapper stock-grid-wrapper">
                        <table className="excel-table">
                            <thead><tr><th>{viewMode === 'ITEM' ? "창고" : "품목"}</th><th>재고수량</th><th>예약수량</th><th>가용수량</th></tr></thead>
                            <tbody>
                                {stockList.length > 0 && totalStockSummary && (
                                    <tr style={{backgroundColor: '#fafafa', fontWeight: 'bold', borderBottom: '2px solid #ddd'}}>
                                        <td style={{textAlign: 'center', color: '#333'}}>[전체 합계]</td>
                                        <td style={{textAlign: 'right', color: '#333'}}>{totalStockSummary.stockQty}</td>
                                        <td style={{textAlign: 'right'}}>{totalStockSummary.allocQty}</td>
                                        <td style={{textAlign: 'right', color: '#0078d4'}}>{totalStockSummary.stockQty - totalStockSummary.allocQty}</td>
                                    </tr>
                                )}
                                {stockList.length === 0 ? <tr><td colSpan="4" className="no-data">데이터가 없습니다.</td></tr> : stockList.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{viewMode === 'ITEM' ? `${whMap.get(row.whCd) || row.whCd}` : `${itemMap.get(row.itemCd) || row.itemCd}`}</td>
                                        <td style={{textAlign: 'right', fontWeight: 'bold'}}>{row.stockQty}</td>
                                        <td style={{textAlign: 'right'}}>{row.allocQty}</td>
                                        <td style={{textAlign: 'right', color: '#0078d4'}}>{row.stockQty - row.allocQty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT PANEL (HISTORY with BALANCE) */}
        <div className="layout-panel panel-right">
            <div className="panel-title">📊 입출고 이력</div>
            <div className="table-wrapper">
                <table className="excel-table">
                    <thead>
                        <tr>
                            <th style={{width:'110px'}}>날짜</th>
                            <th style={{width:'50px'}}>구분</th>
                            <th>수량</th>
                            {/* ✅ 잔고 컬럼 추가 */}
                            <th style={{backgroundColor: '#f1f8ff'}}>잔고</th> 
                            <th>{viewMode==='ITEM' ? '창고' : '품목'}</th>
                            <th>거래처</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!selectedTarget ? <tr><td colSpan="6" className="no-data">-</td></tr> : 
                         historyList.length === 0 ? <tr><td colSpan="6" className="no-data">이력 없음</td></tr> : 
                         historyList.map((h, i) => (
                            <tr key={i}>
                                <td style={{fontSize:'11px'}}>{h.ioDt}</td>
                                <td style={{textAlign:'center'}}><span className={`io-badge ${h.ioType}`}>{h.ioType}</span></td>
                                <td style={{textAlign:'right', fontWeight:'bold'}}>
                                    <span style={{color: h.qty > 0 ? '#0078d4' : '#d13438'}}>
                                        {h.qty > 0 ? `+${h.qty}` : h.qty}
                                    </span>
                                </td>
                                
                                {/* ✅ [핵심] 잔고 수량 표시 */}
                                <td style={{textAlign:'right', backgroundColor: '#f9f9f9', fontWeight:'bold', color: '#333'}}>
                                    {h.balance != null ? Number(h.balance).toLocaleString() : '-'}
                                </td>

                                <td style={{fontSize:'11px'}}>{viewMode === 'ITEM' ? h.whCd : (itemMap.get(h.itemCd) || h.itemCd)}</td>
                                <td style={{fontSize:'11px', color:'#666'}}>{h.custNm || h.custCd || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}