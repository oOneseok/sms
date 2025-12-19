import React, { useEffect, useState } from "react";
import "../css/pages/WarehousePage.css";

/** 응답 키가 대문자/스네이크/카멜 어떤 형태든 대응 */
const normalizeWh = (raw = {}) => ({
  whCd: raw.whCd ?? raw.WH_CD ?? raw.wh_cd ?? "",
  whNm: raw.whNm ?? raw.WH_NM ?? raw.wh_nm ?? "",
  // 백엔드 엔티티/DTO에 remark/whType3가 없을 수 있어서 안전하게 처리
  remark: raw.remark ?? raw.REMARK ?? "",
  whType1: (raw.whType1 ?? raw.WH_TYPE1 ?? raw.wh_type1 ?? "N") === "Y",
  whType2: (raw.whType2 ?? raw.WH_TYPE2 ?? raw.wh_type2 ?? "N") === "Y",
  whType3: (raw.whType3 ?? raw.WH_TYPE3 ?? raw.wh_type3 ?? "N") === "Y",
  useFlag: (raw.useFlag ?? raw.USE_FLAG ?? raw.use_flag ?? "Y") === "Y",
});

const emptyForm = () =>
  normalizeWh({
    whCd: "",
    whNm: "",
    remark: "",
    whType1: "N",
    whType2: "N",
    whType3: "N",
    useFlag: "Y",
  });

const typeLabel = (w) => {
  const arr = [];
  if (w.whType1) arr.push("자재");
  if (w.whType2) arr.push("제품");
  if (w.whType3) arr.push("반품");
  return arr.length ? arr.join("/") : "-";
};

