import React, { useEffect, useMemo, useState } from 'react'
import '../css/pages/management-common.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

const API_BASE = ''

function 입고관리() {
  // =========================
  // State
  // =========================
  const [purchaseList, setPurchaseList] = useState([])
  const [selectedPurchaseCd, setSelectedPurchaseCd] = useState(null)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [detailList, setDetailList] = useState([])

  const [warehouseOptions, setWarehouseOptions] = useState([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // ✅ 품목마스터(품목명 매핑용)
  const [itemList, setItemList] = useState([])

  // 검색/정렬
  const [searchType, setSearchType] = useState('PURCHASE_CD')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('')
  const [sortField, setSortField] = useState('PURCHASE_DT')
  const [sortOrder, setSortOrder] = useState('DESC')

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // 창고배정 모달
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [modalDetail, setModalDetail] = useState(null)
  const [selectedWhCd, setSelectedWhCd] = useState('')

  // (선택) 모달에서 품목의 창고별 현재 재고 보여주기
  const [stockByWh, setStockByWh] = useState([])

  // 로딩 플래그
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // =========================
  // Helpers & Utils
  // =========================
  const safeLower = (v) => (v ?? '').toString().toLowerCase()

  // API 호출 유틸
  const apiPost = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => 'Unknown Error')
      throw new Error(txt)
    }
    
    const text = await res.text()
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
  }

  // ✅ 상태 표시
  const statusText = (d) => {
    if (d._pendingConfirm) return '저장 대기'
    if (d.status === 'p3') return '입고 완료'  // p3가 진짜 완료
    if (d.status === 'p2') return '입고 대기'  // p2는 창고 배정 대기 상태
    if (d.status === 'p9') return '취소'
    return '입고 전' // p1
  }

  // ✅ 이미 DB에 저장된 건은 수정 불가 (잠금)
  const isLocked = (d) => {
      if (d._pendingConfirm) return false;
      return d.status === 'p3' || d.status === 'p9';
  }

  const updateDetail = (seqNo, updater) => {
    setDetailList((prev) => {
      let changed = false
      const next = prev.map((d) => {
        if (d.seqNo !== seqNo) return d
        const updated = updater(d)
        if (updated !== d) changed = true
        return updated
      })
      if (changed) setHasUnsavedChanges(true)
      return next
    })
  }

  // itemNm 매핑
  const itemNameMap = useMemo(() => {
    const m = new Map()
    for (const it of itemList) {
      const cd = it?.itemCd ?? it?.ITEM_CD
      const nm = it?.itemNm ?? it?.ITEM_NM
      if (cd) m.set(String(cd), nm ?? '')
    }
    return m
  }, [itemList])

  const resolveItemNm = (itemCd, rawItemNm) => {
    if (rawItemNm && rawItemNm !== '-') return rawItemNm
    return itemNameMap.get(String(itemCd || '')) || '-'
  }

  // =========================
  // API Calls
  // =========================
  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/whs`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setWarehouseOptions(data ?? [])
    } catch (e) {
      console.error('창고 조회 실패:', e)
    }
  }

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/item`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setItemList(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('품목 조회 실패:', e)
    }
  }

  const fetchPurchaseList = async () => {
    setLoadingList(true)
    try {
      const res = await fetch(`${API_BASE}/api/purchase?sort=${sortOrder}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setPurchaseList(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('발주 목록 조회 실패:', e)
      setPurchaseList([])
    } finally {
      setLoadingList(false)
    }
  }

  const fetchPurchaseHeaderAndDetails = async (purchaseCd) => {
    setLoadingDetail(true)
    try {
      const [resMst, resDet] = await Promise.all([
        fetch(`${API_BASE}/api/purchase/${purchaseCd}`),
        fetch(`${API_BASE}/api/purchase/${purchaseCd}/details`),
      ])

      if (!resMst.ok) throw new Error(await resMst.text())
      if (!resDet.ok) throw new Error(await resDet.text())

      const mst = await resMst.json()
      const det = await resDet.json()

      setSelectedPurchase(mst)

      const mapped = (Array.isArray(det) ? det : []).map((d) => {
        const seqNo = d?.id?.seqNo ?? d?.seqNo
        const itemCd = d?.itemCd ?? ''
        return {
          seqNo,
          itemCd,
          itemNm: resolveItemNm(itemCd, d?.itemNm),
          purchaseQty: d?.purchaseQty ?? 0,
          whCd: d?.whCd || '', // 백엔드에서 온 값
          status: d?.status ?? 'p1',
          remark: d?.remark ?? '',
          _pendingConfirm: false, // UI용 플래그
        }
      })

      setDetailList(mapped)
      setHasUnsavedChanges(false)
    } catch (e) {
      console.error('상세 조회 실패:', e)
      alert('상세 조회 실패')
    } finally {
      setLoadingDetail(false)
    }
  }

  const fetchStockByItem = async (itemCd) => {
    try {
      const res = await fetch(`${API_BASE}/api/stocks/by-item/${encodeURIComponent(itemCd)}`)
      if (!res.ok) return // 에러 무시 (재고 없을 수 있음)
      const data = await res.json()
      const mapped = (Array.isArray(data) ? data : []).map((s) => ({
        whCd: s?.id?.whCd ?? '',
        stockQty: Number(s?.stockQty ?? 0),
        allocQty: Number(s?.allocQty ?? 0),
      }))
      setStockByWh(mapped)
    } catch (e) {
      setStockByWh([])
    }
  }

  // =========================
  // Effects
  // =========================
  useEffect(() => {
    fetchWarehouses()
    fetchItems()
  }, [])

  useEffect(() => {
    fetchPurchaseList()
    setCurrentPage(1)
  }, [sortOrder])

  useEffect(() => {
    if (!detailList.length || !itemNameMap.size) return
    setDetailList(prev => prev.map(d => ({
        ...d,
        itemNm: resolveItemNm(d.itemCd, d.itemNm)
    })))
    // eslint-disable-next-line
  }, [itemNameMap])

  // =========================
  // Derived
  // =========================
  const filteredList = useMemo(() => {
    const base = Array.isArray(purchaseList) ? purchaseList : []
    if (!appliedSearchTerm) return base
    const kw = safeLower(appliedSearchTerm)
    return base.filter((p) => {
      if (searchType === 'PURCHASE_CD') return safeLower(p.purchaseCd).includes(kw)
      if (searchType === 'CUST_CD') return safeLower(p.custCd).includes(kw)
      return safeLower(p.remark).includes(kw)
    })
  }, [purchaseList, appliedSearchTerm, searchType])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem)

  const whMap = useMemo(() => {
    const m = new Map()
    for (const w of warehouseOptions) m.set(w.whCd, w)
    return m
  }, [warehouseOptions])

  const stockMap = useMemo(() => {
    const m = new Map()
    for (const s of stockByWh) m.set(s.whCd, s)
    return m
  }, [stockByWh])

  // =========================
  // Handlers
  // =========================
  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm)
    setCurrentPage(1)
  }

  // ✅ [수정] 누락되었던 toggleSort 함수 추가
  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))
  }

  // ✅ [추가] 리스트 헤더 정렬용 함수
  const handleSort = (field) => {
      if (sortField === field) {
          toggleSort();
      } else {
          setSortField(field);
          setSortOrder('DESC');
      }
  }

  const handleRowClick = (purchaseCd) => {
    if(hasUnsavedChanges) {
        if(!window.confirm("저장하지 않은 변경사항이 있습니다. 무시하고 이동하시겠습니까?")) return;
    }
    setSelectedPurchaseCd(purchaseCd)
    fetchPurchaseHeaderAndDetails(purchaseCd)
  }

  const handleRefresh = () => {
    setSelectedPurchaseCd(null)
    setSelectedPurchase(null)
    setDetailList([])
    setHasUnsavedChanges(false)
    fetchPurchaseList()
  }

  const handleCancelChanges = () => {
    if (selectedPurchaseCd) fetchPurchaseHeaderAndDetails(selectedPurchaseCd)
  }

  const openWarehouseModal = async (detail) => {
    if (!detail || isLocked(detail)) return
    setModalDetail(detail)
    setSelectedWhCd(detail.whCd || '')
    setShowWarehouseModal(true)
    if (detail.itemCd) await fetchStockByItem(detail.itemCd)
    else setStockByWh([])
  }

  const closeWarehouseModal = () => {
    setShowWarehouseModal(false)
    setModalDetail(null)
    setSelectedWhCd('')
    setStockByWh([])
  }

  const confirmWarehouse = () => {
    if (!modalDetail || !selectedWhCd) return
    updateDetail(modalDetail.seqNo, (d) => ({
      ...d,
      whCd: selectedWhCd,
      _pendingConfirm: true, 
    }))
    closeWarehouseModal()
  }

  const handleSave = async () => {
    if (!selectedPurchase) return

    const targets = detailList.filter(d => d._pendingConfirm && d.whCd && d.status !== 'p3');

    if (targets.length === 0) {
        alert("입고 처리할 내역이 없습니다.");
        return;
    }

    try {
        let successCount = 0;
        
        for (const item of targets) {
            await apiPost(`${API_BASE}/api/inout/in/from-purchase`, {
                purchaseCd: selectedPurchase.purchaseCd,
                seqNo: item.seqNo,
                itemCd: item.itemCd,
                
                // ✅ [수정] 백엔드가 뭘 원할지 모르니 둘 다 보냅니다.
                whCd: item.whCd,   // 일반적인 DTO 이름
                toWhCd: item.whCd, // Service 파라미터 이름
                
                qty: item.purchaseQty,
                remark: "입고처리"
            });
            successCount++;
        }

        alert(`${successCount}건 입고 처리가 완료되었습니다.`);
        await fetchPurchaseHeaderAndDetails(selectedPurchase.purchaseCd);
        await fetchPurchaseList();

    } catch (e) {
      console.error(e)
      alert('저장 중 오류가 발생했습니다: ' + e.message)
    }
  }

  const getWhNameOnly = (whCd) => {
    if (!whCd) return '미배정'
    return whMap.get(whCd)?.whNm || whCd
  }

  // 1. 테이블 컴팩트 스타일 (출고관리와 통일)
  const compactThStyle = { padding: '5px 6px', fontSize: 12 }
  const compactTdStyle = {
    padding: '5px 6px',
    fontSize: 12,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  const compactCodeTdStyle = { ...compactTdStyle, fontSize: 11 }
  const compactNumTdStyle = { ...compactTdStyle, fontSize: 11 }
  const compactStatusTdStyle = { ...compactTdStyle, fontSize: 11 }

  // 2. 하단 잘림 방지 스타일 (에러 원인 해결)
  const detailContentExtraStyle = { paddingBottom: '110px' }

  // 3. 버튼 스타일 (출고관리 스타일 적용 + 입고관리 변수명 assignBtnStyle로 매핑)
  const assignBtnStyle = (disabled) => ({
    padding: '2px 6px',
    minWidth: 44,
    height: 22,
    lineHeight: '18px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 11,
    opacity: disabled ? 0.6 : 1,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginLeft: 'auto' // 버튼 우측 정렬 유지
  })

  // =========================
  // Render
  // =========================
  return (
    <div className="customer-management-container">
      <div className="customer-management-wrapper">
        {/* Header */}
        <div className="customer-header">
          <div className="header-left-section">
            <h2 className="customer-title">입고관리 (발주)</h2>

            <div className="statistics-info statistics-customer">
              <span className="stat-label">총 발주 수:</span>
              <span className="stat-value">{purchaseList.length}</span>
              <span className="stat-unit">건</span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
              <SearchBar
                searchOptions={[
                  { value: 'PURCHASE_CD', label: '발주코드' },
                  { value: 'CUST_CD', label: '거래처코드' },
                  { value: 'REMARK', label: '비고' },
                ]}
                searchType={searchType}
                onSearchTypeChange={setSearchType}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onSearch={handleSearch}
              />

              <button
                onClick={toggleSort}
                className="erp-button erp-button-default"
                style={{ padding: '6px 10px', fontSize: 12 }}
                title="발주일자 정렬 방향 변경"
              >
                발주일자 {sortOrder === 'DESC' ? '▼' : '▲'}
              </button>
            </div>
          </div>

          <div className="header-buttons">
            <IconButton type="search" label="새로고침" onClick={handleRefresh} />
          </div>
        </div>

        {/* Main Layout */}
        <div className="customer-content-layout">
          {/* Left: Purchase List */}
          <div className="customer-list-panel">
            <div className="list-table-wrapper">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{ width: 60 }}>No</th>
                    <th className="excel-th">발주코드</th>
                    <th className="excel-th">발주일자</th>
                    <th className="excel-th">거래처코드</th>
                    <th className="excel-th">담당자</th>
                    <th className="excel-th">비고</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingList ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>로딩중...</td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 60, color: '#9ca3af', border: 'none' }}>
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((row, idx) => (
                      <tr
                        key={row.purchaseCd}
                        className={`excel-tr ${selectedPurchaseCd === row.purchaseCd ? 'selected' : ''}`}
                        onClick={() => handleRowClick(row.purchaseCd)}
                      >
                        <td className="excel-td excel-td-number">{indexOfFirstItem + idx + 1}</td>
                        <td className="excel-td">{row.purchaseCd}</td>
                        <td className="excel-td">{row.purchaseDt}</td>
                        <td className="excel-td">{row.custCd}</td>
                        <td className="excel-td">{row.custEmp}</td>
                        <td className="excel-td">{row.remark || ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              totalItems={filteredList.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Right: Detail Panel */}
          <div className="customer-detail-panel">
            <div className="detail-header">
              <div className="detail-title-wrap">
                <div className="detail-title-row">
                  <h3 className="detail-title">발주 정보</h3>
                  <span className="detail-chip">INFO</span>
                </div>
                <div className="detail-subtext">
                  {selectedPurchase ? `${selectedPurchase.purchaseCd} · ${selectedPurchase.purchaseDt}` : '발주 선택 대기'}
                </div>
              </div>

              <div className="detail-status">
                <span className="status-dot" aria-hidden="true" />
                <span className="status-text">{selectedPurchase ? '선택됨' : '대기'}</span>
              </div>
            </div>

            <div className="detail-content" style={detailContentExtraStyle}>
              {!selectedPurchase ? (
                <div className="empty-state-box" />
              ) : (
                <>
                  {/* 기본 정보 */}
                  <div className="form-section">
                    <div className="section-title">기본 정보</div>

                    <div className="form-group">
                      <div className="form-row">
                        <div className="form-field-inline">
                          <label>발주코드</label>
                          <input type="text" value={selectedPurchase.purchaseCd || ''} disabled />
                        </div>
                        <div className="form-field-inline">
                          <label>발주일자</label>
                          <input type="text" value={selectedPurchase.purchaseDt || ''} disabled />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field-inline">
                          <label>거래처코드</label>
                          <input type="text" value={selectedPurchase.custCd || ''} disabled />
                        </div>
                        <div className="form-field-inline">
                          <label>담당자</label>
                          <input type="text" value={selectedPurchase.custEmp || ''} disabled />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field-inline" style={{ flex: 1 }}>
                          <label>비고</label>
                          <input type="text" value={selectedPurchase.remark || ''} disabled />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detail list */}
                  <div className="material-list-section">
                    <div className="section-header-with-buttons">
                      <div className="section-header">발주 상세 목록 ({detailList.length}건)</div>
                      {hasUnsavedChanges && <span className="dirty-indicator">변경 사항 저장 필요</span>}
                    </div>

                    {/* ✅ 창고명은 무조건 다 보이게(줄바꿈 허용) */}
                    <div className="table-wrapper" style={{ overflow: 'hidden', paddingBottom: 12 }}>
                      <table className="excel-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                        <thead>
                          <tr>
                            <th className="excel-th" style={{ ...compactThStyle, width: '5%' }}>순번</th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '12%' }}>품목코드</th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '30%' }}>품목명</th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '6%' }}>수량</th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '10%' }}>상태</th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '37%' }}>창고배정</th>
                          </tr>
                        </thead>

                        <tbody>
                          {loadingDetail ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>로딩중...</td>
                            </tr>
                          ) : detailList.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 12 }}>
                                상세 내역이 없습니다.
                              </td>
                            </tr>
                          ) : (
                            detailList.map((d) => (
                              <tr key={d.seqNo} className="excel-tr">
                                <td className="excel-td excel-td-number" style={compactNumTdStyle}>{d.seqNo}</td>

                                <td className="excel-td" style={compactCodeTdStyle} title={d.itemCd}>
                                  {d.itemCd}
                                </td>

                                <td className="excel-td" style={compactTdStyle} title={d.itemNm ?? '-'}>
                                  {d.itemNm ?? '-'}
                                </td>

                                <td className="excel-td excel-td-number" style={compactNumTdStyle}>{d.purchaseQty}</td>

                                <td className="excel-td" style={compactStatusTdStyle}>
                                  <span
                                    className={`status-badge ${d.status === 'p2' ? 'status-done' : 'status-pending'}`}
                                    style={{ fontSize: 11, padding: '2px 6px' }}
                                  >
                                    {statusText(d)}
                                  </span>
                                </td>

                                {/* ✅ 창고명: ... 금지, 무조건 전체 표시(줄바꿈) */}
                                <td
                                  className="excel-td"
                                  style={{
                                    padding: '5px 6px',
                                    fontSize: 12,
                                    lineHeight: 1.2,
                                    whiteSpace: 'normal',
                                    overflow: 'visible',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr auto',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <span
                                      style={{
                                        whiteSpace: 'normal',
                                        overflow: 'visible',
                                        textOverflow: 'clip',
                                        wordBreak: 'break-word',
                                      }}
                                      title={getWhNameOnly(d.whCd)}
                                    >
                                      {getWhNameOnly(d.whCd)}
                                    </span>

                                    <button
                                      onClick={() => openWarehouseModal(d)}
                                      disabled={isLocked(d)}
                                      style={assignBtnStyle(isLocked(d))}
                                    >
                                      {isLocked(d) ? '확정' : (d.whCd ? '변경' : '배정')}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="detail-footer" style={{ marginTop: 12, gap: 8 }}>
                    <button
                      className="erp-button erp-button-primary"
                      style={{ flex: 1 }}
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges}
                    >
                      저장
                    </button>
                    <button
                      className="erp-button erp-button-default"
                      style={{ flex: 1 }}
                      onClick={handleCancelChanges}
                      disabled={!hasUnsavedChanges}
                    >
                      취소
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Warehouse Modal */}
        {showWarehouseModal && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              style={{
                background: 'white',
                padding: 20,
                borderRadius: 12,
                minWidth: 360,
                maxWidth: 560,
                width: '90%',
                boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
              }}
            >
              <h3 style={{ marginBottom: 10, fontSize: 18, fontWeight: 800 }}>
                배정할 창고를 선택하세요.
              </h3>

              <div style={{ marginBottom: 10, fontSize: 12, color: '#555' }}>
                품목: <b>{modalDetail?.itemCd || '-'}</b> / 수량: <b>{modalDetail?.purchaseQty ?? 0}</b>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 420, overflow: 'auto' }}>
                {(warehouseOptions ?? []).map((wh) => {
                  const isSelected = selectedWhCd === wh.whCd
                  const st = stockMap.get(wh.whCd)
                  const stockQty = st ? st.stockQty : null
                  const allocQty = st ? st.allocQty : null
                  const available = st ? (st.stockQty - st.allocQty) : null

                  return (
                    <label
                      key={wh.whCd}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        border: isSelected ? '1px solid #4a90e2' : '1px solid #ddd',
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isSelected ? '#f5f9ff' : 'white',
                      }}
                      onClick={() => setSelectedWhCd(wh.whCd)}
                    >
                      <input type="radio" checked={isSelected} readOnly />

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>
                          {wh.whNm}
                        </div>

                        <div style={{ fontSize: 11, color: '#555' }}>
                          {stockQty === null
                            ? '현재 재고: (조회없음)'
                            : `현재재고 ${stockQty} / 예약 ${allocQty} / 가용 ${available}`}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={confirmWarehouse}
                  disabled={!selectedWhCd}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: '1px solid #4a90e2',
                    borderRadius: 10,
                    background: selectedWhCd ? '#4a90e2' : '#cbd5e1',
                    color: 'white',
                    cursor: selectedWhCd ? 'pointer' : 'not-allowed',
                    fontWeight: 800,
                  }}
                >
                  확인(저장대기)
                </button>

                <button
                  onClick={closeWarehouseModal}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 10,
                    background: '#f0f0f0',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  취소
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: '#777' }}>
                ※ 여기서 확인은 “임시 배정”이며, 아래 저장 버튼을 눌러야 입고 완료로 확정됩니다.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default 입고관리
