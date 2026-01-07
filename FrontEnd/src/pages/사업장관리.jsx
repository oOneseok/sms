import React, { useState, useEffect, useRef } from 'react'
import '../css/pages/management-common.css' // 공통 CSS (필요 시)
import '../css/pages/사업장관리.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

const REQUIRED_FIELDS = ['businessName', 'representativeName', 'businessNumber', 'address']

function 사업장관리() {
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [searchType, setSearchType] = useState('businessName') // 'businessName', 'businessNumber', 'representativeName'
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('')
  const [isInputting, setIsInputting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [showCompletionPopup, setShowCompletionPopup] = useState(false)
  const [isModify, setIsModify] = useState(false)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  const listTableWrapperRef = useRef(null)
  const [pendingScrollRowId, setPendingScrollRowId] = useState(null)

  // ★ 실제 서버 데이터를 담을 상태 (초기값 빈 배열)
  const [businessList, setBusinessList] = useState([])

  const [formData, setFormData] = useState({
    businessCode: '',
    businessName: '',
    representativeName: '',
    businessNumber: '',
    businessType: '',
    businessCondition: '',
    address: '',
    addressDetail: '',
    phoneNumber: '',
    fax: '',
    email: '' // 백엔드에 없으면 저장 안됨
  })
  const [errors, setErrors] = useState({})
  const [imagePreview, setImagePreview] = useState(null)

  // =========================================================================
  // ★ 1. [조회] 데이터 불러오기 (API 연동)
  // =========================================================================
  const fetchData = async () => {
    try {
      const query = new URLSearchParams({ searchText: appliedSearchTerm }).toString();
      // 백엔드: /api/comp
      const response = await fetch(`http://localhost:8080/api/comp?${query}`);
      
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      // 백엔드(CompMst) -> 프론트엔드(UI) 변수명 매핑
      const mappedData = data.map(item => ({
        id: item.compCd,              // PK를 id로 사용
        businessCode: item.compCd,
        businessName: item.compNm,
        representativeName: item.representNm,
        businessNumber: item.bizNo,
        businessType: item.bizItem,      // 종목
        businessCondition: item.bizType, // 업태
        address: item.addr,              // 주소
        addressDetail: '',               // 상세주소 분리 로직 없음 (필요 시 문자열 파싱)
        phoneNumber: item.telNo,
        fax: item.faxNo,
        image: item.compImg              // Base64 이미지
      }));

      setBusinessList(mappedData);

    } catch (error) {
      console.error("사업장 목록 조회 실패:", error);
      setBusinessList([]);
    }
  }

  // 초기 로딩 시 조회
  useEffect(() => {
    fetchData();
    if (window.daum && window.daum.Postcode) {
      // API 준비됨
    }
  }, []); // 마운트 시 1회 실행

  // 검색어가 적용되면 재조회
  useEffect(() => {
    fetchData();
  }, [appliedSearchTerm]);

  // 선택된 사업장이 변경되면 폼 데이터 업데이트
  useEffect(() => {
    if (selectedBusiness) {
      const business = businessList.find(b => b.id === selectedBusiness)
      if (business) {
        setFormData({
          businessCode: business.businessCode,
          businessName: business.businessName,
          representativeName: business.representativeName,
          businessNumber: business.businessNumber,
          businessType: business.businessType || '',
          businessCondition: business.businessCondition || '',
          address: business.address,
          addressDetail: business.addressDetail || '',
          phoneNumber: business.phoneNumber || '',
          fax: business.fax || '',
          email: '' // DB에 필드 없음
        })
        setImagePreview(business.image)
      }
    } else {
      // 신규 등록 모드
      setFormData({
        businessCode: '',
        businessName: '',
        representativeName: '',
        businessNumber: '',
        businessType: '',
        businessCondition: '',
        address: '',
        addressDetail: '',
        phoneNumber: '',
        fax: '',
        email: ''
      })
      setImagePreview(null)
    }
    setErrors({})
  }, [selectedBusiness, businessList])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const nextData = { ...prev, [name]: value }
      const hasAnyValue = Object.values(nextData).some(val => val && String(val).trim() !== '')
      setIsInputting(hasAnyValue)
      return nextData
    })
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    if (!REQUIRED_FIELDS.includes(name)) return

    if (!value.trim()) {
      setErrors(prev => ({ ...prev, [name]: true }))
    } else {
      setErrors(prev => {
        if (!prev[name]) return prev
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleAddressSearch = () => {
    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: function(data) {
        let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        setFormData(prev => ({
          ...prev,
          address: addr,
          addressDetail: ''
        }))
        document.querySelector('input[name="addressDetail"]')?.focus()
      },
      width: '100%',
      height: '100%',
      maxSuggestItems: 5
    }).open({
      q: formData.address,
      left: window.screen.width / 2 - 300,
      top: window.screen.height / 2 - 300
    })
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageDelete = () => {
    setImagePreview(null)
  }

  const handleNew = () => {
    setSelectedBusiness(null)
    setIsEditMode(true)
    setIsInputting(false)
    setIsCompleted(false)
    // 신규 등록 시 코드 입력칸 포커스
    setTimeout(() => document.querySelector('input[name="businessCode"]')?.focus(), 100);
  }

  const handleModify = () => {
    if (selectedBusiness) {
      setIsEditMode(true)
      setIsCompleted(false)
    }
  }

  const handleCancel = () => {
    if (selectedBusiness) {
      setIsEditMode(false)
      setIsCompleted(false)
      // 데이터 원복
      const business = businessList.find(b => b.id === selectedBusiness)
      if (business) {
        setFormData({ ...business, addressDetail: '' })
        setImagePreview(business.image)
      }
    } else {
      // 신규 취소
      setFormData({
        businessCode: '', businessName: '', representativeName: '', businessNumber: '',
        businessType: '', businessCondition: '', address: '', addressDetail: '',
        phoneNumber: '', fax: '', email: ''
      })
      setImagePreview(null)
      setIsInputting(false)
      setIsEditMode(false)
    }
  }

  // =========================================================================
  // ★ 2. [저장] 데이터 전송 (API 연동)
  // =========================================================================
  const handleSave = async () => {
    // 1. 유효성 검사
    const missingFields = REQUIRED_FIELDS.filter(key => !formData[key].trim())
    // 사업장코드는 필수 (신규일 때)
    if (!formData.businessCode.trim()) missingFields.push('businessCode')

    if (missingFields.length) {
      setErrors(prev => {
        const next = { ...prev }
        missingFields.forEach(key => { next[key] = true })
        return next
      })
      alert("필수 입력 항목을 확인해주세요.");
      return
    }
    setErrors({})

    try {
        // 2. 주소 합치기
        const fullAddress = formData.addressDetail
            ? `${formData.address} ${formData.addressDetail}`.trim()
            : formData.address;

        // 3. 백엔드(CompMst) 구조로 변환
        const payload = {
            compCd: formData.businessCode,
            compNm: formData.businessName,
            representNm: formData.representativeName,
            bizNo: formData.businessNumber,
            bizItem: formData.businessType,      // 종목
            bizType: formData.businessCondition, // 업태
            addr: fullAddress,
            telNo: formData.phoneNumber,
            faxNo: formData.fax,
            compImg: imagePreview // Base64
        };

        // 4. API 호출 (POST)
        const response = await fetch('http://localhost:8080/api/comp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Save failed');

        // 5. 후처리
        const savedData = await response.json();
        const isModifying = isEditMode && selectedBusiness;

        // 목록 갱신
        await fetchData();

        if (isModifying) {
            setIsModify(true)
        } else {
            // 신규 등록 시 해당 행 선택
            if(savedData && savedData.compCd) {
                setSelectedBusiness(savedData.compCd);
                setPendingScrollRowId(savedData.compCd);
            }
            setIsModify(false)
        }

        setIsInputting(false)
        setIsCompleted(true)
        setIsEditMode(false)
        setShowCompletionPopup(true)

    } catch (error) {
        console.error("저장 실패:", error);
        alert("저장 중 오류가 발생했습니다.");
    }
  }

  // =========================================================================
  // ★ 3. [삭제] 데이터 삭제 (API 연동)
  // =========================================================================
  const handleConfirmDelete = async () => {
    try {
        const response = await fetch(`http://localhost:8080/api/comp/${selectedBusiness}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        await fetchData(); // 목록 갱신
        setSelectedBusiness(null);
        setShowDeletePopup('completed');

    } catch (error) {
        console.error("삭제 실패:", error);
        alert("삭제 중 오류가 발생했습니다.");
        setShowDeletePopup(false);
    }
  }

  const handleDelete = () => {
    if (!selectedBusiness) {
      alert('삭제할 사업장을 선택해주세요.')
      return
    }
    setShowDeletePopup(true)
  }

  const handleRowClick = (id) => {
    setSelectedBusiness(id)
    setIsEditMode(false)
    setIsInputting(false)
    setIsCompleted(false)
  }

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm)
    setCurrentPage(1)
  }

  // 필터링 (클라이언트)
  const filteredList = businessList.filter(business => {
    if (!appliedSearchTerm) return true
    
    const term = appliedSearchTerm.toLowerCase()
    switch (searchType) {
      case 'businessName':
        return business.businessName.toLowerCase().includes(term)
      case 'businessNumber':
        return business.businessNumber.includes(term)
      case 'representativeName':
        return business.representativeName.toLowerCase().includes(term)
      default:
        return true
    }
  })

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem)

  useEffect(() => {
    if (filteredList.length === 0) {
      if (currentPage !== 1) setCurrentPage(1)
      return
    }
    const lastPage = Math.max(1, Math.ceil(filteredList.length / itemsPerPage))
    if (currentPage > lastPage) {
      setCurrentPage(lastPage)
      return
    }
    if (currentItems.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }, [filteredList.length, currentItems.length, currentPage])

  // 스크롤 이동
  useEffect(() => {
    if (pendingScrollRowId == null) return

    const index = filteredList.findIndex(row => row.id === pendingScrollRowId)
    if (index === -1) {
        setPendingScrollRowId(null)
        return
    }

    const targetPage = Math.floor(index / itemsPerPage) + 1
    if (currentPage !== targetPage) {
        setCurrentPage(targetPage)
        return
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const rowElement = document.getElementById(`excel-row-${pendingScrollRowId}`)
            if (rowElement && listTableWrapperRef.current) {
                // 부모 컨테이너 내에서 스크롤 이동
                listTableWrapperRef.current.scrollTop = rowElement.offsetTop - listTableWrapperRef.current.offsetTop;
            }
            setPendingScrollRowId(null)
        })
    })
  }, [pendingScrollRowId, filteredList, currentPage])

  return (
    <div className="business-management-container">
      <div className="business-management-wrapper">
        <div className="business-management-header">
          <div className="header-left-section">
            <h2 className="page-title">사업장 관리</h2>
            <SearchBar
              searchOptions={[
                { value: 'businessName', label: '사업자명' },
                { value: 'businessNumber', label: '사업자 번호' },
                { value: 'representativeName', label: '대표자 명' }
              ]}
              searchType={searchType}
              onSearchTypeChange={setSearchType}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onSearch={handleSearch}
            />
            <div className="statistics-info">
              <span className="stat-label">총 사업장 수:</span>
              <span className="stat-value">{businessList.length}</span>
              <span className="stat-unit">개</span>
            </div>
          </div>
          <div className="header-buttons">
            <IconButton type="modify" label="신규등록" onClick={handleNew} />
            <IconButton type="delete" label="삭제" onClick={handleDelete} />
          </div>
        </div>

        <div className="business-content-layout">
          {/* 왼쪽: 사업장 목록 */}
          <div className="business-list-panel">
            <div className="list-table-wrapper" ref={listTableWrapperRef}>
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{ width: '50px' }}>No</th>
                    <th className="excel-th" style={{ width: '180px' }}>사업장명</th>
                    <th className="excel-th" style={{ width: '120px' }}>대표자명</th>
                    <th className="excel-th" style={{ width: '140px' }}>사업자번호</th>
                    <th className="excel-th" style={{ width: '140px' }}>전화번호</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{textAlign: 'center', padding: '300px 60px', color: 'rgb(156, 163, 175)', fontSize: '14px', fontWeight: '500', border: 'none'}}>
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((business, index) => (
                    <tr 
                      key={business.id}
                      id={`excel-row-${business.id}`}
                      className={`excel-tr ${selectedBusiness === business.id ? 'selected' : ''}`}
                      onClick={() => handleRowClick(business.id)}
                    >
                      <td className="excel-td excel-td-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="excel-td">{business.businessName}</td>
                      <td className="excel-td">{business.representativeName}</td>
                      <td className="excel-td">{business.businessNumber}</td>
                      <td className="excel-td">{business.phoneNumber}</td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
                itemsPerPage={itemsPerPage}
                totalItems={filteredList.length}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
            />
          </div>

          {/* 오른쪽: 상세 정보 */}
          <div className="business-detail-panel">
            <div className="detail-header">
              <div className="detail-title-wrap">
                <div className="detail-title-row">
                  <h3 className="detail-title">사업장 정보</h3>
                  <span className="detail-chip">INFO</span>
                </div>
                <div className="detail-subtext">
                  {selectedBusiness
                    ? `${formData.businessName || '사업장'} · ID ${selectedBusiness}`
                    : '신규 등록 대기'}
                </div>
              </div>
              <div className="detail-status">
                <span className="status-dot" aria-hidden="true" />
                <span className="status-text">{selectedBusiness ? '선택됨' : isInputting ? '등록중' : '대기'}</span>
              </div>
            </div>
            
            <div className="detail-content">
              <div className="detail-meta-bar">
                <span className={`badge ${selectedBusiness ? 'badge-edit' : 'badge-new'}`}>
                  {selectedBusiness ? '수정 모드' : '신규 등록'}
                </span>
                <span className="meta-text">
                  {selectedBusiness
                    ? '선택된 사업장 정보를 수정한 뒤 저장하세요.'
                    : '사업장 기본정보와 주소를 입력하세요.'}
                </span>
              </div>
              <div className="detail-main-grid">
                <div className="form-section">
                  <div className="section-title">사업장 정보</div>
                  <div className="form-group">
                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>사업장명</label>
                        <input
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={errors.businessName ? 'input-error' : ''}
                          aria-invalid={Boolean(errors.businessName)}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                        {errors.businessName && <span className="error-text">필수 입력값입니다.</span>}
                      </div>
                      
                      <div className="form-field-inline">
                        <label>대표자명</label>
                        <input
                          type="text"
                          name="representativeName"
                          value={formData.representativeName}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={errors.representativeName ? 'input-error' : ''}
                          aria-invalid={Boolean(errors.representativeName)}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                        {errors.representativeName && <span className="error-text">필수 입력값입니다.</span>}
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>사업자 번호</label>
                        <input
                          type="text"
                          name="businessNumber"
                          value={formData.businessNumber}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={errors.businessNumber ? 'input-error' : ''}
                          aria-invalid={Boolean(errors.businessNumber)}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                        {errors.businessNumber && <span className="error-text">필수 입력값입니다.</span>}
                      </div>
                      
                      <div className="form-field-inline">
                        <label>사업장코드</label>
                        <input
                          type="text"
                          name="businessCode"
                          value={formData.businessCode}
                          onChange={handleInputChange}
                          // 신규일 때만 입력 가능
                          disabled={selectedBusiness !== null}
                          readOnly={selectedBusiness !== null && !isEditMode}
                          placeholder={selectedBusiness ? "" : "예: COMP01 (필수)"}
                          style={selectedBusiness ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>종목</label>
                        <input
                          type="text"
                          name="businessType"
                          value={formData.businessType}
                          onChange={handleInputChange}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                      </div>
                      
                      <div className="form-field-inline">
                        <label>업태</label>
                        <input
                          type="text"
                          name="businessCondition"
                          value={formData.businessCondition}
                          onChange={handleInputChange}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-field-inline">
                        <label>전화번호</label>
                        <input
                          type="text"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                      </div>
                      
                      <div className="form-field-inline">
                        <label>팩스</label>
                        <input
                          type="text"
                          name="fax"
                          value={formData.fax}
                          onChange={handleInputChange}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row form-row-full">
                      <div className="form-field-inline form-field-address">
                        <div className="section-title-small">주소 정보</div>
                        <label>주소</label>
                        <div className="address-input-group">
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="주소 검색 버튼을 클릭하세요"
                            className={errors.address ? 'input-error' : ''}
                            aria-invalid={Boolean(errors.address)}
                            readOnly
                            disabled={selectedBusiness !== null && !isEditMode}
                          />
                          <button 
                            type="button"
                            className="erp-button erp-button-default address-search-btn"
                            onClick={handleAddressSearch}
                            disabled={selectedBusiness !== null && !isEditMode}
                          >
                            주소 검색
                          </button>
                        </div>
                          {errors.address && <span className="error-text">주소를 입력하세요.</span>}
                        <input
                          type="text"
                          name="addressDetail"
                          value={formData.addressDetail}
                          onChange={handleInputChange}
                          placeholder="상세주소를 입력하세요"
                          className="address-detail-input"
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="image-section">
                  <div className="section-title">이미지</div>
                  <div className="image-group">
                    <div className="image-placeholder">
                      {imagePreview ? (
                        <img src={imagePreview} alt="업로드된 이미지" />
                      ) : (
                        <span>이미지</span>
                      )}
                    </div>
                    
                    <div className="image-buttons">
                      <label className={`erp-button erp-button-default ${(selectedBusiness !== null && !isEditMode) ? 'disabled' : ''}`}>
                        이미지 선택
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          style={{ display: 'none' }}
                          disabled={selectedBusiness !== null && !isEditMode}
                        />
                      </label>
                      <button 
                        className="erp-button erp-button-default" 
                        onClick={handleImageDelete}
                        disabled={selectedBusiness !== null && !isEditMode}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="detail-footer">
                {!isEditMode && selectedBusiness ? (
                  <>
                    <button className="erp-button erp-button-primary" onClick={handleModify} style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}>
                      사업장 수정
                    </button>
                    <button className="erp-button erp-button-default" onClick={handleDelete}>삭제</button>
                  </>
                ) : (
                  <>
                    <button
                      className="erp-button erp-button-primary"
                      onClick={handleSave}
                      style={{
                        backgroundColor: selectedBusiness ? '#0ea5e9' : '#16a34a',
                        borderColor: selectedBusiness ? '#0ea5e9' : '#16a34a'
                      }}
                    >
                      {selectedBusiness ? '수정 완료' : '사업장 등록'}
                    </button>
                    <button className="erp-button erp-button-default" onClick={handleCancel} disabled={!selectedBusiness && !isInputting}>취소</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 팝업들 */}
      {showDeletePopup === true && (
        <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '18px' }}>사업장 삭제</h3>
            </div>
            <div className="popup-body" style={{ padding: '25px 20px' }}>
              <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>정말 삭제하시겠습니까?</p>
                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>사업장명:</strong> {formData.businessName}</p>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>사업자번호:</strong> {formData.businessNumber}</p>
                </div>
                <div style={{ textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <p style={{ margin: '0', color: '#991b1b', fontSize: '12px', fontWeight: '500' }}>삭제된 데이터는 복구할 수 없습니다.</p>
                </div>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center', gap: '8px' }}>
              <button className="erp-button erp-button-default" onClick={() => setShowDeletePopup(false)} style={{ width: '100px' }}>취소</button>
              <button className="erp-button erp-button-primary" onClick={handleConfirmDelete} style={{ width: '100px', background: '#ef4444', border: '1px solid #ef4444' }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {showDeletePopup === 'completed' && (
        <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '20px' }}>✓ 사업장 삭제 완료</h3>
            </div>
            <div className="popup-body" style={{ padding: '40px 30px' }}>
              <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>사업장이 성공적으로 삭제되었습니다.</p>
                <div style={{ textAlign: 'center', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>목록으로 돌아갑니다.</p>
                </div>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center' }}>
              <button className="erp-button erp-button-primary" onClick={() => setShowDeletePopup(false)} style={{ width: '120px' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {showCompletionPopup && (
        <div className="popup-overlay" onClick={() => setShowCompletionPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="popup-header" style={{
              borderBottom: isModify ? '2px solid #0ea5e9' : '2px solid #16a34a',
              background: isModify ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
            }}>
              <h3 className="popup-title" style={{ color: isModify ? '#0369a1' : '#15803d', margin: 0, fontSize: '20px' }}>✓ 사업장 {isModify ? '수정' : '등록'} 완료</h3>
            </div>
            <div className="popup-body" style={{ padding: '40px 30px' }}>
              <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>사업장이 성공적으로 {isModify ? '수정' : '등록'}되었습니다.</p>
                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                    사업장명: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.businessName}</span>
                  </p>
                  <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                    대표자: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.representativeName}</span>
                  </p>
                  <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                    사업자번호: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.businessNumber}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center' }}>
              <button
                className="erp-button erp-button-primary"
                onClick={() => setShowCompletionPopup(false)}
                style={{
                  width: '120px',
                  background: isModify ? '#0ea5e9' : undefined,
                  borderColor: isModify ? '#0ea5e9' : undefined
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default 사업장관리