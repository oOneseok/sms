import React, { useState, useEffect } from 'react';
import '../css/pages/BusinessPage.css';

export default function 시스템로그() {
  const [logs, setLogs] = useState([]);

  // 데이터 조회
  useEffect(() => {
    // Controller 주소가 맞는지 확인하세요 (예: /api/logs)
    fetch('http://localhost:8080/api/logs') 
      .then(res => {
          if(!res.ok) throw new Error("서버 연결 실패 (404)");
          return res.json();
      })
      .then(data => {
          setLogs(Array.isArray(data) ? data : []);
      })
      .catch(err => {
          console.error(err);
          setLogs([]); 
      });
  }, []);

  // 날짜 포맷팅 함수 (2025-12-19T14:00:00 -> 2025-12-19 14:00)
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return dateString.replace('T', ' ').substring(0, 16);
  };

  // 행위(Action)에 따른 배지 스타일 반환 함수
  const getActionBadge = (type) => {
    const style = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#fff',
      display: 'inline-block',
      minWidth: '40px',
      textAlign: 'center'
    };

    switch(type) {
      case '등록': return <span style={{...style, background: '#2196f3'}}>등록</span>; // 파랑
      case '수정': return <span style={{...style, background: '#ff9800'}}>수정</span>; // 주황
      case '삭제': return <span style={{...style, background: '#f44336'}}>삭제</span>; // 빨강
      default: return <span style={{...style, background: '#9e9e9e'}}>{type}</span>; // 회색
    }
  };

  return (
    <div className="business-page">
      
      {/* 1. 헤더 영역 */}
      <div className="page-header">
        <h2 className="page-title">시스템 로그</h2>
        <div className="button-group">
            <button className="btn new" onClick={() => window.location.reload()}>새로고침</button>
        </div>
      </div>

      {/* 2. 메인 컨텐츠 */}
      <div className="content-split">
        <div className="list-section" style={{ flex: 1, width: '100%' }}>
            <div className="table-wrapper">
                <table className="data-table">
                    <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                        <tr>
                            <th style={{padding:'12px', width:'200px'}}>로그번호</th>
                            <th style={{padding:'12px', width:'160px'}}>일시</th>
                            <th style={{padding:'12px', width:'150px'}}>메뉴 (페이지)</th>
                            <th style={{padding:'12px', width:'100px'}}>유형</th>
                            <th style={{padding:'12px'}}>대상 정보 (이름 / ID)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(logs) && logs.map((log) => (
                            <tr key={log.logNo}>
                                {/* 로그번호 */}
                                <td style={{textAlign:'center', color:'#888', fontSize:'13px'}}>
                                  {log.logNo}
                                </td>
                                
                                {/* 일시 (포맷팅 적용) */}
                                <td style={{textAlign:'center'}}>
                                  {formatDate(log.logDt)}
                                </td>

                                {/* 메뉴명 (기존 logTable 대신 menuName) */}
                                <td style={{textAlign:'center', fontWeight:'bold', color:'#333'}}>
                                    {log.menuName}
                                </td>

                                {/* 유형 (등록/수정/삭제 배지) */}
                                <td style={{textAlign:'center'}}>
                                    {getActionBadge(log.actionType)}
                                </td>

                                {/* 대상 정보 (이름 + ID 같이 보여주기) */}
                                <td style={{padding:'10px 15px'}}>
                                    <span style={{fontWeight:'bold', color:'#333'}}>
                                      {log.targetName || '-'}
                                    </span>
                                    {log.targetKey && (
                                      <span style={{color:'#999', fontSize:'12px', marginLeft:'8px'}}>
                                        (ID: {log.targetKey})
                                      </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        
                        {(!Array.isArray(logs) || logs.length === 0) && (
                            <tr>
                                <td colSpan="5" style={{textAlign:'center', padding:'50px', color:'#999'}}>
                                    데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}