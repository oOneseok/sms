import React, { useState, useEffect, useRef } from 'react'
import '../css/pages/management-common.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

const PRODUCT_UNIT_OPTIONS = ['개', '박스', '세트']
const MATERIAL_UNIT_OPTIONS = ['kg', 'g', 'L', 'mL', 'm', 'cm', '개', '박스', '롤', '포']

function 품목관리() {
    const [activeTab, setActiveTab] = useState('제품')
    const [selectedRow, setSelectedRow] = useState(null)
    const [searchType, setSearchType] = useState('itemCd')
    const [searchTerm, setSearchTerm] = useState('')
    const [appliedSearchTerm, setAppliedSearchTerm] = useState('')

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
    const [categoryTree, setCategoryTree] = useState([])

    const [showCategoryPopup, setShowCategoryPopup] = useState(false)
    const [categoryFormData, setCategoryFormData] = useState({ parentType: '', parentName: '최상위 Root', typeCd: '', typeNm: '' })
    const [isCategoryTreeOpen, setIsCategoryTreeOpen] = useState(false)

    const [showCategorySelectPopup, setShowCategorySelectPopup] = useState(false)
    const [expandedNodeIds, setExpandedNodeIds] = useState([])

    const [formData, setFormData] = useState({
        itemCd: '',
        itemNm: '',
        itemSpec: '',
        itemUnit: '',
        itemCost: '',
        typeCd: '',
        typePath: ''
    })

    const getFlagFromTab = (tabName) => {
        return tabName === '자재' ? '01' : '02';
    }

    // =========================================================================
    // ★ 1. 데이터 로드 (fetch 사용)
    // =========================================================================
    useEffect(() => {
        // 1. 검색 조건 리셋
        setSearchType('itemCd');
        setSearchTerm('');
        setAppliedSearchTerm('');
        setCurrentPage(1);
        setSelectedRow(null);
        resetForm();
        
        // 2. 데이터 새로고침 (검색어 없이)
        fetchCategoryTree();
        fetchItems(true); // true = 검색어 무시하고 전체 조회
    }, [activeTab]);

    const fetchItems = async (isReset = false) => {
        try {
            // isReset이 true면 빈 문자열 사용, 아니면 현재 입력된 검색어 사용
            const queryText = isReset ? '' : searchTerm;
            const query = new URLSearchParams({ searchText: queryText }).toString();
            
            const response = await fetch(`http://localhost:8080/api/item?${query}`);
            
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            const currentFlag = getFlagFromTab(activeTab);
            const filteredData = data.filter(item => item.itemFlag === currentFlag);

            setDataList(filteredData);
        } catch (error) {
            console.error("품목 목록 조회 실패:", error);
            setDataList([]);
        }
    }

    const fetchCategoryTree = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/item-types');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setCategoryTree(data);
        } catch (error) {
            console.error("분류 트리 조회 실패:", error);
        }
    }

    // =========================================================================
    // ★ 2. 품목 저장 (fetch 사용)
    // =========================================================================
    const handleSave = async () => {
        if (!formData.itemCd || !formData.itemNm) {
            alert("품목코드와 품목명은 필수입니다.");
            return;
        }

        try {
            const payload = {
                itemCd: formData.itemCd,
                itemNm: formData.itemNm,
                itemSpec: formData.itemSpec,
                itemUnit: formData.itemUnit,
                itemCost: formData.itemCost ? Number(formData.itemCost) : 0,
                typeCd: formData.typeCd || null,
                itemFlag: getFlagFromTab(activeTab),
            };

            // POST 요청
            const response = await fetch('http://localhost:8080/api/item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Save failed');

            const isModifying = isEditMode && selectedRow;
            setIsModify(isModifying);

            await fetchItems();

            if (!isModifying) {
                setSelectedRow(formData.itemCd);
                setPendingScrollRowId(formData.itemCd);
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
    // ★ 3. 품목 삭제 (fetch 사용)
    // =========================================================================
    const handleConfirmDelete = async () => {
        try {
            const response = await fetch(`http://localhost:8080/api/item/${selectedRow}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Delete failed');

            await fetchItems();
            setSelectedRow(null);
            setShowDeletePopup('completed');

        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제 중 오류가 발생했습니다.");
            setShowDeletePopup(false);
        }
    }

    const handleDelete = () => {
        if (!selectedRow) {
            alert('삭제할 항목을 선택해주세요.')
            return
        }
        setShowDeletePopup(true)
    }

    // =========================================================================
    // ★ 4. 분류 저장 (fetch 사용)
    // =========================================================================
    const handleCategorySave = async () => {
        if (!categoryFormData.typeCd || !categoryFormData.typeNm) {
            alert("분류 코드와 명칭은 필수입니다.");
            return;
        }

        try {
            const payload = {
                typeCd: categoryFormData.typeCd,
                typeNm: categoryFormData.typeNm,
                parentType: categoryFormData.parentType || null
            };

            const response = await fetch('http://localhost:8080/api/item-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Category save failed');

            alert("분류가 저장되었습니다.");
            setShowCategoryPopup(false);
            setCategoryFormData({ parentType: '', parentName: '최상위 Root', typeCd: '', typeNm: '' });
            fetchCategoryTree();

        } catch (error) {
            console.error("분류 저장 실패:", error);
            alert("분류 저장 중 오류가 발생했습니다.");
        }
    }

    const handleCategoryDelete = async (typeCd, e) => {
        e.stopPropagation(); // 부모 선택 이벤트 방지
        if (!window.confirm("정말 삭제하시겠습니까?\n하위 분류가 있다면 함께 삭제되거나 오류가 발생할 수 있습니다.")) return;

        try {
            const response = await fetch(`http://localhost:8080/api/item-types/${typeCd}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Delete failed');

            alert("삭제되었습니다.");
            fetchCategoryTree(); // 트리 새로고침
            if (categoryFormData.parentType === typeCd) {
                setCategoryFormData(prev => ({ ...prev, parentType: '', parentName: '최상위 Root' }));
            }
        } catch (error) {
            console.error("분류 삭제 실패:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    }

    // --- 이하 UI 핸들러는 그대로 유지 ---
    const resetForm = () => {
        setFormData({
            itemCd: '', itemNm: '', itemSpec: '', itemUnit: '', itemCost: '',
            typeCd: '', typePath: ''
        });
        setIsInputting(false);
    }

    const handleRowClick = (rowId) => {
        setSelectedRow(rowId);
        setIsEditMode(false);
        const selectedItem = dataList.find(item => item.itemCd === rowId);
        if (selectedItem) {
            setFormData({
                itemCd: selectedItem.itemCd,
                itemNm: selectedItem.itemNm,
                itemSpec: selectedItem.itemSpec || '',
                itemUnit: selectedItem.itemUnit || '',
                itemCost: selectedItem.itemCost || '',
                typeCd: selectedItem.typeCd || '',
                typePath: selectedItem.typePath || ''
            });
        }
    };

    const handleNew = () => {
        setSelectedRow(null);
        setIsEditMode(true);
        resetForm();
        setIsCompleted(false);
        setTimeout(() => document.querySelector('input[name="itemCd"]')?.focus(), 100);
    }

    const handleModify = () => {
        if (selectedRow) {
            setIsEditMode(true);
            setIsCompleted(false);
        }
    }

    const handleCancel = () => {
        if (selectedRow) {
            setIsEditMode(false);
            handleRowClick(selectedRow);
        } else {
            handleNew();
            setIsEditMode(false);
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const nextData = { ...prev, [name]: value };
            const hasAnyValue = Object.values(nextData).some(val => val && String(val).trim() !== '');
            setIsInputting(hasAnyValue);
            return nextData;
        });
    }

    const handleSearch = () => {
        setAppliedSearchTerm(searchTerm);
        setCurrentPage(1);
        fetchItems();
    }

    const toggleNode = (nodeId, e) => {
        e.stopPropagation()
        setExpandedNodeIds(prev =>
            prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
        )
    }

    const renderSearchInput = () => {
        if (searchType === 'typeNm') {
            return (
                <div className="search-input-wrapper" style={{ display: 'flex', gap: '5px', flex: 1 }}>
                    <input 
                        type="text" 
                        className="search-input"
                        value={searchTerm} 
                        readOnly 
                        placeholder="분류를 선택하세요" 
                        onClick={() => setShowCategorySelectPopup(true)} // 팝업 재사용
                        style={{ cursor: 'pointer', backgroundColor: '#f9fafb' }}
                    />
                    <button 
                        className="filter-reset-btn" 
                        onClick={() => { setSearchTerm(''); setAppliedSearchTerm(''); }}
                        style={{ padding: '0 8px', minWidth: 'auto' }}
                        title="분류 초기화"
                    >
                        ✕
                    </button>
                </div>
            );
        }
        
        return (
            <input 
                type="text" 
                className="search-input"
                placeholder="검색어를 입력하세요" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                }}
            />
        );
    }

    const renderCategoryTree = (nodes, depth = 0, onSelect, parentPath = [], isManageMode = false) => {
        return nodes.map(node => {
            const currentPath = [...parentPath, node.typeNm];
            const isExpanded = expandedNodeIds.includes(node.typeCd);
            const hasChildren = node.children && node.children.length > 0;
            
            // 관리 모드일 때 현재 선택된 상위 분류인지 확인
            const isSelectedParent = isManageMode && categoryFormData.parentType === node.typeCd;

            return (
                <div key={node.typeCd} className="category-tree-node">
                    <div
                        className={`category-tree-node-content ${isSelectedParent ? 'selected-parent' : ''}`}
                        onClick={() => onSelect(node, currentPath)}
                        style={{ paddingLeft: `${depth * 15 + 8}px` }} // 들여쓰기 조정
                    >
                        <span
                            onClick={(e) => hasChildren && toggleNode(node.typeCd, e)}
                            className="tree-toggle-icon"
                            style={{ cursor: hasChildren ? 'pointer' : 'default', visibility: hasChildren ? 'visible' : 'hidden' }}
                        >
                            {isExpanded ? '▼' : '▶'}
                        </span>
                        <span className="tree-icon">
                            {hasChildren ? (isExpanded ? '📂' : '📁') : '📄'}
                        </span>
                        <span className="tree-label">{node.typeNm}</span>
                        
                        {/* ✅ 관리 모드일 때만 삭제 버튼 표시 */}
                        {isManageMode && (
                            <button 
                                className="tree-delete-btn"
                                onClick={(e) => handleCategoryDelete(node.typeCd, e)}
                                title="삭제"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                    {hasChildren && isExpanded && (
                        <div>{renderCategoryTree(node.children, depth + 1, onSelect, currentPath, isManageMode)}</div>
                    )}
                </div>
            )
        })
    }

    const handleCategorySelect = (node, path) => {
        const formattedPath = path.join('›');
        
        if (searchType === 'typeNm' && !isInputting && !selectedRow) {
            setSearchTerm(node.typeNm); // 화면 표시용 (또는 formattedPath)
            setAppliedSearchTerm(node.typeNm); // 실제 필터링용
            setShowCategorySelectPopup(false);
            setCurrentPage(1); // 1페이지로 이동
            return;
        }

        // 2. 입력 모드일 때 (기존 로직)
        setFormData(prev => ({ ...prev, typeCd: node.typeCd, typePath: formattedPath }));
        setShowCategorySelectPopup(false);
        setIsInputting(true);
    }

    const handleParentCategorySelect = (node) => {
        setCategoryFormData(prev => ({ ...prev, parentType: node.typeCd, parentName: node.typeNm }));
        setIsCategoryTreeOpen(false);
    }

    const filteredList = dataList.filter(item => {
        if (!appliedSearchTerm) return true;
        const term = appliedSearchTerm.toLowerCase();
        
        if (searchType === 'itemCd') return item.itemCd.toLowerCase().includes(term);
        if (searchType === 'itemNm') return item.itemNm.toLowerCase().includes(term);
        
        if (searchType === 'typeNm') {
            return item.typePath && item.typePath.toLowerCase().includes(term);
        }
        
        return true;
    });

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem)

    useEffect(() => {
        if (filteredList.length === 0) {
            if (currentPage !== 1) setCurrentPage(1);
            return;
        }
        const lastPage = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
        if (currentPage > lastPage) setCurrentPage(lastPage);
    }, [filteredList.length, itemsPerPage, currentPage]);

    useEffect(() => {
        if (pendingScrollRowId == null) return
        const index = filteredList.findIndex(row => row.itemCd === pendingScrollRowId)
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
    }, [pendingScrollRowId, filteredList, currentPage, itemsPerPage]);

    const renderCategoryPath = (path) => {
        if (!path) return null;
        const parts = path.split(' > ');
        return (
            <div className="category-path-cell">
                {parts.map((part, index) => (
                    <React.Fragment key={index}>
                        <span>{part}</span>
                        {index < parts.length - 1 && <span className="path-separator">›</span>}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const currentUnitOptions = activeTab === '제품' ? PRODUCT_UNIT_OPTIONS : MATERIAL_UNIT_OPTIONS;

    return (
        <div className="customer-management-container">
            <div className="customer-management-wrapper">
                <div className="customer-header">
                    <div className="header-left-section">
                        <h2 className="customer-title">품목관리</h2>
                        <div className="tab-buttons">
                            <button className={`tab-button ${activeTab === '제품' ? 'active' : ''}`} onClick={() => setActiveTab('제품')}>제품</button>
                            <button className={`tab-button ${activeTab === '자재' ? 'active' : ''}`} onClick={() => setActiveTab('자재')}>자재</button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                            {/* 커스텀 검색바 */}
                            <div className="search-bar-container" style={{ display: 'flex', gap: '0', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden', height: '32px', flex: 1, maxWidth: '400px' }}>
                                <select 
                                    value={searchType} 
                                    onChange={(e) => {
                                        setSearchType(e.target.value);
                                        setSearchTerm('');
                                        setAppliedSearchTerm('');
                                    }}
                                    style={{ border: 'none', borderRight: '1px solid #d1d5db', padding: '0 8px', fontSize: '12px', outline: 'none', backgroundColor: '#f9fafb' }}
                                >
                                    <option value="itemCd">품목코드</option>
                                    <option value="itemNm">품목명</option>
                                    
                                    {/* ✅ [수정] '자재' 탭일 때만 '분류' 검색 옵션 노출 */}
                                    {activeTab === '자재' && (
                                        <option value="typeNm">분류</option>
                                    )}
                                </select>
                                
                                {renderSearchInput()}
                                
                                <button 
                                    onClick={handleSearch}
                                    style={{ border: 'none', background: '#ffffff', padding: '0 10px', cursor: 'pointer', borderLeft: '1px solid #d1d5db' }}
                                >
                                    조회
                                </button>
                            </div>
                        </div>
                        <div className={`statistics-info ${activeTab === '제품' ? 'statistics-customer' : 'statistics-vendor'}`}>
                            <span className="stat-label">총 {activeTab} 수:</span>
                            <span className="stat-value">{dataList.length}</span>
                            <span className="stat-unit">개</span>
                        </div>
                    </div>
                    <div className="header-buttons">
                        <IconButton type="new" label={activeTab === '제품' ? '제품 등록' : '자재 등록'} onClick={handleNew} />
                        <IconButton type="delete" label="삭제" onClick={handleDelete} />
                    </div>
                </div>

                <div className="customer-content-layout">
                    <div className="customer-list-panel">
                        <div className="list-table-wrapper" ref={listTableWrapperRef}>
                            <table className="excel-table">
                                <thead>
                                <tr>
                                    <th className="excel-th" style={{ width: '50px' }}>No</th>
                                    <th className="excel-th" style={{ width: '120px' }}>품목코드</th>
                                    <th className="excel-th">품목명</th>
                                    {activeTab === '자재' && <th className="excel-th" style={{ width: '250px' }}>분류 경로</th>}
                                    <th className="excel-th" style={{ width: '150px' }}>규격</th>
                                    <th className="excel-th" style={{ width: '80px' }}>단위</th>
                                    <th className="excel-th" style={{ width: '100px' }}>단가</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredList.length === 0 ? (
                                    <tr><td colSpan={activeTab === '자재' ? 7 : 6} style={{textAlign: 'center', padding: '300px 60px', color: 'rgb(156, 163, 175)', fontSize: '14px', fontWeight: '500', border: 'none'}}>검색 결과가 없습니다.</td></tr>
                                ) : (
                                    currentItems.map((row, index) => (
                                        <tr key={row.itemCd} id={`excel-row-${row.itemCd}`} className={`excel-tr ${selectedRow === row.itemCd ? 'selected' : ''}`} onClick={() => handleRowClick(row.itemCd)}>
                                            <td className="excel-td excel-td-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="excel-td">{row.itemCd}</td>
                                            <td className="excel-td">{row.itemNm}</td>
                                            {activeTab === '자재' && <td className="excel-td" style={{ textAlign: 'left' }}>{renderCategoryPath(row.typePath)}</td>}
                                            <td className="excel-td">{row.itemSpec}</td>
                                            <td className="excel-td">{row.itemUnit}</td>
                                            <td className="excel-td">{row.itemCost ? Number(row.itemCost).toLocaleString() : '0'}</td>
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
                                    <h3 className="detail-title">{activeTab} 정보</h3>
                                    <span className="detail-chip">INFO</span>
                                </div>
                                <div className="detail-subtext">
                                    {selectedRow ? `${formData.itemCd} · ${formData.itemNm}` : '신규 등록 대기'}
                                </div>
                            </div>
                            <div className="detail-status">
                                <span className="status-dot" aria-hidden="true" />
                                <span className="status-text">{isCompleted ? '등록 완료' : selectedRow ? '선택됨' : isInputting ? '작성중' : '대기'}</span>
                            </div>
                        </div>

                        <div className="detail-content">
                            <div className="detail-meta-bar">
                                <span className={`badge ${isCompleted ? 'badge-success' : selectedRow ? 'badge-edit' : 'badge-new'}`}>
                                    {isCompleted ? '등록 완료' : selectedRow ? '수정 모드' : '신규 등록'}
                                </span>
                                <span className="meta-text">
                                    {isCompleted ? `${activeTab}${activeTab === '제품' ? '이' : '가'} 성공적으로 등록되었습니다.` : selectedRow ? `선택된 ${activeTab} 정보를 확인하거나 수정할 수 있습니다.` : `${activeTab} 기본정보와 규격, 단가를 입력하세요.`}
                                </span>
                            </div>
                            <div className="form-section">
                                <div className="section-title-row">
                                    <div><div className="section-title">{activeTab} 정보</div><div className="section-subtext">{activeTab} 식별 및 기본 정보</div></div>
                                    <div className="pill pill-soft">{formData.itemCd || 'NEW'}</div>
                                </div>
                                <div className="form-group">
                                    {activeTab === '자재' && (
                                        <div className="form-row">
                                            <div className="form-field-inline">
                                                <label>분류</label>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                <input 
                                                    type="text" 
                                                    value={formData.typePath || ''} 
                                                    readOnly 
                                                    placeholder="클릭하여 분류 선택" 
                                                    onClick={() => { if (!selectedRow || isEditMode) setShowCategorySelectPopup(true) }} 
                                                    style={{ 
                                                        cursor: (!selectedRow || isEditMode) ? 'pointer' : 'default', 
                                                        backgroundColor: (!selectedRow || isEditMode) ? '#ffffff' : '#f3f4f6',
                                                        flex: 1 // input이 남은 공간 차지하도록
                                                    }} 
                                                    disabled={selectedRow !== null && !isEditMode} 
                                                />
                                                {/* 분류 관리 버튼 추가 (수정 모드이거나 신규 등록일 때, 혹은 항상 보이게 할지 결정. 보통은 관리 버튼이므로 항상 보여도 됨) */}
                                                <button 
                                                    className="erp-button erp-button-default" 
                                                    style={{ padding: '0 8px', minWidth: '70px' }} 
                                                    onClick={() => setShowCategoryPopup(true)}
                                                >
                                                    분류 관리
                                                </button>
                                            </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <div className="form-field-inline">
                                            <label>품목코드 <span style={{color:'red'}}>*</span></label>
                                            <input type="text" name="itemCd" value={formData.itemCd} onChange={handleInputChange} readOnly={!!selectedRow} placeholder="필수 입력" disabled={selectedRow !== null} style={selectedRow ? { background: '#f3f4f6' } : {}} />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>품목명 <span style={{color:'red'}}>*</span></label>
                                            <input type="text" name="itemNm" value={formData.itemNm} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-field-inline">
                                            <label>규격</label>
                                            <input type="text" name="itemSpec" value={formData.itemSpec} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>단위</label>
                                            <select name="itemUnit" value={formData.itemUnit} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                                                <option value="">선택</option>
                                                {currentUnitOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-field-inline">
                                            <label>단가</label>
                                            <input type="number" name="itemCost" value={formData.itemCost} onChange={handleInputChange} disabled={selectedRow !== null && !isEditMode} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="detail-footer">
                                {!isEditMode && selectedRow ? (
                                    <><button className="erp-button erp-button-primary" onClick={handleModify} style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}>품목 수정</button><button className="erp-button erp-button-default" onClick={handleDelete}>삭제</button></>
                                ) : (
                                    <><button className="erp-button erp-button-primary" onClick={handleSave} style={{ backgroundColor: selectedRow ? '#0ea5e9' : '#16a34a', borderColor: selectedRow ? '#0ea5e9' : '#16a34a' }}>{selectedRow ? '수정 완료' : `${activeTab} 등록`}</button><button className="erp-button erp-button-default" onClick={handleCancel} disabled={!selectedRow && !isInputting}>취소</button></>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 팝업들 (분류 추가, 선택, 삭제, 완료 등) */}
            {showCategoryPopup && (
                <div className="popup-overlay" onClick={() => setShowCategoryPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: '600px' }}>
                        <div className="popup-header">
                            <h3 className="popup-title">분류 관리</h3>
                            <button className="popup-close-btn" onClick={() => setShowCategoryPopup(false)}>×</button>
                        </div>
                        
                        <div className="popup-body" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            
                            {/* 상단: 트리 영역 (스크롤 가능) */}
                            <div className="category-manage-tree-area">
                                <div className="tree-header">
                                    <span>분류 목록 (삭제하려면 휴지통 클릭 / 추가하려면 상위분류 선택)</span>
                                </div>
                                <div className="tree-content">
                                    <div 
                                        className={`category-tree-node-content ${categoryFormData.parentType === '' ? 'selected-parent' : ''}`}
                                        onClick={() => handleParentCategorySelect({ typeCd: '', typeNm: '최상위 Root' })}
                                        style={{ paddingLeft: '8px', fontWeight: 'bold' }}
                                    >
                                        <span className="tree-icon">📁</span> 최상위 Root (선택 시 최상위에 추가)
                                    </div>
                                    {renderCategoryTree(categoryTree, 0, handleParentCategorySelect, [], true)}
                                </div>
                            </div>

                            {/* 하단: 입력 영역 (고정) */}
                            <div className="category-manage-input-area">
                                <div className="input-header-row">
                                    <strong>신규 분류 추가</strong>
                                    <span style={{fontSize:'12px', color:'#666'}}>
                                        선택된 상위분류: <span style={{color:'#2563eb', fontWeight:'bold'}}>{categoryFormData.parentName}</span>
                                    </span>
                                </div>
                                <div className="form-row">
                                    <div className="form-field-inline">
                                        <label>분류 코드</label>
                                        <input 
                                            type="text" 
                                            value={categoryFormData.typeCd} 
                                            onChange={(e) => setCategoryFormData(prev => ({ ...prev, typeCd: e.target.value }))} 
                                            placeholder="예: MEAT01" 
                                        />
                                    </div>
                                    <div className="form-field-inline">
                                        <label>분류 명칭</label>
                                        <input 
                                            type="text" 
                                            value={categoryFormData.typeNm} 
                                            onChange={(e) => setCategoryFormData(prev => ({ ...prev, typeNm: e.target.value }))} 
                                            placeholder="예: 가공육" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="popup-footer">
                            <button className="erp-button erp-button-primary" onClick={handleCategorySave}>추가(저장)</button>
                            <button className="erp-button erp-button-default" onClick={() => setShowCategoryPopup(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {showCategorySelectPopup && (
                <div className="popup-overlay" onClick={() => setShowCategorySelectPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="popup-header"><h3 className="popup-title">분류 선택</h3><button className="popup-close-btn" onClick={() => setShowCategorySelectPopup(false)}>×</button></div>
                        <div className="popup-body" style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                            <div className="category-tree-container">
                                {categoryTree.length > 0 ? renderCategoryTree(categoryTree, 0, handleCategorySelect) : <div style={{color:'#999', textAlign:'center'}}>등록된 분류가 없습니다.</div>}
                            </div>
                        </div>
                        <div className="popup-footer"><button className="erp-button erp-button-default" onClick={() => setShowCategorySelectPopup(false)}>닫기</button></div>
                    </div>
                </div>
            )}

            {showDeletePopup === true && (
                <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}><h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '18px' }}>품목 삭제</h3></div>
                        <div className="popup-body" style={{ padding: '25px 20px' }}>
                            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '15px' }}><p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>정말 삭제하시겠습니까?</p><div style={{ textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}><p style={{ margin: '0', color: '#991b1b', fontSize: '12px', fontWeight: '500' }}>삭제된 데이터는 복구할 수 없습니다.</p></div></div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', gap: '8px' }}><button className="erp-button erp-button-default" onClick={() => setShowDeletePopup(false)} style={{ width: '100px' }}>취소</button><button className="erp-button erp-button-primary" onClick={handleConfirmDelete} style={{ width: '100px', background: '#ef4444', border: '1px solid #ef4444' }}>삭제</button></div>
                    </div>
                </div>
            )}

            {(showDeletePopup === 'completed' || showCompletionPopup) && (
                <div className="popup-overlay" onClick={() => { setShowDeletePopup(false); setShowCompletionPopup(false); }}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div className="popup-header" style={{
                            borderBottom: showDeletePopup === 'completed' ? '2px solid #ef4444' : (isModify ? '2px solid #0ea5e9' : '2px solid #16a34a'),
                            background: showDeletePopup === 'completed' ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : (isModify ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)')
                        }}>
                            <h3 className="popup-title" style={{ color: showDeletePopup === 'completed' ? '#b91c1c' : (isModify ? '#0369a1' : '#15803d'), margin: 0, fontSize: '20px' }}>
                                {showCompletionPopup ? `✓ 품목 ${isModify ? '수정' : '등록'} 완료` : '✓ 품목 삭제 완료'}
                            </h3>
                        </div>
                        <div className="popup-body" style={{ padding: '40px 30px' }}>
                            <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>
                                    {showCompletionPopup ? `품목이 성공적으로 ${isModify ? '수정' : '등록'}되었습니다.` : '품목이 성공적으로 삭제되었습니다.'}
                                </p>
                                {showCompletionPopup && (
                                    <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>품목명: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.itemNm}</span></p>
                                        <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>품목코드: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.itemCd}</span></p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}>
                            <button className="erp-button erp-button-primary" onClick={() => { setShowDeletePopup(false); setShowCompletionPopup(false); }} style={{ width: '120px', background: showCompletionPopup && isModify ? '#0ea5e9' : undefined, borderColor: showCompletionPopup && isModify ? '#0ea5e9' : undefined }}>확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default 품목관리