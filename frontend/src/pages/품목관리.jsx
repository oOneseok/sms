import React, { useState, useEffect, useMemo } from 'react';
import '../css/pages/ItemPage.css'; 
import '../css/pages/BomPage.css';

export default function 품목관리() {
  // === 상태 관리 ===
  const [itemList, setItemList] = useState([]); 
  const [typeTree, setTypeTree] = useState([]); 
  const [activeTab, setActiveTab] = useState('02'); // '02'(제품), '01'(자재)

  // 폼 데이터
  const [formData, setFormData] = useState({
    itemCd: '', itemNm: '', itemFlag: '02', typeCd: '', 
    itemSpec: '', itemUnit: '', itemCost: 0, minQty: 0, maxQty: 0, remark: ''
  });

  // 셀렉트 박스 상태
  const [selLarge, setSelLarge] = useState('');
  const [selMedium, setSelMedium] = useState('');

  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // 탐색기 폴더 상태
  const [currentFolder, setCurrentFolder] = useState(null); 

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [newTypeData, setNewTypeData] = useState({ code: '', name: '' });

  // === 1. 초기 로드 ===
  useEffect(() => {
    fetchList();
    fetchTypeTree();
  }, []);

  // === 2. 맵 생성 ===
  const typeMap = useMemo(() => {
    const map = {};
    const traverse = (nodes, parent = null) => {
        nodes.forEach(node => {
            map[node.typeCd] = { ...node, parent };
            if (node.children) traverse(node.children, node);
        });
    };
    traverse(typeTree);
    return map;
  }, [typeTree]);

  // === 3. 리스트 필터링 ===
  const displayList = useMemo(() => {
    if (activeTab === '02' || searchText) {
        let list = itemList.filter(item => item.itemFlag === activeTab);
        if (searchText) {
            list = list.filter(item => item.itemNm.includes(searchText) || item.itemCd.includes(searchText));
        }
        return list.map(item => ({ ...item, type: 'ITEM' }));
    }

    if (!currentFolder) {
        // 최상위 (대분류)
        return typeTree.map(node => ({ ...node, type: 'FOLDER' }));
    } else {
        // 폴더 내부 (자식 분류 + 자식 아이템)
        const childCategories = currentFolder.children ? currentFolder.children.map(node => ({ ...node, type: 'FOLDER' })) : [];
        const childItems = itemList.filter(item => item.itemFlag === '01' && item.typeCd === currentFolder.typeCd).map(item => ({ ...item, type: 'ITEM' }));
        return [...childCategories, ...childItems];
    }
  }, [itemList, typeTree, activeTab, searchText, currentFolder]);


  // === 탭 변경 핸들러 (폼 초기화) ===
  const handleTabChange = (tab) => {
      setActiveTab(tab);
      setCurrentFolder(null); // 폴더 탐색 초기화
      
      // 폼 데이터 완전 초기화
      setFormData({
        itemCd: '', itemNm: '', itemFlag: tab, typeCd: '', 
        itemSpec: '', itemUnit: '', itemCost: 0, minQty: 0, maxQty: 0, remark: ''
      });
      setSelLarge(''); 
      setSelMedium('');
      setIsEditMode(false);
  };


  // === API 호출 ===
  const fetchList = async () => {
    try {
        const res = await fetch('http://localhost:8080/api/item');
        if (res.ok) setItemList(await res.json());
    } catch (e) { console.error(e); }
  };
  const fetchTypeTree = async () => {
    try {
        const res = await fetch('http://localhost:8080/api/item-types');
        if (res.ok) setTypeTree(await res.json());
    } catch (e) { console.error(e); }
  };

  // === 핸들러: 리스트 클릭 ===
  const handleListClick = (row) => {
      if (row.type === 'FOLDER') {
          setCurrentFolder(row);
      } else {
          setFormData(row);
          setIsEditMode(true);
          syncSelectBox(row.typeCd);
      }
  };

  // === 핸들러: 리스트 내 아이콘 삭제 ===
  const handleRowDelete = async (e, row) => {
      e.stopPropagation(); 
      if (row.type === 'FOLDER') {
          if (!window.confirm(`[${row.typeNm}] 분류를 삭제하시겠습니까?\n(하위 분류 및 자재가 모두 삭제됩니다)`)) return;
          try {
              const res = await fetch(`http://localhost:8080/api/item-types/${row.typeCd}`, { method: 'DELETE' });
              if (res.ok) { 
                  alert("분류 삭제 완료"); 
                  fetchTypeTree(); 
                  fetchList(); 
                  if(currentFolder?.typeCd === row.typeCd) setCurrentFolder(null); 
              }
          } catch (e) { console.error(e); }
      } else {
          if (!window.confirm(`[${row.itemNm}] 삭제하시겠습니까?`)) return;
          try {
              const res = await fetch(`http://localhost:8080/api/item/${row.itemCd}`, { method: 'DELETE' });
              if (res.ok) { 
                  alert("삭제 완료"); 
                  fetchList(); 
                  if(formData.itemCd === row.itemCd) handleNew(); 
              }
          } catch (e) { console.error(e); }
      }
  };

  // === 네비게이션 ===
  const handleGoUp = () => {
      if (!currentFolder) return; 
      const currentInfo = typeMap[currentFolder.typeCd];
      setCurrentFolder((currentInfo && currentInfo.parent) ? typeMap[currentInfo.parent.typeCd] : null);
  };
  const handleGoRoot = () => setCurrentFolder(null);

  // === 우측 상세 동기화 ===
  const syncSelectBox = (code) => {
      if (!code || !typeMap[code]) { setSelLarge(''); setSelMedium(''); return; }
      const current = typeMap[code];
      if (current.typeLv === '02') {
          setSelMedium(current.typeCd);
          const large = current.parent ? typeMap[current.parent.typeCd] : null;
          setSelLarge(large ? large.typeCd : '');
      } else if (current.typeLv === '01') {
          setSelLarge(current.typeCd);
          setSelMedium('');
      }
  };

  // === 모달 ===
  const openCategoryModal = (mode) => {
      if (mode === 'MEDIUM' && !selLarge) return alert("대분류를 먼저 선택해주세요.");
      setModalMode(mode); setNewTypeData({ code: '', name: '' }); setIsModalOpen(true);
  };
  const closeCategoryModal = () => setIsModalOpen(false);
  const handleSaveCategory = async () => { 
      if(!newTypeData.code || !newTypeData.name) return alert("입력 확인");
      const isLarge = modalMode === 'LARGE';
      const lv = isLarge ? '01' : '02';
      const parentCd = isLarge ? null : selLarge;
      try {
          const res = await fetch('http://localhost:8080/api/item-types', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ typeCd: newTypeData.code, typeNm: newTypeData.name, typeLv: lv, parentType: parentCd })
          });
          if (res.ok) {
              alert("생성됨"); fetchTypeTree(); 
              if (isLarge) { setSelLarge(newTypeData.code); setFormData(p=>({...p, typeCd:newTypeData.code})); }
              else { setSelMedium(newTypeData.code); setFormData(p=>({...p, typeCd:newTypeData.code})); }
              closeCategoryModal();
          }
      } catch(e){}
  };

  // === 우측 폼 핸들러 ===
  const handleNew = () => {
    let initType = '';
    if (activeTab === '01' && currentFolder) {
        initType = currentFolder.typeCd;
        syncSelectBox(initType); 
    } else {
        setSelLarge(''); setSelMedium('');
    }

    setFormData({
      itemCd: '', itemNm: '', itemFlag: activeTab, typeCd: initType, 
      itemSpec: '', itemUnit: '', itemCost: 0, minQty: 0, maxQty: 0, remark: ''
    });
    setIsEditMode(false);
  };

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleLargeChange = (e) => { const v=e.target.value; setSelLarge(v); setSelMedium(''); setFormData(p=>({...p, typeCd:v})); };
  const handleMediumChange = (e) => { const v=e.target.value; setSelMedium(v); setFormData(p=>({...p, typeCd:v?v:selLarge})); };
  
  const handleSave = async () => { 
      if (!formData.itemCd || !formData.itemNm) return alert("필수값 누락");
      if (activeTab === '01' && !formData.typeCd) return alert("분류(대분류)는 필수입니다.");

      const payload = { ...formData, itemFlag: activeTab };

      try {
        const res = await fetch('http://localhost:8080/api/item', { 
            method: 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
        });
        if(res.ok) { alert("저장되었습니다."); fetchList(); }
        else { alert("저장 실패"); }
      } catch(e) { console.error(e); }
  };

  // 우측 상단 삭제 (현재 폼 보고있는거)
  const handleFormDelete = async () => { 
      if(!isEditMode) return;
      if(!window.confirm("정말 삭제하시겠습니까?")) return;
      try {
        const res = await fetch(`http://localhost:8080/api/item/${formData.itemCd}`, { method: 'DELETE' });
        if(res.ok) { alert("삭제되었습니다."); fetchList(); handleNew(); }
      } catch(e) { console.error(e); }
  };

  const largeOptions = typeTree; 
  const mediumOptions = selLarge ? (largeOptions.find(n => n.typeCd === selLarge)?.children || []) : [];

  return (
    <div className="bom-container">
      {/* 팝업 모달 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeCategoryModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">{modalMode==='LARGE'?'대분류 추가':'중분류 추가'}</div>
                <input className="bom-input" value={newTypeData.code} onChange={e=>setNewTypeData({...newTypeData, code:e.target.value})} placeholder="코드" style={{marginTop:'10px'}}/>
                <input className="bom-input" value={newTypeData.name} onChange={e=>setNewTypeData({...newTypeData, name:e.target.value})} placeholder="명칭" style={{marginTop:'10px'}}/>
                <div className="modal-footer">
                    <button className="bom-btn btn-save" onClick={handleSaveCategory}>저장</button>
                    <button className="bom-btn btn-cancel" onClick={closeCategoryModal}>취소</button>
                </div>
            </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="bom-header">
        <h2 className="bom-title">품목 관리</h2>
        <div>
            <button className="bom-btn btn-new" onClick={handleNew}>신규</button>
            <button className="bom-btn btn-save" onClick={handleSave}>저장</button>
            <button className="bom-btn btn-delete" onClick={handleFormDelete}>삭제</button>
        </div>
      </div>

      <div className="bom-search-bar">
         <span style={{fontWeight:'bold'}}>🔍 검색 : </span>
         <input className="bom-input" style={{maxWidth:'200px'}} value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="품목코드/명"/>
      </div>

      <div className="bom-main-layout">
        
        {/* [좌측] 탐색기형 리스트 */}
        <div className="bom-left-panel" style={{flex: 1.2}}>
            <div className="tab-header" style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                <button className={`bom-btn ${activeTab === '02' ? 'btn-save' : 'btn-cancel'}`} onClick={() => handleTabChange('02')}>📦 제품</button>
                <button className={`bom-btn ${activeTab === '01' ? 'btn-save' : 'btn-cancel'}`} onClick={() => handleTabChange('01')}>🔩 자재</button>
            </div>

            {activeTab === '01' && !searchText && (
                <div style={{padding:'5px 10px', background:'#f1f3f5', borderBottom:'1px solid #ddd', fontSize:'13px', display:'flex', alignItems:'center'}}>
                    <span onClick={handleGoRoot} style={{cursor:'pointer', fontWeight:'bold', color:'#007bff'}}>전체</span>
                    {currentFolder ? (
                        <>
                             {' > '} 
                             {currentFolder.parent && <span style={{color:'#666'}}>{currentFolder.parent.typeNm} {'>'} </span>}
                             <span style={{fontWeight:'bold'}}>{currentFolder.typeNm}</span>
                             <button onClick={handleGoUp} style={{marginLeft:'auto', padding:'2px 6px', fontSize:'11px', cursor:'pointer'}}>⬆ 상위로</button>
                        </>
                    ) : ( <span style={{color:'#999', marginLeft:'5px'}}> (최상위 분류)</span> )}
                </div>
            )}

            <div className="panel-box">
                <div className="table-scroll-area">
                    <table className="bom-table">
                        <thead>
                            <tr>
                                <th style={{width:'40px'}}></th> {/* 아이콘 */}
                                <th>코드</th>
                                <th>명칭</th>
                                <th>규격</th>
                                <th>단가</th>
                                <th className="col-delete"></th> {/* 삭제 헤더 비움 (아이콘용) */}
                            </tr>
                        </thead>
                        <tbody>
                            {displayList.length === 0 ? (
                                <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>데이터가 없습니다.</td></tr>
                            ) : (
                                displayList.map((row) => (
                                    <tr key={row.type === 'FOLDER' ? row.typeCd : row.itemCd} 
                                        onClick={() => handleListClick(row)}
                                        className={row.type === 'ITEM' && formData.itemCd === row.itemCd ? 'selected' : ''}
                                        style={{cursor:'pointer'}}
                                    >
                                        <td style={{textAlign:'center', fontSize:'16px'}}>
                                            {row.type === 'FOLDER' ? '📂' : '📄'}
                                        </td>
                                        <td>{row.type === 'FOLDER' ? row.typeCd : row.itemCd}</td>
                                        <td style={{fontWeight: row.type === 'FOLDER' ? 'bold' : 'normal'}}>
                                            {row.type === 'FOLDER' ? row.typeNm : row.itemNm}
                                        </td>
                                        <td>{row.type === 'ITEM' ? row.itemSpec : '-'}</td>
                                        <td style={{textAlign:'right'}}>
                                            {row.type === 'ITEM' ? (row.itemCost||0).toLocaleString() : '-'}
                                        </td>
                                        
                                        {/* 🔥 [수정됨] 깔끔한 아이콘 버튼 */}
                                        <td className="col-delete" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className="btn-icon-delete" 
                                                title="삭제"
                                                onClick={(e) => handleRowDelete(e, row)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* [우측] 상세 정보 */}
        <div className="bom-right-panel" style={{flex: 1}}>
            <div className="panel-header" style={{marginBottom:'15px', borderBottom:'1px solid #ddd'}}>✨ 상세 정보</div>
            
            <div style={{marginBottom:'10px', padding:'5px', background:'#e9ecef', borderRadius:'4px', textAlign:'center', fontWeight:'bold', color: activeTab==='02'?'#28a745':'#007bff'}}>
                {activeTab === '02' ? '📦 제품 (Product)' : '🔩 자재 (Material)'}
            </div>

            <div className="bom-form-row">
                <label className="bom-label">품목코드</label>
                <input className="bom-input" name="itemCd" value={formData.itemCd} onChange={handleChange} readOnly={isEditMode} placeholder="자동생성 or 입력"/>
            </div>
            <div className="bom-form-row">
                <label className="bom-label">품목명</label>
                <input className="bom-input" name="itemNm" value={formData.itemNm} onChange={handleChange} />
            </div>

            {activeTab === '01' && (
                <div style={{background:'#f9f9f9', padding:'10px', margin:'10px 0', borderRadius:'5px', border:'1px solid #eee'}}>
                    <div className="bom-form-row">
                        <label className="bom-label">대분류</label>
                        <div style={{display:'flex', gap:'5px', flex:1}}>
                            <select className="bom-input" style={{flex:1}} value={selLarge} onChange={handleLargeChange} disabled={isEditMode}>
                                <option value="">(선택)</option>
                                {largeOptions.map(t => <option key={t.typeCd} value={t.typeCd}>{t.typeNm}</option>)}
                            </select>
                            <button className="bom-btn btn-new" style={{padding:'0 8px'}} onClick={() => openCategoryModal('LARGE')} disabled={isEditMode}>+</button>
                        </div>
                    </div>
                    <div className="bom-form-row">
                        <label className="bom-label">중분류</label>
                        <div style={{display:'flex', gap:'5px', flex:1}}>
                            <select className="bom-input" style={{flex:1}} value={selMedium} onChange={handleMediumChange} disabled={!selLarge || isEditMode}>
                                <option value="">(없음)</option>
                                {mediumOptions.map(t => <option key={t.typeCd} value={t.typeCd}>{t.typeNm}</option>)}
                            </select>
                            <button className="bom-btn btn-new" style={{padding:'0 8px'}} onClick={() => openCategoryModal('MEDIUM')} disabled={!selLarge || isEditMode}>+</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bom-form-row">
                <label className="bom-label">규격</label>
                <input className="bom-input" name="itemSpec" value={formData.itemSpec || ''} onChange={handleChange} />
            </div>
            <div className="bom-form-row">
                <label className="bom-label">단위</label>
                <input className="bom-input" name="itemUnit" value={formData.itemUnit || ''} onChange={handleChange} />
            </div>
            <div className="bom-form-row">
                <label className="bom-label">단가</label>
                <input className="bom-input" type="number" name="itemCost" value={formData.itemCost} onChange={handleChange} style={{textAlign:'right'}}/>
            </div>
        </div>

      </div>
    </div>
  );
}