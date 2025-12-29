import React, { useEffect, useMemo, useState } from "react";
import "../css/pages/PurchasePage.css";

const API = "http://localhost:8080";
const STATUS = [
  { v: "p1", t: "등록" },
  { v: "p9", t: "취소" },
  { v: "p2", t: "확정" },
];

// ✅ 고유 ID 생성 유틸 (행 삭제/추가 시 키 밀림 방지)
const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function 발주관리() {
  // left
  const [list, setList] = useState([]);
  const [details, setDetails] = useState([]);
  const [selectedCd, setSelectedCd] = useState(null);
  const [q, setQ] = useState("");

  // options
  const [custs, setCusts] = useState([]);
  const [items, setItems] = useState([]);

  // right form
  const [mst, setMst] = useState({
    purchaseCd: "",
    purchaseDt: "",
    custCd: "",
    custEmp: "",
    remark: "",
  });

  // ✅ [수정 1] 초기 행에도 고유 ID 부여
  const emptyRow = () => ({ 
    _uiId: generateId(), // 프론트 전용 ID
    itemCd: "", 
    purchaseQty: "", 
    status: "p1", 
    remark: "" 
  });
  
  const [editRows, setEditRows] = useState([emptyRow()]);

  // ---- load options
  useEffect(() => {
    (async () => {
      try {
        const r1 = await fetch(`${API}/api/cust?bizFlag=01`).then((r) => r.json());
        setCusts(Array.isArray(r1) ? r1 : []);
      } catch {
        setCusts([]);
      }

      try {
        const r2 = await fetch(`${API}/api/item?itemFlag=01`).then((r) => r.json());
        setItems(Array.isArray(r2) ? r2 : []);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  // ---- load list
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
      alert("발주 목록 조회 실패");
    }
  };

  useEffect(() => {
    fetchList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- select one
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

      // ✅ [수정 2] 기존 데이터 로드 시에도 고유 ID 부여하여 매핑
      setEditRows(
        detArr.length
          ? detArr.map((x) => ({
              _uiId: generateId(), // Key로 사용할 ID 생성
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

  // ---- helpers
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
  
  // ✅ [수정 3] 인덱스 대신 고유 ID(_uiId)를 사용해 삭제/수정하지 않아도 되지만,
  // 편의상 map index를 사용하되 렌더링 key는 _uiId를 사용하므로 안전함.
  const delRow = (idx) => setEditRows((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));
  const setRow = (idx, k, v) => setEditRows((p) => p.map((r, i) => (i === idx ? { ...r, [k]: v } : r)));

  const buildPayload = () => {
    if (!mst.purchaseDt) throw new Error("발주일자는 필수");
    if (!mst.custCd) throw new Error("거래처는 필수");
    if (!editRows.length) throw new Error("상세 1건 이상 필요");

    editRows.forEach((r, i) => {
      if (!r.itemCd) throw new Error(`상세${i + 1}: 품목 선택`);
      const qty = Number(r.purchaseQty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`상세${i + 1}: 수량 1 이상`);
      if (!["p1", "p2", "p9"].includes(r.status)) throw new Error(`상세${i + 1}: 상태값 오류`);
    });

    return {
      // 신규일 때는 null을 보내서 백엔드가 생성하게 함
      purchaseCd: mst.purchaseCd?.trim() || null, 
      purchaseDt: mst.purchaseDt,
      custCd: mst.custCd,
      custEmp: mst.custEmp?.trim() || null,
      remark: mst.remark?.trim() || null,
      
      // ✅ [수정 4] 서버 전송 시 프론트 전용 _uiId 제거
      details: editRows.map((r) => ({
        itemCd: r.itemCd,
        purchaseQty: Number(r.purchaseQty),
        status: r.status,
        remark: r.remark?.trim() || null,
      })),
    };
  };

  const save = async () => {
    try {
      const payload = buildPayload();
      
      // 백엔드 로직상 ID 유무로 신규/수정을 판단하므로 POST 하나로 통일 가능
      // (혹은 RESTful 원칙에 따라 신규 POST, 수정 PUT으로 분기해도 됨)
      const res = await fetch(`${API}/api/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      alert(`저장 완료: ${data.purchaseCd}`); // 백엔드에서 purchaseCd 리턴한다고 가정 (String 리턴 시 json() 주의)

      await fetchList();
      // 저장 후 해당 건 재조회 (신규일 경우 생성된 번호로 조회)
      const newCd = typeof data === 'string' ? data : data.purchaseCd;
      if (newCd) await selectOne(newCd);
      
    } catch (e) {
      // JSON 파싱 에러 방지 등을 위해 텍스트 처리 등 보완 가능
      alert(`저장 실패\n${e?.message ?? "오류가 발생했습니다."}`);
    }
  };

  // 수정 버튼 로직 (저장과 동일하지만 선택 체크)
  const update = async () => {
    if (!selectedCd) return alert("수정은 왼쪽에서 선택 후 가능합니다. (신규 저장은 '저장' 버튼)");
    return save();
  };

  return (
    <div className="business-page">
      <div className="page-header">
        <h2 className="page-title">발주 관리</h2>
        <div className="button-group">
          <button className="btn new" onClick={reset}>신규</button>
          <button className="btn save" onClick={save}>저장</button>
          {/* 상황에 따라 수정 버튼 숨기거나 저장과 통합 가능 */}
        </div>
      </div>

      <div className="search-bar purchase-toolbar">
        <input
          className="search-input"
          placeholder="발주번호/거래처/담당자 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchList()}
        />
        <button className="btn" style={{ background: "#eee", color: "#333" }} onClick={fetchList}>
          조회
        </button>
      </div>

      <div className="content-split">
        {/* LEFT LIST */}
        <div className="list-section">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>발주번호</th>
                  <th style={{ width: 110 }}>일자</th>
                  <th style={{ width: 160 }}>거래처</th>
                  <th style={{ width: 110 }}>담당자</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr
                    key={p.purchaseCd}
                    onClick={() => selectOne(p.purchaseCd)}
                    className={selectedCd === p.purchaseCd ? "selected" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{i + 1}</td>
                    <td className="mono">{p.purchaseCd}</td>
                    <td>{p.purchaseDt}</td>
                    <td>{custName(p.custCd)}</td>
                    <td>{p.custEmp ?? ""}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
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
                    <th style={{ width: 60 }}>SEQ</th>
                    <th>품목</th>
                    <th style={{ width: 110 }}>수량</th>
                    <th style={{ width: 100 }}>상태</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedCd ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                        좌측에서 발주를 선택하세요.
                      </td>
                    </tr>
                  ) : details.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                        상세 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    details.map((d) => (
                      // 백엔드 @EmbeddedId 구조 반영 (d.id.seqNo)
                      <tr key={`${d?.id?.purchaseCd}-${d?.id?.seqNo}`}>
                        <td className="mono">{d?.id?.seqNo}</td>
                        <td>{itemName(d.itemCd)}</td>
                        <td>{d.purchaseQty}</td>
                        <td>
                          <span className={`pill ${d.status}`}>
                            {STATUS.find((x) => x.v === d.status)?.t ?? d.status}
                          </span>
                        </td>
                        <td>{d.remark ?? ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="detail-section">
          <div className="form-grid">
            <label className="form-label">발주번호</label>
            <input
              className="form-input mono"
              value={mst.purchaseCd}
              readOnly 
              placeholder="자동 생성"
              style={{ backgroundColor: "#f5f5f5" }}
            />

            <label className="form-label">발주일자 *</label>
            <input
              className="form-input"
              type="date"
              value={mst.purchaseDt}
              onChange={(e) => setMst({ ...mst, purchaseDt: e.target.value })}
            />

            <label className="form-label">거래처 *</label>
            <select
              className="form-input"
              value={mst.custCd}
              onChange={(e) => setMst({ ...mst, custCd: e.target.value })}
            >
              <option value="">-- 선택 --</option>
              {custs.map((c) => (
                <option key={c.custCd} value={c.custCd}>
                  {c.custCd} - {c.custNm}
                </option>
              ))}
            </select>

            <label className="form-label">담당자</label>
            <input
              className="form-input"
              value={mst.custEmp}
              onChange={(e) => setMst({ ...mst, custEmp: e.target.value })}
            />

            <label className="form-label">비고</label>
            <input
              className="form-input"
              value={mst.remark}
              onChange={(e) => setMst({ ...mst, remark: e.target.value })}
            />
          </div>

          <div className="section-header purchase-detail-header">
            <span>발주 상세 (편집)</span>
            <button className="btn" style={{ background: "#eee", color: "#333" }} onClick={addRow}>
              + 행추가
            </button>
          </div>

          <div className="purchase-detail-editor">
            {editRows.map((r, idx) => (
              // ✅ [수정 5] key에 index 대신 고유 ID(_uiId) 사용 (필수)
              <div className="detail-row" key={r._uiId}>
                <div className="detail-row-top">
                  <div className="detail-row-title">상세 {idx + 1}</div>
                  <button
                    className="btn delete"
                    style={{ padding: "4px 10px" }}
                    onClick={() => delRow(idx)}
                    disabled={editRows.length === 1}
                  >
                    삭제
                  </button>
                </div>

                <div className="form-grid purchase-detail-grid">
                  <label className="form-label">품목 *</label>
                  <select
                    className="form-input"
                    value={r.itemCd}
                    onChange={(e) => setRow(idx, "itemCd", e.target.value)}
                  >
                    <option value="">-- 선택 --</option>
                    {items.map((it) => (
                      <option key={it.itemCd} value={it.itemCd}>
                        {it.itemCd} - {it.itemNm}
                      </option>
                    ))}
                  </select>

                  <label className="form-label">수량 *</label>
                  <input
                    className="form-input"
                    type="number"
                    value={r.purchaseQty}
                    onChange={(e) => setRow(idx, "purchaseQty", e.target.value)}
                  />

                  <label className="form-label">상태</label>
                  <select
                    className="form-input"
                    value={r.status || "p1"}
                    onChange={(e) => setRow(idx, "status", e.target.value)}
                  >
                    {STATUS.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.t}
                      </option>
                    ))}
                  </select>

                  <label className="form-label">비고</label>
                  <input
                    className="form-input"
                    value={r.remark}
                    onChange={(e) => setRow(idx, "remark", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}