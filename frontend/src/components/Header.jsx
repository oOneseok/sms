import React, { useRef, useState, useEffect } from 'react'

function Header({ 
  historyIndex, 
  historyLength, 
  onNavigate, // App.js에서 받은 이동 함수
  activeClickedItem,
  currentDateTime,
  formatDateTime
}) {
  const statusTextRef = useRef(null)
  const appTitleRef = useRef(null)
  const [showStatusText, setShowStatusText] = useState(true)

  // 반응형 텍스트 숨김 처리 (기존 로직 유지)
  useEffect(() => {
    const checkOverlap = () => {
      if (window.innerWidth <= 768) {
        setShowStatusText(false)
        return
      }
      if (statusTextRef.current && appTitleRef.current) {
        const statusRect = statusTextRef.current.getBoundingClientRect()
        const titleRect = appTitleRef.current.getBoundingClientRect()
        // 겹치면 숨김
        setShowStatusText(statusRect.right + 10 <= titleRect.left)
      }
    }
    
    window.addEventListener('resize', checkOverlap)
    checkOverlap() // 초기 실행
    return () => window.removeEventListener('resize', checkOverlap)
  }, [activeClickedItem])

  return (
    <header className="title-bar">
      <div className="title-bar-left">
        <div className="nav-buttons">
          {/* 뒤로 가기 */}
          <button 
            className="nav-btn nav-back"
            disabled={historyIndex <= 0}
            onClick={() => onNavigate(-1)}
          >
            ←
          </button>
          
          {/* 앞으로 가기 */}
          <button 
            className="nav-btn nav-forward"
            disabled={historyIndex >= historyLength - 1}
            onClick={() => onNavigate(1)}
          >
            →
          </button>
        </div>

        {/* 현재 활성화된 메뉴 경로 표시 */}
        {activeClickedItem && (
          <span 
            ref={statusTextRef}
            className="status-text"
            style={{ 
              display: showStatusText ? 'inline' : 'none',
              visibility: showStatusText ? 'visible' : 'hidden' // display:none은 레이아웃을 깨트릴 수 있어 visibility 병행 권장
            }}
          >
            폼 보기 &gt; {activeClickedItem.tab} &gt; {activeClickedItem.name}
          </span>
        )}
      </div>

      <h1 ref={appTitleRef} className="app-title">식품 제조 유통 시스템</h1>

      <div className="title-bar-right">
        <div className="datetime-display">
          <span className="datetime-date">{formatDateTime(currentDateTime).date}</span>
          <span className="datetime-time">{formatDateTime(currentDateTime).time}</span>
        </div>
      </div>
    </header>
  )
}

export default Header