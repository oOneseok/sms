import React, { useState, useEffect } from 'react';
import '../css/pages/CustPage.css';
import '../css/pages/BusinessPage.css'; // 공통 버튼 스타일 (btn new, save 등)

export default function 거래처관리() {
  // === 상태 관리 ===
  const [custList, setCustList] = useState([]);      // 리스트 데이터
  const [searchText, setSearchText] = useState('');  // 검색어
  
  // 탭 상태: '02'(고객사) 기본값
  const [activeTab, setActiveTab] = useState('02'); 

  // 폼 데이터 (Entity 필드와 일치)
  const [formData, setFormData] = useState({
    custCd: '', custNm: '', presidentNm: '', bizNo: '', bizCond: '', bizItem: '',
    bizAddr: '', bizTel: '', bizFax: '', 
    empCd: '', empNm: '', empEmail: '', empTel: '', empHp: '', // empCd 추가
    bizFlag: '02'
});

  const [isEditMode, setIsEditMode] = useState(false); // 수정 모드 여부

  // === 1. 데이터 조회 ===
  useEffect(() => {
    fetchList();
  }, [activeTab]); // 탭이 바뀔 때마다 재조회

  const fetchList = async (keyword = '') => {
    try {
      // 쿼리 파라미터: bizFlag(탭), searchText(검색어)
      const url = `http://localhost:8080/api/cust?bizFlag=${activeTab}&searchText=${keyword}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCustList(data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  // === 2. 이벤트 핸들러 ===

  // 검색 (엔터키)
  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 방지
    if (e.key === 'Enter') fetchList(searchText);
  };

  // 탭 변경
  const handleTabChange = (flag) => {
    setActiveTab(flag);
    handleNew(flag); // 탭 바꿀 때 폼 초기화 (해당 탭 플래그로)
  };

  // 리스트 클릭 (상세 조회)
  const handleRowClick = (item) => {
    setFormData(item);
    setIsEditMode(true);
  };

  // 신규 버튼
  const handleNew = (targetFlag = activeTab) => {
    setFormData({
      custCd: '',
      custNm: '',
      presidentNm: '',
      bizNo: '',
      bizCond: '',
      bizItem: '',
      bizAddr: '',
      bizTel: '',
      bizFax: '',
      empNm: '',
      empEMail: '',
      empTel: '',
      empHp: '',
      bizFlag: targetFlag // 현재 탭에 맞는 구분값 설정
    });
    setIsEditMode(false);
  };

  // 입력값 변경
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 저장 (등록/수정)
  const handleSave = async () => {
    // 필수값 체크
    if (!formData.custCd || !formData.custNm) {
      alert("거래처코드와 거래처명은 필수입니다.");
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/cust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("저장되었습니다.");
        fetchList(searchText); 
        setIsEditMode(true);
      } else {
        alert("저장 실패: 코드가 중복되었거나 서버 오류입니다.");
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
      const res = await fetch(`http://localhost:8080/api/cust/${formData.custCd}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert("삭제되었습니다.");
        handleNew(); // 폼 초기화
        fetchList(searchText);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cust-page">
      
      {/* 1. 헤더 (타이틀 + 버튼) */}
      <div className="page-header">
        <h2 className="page-title">거래처 관리</h2>
        <div className="button-group">
            <button className="btn new" onClick={() => handleNew()}>신규</button>
            <button className="btn save" onClick={handleSave}>저장</button>
            <button className="btn delete" onClick={handleDelete}>삭제</button>
        </div>
      </div>

      {/* 2. 검색바 */}
      <div className="cust-search-bar">
        <span style={{fontWeight:'bold', color:'#555'}}>🔍 통합검색</span>
        <input 
            type="text" 
            className="form-input"
            style={{width:'300px'}}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="거래처명 또는 사업자번호 입력"
        />
      </div>

      {/* 3. 메인 컨텐츠 (리스트 + 상세) */}
      <div className="cust-content">
        
        {/* [좌측] 리스트 영역 */}
        <div className="cust-list-area">
            {/* 탭 버튼 */}
            <div className="tab-header">
                <button 
                    className={`tab-btn ${activeTab === '02' ? 'active' : ''}`} 
                    onClick={() => handleTabChange('02')}
                >
                    🏢 고객사 (매출)
                </button>
                <button 
                    className={`tab-btn ${activeTab === '01' ? 'active' : ''}`} 
                    onClick={() => handleTabChange('01')}
                >
                    🛒 구매처 (매입)
                </button>
            </div>

            {/* 테이블 */}
            <div style={{flex:1, overflowY:'auto'}}>
                <table className="list-table">
                    <thead>
                        <tr>
                            <th style={{width:'50px'}}>No</th>
                            <th style={{width:'80px'}}>코드</th>
                            <th>거래처명</th>
                            <th style={{width:'100px'}}>대표자</th>
                            <th style={{width:'120px'}}>사업자번호</th>
                            <th style={{width:'100px'}}>담당자</th>
                        </tr>
                    </thead>
                    <tbody>
                        {custList.length === 0 ? (
                            <tr><td colSpan="6" style={{padding:'50px', color:'#999'}}>데이터가 없습니다.</td></tr>
                        ) : (
                            custList.map((item, idx) => (
                                <tr 
                                    key={item.custCd} 
                                    onClick={() => handleRowClick(item)}
                                    className={formData.custCd === item.custCd ? 'active' : ''}
                                >
                                    <td>{idx + 1}</td>
                                    <td>{item.custCd}</td>
                                    <td style={{textAlign:'left', paddingLeft:'10px'}}>{item.custNm}</td>
                                    <td>{item.presidentNm}</td>
                                    <td>{item.bizNo}</td>
                                    <td>{item.empNm}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* [우측] 상세 정보 폼 */}
        <div className="cust-detail-area">
            <div className="detail-title">
                ✨ 상세 정보 ({activeTab === '02' ? '고객사' : '구매처'})
            </div>

            {/* 기본 정보 그룹 */}
            <div style={{marginBottom:'20px'}}>
                <div className="detail-form-row">
                    <div className="form-label">거래처코드 <span style={{color:'red'}}>*</span></div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="custCd" value={formData.custCd} onChange={handleChange} readOnly={isEditMode} placeholder="예: CST001" />
                    </div>
                </div>
                <div className="detail-form-row">
                    <div className="form-label">거래처명 <span style={{color:'red'}}>*</span></div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="custNm" value={formData.custNm} onChange={handleChange} />
                    </div>
                </div>
                <div className="detail-form-row">
                    <div className="form-label">대표자명</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="presidentNm" value={formData.presidentNm || ''} onChange={handleChange} />
                    </div>
                </div>
                <div className="detail-form-row">
                    <div className="form-label">사업자번호</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="bizNo" value={formData.bizNo || ''} onChange={handleChange} placeholder="000-00-00000" />
                    </div>
                </div>
                
                <div className="detail-form-row">
                    <div className="form-label">업태 / 종목</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="bizCond" value={formData.bizCond || ''} onChange={handleChange} placeholder="업태" />
                        <input type="text" className="form-input" name="bizItem" value={formData.bizItem || ''} onChange={handleChange} placeholder="종목" />
                    </div>
                </div>

                <div className="detail-form-row">
                    <div className="form-label">주소</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="bizAddr" value={formData.bizAddr || ''} onChange={handleChange} placeholder="상세 주소를 입력하세요" />
                    </div>
                </div>

                <div className="detail-form-row">
                    <div className="form-label">전화 / 팩스</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="bizTel" value={formData.bizTel || ''} onChange={handleChange} placeholder="대표전화" />
                        <input type="text" className="form-input" name="bizFax" value={formData.bizFax || ''} onChange={handleChange} placeholder="팩스번호" />
                    </div>
                </div>
            </div>

            <hr style={{margin:'10px 0 20px 0', border:'0', borderTop:'1px dashed #ddd'}}/>

            {/* 담당자 정보 그룹 */}
            <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'14px', fontWeight:'bold', color:'#4dabf7', marginBottom:'10px'}}>👤 담당자 정보</div>
                
                <div className="detail-row">
                    <div className="detail-field"><label>담당자코드</label><input className="detail-input" name="empCd" value={formData.empCd || ''} onChange={handleChange} /></div>
                    <div className="detail-field"><label>담당자명</label><input className="detail-input" name="empNm" value={formData.empNm || ''} onChange={handleChange} /></div>
                </div>  
                <div className="detail-form-row">
                    <div className="form-label">이메일</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="empEMail" value={formData.empEMail || ''} onChange={handleChange} placeholder="example@email.com" />
                    </div>
                </div>
                <div className="detail-form-row">
                    <div className="form-label">연락처</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="empTel" value={formData.empTel || ''} onChange={handleChange} placeholder="직통번호" />
                        <input type="text" className="form-input" name="empHp" value={formData.empHp || ''} onChange={handleChange} placeholder="핸드폰" />
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}