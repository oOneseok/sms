import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/pages/PurchasePage.css"; // ✅ 발주관리 CSS 그대로 사용 (필수)

const API = "http://localhost:8080";

const STATUS = [
  { v: "o1", t: "등록" },
  { v: "o2", t: "확정" },
  { v: "o3", t: "출고완료" },
  { v: "o9", t: "취소" },
];

const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function 주문관리() {
  const navigate = useNavigate();

  // --- 상태 관리 ---
  const [list, setList] = useState([]);
  const [details, setDetails] = useState([]);
  const [selectedCd, setSelectedCd] = useState(null);
  const [q, setQ] = useState("");

  const [custs, setCusts] = useState([]);
  const [items, setItems] = useState([]);

  // Master Form
  const [mst, setMst] = useState({
    orderCd: "",
    orderDt: "",
    custCd: "",
    custEmp: "",
    remark: "",
  });

  // Detail Form
  const emptyRow = () => ({ 
    _uiId: generateId(), 
    itemCd: "", 
    orderQty: "", 
    status: "o1", 
    remark: "" 
  });
  const [editRows, setEditRows] = useState([emptyRow()]);

  // --- 초기 로딩 ---
  useEffect(() => {
    (async () => {
      try {
        // 고객사 (판매처: 02)
        const r1 = await fetch(`${API}/api/cust?bizFlag=02`).then((r) => r.json());
        setCusts(Array.isArray(r1) ? r1 : []);
      } catch {
        setCusts([]);
      }

      try {
        // 품목 (제품: 02)
        const r2 = await fetch(`${API}/api/item`).then((r) => r.json());
        const allItems = Array.isArray(r2) ? r2 : [];
        const productsOnly = allItems.filter(item => item.itemFlag === '02');
        setItems(productsOnly);
      } catch {
        setItems([]);
      }
    })();
    fetchList();
  }, []);

  // --- 목록 조회 ---
  const fetchList = async () => {
    try {
      const data = await fetch(`${API}/api/order`).then((r) => r.json());
      const arr = Array.isArray(data) ? data : [];
      const qq = q.trim().toLowerCase();

      setList(
        qq
          ? arr.filter(
              (p) =>
                (p.orderCd ?? "").toLowerCase().includes(qq) ||
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
  const selectOne = async (orderCd) => {
    try {
      setSelectedCd(orderCd);

      const m = await fetch(`${API}/api/order/${orderCd}`).then((r) => r.json());
      const d = await fetch(`${API}/api/order/${orderCd}/details`).then((r) => r.json());
      const detArr = Array.isArray(d) ? d : [];

      setDetails(detArr);

      setMst({
        orderCd: m.orderCd ?? "",
        orderDt: m.orderDt ?? "",
        custCd: m.custCd ?? "",
        custEmp: m.custEmp ?? "",
        remark: m.remark ?? "",
      });

      setEditRows(
        detArr.length
          ? detArr.map((x) => ({
              _uiId: generateId(),
              _seqNo: x.id?.seqNo,
              itemCd: x.itemCd || (x.id ? x.id.itemCd : "") || "",
              orderQty: x.orderQty ?? "",
              status: x.status ?? "o1",
              remark: x.remark ?? "",
            }))
          : [emptyRow()]
      );
    } catch {
      alert("주문 조회 실패");
    }
  };

  // --- Helpers ---
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
    setMst({ orderCd: "", orderDt: "", custCd: "", custEmp: "", remark: "" });
    setEditRows([emptyRow()]);
  };

  const addRow = () => setEditRows((p) => [...p, emptyRow()]);
  const delRow = (idx) => setEditRows((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));
  const setRow = (idx, k, v) => setEditRows((p) => p.map((r, i) => (i === idx ? { ...r, [k]: v } : r)));

  // --- 저장 ---
  const save = async () => {
    try {
      if (!mst.orderDt) throw new Error("주문일자는 필수입니다.");
      if (!mst.custCd) throw new Error("거래처는 필수입니다.");
      if (!editRows.length) throw new Error("상세 내역이 최소 1건 이상 필요합니다.");

      const payload = {
        orderCd: mst.orderCd?.trim() || null,
        orderDt: mst.orderDt,
        custCd: mst.custCd,
        custEmp: mst.custEmp?.trim() || null,
        remark: mst.remark?.trim() || null,
        details: editRows.map((r) => ({
          itemCd: r.itemCd,
          orderQty: Number(r.orderQty),
          status: r.status,
          remark: r.remark?.trim() || null,
        })),
      };

      const res = await fetch(`${API}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      alert(`저장되었습니다. (주문번호: ${data.orderCd})`);

      await fetchList();
      if (data.orderCd) await selectOne(data.orderCd);
    } catch (e) {
      alert(`저장 실패\n${e?.message ?? ""}`);
    }
  };


  // --- 출고 화면 이동 ---
  const handleGoToOutbound = (detailRow) => {
    if (!mst.orderCd) return;
    if (detailRow.status === 'o2' || detailRow.status === 'o3') {
        if(window.confirm("출고 관리 화면으로 이동하시겠습니까?")) {
            navigate(`/자재관리/출고관리?orderCd=${mst.orderCd}&status=${detailRow.status}`);
        }
    } else {
        alert("확정(o2) 또는 출고완료(o3) 상태일 때만 이동할 수 있습니다.");
    }
  };

  return (
    <div className="business-page">
      <div className="page-header">
        <h2 className="page-title">주문 관리</h2>
        <div className="button-group">
          <button className="btn new" onClick={reset}>신규</button>
          <button className="btn save" onClick={save}>저장</button>
        </div>
      </div>

      <div className="search-bar purchase-toolbar">
        <input
          className="search-input"
          placeholder="주문번호/거래처/담당자 검색"
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
                  {/* ✅ 발주관리와 똑같이 인라인 width 제거하여 브라우저 자동 계산에 맡김 */}
                  <th>No</th><th>주문번호</th><th>일자</th><th>거래처</th><th>담당자</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr
                    key={p.orderCd}
                    onClick={() => selectOne(p.orderCd)}
                    className={selectedCd === p.orderCd ? "selected" : ""}
                  >
                    <td>{i + 1}</td>
                    <td className="mono">{p.orderCd}</td>
                    <td>{p.orderDt}</td>
                    <td>{custName(p.custCd)}</td>
                    <td>{p.custEmp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="purchase-subpanel">
            <div className="section-header">
              주문 상세 {selectedCd ? <span className="mono">({selectedCd})</span> : ""}
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {/* ✅ 발주관리와 똑같이 인라인 width 제거 */}
                    <th>SEQ</th><th>품목</th><th>수량</th><th>상태</th><th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d) => (
                    <tr 
                      key={`${d?.id?.orderCd}-${d?.id?.seqNo}`}
                      onDoubleClick={() => handleGoToOutbound(d)}
                      style={{ cursor: "pointer" }}
                      title="더블클릭 시 출고관리 이동"
                    >
                      <td className="mono">{d?.id?.seqNo}</td>
                      <td>{itemName(d.itemCd)}</td>
                      <td>{d.orderQty}</td>
                      <td>
                        {/* ✅ PurchasePage.css의 pill 스타일 적용을 위해 o->p 치환 */}
                        <span className={`pill ${d.status.replace('o', 'p')}`}>
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
            <label className="form-label">주문번호</label>
            <input className="form-input mono" value={mst.orderCd} readOnly style={{background:"#f5f5f5"}} />
            <label className="form-label">주문일자</label>
            <input type="date" className="form-input" value={mst.orderDt} onChange={(e) => setMst({...mst, orderDt:e.target.value})} />
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
            <span>주문 상세 (편집) <span style={{fontSize:'0.8em', color:'#666'}}>* 더블클릭 시 출고화면 이동</span></span>
            <button className="btn" onClick={addRow}>+ 행추가</button>
          </div>

          <div className="purchase-detail-editor">
            {editRows.map((r, idx) => {
              const isNew = !r._seqNo;
              const isLocked = r.status === 'o3';

              return (
                <div 
                  className={`detail-row ${isLocked ? 'locked-row' : ''}`}
                  key={r._uiId}
                  onDoubleClick={() => handleGoToOutbound(r)}
                  style={{ 
                    border: isLocked ? "1px solid #c3e6cb" : "1px solid #ddd", 
                    backgroundColor: isLocked ? "#f4fff4" : "#fff",
                    cursor: "pointer"
                  }}
                >
                  <div className="detail-row-top">
                    <div className="detail-row-title">
                      상세 {idx + 1} 
                      {isLocked && <span style={{color:'green', marginLeft:'5px'}}>✔ 출고완료</span>}
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
                    <input type="number" className="form-input" value={r.orderQty} onChange={(e)=>setRow(idx,"orderQty",e.target.value)} disabled={isLocked} />
                    
                    <label className="form-label">상태</label>
                    <select 
                      className="form-input" 
                      value={r.status} 
                      onChange={(e)=>setRow(idx,"status",e.target.value)} 
                      disabled={isLocked || isNew} 
                      style={{backgroundColor: (isLocked || isNew) ? '#f5f5f5' : 'white'}}
                    >
                      {STATUS.map(s => {
                          if (s.v === 'o3' && r.status !== 'o3') return null;
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