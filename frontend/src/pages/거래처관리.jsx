import React, { useState, useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode'; // ✅ 주소 검색 라이브러리
import { callApi } from '../utils/api';
import '../css/pages/CustPage.css';
import '../css/pages/BusinessPage.css';

export default function 거래처관리() {
  const [custList, setCustList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('02'); 

  const [formData, setFormData] = useState({
    custCd: '', custNm: '', presidentNm: '', bizNo: '', bizCond: '', bizItem: '',
    bizAddr: '', bizTel: '', bizFax: '', 
    empCd: '', empNm: '', empEmail: '', empTel: '', empHp: '',
    bizFlag: '02'
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [isOpenPost, setIsOpenPost] = useState(false); // ✅ 주소 팝업 상태

  // === 1. 데이터 조회 ===
  useEffect(() => {
    fetchList();
  }, [activeTab]); 

  const fetchList = async (keyword = '') => {
    try {
      const url = `http://localhost:8080/api/cust?bizFlag=${activeTab}&searchText=${keyword}`;
      const data = await callApi(url, 'GET');
      setCustList(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  // === 2. 주소 검색 핸들러 (카카오) ===
  const handleAddressComplete = (data) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
      fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
    }

    // bizAddr에 주소 입력
    setFormData(prev => ({ ...prev, bizAddr: fullAddress }));
    setIsOpenPost(false); // 팝업 닫기
  };

  // === 3. 이벤트 핸들러 ===
  const handleKeyDown = (e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') fetchList(searchText); };
  const handleTabChange = (flag) => { setActiveTab(flag); handleNew(flag); };
  const handleRowClick = (item) => { setFormData(item); setIsEditMode(true); };
  
  const handleNew = (targetFlag = activeTab) => {
    setFormData({
      custCd: '', custNm: '', presidentNm: '', bizNo: '', bizCond: '', bizItem: '', bizAddr: '', bizTel: '', bizFax: '',
      empCd: '', empNm: '', empEmail: '', empTel: '', empHp: '',
      bizFlag: targetFlag
    });
    setIsEditMode(false);
  };
  
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  // 저장
  const handleSave = async () => {
    if (!formData.custCd || !formData.custNm) {
      alert("거래처코드와 거래처명은 필수입니다.");
      return;
    }
    try {
      await callApi('http://localhost:8080/api/cust', 'POST', formData);
      alert("저장되었습니다.");
      fetchList(searchText); 
      setIsEditMode(true);
    } catch (err) {
      console.error(err);
      alert("저장 실패 (코드 중복 등)");
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await callApi(`http://localhost:8080/api/cust/${formData.custCd}`, 'DELETE');
      alert("삭제되었습니다.");
      handleNew(); 
      fetchList(searchText);
    } catch (err) {
      console.error(err);
      alert("삭제 실패");
    }
  };

  // 팝업 스타일
  const postCodeStyle = {
    display: 'block', position: 'absolute', top: '20%', left: '35%', width: '400px', height: '500px', zIndex: 1000, border: '1px solid #333', backgroundColor: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
  };

  return (
    <div className="cust-page">
      
      {/* ✅ 주소 검색 모달 */}
      {isOpenPost && (
        <div style={postCodeStyle}>
            <div style={{textAlign:'right', padding:'8px', background:'#f1f3f5', borderBottom:'1px solid #ddd'}}>
                <button onClick={() => setIsOpenPost(false)} style={{cursor:'pointer', border:'none', background:'transparent', fontWeight:'bold'}}>닫기 ✕</button>
            </div>
            <DaumPostcode onComplete={handleAddressComplete} height="450px" />
        </div>
      )}

      {/* 1. 헤더 */}
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

      {/* 3. 메인 컨텐츠 */}
      <div className="cust-content">
        
        {/* [좌측] 리스트 */}
        <div className="cust-list-area">
            <div className="tab-header">
                <button className={`tab-btn ${activeTab === '02' ? 'active' : ''}`} onClick={() => handleTabChange('02')}>
                    🏢 고객사 (매출)
                </button>
                <button className={`tab-btn ${activeTab === '01' ? 'active' : ''}`} onClick={() => handleTabChange('01')}>
                    🛒 구매처 (매입)
                </button>
            </div>

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

                {/* ✅ 주소 찾기 버튼 적용 */}
                <div className="detail-form-row">
                    <div className="form-label">주소</div>
                    <div className="form-input-group" style={{display:'flex', gap:'5px'}}>
                        <input 
                            type="text" 
                            className="form-input" 
                            name="bizAddr" 
                            value={formData.bizAddr || ''} 
                            onChange={handleChange} 
                            placeholder="주소 검색 또는 입력" 
                            style={{flex:1}}
                        />
                        <button 
                            className="btn" 
                            style={{background:'#e9ecef', color:'#333', border:'1px solid #ced4da', whiteSpace:'nowrap'}}
                            onClick={() => setIsOpenPost(true)}
                        >
                            🔍 주소찾기
                        </button>
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

            {/* ✅ 담당자 정보 깔끔하게 정리 */}
            <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'14px', fontWeight:'bold', color:'#4dabf7', marginBottom:'10px'}}>👤 담당자 정보</div>
                
                <div className="detail-form-row">
                    <div className="form-label">담당자</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="empCd" value={formData.empCd || ''} onChange={handleChange} placeholder="코드 (선택)" />
                        <input type="text" className="form-input" name="empNm" value={formData.empNm || ''} onChange={handleChange} placeholder="담당자 성명" />
                    </div>
                </div>
                
                <div className="detail-form-row">
                    <div className="form-label">이메일</div>
                    <div className="form-input-group">
                        <input type="text" className="form-input" name="empEmail" value={formData.empEmail || ''} onChange={handleChange} placeholder="example@email.com" />
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