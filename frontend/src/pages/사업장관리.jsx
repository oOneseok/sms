import React, { useState, useEffect, useRef } from 'react';
import DaumPostcode from 'react-daum-postcode';
import { callApi } from '../utils/api';
import IconButton from '../components/IconButton';
import SearchBar from '../components/SearchBar';
import '../css/pages/사업장관리.css';

const REQUIRED_FIELDS = {
  compNm: '사업장명',
  representNm: '대표자명',
  bizNo: '사업자번호'
};

export default function 사업장관리() {
  // === 상태 관리 ===
  const [compList, setCompList] = useState([]);
  const [searchType, setSearchType] = useState('compNm');
  const [searchText, setSearchText] = useState('');
  const [selectedCompCd, setSelectedCompCd] = useState(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    compCd: '', compNm: '', representNm: '', bizNo: '',
    bizType: '', bizItem: '', addr: '', addrDetail: '',
    telNo: '', faxNo: '', compImg: ''
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [isOpenPost, setIsOpenPost] = useState(false);

  // === API 조회 ===
  const fetchList = async () => {
    try {
      const url = searchText
        ? `http://localhost:8080/api/comp?searchText=${searchText}`
        : 'http://localhost:8080/api/comp';
      const data = await callApi(url, 'GET');
      setCompList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCompList([]);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // === 이벤트 핸들러 ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRowClick = (item) => {
    setSelectedCompCd(item.compCd);
    setFormData(item);
    setPreviewUrl(item.compImg || null);
  };

  const handleNew = () => {
    setSelectedCompCd(null);
    setFormData({
      compCd: '', compNm: '', representNm: '', bizNo: '',
      bizType: '', bizItem: '', addr: '', addrDetail: '',
      telNo: '', faxNo: '', compImg: ''
    });
    setPreviewUrl(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    for (const [field, label] of Object.entries(REQUIRED_FIELDS)) {
      if (!formData[field]) {
        alert(`${label}은(는) 필수 입력 항목입니다.`);
        return;
      }
    }
    try {
      await callApi('http://localhost:8080/api/comp', 'POST', formData);
      alert("저장되었습니다.");
      fetchList();
    } catch (err) {
      console.error(err);
      alert("저장 실패");
    }
  };

  const handleDelete = async () => {
    if (!selectedCompCd) return;
    if (window.confirm("정말 삭제하시겠습니까?")) {
      try {
        await callApi(`http://localhost:8080/api/comp/${selectedCompCd}`, 'DELETE');
        alert("삭제되었습니다.");
        handleNew();
        fetchList();
      } catch (err) {
        console.error(err);
        alert("삭제 실패");
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setFormData(prev => ({ ...prev, compImg: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = () => {
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, compImg: '' }));
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddressComplete = (data) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
      fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
    }
    setFormData(prev => ({ ...prev, addr: fullAddress, addrDetail: '' }));
    setIsOpenPost(false);
  };

  return (
    <div className="business-management-container">
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

      <div className="business-management-wrapper">
        <div className="business-management-header">
          <div className="header-left-section">
            <h2 className="page-title">사업장 관리</h2>
            <SearchBar
              searchOptions={[
                { value: 'compNm', label: '사업장명' },
                { value: 'compCd', label: '사업장코드' }
              ]}
              searchType={searchType}
              onSearchTypeChange={setSearchType}
              searchTerm={searchText}
              onSearchTermChange={setSearchText}
              onSearch={fetchList}
            />
            <div className="statistics-info">
              <span className="stat-label">총 사업장:</span>
              <span className="stat-value">{compList.length}</span>
              <span className="stat-unit">개</span>
            </div>
          </div>
          <div className="header-buttons">
            <IconButton type="modify" label="신규등록" onClick={handleNew} />
            <IconButton type="delete" label="삭제" onClick={handleDelete} />
          </div>
        </div>

        <div className="business-content-layout">
          {/* 리스트 패널 */}
          <div className="business-list-panel">
            <div className="list-table-wrapper">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{width: '50px'}}>No</th>
                    <th className="excel-th">사업장명</th>
                    <th className="excel-th">대표자명</th>
                    <th className="excel-th">사업자번호</th>
                    <th className="excel-th">전화번호</th>
                  </tr>
                </thead>
                <tbody>
                  {compList.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>데이터가 없습니다.</td></tr>
                  ) : (
                    compList.map((item, idx) => (
                      <tr
                        key={item.compCd}
                        className={`excel-tr ${selectedCompCd === item.compCd ? 'selected' : ''}`}
                        onClick={() => handleRowClick(item)}
                      >
                        <td className="excel-td excel-td-number">{idx + 1}</td>
                        <td className="excel-td">{item.compNm}</td>
                        <td className="excel-td">{item.representNm}</td>
                        <td className="excel-td">{item.bizNo}</td>
                        <td className="excel-td">{item.telNo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 상세 패널 */}
          <div className="business-detail-panel">
            {/* 디자인 헤더 (INFO 칩, 상태 점 포함) */}
            <div className="detail-header">
              <div className="detail-title-wrap">
                <h3 className="detail-title">사업장 정보</h3>
                <span className="detail-chip">INFO</span>
              </div>
              <div className="detail-status">
                <span className={`status-dot ${selectedCompCd ? 'active' : ''}`}></span>
                <span className="status-text">{selectedCompCd ? '선택됨' : '신규 등록 대기'}</span>
              </div>
            </div>

            <div className="detail-content">
              
              {/* 배너 영역 (수정 모드 / 신규 등록) */}
              <div className="detail-meta-bar">
                <span className={`badge ${selectedCompCd ? 'badge-edit' : 'badge-new'}`}>
                  {selectedCompCd ? '수정 모드' : '신규 등록'}
                </span>
                <span className="meta-text">
                  {selectedCompCd 
                    ? '선택된 사업장 정보를 수정한 뒤 저장하세요.' 
                    : '사업장 기본정보와 주소를 입력하세요.'}
                </span>
              </div>

              {/* 폼 + 이미지 가로 배치 */}
              <div className="detail-flex-row">
                
                {/* 1. 좌측: 기본 정보 폼 */}
                <div className="form-section flex-fill">
                  <div className="section-title">사업장 정보</div>
                  <div className="form-group">
                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>사업장명</label>
                        <input name="compNm" value={formData.compNm} onChange={handleInputChange} placeholder="필수 입력"/>
                      </div>
                      <div className="form-field-inline">
                        <label>대표자명</label>
                        <input name="representNm" value={formData.representNm} onChange={handleInputChange} placeholder="필수 입력"/>
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>사업자번호</label>
                        <input name="bizNo" value={formData.bizNo} onChange={handleInputChange} placeholder="필수 입력"/>
                      </div>
                      <div className="form-field-inline">
                        <label>종목</label>
                        <input name="bizItem" value={formData.bizItem} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>업태</label>
                        <input name="bizType" value={formData.bizType} onChange={handleInputChange} />
                      </div>
                      <div className="form-field-inline">
                        <label>전화번호</label>
                        <input name="telNo" value={formData.telNo} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>팩스</label>
                        <input name="faxNo" value={formData.faxNo} onChange={handleInputChange} />
                      </div>
                       <div className="form-field-inline" style={{display:'none'}}> 
                         <input name="compCd" value={formData.compCd} readOnly />
                       </div>
                    </div>

                    <div className="form-row form-row-full">
                      <div className="form-field-inline">
                        <label>주소 정보</label>
                        <div style={{display:'flex', gap:'6px', marginBottom:'4px'}}>
                          <input name="addr" value={formData.addr} readOnly onChange={handleInputChange} style={{flex:1, background:'#f8fafc'}} placeholder="주소 검색"/>
                          <button type="button" className="erp-button erp-button-default" onClick={()=>setIsOpenPost(true)} style={{width:'80px'}}>
                            주소 검색
                          </button>
                        </div>
                        <input
                          name="addrDetail"
                          value={formData.addrDetail || ''}
                          onChange={handleInputChange}
                          placeholder="상세주소를 입력하세요"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 우측: 이미지 영역 */}
                <div className="form-section fixed-right">
                  <div className="section-title">이미지</div>
                  <div className="image-upload-container">
                    <div className="image-preview-box">
                      {previewUrl ? (
                        <img src={previewUrl} alt="사업장 이미지" />
                      ) : (
                        <span>이미지</span>
                      )}
                    </div>
                    <div className="image-buttons">
                      <button type="button" onClick={() => fileInputRef.current.click()}>
                        선택
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        style={{display:'none'}}
                      />
                      <button type="button" className="delete-btn" onClick={handleDeleteImage}>
                        삭제
                      </button>
                    </div>
                  </div>
                </div>

              </div> {/* detail-flex-row 끝 */}

              {/* 하단 둥근 버튼 */}
              <div className="detail-footer">
                <button className="erp-button erp-button-primary" onClick={handleSave}>
                  {selectedCompCd ? '수정 저장' : '신규 등록'}
                </button>
                <button
                  className="erp-button erp-button-default"
                  onClick={handleDelete}
                  disabled={!selectedCompCd}
                >
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