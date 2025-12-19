import React, { useState, useEffect } from 'react';
import '../css/pages/ItemPage.css'; 
import '../css/pages/BusinessPage.css'; // 공통 버튼 스타일

export default function 품목관리() {
  const [itemList, setItemList] = useState([]); // 전체 데이터
  const [filteredList, setFilteredList] = useState([]); // 탭에 의해 필터링된 데이터
  const [searchText, setSearchText] = useState('');
  
  // 현재 활성화된 탭 (기본값: '02' 제품)
  // 설계도상 제품이 먼저 보이므로 02를 기본으로 했습니다.
  const [activeTab, setActiveTab] = useState('02'); 

  const [formData, setFormData] = useState({
    itemCd: '',
    itemNm: '',
    itemFlag: '02', // 기본값 제품
    custCd: '',
    itemSpec: '',
    itemUnit: '',
    itemCost: 0,
    remark: ''
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // 1. 초기 조회
  useEffect(() => {
    fetchList();
  }, []);

  // 2. 탭이 바뀌거나 리스트가 바뀌면 필터링 수행
  useEffect(() => {
    // activeTab과 일치하는 데이터만 필터링
    const filtered = itemList.filter(item => item.itemFlag === activeTab);
    setFilteredList(filtered);
    
    // 탭 바꿀 때 폼 초기화 (선택사항)
    handleNew();
  }, [itemList, activeTab]);

  const fetchList = async (keyword = '') => {
    try {
        const url = keyword 
            ? `http://localhost:8080/api/item?searchText=${keyword}`
            : `http://localhost:8080/api/item`;
        
        const res = await fetch(url);
        if(res.ok) {
            const data = await res.json();
            setItemList(data);
        }
    } catch (err) {
        console.error(err);
    }
  };

  // 핸들러
  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') fetchList(searchText);
  };

  const handleRowClick = (item) => {
    setFormData(item);
    setIsEditMode(true);
  };

  const handleNew = () => {
    setFormData({
      itemCd: '',
      itemNm: '',
      itemFlag: activeTab, // ★ 신규 생성 시 현재 탭의 구분값으로 자동 설정
      custCd: '',
      itemSpec: '',
      itemUnit: '',
      itemCost: 0,
      remark: ''
    });
    setIsEditMode(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.itemCd || !formData.itemNm) {
        alert("품목코드와 품목명은 필수입니다.");
        return;
    }
    try {
        const res = await fetch('http://localhost:8080/api/item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            alert("저장되었습니다.");
            fetchList(searchText);
            setIsEditMode(true);
        } else {
            alert("저장 실패");
        }
    } catch (err) {
        console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
        const res = await fetch(`http://localhost:8080/api/item/${formData.itemCd}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            alert("삭제되었습니다.");
            handleNew();
            fetchList(searchText);
        }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="item-page">
      
      {/* 헤더 */}
      <div className="page-header">
        <h2 className="page-title">품목 관리</h2>
        <div className="button-group">
            <button className="btn new" onClick={handleNew}>신규</button>
            <button className="btn save" onClick={handleSave}>저장</button>
            <button className="btn delete" onClick={handleDelete}>삭제</button>
        </div>
      </div>

      {/* 검색창 */}
      <div className="item-search-bar">
        <span className="search-title">🔍 품목검색</span>
        <input 
            type="text" 
            className="search-input" // ProcessPage.css의 스타일 재사용하거나 ItemPage.css에 추가
            style={{width:'300px', height:'35px', border:'1px solid #ccc', borderRadius:'4px', padding:'0 10px'}}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="품목코드 또는 품목명 입력"
        />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="item-content">
        
        {/* [좌측] 리스트 (탭 포함) */}
        <div className="item-list-area">
            {/* 탭 버튼 */}
            <div className="tab-header">
                <button 
                    className={`tab-btn ${activeTab === '02' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('02')}
                >
                    📦 제품 (Product)
                </button>
                <button 
                    className={`tab-btn ${activeTab === '01' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('01')}
                >
                    🔩 자재 (Material)
                </button>
            </div>

            <div className="table-wrapper" style={{flex:1, overflowY:'auto'}}>
                <table className="list-table">
                    <thead>
                        <tr>
                            <th style={{width:'50px'}}>No</th>
                            <th style={{width:'100px'}}>품목코드</th>
                            <th>품목명</th>
                            <th style={{width:'80px'}}>단위</th>
                            <th style={{width:'100px'}}>규격</th>
                            <th style={{width:'100px'}}>단가</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length === 0 ? (
                            <tr><td colSpan="6" style={{padding:'50px', color:'#999'}}>데이터가 없습니다.</td></tr>
                        ) : (
                            filteredList.map((item, idx) => (
                                <tr 
                                    key={item.itemCd} 
                                    onClick={() => handleRowClick(item)}
                                    className={formData.itemCd === item.itemCd ? 'active' : ''}
                                >
                                    <td>{idx + 1}</td>
                                    <td>{item.itemCd}</td>
                                    <td style={{textAlign:'left', paddingLeft:'10px'}}>{item.itemNm}</td>
                                    <td>{item.itemUnit}</td>
                                    <td>{item.itemSpec}</td>
                                    <td style={{textAlign:'right', paddingRight:'10px'}}>
                                        {item.itemCost ? item.itemCost.toLocaleString() : 0}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* [우측] 상세 정보 */}
        <div className="item-detail-area">
            <div className="detail-title" style={{fontSize:'18px', fontWeight:'bold', marginBottom:'20px', borderBottom:'2px solid #333', paddingBottom:'10px'}}>
                ✨ 상세 정보 ({activeTab === '02' ? '제품' : '자재'})
            </div>

            <div className="detail-form-row">
                <div className="form-label">품목코드 <span style={{color:'red'}}>*</span></div>
                <div className="form-input-group">
                    <input type="text" className="form-input" name="itemCd" value={formData.itemCd} onChange={handleChange} readOnly={isEditMode} placeholder="예: ITM001"/>
                </div>
            </div>

            <div className="detail-form-row">
                <div className="form-label">품목명 <span style={{color:'red'}}>*</span></div>
                <div className="form-input-group">
                    <input type="text" className="form-input" name="itemNm" value={formData.itemNm} onChange={handleChange} />
                </div>
            </div>

            {/* 구분 (탭에 따라 자동 설정되지만 보여주기용) */}
            <div className="detail-form-row">
                <div className="form-label">구분</div>
                <div className="form-input-group">
                    <select className="form-input" name="itemFlag" value={formData.itemFlag} onChange={handleChange} disabled>
                        <option value="01">자재</option>
                        <option value="02">제품</option>
                    </select>
                </div>
            </div>

            <div className="detail-form-row">
                <div className="form-label">거래처코드</div>
                <div className="form-input-group">
                    <input type="text" className="form-input" name="custCd" value={formData.custCd || ''} onChange={handleChange} placeholder="거래처 코드" />
                </div>
            </div>

            <div className="detail-form-row">
                <div className="form-label">규격</div>
                <div className="form-input-group">
                    <input type="text" className="form-input" name="itemSpec" value={formData.itemSpec || ''} onChange={handleChange} />
                </div>
            </div>

            <div className="detail-form-row">
                <div className="form-label">단위</div>
                <div className="form-input-group">
                    <input type="text" className="form-input" name="itemUnit" value={formData.itemUnit || ''} onChange={handleChange} placeholder="EA, kg, box..." />
                </div>
            </div>

            <div className="detail-form-row">
                <div className="form-label">단가</div>
                <div className="form-input-group">
                    <input type="number" className="form-input" name="itemCost" value={formData.itemCost} onChange={handleChange} style={{textAlign:'right'}} />
                </div>
            </div>

            <div className="detail-form-row" style={{alignItems:'flex-start'}}>
                <div className="form-label" style={{marginTop:'10px'}}>비고</div>
                <div className="form-input-group">
                    <textarea 
                        className="form-input" 
                        name="remark" 
                        value={formData.remark || ''} 
                        onChange={handleChange} 
                        rows="4"
                        style={{resize:'none'}}
                    />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}