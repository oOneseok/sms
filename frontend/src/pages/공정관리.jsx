import React, { useState, useEffect } from 'react';
import '../css/pages/ProcessPage.css'; 
import '../css/pages/BusinessPage.css'; 

export default function 공정관리() {
  const [procList, setProcList] = useState([]);
  const [searchText, setSearchText] = useState('');
  
  // 상세 정보 State
  const [formData, setFormData] = useState({
    procCd: '',
    procNm: '',
    procEmp: '',
    useFlag: 'Y',
    remark: ''
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // 1. 조회 (초기 로딩)
  useEffect(() => {
    fetchList();
  }, []);

  // 검색 함수
  const fetchList = async (keyword = '') => {
    try {
        // 검색어가 있으면 쿼리 파라미터 붙임, 없으면 전체 조회
        const url = keyword 
            ? `http://localhost:8080/api/proc?searchText=${keyword}`
            : `http://localhost:8080/api/proc`;
        
        console.log("검색 요청 URL:", url); // 디버깅용 로그

        const res = await fetch(url);
        if(res.ok) {
            const data = await res.json();
            setProcList(data);
        } else {
            console.error("데이터 불러오기 실패");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
  };

  // 2. 이벤트 핸들러

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
        fetchList(searchText);
    }
  };
  
  const handleRowClick = (item) => {
    setFormData(item);
    setIsEditMode(true);
  };

  const handleNew = () => {
    setFormData({ procCd: '', procNm: '', procEmp: '', useFlag: 'Y', remark: '' });
    setIsEditMode(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (checked ? 'Y' : 'N') : value
    }));
  };

  // 저장
  const handleSave = async () => {
    if (!formData.procCd || !formData.procNm) {
        alert("공정코드와 공정명은 필수입니다.");
        return;
    }
    try {
        const res = await fetch('http://localhost:8080/api/proc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            alert("저장되었습니다.");
            fetchList(searchText); // 저장 후 현재 검색어로 목록 갱신
            setIsEditMode(true);
        } else {
            alert("저장 실패");
        }
    } catch (err) {
        console.error(err);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
        const res = await fetch(`http://localhost:8080/api/proc/${formData.procCd}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            alert("삭제되었습니다.");
            handleNew();
            fetchList(searchText);
        }
    } catch (err) {
        console.error(err);
    }
  };

  return (
    <div className="process-page">
      
      {/* 1. 상단 헤더 */}
      <div className="page-header">
        <h2 className="page-title">공정 관리</h2>
        <div className="button-group">
            <button className="btn new" onClick={handleNew}>신규</button>
            <button className="btn save" onClick={handleSave}>저장</button>
            <button className="btn delete" onClick={handleDelete}>삭제</button>
        </div>
      </div>

      {/* 2. 검색 영역 (버튼 삭제됨) */}
      <div className="process-search-bar">
        <span className="search-title">🔍 공정코드/명</span>
        <input 
            type="text" 
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown} 
            placeholder="검색어를 입력하고 Enter를 누르세요"
        />
      </div>

      {/* 3. 메인 컨텐츠 */}
      <div className="process-content">
        
        {/* 리스트 영역 */}
        <div className="process-list-area">
            <div className="table-wrapper">
                <table className="list-table">
                    <thead className="list-table-header">
                        <tr>
                            <th style={{width:'60px'}}>No</th>
                            <th style={{width:'100px'}}>공정코드</th>
                            <th>공정명</th>
                            <th style={{width:'100px'}}>담당자</th>
                            <th style={{width:'80px'}}>사용</th>
                        </tr>
                    </thead>
                    <tbody>
                        {procList.length === 0 ? (
                            <tr><td colSpan="5" style={{padding:'50px', color:'#999'}}>데이터가 없습니다.</td></tr>
                        ) : (
                            procList.map((item, idx) => (
                                <tr 
                                    key={item.procCd} 
                                    onClick={() => handleRowClick(item)}
                                    className={formData.procCd === item.procCd ? 'active' : ''}
                                >
                                    <td>{idx + 1}</td>
                                    <td>{item.procCd}</td>
                                    <td style={{textAlign:'left', paddingLeft:'15px'}}>{item.procNm}</td>
                                    <td>{item.procEmp}</td>
                                    <td>{item.useFlag}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* 상세 정보 영역 */}
        <div className="process-detail-area">
            <div className="detail-title">✨ 상세 정보</div>

            {/* Row: 공정코드 + 사용여부 */}
            <div className="detail-form-row">
                <div className="form-label">공정코드 <span style={{color:'red'}}>*</span></div>
                <div className="form-input-group">
                    <input 
                        type="text" 
                        className="form-input"
                        name="procCd"
                        value={formData.procCd}
                        onChange={handleChange}
                        readOnly={isEditMode}
                        placeholder="예: PRC001"
                        style={{flex: 1}}
                    />
                    <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', whiteSpace:'nowrap', marginLeft:'10px'}}>
                        <input 
                            type="checkbox" 
                            name="useFlag"
                            checked={formData.useFlag === 'Y'}
                            onChange={handleChange}
                        />
                        <span>사용여부</span>
                    </label>
                </div>
            </div>

            {/* Row: 공정명 */}
            <div className="detail-form-row">
                <div className="form-label">공정명 <span style={{color:'red'}}>*</span></div>
                <div className="form-input-group">
                    <input 
                        type="text" 
                        className="form-input"
                        name="procNm"
                        value={formData.procNm}
                        onChange={handleChange}
                        placeholder="공정명을 입력하세요"
                    />
                </div>
            </div>

            {/* Row: 담당자 */}
            <div className="detail-form-row">
                <div className="form-label">담당자</div>
                <div className="form-input-group">
                    <input 
                        type="text" 
                        className="form-input"
                        name="procEmp"
                        value={formData.procEmp || ''}
                        onChange={handleChange}
                        placeholder="담당자명"
                    />
                </div>
            </div>

            {/* Row: 비고 */}
            <div className="detail-form-row" style={{alignItems:'flex-start'}}>
                <div className="form-label" style={{marginTop:'8px'}}>설명 (비고)</div>
                <div className="form-input-group">
                    <textarea 
                        className="form-textarea"
                        name="remark"
                        value={formData.remark || ''}
                        onChange={handleChange}
                        rows="8"
                        placeholder="공정에 대한 설명을 입력하세요."
                    />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}