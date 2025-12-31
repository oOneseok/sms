import React, { useEffect, useState } from "react";
import "../css/pages/PurchasePage.css"; // 스타일 공유

const API = "http://localhost:8080";

export default function 입출고이력() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");

  // -----------------------
  // 초기 데이터 로딩
  // -----------------------
  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      const res = await fetch(`${API}/api/inout`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
    } catch (e) {
      console.error("이력 조회 실패", e);
      setList([]);
    }
  };

  // -----------------------
  // 검색 필터링
  // -----------------------
  const filteredList = list.filter((item) => {
    const keyword = q.toLowerCase();
    return (
      (item.itemCd || "").toLowerCase().includes(keyword) ||
      (item.itemNm || "").toLowerCase().includes(keyword) ||
      (item.refCd || "").toLowerCase().includes(keyword) ||
      (item.fromWhCd || "").toLowerCase().includes(keyword) ||
      (item.toWhCd || "").toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="business-page">
      <div className="page-header">
        <h2 className="page-title">전체 입출고 이력</h2>
        <div className="button-group">
          <button className="btn" style={{backgroundColor:"#6c757d"}} onClick={fetchList}>새로고침</button>
        </div>
      </div>

      <div className="search-bar purchase-toolbar">
        <input
          className="search-input"
          placeholder="품목/창고/관련번호 검색..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" onClick={fetchList}>조회</button>
      </div>

      {/* ✅ [수정] content-split으로 감싸야 스크롤이 정상 작동합니다. */}
      <div className="content-split">
        <div className="list-section" style={{ flex: 1, minWidth: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>No</th>
                  <th style={{ width: 120 }}>날짜</th>
                  <th style={{ width: 80 }}>구분</th>
                  <th style={{ width: 150 }}>관련번호</th>
                  <th style={{ width: 100 }}>품목코드</th>
                  <th>품목명</th>
                  <th style={{ width: 80 }}>수량</th>
                  <th style={{ width: 120 }}>출발 창고 (From)</th>
                  <th style={{ width: 120 }}>도착 창고 (To)</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                      입출고 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row, idx) => (
                    <tr key={row.ioCd || idx}>
                      <td>{idx + 1}</td>
                      <td>{row.ioDt}</td>
                      <td style={{ textAlign: "center" }}>
                        {row.ioType === "IN" ? (
                          <span className="pill p2">입고 (IN)</span>
                        ) : (
                          <span className="pill p9">출고 (OUT)</span>
                        )}
                      </td>
                      <td className="mono">{row.refCd || "-"}</td>
                      <td className="mono">{row.itemCd}</td>
                      <td>{row.itemNm}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>
                        {row.qty?.toLocaleString()}
                      </td>
                      <td style={{ color: "#888" }}>{row.fromWhCd || "-"}</td>
                      <td style={{ fontWeight: row.ioType === "IN" ? "bold" : "normal" }}>
                        {row.toWhCd || "-"}
                      </td>
                      <td>{row.remark}</td>
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