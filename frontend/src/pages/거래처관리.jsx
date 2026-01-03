import React, { useState, useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';
import { callApi } from '../utils/api';
import IconButton from '../components/IconButton';
import SearchBar from '../components/SearchBar';
import '../css/pages/거래처관리.css'; 

export default function 거래처관리() {
  const [activeTab, setActiveTab] = useState('02'); // '02': 고객사, '01': 구매처
  const [custList, setCustList] = useState([]);
  const [searchType, setSearchType] = useState('custNm');
  const [searchText, setSearchText] = useState('');

  const [selectedCustCd, setSelectedCustCd] = useState(null);
  const [formData, setFormData] = useState({
    custCd: '', custNm: '', presidentNm: '', bizNo: '',
    bizCond: '', bizItem: '', bizAddr: '', bizTel: '', bizFax: '',
    empCd: '', empNm: '', empEmail: '', empTel: '', empHp: '',
    bizFlag: '02'
  });

  const [isOpenPost, setIsOpenPost] = useState(false);

  // === 데이터 조회 ===
  const fetchList = async () => {
    try {
      const url = `http://localhost:8080/api/cust?bizFlag=${activeTab}&searchText=${searchText}`;
      const data = await callApi(url, 'GET');
      setCustList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCustList([]);
    }
  };

  useEffect(() => {
    fetchList();
    handleNew();
  }, [activeTab]);

  // === 핸들러 ===
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormData(prev => ({ ...prev, bizFlag: tab }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRowClick = (item) => {
    setSelectedCustCd(item.custCd);
    setFormData(item);
  };

  const handleNew = () => {
    setSelectedCustCd(null);
    setFormData({
      custCd: '', custNm: '', presidentNm: '', bizNo: '',
      bizCond: '', bizItem: '', bizAddr: '', bizTel: '', bizFax: '',
      empCd: '', empNm: '', empEmail: '', empTel: '', empHp: '',
      bizFlag: activeTab
    });
  };

  const handleSave = async () => {
    if (!formData.custCd || !formData.custNm) {
      alert("거래처코드와 거래처명은 필수입니다.");
      return;
    }
    try {
      await callApi('http://localhost:8080/api/cust', 'POST', formData);
      alert("저장되었습니다.");
      fetchList();
    } catch (err) {
      console.error(err);
      alert("저장 실패");
    }
  };

  const handleDelete = async () => {
    if (!selectedCustCd) return;
    if (window.confirm("정말 삭제하시겠습니까?")) {
      try {
        await callApi(`http://localhost:8080/api/cust/${selectedCustCd}`, 'DELETE');
        alert("삭제되었습니다.");
        handleNew();
        fetchList();
      } catch (err) {
        console.error(err);
        alert("삭제 실패");
      }
    }
  };

  const handleAddressComplete = (data) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
      fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
    }
    setFormData(prev => ({ ...prev, bizAddr: fullAddress }));
    setIsOpenPost(false);
  };

  return (
    <div className="customer-management-container">
      {/* 주소 검색 모달 */}
      {isOpenPost && (
        <div style={{
            display: 'block', position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', width: '400px', height: '500px',
            zIndex: 1000, border: '1px solid #333', backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
            <div style={{textAlign:'right', padding:'5px', background:'#f1f5f9', borderBottom:'1px solid #ddd'}}>
                <button onClick={() => setIsOpenPost(false)} style={{border:'none', background:'transparent', cursor:'pointer'}}>닫기 X</button>
            </div>
            <DaumPostcode onComplete={handleAddressComplete} height="460px" />
        </div>
      )}

      <div className="customer-management-wrapper">
        {/* 1. 헤더 영역 (탭, 검색, 통계) */}
        <div className="customer-header">
          <div className="header-left-section">
            <h2 className="customer-title">거래처 관리</h2>
            
            {/* 탭 버튼 */}
            <div className="tab-buttons">
              <button 
                className={`tab-button ${activeTab === '02' ? 'active' : ''}`} 
                onClick={() => handleTabChange('02')}
              >
                고객사(매출)
              </button>
              <button 
                className={`tab-button ${activeTab === '01' ? 'active' : ''}`} 
                onClick={() => handleTabChange('01')}
              >
                구매처(매입)
              </button>
            </div>

            {/* 검색바 */}
            <SearchBar
              searchOptions={[
                { value: 'custNm', label: '거래처명' },
                { value: 'custCd', label: '코드' },
                { value: 'bizNo', label: '사업자번호' }
              ]}
              searchType={searchType}
              onSearchTypeChange={setSearchType}
              searchTerm={searchText}
              onSearchTermChange={setSearchText}
              onSearch={fetchList}
            />

            {/* 통계 뱃지 */}
            <div className={`statistics-info ${activeTab === '02' ? 'statistics-customer' : 'statistics-vendor'}`}>
              <span className="stat-label">총 {activeTab === '02' ? '고객사' : '구매처'}:</span>
              <span className="stat-value">{custList.length}</span>
              <span className="stat-unit">개</span>
            </div>
          </div>
          <div className="header-buttons">
            <IconButton type="modify" label="신규등록" onClick={handleNew} />
            <IconButton type="delete" label="삭제" onClick={handleDelete} />
          </div>
        </div>

        {/* 2. 메인 컨텐츠 (리스트 60% : 상세 40%) */}
        <div className="customer-content-layout">
          
          {/* [왼쪽] 리스트 패널 */}
          <div className="customer-list-panel">
            <div className="list-table-wrapper">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{width: '50px'}}>No</th>
                    <th className="excel-th">코드</th>
                    <th className="excel-th">거래처명</th>
                    <th className="excel-th">대표자</th>
                    <th className="excel-th">사업자번호</th>
                    <th className="excel-th">담당자</th>
                  </tr>
                </thead>
                <tbody>
                  {custList.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>데이터가 없습니다.</td></tr>
                  ) : (
                    custList.map((item, idx) => (
                      <tr
                        key={item.custCd}
                        className={`excel-tr ${selectedCustCd === item.custCd ? 'selected' : ''}`}
                        onClick={() => handleRowClick(item)}
                      >
                        <td className="excel-td excel-td-number">{idx + 1}</td>
                        <td className="excel-td">{item.custCd}</td>
                        <td className="excel-td">{item.custNm}</td>
                        <td className="excel-td">{item.presidentNm}</td>
                        <td className="excel-td">{item.bizNo}</td>
                        <td className="excel-td">{item.empNm}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* [오른쪽] 상세 패널 */}
          <div className="customer-detail-panel">
            
            {/* === [수정됨] 상세 헤더 (가로 한 줄 배치 & 밑줄) === */}
            <div className="detail-header">
              <div className="detail-header-left">
                {/* 1. 타이틀 (밑줄 스타일 적용) */}
                <h3 className="detail-title-text">
                  {activeTab === '02' ? '고객사' : '구매처'} 정보
                </h3>
                
                {/* 2. INFO 칩 */}
                <span className="detail-chip">INFO</span>
                
                {/* 3. 상세 텍스트 (옆으로 이동) */}
                <span className="detail-info-text">
                  {selectedCustCd 
                    ? `${formData.custNm} (${formData.custCd})` 
                    : '신규 등록 대기'}
                </span>
              </div>

              {/* 4. 상태 표시 */}
              <div className="detail-status">
                <span className={`status-dot ${selectedCustCd ? 'active' : ''}`}></span>
                <span className="status-text">{selectedCustCd ? '선택됨' : '대기'}</span>
              </div>
            </div>

            {/* 상세 내용 (스크롤 영역) */}
            <div className="detail-content">
              
              {/* 수정/신규 배너 */}
              <div className="detail-meta-bar">
                <span className={`badge ${selectedCustCd ? 'badge-edit' : 'badge-new'}`}>
                  {selectedCustCd ? '수정 모드' : '신규 등록'}
                </span>
                <span className="meta-text">
                  {selectedCustCd 
                    ? '선택된 거래처 정보를 수정한 뒤 저장하세요.' 
                    : '거래처 기본정보와 담당자를 입력하세요.'}
                </span>
              </div>

              {/* 기본 정보 폼 */}
              <div className="form-section">
                <div className="section-title">기본 정보</div>
                <div className="form-group">
                  <div className="form-row">
                    <div className="form-field-inline">
                      <label>거래처코드</label>
                      <input name="custCd" value={formData.custCd} onChange={handleInputChange} readOnly={!!selectedCustCd} placeholder="필수 입력"/>
                    </div>
                    <div className="form-field-inline">
                      <label>거래처명</label>
                      <input name="custNm" value={formData.custNm} onChange={handleInputChange} placeholder="필수 입력"/>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field-inline">
                      <label>대표자명</label>
                      <input name="presidentNm" value={formData.presidentNm || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-field-inline">
                      <label>사업자번호</label>
                      <input name="bizNo" value={formData.bizNo || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field-inline">
                      <label>업태</label>
                      <input name="bizCond" value={formData.bizCond || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-field-inline">
                      <label>종목</label>
                      <input name="bizItem" value={formData.bizItem || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field-inline">
                      <label>전화번호</label>
                      <input name="bizTel" value={formData.bizTel || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-field-inline">
                      <label>팩스번호</label>
                      <input name="bizFax" value={formData.bizFax || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-row form-row-full">
                    <div className="form-field-inline">
                      <label>주소</label>
                      <div style={{display:'flex', gap:'6px'}}>
                        <input name="bizAddr" value={formData.bizAddr || ''} readOnly onChange={handleInputChange} style={{flex:1, background:'#f9f9f9'}} placeholder="주소 검색"/>
                        <button type="button" className="erp-button erp-button-default" onClick={() => setIsOpenPost(true)} style={{width:'80px'}}>검색</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 담당자 정보 폼 */}
              <div className="form-section">
                <div className="section-title">담당자 정보</div>
                <div className="form-group">
                  <div className="form-row">
                    <div className="form-field-inline">
                        <label>담당자명</label>
                        <input name="empNm" value={formData.empNm || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-field-inline">
                        <label>이메일</label>
                        <input name="empEmail" value={formData.empEmail || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field-inline">
                        <label>직통번호</label>
                        <input name="empTel" value={formData.empTel || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-field-inline">
                        <label>핸드폰</label>
                        <input name="empHp" value={formData.empHp || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="detail-footer">
                <button className="erp-button erp-button-primary" onClick={handleSave}>
                  {selectedCustCd ? '수정 저장' : '신규 등록'}
                </button>
                <button className="erp-button erp-button-default" onClick={handleDelete} disabled={!selectedCustCd}>
                  삭제
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}