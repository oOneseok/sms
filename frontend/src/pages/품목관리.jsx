import React, { useState, useEffect, useMemo } from 'react';
import { callApi } from '../utils/api'; 
import '../css/pages/ItemPage.css';
import '../css/pages/BomPage.css';

export default function 품목관리() {
  const [itemList, setItemList] = useState([]);
  const [typeTree, setTypeTree] = useState([]);
  const [activeTab, setActiveTab] = useState('02'); // '02'(제품), '01'(자재)

  // 검색 조건 (검색어, 분류)
  const [searchParams, setSearchParams] = useState({
    searchText: '',
    typeCd: '' 
  });

  // 상세 폼 데이터
  const [formData, setFormData] = useState({
    itemCd: '', itemNm: '', itemFlag: '02', typeCd: '',
    itemSpec: '', itemUnit: '', itemCost: 0, remark: ''
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTypeData, setNewTypeData] = useState({ code: '', name: '', parentCd: '' });

  // === 초기 로드 ===
  useEffect(() => {
    fetchTypeTree();
    // 초기 로드 시점에는 검색어 없이 전체 조회
    fetchListInternal(activeTab, '', '');
  }, []);

  // 탭 변경 시
  useEffect(() => {
    setSearchParams({ searchText: '', typeCd: '' }); // 검색 조건 초기화
    handleNew(activeTab); // 상세 폼 초기화
    fetchListInternal(activeTab, '', ''); // 해당 탭의 전체 목록 조회
  }, [activeTab]);

  // === API 호출 (핵심 수정) ===
  const fetchList = () => {
    // 🔍 [디버깅] 실제 보내는 값 확인 (F12 콘솔 확인)
    console.log("=== 조회 요청 ===");
    console.log("탭:", activeTab);
    console.log("검색어:", searchParams.searchText);
    console.log("분류:", searchParams.typeCd);

    fetchListInternal(activeTab, searchParams.searchText, searchParams.typeCd);
  };

  const fetchListInternal = async (flag, text, type) => {
    try {
      // 1. URL 파라미터(Query String) 수동 생성
      const params = new URLSearchParams();
      // 검색어가 있으면 추가
      if (text) params.append('searchText', text);
      // 자재 탭('01')이고 분류가 선택되었으면 추가
      if (flag === '01' && type) params.append('typeCd', type);

      const queryString = params.toString();
      const url = `http://localhost:8080/api/item?${queryString}`; // 예: .../api/item?typeCd=T02

      console.log("🚀 최종 요청 URL:", url); // 콘솔에서 URL 확인 가능

      // 2. callApi 호출 (params 객체 대신 완성된 URL 사용)
      const res = await callApi(url, 'GET', null); 
      
      if (res) {
        const filtered = res.filter(item => item.itemFlag === flag);
        setItemList(filtered);
      }
    } catch (e) { console.error("조회 실패:", e); }
  };

  const fetchTypeTree = async () => {
    try {
      const res = await callApi('http://localhost:8080/api/item-types');
      if (res) setTypeTree(res);
    } catch (e) { console.error(e); }
  };

  // === 트리 -> 리스트 변환 (SelectBox용) ===
  const flatCategoryOptions = useMemo(() => {
    const result = [];
    const flatten = (nodes, depth = 0) => {
      nodes.forEach(node => {
        const prefix = depth > 0 ? '\u00A0'.repeat(depth * 4) + '└─ ' : '';
        result.push({
          typeCd: node.typeCd,
          typeNm: prefix + node.typeNm,
          originNm: node.typeNm,
          parentCd: node.parent ? node.parent.typeCd : '',
        });
        if (node.children) flatten(node.children, depth + 1);
      });
    };
    flatten(typeTree);
    return result;
  }, [typeTree]);

  // === 이벤트 핸들러 ===
  
  // 검색어 입력
  const handleSearchInput = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  // ⌨️ [추가] 엔터 키 입력 시 조회 실행
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchList();
    }
  };

  // 조회 버튼 클릭
  const handleSearchBtn = () => {
    fetchList();
  };

  // 리스트 클릭
  const handleListClick = (row) => {
    setFormData(row);
    setIsEditMode(true);
  };

  // 신규/저장/삭제/모달 관련 코드는 기존과 동일 (생략 없이 유지)
  const handleNew = (tab = activeTab) => {
    setFormData({
      itemCd: '', itemNm: '', itemFlag: tab, 
      typeCd: searchParams.typeCd || '', 
      itemSpec: '', itemUnit: '', itemCost: 0, remark: ''
    });
    setIsEditMode(false);
  };

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!formData.itemCd) return alert("품목코드는 필수입니다.");
    try {
      await callApi('http://localhost:8080/api/item', 'POST', { ...formData, itemFlag: activeTab });
      alert("저장되었습니다.");
      fetchList();
    } catch (e) { console.error(e); alert("저장 실패"); }
  };

  const handleRowDelete = async (e, row) => {
    e.stopPropagation();
    if (!window.confirm(`[${row.itemNm}] 삭제하시겠습니까?`)) return;
    try {
      await callApi(`http://localhost:8080/api/item/${row.itemCd}`, 'DELETE');
      alert("삭제되었습니다.");
      fetchList();
      if (formData.itemCd === row.itemCd) handleNew();
    } catch (e) { console.error(e); }
  };

  // 분류 모달
  const openTypeModal = () => {
    setNewTypeData({ code: '', name: '', parentCd: searchParams.typeCd || '' });
    setIsModalOpen(true);
  };
  const handleSaveType = async () => {
    if (!newTypeData.code || !newTypeData.name) return alert("입력 확인");
    try {
      await callApi('http://localhost:8080/api/item-types', 'POST', {
        typeCd: newTypeData.code, typeNm: newTypeData.name, parentType: newTypeData.parentCd || null
      });
      alert("분류 생성 완료");
      fetchTypeTree(); setIsModalOpen(false);
    } catch (e) { console.error(e); alert("실패"); }
  };
  const deleteType = async () => {
    const target = searchParams.typeCd;
    if(!target) return alert("삭제할 분류를 선택해주세요.");
    if(!window.confirm("정말 삭제합니까? 하위 항목도 삭제됩니다.")) return;
    try {
        await callApi(`http://localhost:8080/api/item-types/${target}`, 'DELETE');
        alert("삭제 완료");
        setSearchParams(p => ({...p, typeCd: ''}));
        fetchTypeTree(); fetchList();
    } catch (e) { console.error(e); }
  }


  // === 렌더링 ===
  return (
    <div className="bom-container">
      {/* 모달 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">분류 추가</div>
            <div className="bom-form-row">
              <label>상위 분류</label>
              <select className="bom-input" value={newTypeData.parentCd} onChange={e => setNewTypeData({...newTypeData, parentCd: e.target.value})}>
                <option value="">(최상위 Root)</option>
                {flatCategoryOptions.map(opt => <option key={opt.typeCd} value={opt.typeCd}>{opt.typeNm}</option>)}
              </select>
            </div>
            <input className="bom-input" style={{marginTop:'5px'}} placeholder="코드" value={newTypeData.code} onChange={e => setNewTypeData({...newTypeData, code: e.target.value})} />
            <input className="bom-input" style={{marginTop:'5px'}} placeholder="명칭" value={newTypeData.name} onChange={e => setNewTypeData({...newTypeData, name: e.target.value})} />
            <div className="modal-footer">
              <button className="bom-btn btn-save" onClick={handleSaveType}>저장</button>
              <button className="bom-btn btn-cancel" onClick={() => setIsModalOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="bom-header">
        <h2 className="bom-title">품목 관리</h2>
        <div>
          <button className="bom-btn btn-new" onClick={() => handleNew()}>신규</button>
          <button className="bom-btn btn-save" onClick={handleSave}>저장</button>
          <button className="bom-btn btn-delete" onClick={() => handleRowDelete({stopPropagation:()=>{}}, formData)}>삭제</button>
        </div>
      </div>

      {/* 🔍 검색 바 */}
      <div className="bom-search-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap:'wrap' }}>
        <span style={{ fontWeight: 'bold' }}>🔍 검색 : </span>
        
        {activeTab === '01' && (
          <>
            <select className="bom-input" name="typeCd" value={searchParams.typeCd} onChange={handleSearchInput} style={{ width: '200px' }}>
              <option value="">-- 전체 분류 --</option>
              {flatCategoryOptions.map(opt => <option key={opt.typeCd} value={opt.typeCd}>{opt.typeNm}</option>)}
            </select>
            <button className="bom-btn" style={{backgroundColor:'#6c757d', color:'white', padding:'5px 10px'}} onClick={openTypeModal}>+ 분류 추가</button>
            {searchParams.typeCd && <button className="bom-btn btn-delete" style={{padding:'5px 10px'}} onClick={deleteType}>현재 분류 삭제</button>}
          </>
        )}

        {/* ⌨️ 엔터 키 이벤트 추가됨 */}
        <input 
          className="bom-input" 
          name="searchText"
          style={{ width: '200px' }} 
          value={searchParams.searchText} 
          onChange={handleSearchInput} 
          onKeyDown={handleKeyDown} 
          placeholder="검색어 입력..." 
        />
        
        <button className="bom-btn btn-save" onClick={handleSearchBtn}>조회</button>
      </div>

      <div className="bom-main-layout">
        <div className="bom-left-panel" style={{ flex: 1.5 }}>
          <div className="tab-header" style={{ marginBottom: '10px' }}>
            <button className={`bom-btn ${activeTab === '02' ? 'btn-save' : 'btn-cancel'}`} onClick={() => setActiveTab('02')}>📦 제품</button>
            <button className={`bom-btn ${activeTab === '01' ? 'btn-save' : 'btn-cancel'}`} style={{marginLeft:'5px'}} onClick={() => setActiveTab('01')}>🔩 자재</button>
          </div>
          <div className="panel-box">
            <div className="table-scroll-area">
              <table className="bom-table">
                <thead>
                  <tr>
                    <th>코드</th><th>명칭</th>{activeTab === '01' && <th style={{width:'30%'}}>분류 경로</th>}<th>규격</th><th style={{textAlign:'right'}}>단가</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {itemList.length === 0 ? (
                    <tr><td colSpan={activeTab==='01'?6:5} style={{textAlign:'center', padding:'20px'}}>데이터가 없습니다.</td></tr>
                  ) : (
                    itemList.map((row) => (
                      <tr key={row.itemCd} onClick={() => handleListClick(row)} className={formData.itemCd === row.itemCd ? 'selected' : ''}>
                        <td>{row.itemCd}</td><td style={{fontWeight:'bold'}}>{row.itemNm}</td>
                        {activeTab === '01' && <td style={{fontSize:'12px', color:'#555'}}>{row.typePath || '-'}</td>}
                        <td>{row.itemSpec}</td><td style={{textAlign:'right'}}>{(row.itemCost||0).toLocaleString()}</td>
                        <td><button className="btn-icon-delete" onClick={(e) => handleRowDelete(e, row)}>🗑️</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bom-right-panel" style={{ flex: 1 }}>
          <div className="panel-header" style={{ marginBottom: '15px', borderBottom: '1px solid #ddd' }}>✨ 상세 정보 {isEditMode ? '(수정)' : '(신규)'}</div>
          <div className="bom-form-row"><label className="bom-label">품목코드</label><input className="bom-input" name="itemCd" value={formData.itemCd} onChange={handleChange} readOnly={isEditMode} placeholder="자동/수동 입력" /></div>
          <div className="bom-form-row"><label className="bom-label">품목명</label><input className="bom-input" name="itemNm" value={formData.itemNm} onChange={handleChange} /></div>
          {activeTab === '01' && (
            <div className="bom-form-row"><label className="bom-label">분류</label>
              <select className="bom-input" name="typeCd" value={formData.typeCd} onChange={handleChange}>
                <option value="">(선택 안함)</option>
                {flatCategoryOptions.map(opt => <option key={opt.typeCd} value={opt.typeCd}>{opt.typeNm}</option>)}
              </select>
            </div>
          )}
          <div className="bom-form-row"><label className="bom-label">규격</label><input className="bom-input" name="itemSpec" value={formData.itemSpec || ''} onChange={handleChange} /></div>
          <div className="bom-form-row"><label className="bom-label">단위</label><input className="bom-input" name="itemUnit" value={formData.itemUnit || ''} onChange={handleChange} /></div>
          <div className="bom-form-row"><label className="bom-label">단가</label><input className="bom-input" type="number" name="itemCost" value={formData.itemCost} onChange={handleChange} style={{textAlign:'right'}} /></div>
        </div>
      </div>
    </div>
  );
}