export default function 창고관리() {
  // 목록/검색
  const [list, setList] = useState([]);
  const [searchText, setSearchText] = useState("");

  // 선택/폼
  const [selectedWhCd, setSelectedWhCd] = useState(null);
  const [form, setForm] = useState(emptyForm());

  // 모드: "LIST"(폼 숨김) / "FORM"(등록/수정 화면)
  const [mode, setMode] = useState("LIST");

  /** ✅ 백엔드 컨트롤러 스펙에 맞춘 기본 URL */
  const BASE_URL = "http://localhost:8080/api/whs";

  /** 목록 조회 (검색=keyword) */
  const fetchList = async () => {
    try {
      const url = searchText
        ? `${BASE_URL}?keyword=${encodeURIComponent(searchText)}`
        : BASE_URL;

      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("LIST FAIL:", res.status, txt);
        alert(`조회 실패 (status=${res.status})\n${txt}`);
        setList([]);
        return;
      }

      // 백엔드는 Page로 내려줌 → content 사용
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data?.content ?? [];
      setList(rows.map(normalizeWh));
    } catch (e) {
      console.error(e);
      alert("조회 중 네트워크/서버 연결 오류");
      setList([]);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  /** 행 클릭 → 상세 조회 */
  const handleRowClick = async (row) => {
    setSelectedWhCd(row.whCd);
    setMode("FORM");

    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(row.whCd)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("DETAIL FAIL:", res.status, txt);
        alert(`상세 조회 실패 (status=${res.status})\n${txt}`);
        setForm(normalizeWh(row)); // fallback
        return;
      }
      const data = await res.json();
      setForm(normalizeWh(data));
    } catch (e) {
      console.error(e);
      alert("상세 조회 중 네트워크/서버 연결 오류");
      setForm(normalizeWh(row));
    }
  };

  /** 신규 */
  const handleNew = () => {
    setSelectedWhCd(null);
    setForm(emptyForm());
    setMode("FORM");
  };

  /** 폼 변경 */
  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  /** ✅ 저장(신규: POST /api/whs, 수정: PUT /api/whs/{whCd}) */
  const handleSave = async () => {
    if (!form.whCd) return alert("창고코드는 필수입니다.");
    if (!form.whNm) return alert("창고명은 필수입니다.");

    // ✅ 현재 백엔드 엔티티에 존재하는 컬럼만 보냄(중요!)
    // WhMst 엔티티: whCd, whNm, whType1, whType2, useFlag
    const payload = {
      whCd: form.whCd,
      whNm: form.whNm,
      whType1: form.whType1 ? "Y" : "N",
      whType2: form.whType2 ? "Y" : "N",
      useFlag: form.useFlag ? "Y" : "N",
      // remark, whType3는 백엔드에 없어서 전송하지 않음(전송하면 DTO 검증/바인딩에서 실패 가능)
    };

    const isUpdate = !!selectedWhCd; // 선택돼 있으면 수정으로 간주
    const url = isUpdate
      ? `${BASE_URL}/${encodeURIComponent(form.whCd)}`
      : BASE_URL;
    const method = isUpdate ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("SAVE FAIL:", res.status, txt);
        alert(`저장 실패 (status=${res.status})\n${txt}`);
        return;
      }

      alert("저장되었습니다.");
      await fetchList();
      setSelectedWhCd(form.whCd);
      setMode("LIST");
    } catch (e) {
      console.error(e);
      alert("저장 중 네트워크/서버 연결 오류");
    }
  };

  /** 삭제 (DELETE /api/whs/{whCd}) */
  const handleDelete = async () => {
    const key = selectedWhCd ?? form.whCd;
    if (!key) return alert("삭제할 창고를 선택하세요.");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("DELETE FAIL:", res.status, txt);
        alert(`삭제 실패 (status=${res.status})\n${txt}`);
        return;
      }

      alert("삭제되었습니다.");
      setSelectedWhCd(null);
      setForm(emptyForm());
      await fetchList();
      setMode("LIST");
    } catch (e) {
      console.error(e);
      alert("삭제 중 네트워크/서버 연결 오류");
    }
  };

  /** 취소(폼 닫고 목록으로) */
  const handleCancel = () => {
    setMode("LIST");
  };

  return (
    <div className="wh-page">
      {/* 헤더 버튼 */}
      <div className="page-header">
        <h2 className="page-title">창고 관리</h2>
        <div className="button-group">
          <button className="btn new" onClick={handleNew}>
            신규
          </button>
          <button className="btn save" onClick={handleSave}>
            저장
          </button>
          <button className="btn delete" onClick={handleDelete}>
            삭제
          </button>
          {mode === "FORM" && (
            <button className="btn" onClick={handleCancel}>
              취소
            </button>
          )}
        </div>
      </div>

      {/* 검색 */}
      <div className="search-bar">
        <input
          className="search-input"
          placeholder="창고코드/명"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchList()}
        />
        <button className="btn" onClick={fetchList}>
          검색
        </button>
      </div>

      {/* 목록 + 폼 */}
      <div className="content-split">
        {/* 리스트 영역 */}
        <div className="list-section">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>No</th>
                  <th style={{ width: 120 }}>창고코드</th>
                  <th>창고명</th>
                  <th style={{ width: 120 }}>창고구분</th>
                  <th>설명</th>
                  <th style={{ width: 90 }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, idx) => (
                  <tr
                    key={row.whCd || idx}
                    className={selectedWhCd === row.whCd ? "selected" : ""}
                    onClick={() => handleRowClick(row)}
                  >
                    <td>{idx + 1}</td>
                    <td>{row.whCd}</td>
                    <td>{row.whNm}</td>
                    <td>{typeLabel(row)}</td>
                    <td>{row.remark /* 백엔드에 없으면 빈 값 */}</td>
                    <td>{row.useFlag ? "Y" : "N"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 폼 영역 */}
        {mode === "FORM" && (
          <div className="detail-section">
            <div className="section-header">창고관리 - 등록화면</div>

            <div className="form-card">
              <div className="form-row">
                <label>창고코드</label>
                <input
                  value={form.whCd}
                  onChange={(e) => set("whCd", e.target.value)}
                  maxLength={10}
                  disabled={!!selectedWhCd} // 수정일 때 코드 잠금
                />
              </div>

              <div className="form-row">
                <label>창고명</label>
                <input
                  value={form.whNm}
                  onChange={(e) => set("whNm", e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* ⚠️ 백엔드에 remark 컬럼 없어서 화면에만 표시(저장 X) */}
              <div className="form-row">
                <label>설명</label>
                <textarea
                  value={form.remark}
                  onChange={(e) => set("remark", e.target.value)}
                  maxLength={100}
                  rows={3}
                  
                />
              </div>

              <div className="form-row">
                <label>창고구분</label>
                <div className="check-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.whType1}
                      onChange={(e) => set("whType1", e.target.checked)}
                    />
                    자재창고
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={form.whType2}
                      onChange={(e) => set("whType2", e.target.checked)}
                    />
                    제품창고
                  </label>

                  {/* ⚠️ 백엔드에 WH_TYPE3 없으면 화면에만 체크(저장 X) */}
                  <label>
                    <input
                      type="checkbox"
                      checked={form.whType3}
                      onChange={(e) => set("whType3", e.target.checked)}
                    />
                    반품창고
                  </label>
                </div>
              </div>

              <div className="form-row">
                <label>사용여부</label>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={form.useFlag}
                    onChange={(e) => set("useFlag", e.target.checked)}
                  />
                  사용(Y)
                </label>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
