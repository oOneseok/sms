import React from 'react'
import { useAuth } from '../context/AuthContext' // ✅ [1] Context Import

function Header({ 
  historyIndex, 
  navigationHistory, 
  restoreStateFromHistory, 
  setHistoryIndex,
  activeClickedItem,
  statusTextRef,
  showStatusText,
  appTitleRef,
  currentDateTime,
  formatDateTime
}) {
  const { user, logout } = useAuth() // ✅ [2] 유저 정보 & 로그아웃 함수 가져오기

  return (
    <header className="title-bar">
      {/* --- 왼쪽 (뒤로가기/앞으로가기/경로) --- */}
      <div className="title-bar-left">
        <div className="nav-buttons">
          <button 
            className="nav-btn nav-back"
            disabled={historyIndex <= 0}
            onClick={() => {
              if (historyIndex > 0) {
                const prevIndex = historyIndex - 1
                setHistoryIndex(prevIndex)
                restoreStateFromHistory(prevIndex)
              }
            }}
          >
            ←
          </button>
          <button 
            className="nav-btn nav-forward"
            disabled={historyIndex >= navigationHistory.length - 1}
            onClick={() => {
              if (historyIndex < navigationHistory.length - 1) {
                const nextIndex = historyIndex + 1
                setHistoryIndex(nextIndex)
                restoreStateFromHistory(nextIndex)
              }
            }}
          >
            →
          </button>
        </div>
        {activeClickedItem && (
          <span 
            ref={statusTextRef}
            className="status-text"
            style={{ display: showStatusText ? 'inline' : 'none' }}
          >
            폼 보기{` > ${activeClickedItem.tab} > ${activeClickedItem.name}`}
          </span>
        )}
      </div>

      {/* --- 중앙 (타이틀) --- */}
      <h1 ref={appTitleRef} className="app-title">식품 제조 유통 시스템</h1>

      {/* --- 오른쪽 (유저정보/로그아웃/시계) --- */}
      <div className="title-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* ✅ [3] 유저 정보 및 로그아웃 버튼 추가 */}
        {user && (
            <div className="user-profile-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#444' }}>
                    {/* userNm이 없으면 userId 표시 */}
                    👤 {user.userNm || user.userId}님
                </span>
                <button 
                    onClick={logout}
                    style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        color: '#d13438', // 붉은색 텍스트
                        fontWeight: 'bold'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#ffeeef'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#fff'}
                >
                    로그아웃
                </button>
            </div>
        )}

        <div className="datetime-display">
          <span className="datetime-date">{formatDateTime(currentDateTime).date}</span>
          <span className="datetime-time">{formatDateTime(currentDateTime).time}</span>
        </div>
      </div>
    </header>
  )
}

export default Header