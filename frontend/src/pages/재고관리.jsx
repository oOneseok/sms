import React, { useEffect, useMemo, useState } from "react";
import "../css/pages/재고관리.css";

const API = {
  items: "http://localhost:8080/api/item", 
  whs: "http://localhost:8080/api/whs",
  stocks: "http://localhost:8080/api/stocks",
  history: "http://localhost:8080/api/inout/history",
};

const safeNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export default function 재고관리() {
  const [viewMode, setViewMode] = useState("ITEM"); 

  const [items, setItems] = useState([]);
  const [whs, setWhs] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null); 

  const [stockList, setStockList] = useState([]); // 재고 목록 (수정 불가, 조회용)
  const [historyList, setHistoryList] = useState([]);
  const [infoEdit, setInfoEdit] = useState({ val1: "", val2: "", remark: "" });

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("ALL"); 
  
  // 품목별 총 재고 수량 맵 (목록 표시용)
  const [itemTotalStockMap, setItemTotalStockMap] = useState({});

  // 헬퍼 맵
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
    fetchTotalStocks(); // 전체 재고 현황 미리 로딩 (목록 표시용)
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

  // 전체 품목의 총 재고를 미리 계산해서 맵에 저장
  const fetchTotalStocks = async () => {
      try {
          const r = await fetch(`${API.stocks}?size=10000`); // 전체 조회
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

    // 1. 상세 정보 세팅
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

    // 2. 재고 데이터 로딩
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

    // 3. 이력 로딩
    try {
        const code = viewMode === 'ITEM' ? target.itemCd : target.whCd;
        const r = await fetch(`${API.history}?type=${viewMode}&code=${code}`);
        const d = await r.json();
        setHistoryList(Array.isArray(d) ? d : []);
    } catch (e) {
        setHistoryList([]);
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

  // 저장 로직 (품목 마스터 정보만 수정 가능)
  const handleSave = async () => {
    if (!selectedTarget) return;
    if (viewMode === 'WH') return; // 창고 모드는 저장 불가

    if (!window.confirm("변경 내용을 저장하시겠습니까?")) return;

    try {
        // 품목 정보만 업데이트 (재고 수량 수정 로직 제거)
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
        
        // 갱신을 위해 재선택 효과
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

  return (
    <div className="stock-page-container">
      <div className="stock-header">
        <h2>재고 관리</h2>
      </div>

      <div className="stock-body-layout">
        
        {/* === [좌측] 목록 === */}
        <div className="layout-panel panel-left">
            <div className="panel-tab-area">
                <button 
                    className={`tab-btn ${viewMode === 'ITEM' ? 'active' : ''}`}
                    onClick={() => handleTabChange('ITEM')}
                >
                    📦 품목 목록
                </button>
                <button 
                    className={`tab-btn ${viewMode === 'WH' ? 'active' : ''}`}
                    onClick={() => handleTabChange('WH')}
                >
                    🏭 창고 목록
                </button>
            </div>
            
            <div className="list-search-box">
                {viewMode === 'ITEM' && (
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="ALL">전체</option>
                        <option value="01">자재</option>
                        <option value="02">제품</option>
                    </select>
                )}
                <input 
                    placeholder={viewMode === 'ITEM' ? "코드/품명 검색" : "코드/창고명 검색"}
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)}
                />
            </div>

            <div className="table-wrapper">
                <table className="excel-table hoverable">
                    <thead>
                        <tr>
                            {viewMode === 'ITEM' ? (
                                <>
                                    <th style={{width:'50px'}}>구분</th>
                                    <th>코드</th>
                                    <th>품명 (재고)</th>
                                </>
                            ) : (
                                <>
                                    <th style={{width:'80px'}}>창고코드</th>
                                    <th>창고명</th>
                                    <th style={{width:'60px'}}>유형</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map((item, idx) => (
                            <tr 
                                key={idx} 
                                className={
                                    (viewMode === 'ITEM' && selectedTarget?.itemCd === item.itemCd) || 
                                    (viewMode === 'WH' && selectedTarget?.whCd === item.whCd) 
                                    ? "selected" : ""
                                }
                                onClick={() => handleRowClick(item)}
                            >
                                {viewMode === 'ITEM' ? (
                                    <>
                                        <td style={{textAlign:'center'}}>
                                            {/* ✅ 중요: type-숫자 형태로 클래스명 생성 */}
                                            <span className={`type-badge type-${item.itemFlag}`}>
                                                {item.itemFlag === '01' ? '자재' : '제품'}
                                            </span>
                                        </td>
                                        <td>{item.itemCd}</td>
                                        <td>
                                            {item.itemNm} 
                                            {/* 품명 옆에 총 재고 표시 */}
                                            <span style={{color:'#0078d4', fontWeight:'bold', fontSize:'11px', marginLeft:'4px'}}>
                                                (총: {itemTotalStockMap[item.itemCd] || 0})
                                            </span>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>{item.whCd}</td>
                                        <td>{item.whNm}</td>
                                        <td style={{textAlign:'center'}}>{item.whType}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* === [중앙] 상세 === */}
        <div className="layout-panel panel-center">
            <div className="panel-title-row">
                <span className="panel-title-text">
                    {viewMode === 'ITEM' ? "📝 품목 상세 정보" : "📝 창고 상세 정보"}
                </span>
                {/* 창고 모드일 땐 저장 버튼 숨김 (수정 불가) */}
                {viewMode === 'ITEM' && (
                    <button className="btn-save" onClick={handleSave} disabled={!selectedTarget}>저장</button>
                )}
            </div>

            {!selectedTarget ? (
                <div className="empty-msg">좌측 목록에서 항목을 선택해주세요.</div>
            ) : (
                <div className="detail-content">
                    {/* 상단 정보 폼 */}
                    <div className="selected-info-header">
                        <div className="info-title">
                            {viewMode === 'ITEM' ? selectedTarget.itemNm : selectedTarget.whNm}
                        </div>
                        <div className="info-sub">
                            {viewMode === 'ITEM' ? selectedTarget.itemCd : selectedTarget.whCd}
                        </div>
                    </div>

                    <div className="compact-grid">
                        <div className="form-group">
                            <label>{viewMode==='ITEM' ? "최소재고" : "창고유형"}</label>
                            <input 
                                name="val1"
                                value={infoEdit.val1} 
                                onChange={handleInfoChange}
                                type={viewMode==='ITEM' ? "number" : "text"}
                                readOnly={viewMode === 'WH'} // 창고 모드 수정 불가
                                className={viewMode === 'WH' ? 'read-only' : ''}
                            />
                        </div>
                        <div className="form-group">
                            <label>{viewMode==='ITEM' ? "최대재고" : "사용여부"}</label>
                            <input 
                                name="val2"
                                value={infoEdit.val2} 
                                onChange={handleInfoChange}
                                type={viewMode==='ITEM' ? "number" : "text"}
                                readOnly={viewMode === 'WH'}
                                className={viewMode === 'WH' ? 'read-only' : ''}
                            />
                        </div>
                        <div className="form-group" style={{gridColumn: 'span 2'}}>
                            <label>비고</label>
                            <input 
                                name="remark" 
                                value={infoEdit.remark} 
                                onChange={handleInfoChange}
                                readOnly={viewMode === 'WH'}
                                className={viewMode === 'WH' ? 'read-only' : ''}
                            />
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* 하단 그리드 (재고 수량 - 수정 불가) */}
                    <div className="sub-title">
                        {viewMode === 'ITEM' ? "🏠 창고별 재고 현황" : "📦 보유 품목 현황"}
                    </div>
                    <div className="table-wrapper stock-grid-wrapper">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>{viewMode === 'ITEM' ? "창고" : "품목"}</th>
                                    <th>재고수량</th>
                                    <th>예약수량</th>
                                    <th>가용수량</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockList.length === 0 ? (
                                    <tr><td colSpan="4" className="no-data">데이터가 없습니다.</td></tr>
                                ) : (
                                    stockList.map((row, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                {viewMode === 'ITEM' 
                                                    ? `${whMap.get(row.whCd) || row.whCd}` 
                                                    : `${itemMap.get(row.itemCd) || row.itemCd}`
                                                }
                                            </td>
                                            {/* 수량 수정 불가 (read-only 텍스트) */}
                                            <td style={{textAlign: 'right', fontWeight: 'bold'}}>
                                                {row.stockQty}
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                {row.allocQty}
                                            </td>
                                            <td style={{textAlign: 'right', color: '#0078d4'}}>
                                                {row.stockQty - row.allocQty}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* === [우측] 입출고 이력 === */}
        <div className="layout-panel panel-right">
            <div className="panel-title">
                📊 입출고 이력 
            </div>
            <div className="table-wrapper">
                <table className="excel-table">
                    <thead>
                        <tr>
                            <th style={{width:'120px'}}>날짜</th>
                            <th style={{width:'50px'}}>구분</th>
                            <th>수량</th>
                            <th>{viewMode==='ITEM' ? '창고' : '품목'}</th>
                            <th>거래처</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!selectedTarget ? (
                            <tr><td colSpan="5" className="no-data">-</td></tr>
                        ) : historyList.length === 0 ? (
                            <tr><td colSpan="5" className="no-data">이력 없음</td></tr>
                        ) : (
                            historyList.map((h, i) => (
                                <tr key={i}>
                                    <td style={{fontSize:'11px'}}>{h.ioDt}</td>
                                    <td style={{textAlign:'center'}}>
                                        <span className={`io-badge ${h.ioType}`}>
                                            {h.ioType}
                                        </span>
                                    </td>
                                    <td style={{textAlign:'right', fontWeight:'bold'}}>
                                        <span style={{color: h.qty > 0 ? '#0078d4' : '#d13438'}}>
                                            {h.qty > 0 ? `+${h.qty}` : h.qty}
                                        </span>
                                    </td>
                                    <td style={{fontSize:'11px'}}>
                                        {viewMode === 'ITEM' ? h.whCd : (itemMap.get(h.itemCd) || h.itemCd)}
                                    </td>
                                    <td style={{fontSize:'11px', color:'#666'}}>
                                        {h.custNm || h.custCd || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}