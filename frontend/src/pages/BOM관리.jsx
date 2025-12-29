import React, { useState, useEffect } from 'react';
import { callApi } from '../utils/api'; // 🔥 API 함수 import
import '../css/pages/BOM관리.css'; 

export default function BomPage() {
  // === 데이터 상태 ===
  const [allProducts, setAllProducts] = useState([]);   // 전체 제품 원본
  const [allMaterials, setAllMaterials] = useState([]); // 전체 자재 원본
  const [products, setProducts] = useState([]);         // 화면 표시용 제품 (검색 필터 적용)
  const [materials, setMaterials] = useState([]);       // 화면 표시용 자재 (검색 필터 적용)
  const [bomList, setBomList] = useState([]);           // BOM 상세 목록
  
  // === 선택 상태 ===
  const [selectedProduct, setSelectedProduct] = useState(null); // 선택된 제품
  const [selectedBomRow, setSelectedBomRow] = useState(null);   // 선택된 BOM 행
  const [selectedMaterialSpec, setSelectedMaterialSpec] = useState(null); // 선택된 자재의 규격(숫자)

  // === 검색어 상태 ===
  const [productKeyword, setProductKeyword] = useState('');
  const [materialKeyword, setMaterialKeyword] = useState('');

  // === 입력 폼 상태 ===
  const [formData, setFormData] = useState({
    pItemCd: '',   // 제품코드
    pItemNm: '',   // 제품명
    sItemCd: '',   // 자재코드
    sItemNm: '',   // 자재명
    seqNo: '',     // 순번
    useQty: 0,     // 소요량
    lossRt: 0,     // 로스율
    materialCost: 0, 
    procCd: '',    // 공정
    remark: ''     
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // === 1. 초기 데이터 로드 ===
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      // callApi 사용 (전체 품목 조회)
      const items = await callApi('http://localhost:8080/api/item', 'GET');
      
      if (items) {
        // 제품(02)과 자재(01) 분리
        const pList = items.filter(item => item.itemFlag === '02');
        const mList = items.filter(item => item.itemFlag === '01' && item.typeCd); // 분류가 있는 것만 자재로 간주

        setAllProducts(pList);
        setAllMaterials(mList);
        setProducts(pList);   // 초기엔 전체 표시
        setMaterials(mList);  // 초기엔 전체 표시
      }
    } catch (err) { console.error(err); }
  };

  // === 2. BOM 조회 (제품 클릭 시) ===
  const fetchBomList = async (pItemCd) => {
    try {
      const data = await callApi(`http://localhost:8080/api/bom/${pItemCd}`, 'GET');
      setBomList(data || []);
    } catch (err) { console.error(err); }
  };

  // === 3. 규격 파싱 헬퍼 함수 (복구됨) ===
  const parseSpec = (spec) => {
    if (!spec) return 0;
    // 숫자만 추출하거나, "30g" 등에서 숫자 부분만 가져옴
    const match = spec.match(/([\d.]+)/); 
    if (!match) return 0;
    return parseFloat(match[1]);
  };

  // === 이벤트 핸들러 ===

  // [검색] 제품 검색
  const handleSearchProducts = () => {
    if (!productKeyword.trim()) {
        setProducts(allProducts);
    } else {
        const filtered = allProducts.filter(item => 
            item.itemNm.includes(productKeyword) || item.itemCd.includes(productKeyword)
        );
        setProducts(filtered);
    }
  };

  // [검색] 자재 검색
  const handleSearchMaterials = () => {
    if (!materialKeyword.trim()) {
        setMaterials(allMaterials);
    } else {
        const filtered = allMaterials.filter(item => 
            item.itemNm.includes(materialKeyword) || item.itemCd.includes(materialKeyword)
        );
        setMaterials(filtered);
    }
  };

  // [좌측 상단] 제품 클릭
  const handleProductClick = (item) => {
    setSelectedProduct(item);
    fetchBomList(item.itemCd); // BOM 조회
    
    // 폼 초기화
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
    
    const specValue = parseSpec(item.itemSpec);
    setSelectedMaterialSpec(specValue);

    setFormData(prev => ({
      ...prev,
      sItemCd: item.itemCd,
      sItemNm: item.itemNm,
      // 초기 비용 계산 (단가 * 0)
      materialCost: 0,
      seqNo: '' 
    }));
    setIsEditMode(false);
  };

  // [하단] BOM 행 클릭 -> 수정 모드
  const handleBomRowClick = (bom) => {
    setSelectedBomRow(bom);
    setIsEditMode(true);
    
    // 자재 규격 추출 (로스율 계산용)
    const specValue = bom.sitem ? parseSpec(bom.sitem.itemSpec) : 0;
    setSelectedMaterialSpec(specValue);

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

  // [우측 상단] 신규 자재 버튼 (폼 초기화)
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

  // 입력값 변경 및 로스율 자동 계산
  const handleChange = (e) => {
    const { name, value } = e.target;

    // 소요량 입력 시 로스율 자동 계산 로직
    if (name === 'useQty') {
        const useQty = parseFloat(value) || 0;
        let newLossRt = formData.lossRt;

        // 규격이 있고, 소요량이 입력되었을 때만 계산
        if (selectedMaterialSpec && selectedMaterialSpec > 0 && useQty > 0) {
            const spec = selectedMaterialSpec;
            const needCnt = Math.ceil(useQty / spec); // 필요 수량 (올림)
            const actualQty = needCnt * spec;          // 실제 투입량
            const lossQty = actualQty - useQty;        // 로스량
            newLossRt = actualQty === 0 ? 0 : (lossQty / actualQty);
            newLossRt = Number(newLossRt.toFixed(4)); // 소수점 4자리 반올림
        }

        // 재료비 계산 (현재 선택된 자재의 단가 찾기)
        let unitCost = 0;
        if(isEditMode && selectedBomRow?.sitem) {
            unitCost = selectedBomRow.sitem.itemCost || 0;
        } else {
            // 신규 등록 중일 때는 materials 목록에서 단가 찾기
            const currentMat = allMaterials.find(m => m.itemCd === formData.sItemCd);
            unitCost = currentMat?.itemCost || 0;
        }
        
        setFormData(prev => ({
            ...prev,
            useQty,
            lossRt: newLossRt,
            materialCost: unitCost * useQty
        }));
        return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 저장
  const handleSave = async () => {
    if (!formData.pItemCd) {
        alert("오류: 제품(부모 품목) 정보가 없습니다.\n좌측 목록에서 제품을 다시 선택해주세요.");
        return;
    }
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
      // 🔥 callApi 사용
      await callApi('http://localhost:8080/api/bom', 'POST', payload);
      
      alert("저장되었습니다.");
      fetchBomList(formData.pItemCd); // 목록 갱신
      handleNewBom(); // 폼 초기화
    } catch (e) { 
        console.error(e); 
        alert("저장 실패"); 
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
        // 🔥 callApi 사용
        await callApi(`http://localhost:8080/api/bom?pItemCd=${formData.pItemCd}&sItemCd=${formData.sItemCd}&seqNo=${formData.seqNo}`, 'DELETE');
        
        alert("삭제되었습니다.");
        fetchBomList(formData.pItemCd);
        handleNewBom();
    } catch (e) { 
        console.error(e); 
        alert("삭제 실패"); 
    }
  };

  return (
    <div className="bom-container">
      {/* 1. 헤더 */}
      <div className="bom-header">
        <div className="bom-title">BOM 등록</div>
        <div>
          <button className="bom-btn btn-save" onClick={handleSave}>저장</button>
          <button className="bom-btn btn-cancel" onClick={handleNewBom}>취소/신규</button>
          <button className="bom-btn btn-delete" onClick={handleDelete}>삭제</button>
        </div>
      </div>

      {/* 2. 메인 영역 (3단 분할) */}
      <div className="bom-main-layout">
        
        {/* [좌측] 제품 & 자재 리스트 */}
        <div className="bom-left-panel">
          {/* 제품 목록 */}
          <div className="panel-box">
            <div className="panel-header">📦 제품 목록</div>
            <div style={{ padding: '4px', display: 'flex', gap: '4px' }}>
              <input
                type="text"
                placeholder="코드 / 품명 검색"
                value={productKeyword}
                onChange={e => setProductKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchProducts()}
                style={{ flex: 1, fontSize:'11px', padding:'2px' }}
              />
              <button className="bom-btn" onClick={handleSearchProducts}>조회</button>
            </div>
            <div className="table-scroll-area">
              <table className="bom-table">
                <thead>
                    <tr>
                        <th style={{width:'40px'}}>No</th>
                        <th>코드</th>
                        <th>품명</th>
                        <th>규격</th>
                    </tr>
                </thead>
                <tbody>
                  {products.map((item, i) => (
                    <tr 
                      key={item.itemCd} 
                      className={selectedProduct?.itemCd === item.itemCd ? 'selected' : ''}
                      onClick={() => handleProductClick(item)}
                    >
                      <td style={{textAlign:'center'}}>{i+1}</td>
                      <td>{item.itemCd}</td>
                      <td>{item.itemNm}</td>
                      <td>{item.itemSpec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 자재 목록 */}
          <div className="panel-box" style={{borderTop:'1px solid #9e9e9e'}}>
            <div className="panel-header">🔩 자재 목록</div>
            <div style={{ padding: '4px', display: 'flex', gap: '4px' }}>
              <input
                type="text"
                placeholder="코드 / 품명 검색"
                value={materialKeyword}
                onChange={e => setMaterialKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchMaterials()}
                style={{ flex: 1, fontSize:'11px', padding:'2px' }}
              />
              <button className="bom-btn" onClick={handleSearchMaterials}>조회</button>
            </div>
            <div className="table-scroll-area">
              <table className="bom-table">
                <thead>
                    <tr>
                        <th style={{width:'40px'}}>No</th>
                        <th>코드</th>
                        <th>품명</th>
                        <th>규격</th>
                    </tr>
                </thead>
                <tbody>
                  {materials.map((item, i) => (
                    <tr key={item.itemCd} onClick={() => handleMaterialClick(item)}>
                      <td style={{textAlign:'center'}}>{i+1}</td>
                      <td>{item.itemCd}</td>
                      <td>{item.itemNm}</td>
                      <td>{item.itemSpec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* [중앙] 트리 뷰 */}
        <div className="bom-center-panel">
          <div className="panel-header" style={{marginBottom:'10px'}}>구조도</div>
          {selectedProduct ? (
            <div>
              <div className="bom-tree-root">📦 {selectedProduct.itemNm} ({selectedProduct.itemCd})</div>
              {bomList.map((bom, i) => (
                <div key={i} className="bom-tree-node">
                  📄 {bom.sitem ? bom.sitem.itemNm : bom.sItemCd} <br/>
                  <span style={{fontSize:'11px', color:'#666'}}>
                    (소요: {bom.useQty} {bom.sitem?.itemUnit})
                  </span>
                </div>
              ))}
              {bomList.length === 0 && <div style={{marginLeft:'20px', color:'#999'}}>(자재 없음)</div>}
            </div>
          ) : (
            <div style={{color:'#999', textAlign:'center', marginTop:'50px'}}>제품을 선택하세요</div>
          )}
        </div>

        {/* [우측] 입력 폼 */}
        <div className="bom-right-panel">
          <div className="bom-form-row">
            <label className="bom-label">품목코드</label>
            <input className="bom-input" value={formData.pItemCd} readOnly style={{background:'#e9ecef'}} />
          </div>
          <div className="bom-form-row">
            <label className="bom-label">품목명</label>
            <input className="bom-input" value={formData.pItemNm} readOnly style={{background:'#e9ecef'}} />
          </div>
          <hr style={{margin:'15px 0', border:'0', borderTop:'1px solid #ddd'}}/>
          
          <div className="bom-form-row">
            <label className="bom-label">원자재코드</label>
            <input className="bom-input" name="sItemCd" value={formData.sItemCd} readOnly placeholder="좌측 하단 자재 선택" style={{background:'#fffacd'}}/>
            <label className="bom-label" style={{width:'40px'}}>순번</label>
            <input className="bom-input bom-input-short" name="seqNo" value={formData.seqNo} onChange={handleChange} placeholder="자동" disabled={isEditMode} />
          </div>
          <div className="bom-form-row">
            <label className="bom-label">원자재명</label>
            <input className="bom-input" value={formData.sItemNm} readOnly style={{background:'#e9ecef'}} />
          </div>
          <div className="bom-form-row">
            <label className="bom-label">소요량</label>
            <input className="bom-input" type="number" name="useQty" value={formData.useQty} onChange={handleChange} style={{textAlign:'right'}} />
            <label className="bom-label" style={{width:'50px'}}>로스율</label>
            <input className="bom-input bom-input-short" type="number" name="lossRt" value={formData.lossRt} readOnly style={{textAlign:'right', background:'#e9ecef'}} />
          </div>
          <div className="bom-form-row">
            <label className="bom-label">재료비</label>
            <input className="bom-input" value={formData.materialCost.toLocaleString()} readOnly style={{background:'#e9ecef', textAlign:'right'}} />
          </div>
          <div className="bom-form-row">
            <label className="bom-label">공정</label>
            <input className="bom-input" name="procCd" value={formData.procCd} onChange={handleChange} placeholder="공정코드 입력" />
          </div>
          <div className="bom-form-row">
            <label className="bom-label">비고</label>
            <input className="bom-input" name="remark" value={formData.remark} onChange={handleChange} />
          </div>
          
          <div style={{textAlign:'right', marginTop:'10px'}}>
             <button className="bom-btn btn-cancel" onClick={handleNewBom}>입력 초기화</button>
          </div>
        </div>

      </div>

      {/* 3. 하단 상세 리스트 */}
      <div className="bom-bottom-panel">
        <div className="panel-header">BOM 상세 리스트</div>
        <div className="table-scroll-area">
          <table className="bom-table">
            <thead>
              <tr>
                <th style={{width:'50px'}}>No</th>
                <th>품목명</th>
                <th>원자재명</th>
                <th style={{width:'60px'}}>순번</th>
                <th style={{width:'80px'}}>소요량</th>
                <th style={{width:'80px'}}>로스율</th>
                <th style={{width:'100px'}}>재료비</th>
                <th style={{width:'100px'}}>공정</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {bomList.length === 0 ? (
                <tr><td colSpan="9" style={{textAlign:'center', padding:'20px'}}>데이터가 없습니다.</td></tr>
              ) : (
                bomList.map((bom, i) => (
                  <tr key={i} onClick={() => handleBomRowClick(bom)} className={selectedBomRow?.seqNo === bom.seqNo ? 'selected' : ''}>
                    <td style={{textAlign:'center'}}>{i+1}</td>
                    <td>{selectedProduct?.itemNm}</td>
                    <td>{bom.sitem ? bom.sitem.itemNm : bom.sItemCd}</td>
                    <td style={{textAlign:'center'}}>{bom.seqNo}</td>
                    <td style={{textAlign:'right'}}>{bom.useQty}</td>
                    <td style={{textAlign:'right'}}>{bom.lossRt}</td>
                    <td style={{textAlign:'right'}}>{((bom.sitem?.itemCost || 0) * bom.useQty).toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>{bom.procCd}</td>
                    <td>{bom.remark}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}