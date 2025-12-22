import React, { useState, useEffect } from 'react';
import '../css/pages/BomPage.css'; // 새로 만든 CSS import

export default function BomPage() {
  // === 데이터 상태 ===
  const [products, setProducts] = useState([]); // 제품 목록 (좌상단)
  const [materials, setMaterials] = useState([]); // 자재 목록 (좌하단)
  const [bomList, setBomList] = useState([]);     // BOM 상세 목록 (하단)
  
  // === 선택 상태 ===
  const [selectedProduct, setSelectedProduct] = useState(null); // 선택된 제품
  const [selectedBomRow, setSelectedBomRow] = useState(null);   // 선택된 BOM 행

  // === 입력 폼 상태 ===
  const [formData, setFormData] = useState({
    pItemCd: '',   // 제품코드 (자동) - 절대 지워지면 안됨
    pItemNm: '',   // 제품명 (자동)
    sItemCd: '',   // 자재코드 (선택)
    sItemNm: '',   // 자재명 (자동)
    seqNo: '',     // 순번
    useQty: 0,     // 소요량
    lossRt: 0,     // 로스율
    materialCost: 0, // 재료비 (단가 * 소요량, 단순 표시용)
    procCd: '',    // 공정
    remark: ''     // 비고  
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // === 1. 초기 데이터 로드 (제품/자재 목록) ===
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      // 1. 아이템 목록 조회
      const resItem = await fetch('http://localhost:8080/api/item');
      // 2. 분류 목록 조회 (어떤 게 소분류인지 알기 위해)
      const resType = await fetch('http://localhost:8080/api/item-types/all'); // 전체 플랫 리스트 필요 (혹은 트리 순회)
      // *편의상 백엔드에서 typeLv 정보를 itemMst에 포함해서 주면 제일 좋음*
      
      if (resItem.ok) {
        const items = await resItem.json();
        
        // 제품(02)
        setProducts(items.filter(item => item.itemFlag === '02'));
        setMaterials(items.filter(item => item.itemFlag === '01' && item.typeCd)); 
      }
    } catch (err) { console.error(err); }
  };

  // === 2. BOM 조회 (제품 클릭 시) ===
  const fetchBomList = async (pItemCd) => {
    try {
      const res = await fetch(`http://localhost:8080/api/bom/${pItemCd}`);
      if (res.ok) {
        const data = await res.json();
        setBomList(data);
      }
    } catch (err) { console.error(err); }
  };

  // === 이벤트 핸들러 ===

  // [좌측 상단] 제품 클릭
  const handleProductClick = (item) => {
    setSelectedProduct(item);
    fetchBomList(item.itemCd); // BOM 조회
    
    // 폼 초기화 (제품 정보는 세팅)
    setFormData({
      pItemCd: item.itemCd, // ✅ 제품 코드 설정
      pItemNm: item.itemNm, // ✅ 제품 명 설정
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
    
    // 폼에 자재 정보 세팅 (기존 제품 정보 pItemCd는 유지해야 함!)
    setFormData(prev => ({
      ...prev, // ✅ 중요: 기존에 있던 pItemCd 등의 정보를 유지함
      sItemCd: item.itemCd,
      sItemNm: item.itemNm,
      // 자재 단가 등을 가져와서 재료비 예상치 계산 가능 (여기선 0)
      materialCost: (item.itemCost || 0) * (prev.useQty || 0),
      seqNo: '' // 신규이므로 순번 비움
    }));
    setIsEditMode(false);
  };

  // [하단] BOM 행 클릭 -> 수정 모드
  const handleBomRowClick = (bom) => {
    setSelectedBomRow(bom);
    setIsEditMode(true);
    
    // 데이터 바인딩
    setFormData({
      // 백엔드 필드명(pItemCd) 사용, 없으면 선택된 제품 코드 사용 (안전장치)
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

    // ✅ 핵심 수정 부분: 제품 정보(pItemCd)는 유지하고 나머지 자재 필드만 비움
    setFormData(prev => ({
        ...prev,          // pItemCd, pItemNm 유지
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

  // 입력값 변경
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 저장
  const handleSave = async () => {
    // ✅ 안전장치: pItemCd가 없으면 저장 차단
    if (!formData.pItemCd) {
        alert("오류: 제품(부모 품목) 정보가 없습니다.\n좌측 목록에서 제품을 다시 선택해주세요.");
        return;
    }
    if (!formData.sItemCd) return alert("자재를 선택해주세요.");

    // 순번 자동 채번 (신규일 때만)
    let saveSeq = formData.seqNo;
    if (!isEditMode && !saveSeq) {
        // 기존 리스트에서 가장 큰 seqNo 찾아서 +1
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
      const res = await fetch('http://localhost:8080/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("저장되었습니다.");
        fetchBomList(formData.pItemCd); // 목록 갱신
        handleNewBom(); // 저장 후 폼 초기화 (제품 정보 유지)
      } else {
        const msg = await res.text();
        alert("저장 실패: " + msg);
      }
    } catch (e) { console.error(e); }
  };

  // 삭제
  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
        const res = await fetch(`http://localhost:8080/api/bom?pItemCd=${formData.pItemCd}&sItemCd=${formData.sItemCd}&seqNo=${formData.seqNo}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            alert("삭제되었습니다.");
            fetchBomList(formData.pItemCd);
            handleNewBom();
        } else {
            alert("삭제 실패");
        }
    } catch (e) { console.error(e); }
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
          <div className="panel-box">
            <div className="panel-header">🔩 자재 목록</div>
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
            <input className="bom-input bom-input-short" type="number" name="lossRt" value={formData.lossRt} onChange={handleChange} style={{textAlign:'right'}} />
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