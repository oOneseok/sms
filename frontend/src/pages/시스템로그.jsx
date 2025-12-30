import React, { useState, useEffect } from 'react';
import '../css/pages/BusinessPage.css';

export default function 시스템로그() {
  const [logs, setLogs] = useState([]);

  // 데이터 조회
  useEffect(() => {
    fetch('http://localhost:8080/api/logs') 
      .then(res => {
          if(!res.ok) throw new Error("서버 연결 실패");
          return res.json();
      })
      .then(data => {
          // 최신순 정렬 (logNo 내림차순 가정)
          const sorted = Array.isArray(data) 
            ? data.sort((a, b) => b.logNo.localeCompare(a.logNo)) 
            : [];
          setLogs(sorted);
      })
      .catch(err => {
          console.error(err);
          setLogs([]); 
      });
  }, []);

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return dateString.replace('T', ' ').substring(0, 16);
  };

  // 행위(Action) 배지
  const getActionBadge = (type) => {
    const style = {
      padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
      color: '#fff', display: 'inline-block', minWidth: '40px', textAlign: 'center'
    };
    switch(type) {
      case '등록': return <span style={{...style, background: '#2196f3'}}>등록</span>;
      case '수정': return <span style={{...style, background: '#ff9800'}}>수정</span>;
      case '삭제': return <span style={{...style, background: '#f44336'}}>삭제</span>;
      default: return <span style={{...style, background: '#9e9e9e'}}>{type}</span>;
    }
  };

  return (
    <div className="business-page">
      
      {/* 1. 헤더 */}
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
                            <th style={{padding:'12px', width:'140px'}}>로그번호</th>
                            <th style={{padding:'12px', width:'140px'}}>일시</th>
                            <th style={{padding:'12px', width:'100px'}}>사용자</th>
                            <th style={{padding:'12px', width:'120px'}}>메뉴</th>
                            <th style={{padding:'12px', width:'80px'}}>행위</th>
                            <th style={{padding:'12px'}}>대상 정보 / 상세 내용</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(logs) && logs.map((log) => (
                            <tr key={log.logNo}>
                                {/* 로그번호 */}
                                <td style={{textAlign:'center', color:'#888', fontSize:'12px'}}>
                                  {log.logNo}
                                </td>
                                
                                {/* 일시 */}
                                <td style={{textAlign:'center', fontSize:'13px'}}>
                                  {formatDate(log.logDt)}
                                </td>

                                {/* 사용자 (뱃지 스타일) */}
                                <td style={{textAlign:'center'}}>
                                    <span style={{
                                        background: '#e3f2fd', 
                                        color: '#1565c0', 
                                        padding: '2px 8px', 
                                        borderRadius: '10px', 
                                        fontSize: '11px', 
                                        fontWeight: 'bold'
                                    }}>
                                        {log.logUser || 'anonymous'}
                                    </span>
                                </td>

                                {/* 메뉴명 */}
                                <td style={{textAlign:'center', fontWeight:'bold', color:'#333'}}>
                                    {log.menuName}
                                </td>

                                {/* 유형 */}
                                <td style={{textAlign:'center'}}>
                                    {getActionBadge(log.actionType)}
                                </td>

                                {/* 대상 정보 및 상세 내용 */}
                                <td style={{padding:'10px 15px'}}>
                                    {/* 1. 대상 이름 (예: 삼성전자) */}
                                    <div style={{fontWeight:'bold', color:'#333', fontSize:'14px'}}>
                                      {log.targetName || '-'}
                                      {log.targetKey && (
                                        <span style={{color:'#999', fontSize:'12px', marginLeft:'6px', fontWeight:'normal'}}>
                                          ({log.targetKey})
                                        </span>
                                      )}
                                    </div>

                                    {/* 2. 상세 내용 (예: 주문품목: 삼각김밥) - 있을 때만 표시 */}
                                    {log.changeContents && (
                                      <div style={{
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        color: '#555',
                                        background: '#f9f9f9',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #eee'
                                      }}>
                                        📄 {log.changeContents}
                                      </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        
                        {(!Array.isArray(logs) || logs.length === 0) && (
                            <tr>
                                <td colSpan="6" style={{textAlign:'center', padding:'50px', color:'#999'}}>
                                    로그 데이터가 없습니다.
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