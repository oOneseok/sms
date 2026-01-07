import React from 'react'

function MenuBar({ 
  tabs, 
  selectedTab, 
  setSelectedTab, 
  menuItems, 
  selectedMenuItem, 
  onMenuClick // ✅ 중요: App.js에서 받은 "클릭 처리 함수"
}) {

  return (
    <div className="menu-bar">
      {/* 1. 상단 탭 (대분류) */}
      <div className="menu-tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`menu-tab ${selectedTab === tab ? 'active' : ''}`}
            onClick={() => {
              if (selectedTab === tab) {
                setSelectedTab(null)
              } else {
                setSelectedTab(tab)
              }
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2. 하단 툴바 (상세 메뉴) */}
      {selectedTab && menuItems[selectedTab] && (
        <div className="toolbar">
          <div className="toolbar-items">
            {menuItems[selectedTab].map((item, index) => (
              <div 
                key={index} 
                className={`toolbar-item ${selectedMenuItem === item.name ? 'selected' : ''}`} 
                // ✅ 수정된 부분: 복잡한 slice 로직 싹 다 지우고, 부모한테 "나 클릭됐어"라고 알림만 보냄
                onClick={() => onMenuClick(item, selectedTab)} 
              >
                <div className="toolbar-icon">{item.icon}</div>
                <div className="toolbar-label">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuBar