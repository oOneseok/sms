import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // ✅ useNavigate 추가
import '../css/pages/출입고관리.css';

function InboundManagement() {
    const [searchParams] = useSearchParams(); 
    const navigate = useNavigate(); // ✅ 네비게이션 훅 초기화
    
    // 탭 상태 (waiting: 입고대기, history: 입고이력)
    const [activeTab, setActiveTab] = useState('waiting');
    
    const [waitingList, setWaitingList] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [warehouseOptions, setWarehouseOptions] = useState([]); 
    const [selectedRow, setSelectedRow] = useState(null);

    // [초기 로딩 및 URL 감지]
    useEffect(() => {
        const paramCd = searchParams.get('purchaseCd');
        const paramStatus = searchParams.get('status');

        // 1. 상태값에 따라 탭 전환 (p3 완료건이면 내역 탭으로)
        if (paramStatus === 'p3') {
            setActiveTab('history');
        } else {
            setActiveTab('waiting');
        }

        fetchWarehouseList();

        const loadData = async () => {
            if (paramStatus === 'p3') {
                await fetchHistoryList(paramCd);
            } else {
                await fetchWaitingList(paramCd);
            }
        };
        loadData();

    }, [searchParams]);

    // 탭 전환 시에도 데이터 로드
    useEffect(() => {
        const paramCd = searchParams.get('purchaseCd');
        const paramStatus = searchParams.get('status');
        
        if (activeTab === 'waiting') {
            fetchWaitingList(paramStatus !== 'p3' ? paramCd : null);
        } else {
            fetchHistoryList(paramStatus === 'p3' ? paramCd : null);
        }
    }, [activeTab]);

    const fetchWarehouseList = async () => {
        try {
            const res = await fetch('http://localhost:8080/api/whs'); 
            const data = await res.json();
            const options = data.map(wh => ({
                code: wh.whCd, 
                name: `${wh.whNm} (${wh.whCd})`
            }));
            setWarehouseOptions(options);
        } catch (err) {
            console.error("창고 목록 로딩 실패:", err);
        }
    };

    const fetchWaitingList = async (filterCd = null) => {
        try {
            const res = await fetch('http://localhost:8080/api/inout/waiting-purchase');
            const data = await res.json();
            
            let formatted = data.map(item => ({
                ...item,
                uid: `${item.id.purchaseCd}-${item.id.seqNo}`,
                toWhCd: '' 
            }));

            // ✅ URL 파라미터로 넘어온 발주번호가 있으면 필터링
            if (filterCd) {
                formatted = formatted.filter(item => item.id.purchaseCd === filterCd);
            }

            setWaitingList(formatted);
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHistoryList = async (filterCd = null) => {
        try {
            const res = await fetch('http://localhost:8080/api/inout');
            const data = await res.json();
            
            let filtered = data.filter(item => item.ioType === 'IN');

            if (filterCd) {
                // 백엔드 ItemInOutDto에 refCd 필드가 추가되었다고 가정
                filtered = filtered.filter(item => item.refCd === filterCd);
            }

            setHistoryList(filtered);
            setSelectedRow(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRowClick = (row) => {
        setSelectedRow(row);
    };

    const handleDetailChange = (field, value) => {
        if (!selectedRow) return;
        setWaitingList(prev => prev.map(row => 
            row.uid === selectedRow.uid ? { ...row, [field]: value } : row
        ));
        setSelectedRow(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmInbound = async () => {
        if (!selectedRow) return;
        if (!selectedRow.toWhCd) {
            alert("입고할 창고를 선택해주세요.");
            return;
        }

        if (!window.confirm(`${selectedRow.itemCd} 품목을 ${selectedRow.toWhCd}로 입고 확정하시겠습니까?`)) return;

        try {
            const body = {
                purchaseCd: selectedRow.id.purchaseCd,
                seqNo: selectedRow.id.seqNo,
                itemCd: selectedRow.itemCd,
                qty: selectedRow.purchaseQty,
                toWhCd: selectedRow.toWhCd,
                remark: selectedRow.remark || '발주 입고'
            };

            const response = await fetch('http://localhost:8080/api/inout/in/from-purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                alert("입고 처리가 완료되었습니다.");
                const paramCd = searchParams.get('purchaseCd');
                fetchWaitingList(paramCd); 
            } else {
                const msg = await response.text();
                alert("처리 실패: " + msg);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("시스템 오류 발생");
        }
    };

    return (
        <div className="inout-management-container">
            {/* ✅ 필터링 상태 알림 바 & 뒤로가기 버튼 */}
            {searchParams.get('purchaseCd') && (
                <div style={{
                    padding: '8px 15px', 
                    background: '#e6f7ff', 
                    borderBottom: '1px solid #91d5ff', 
                    fontSize: '13px', 
                    color: '#0050b3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>
                        🔍 <strong>{searchParams.get('purchaseCd')}</strong> 발주 건으로 조회된 결과입니다.
                    </span>
                    <div>
                        {/* 🔙 뒤로가기 버튼 추가 */}
                        <button 
                            onClick={() => navigate(-1)} 
                            style={{
                                border: '1px solid #0050b3', 
                                background: '#0050b3', 
                                color: 'white', 
                                cursor: 'pointer', 
                                borderRadius: '3px',
                                padding: '2px 10px',
                                marginRight: '8px'
                            }}
                        >
                            ⬅ 돌아가기
                        </button>

                        {/* 전체보기 버튼 */}
                        <button 
                            onClick={() => window.location.href='/자재관리/입고관리'} 
                            style={{
                                border: '1px solid #1890ff', 
                                background: '#fff', 
                                color: '#1890ff', 
                                cursor: 'pointer', 
                                borderRadius: '3px',
                                padding: '2px 8px'
                            }}
                        >
                            전체보기
                        </button>
                    </div>
                </div>
            )}

            <div className="inout-management-wrapper">
                <div className="inout-header">
                    <h2 className="inout-title">입고 관리 (Inbound)</h2>
                    <div className="header-buttons">
                        <button 
                            className={`excel-btn ${activeTab === 'waiting' ? 'excel-btn-save' : ''}`}
                            onClick={() => setActiveTab('waiting')}
                            style={{marginRight: '10px'}}
                        >
                            입고 대기 (발주)
                        </button>
                        <button 
                            className={`excel-btn ${activeTab === 'history' ? 'excel-btn-save' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            입고 내역
                        </button>
                    </div>
                </div>

                <div className="inout-content-layout">
                    {/* 왼쪽 목록 패널 */}
                    <div className="inout-list-panel">
                        <table className="excel-table">
                            <thead>
                            {activeTab === 'waiting' ? (
                                <tr>
                                    <th>발주번호</th><th>순번</th><th>품목코드</th><th>발주수량</th><th>상태</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>입고코드</th><th>날짜</th><th>품목코드</th><th>수량</th><th>입고창고</th>
                                </tr>
                            )}
                            </thead>
                            <tbody>
                            {activeTab === 'waiting' ? (
                                waitingList.length === 0 ? 
                                <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>데이터가 없습니다.</td></tr> :
                                waitingList.map(row => (
                                    <tr 
                                        key={row.uid} 
                                        className={`excel-tr ${selectedRow?.uid === row.uid ? 'selected' : ''}`}
                                        onClick={() => handleRowClick(row)}
                                    >
                                        <td className="excel-td">{row.id.purchaseCd}</td>
                                        <td className="excel-td">{row.id.seqNo}</td>
                                        <td className="excel-td">{row.itemCd}</td>
                                        <td className="excel-td">{row.purchaseQty}</td>
                                        <td className="excel-td">{row.status === 'p2' ? '발주확정' : row.status}</td>
                                    </tr>
                                ))
                            ) : (
                                historyList.length === 0 ?
                                <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>데이터가 없습니다.</td></tr> :
                                historyList.map(row => (
                                    <tr key={row.ioCd} className="excel-tr">
                                        <td className="excel-td">{row.ioCd}</td>
                                        <td className="excel-td">{row.ioDt}</td>
                                        <td className="excel-td">{row.itemCd}</td>
                                        <td className="excel-td">{row.qty}</td>
                                        <td className="excel-td">{row.toWhCd}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* 오른쪽 상세 패널 */}
                    {activeTab === 'waiting' && (
                        <div className="inout-detail-panel">
                            <h3>입고 처리</h3>
                            <label>발주 번호</label>
                            <input className="excel-input" value={selectedRow?.id?.purchaseCd || ''} disabled />

                            <label>품목 코드</label>
                            <input className="excel-input" value={selectedRow?.itemCd || ''} disabled />

                            <label>입고 수량</label>
                            <input className="excel-input" value={selectedRow?.purchaseQty || ''} disabled />

                            <label>입고 창고 (필수)</label>
                            <select 
                                className="excel-input"
                                value={selectedRow?.toWhCd || ''}
                                onChange={(e) => handleDetailChange('toWhCd', e.target.value)}
                                disabled={!selectedRow}
                                style={{border: '2px solid #0078d4'}}
                            >
                                <option value="">-- 창고 선택 --</option>
                                {warehouseOptions.map(wh => (
                                    <option key={wh.code} value={wh.code}>
                                        {wh.name}
                                    </option>
                                ))}
                            </select>

                            <label>비고</label>
                            <input 
                                className="excel-input"
                                value={selectedRow?.remark || ''}
                                onChange={(e) => handleDetailChange('remark', e.target.value)}
                                disabled={!selectedRow}
                            />

                            <button 
                                className="excel-btn excel-btn-save" 
                                onClick={handleConfirmInbound}
                                disabled={!selectedRow}
                                style={{width: '100%', marginTop: '15px', height: '35px'}}
                            >
                                입고 확정 (재고반영)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default InboundManagement;