import React from 'react'
import { useNavigate } from 'react-router-dom'

function ClickedItemsList({
  clickedItems,
  activeClickedItem,
  setActiveClickedItem,
  selectedTab,
  setSelectedTab,
  setSelectedMenuItem,
  setClickedItems,
  navigationHistory,
  setNavigationHistory,
  historyIndex,
  setHistoryIndex,
  nameToPath
}) {
  const navigate = useNavigate()

  if (clickedItems.length === 0) return null

  return (
    <div className="clicked-items-list">
      <div className="clicked-items-tabs">
        {clickedItems.map((item, index) => (
          <div
            key={index}
            className={`clicked-item-tab ${activeClickedItem?.name === item.name && activeClickedItem?.tab === item.tab ? 'active' : ''}`}
            onClick={() => {
              setActiveClickedItem(item)
              // selectedTab은 변경하지 않음 (toolbar-items가 다시 열리지 않도록)
              setSelectedMenuItem(item.name)
              
              // URL 업데이트 (형식: /[tab]/[menuItem])
              navigate(`/${nameToPath(item.tab)}/${nameToPath(item.name)}`, { replace: false })
              
              // 탭 클릭도 히스토리에 저장
              const currentState = {
                tab: selectedTab || item.tab, // 현재 selectedTab이 있으면 유지, 없으면 item.tab 사용
                menuItem: item.name,
                clickedItems: [...clickedItems],
                activeClickedItem: item
              }
              
              const newHistory = navigationHistory.slice(0, historyIndex + 1)
              newHistory.push(currentState)
              setNavigationHistory(newHistory)
              setHistoryIndex(newHistory.length - 1)
            }}
          >
            <span className="clicked-item-icon">{item.icon}</span>
            <span className="clicked-item-text">{item.name}</span>
            <button
              className="clicked-item-close"
              onClick={(e) => {
                e.stopPropagation()
                const deletedItem = item
                const newItems = clickedItems.filter((_, i) => i !== index)
                setClickedItems(newItems)
                
                let newActiveItem = activeClickedItem
                if (activeClickedItem?.name === deletedItem.name && activeClickedItem?.tab === deletedItem.tab) {
                  newActiveItem = newItems.length > 0 ? newItems[newItems.length - 1] : null
                  setActiveClickedItem(newActiveItem)
                  if (newActiveItem) {
                    setSelectedTab(newActiveItem.tab)
                    setSelectedMenuItem(newActiveItem.name)
                    // URL 업데이트 (형식: /[tab]/[menuItem])
                    navigate(`/${nameToPath(newActiveItem.tab)}/${nameToPath(newActiveItem.name)}`, { replace: false })
                  } else {
                    setSelectedMenuItem(null)
                    // URL을 루트로 이동
                    navigate('/', { replace: false })
                  }
                }
                
                // 삭제도 히스토리에 저장 (엑셀처럼)
                const currentState = {
                  tab: newActiveItem ? newActiveItem.tab : selectedTab,
                  menuItem: newActiveItem ? newActiveItem.name : null,
                  clickedItems: newItems,
                  activeClickedItem: newActiveItem
                }
                
                const newHistory = navigationHistory.slice(0, historyIndex + 1)
                newHistory.push(currentState)
                setNavigationHistory(newHistory)
                setHistoryIndex(newHistory.length - 1)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClickedItemsList

