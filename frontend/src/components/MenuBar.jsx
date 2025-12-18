import React from 'react'

function MenuBar({ 
  tabs, 
  selectedTab, 
  setSelectedTab, 
  menuItems, 
  selectedMenuItem, 
  onMenuClick // App.js에서 받은 클릭 핸들러
}) {
  
  return (
    <div className="menu-bar">
      {/* 1. 상단 탭 영역 */}
      <div className="menu-tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`menu-tab ${selectedTab === tab ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab === selectedTab ? null : tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2. 하단 메뉴 툴바 영역 */}
      {selectedTab && menuItems[selectedTab] && (
        <div className="toolbar">
          <div className="toolbar-items">
            {menuItems[selectedTab].map((item, index) => (
              <div 
                key={index} 
                className={`toolbar-item ${selectedMenuItem === item.name ? 'selected' : ''}`} 
              
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