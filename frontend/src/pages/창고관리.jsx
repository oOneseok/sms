import React, { useState, useEffect } from 'react';
import '../css/pages/창고관리.css';

export default function 창고관리() {
  const [whList, setWhList] = useState([]);
  const [searchText, setSearchText] = useState('');
  
  // 변경됨: whType1,2,3 -> whType (단일 값)
  const [formData, setFormData] = useState({
    whCd: '', whNm: '', remark: '', whType: '01', useFlag: 'Y'
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 데이터 정규화
  const normalizeWh = (raw = {}) => ({
    whCd: raw.whCd || "", whNm: raw.whNm || "", remark: raw.remark || "",
    whType: raw.whType || "01",
    useFlag: (raw.useFlag === "Y" || raw.useFlag === true) ? 'Y' : 'N',
  });

  const getTypeLabel = (type) => {
    switch(type) {
        case '01': return '자재';
        case '02': return '제품';
        case '03': return '혼합';
        case '04': return '반품';
        default: return '-';
    }
  };

  const fetchList = async (keyword = '') => {
    try {
      const url = keyword 
        ? `http://localhost:8080/api/whs?keyword=${encodeURIComponent(keyword)}`
        : `http://localhost:8080/api/whs`;
      const res = await fetch(url);
      if(res.ok) {
        const data = await res.json();
        setWhList((Array.isArray(data) ? data : []).map(normalizeWh));
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchList(); }, []);

  const handleNew = () => {
    setFormData({ whCd: '', whNm: '', remark: '', whType: '01', useFlag: 'Y' });
    setIsEditMode(false);
    setIsDetailOpen(true);
  };

  const handleRowClick = (item) => {
    setFormData(normalizeWh(item));
    setIsEditMode(true);
    setIsDetailOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'Y' : 'N') : value
    }));
  };

  const handleSave = async () => {
    if (!formData.whCd || !formData.whNm) return alert("필수 입력 누락");
    if (!isEditMode && whList.some(item => item.whCd === formData.whCd)) return alert("중복 코드");

    try {
      const res = await fetch('http://localhost:8080/api/whs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) { alert("저장됨"); fetchList(searchText); setIsEditMode(true); }
    } catch (e) { alert("오류"); }
  };

  const handleDelete = async () => {
    if (!isEditMode || !window.confirm("삭제?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/whs/${formData.whCd}`, { method: 'DELETE' });
      if (res.ok) { alert("삭제됨"); setIsDetailOpen(false); fetchList(searchText); }
    } catch (e) {}
  };

  return (
    <div className="customer-management-container">
      <div className="customer-management-wrapper">
        <div className="customer-header">
          <h2 className="customer-title">창고 관리</h2>
          <div className="header-buttons"><button className="excel-btn excel-btn-new" onClick={handleNew}>신규</button></div>
        </div>
        <div className="customer-search">
          <label className="search-label">검색</label>
          <input className="search-input" value={searchText} onChange={e=>setSearchText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchList(searchText)} />
        </div>
        <div className={`customer-content-layout ${isDetailOpen ? 'split' : 'full'}`}>
          <div className="customer-list-panel">
            <div className="list-table-wrapper">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{width:'50px'}}>No</th>
                    <th className="excel-th" style={{width:'100px'}}>창고코드</th>
                    <th className="excel-th">창고명</th>
                    <th className="excel-th">유형</th>
                    <th className="excel-th" style={{width:'60px'}}>사용</th>
                  </tr>
                </thead>
                <tbody>
                  {whList.map((row, idx) => (
                    <tr key={row.whCd} className={`excel-tr ${formData.whCd === row.whCd ? 'selected' : ''}`} onClick={() => handleRowClick(row)}>
                      <td className="excel-td">{idx + 1}</td>
                      <td className="excel-td">{row.whCd}</td>
                      <td className="excel-td" style={{textAlign:'left'}}>{row.whNm}</td>
                      <td className="excel-td">{getTypeLabel(row.whType)}</td>
                      <td className="excel-td">{row.useFlag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {isDetailOpen && (
            <div className="customer-detail-panel">
              <div className="detail-header"><h3 className="detail-title">상세 정보</h3><button className="detail-close-btn" onClick={()=>setIsDetailOpen(false)}>✕</button></div>
              <div className="detail-content">
                <div className="detail-row">
                    <div className="detail-field"><label>창고코드</label><input className="detail-input" name="whCd" value={formData.whCd} onChange={handleChange} readOnly={isEditMode} /></div>
                    <div className="detail-field"><label>창고명</label><input className="detail-input" name="whNm" value={formData.whNm} onChange={handleChange} /></div>
                </div>
                <div className="detail-row">
                    <div className="detail-field">
                        <label>창고유형</label>
                        <select className="detail-input" name="whType" value={formData.whType} onChange={handleChange}>
                            <option value="01">자재</option>
                            <option value="02">제품</option>
                            <option value="03">혼합</option>
                            <option value="04">반품</option>
                        </select>
                    </div>
                    <div className="detail-field">
                        <label>사용여부</label>
                        <label style={{fontSize:'11px'}}><input type="checkbox" name="useFlag" checked={formData.useFlag==='Y'} onChange={handleChange}/> 사용함</label>
                    </div>
                </div>
                <div className="detail-row detail-row-full">
                    <div className="detail-field"><label>비고</label><input className="detail-input" name="remark" value={formData.remark} onChange={handleChange} /></div>
                </div>
              </div>
              <div className="detail-footer">
                <button className="excel-btn excel-btn-save" onClick={handleSave}>저장</button>
                {isEditMode && <button className="excel-btn excel-btn-delete" onClick={handleDelete}>삭제</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}