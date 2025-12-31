import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // useLocation 추가됨
import "../css/pages/PurchasePage.css";

const API = "http://localhost:8080";

const STATUS = [
  { v: "p1", t: "등록" },
  { v: "p2", t: "발주확정" },
  { v: "p3", t: "입고완료" }, // 시스템 전용 (드롭다운에서 숨김 처리 로직 적용됨)
  { v: "p9", t: "취소" },
];

const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function PurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const returnPath = query.get("returnPath");

  // --- 상태 관리 ---
  const [list, setList] = useState([]);
  const [details, setDetails] = useState([]);
  const [selectedCd, setSelectedCd] = useState(null);
  const [q, setQ] = useState("");

  const [custs, setCusts] = useState([]);
  const [items, setItems] = useState([]);

  // Master Form
  const [mst, setMst] = useState({
    purchaseCd: "",
    purchaseDt: "",
    custCd: "",
    custEmp: "",
    remark: "",
  });

  // Detail Form
  const emptyRow = () => ({ 
    _uiId: generateId(),
    itemCd: "", 
    purchaseQty: "", 
    status: "p1", 
    remark: "" 
  });
  const [editRows, setEditRows] = useState([emptyRow()]);

  // --- 초기 로딩 ---
  useEffect(() => {
    (async () => {
      try {
        const r1 = await fetch(`${API}/api/cust?bizFlag=01`).then((r) => r.json());
        setCusts(Array.isArray(r1) ? r1 : []);
        const r2 = await fetch(`${API}/api/item?itemFlag=01`).then((r) => r.json());
        setItems(Array.isArray(r2) ? r2 : []);
      } catch {
        setCusts([]);
        setItems([]);
      }
    })();
    fetchList();
  }, []);

  // --- 목록 조회 ---
  const fetchList = async () => {
    try {
      const data = await fetch(`${API}/api/purchase`).then((r) => r.json());
      const arr = Array.isArray(data) ? data : [];
      const qq = q.trim().toLowerCase();

      setList(
        qq
          ? arr.filter(
              (p) =>
                (p.purchaseCd ?? "").toLowerCase().includes(qq) ||
                (p.custCd ?? "").toLowerCase().includes(qq) ||
                (p.custEmp ?? "").toLowerCase().includes(qq)
            )
          : arr
      );
    } catch {
      setList([]);
    }
  };

  // --- 단건 선택 ---
  const selectOne = async (purchaseCd) => {
    try {
      setSelectedCd(purchaseCd);

      const m = await fetch(`${API}/api/purchase/${purchaseCd}`).then((r) => r.json());
      const d = await fetch(`${API}/api/purchase/${purchaseCd}/details`).then((r) => r.json());

      const detArr = Array.isArray(d) ? d : [];
      setDetails(detArr);

      setMst({
        purchaseCd: m.purchaseCd ?? "",
        purchaseDt: m.purchaseDt ?? "",
        custCd: m.custCd ?? "",
        custEmp: m.custEmp ?? "",
        remark: m.remark ?? "",
      });

      setEditRows(
        detArr.length
          ? detArr.map((x) => ({
              _uiId: generateId(),
              _seqNo: x.id?.seqNo,
              itemCd: x.itemCd ?? "",
              purchaseQty: x.purchaseQty ?? "",
              status: x.status ?? "p1",
              remark: x.remark ?? "",
            }))
          : [emptyRow()]
      );
    } catch {
      alert("발주 조회 실패");
    }
  };

  const custName = useMemo(() => {
    const map = new Map(custs.map((c) => [c.custCd, c.custNm]));
    return (cd) => map.get(cd) ?? cd ?? "-";
  }, [custs]);

  const itemName = useMemo(() => {
    const map = new Map(items.map((i) => [i.itemCd, i.itemNm]));
    return (cd) => map.get(cd) ?? cd ?? "-";
  }, [items]);

  const reset = () => {
    setSelectedCd(null);
    setDetails([]);
    setMst({ purchaseCd: "", purchaseDt: "", custCd: "", custEmp: "", remark: "" });
    setEditRows([emptyRow()]);
  };

  const addRow = () => setEditRows((p) => [...p, emptyRow()]);
  const delRow = (idx) => setEditRows((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));
  const setRow = (idx, k, v) => setEditRows((p) => p.map((r, i) => (i === idx ? { ...r, [k]: v } : r)));

  // --- 저장 ---
  const save = async () => {
    try {
      if (!mst.purchaseDt || !mst.custCd || !editRows.length) throw new Error("필수값 누락");

      const payload = {
        purchaseCd: mst.purchaseCd?.trim() || null,
        purchaseDt: mst.purchaseDt,
        custCd: mst.custCd,
        custEmp: mst.custEmp?.trim() || null,
        remark: mst.remark?.trim() || null,
        details: editRows.map((r) => ({
          itemCd: r.itemCd,
          purchaseQty: Number(r.purchaseQty),
          status: r.status,
          remark: r.remark?.trim() || null,
        })),
      };

      const res = await fetch(`${API}/api/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      alert("저장되었습니다.");
      await fetchList();
      const newCd = typeof data === 'string' ? data : data.purchaseCd;
      if (newCd) await selectOne(newCd);
    } catch (e) {
      alert(e.message);
    }
  };

  // ✅ [수정 1] 실제 URL 경로 '/자재관리/입고관리' 로 연결
  const handleGoToInbound = (detailRow) => {
    if (!mst.purchaseCd) return;

    if (detailRow.status === 'p2' || detailRow.status === 'p3') {
      if(window.confirm("입고 관리 화면으로 이동하시겠습니까?")) {
          navigate(`/자재관리/입고관리?purchaseCd=${mst.purchaseCd}&status=${detailRow.status}`);
      }
    } else {
      alert("확정(p2) 또는 입고완료(p3) 상태일 때만 이동할 수 있습니다.");
    }
  };

  return (
    <div className="business-page">
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <h2 className="page-title">발주 관리</h2>
            {returnPath && (
                <button 
                    className="btn" 
                    style={{backgroundColor: '#607d8b', padding: '6px 12px', fontSize: '13px'}}
                    onClick={() => navigate(returnPath)}
                >
                    ↩ 재고관리로 돌아가기
                </button>
            )}
        </div>
        <div className="button-group">
          <button className="btn new" onClick={reset}>신규</button>
          <button className="btn save" onClick={save}>저장</button>
        </div>
      </div>

      <div className="search-bar purchase-toolbar">
        <input
          className="search-input"
          placeholder="검색..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchList()}
        />
        <button className="btn" onClick={fetchList}>조회</button>
      </div>

      <div className="content-split">
        {/* LEFT LIST */}
        <div className="list-section">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th><th>발주번호</th><th>일자</th><th>거래처</th><th>담당자</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr
                    key={p.purchaseCd}
                    onClick={() => selectOne(p.purchaseCd)}
                    className={selectedCd === p.purchaseCd ? "selected" : ""}
                  >
                    <td>{i + 1}</td>
                    <td className="mono">{p.purchaseCd}</td>
                    <td>{p.purchaseDt}</td>
                    <td>{custName(p.custCd)}</td>
                    <td>{p.custEmp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="purchase-subpanel">
            <div className="section-header">
              발주 상세 {selectedCd ? <span className="mono">({selectedCd})</span> : ""}
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SEQ</th><th>품목</th><th>수량</th><th>상태</th><th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d) => (
                    <tr 
                      key={`${d?.id?.purchaseCd}-${d?.id?.seqNo}`}
                      onDoubleClick={() => handleGoToInbound(d)}
                      style={{ cursor: "pointer" }}
                      title="더블클릭 시 입고관리 이동"
                    >
                      <td className="mono">{d?.id?.seqNo}</td>
                      <td>{itemName(d.itemCd)}</td>
                      <td>{d.purchaseQty}</td>
                      <td>
                        <span className={`pill ${d.status}`}>
                            {STATUS.find((x) => x.v === d.status)?.t ?? d.status}
                        </span>
                      </td>
                      <td>{d.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="detail-section">
          <div className="form-grid">
            <label className="form-label">발주번호</label>
            <input className="form-input mono" value={mst.purchaseCd} readOnly style={{background:"#f5f5f5"}} />
            <label className="form-label">발주일자</label>
            <input type="date" className="form-input" value={mst.purchaseDt} onChange={(e) => setMst({...mst, purchaseDt:e.target.value})} />
            <label className="form-label">거래처</label>
            <select className="form-input" value={mst.custCd} onChange={(e) => setMst({...mst, custCd:e.target.value})}>
              <option value="">선택</option>{custs.map(c=><option key={c.custCd} value={c.custCd}>{c.custNm}</option>)}
            </select>
            <label className="form-label">담당자</label>
            <input className="form-input" value={mst.custEmp} onChange={(e) => setMst({...mst, custEmp:e.target.value})} />
            <label className="form-label">비고</label>
            <input className="form-input" value={mst.remark} onChange={(e) => setMst({...mst, remark:e.target.value})} />
          </div>

          <div className="section-header purchase-detail-header">
            <span>발주 상세 (편집) <span style={{fontSize:'0.8em', color:'#666'}}>* 더블클릭 시 입고화면 이동</span></span>
            <button className="btn" onClick={addRow}>+ 행추가</button>
          </div>

          <div className="purchase-detail-editor">
            {editRows.map((r, idx) => {
              const isNew = !r._seqNo; // 신규 여부
              const isLocked = r.status === 'p3'; // 입고완료 여부

              return (
                <div 
                  className={`detail-row ${isLocked ? 'locked-row' : ''}`}
                  key={r._uiId}
                  onDoubleClick={() => handleGoToInbound(r)}
                  title="더블클릭하여 입고 관리 화면으로 이동"
                  style={{ 
                    border: isLocked ? "1px solid #c3e6cb" : "1px solid #ddd", 
                    backgroundColor: isLocked ? "#f4fff4" : "#fff",
                    cursor: "pointer"
                  }}
                >
                  <div className="detail-row-top">
                    <div className="detail-row-title">
                      상세 {idx + 1} 
                      {isLocked && <span style={{color:'green', marginLeft:'5px'}}>✔ 입고완료</span>}
                      {isNew && <span style={{color:'#1890ff', marginLeft:'5px', fontSize:'0.8em'}}>🆕 신규</span>}
                    </div>
                    <button className="btn delete" onClick={()=>delRow(idx)} disabled={editRows.length===1 || isLocked} style={{opacity: isLocked?0.3:1}}>삭제</button>
                  </div>
                  <div className="form-grid purchase-detail-grid">
                    <label className="form-label">품목</label>
                    <select className="form-input" value={r.itemCd} onChange={(e)=>setRow(idx,"itemCd",e.target.value)} disabled={isLocked}>
                      <option value="">선택</option>{items.map(it=><option key={it.itemCd} value={it.itemCd}>{it.itemNm}</option>)}
                    </select>
                    
                    <label className="form-label">수량</label>
                    <input type="number" className="form-input" value={r.purchaseQty} onChange={(e)=>setRow(idx,"purchaseQty",e.target.value)} disabled={isLocked} />
                    
                    <label className="form-label">상태</label>
                    {/* ✅ [수정 2] '입고완료(p3)' 선택 불가 (리스트에서 숨김) */}
                    <select 
                      className="form-input" 
                      value={r.status} 
                      onChange={(e)=>setRow(idx,"status",e.target.value)} 
                      disabled={isLocked || isNew} 
                      style={{backgroundColor: (isLocked || isNew) ? '#f5f5f5' : 'white'}}
                    >
                      {STATUS.map(s => {
                          // 현재 행이 이미 'p3'가 아니라면, 드롭다운 옵션에서 'p3'를 아예 렌더링하지 않음
                          if (s.v === 'p3' && r.status !== 'p3') return null;
                          return <option key={s.v} value={s.v}>{s.t}</option>;
                      })}
                    </select>
                    
                    <label className="form-label">비고</label>
                    <input className="form-input" value={r.remark} onChange={(e)=>setRow(idx,"remark",e.target.value)} disabled={isLocked} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}