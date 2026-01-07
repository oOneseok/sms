import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/pages/management-common.css';
import SearchBar from '../components/SearchBar';

function 입출고내역() {
    const navigate = useNavigate(); // ✅ 네비게이션 객체 생성

    // === 상태 관리 ===
    const [historyList, setHistoryList] = useState([]);
    const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 0, totalElements: 0 });
    
    // === 검색 필터 ===
    const [searchType, setSearchType] = useState('ITEM_CD');
    const [searchTerm, setSearchTerm] = useState('');
    
    // 날짜 필터
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    // 정렬 상태
    const [sortOrder, setSortOrder] = useState('DESC');

    // === 초기 로드 ===
    useEffect(() => {
        fetchHistory(0); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder]);

    // === API 호출 ===
    const fetchHistory = async (pageIndex) => {
        try {
            const fromDt = startDate ? `${startDate}T00:00:00` : '';
            const toDt = endDate ? `${endDate}T23:59:59` : '';

            const params = new URLSearchParams({
                page: pageIndex,
                size: 20, 
                sort: `trxDt,${sortOrder.toLowerCase()}`
            });

            if (fromDt) params.append('fromDt', fromDt);
            if (toDt) params.append('toDt', toDt);

            if (searchTerm && searchTerm.trim() !== '') {
                if (searchType === 'ITEM_CD') {
                    params.append('itemCd', searchTerm);
                } else if (searchType === 'WH_CD') {
                    params.append('whCd', searchTerm);
                }
            }

            const res = await fetch(`http://localhost:8080/api/stock_his?${params.toString()}`);
            
            if (res.ok) {
                const data = await res.json();
                setHistoryList(data.content);
                setPageInfo({
                    page: data.number,
                    totalPages: data.totalPages,
                    totalElements: data.totalElements
                });
            } else {
                console.error("서버 응답 오류:", res.status);
            }
        } catch (e) {
            console.error("이력 조회 실패", e);
        }
    };

    // === 핸들러 ===
    const handleSearch = () => fetchHistory(0);

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < pageInfo.totalPages) {
            fetchHistory(newPage);
        }
    };

    const toggleSort = () => {
        setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
    };

    // ✅ [핵심] 더블 클릭 시 페이지 이동 핸들러
    const handleRowDoubleClick = (row) => {
        const refNo = row.refNo;
        if (!refNo) {
            alert("참조된 문서 번호가 없습니다.");
            return;
        }

        let targetPath = '';
        let targetName = '';

        // 번호 규칙에 따라 이동할 경로 설정 (실제 라우터 경로에 맞게 수정 필요)
        if (refNo.startsWith('PR')) {
            targetPath = '/생산관리/생산관리';
            targetName = '생산관리';
        } else if (refNo.startsWith('O')) {
            targetPath = '/구매영업관리/주문관리';      // 출고(주문) 관리 페이지
            targetName = '출고관리(주문)';
        } else if (refNo.startsWith('P')) {
            targetPath = '/구매영업관리/발주관리';   // 입고(발주) 관리 페이지
            targetName = '입고관리(발주)';
        } else {
            alert(`이동할 수 없는 문서 유형입니다. (${refNo})`);
            return;
        }

        // 사용자 확인 후 이동
        if (window.confirm(`[${targetName}] 화면으로 이동하여 상세 정보를 확인하시겠습니까?\n문서번호: ${refNo}`)) {
            navigate(targetPath, { state: { focusId: refNo } });
        }
    };

    
    const getTypeBadge = (type, qty) => {
        if (type === 'RESERVE') {
            return <span style={{color: '#fa8c16', fontWeight:'bold', background:'#fff7e6', padding:'2px 6px', borderRadius:'4px', border:'1px solid #ffe7ba'}}>예약</span>;
        }
        if (qty > 0) return <span style={{color: '#1890ff', fontWeight:'bold'}}>입고</span>;
        if (qty < 0) return <span style={{color: '#ff4d4f', fontWeight:'bold'}}>출고</span>;
        return <span>{type}</span>;
    };

    return (
        <div className="customer-management-container">
            <div className="customer-management-wrapper">
                
                {/* 헤더 영역 */}
                <div className="customer-header">
                    <div className="header-left-section" style={{gap: '15px'}}>
                        <h2 className="customer-title">수불부 (입출고 내역)</h2>
                        
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'}}>
                            <span style={{fontWeight:'600'}}>기간:</span>
                            <input 
                                type="date" className="excel-input" 
                                style={{height: '32px', padding: '0 8px'}}
                                value={startDate} onChange={e => setStartDate(e.target.value)}
                            />
                            <span>~</span>
                            <input 
                                type="date" className="excel-input" 
                                style={{height: '32px', padding: '0 8px'}}
                                value={endDate} onChange={e => setEndDate(e.target.value)}
                            />
                        </div>

                        <SearchBar
                            searchOptions={[
                                { value: 'ITEM_CD', label: '품목코드' },
                                { value: 'WH_CD', label: '창고코드' }
                            ]}
                            searchType={searchType}
                            onSearchTypeChange={setSearchType}
                            searchTerm={searchTerm}
                            onSearchTermChange={setSearchTerm}
                            onSearch={handleSearch}
                        />

                        <div className="statistics-info statistics-customer">
                            <span className="stat-label">총 건수:</span>
                            <span className="stat-value">{pageInfo.totalElements}</span>
                            <span className="stat-unit">건</span>
                        </div>
                    </div>
                </div>

                {/* 리스트 테이블 */}
                <div className="customer-content-layout">
                    <div className="customer-list-panel" style={{flex: 1, maxWidth: 'none', borderRight: 'none'}}>
                        <div className="list-table-wrapper">
                            <table className="excel-table">
                                <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                                    <tr>
                                        <th 
                                            className="excel-th" 
                                            style={{width: '160px', cursor: 'pointer', userSelect: 'none', backgroundColor: '#e6f7ff'}}
                                            onClick={toggleSort}
                                            title="클릭하여 정렬 변경"
                                        >
                                            일자 {sortOrder === 'DESC' ? '▼' : '▲'}
                                        </th>
                                        <th className="excel-th" style={{width: '80px'}}>구분</th>
                                        <th className="excel-th" style={{width: '120px'}}>품목코드</th>
                                        <th className="excel-th" style={{width: '100px'}}>창고</th>
                                        <th className="excel-th" style={{width: '100px'}}>변동수량</th>
                                        <th className="excel-th" style={{width: '150px'}}>거래처</th>
                                        <th className="excel-th" style={{width: '150px'}}>참조번호</th>
                                        <th className="excel-th">비고 (근거)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyList.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
                                                조회된 데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        historyList.map((row) => (
                                            <tr 
                                                key={row.stkHisCd} 
                                                className="excel-tr"
                                                style={{cursor: 'pointer'}} /* ✅ 커서 손가락 모양 */
                                                title="더블 클릭하여 상세 문서로 이동"
                                                onDoubleClick={() => handleRowDoubleClick(row)} /* ✅ 더블 클릭 이벤트 연결 */
                                            >
                                                <td className="excel-td" style={{textAlign:'center'}}>{row.ioDt}</td>
                                                <td className="excel-td" style={{textAlign:'center'}}>
                                                    {getTypeBadge(row.ioType, row.qty)}
                                                </td>
                                                <td className="excel-td" style={{textAlign:'center'}}>{row.itemCd}</td>
                                                <td className="excel-td" style={{textAlign:'center'}}>{row.whCd}</td>
                                                <td className="excel-td" style={{textAlign:'right', fontWeight:'600', color: row.qty > 0 ? '#1890ff' : '#ff4d4f'}}>
                                                    {row.qty > 0 ? '+' : ''}{Number(row.qty).toLocaleString()}
                                                </td>
                                                <td className="excel-td">{row.custNm || row.custCd}</td>
                                                <td className="excel-td" style={{fontSize: '12px', color: '#555', fontWeight:'bold', textDecoration:'underline'}}>
                                                    {row.refNo}
                                                </td>
                                                <td className="excel-td" style={{color: '#666'}}>{row.remark}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 페이지네이션 */}
                        {pageInfo.totalPages > 0 && (
                            <div style={{display: 'flex', justifyContent: 'center', gap: '10px', padding: '15px', borderTop: '1px solid #eee'}}>
                                <button 
                                    className="excel-btn" 
                                    disabled={pageInfo.page === 0}
                                    onClick={() => handlePageChange(pageInfo.page - 1)}
                                    style={{padding: '5px 15px'}}
                                >
                                    &lt; 이전
                                </button>
                                <span style={{lineHeight: '30px', fontSize: '14px', color: '#555'}}>
                                    Page <strong>{pageInfo.page + 1}</strong> of {pageInfo.totalPages}
                                </span>
                                <button 
                                    className="excel-btn" 
                                    disabled={pageInfo.page === pageInfo.totalPages - 1}
                                    onClick={() => handlePageChange(pageInfo.page + 1)}
                                    style={{padding: '5px 15px'}}
                                >
                                    다음 &gt;
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default 입출고내역;