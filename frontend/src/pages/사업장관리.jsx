import React, { useState, useEffect, useRef } from 'react';
import DaumPostcode from 'react-daum-postcode'; // ✅ 주소 검색 라이브러리 import
import '../css/pages/BusinessPage.css';

export default function 사업장관리() {
  // === 상태 관리 ===
  const [compList, setCompList] = useState([]);
  const [searchText, setSearchText] = useState('');
  
  const [formData, setFormData] = useState({
    compCd: '', compNm: '', representNm: '', bizNo: '',
    bizType: '', bizItem: '', addr: '', addrDetail: '', 
    telNo: '', faxNo: '', compImg: ''
  });

  const [selectedCompCd, setSelectedCompCd] = useState(null);
  
  // 이미지 관련
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // 주소 검색 팝업 상태
  const [isOpenPost, setIsOpenPost] = useState(false);

  // === 1. 데이터 조회 (검색 포함) ===
  const fetchList = async () => {
    try {
      // 검색어가 있으면 쿼리로 보냄
      const url = searchText 
        ? `http://localhost:8080/api/comp?searchText=${searchText}`
        : 'http://localhost:8080/api/comp';
        
      const res = await fetch(url);
      const data = await res.json();
      setCompList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCompList([]);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // === 2. 이미지 처리 (Base64 변환) ===
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일을 읽어서 문자열로 변환하는 도구
      const reader = new FileReader();
      
      reader.onloadend = () => {
        // 1. 화면에 미리보기 보여주기
        setPreviewUrl(reader.result);
        // 2. 폼 데이터에 문자열 자체를 저장 (DB로 전송됨)
        setFormData(prev => ({ ...prev, compImg: reader.result }));
      };
      
      reader.readAsDataURL(file); // 변환 시작
    }
  };

  // 이미지 삭제
  const handleDeleteImage = () => {
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, compImg: '' }));
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  // === 3. 주소 검색 처리 ===
  const handleAddressComplete = (data) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
      fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
    }

    // 주소 넣고, 팝업 닫고, 상세주소 초기화
    setFormData(prev => ({ ...prev, addr: fullAddress, addrDetail: '' }));
    setIsOpenPost(false);
  };

  // === 4. 기본 핸들러들 ===
  const handleRowClick = (item) => {
    setSelectedCompCd(item.compCd);
    setFormData(item);
    // DB에 저장된 이미지가 있으면 보여주기
    if(item.compImg) {
        setPreviewUrl(item.compImg);
    } else {
        setPreviewUrl(null);
    }
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
    if (!formData.compCd) return alert("사업장 코드는 필수입니다.");
    try {
      const res = await fetch('http://localhost:8080/api/comp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) // 이미지 문자열 포함해서 전송
      });
      if (res.ok) {
        alert("저장되었습니다.");
        fetchList();
      } else {
        alert("저장 실패");
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!selectedCompCd) return;
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await fetch(`http://localhost:8080/api/comp/${selectedCompCd}`, { method: 'DELETE' });
      alert("삭제되었습니다.");
      handleNew();
      fetchList();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // === 5. 팝업 스타일 (간단 모달) ===
  const postCodeStyle = {
    display: 'block',
    position: 'absolute',
    top: '20%',
    left: '30%',
    width: '400px',
    height: '500px',
    zIndex: 100,
    border: '1px solid #333',
    backgroundColor: 'white',
  };

  return (
    <div className="business-page">
      {/* 주소 검색 모달 */}
      {isOpenPost && (
        <div style={postCodeStyle}>
            <div style={{textAlign:'right', padding:'5px', background:'#eee'}}>
                <button onClick={() => setIsOpenPost(false)}>닫기 X</button>
            </div>
            <DaumPostcode onComplete={handleAddressComplete} height="460px" />
        </div>
      )}

      {/* 헤더 */}
      <div className="page-header">
        <h2 className="page-title">사업장 관리</h2>
        <div className="button-group">
            <button className="btn new" onClick={handleNew}>신규</button>
            <button className="btn save" onClick={handleSave}>저장</button>
            <button className="btn delete" onClick={handleDelete}>삭제</button>
        </div>
      </div>

      {/* 검색바 */}
      <div className="search-bar">
        <input 
            className="search-input"
            type="text" 
            placeholder="사업장명 또는 사업자번호로 검색하세요" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchList()} // 엔터 치면 검색 실행
        />
      </div>

      <div className="content-split">
        {/* 리스트 */}
        <div className="list-section">
            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{width: '50px'}}>No</th>
                            <th>사업장명</th>
                            <th style={{width: '80px'}}>대표자</th>
                            <th style={{width: '110px'}}>사업자번호</th>
                        </tr>
                    </thead>
                    <tbody>
                        {compList.map((item, idx) => (
                            <tr 
                                key={item.compCd} 
                                onClick={() => handleRowClick(item)}
                                className={selectedCompCd === item.compCd ? 'selected' : ''}
                            >
                                <td>{idx + 1}</td>
                                <td>{item.compNm}</td>
                                <td>{item.representNm}</td>
                                <td>{item.bizNo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* 상세 폼 */}
        <div className="detail-section">
            <div className="section-header">기본 정보</div>
            <div className="form-grid">
                <label className="form-label">사업장코드</label>
                <input className="form-input" name="compCd" value={formData.compCd} onChange={handleChange} placeholder="코드 입력" />
                
                <label className="form-label">사업장명</label>
                <input className="form-input" name="compNm" value={formData.compNm} onChange={handleChange} />

                <label className="form-label">대표자명</label>
                <input className="form-input" name="representNm" value={formData.representNm} onChange={handleChange} />

                <label className="form-label">사업자번호</label>
                <input className="form-input" name="bizNo" value={formData.bizNo} onChange={handleChange} />

                <label className="form-label">업태</label>
                <input className="form-input" name="bizItem" value={formData.bizItem} onChange={handleChange} />

                <label className="form-label">종목</label>
                <input className="form-input" name="bizType" value={formData.bizType} onChange={handleChange} />

                <label className="form-label">전화번호</label>
                <input className="form-input" name="telNo" value={formData.telNo} onChange={handleChange} />

                <label className="form-label">팩스번호</label>
                <input className="form-input" name="faxNo" value={formData.faxNo} onChange={handleChange} />
            </div>

            <div className="section-header">주소 정보</div>
            <div className="address-row">
                <input 
                    className="form-input" 
                    name="addr" 
                    value={formData.addr} 
                    onChange={handleChange} 
                    placeholder="주소" 
                    readOnly // 주소는 검색으로만 입력
                    style={{flex:1, background:'#f9f9f9'}} 
                />
                <button 
                    className="btn" 
                    style={{background:'#eee', color:'#333'}}
                    onClick={() => setIsOpenPost(true)} // 팝업 열기
                >
                    주소 검색
                </button>
            </div>
            <input className="form-input" name="addrDetail" value={formData.addrDetail || ''} onChange={handleChange} placeholder="상세주소를 입력하세요" />

            <div className="section-header">회사 이미지</div>
            <div className="image-area">
                <div className="image-box">
                    {previewUrl ? 
                        <img src={previewUrl} alt="미리보기" className="image-preview" /> : 
                        <span style={{color:'#ccc'}}>이미지 없음</span>
                    }
                </div>
                <div className="image-buttons">
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} style={{display:'none'}} accept="image/*" />
                    <button className="btn" onClick={() => fileInputRef.current.click()} style={{background:'#fff'}}>이미지 선택</button>
                    <button className="btn" onClick={handleDeleteImage} style={{background:'#fff', color:'red'}}>삭제</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}