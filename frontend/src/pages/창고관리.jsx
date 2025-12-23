import React, { useState, useEffect } from 'react';
import { callApi } from '../utils/api'; // 🔥 API 함수
import '../css/pages/창고관리.css';

export default function 창고관리() {
  const [whList, setWhList] = useState([]);
  const [searchText, setSearchText] = useState('');
  
  const [formData, setFormData] = useState({
    whCd: '', whNm: '', remark: '', whType: '01', useFlag: 'Y'
  });

  const [isEditMode, setIsEditMode] = useState(false);
  // isDetailOpen 상태 제거됨 (항상 보임)

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
      
      const data = await callApi(url, 'GET');
      setWhList((Array.isArray(data) ? data : []).map(normalizeWh));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchList(); }, []);

  // === 이벤트 핸들러 ===
  const handleNew = () => {
    setFormData({ whCd: '', whNm: '', remark: '', whType: '01', useFlag: 'Y' });
    setIsEditMode(false);
  };

  const handleRowClick = (item) => {
    setFormData(normalizeWh(item));
    setIsEditMode(true);
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
      await callApi('http://localhost:8080/api/whs', 'POST', formData);
      alert("저장됨"); 
      fetchList(searchText); 
      setIsEditMode(true);
    } catch (e) { alert("오류"); }
  };

  const handleDelete = async () => {
    if (!isEditMode || !window.confirm("삭제?")) return;
    try {
      await callApi(`http://localhost:8080/api/whs/${formData.whCd}`, 'DELETE');
      alert("삭제됨"); 
      handleNew(); // 폼 초기화
      fetchList(searchText);
    } catch (e) {}
  };

  return (
    <div className="customer-management-container">
      <div className="customer-management-wrapper">
        
        {/* 1. 헤더 */}
        <div className="customer-header">
          <h2 className="customer-title">창고 관리</h2>
          <div className="header-buttons">
              <button className="excel-btn excel-btn-new" onClick={handleNew}>신규</button>
              <button className="excel-btn excel-btn-save" onClick={handleSave}>저장</button>
              <button className="excel-btn excel-btn-delete" onClick={handleDelete}>삭제</button>
          </div>
        </div>

        {/* 2. 검색 */}
        <div className="customer-search">
          <label className="search-label">검색</label>
          <input 
            className="search-input" 
            value={searchText} 
            onChange={e=>setSearchText(e.target.value)} 
            onKeyDown={e=>e.key==='Enter'&&fetchList(searchText)}
            placeholder="창고명 검색" 
          />
        </div>

        {/* 3. 메인 레이아웃 (좌:리스트, 우:상세) */}
        {/* display: flex로 좌우 배치 강제 적용 */}
        <div className="customer-content-layout" style={{display: 'flex', gap: '20px', height: 'calc(100% - 120px)'}}>
          
          {/* [좌측] 리스트 패널 */}
          <div className="customer-list-panel" style={{flex: 1, minWidth: 0}}>
            <div className="list-table-wrapper" style={{height: '100%', overflowY: 'auto'}}>
              <table className="excel-table">
                <thead style={{position:'sticky', top:0, zIndex:1}}>
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
                  {whList.length === 0 && (
                      <tr><td colSpan="5" style={{padding:'20px', textAlign:'center', color:'#999'}}>데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* [우측] 상세 정보 패널 (항상 보임) */}
          <div className="customer-detail-panel" style={{width: '400px', borderLeft: '1px solid #ddd', paddingLeft: '20px', background:'#fff'}}>
            <div className="detail-header" style={{borderBottom:'2px solid #333', paddingBottom:'10px', marginBottom:'20px'}}>
                <h3 className="detail-title" style={{margin:0}}>✨ 상세 정보</h3>
            </div>
            
            <div className="detail-content">
              <div className="detail-row">
                  <div className="detail-field">
                      <label>창고코드 <span style={{color:'red'}}>*</span></label>
                      <input className="detail-input" name="whCd" value={formData.whCd} onChange={handleChange} readOnly={isEditMode} placeholder="코드 입력" />
                  </div>
              </div>
              <div className="detail-row">
                  <div className="detail-field">
                      <label>창고명 <span style={{color:'red'}}>*</span></label>
                      <input className="detail-input" name="whNm" value={formData.whNm} onChange={handleChange} />
                  </div>
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
              </div>
              <div className="detail-row">
                  <div className="detail-field">
                      <label>사용여부</label>
                      <label style={{fontSize:'14px', display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                          <input type="checkbox" name="useFlag" checked={formData.useFlag==='Y'} onChange={handleChange} style={{transform:'scale(1.2)'}}/> 
                          사용함
                      </label>
                  </div>
              </div>
              <div className="detail-row detail-row-full">
                  <div className="detail-field">
                      <label>비고</label>
                      <textarea className="detail-input" name="remark" value={formData.remark} onChange={handleChange} rows={5} style={{resize:'none'}} />
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}   