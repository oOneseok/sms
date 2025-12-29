import React, { useState, useEffect } from 'react';
import '../css/pages/출입고관리.css';

function OutboundManagement() {
    const [data, setData] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/inout');
            const result = await response.json();
            // 'OUT' 타입만 필터링
            const outboundData = result.filter(item => item.ioType === 'OUT');
            setData(outboundData);
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
        }
    };

    const selectedData = selectedRow ? data.find(row => row.id === selectedRow) : null;

    const handleRowClick = (id) => {
        setSelectedRow(id);
    };

    const handleDetailChange = (field, value) => {
        if (selectedRow !== null) {
            setData(prev => prev.map(row => (row.id === selectedRow ? { ...row, [field]: value } : row)));
        }
    };

    const handleNew = () => {
        const newId = "NEW_" + new Date().getTime();
        const newRow = {
            id: newId,
            ioCd: '',
            ioDt: new Date().toISOString().split('T')[0],
            ioType: 'OUT', // 타입 고정
            itemCd: '',
            qty: 0,
            fromWhCd: '',  // 출고는 출발 창고가 중요
            remark: '',
        };
        setData(prev => [newRow, ...prev]);
        setSelectedRow(newId);
    };

    const handleDelete = () => {
        if (!selectedRow) return;
        setData(prev => prev.filter(row => row.id !== selectedRow));
        setSelectedRow(null);
    };

    const handleSave = async () => {
        if (!selectedData) return;

        if (!selectedData.itemCd || !selectedData.qty || !selectedData.fromWhCd) {
            alert("품목, 수량, 출고 창고는 필수입니다.");
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/inout/out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedData),
            });

            if (response.ok) {
                alert("출고 처리가 완료되었습니다.");
                fetchData();
                setSelectedRow(null);
            } else {
                const errMsg = await response.text();
                alert("저장 실패: " + errMsg); // 예: "재고가 부족합니다" 메시지 표시
            }
        } catch (error) {
            console.error("저장 에러:", error);
            alert("시스템 오류가 발생했습니다.");
        }
    };

    return (
        <div className="inout-management-container">
            <div className="inout-management-wrapper">

                <div className="inout-header">
                    <h2 className="inout-title">출고 관리 (Outbound)</h2>
                    <div className="header-buttons">
                        <button className="excel-btn excel-btn-new" onClick={handleNew}>신규</button>
                        <button className="excel-btn excel-btn-delete" onClick={handleDelete} disabled={!selectedRow}>삭제</button>
                        <button className="excel-btn excel-btn-save" onClick={handleSave} disabled={!selectedRow}>저장</button>
                    </div>
                </div>

                <div className="inout-content-layout">
                    {/* 목록 테이블 */}
                    <div className="inout-list-panel">
                        <table className="excel-table">
                            <thead>
                            <tr>
                                <th>출고 코드</th>
                                <th>날짜</th>
                                <th>품목 코드</th>
                                <th>수량</th>
                                <th>출고 창고</th> {/* 입고창고 컬럼 제거 */}
                                <th>비고</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.map(row => (
                                <tr
                                    key={row.id}
                                    className={`excel-tr ${selectedRow === row.id ? 'selected' : ''}`}
                                    onClick={() => handleRowClick(row.id)}
                                >
                                    <td className="excel-td">{row.ioCd || '(신규)'}</td>
                                    <td className="excel-td">{row.ioDt}</td>
                                    <td className="excel-td">{row.itemCd}</td>
                                    <td className="excel-td">{row.qty}</td>
                                    <td className="excel-td">{row.fromWhCd}</td>
                                    <td className="excel-td">{row.remark}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 상세 편집 패널 */}
                    <div className="inout-detail-panel">
                        <h3>출고 상세 정보</h3>

                        <label>날짜</label>
                        <input type="date" className="excel-input"
                            value={selectedData?.ioDt || ''}
                            onChange={e => handleDetailChange('ioDt', e.target.value)}
                            disabled={!selectedRow}
                        />

                        <label>품목 코드</label>
                        <input className="excel-input"
                            value={selectedData?.itemCd || ''}
                            onChange={e => handleDetailChange('itemCd', e.target.value)}
                            disabled={!selectedRow}
                            placeholder="예: I1"
                        />

                        <label>출고 수량</label>
                        <input type="number" className="excel-input"
                            value={selectedData?.qty || ''}
                            onChange={e => handleDetailChange('qty', e.target.value)}
                            disabled={!selectedRow}
                        />

                        <label>출고 창고 (From)</label>
                        <input className="excel-input"
                            value={selectedData?.fromWhCd || ''}
                            onChange={e => handleDetailChange('fromWhCd', e.target.value)}
                            disabled={!selectedRow}
                            placeholder="예: W1"
                        />

                        <label>비고</label>
                        <input className="excel-input"
                            value={selectedData?.remark || ''}
                            onChange={e => handleDetailChange('remark', e.target.value)}
                            disabled={!selectedRow}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OutboundManagement;