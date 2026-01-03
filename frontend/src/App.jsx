import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom'
import './App.css'

// CSS 파일 import
import './css/components/Header.css'
import './css/components/MenuBar.css'
import './css/components/ClickedItemsList.css'
import './css/components/LoginDialog.css'
import './css/pages/pages.css'

// 컴포넌트 import
import Header from './components/Header'
import MenuBar from './components/MenuBar'
import ClickedItemsList from './components/ClickedItemsList'
import LoginDialog from './components/LoginDialog'

// Context import
import { AuthProvider, useAuth } from './context/AuthContext'

// 페이지 컴포넌트 import
import 사업장관리 from './pages/사업장관리.jsx'
import 거래처관리 from './pages/거래처관리.jsx'
import 품목관리 from './pages/품목관리.jsx'
import 공정관리 from './pages/공정관리.jsx'
import 창고관리 from './pages/창고관리.jsx'
import 발주관리 from './pages/발주관리.jsx'
import 주문관리 from './pages/주문관리.jsx'
import 출고관리 from './pages/출고관리.jsx'
import 반품관리 from './pages/반품관리.jsx'
import 입고관리 from './pages/입고관리.jsx'
import 생산실적관리 from './pages/생산실적관리.jsx'
import 시스템로그 from './pages/시스템로그.jsx'
import BOM관리 from './pages/BOM관리.jsx'
import 재고관리 from './pages/재고관리.jsx'
import 입출고이력 from './pages/입출고이력.jsx'

function MainContent() {
  const navigate = useNavigate()
  const { isLoggedIn, loading } = useAuth()

  const [tabs, setTabs] = useState([])
  const [menuItems, setMenuItems] = useState({})
  const [selectedTab, setSelectedTab] = useState('기준정보관리')
  const [selectedMenuItem, setSelectedMenuItem] = useState(null)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [clickedItems, setClickedItems] = useState([])
  const [activeClickedItem, setActiveClickedItem] = useState(null)
  const [navigationHistory, setNavigationHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchMenus = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/menus')
        if (!response.ok) throw new Error('메뉴 로드 실패')
        const data = await response.json()

        const newTabs = data.map(item => item.menuNm)
        const newMenuItems = {}
        data.forEach(rootItem => {
            newMenuItems[rootItem.menuNm] = rootItem.children
                ? rootItem.children.map(child => ({ name: child.menuNm, icon: child.menuIcon || '📄' }))
                : []
        })
        setTabs(newTabs)
        setMenuItems(newMenuItems)
      } catch (error) {
        console.error("메뉴 로딩 에러:", error)
      }
    }
    fetchMenus()
  }, [isLoggedIn])

  const nameToPath = (name) => name ? name.replace(/\s+/g, '').replace(/\//g, '') : ''

  const handleMenuClick = (item, tabName) => {
    if (activeClickedItem?.name === item.name && activeClickedItem?.tab === tabName) return
    const newItem = { name: item.name, icon: item.icon, tab: tabName }
    setClickedItems(prev => {
      if (!prev.find(ci => ci.name === item.name && ci.tab === tabName)) {
        return [...prev, newItem]
      }
      return prev
    })
    setActiveClickedItem(newItem)
    setSelectedMenuItem(item.name)
    if (selectedTab !== tabName) setSelectedTab(tabName)
    navigate(`/${nameToPath(tabName)}/${nameToPath(item.name)}`)
    addToHistory({ tab: tabName, menuItem: item.name, activeItem: newItem })
  }

  const addToHistory = (state) => {
    const newHistory = navigationHistory.slice(0, historyIndex + 1)
    newHistory.push(state)
    if (newHistory.length > 50) newHistory.shift()
    setNavigationHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleHistoryNavigate = (direction) => {
    const newIndex = historyIndex + direction
    if (newIndex < 0 || newIndex >= navigationHistory.length) return
    const state = navigationHistory[newIndex]
    setHistoryIndex(newIndex)
    setSelectedTab(state.tab)
    setSelectedMenuItem(state.menuItem)
    setActiveClickedItem(state.activeItem)
    navigate(`/${nameToPath(state.tab)}/${nameToPath(state.menuItem)}`)
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDateTime = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
  }

  if (loading) return null;

  return (
    <div className="app">
      {!isLoggedIn && <LoginDialog />}

      <Header
        historyIndex={historyIndex}
        historyLength={navigationHistory.length}
        onNavigate={handleHistoryNavigate}
        activeClickedItem={activeClickedItem}
        currentDateTime={currentDateTime}
        formatDateTime={formatDateTime}
      />

      <MenuBar
        tabs={tabs}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        menuItems={menuItems}
        selectedMenuItem={selectedMenuItem}
        onMenuClick={handleMenuClick}
      />

      <ClickedItemsList
        clickedItems={clickedItems}
        activeClickedItem={activeClickedItem}
        setActiveClickedItem={(item) => handleMenuClick(item, item.tab)}
        setClickedItems={setClickedItems}
        nameToPath={nameToPath}
      />

      <main className="main-content-area">
        <div className="work-area">
          <div className="blue-gradient-bg"></div>

          {/* 🔥 수정됨: .page-content 래퍼 제거 (각 페이지가 100% 높이 사용 가능하도록) */}
          {isLoggedIn ? (
            <Routes>
              <Route path="/" element={
                <div className="page-content">
                  <div className="page-message">메뉴를 선택해주세요.</div>
                </div>
              } />

              {/* 관리 페이지들은 work-area 바로 아래 렌더링 */}
              <Route path="/기준정보관리/사업장관리" element={<사업장관리 />} />
              <Route path="/기준정보관리/거래처관리" element={<거래처관리 />} />
              <Route path="/기준정보관리/품목관리" element={<품목관리 />} />
              <Route path="/기준정보관리/공정관리" element={<공정관리 />} />
              <Route path="/기준정보관리/창고관리" element={<창고관리 />} />
              <Route path="/기준정보관리/BOM관리" element={<BOM관리 />} />
              <Route path="/구매영업관리/발주관리" element={<발주관리 />} />
              <Route path="/구매영업관리/주문관리" element={<주문관리 />} />
              <Route path="/자재관리/입고관리" element={<입고관리 />} />
              <Route path="/자재관리/재고관리" element={<재고관리 />} />
              <Route path="/자재관리/출고관리" element={<출고관리 />} />
              <Route path="/자재관리/입출고이력" element={<입출고이력 />} />
              <Route path="/생산관리/생산실적관리" element={<생산실적관리 />} />
              <Route path="/시스템관리/시스템로그" element={<시스템로그 />} />
            </Routes>
          ) : (
            <div className="page-content">
              <div className="page-message">로그인이 필요합니다.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}

export default App