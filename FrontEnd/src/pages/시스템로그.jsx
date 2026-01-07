import React, { useState, useEffect } from 'react';
import '../css/pages/시스템로그.css'; // 수정된 CSS 사용

export default function 시스템로그() {
  // === 상태 관리 ===
  const [logs, setLogs] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);

  // 날짜 필터 (기본값: 오늘 날짜)
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2025-01-01'); // 예시 기본값
  const [endDate, setEndDate] = useState(today);

  // 검색 필터
  const [searchType, setSearchType] = useState('USER'); // USER, MENU, TARGET
  const [searchTerm, setSearchTerm] = useState('');

  // 정렬 상태
  const [sortOrder, setSortOrder] = useState('DESC');

  // === 초기 조회 ===
  useEffect(() => {
    fetchLogs(0);
  }, [sortOrder]); // 정렬 변경 시 재조회

  // === API 호출 ===
  const fetchLogs = async (pageIndex) => {
    setLoading(true);
    try {
      // 쿼리 파라미터 구성
      const params = new URLSearchParams({
        page: pageIndex,
        size: 20, // 한 페이지당 개수
        sort: `logNo,${sortOrder.toLowerCase()}` // 정렬 기준
      });

      // 날짜 필터가 있다면 추가 (백엔드 지원 시)
      // if (startDate) params.append('fromDt', startDate);
      // if (endDate) params.append('toDt', endDate);

      // 검색어 필터가 있다면 추가
      // if (searchTerm) {
      //    params.append('searchType', searchType);
      //    params.append('keyword', searchTerm);
      // }

      // 실제 API 호출
      const res = await fetch(`http://localhost:8080/api/logs?${params.toString()}`);
      
      if (res.ok) {
        const data = await res.json();
        
        // 백엔드가 Page 객체를 리턴한다고 가정 (content, totalElements 등)
        // 만약 List만 리턴한다면 클라이언트 페이징으로 처리해야 함
        if (data.content) {
            setLogs(data.content);
            setPageInfo({
                page: data.number,
                totalPages: data.totalPages,
                totalElements: data.totalElements
            });
        } else if (Array.isArray(data)) {
            // List로 오는 경우 (임시 처리)
            let filtered = data;
            
            // 클라이언트 필터링 (API 파라미터 미지원 시)
            if (searchTerm) {
                filtered = filtered.filter(log => {
                    const val = searchType === 'USER' ? log.logUser : 
                                searchType === 'MENU' ? log.menuName : 
                                (log.targetName || '');
                    return val && val.includes(searchTerm);
                });
            }

            // 클라이언트 날짜 필터링
            if (startDate && endDate) {
               filtered = filtered.filter(log => {
                   const logDate = log.logDt ? log.logDt.split('T')[0] : '';
                   return logDate >= startDate && logDate <= endDate;
               });
            }

            // 클라이언트 정렬
            filtered.sort((a, b) => {
                return sortOrder === 'DESC' 
                    ? b.logNo.localeCompare(a.logNo) 
                    : a.logNo.localeCompare(b.logNo);
            });

            setLogs(filtered);
            setPageInfo({ page: 0, totalPages: 1, totalElements: filtered.length });
        }
      } else {
        console.error("서버 응답 오류");
      }
    } catch (e) {
      console.error("로그 조회 실패", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // === 핸들러 ===
  const handleSearch = () => {
    fetchLogs(0); // 검색 버튼 클릭 시 0페이지부터 조회
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < pageInfo.totalPages) {
        fetchLogs(newPage);
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return dateString.replace('T', ' ').substring(0, 16);
  };

  const getActionBadge = (type) => {
    const style = {
      padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: '600',
      color: '#fff', display: 'inline-block', minWidth: '40px', textAlign: 'center'
    };
    switch(type) {
      case '등록': return <span style={{...style, background: '#10b981'}}>등록</span>;
      case '수정': return <span style={{...style, background: '#f59e0b'}}>수정</span>;
      case '삭제': return <span style={{...style, background: '#ef4444'}}>삭제</span>;
      default: return <span style={{...style, background: '#9ca3af'}}>{type}</span>;
    }
  };

  return (
    <div className="log-page-container">
      <div className="log-page-wrapper">
        
        {/* 1. 헤더 & 필터 영역 (입출고 내역 스타일) */}
        <div className="page-header">
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <h2 className="page-title">시스템 로그</h2>
                <div style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px'}}>
                    <span>기간:</span>
                    <input 
                        type="date" className="date-input" 
                        value={startDate} onChange={e => setStartDate(e.target.value)}
                    />
                    <span className="date-separator">~</span>
                    <input 
                        type="date" className="date-input" 
                        value={endDate} onChange={e => setEndDate(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select 
                        className="search-select"
                        value={searchType} 
                        onChange={e => setSearchType(e.target.value)}
                    >
                        <option value="USER">사용자</option>
                        <option value="MENU">메뉴명</option>
                        <option value="TARGET">대상정보</option>
                    </select>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="검색어를 입력하세요"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn-search" onClick={handleSearch}>조회</button>
                </div>
            </div>

            <div className="total-count-badge">
                총 건수: {pageInfo.totalElements.toLocaleString()} 건
            </div>
        </div>

        {/* 2. 테이블 컨텐츠 (꽉 채움) */}
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th 
                            style={{width:'160px', cursor:'pointer'}} 
                            onClick={toggleSort}
                        >
                            로그번호 {sortOrder === 'DESC' ? '▼' : '▲'}
                        </th>
                        <th style={{width:'150px'}}>일시</th>
                        <th style={{width:'100px'}}>사용자</th>
                        <th style={{width:'120px'}}>메뉴</th>
                        <th style={{width:'80px'}}>행위</th>
                        <th>대상 정보 / 상세 내용</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan="6" style={{textAlign:'center', padding:'50px', color:'#9ca3af'}}>
                                로딩중...
                            </td>
                        </tr>
                    ) : logs.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{textAlign:'center', padding:'100px 0', color:'#9ca3af'}}>
                                조회된 로그가 없습니다.
                            </td>
                        </tr>
                    ) : (
                        logs.map((log) => (
                            <tr key={log.logNo}>
                                <td style={{color:'#6b7280', fontSize:'12px'}}>
                                  {log.logNo}
                                </td>
                                <td>
                                  {formatDate(log.logDt)}
                                </td>
                                <td>
                                    <span style={{ fontWeight: '600', color: '#374151' }}>
                                        {log.logUser || 'system'}
                                    </span>
                                </td>
                                <td style={{color:'#2563eb', fontWeight:'600'}}>
                                    {log.menuName}
                                </td>
                                <td>
                                    {getActionBadge(log.actionType)}
                                </td>
                                <td style={{textAlign:'left', paddingLeft:'20px'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <span style={{fontWeight:'bold', color:'#111827', fontSize:'13px'}}>
                                            {log.targetName || '-'}
                                        </span>
                                        {log.targetKey && (
                                            <span style={{color:'#9ca3af', fontSize:'11px'}}>
                                                ({log.targetKey})
                                            </span>
                                        )}
                                    </div>
                                    {log.changeContents && (
                                        <div style={{marginTop:'4px', fontSize:'12px', color:'#6b7280', background:'#f3f4f6', padding:'4px 8px', borderRadius:'4px', display:'inline-block'}}>
                                            📄 {log.changeContents}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* 3. 하단 페이지네이션 */}
        <div className="pagination-bar">
            <button 
                className="page-btn" 
                disabled={pageInfo.page === 0}
                onClick={() => handlePageChange(pageInfo.page - 1)}
            >
                &lt; 이전
            </button>
            <span className="page-info">
                Page <strong>{pageInfo.page + 1}</strong> of {pageInfo.totalPages || 1}
            </span>
            <button 
                className="page-btn" 
                disabled={pageInfo.page >= pageInfo.totalPages - 1}
                onClick={() => handlePageChange(pageInfo.page + 1)}
            >
                다음 &gt;
            </button>
        </div>

      </div>
    </div>
  );
}