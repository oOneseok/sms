import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../css/pages/출입고관리.css';

function OutboundManagement() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // 탭 상태 (waiting: 출고대기, history: 출고이력)
    const [activeTab, setActiveTab] = useState('waiting');

    const [waitingList, setWaitingList] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [warehouseOptions, setWarehouseOptions] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    
    // ✅ [추가] 현재고 상태
    const [currentStock, setCurrentStock] = useState(null);

    // [초기 로딩 및 URL 감지]
    useEffect(() => {
        const paramCd = searchParams.get('orderCd');
        const paramStatus = searchParams.get('status');

        if (paramStatus === 'o3') {
            setActiveTab('history');
        } else {
            setActiveTab('waiting');
        }

        fetchWarehouseList();

        const loadData = async () => {
            if (paramStatus === 'o3') {
                await fetchHistoryList(paramCd);
            } else {
                await fetchWaitingList(paramCd);
            }
        };
        loadData();

    }, [searchParams]);

    // 탭 전환 시 데이터 리로드
    useEffect(() => {
        const paramCd = searchParams.get('orderCd');
        const paramStatus = searchParams.get('status');

        if (activeTab === 'waiting') {
            fetchWaitingList(paramStatus !== 'o3' ? paramCd : null);
        } else {
            fetchHistoryList(paramStatus === 'o3' ? paramCd : null);
        }
    }, [activeTab]);

    // ✅ [추가] 창고 선택 시 재고 조회
    useEffect(() => {
        if (selectedRow && selectedRow.fromWhCd && selectedRow.itemCd) {
            fetchStock(selectedRow.fromWhCd, selectedRow.itemCd);
        } else {
            setCurrentStock(null);
        }
    }, [selectedRow?.fromWhCd, selectedRow?.itemCd]);

    const fetchStock = async (whCd, itemCd) => {
        try {
            const res = await fetch(`http://localhost:8080/api/inout/stock/check?whCd=${whCd}&itemCd=${itemCd}`);
            if (res.ok) {
                const qty = await res.json();
                setCurrentStock(qty);
            }
        } catch (e) {
            console.error(e);
            setCurrentStock(0);
        }
    };

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
            const res = await fetch('http://localhost:8080/api/inout/waiting-order');
            const data = await res.json();

            let formatted = data.map(item => ({
                ...item,
                uid: `${item.id.orderCd}-${item.id.seqNo}`,
                fromWhCd: '' 
            }));

            if (filterCd) {
                formatted = formatted.filter(item => item.id.orderCd === filterCd);
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
            let filtered = data.filter(item => item.ioType === 'OUT');

            if (filterCd) {
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

    const handleConfirmOutbound = async () => {
        if (!selectedRow) return;
        if (!selectedRow.fromWhCd) {
            alert("출고할 창고(From)를 선택해주세요.");
            return;
        }

        // ✅ 재고 체크 (화면단 경고)
        if (currentStock !== null && currentStock < selectedRow.orderQty) {
            if(!window.confirm(`⚠️ 경고: 현재고(${currentStock})가 출고예정수량(${selectedRow.orderQty})보다 적습니다.\n그래도 진행하시겠습니까?`)) {
                return;
            }
        }

        if (!window.confirm(`${selectedRow.itemCd} 품목을 출고하시겠습니까?`)) return;

        try {
            const body = {
                orderCd: selectedRow.id.orderCd,
                seqNo: selectedRow.id.seqNo, // ✅ [필수] PK인 순번 전송
                itemCd: selectedRow.itemCd,
                qty: selectedRow.orderQty,
                fromWhCd: selectedRow.fromWhCd,
                remark: selectedRow.remark || '주문 출고'
            };

            const response = await fetch('http://localhost:8080/api/inout/out/from-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                alert("출고 처리가 완료되었습니다.");
                const paramCd = searchParams.get('orderCd');
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
            {searchParams.get('orderCd') && (
                <div style={{
                    padding: '8px 15px', 
                    background: '#fff1f0', 
                    borderBottom: '1px solid #ffa39e', 
                    fontSize: '13px', 
                    color: '#cf1322',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>
                        🔍 <strong>{searchParams.get('orderCd')}</strong> 주문 건으로 조회된 결과입니다.
                    </span>
                    <div>
                        <button 
                            onClick={() => navigate(-1)} 
                            style={{
                                border: '1px solid #cf1322', background: '#cf1322', color: 'white', 
                                cursor: 'pointer', borderRadius: '3px', padding: '2px 10px', marginRight: '8px'
                            }}
                        >
                            ⬅ 돌아가기
                        </button>
                        <button 
                            onClick={() => window.location.href='/자재관리/출고관리'} 
                            style={{
                                border: '1px solid #cf1322', background: '#fff', color: '#cf1322', 
                                cursor: 'pointer', borderRadius: '3px', padding: '2px 8px'
                            }}
                        >
                            전체보기
                        </button>
                    </div>
                </div>
            )}

            <div className="inout-management-wrapper">
                <div className="inout-header">
                    <h2 className="inout-title">출고 관리 (Outbound)</h2>
                    <div className="header-buttons">
                        <button 
                            className={`excel-btn ${activeTab === 'waiting' ? 'excel-btn-save' : ''}`}
                            onClick={() => setActiveTab('waiting')}
                            style={{marginRight: '10px'}}
                        >
                            출고 대기 (주문)
                        </button>
                        <button 
                            className={`excel-btn ${activeTab === 'history' ? 'excel-btn-save' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            출고 내역
                        </button>
                    </div>
                </div>

                <div className="inout-content-layout">
                    <div className="inout-list-panel">
                        <table className="excel-table">
                            <thead>
                            {activeTab === 'waiting' ? (
                                <tr><th>주문번호</th><th>순번</th><th>품목코드</th><th>주문수량</th><th>상태</th></tr>
                            ) : (
                                <tr><th>출고코드</th><th>날짜</th><th>품목코드</th><th>수량</th><th>출고창고</th></tr>
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
                                        <td className="excel-td">{row.id.orderCd}</td>
                                        <td className="excel-td">{row.id.seqNo}</td>
                                        <td className="excel-td">{row.itemCd}</td>
                                        <td className="excel-td">{row.orderQty}</td>
                                        <td className="excel-td">{row.status === 'o2' ? '주문확정' : row.status}</td>
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
                                        <td className="excel-td">{row.fromWhCd || row.whCd}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {activeTab === 'waiting' && (
                        <div className="inout-detail-panel">
                            <h3>출고 처리</h3>
                            
                            <label>주문 번호</label>
                            <input className="excel-input" value={selectedRow?.id?.orderCd || ''} disabled />

                            <label>품목 코드</label>
                            <input className="excel-input" value={selectedRow?.itemCd || ''} disabled />

                            <label>출고 수량</label>
                            <input className="excel-input" value={selectedRow?.orderQty || ''} disabled />

                            <label>출고 창고 (From) *</label>
                            <select 
                                className="excel-input"
                                value={selectedRow?.fromWhCd || ''}
                                onChange={(e) => handleDetailChange('fromWhCd', e.target.value)}
                                disabled={!selectedRow}
                                style={{border: '2px solid #cf1322'}}
                            >
                                <option value="">-- 창고 선택 --</option>
                                {warehouseOptions.map(wh => (
                                    <option key={wh.code} value={wh.code}>{wh.name}</option>
                                ))}
                            </select>

                            {/* ✅ [추가] 현재고 표시 */}
                            <div style={{margin: '5px 0', fontSize: '13px', color: '#666', textAlign: 'right'}}>
                                {selectedRow?.fromWhCd ? (
                                    <span>
                                        현재 창고 재고: <strong style={{color: currentStock < selectedRow?.orderQty ? 'red' : 'blue'}}>
                                            {currentStock !== null ? currentStock : '...'}
                                        </strong>
                                    </span>
                                ) : (
                                    <span>창고를 선택하면 재고가 표시됩니다.</span>
                                )}
                            </div>

                            <label>비고</label>
                            <input 
                                className="excel-input"
                                value={selectedRow?.remark || ''}
                                onChange={(e) => handleDetailChange('remark', e.target.value)}
                                disabled={!selectedRow}
                            />

                            <button 
                                className="excel-btn excel-btn-save" 
                                onClick={handleConfirmOutbound}
                                disabled={!selectedRow}
                                style={{width: '100%', marginTop: '15px', height: '35px', background: '#cf1322', border:'1px solid #cf1322'}}
                            >
                                출고 확정 (재고차감)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OutboundManagement;