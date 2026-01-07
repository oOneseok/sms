import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom'
import './App.css'

// CSS 파일 import
import './css/components/Header.css'
import './css/components/MenuBar.css'
import './css/components/ClickedItemsList.css'
import './css/components/LoginDialog.css'
import './css/pages/pages.css'
import './css/responsive/mobile-768px.css'
import './css/responsive/mobile-480px.css'

// 컴포넌트 import
import Header from './components/Header'
import MenuBar from './components/MenuBar'
import ClickedItemsList from './components/ClickedItemsList'
import LoginDialog from './components/LoginDialog' // (수정된 Context 사용 버전)

// Context import (반드시 필요)
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

// 페이지 컴포넌트 import
import 사업장관리 from './pages/사업장관리'
import 거래처관리 from './pages/거래처관리'
import 품목관리 from './pages/품목관리'
import 공정관리 from './pages/공정관리'
import 창고관리 from './pages/창고관리'
import 발주관리 from './pages/발주관리'
import 주문관리 from './pages/주문관리'
import 생산관리 from './pages/생산관리'
import BOM관리 from './pages/BOM관리'
import 재고관리 from './pages/재고관리'
import 출고관리 from './pages/출고관리'
import 입고관리 from './pages/입고관리'
import 입출고내역 from './pages/입출고내역'
import 시스템로그 from './pages/시스템로그'

function MainContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, loading } = useAuth() // Context 사용

  // 상태 관리
  const [selectedTab, setSelectedTab] = useState('기준정보관리')
  const [selectedMenuItem, setSelectedMenuItem] = useState(null)
  const [clickedItems, setClickedItems] = useState([])
  const [activeClickedItem, setActiveClickedItem] = useState(null)
  
  // 로그인 관련 상태 제거됨 (LoginDialog 내부에서 처리)
  
  const [navigationHistory, setNavigationHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showStatusText, setShowStatusText] = useState(true)
  const statusTextRef = useRef(null)
  const appTitleRef = useRef(null)
  const hasInitialized = useRef(false)

  // 메뉴 데이터 상태 (DB 연동)
  const [tabs, setTabs] = useState([])
  const [menuItems, setMenuItems] = useState({})

  // ✅ 메뉴 데이터 로드 (로그인 후 실행)
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchMenus = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/menus')
        if (!response.ok) {
            // 실패 시 기본 메뉴 사용 (기존 하드코딩 데이터)
            console.warn('메뉴 로드 실패, 기본값 사용');
            setTabs(['기준정보관리', '구매/영업관리', '자재관리', '생산관리', '시스템관리']);
            setMenuItems({
                '기준정보관리': [
                  { name: '사업장 관리', icon: '📦' },
                  { name: '거래처 관리', icon: '📋' },
                  { name: '품목 관리', icon: '📝' },
                  { name: '공정 관리', icon: '⚙️' },
                  { name: '창고 관리', icon: '🏭' },
                  { name: 'B.O.M 관리', icon: '📋' }
                ],
                '구매/영업관리': [
                  { name: '발주 관리', icon: '📄' },
                  { name: '주문 관리', icon: '📦' }
                ],
                '자재관리': [
                  { name: '입고 관리', icon: '📥' },
                  { name: '출고 관리', icon: '📤' },
                  { name: '재고 관리', icon: '📋' },
                  { name: '입출고 내역', icon: '📊' }
                ],
                '생산관리': [
                  { name: '생산 관리', icon: '📊' }
                ],
                '시스템관리': [
                  {name: '시스템 로그', icon: '📋'}
                ]
            });
            return;
        }
        
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

  // 시계
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 반응형 체크
  useEffect(() => {
    const isMobile = window.innerWidth <= 768
    if (isMobile) {
      setShowStatusText(false)
      return
    }
    let timeoutId = null
    const checkOverlap = () => {
        if (statusTextRef.current && appTitleRef.current) {
          const statusTextRect = statusTextRef.current.getBoundingClientRect()
          const appTitleRect = appTitleRef.current.getBoundingClientRect()
          const isOverlapping = statusTextRect.right + 10 > appTitleRect.left
          setShowStatusText(!isOverlapping)
        }
    }
    const debouncedCheck = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(checkOverlap, 150)
    }
    window.addEventListener('resize', debouncedCheck)
    checkOverlap()
    return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', debouncedCheck)
    }
  }, [activeClickedItem])

  const formatDateTime = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
  }

  // 경로 유틸
  const nameToPath = (name) => {
    return name ? name.replace(/\s+/g, '').replace(/\//g, '') : ''
  }

  const findMenuItemFromPath = (pathname) => {
    const path = decodeURIComponent(pathname.slice(1))
    if (!path) return null
    const parts = path.split('/')
    if (parts.length !== 2) return null
    const [tabPath, menuItemPath] = parts

    for (const [tab, items] of Object.entries(menuItems)) {
      if (nameToPath(tab) === tabPath) {
        const item = items.find(item => nameToPath(item.name) === menuItemPath)
        if (item) return { ...item, tab }
      }
    }
    return null
  }

  // 초기화 및 라우팅 감지
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      if (location.pathname !== '/') {
        // 새로고침 시에도 로그인 체크 후 이동하므로 일단 루트로 보내거나 유지
        // (AuthContext가 로딩 중일 수 있으므로 여기서 강제 이동은 주의)
      }
      setSelectedTab('기준정보관리')
    }
  }, [])

  useEffect(() => {
    if (!hasInitialized.current || !isLoggedIn) return

    const pathname = location.pathname
    if (pathname === '/') {
      setSelectedTab('기준정보관리')
      setSelectedMenuItem(null)
      return
    }

    const foundItem = findMenuItemFromPath(pathname)
    if (foundItem) {
      if (activeClickedItem?.name === foundItem.name && activeClickedItem?.tab === foundItem.tab) return

      setSelectedTab(foundItem.tab)
      setSelectedMenuItem(foundItem.name)
      setActiveClickedItem(foundItem)
      
      setClickedItems(prev => {
        if (!prev.find(ci => ci.name === foundItem.name && ci.tab === foundItem.tab)) {
          return [...prev, foundItem]
        }
        return prev
      })
    }
  }, [location.pathname, isLoggedIn, menuItems])

  // 히스토리 관리
  const handleMenuClick = (item, tabName) => {
      navigate(`/${nameToPath(tabName)}/${nameToPath(item.name)}`);
  };

  // 로딩 중
  if (loading) return null; // 또는 로딩 스피너

  return (
    <div className="app">
      {/* 로그인 안 된 상태면 로그인 창만 표시 (배경 흐리게 하거나 아예 이것만) */}
      {!isLoggedIn && <LoginDialog />}

      {/* 로그인 된 상태면 메인 화면 표시 */}
      {/* (LoginDialog가 overlay 방식이므로 아래 내용이 보여도 상관없지만, 보안상 숨길 수도 있음) */}
      
      <Header
        historyIndex={historyIndex}
        navigationHistory={navigationHistory}
        // restoreStateFromHistory... 등 필요한 props 전달
        setHistoryIndex={setHistoryIndex}
        activeClickedItem={activeClickedItem}
        statusTextRef={statusTextRef}
        showStatusText={showStatusText}
        appTitleRef={appTitleRef}
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
        setSelectedMenuItem={setSelectedMenuItem}
        clickedItems={clickedItems}
        setClickedItems={setClickedItems}
        setActiveClickedItem={setActiveClickedItem}
        nameToPath={nameToPath}
      />

      <ClickedItemsList
        clickedItems={clickedItems}
        activeClickedItem={activeClickedItem}
        setActiveClickedItem={setActiveClickedItem}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        setSelectedMenuItem={setSelectedMenuItem}
        setClickedItems={setClickedItems}
        nameToPath={nameToPath}
      />

      <main className="main-content-area">
        <div className="work-area">
          <div className="blue-gradient-bg"></div>
          <div className="page-content">
            {isLoggedIn ? (
                <Routes>
                <Route path="/" element={<div className="page-message">메뉴를 선택해주세요.</div>} />
                <Route path="/기준정보관리/거래처관리" element={<거래처관리 />} />
                <Route path="/기준정보관리/사업장관리" element={<사업장관리 />} />
                <Route path="/기준정보관리/품목관리" element={<품목관리 />} />
                <Route path="/기준정보관리/공정관리" element={<공정관리 />} />
                <Route path="/기준정보관리/창고관리" element={<창고관리 />} />
                <Route path="/기준정보관리/BOM관리" element={<BOM관리 />} />
                <Route path="/구매영업관리/발주관리" element={<발주관리 />} />
                <Route path="/구매영업관리/주문관리" element={<주문관리 />} />
                <Route path="/자재관리/입고관리" element={<입고관리 />} />
                <Route path="/자재관리/출고관리" element={<출고관리 />} />
                <Route path="/자재관리/재고관리" element={<재고관리 />} />
                <Route path="/자재관리/입출고내역" element={<입출고내역 />} />
                <Route path="/생산관리/생산관리" element={<생산관리 />} />
                <Route path="/시스템관리/시스템로그" element={<시스템로그 />} />
                </Routes>
            ) : (
                <div className="page-message">로그인이 필요합니다.</div>
            )}
          </div>
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