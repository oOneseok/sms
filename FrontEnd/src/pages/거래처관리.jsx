import React, { useState, useEffect, useRef } from 'react'
// import axios from 'axios' // 삭제
import '../css/pages/거래처관리.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

function 거래처관리() {
    const [activeTab, setActiveTab] = useState('고객사')
    const [searchType, setSearchType] = useState('name')
    const [searchTerm, setSearchTerm] = useState('')
    const [appliedSearchTerm, setAppliedSearchTerm] = useState('')
    const [selectedRow, setSelectedRow] = useState(null)
    const [isInputting, setIsInputting] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [showDeletePopup, setShowDeletePopup] = useState(false)
    const [showCompletionPopup, setShowCompletionPopup] = useState(false)
    const [isModify, setIsModify] = useState(false)

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25

    const listTableWrapperRef = useRef(null)
    const [pendingScrollRowId, setPendingScrollRowId] = useState(null)

    const [dataList, setDataList] = useState([])

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        representative: '',
        phone: '',
        fax: '',
        contact: '',
        email: '',
        address: '',
        addressDetail: '',
        businessNumber: '',
        businessType: '',
        businessCondition: ''
    })

    const getBizFlag = (tabName) => {
        return tabName === '고객사' ? '02' : '01';
    }

    // =========================================================================
    // ★ 1. 데이터 로드 (fetch 사용)
    // =========================================================================
    const fetchData = async () => {
        try {
            const query = new URLSearchParams({
                bizFlag: getBizFlag(activeTab),
                searchText: searchTerm
            }).toString();

            const response = await fetch(`http://localhost:8080/api/cust?${query}`);
            
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            const mappedData = data.map(item => ({
                id: item.custCd,
                code: item.custCd,
                name: item.custNm,
                representative: item.presidentNm,
                phone: item.bizTel,
                fax: item.bizFax,
                contact: item.empNm,
                email: item.empEMail,
                address: item.bizAddr,
                addressDetail: '',
                businessNumber: item.bizNo,
                businessType: item.bizItem,
                businessCondition: item.bizCond
            }));

            setDataList(mappedData);

        } catch (error) {
            console.error("거래처 목록 조회 실패:", error);
            setDataList([]);
        }
    }

    useEffect(() => {
        setCurrentPage(1);
        setSelectedRow(null);
        setFormData({
            code: '', name: '', representative: '', phone: '', fax: '',
            contact: '', email: '', address: '', addressDetail: '',
            businessNumber: '', businessType: '', businessCondition: ''
        });
        fetchData();
    }, [activeTab]);

    // =========================================================================
    // ★ 2. 데이터 저장 (fetch 사용)
    // =========================================================================
    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            alert("업체코드와 업체명은 필수입니다.");
            return;
        }

        try {
            const fullAddress = formData.addressDetail
                ? `${formData.address} ${formData.addressDetail}`.trim()
                : formData.address;

            const payload = {
                custCd: formData.code,
                custNm: formData.name,
                presidentNm: formData.representative,
                bizNo: formData.businessNumber,
                bizCond: formData.businessCondition,
                bizItem: formData.businessType,
                bizAddr: fullAddress,
                bizTel: formData.phone,
                bizFax: formData.fax,
                empNm: formData.contact,
                empEMail: formData.email,
                bizFlag: getBizFlag(activeTab)
            };

            const response = await fetch('http://localhost:8080/api/cust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Save failed');

            const isModifying = isEditMode && selectedRow
            await fetchData();

            if (isModifying) {
                setIsModify(true)
            } else {
                setSelectedRow(formData.code)
                setPendingScrollRowId(formData.code)
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
    // ★ 3. 데이터 삭제 (fetch 사용)
    // =========================================================================
    const handleConfirmDelete = async () => {
        try {
            const response = await fetch(`http://localhost:8080/api/cust/${selectedRow}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Delete failed');

            await fetchData();
            setSelectedRow(null)
            setShowDeletePopup('completed')

        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제 중 오류가 발생했습니다.");
            setShowDeletePopup(false);
        }
    }

    // --- UI 핸들러는 그대로 유지 ---
    useEffect(() => {
        if (selectedRow) {
            const customer = dataList.find(c => c.id === selectedRow)
            if (customer) {
                setFormData({
                    code: customer.code,
                    name: customer.name,
                    representative: customer.representative,
                    phone: customer.phone,
                    fax: customer.fax,
                    contact: customer.contact,
                    email: customer.email,
                    address: customer.address,
                    addressDetail: customer.addressDetail,
                    businessNumber: customer.businessNumber,
                    businessType: customer.businessType,
                    businessCondition: customer.businessCondition
                })
            }
        } else {
            setFormData({
                code: '', name: '', representative: '', phone: '', fax: '',
                contact: '', email: '', address: '', addressDetail: '',
                businessNumber: '', businessType: '', businessCondition: ''
            })
        }
    }, [selectedRow, dataList])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => {
            const nextData = { ...prev, [name]: value }
            const hasAnyValue = Object.values(nextData).some(val => val && String(val).trim() !== '')
            setIsInputting(hasAnyValue)
            return nextData
        })
    }

    const handleAddressSearch = () => {
        if (!window.daum || !window.daum.Postcode) {
            alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
            return
        }

        new window.daum.Postcode({
            oncomplete: function(data) {
                let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
                setFormData(prev => ({ ...prev, address: addr, addressDetail: '' }))
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

    const handleNew = () => {
        setSelectedRow(null)
        setIsEditMode(true)
        setIsInputting(false)
        setIsCompleted(false)
        setTimeout(() => document.querySelector('input[name="code"]')?.focus(), 100);
    }

    const handleModify = () => {
        if (selectedRow) {
            setIsEditMode(true)
            setIsCompleted(false)
        }
    }

    const handleCancel = () => {
        if (selectedRow) {
            setIsEditMode(false)
            setIsCompleted(false)
            const customer = dataList.find(c => c.id === selectedRow)
            if (customer) {
                setFormData({ ...customer, addressDetail: '' })
            }
        } else {
            setFormData({
                code: '', name: '', representative: '', phone: '', fax: '',
                contact: '', email: '', address: '', addressDetail: '',
                businessNumber: '', businessType: '', businessCondition: ''
            })
            setIsInputting(false)
            setIsEditMode(false)
        }
    }

    const handleDelete = () => {
        if (!selectedRow) {
            alert('삭제할 항목을 선택해주세요.')
            return
        }
        setShowDeletePopup(true)
    }

    const handleRowClick = (rowId) => {
        setSelectedRow(rowId)
        setIsEditMode(false)
        setIsInputting(false)
        setIsCompleted(false)
    }

    const detailLabel = activeTab === '고객사' ? '고객사' : '구매처'

    const handleSearch = () => {
        setAppliedSearchTerm(searchTerm)
        setCurrentPage(1)
        fetchData();
    }

    const filteredList = dataList.filter(customer => {
        if (!appliedSearchTerm) return true
        switch (searchType) {
            case 'code': return customer.code.includes(appliedSearchTerm)
            case 'name': return customer.name.includes(appliedSearchTerm)
            case 'representative': return customer.representative.includes(appliedSearchTerm)
            default: return true
        }
    })

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem)

    useEffect(() => {
        if (filteredList.length === 0) {
            if (currentPage !== 1) setCurrentPage(1)
            return
        }
        const lastPage = Math.max(1, Math.ceil(filteredList.length / itemsPerPage))
        if (currentPage > lastPage) setCurrentPage(lastPage)
        if (currentItems.length === 0 && currentPage > 1) setCurrentPage(currentPage - 1)
    }, [filteredList.length, currentItems.length, currentPage])

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
                if (rowElement) rowElement.scrollIntoView({ block: 'end' })
                else if (listTableWrapperRef.current) listTableWrapperRef.current.scrollTop = listTableWrapperRef.current.scrollHeight
                setPendingScrollRowId(null)
            })
        })
    }, [pendingScrollRowId, filteredList, currentPage])

    return (
        <div className="customer-management-container">
            <div className="customer-management-wrapper">
                <div className="customer-header">
                    <div className="header-left-section">
                        <h2 className="customer-title">거래처 관리</h2>
                        <div className="tab-buttons">
                            <button className={`tab-button ${activeTab === '고객사' ? 'active' : ''}`} onClick={() => setActiveTab('고객사')}>고객사</button>
                            <button className={`tab-button ${activeTab === '구매처' ? 'active' : ''}`} onClick={() => setActiveTab('구매처')}>구매처</button>
                        </div>
                        <SearchBar
                            searchOptions={[{ value: 'code', label: '업체코드' }, { value: 'name', label: '업체명' }, { value: 'representative', label: '대표자명' }]}
                            searchType={searchType}
                            onSearchTypeChange={setSearchType}
                            searchTerm={searchTerm}
                            onSearchTermChange={setSearchTerm}
                            onSearch={handleSearch}
                        />
                        <div className={`statistics-info ${activeTab === '고객사' ? 'statistics-customer' : 'statistics-vendor'}`}>
                            <span className="stat-label">총 {activeTab} 수:</span>
                            <span className="stat-value">{dataList.length}</span>
                            <span className="stat-unit">개</span>
                        </div>
                    </div>
                    <div className="header-buttons">
                        <IconButton type="modify" label={`${detailLabel} 등록`} onClick={handleNew} />
                        <IconButton type="delete" label="삭제" onClick={handleDelete} />
                    </div>
                </div>

                <div className="customer-content-layout">
                    <div className="customer-list-panel">
                        <div className="list-table-wrapper" ref={listTableWrapperRef}>
                            <table className="excel-table">
                                <thead>
                                <tr>
                                    <th className="excel-th">No</th>
                                    <th className="excel-th">업체코드</th>
                                    <th className="excel-th">업체명</th>
                                    <th className="excel-th">대표자명</th>
                                    <th className="excel-th">전화번호</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredList.length === 0 ? (
                                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '300px 60px', color: 'rgb(156, 163, 175)', fontSize: '14px', fontWeight: '500', border: 'none'}}>검색 결과가 없습니다.</td></tr>
                                ) : (
                                    currentItems.map((row, index) => (
                                        <tr key={row.id} id={`excel-row-${row.id}`} className={`excel-tr ${selectedRow === row.id ? 'selected' : ''}`} onClick={() => handleRowClick(row.id)}>
                                            <td className="excel-td excel-td-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="excel-td">{row.code}</td>
                                            <td className="excel-td">{row.name}</td>
                                            <td className="excel-td">{row.representative}</td>
                                            <td className="excel-td">{row.phone}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                            <Pagination itemsPerPage={itemsPerPage} totalItems={filteredList.length} currentPage={currentPage} onPageChange={setCurrentPage} />
                        </div>
                    </div>

                    <div className="customer-detail-panel">
                        <div className="detail-header">
                            <div className="detail-title-wrap">
                                <div className="detail-title-row">
                                    <h3 className="detail-title">{detailLabel} 정보</h3>
                                    <span className="detail-chip">INFO</span>
                                </div>
                                <div className="detail-subtext">
                                    {selectedRow ? `${formData.name || '거래처'} · ${formData.representative || '대표자'}` : '신규 등록 대기'}
                                </div>
                            </div>
                            <div className="detail-status">
                                <span className="status-dot" aria-hidden="true" />
                                <span className="status-text">{isCompleted ? '등록 완료' : selectedRow ? '선택됨' : isInputting ? '등록중' : '대기'}</span>
                            </div>
                        </div>

                        <div className="detail-content">
                            <div className="detail-meta-bar">
                                <span className={`badge ${isCompleted ? 'badge-success' : selectedRow ? 'badge-edit' : 'badge-new'}`}>
                                    {isCompleted ? '등록 완료' : selectedRow ? '수정 모드' : '신규 등록'}
                                </span>
                                <span className="meta-text">
                                    {isCompleted ? `${detailLabel}가 성공적으로 등록되었습니다.` : selectedRow ? `선택된 ${detailLabel} 정보를 확인하거나 수정할 수 있습니다.` : `${detailLabel} 기본정보를 입력하세요.`}
                                </span>
                            </div>
                            <div className="form-section">
                                <div className="section-title-row">
                                    <div><div className="section-title">{detailLabel} 정보</div><div className="section-subtext">{detailLabel} 식별 및 기본 정보</div></div>
                                    <div className="pill pill-soft">{formData.code || 'NEW'}</div>
                                </div>
                                <div className="form-group">
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>업체코드</label><input type="text" name="code" value={formData.code} onChange={handleInputChange} readOnly={selectedRow !== null && !isEditMode} disabled={selectedRow !== null} placeholder="예: CUST01" style={{ background: selectedRow ? '#f3f4f6' : '#fff', cursor: selectedRow ? 'not-allowed' : 'text' }} /></div>
                                        <div className="form-field-inline"><label>업체명</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>대표자명</label><input type="text" name="representative" value={formData.representative} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                        <div className="form-field-inline"><label>사업자 번호</label><input type="text" name="businessNumber" value={formData.businessNumber} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>종목</label><input type="text" name="businessType" value={formData.businessType} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                        <div className="form-field-inline"><label>업태</label><input type="text" name="businessCondition" value={formData.businessCondition} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>전화번호</label><input type="text" name="phone" value={formData.phone} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                        <div className="form-field-inline"><label>팩스</label><input type="text" name="fax" value={formData.fax} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>담당자</label><input type="text" name="contact" value={formData.contact} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                        <div className="form-field-inline"><label>이메일</label><input type="text" name="email" value={formData.email} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                    <div className="form-row form-row-full">
                                        <div className="form-field-inline form-field-address">
                                            <div className="section-title-small">주소 정보</div>
                                            <label>주소</label>
                                            <div className="address-input-group">
                                                <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="주소 검색 버튼을 클릭하세요" readOnly disabled={selectedRow !== null && !isEditMode} />
                                                <button type="button" className="erp-button erp-button-default address-search-btn" onClick={handleAddressSearch} disabled={selectedRow !== null && !isEditMode}>주소 검색</button>
                                            </div>
                                            <input type="text" name="addressDetail" value={formData.addressDetail} onChange={handleInputChange} placeholder="상세주소를 입력하세요" className="address-detail-input" disabled={selectedRow !== null && !isEditMode} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="detail-footer">
                                {!isEditMode && selectedRow ? (
                                    <><button className="erp-button erp-button-primary" onClick={handleModify}>{detailLabel} 수정</button><button className="erp-button erp-button-default" onClick={handleDelete}>삭제</button></>
                                ) : (
                                    <><button className="erp-button erp-button-primary" onClick={handleSave} style={!selectedRow ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : undefined}>{selectedRow ? '수정 완료' : `${detailLabel} 등록`}</button><button className="erp-button erp-button-default" onClick={handleCancel} disabled={!selectedRow && !isInputting}>취소</button></>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 팝업들 (삭제 확인, 완료 등) */}
            {showDeletePopup === true && (
                <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}><h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '18px' }}>{detailLabel} 삭제</h3></div>
                        <div className="popup-body" style={{ padding: '25px 20px' }}>
                            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '15px' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>정말 삭제하시겠습니까?</p>
                                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                                    <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>업체코드:</strong> {formData.code}</p>
                                    <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>업체명:</strong> {formData.name}</p>
                                </div>
                                <div style={{ textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}><p style={{ margin: '0', color: '#991b1b', fontSize: '12px', fontWeight: '500' }}>삭제된 데이터는 복구할 수 없습니다.</p></div>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', gap: '8px' }}><button className="erp-button erp-button-default" onClick={() => setShowDeletePopup(false)} style={{ width: '100px' }}>취소</button><button className="erp-button erp-button-primary" onClick={handleConfirmDelete} style={{ width: '100px', background: '#ef4444', border: '1px solid #ef4444' }}>삭제</button></div>
                    </div>
                </div>
            )}

            {showDeletePopup === 'completed' && (
                <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}><h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '20px' }}>✓ {detailLabel} 삭제 완료</h3></div>
                        <div className="popup-body" style={{ padding: '40px 30px' }}><div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}><p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>{detailLabel}가 성공적으로 삭제되었습니다.</p><div style={{ textAlign: 'center', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>목록으로 돌아갑니다.</p></div></div></div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}><button className="erp-button erp-button-primary" onClick={() => setShowDeletePopup(false)} style={{ width: '120px' }}>확인</button></div>
                    </div>
                </div>
            )}

            {showCompletionPopup && (
                <div className="popup-overlay" onClick={() => setShowCompletionPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: isModify ? '2px solid #0ea5e9' : '2px solid #16a34a', background: isModify ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}><h3 className="popup-title" style={{ color: isModify ? '#0369a1' : '#15803d', margin: 0, fontSize: '20px' }}>✓ {detailLabel} {isModify ? '수정' : '등록'} 완료</h3></div>
                        <div className="popup-body" style={{ padding: '40px 30px' }}>
                            <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>{detailLabel}가 성공적으로 {isModify ? '수정' : '등록'}되었습니다.</p>
                                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>업체명: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.name}</span></p>
                                    <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>업체코드: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.code}</span></p>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}><button className="erp-button erp-button-primary" onClick={() => setShowCompletionPopup(false)} style={{ width: '120px' }}>확인</button></div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default 거래처관리