import React, { useState, useEffect } from 'react';
import '../css/pages/BOM관리.css';
import IconButton from '../components/IconButton';

// ✅ API 엔드포인트 정의
const API = {
  item: "http://localhost:8080/api/item",
  bom: "http://localhost:8080/api/bom",
};

export default function BOM관리() {
    // === 데이터 상태 ===
    const [products, setProducts] = useState([]); // 제품 목록 (좌상단)
    const [materials, setMaterials] = useState([]); // 자재 목록 (좌하단)
    const [bomList, setBomList] = useState([]);     // BOM 상세 목록 (하단)

    // === 선택 상태 ===
    const [selectedProduct, setSelectedProduct] = useState(null); // 선택된 제품
    const [selectedBomRow, setSelectedBomRow] = useState(null);   // 선택된 BOM 행
    const [selectedMaterialSpec, setSelectedMaterialSpec] = useState(null); // 선택된 자재량

    // === 검색어 상태 ===
    const [productSearchType, setProductSearchType] = useState('itemCd');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [materialSearchType, setMaterialSearchType] = useState('itemCd');
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');

    // === 입력 폼 상태 ===
    const [formData, setFormData] = useState({
        pItemCd: '',   // 제품코드 (자동)
        pItemNm: '',   // 제품명 (자동)
        sItemCd: '',   // 자재코드 (선택)
        sItemNm: '',   // 자재명 (자동)
        seqNo: '',     // 순번
        useQty: 0,     // 소요량
        lossRt: 0,     // 로스율
        materialCost: 0, // 재료비
        procCd: '',    // 공정
        remark: ''     // 비고
    });

    const [isEditMode, setIsEditMode] = useState(false);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [showCompletionPopup, setShowCompletionPopup] = useState(false);
    const [isModify, setIsModify] = useState(false);

    // === 1. 초기 데이터 로드 (제품/자재 목록) ===
    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await fetch(API.item);
            if (res.ok) {
                const items = await res.json();
                // 제품(02)과 자재(01) 분리
                setProducts(items.filter(item => item.itemFlag === '02'));
                setMaterials(items.filter(item => item.itemFlag === '01'));
            } else {
                console.error("품목 목록 조회 실패");
            }
        } catch (err) {
            console.error("네트워크 오류:", err);
        }
    };

    // === 2. BOM 조회 (제품 클릭 시) ===
    const fetchBomList = async (pItemCd) => {
        try {
            const res = await fetch(`${API.bom}/${pItemCd}`);
            if (res.ok) {
                const data = await res.json();
                setBomList(data);
            } else {
                setBomList([]);
            }
        } catch (err) {
            console.error(err);
            setBomList([]);
        }
    };

    // 스펙 파싱 헬퍼
    const parseSpec = (spec) => {
        if (!spec) return null;
        const match = spec.match(/([\d.]+)\s*(g|kg|ea)/i);
        if (!match) return null;
        let value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 'kg') value *= 1000;
        return value;
    };

    // === 이벤트 핸들러 ===

    // [좌측 상단] 제품 클릭
    const handleProductClick = (item) => {
        setSelectedProduct(item);
        fetchBomList(item.itemCd); // DB에서 BOM 조회

        // 폼 초기화 (제품 정보 세팅)
        setFormData({
            pItemCd: item.itemCd,
            pItemNm: item.itemNm,
            sItemCd: '',
            sItemNm: '',
            seqNo: '',
            useQty: 0,
            lossRt: 0,
            materialCost: 0,
            procCd: '',
            remark: ''
        });
        setIsEditMode(false);
        setSelectedBomRow(null);
    };

    // [좌측 하단] 자재 클릭 -> 폼에 자재 정보 입력
    const handleMaterialClick = (item) => {
        if (!selectedProduct) return alert("먼저 상단에서 제품을 선택해주세요.");
        
        const specGram = parseSpec(item.itemSpec);
        setSelectedMaterialSpec(specGram);

        // 폼에 자재 정보 세팅 (기존 제품 정보 pItemCd는 유지)
        setFormData(prev => ({
            ...prev,
            sItemCd: item.itemCd,
            sItemNm: item.itemNm,
            materialCost: (item.itemCost || 0) * (prev.useQty || 0),
            seqNo: '' // 신규이므로 순번 비움
        }));
        setIsEditMode(false);
    };

    // 입력 변경 핸들러 (로스율, 재료비 자동 계산)
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'useQty') {
            const useQty = parseFloat(value) || 0;
            let updates = { useQty };

            // 로스율 계산
            if (selectedMaterialSpec) {
                const spec = selectedMaterialSpec;
                const needCnt = Math.ceil(useQty / spec);
                const actualQty = needCnt * spec;
                const lossQty = actualQty - useQty;
                const lossRt = actualQty === 0 ? 0 : lossQty / actualQty;
                updates.lossRt = Number(lossRt.toFixed(4));
            }

            // 재료비 계산
            if (formData.sItemCd) {
                const selectedMaterial = materials.find(m => m.itemCd === formData.sItemCd);
                if (selectedMaterial) {
                    updates.materialCost = (selectedMaterial.itemCost || 0) * useQty;
                }
            }
            
            setFormData(prev => ({ ...prev, ...updates }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // [하단] BOM 행 클릭 -> 수정 모드
    const handleBomRowClick = (bom) => {
        setSelectedBomRow(bom);
        setIsEditMode(true);

        setFormData({
            pItemCd: bom.pItemCd || selectedProduct.itemCd,
            pItemNm: selectedProduct.itemNm,
            sItemCd: bom.sItemCd,
            sItemNm: bom.sitem ? bom.sitem.itemNm : '',
            seqNo: bom.seqNo,
            useQty: bom.useQty,
            lossRt: bom.lossRt,
            materialCost: (bom.sitem?.itemCost || 0) * bom.useQty,
            procCd: bom.procCd,
            remark: bom.remark
        });
    };

    // [우측 상단] 신규 버튼 (폼 초기화)
    const handleNewBom = () => {
        if (!selectedProduct) return alert("제품을 먼저 선택해주세요.");

        setFormData(prev => ({
            ...prev,
            sItemCd: '',
            sItemNm: '',
            seqNo: '',
            useQty: 0,
            lossRt: 0,
            materialCost: 0,
            procCd: '',
            remark: ''
        }));
        setIsEditMode(false);
        setSelectedBomRow(null);
    };

    // 저장 (API 연동)
    const handleSave = async () => {
        if (!formData.pItemCd) return alert("제품 정보가 없습니다.");
        if (!formData.sItemCd) return alert("자재를 선택해주세요.");

        // 순번 자동 채번 (신규일 때만)
        let saveSeq = formData.seqNo;
        if (!isEditMode && !saveSeq) {
            const maxSeq = bomList.length > 0 ? Math.max(...bomList.map(b => b.seqNo)) : 0;
            saveSeq = maxSeq + 1;
        }

        const payload = {
            pItemCd: formData.pItemCd,
            sItemCd: formData.sItemCd,
            seqNo: parseInt(saveSeq),
            useQty: parseFloat(formData.useQty),
            lossRt: parseFloat(formData.lossRt),
            procCd: formData.procCd,
            remark: formData.remark
        };

        try {
            const res = await fetch(API.bom, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModify(isEditMode);
                setShowCompletionPopup(true);
                fetchBomList(formData.pItemCd); // 목록 갱신
            } else {
                const msg = await res.text();
                alert("저장 실패: " + msg);
            }
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    // 삭제 (API 연동)
    const handleDelete = () => {
        if (!isEditMode) return;
        setShowDeletePopup(true);
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${API.bom}?pItemCd=${formData.pItemCd}&sItemCd=${formData.sItemCd}&seqNo=${formData.seqNo}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setShowDeletePopup('completed');
                fetchBomList(formData.pItemCd);
            } else {
                alert("삭제 실패");
                setShowDeletePopup(false);
            }
        } catch (e) {
            console.error(e);
            alert("삭제 중 오류가 발생했습니다.");
            setShowDeletePopup(false);
        }
    };

    // 검색 필터링
    const filteredProducts = products.filter(product => {
        if (!productSearchTerm) return true;
        if (productSearchType === 'itemCd') return product.itemCd.toLowerCase().includes(productSearchTerm.toLowerCase());
        if (productSearchType === 'itemNm') return product.itemNm.toLowerCase().includes(productSearchTerm.toLowerCase());
        return true;
    });

    const filteredMaterials = materials.filter(material => {
        if (!materialSearchTerm) return true;
        if (materialSearchType === 'itemCd') return material.itemCd.toLowerCase().includes(materialSearchTerm.toLowerCase());
        if (materialSearchType === 'itemNm') return material.itemNm.toLowerCase().includes(materialSearchTerm.toLowerCase());
        return true;
    });

    return (
        <div className="bom-management-container">
            <div className="bom-management-wrapper">
                {/* 헤더 */}
                <div className="bom-management-header">
                    <h2 className="page-title">BOM 관리</h2>
                    <div className="header-buttons">
                        <IconButton type="new" label="신규" onClick={handleNewBom} />
                        <IconButton type="modify" label={isEditMode ? "수정 완료" : "BOM 등록"} onClick={handleSave} />
                        <IconButton type="delete" label="삭제" onClick={handleDelete} />
                    </div>
                </div>

                {/* 메인 콘텐츠 레이아웃 */}
                <div className="bom-content-layout">
                    {/* 왼쪽: 제품 & 자재 리스트 */}
                    <div className="bom-list-panel">
                        {/* 제품 목록 */}
                        <div className="bom-list-section">
                            <div className="bom-section-header">
                                <h3 className="section-title">제품 목록</h3>
                            </div>
                            <div className="bom-search">
                                <select className="search-select" value={productSearchType} onChange={(e) => setProductSearchType(e.target.value)}>
                                    <option value="itemCd">품목코드</option>
                                    <option value="itemNm">품목명</option>
                                </select>
                                <input type="text" className="search-input" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} placeholder="검색어를 입력하세요" />
                            </div>
                            <div className="list-table-wrapper">
                                <table className="excel-table">
                                    <thead>
                                    <tr>
                                        <th className="excel-th" style={{width:'40px'}}>No</th>
                                        <th className="excel-th">코드</th>
                                        <th className="excel-th">품명</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredProducts.map((item, i) => (
                                        <tr key={item.itemCd} className={`excel-tr ${selectedProduct?.itemCd === item.itemCd ? 'selected' : ''}`} onClick={() => handleProductClick(item)}>
                                            <td className="excel-td excel-td-number">{i+1}</td>
                                            <td className="excel-td">{item.itemCd}</td>
                                            <td className="excel-td">{item.itemNm}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 자재 목록 */}
                        <div className="bom-list-section">
                            <div className="bom-section-header">
                                <h3 className="section-title">자재 목록</h3>
                            </div>
                            <div className="bom-search">
                                <select className="search-select" value={materialSearchType} onChange={(e) => setMaterialSearchType(e.target.value)}>
                                    <option value="itemCd">품목코드</option>
                                    <option value="itemNm">품목명</option>
                                </select>
                                <input type="text" className="search-input" value={materialSearchTerm} onChange={(e) => setMaterialSearchTerm(e.target.value)} placeholder="검색어를 입력하세요" />
                            </div>
                            <div className="list-table-wrapper">
                                <table className="excel-table">
                                    <thead>
                                    <tr>
                                        <th className="excel-th" style={{width:'40px'}}>No</th>
                                        <th className="excel-th">코드</th>
                                        <th className="excel-th">품명</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredMaterials.map((item, i) => (
                                        <tr key={item.itemCd} className={`excel-tr ${formData.sItemCd === item.itemCd ? 'selected' : ''}`} onClick={() => handleMaterialClick(item)}>
                                            <td className="excel-td excel-td-number">{i+1}</td>
                                            <td className="excel-td">{item.itemCd}</td>
                                            <td className="excel-td">{item.itemNm}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 중앙: BOM 구조도 */}
                    <div className="bom-center-panel">
                        <div className="panel-header" style={{ marginBottom: '10px' }}>구조도</div>
                        {selectedProduct ? (
                            <div>
                                <div className="bom-tree-root">
                                    📦 {selectedProduct.itemNm} ({selectedProduct.itemCd})
                                </div>
                                {bomList.map((bom, i) => (
                                    <div key={i} className="bom-tree-node">
                                        📄 {bom.sitem ? bom.sitem.itemNm : bom.sItemCd}
                                        <br />
                                        <span style={{ fontSize: '11px', color: '#666' }}>
                                            (소요: {bom.useQty} {bom.sitem?.itemUnit})
                                        </span>
                                    </div>
                                ))}
                                {bomList.length === 0 && <div style={{ marginLeft: '20px', color: '#999' }}>(자재 없음)</div>}
                            </div>
                        ) : (
                            <div style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>제품을 선택하세요</div>
                        )}
                    </div>

                    {/* 오른쪽: 입력 폼 */}
                    <div className="bom-detail-panel">
                        <div className="detail-header">
                            <h3 className="detail-title">BOM 정보</h3>
                        </div>
                        <div className="detail-content">
                            <div className="form-section">
                                <div className="section-title">기본 정보</div>
                                <div className="form-group">
                                    {selectedProduct ? (
                                        <>
                                            <div className="form-row">
                                                <div className="form-field-inline">
                                                    <label>품목코드</label>
                                                    <input type="text" value={formData.pItemCd} readOnly disabled />
                                                </div>
                                                <div className="form-field-inline">
                                                    <label>품목명</label>
                                                    <input type="text" value={formData.pItemNm} readOnly disabled />
                                                </div>
                                            </div>
                                            {formData.sItemCd ? (
                                                <>
                                                    <div className="form-row">
                                                        <div className="form-field-inline">
                                                            <label>원자재코드</label>
                                                            <input type="text" name="sItemCd" value={formData.sItemCd} readOnly disabled />
                                                        </div>
                                                        <div className="form-field-inline">
                                                            <label>순번</label>
                                                            <input type="text" name="seqNo" value={formData.seqNo} onChange={handleChange} disabled={isEditMode} placeholder="자동" />
                                                        </div>
                                                    </div>
                                                    <div className="form-row">
                                                        <div className="form-field-inline">
                                                            <label>원자재명</label>
                                                            <input type="text" value={formData.sItemNm} readOnly disabled />
                                                        </div>
                                                        <div className="form-field-inline">
                                                            <label>소요량</label>
                                                            <input type="number" name="useQty" value={formData.useQty} onChange={handleChange} style={{textAlign:'right'}} />
                                                        </div>
                                                    </div>
                                                    <div className="form-row">
                                                        <div className="form-field-inline">
                                                            <label>로스율</label>
                                                            <input type="number" name="lossRt" value={formData.lossRt} readOnly disabled style={{textAlign:'right'}} />
                                                        </div>
                                                        <div className="form-field-inline">
                                                            <label>재료비</label>
                                                            <input type="text" value={formData.materialCost.toLocaleString()} readOnly disabled style={{textAlign:'right'}} />
                                                        </div>
                                                    </div>
                                                    <div className="form-row">
                                                        <div className="form-field-inline">
                                                            <label>공정</label>
                                                            <input type="text" name="procCd" value={formData.procCd} onChange={handleChange} placeholder="공정코드 입력" />
                                                        </div>
                                                    </div>
                                                    <div className="form-row form-row-full">
                                                        <div className="form-field-inline">
                                                            <label>비고</label>
                                                            <input type="text" name="remark" value={formData.remark} onChange={handleChange} />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="form-row form-row-full">
                                                    <div className="form-field-inline">
                                                        <label style={{color:'#999', fontStyle:'italic'}}>좌측 하단에서 자재를 선택해주세요</label>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="form-row form-row-full">
                                            <div className="form-field-inline">
                                                <label style={{color:'#999', fontStyle:'italic'}}>좌측 상단에서 제품을 선택해주세요</label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단: BOM 상세 리스트 */}
                <div className="bom-bottom-panel">
                    <div className="detail-header">
                        <h3 className="detail-title">BOM 상세 리스트</h3>
                    </div>
                    <div className="list-table-wrapper">
                        <table className="excel-table">
                            <thead>
                            <tr>
                                <th className="excel-th" style={{width:'40px'}}>No</th>
                                <th className="excel-th">품목명</th>
                                <th className="excel-th">원자재명</th>
                                <th className="excel-th">순번</th>
                                <th className="excel-th">소요량</th>
                                <th className="excel-th">로스율</th>
                                <th className="excel-th">재료비</th>
                                <th className="excel-th">공정</th>
                                <th className="excel-th">비고</th>
                            </tr>
                            </thead>
                            <tbody>
                            {bomList.length === 0 ? (
                                <tr><td colSpan="9" className="excel-td" style={{ textAlign: 'center', padding: '20px' }}>데이터가 없습니다.</td></tr>
                            ) : (
                                bomList.map((bom, i) => (
                                    <tr key={i} className={`excel-tr ${selectedBomRow?.seqNo === bom.seqNo ? 'selected' : ''}`} onClick={() => handleBomRowClick(bom)}>
                                        <td className="excel-td excel-td-number">{i+1}</td>
                                        <td className="excel-td">{selectedProduct?.itemNm}</td>
                                        <td className="excel-td">{bom.sitem ? bom.sitem.itemNm : bom.sItemCd}</td>
                                        <td className="excel-td">{bom.seqNo}</td>
                                        <td className="excel-td" style={{textAlign:'right'}}>{bom.useQty}</td>
                                        <td className="excel-td" style={{textAlign:'right'}}>{bom.lossRt}</td>
                                        <td className="excel-td" style={{textAlign:'right'}}>{((bom.sitem?.itemCost || 0) * bom.useQty).toLocaleString()}</td>
                                        <td className="excel-td">{bom.procCd}</td>
                                        <td className="excel-td">{bom.remark}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 팝업들은 기존 코드 유지 */}
            {showDeletePopup === true && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <div className="popup-header">
                            <h3>삭제 확인</h3>
                            <button className="close-btn" onClick={() => setShowDeletePopup(false)}>X</button>
                        </div>
                        <div className="popup-body">
                            <p>정말 삭제하시겠습니까?</p>
                            <div className="popup-details">
                                <p><strong>품목명:</strong> {formData.pItemNm}</p>
                                <p><strong>자재명:</strong> {formData.sItemNm}</p>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button className="cancel-btn" onClick={() => setShowDeletePopup(false)}>취소</button>
                            <button className="confirm-btn" onClick={confirmDelete}>삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeletePopup === 'completed' && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <div className="popup-header"><h3>삭제 완료</h3><button className="close-btn" onClick={() => { setShowDeletePopup(false); handleNewBom(); }}>X</button></div>
                        <div className="popup-body"><div className="success-icon">🗑️</div><p>삭제가 완료되었습니다.</p></div>
                        <div className="popup-footer"><button className="confirm-btn" onClick={() => { setShowDeletePopup(false); handleNewBom(); }}>확인</button></div>
                    </div>
                </div>
            )}

            {showCompletionPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <div className="popup-header" style={{ borderBottom: isModify ? '2px solid #0ea5e9' : '2px solid #16a34a', background: isModify ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                            <h3 style={{ color: isModify ? '#0369a1' : '#15803d' }}>BOM {isModify ? '수정' : '등록'} 완료</h3>
                            <button className="close-btn" onClick={() => { setShowCompletionPopup(false); handleNewBom(); }}>X</button>
                        </div>
                        <div className="popup-body">
                            <div className="success-icon">✅</div>
                            <p>BOM이 성공적으로 {isModify ? '수정' : '등록'}되었습니다.</p>
                            <div className="popup-details">
                                <p><strong>품목명:</strong> {formData.pItemNm}</p>
                                <p><strong>자재명:</strong> {formData.sItemNm}</p>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button className="confirm-btn" onClick={() => { setShowCompletionPopup(false); handleNewBom(); }} style={{ background: isModify ? '#0ea5e9' : undefined, borderColor: isModify ? '#0ea5e9' : undefined }}>확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}