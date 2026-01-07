import React, { useState, useEffect, useRef } from 'react'
// import axios from 'axios' // 삭제
import '../css/pages/management-common.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

function 창고관리() {
    const [selectedRow, setSelectedRow] = useState(null)
    const [searchType, setSearchType] = useState('whCd')
    const [searchTerm, setSearchTerm] = useState('')
    const [appliedSearchTerm, setAppliedSearchTerm] = useState('')

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25

    const listTableWrapperRef = useRef(null)
    const [pendingScrollRowId, setPendingScrollRowId] = useState(null)

    const [whTypeFilter, setWhTypeFilter] = useState('')
    const [appliedWhType, setAppliedWhType] = useState('')
    const [useFlagFilter, setUseFlagFilter] = useState('')
    const [appliedUseFlag, setAppliedUseFlag] = useState('')
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    const [isInputting, setIsInputting] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [showDeletePopup, setShowDeletePopup] = useState(false)
    const [showCompletionPopup, setShowCompletionPopup] = useState(false)
    const [isModify, setIsModify] = useState(false)

    const [dataList, setDataList] = useState([])

    const [formData, setFormData] = useState({
        whCd: '',
        whNm: '',
        whType: '01',
        useFlag: 'Y',
        remark: ''
    })

    const getWhTypeLabel = (code) => {
        switch(code) {
            case '01': return '자재';
            case '02': return '제품';
            case '03': return '자재+제품';
            case '04': return '반품';
            default: return code;
        }
    }

    // =========================================================================
    // ★ 1. 데이터 로드 (fetch 사용)
    // =========================================================================
    const fetchData = async () => {
        try {
            const query = new URLSearchParams({ keyword: searchTerm }).toString();
            const response = await fetch(`http://localhost:8080/api/whs?${query}`);
            
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setDataList(data);

        } catch (error) {
            console.error("창고 목록 조회 실패:", error);
            setDataList([]);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    // =========================================================================
    // ★ 2. 데이터 저장 (fetch 사용)
    // =========================================================================
    const handleSave = async () => {
        if (!formData.whCd || !formData.whNm) {
            alert("창고코드와 창고명은 필수입니다.");
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/whs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Save failed');

            const isModifying = isEditMode && selectedRow
            await fetchData();

            if (isModifying) {
                setIsModify(true)
            } else {
                setSelectedRow(formData.whCd)
                setPendingScrollRowId(formData.whCd)
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
            const response = await fetch(`http://localhost:8080/api/whs/${selectedRow}`, {
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

    // --- UI 핸들러 유지 ---
    useEffect(() => {
        if (selectedRow) {
            const warehouse = dataList.find(w => w.whCd === selectedRow)
            if (warehouse) {
                setFormData({
                    whCd: warehouse.whCd,
                    whNm: warehouse.whNm,
                    whType: warehouse.whType,
                    useFlag: warehouse.useFlag,
                    remark: warehouse.remark || ''
                })
            }
        } else {
            setFormData({
                whCd: '', whNm: '', whType: '01', useFlag: 'Y', remark: ''
            })
        }
    }, [selectedRow, dataList])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => {
            const nextData = { ...prev, [name]: value }
            const hasAnyValue = [nextData.whCd, nextData.whNm, nextData.remark].some(val => val && String(val).trim() !== '')
            setIsInputting(hasAnyValue)
            return nextData
        })
    }

    const handleNew = () => {
        setSelectedRow(null)
        setIsEditMode(true)
        setIsInputting(false)
        setIsCompleted(false)
        setTimeout(() => document.querySelector('input[name="whCd"]')?.focus(), 100);
    }

    const handleModify = () => {
        setIsEditMode(true)
        setIsModify(true)
    }

    const handleCancel = () => {
        if (selectedRow) {
            const warehouse = dataList.find(w => w.whCd === selectedRow)
            if (warehouse) {
                setFormData({ ...warehouse, remark: warehouse.remark || '' })
            }
            setIsEditMode(false)
        } else {
            setFormData({ whCd: '', whNm: '', whType: '01', useFlag: 'Y', remark: '' })
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

    const handleSearch = () => {
        setAppliedSearchTerm(searchTerm)
        setAppliedWhType(whTypeFilter)
        setAppliedUseFlag(useFlagFilter)
        setCurrentPage(1)
        fetchData();
    }

    const handleResetFilters = async () => {
        setSearchTerm('')
        setAppliedSearchTerm('')
        setWhTypeFilter('')
        setAppliedWhType('')
        setUseFlagFilter('')
        setAppliedUseFlag('')
        
        try {
            const response = await fetch('http://localhost:8080/api/whs?keyword=');
            if (response.ok) {
                const data = await response.json();
                setDataList(data);
            }
        } catch (error) {
            console.error(error);
        }
    }

    const filteredList = dataList.filter(warehouse => {
        if (appliedSearchTerm) {
            const term = appliedSearchTerm.toLowerCase();
            if (searchType === 'whCd' && !warehouse.whCd.toLowerCase().includes(term)) return false;
            if (searchType === 'whNm' && !warehouse.whNm.toLowerCase().includes(term)) return false;
        }
        if (appliedWhType && warehouse.whType !== appliedWhType) return false
        if (appliedUseFlag && warehouse.useFlag !== appliedUseFlag) return false
        return true
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
        const index = filteredList.findIndex(row => row.whCd === pendingScrollRowId)
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
                        <h2 className="customer-title">창고관리</h2>
                        <div className="statistics-info statistics-customer">
                            <span className="stat-label">총 창고 수:</span>
                            <span className="stat-value">{dataList.length}</span>
                            <span className="stat-unit">개</span>
                        </div>
                        <button className="filter-toggle-btn" onClick={() => setIsFilterOpen(prev => !prev)}>
                            <span style={{ fontSize: '10px', marginRight: '4px' }}>{isFilterOpen ? '▲' : '▼'}</span>
                            검색 필터
                        </button>

                        {/* 팝업 컴포넌트들 생략 (기존 코드 유지) - 닫는 태그 포함 */}
                        {showDeletePopup === true && (
                            <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
                                <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
                                    <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}><h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '18px' }}>창고 삭제</h3></div>
                                    <div className="popup-body" style={{ padding: '25px 20px' }}>
                                        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '15px' }}>
                                            <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>정말 삭제하시겠습니까?</p>
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
                                    <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}><h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '20px' }}>✓ 창고 삭제 완료</h3></div>
                                    <div className="popup-body" style={{ padding: '40px 30px' }}><div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}><p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>창고가 성공적으로 삭제되었습니다.</p><div style={{ textAlign: 'center', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>목록으로 돌아갑니다.</p></div></div></div>
                                    <div className="popup-footer" style={{ justifyContent: 'center' }}><button className="erp-button erp-button-primary" onClick={() => setShowDeletePopup(false)} style={{ width: '120px' }}>확인</button></div>
                                </div>
                            </div>
                        )}

                        {showCompletionPopup && (
                            <div className="popup-overlay" onClick={() => setShowCompletionPopup(false)}>
                                <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                                    <div className="popup-header" style={{ borderBottom: isModify ? '2px solid #0ea5e9' : '2px solid #16a34a', background: isModify ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}><h3 className="popup-title" style={{ color: isModify ? '#0369a1' : '#15803d', margin: 0, fontSize: '20px' }}>✓ 창고가 {isModify ? '수정' : '등록'}되었습니다.</h3></div>
                                    <div className="popup-body" style={{ padding: '40px 30px' }}>
                                        <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                                            <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>창고가 성공적으로 {isModify ? '수정' : '등록'}되었습니다.</p>
                                            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>창고명: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.whNm}</span></p>
                                                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>창고코드: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.whCd}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="popup-footer" style={{ justifyContent: 'center' }}><button className="erp-button erp-button-primary" onClick={() => setShowCompletionPopup(false)} style={{ width: '120px', background: isModify ? '#0ea5e9' : undefined, borderColor: isModify ? '#0ea5e9' : undefined }}>확인</button></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="header-buttons">
                        <IconButton type="modify" label="창고 등록" onClick={handleNew} />
                        <IconButton type="delete" label="삭제" onClick={handleDelete} />
                    </div>
                </div>

                <div className="customer-content-layout">
                    <div className="customer-list-panel">
                        <div className="list-table-wrapper" ref={listTableWrapperRef}>
                            <div className={`filter-slide ${isFilterOpen ? 'open' : ''}`}>
                                <div className="advanced-filter-panel">
                                    <div className="filter-row">
                                        <div className="filter-field filter-field-keyword">
                                            <label className="filter-label">키워드 검색</label>
                                            <SearchBar
                                                searchOptions={[{ value: 'whCd', label: '창고코드' }, { value: 'whNm', label: '창고명' }]}
                                                searchType={searchType}
                                                onSearchTypeChange={setSearchType}
                                                searchTerm={searchTerm}
                                                onSearchTermChange={setSearchTerm}
                                            />
                                        </div>
                                        <div className="filter-field filter-field-type">
                                            <label className="filter-label">창고 구분</label>
                                            <div className="radio-group">
                                                <label><input type="radio" name="whTypeFilter" value="" checked={whTypeFilter === ''} onChange={() => setWhTypeFilter('')} /><span>전체</span></label>
                                                <label><input type="radio" name="whTypeFilter" value="01" checked={whTypeFilter === '01'} onChange={() => setWhTypeFilter('01')} /><span>자재</span></label>
                                                <label><input type="radio" name="whTypeFilter" value="02" checked={whTypeFilter === '02'} onChange={() => setWhTypeFilter('02')} /><span>제품</span></label>
                                                <label><input type="radio" name="whTypeFilter" value="03" checked={whTypeFilter === '03'} onChange={() => setWhTypeFilter('03')} /><span>자재+제품</span></label>
                                                <label><input type="radio" name="whTypeFilter" value="04" checked={whTypeFilter === '04'} onChange={() => setWhTypeFilter('04')} /><span>반품</span></label>
                                            </div>
                                        </div>
                                        <div className="filter-field filter-field-use">
                                            <label className="filter-label">사용 여부</label>
                                            <div className="radio-group">
                                                <label><input type="radio" name="useFlagFilter" value="" checked={useFlagFilter === ''} onChange={() => setUseFlagFilter('')} /><span>전체</span></label>
                                                <label><input type="radio" name="useFlagFilter" value="Y" checked={useFlagFilter === 'Y'} onChange={() => setUseFlagFilter('Y')} /><span>사용</span></label>
                                                <label><input type="radio" name="useFlagFilter" value="N" checked={useFlagFilter === 'N'} onChange={() => setUseFlagFilter('N')} /><span>미사용</span></label>
                                            </div>
                                        </div>
                                        <div className="filter-actions">
                                            <button className="filter-search-btn" onClick={handleSearch}>검색</button>
                                            <button className="filter-reset-btn" onClick={handleResetFilters}>초기화</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <table className="excel-table" style={{ height: filteredList.length === 0 ? '100%' : 'auto' }}>
                                <thead>
                                <tr>
                                    <th className="excel-th">No</th>
                                    <th className="excel-th">창고코드</th>
                                    <th className="excel-th">창고명</th>
                                    <th className="excel-th">창고구분</th>
                                    <th className="excel-th">사용여부</th>
                                    <th className="excel-th">비고</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredList.length === 0 ? (
                                    <tr><td colSpan="6" style={{textAlign: 'center', color: 'rgb(156, 163, 175)', fontSize: '14px', fontWeight: '500', border: 'none', verticalAlign: 'middle'}}>검색 결과가 없습니다.</td></tr>
                                ) : (
                                    currentItems.map((row, index) => (
                                        <tr key={row.whCd} id={`excel-row-${row.whCd}`} className={`excel-tr ${selectedRow === row.whCd ? 'selected' : ''}`} onClick={() => handleRowClick(row.whCd)}>
                                            <td className="excel-td excel-td-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="excel-td">{row.whCd}</td>
                                            <td className="excel-td">{row.whNm}</td>
                                            <td className="excel-td">{getWhTypeLabel(row.whType)}</td>
                                            <td className="excel-td">{row.useFlag === 'Y' ? '사용' : '미사용'}</td>
                                            <td className="excel-td">{row.remark}</td>
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
                                    <h3 className="detail-title">창고 정보</h3>
                                    <span className="detail-chip">INFO</span>
                                </div>
                                <div className="detail-subtext">{selectedRow ? `${formData.whCd || '코드'} · ${formData.whNm || '창고'}` : '신규 등록 대기'}</div>
                            </div>
                            <div className="detail-status"><span className="status-dot" aria-hidden="true" /><span className="status-text">{isCompleted ? '등록완료' : selectedRow ? '선택됨' : isInputting ? '등록중' : '대기'}</span></div>
                        </div>

                        <div className="detail-content">
                            <div className="detail-meta-bar">
                                <span className={`badge ${selectedRow ? (isEditMode ? 'badge-edit' : 'badge-success') : 'badge-new'}`}>
                                    {selectedRow ? (isEditMode ? '수정 모드' : '상세 정보') : '신규 등록'}
                                </span>
                                <span className="meta-text">{selectedRow ? (isEditMode ? '선택된 창고 정보를 수정한 뒤 저장하세요.' : '창고 정보를 확인하거나 수정/삭제할 수 있습니다.') : '창고 정보(코드, 명칭, 구분, 사용여부, 비고)를 입력하세요.'}</span>
                            </div>
                            <div className="form-section">
                                <div className="section-title">창고 정보</div>
                                <div className="form-group">
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>창고코드</label><input type="text" name="whCd" value={formData.whCd} onChange={handleInputChange} disabled={selectedRow !== null} readOnly={selectedRow !== null && !isEditMode} style={selectedRow ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}} /></div>
                                        <div className="form-field-inline"><label>창고명</label><input type="text" name="whNm" value={formData.whNm} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field-inline"><label>창고구분</label><select name="whType" value={formData.whType} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode}><option value="01">자재</option><option value="02">제품</option><option value="03">자재+제품</option><option value="04">반품</option></select></div>
                                        <div className="form-field-inline"><label>사용 여부</label><select name="useFlag" value={formData.useFlag} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode}><option value="Y">사용</option><option value="N">미사용</option></select></div>
                                    </div>
                                    <div className="form-row form-row-full">
                                        <div className="form-field-inline" style={{ width: '100%' }}><label>비고</label><textarea name="remark" value={formData.remark} onChange={handleInputChange} rows="2" disabled={selectedRow !== null && !isEditMode} /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="detail-footer">
                                {!isEditMode && selectedRow ? (
                                    <><button className="erp-button erp-button-primary" onClick={handleModify} style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}>창고 수정</button><button className="erp-button erp-button-default" onClick={handleDelete}>삭제</button></>
                                ) : (
                                    <><button className="erp-button erp-button-primary" onClick={handleSave} style={{ backgroundColor: selectedRow ? '#0ea5e9' : '#16a34a', borderColor: selectedRow ? '#0ea5e9' : '#16a34a' }}>{selectedRow ? '수정 완료' : '창고 등록'}</button><button className="erp-button erp-button-default" onClick={handleCancel} disabled={!selectedRow && !isInputting}>취소</button></>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default 창고관리