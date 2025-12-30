// src/components/Header.js
import React, { useRef, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext' // Context import

function Header({ 
  historyIndex, 
  historyLength, 
  onNavigate, 
  activeClickedItem,
  currentDateTime,
  formatDateTime
}) {
  const { user, isLoggedIn, logout } = useAuth(); // 사용자 정보와 로그아웃 함수

  // ... (기존 useRef, useEffect 등은 그대로 유지) ...
  const statusTextRef = useRef(null)
  const appTitleRef = useRef(null)
  const [showStatusText, setShowStatusText] = useState(true)

  useEffect(() => {
    const checkOverlap = () => {
      if (window.innerWidth <= 768) {
        setShowStatusText(false)
        return
      }
      if (statusTextRef.current && appTitleRef.current) {
        const statusRect = statusTextRef.current.getBoundingClientRect()
        const titleRect = appTitleRef.current.getBoundingClientRect()
        setShowStatusText(statusRect.right + 10 <= titleRect.left)
      }
    }
    window.addEventListener('resize', checkOverlap)
    checkOverlap()
    return () => window.removeEventListener('resize', checkOverlap)
  }, [activeClickedItem])

  return (
    <header className="title-bar">
      <div className="title-bar-left">
        {/* 네비게이션 버튼들 (기존 코드) */}
        <div className="nav-buttons">
          <button className="nav-btn nav-back" disabled={historyIndex <= 0} onClick={() => onNavigate(-1)}>←</button>
          <button className="nav-btn nav-forward" disabled={historyIndex >= historyLength - 1} onClick={() => onNavigate(1)}>→</button>
        </div>

        {/* 경로 표시 (기존 코드) */}
        {activeClickedItem && (
          <span ref={statusTextRef} className="status-text" style={{ display: showStatusText ? 'inline' : 'none', visibility: showStatusText ? 'visible' : 'hidden' }}>
            폼 보기 &gt; {activeClickedItem.tab} &gt; {activeClickedItem.name}
          </span>
        )}
      </div>

      <h1 ref={appTitleRef} className="app-title">식품 제조 유통 시스템</h1>

      <div className="title-bar-right">
        {/* 🌟 [수정] 사용자 정보 및 로그아웃 버튼 표시 */}
        {isLoggedIn && user && (
          <div className="user-info-area" style={{marginRight: '15px', fontSize: '14px', color:'#fff', display:'flex', alignItems:'center', gap:'10px'}}>
            <span>👤 <strong>{user.userName || user.userId}</strong> 님</span>
            <button 
              onClick={logout} 
              style={{
                background: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.5)', 
                color: 'white', 
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: '12px'
              }}
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