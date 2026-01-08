import React, { useEffect, useMemo, useState } from 'react'
import '../css/pages/management-common.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

const API_BASE = 'http://localhost:8080'

function 출고관리() {
  // ========= 유틸 =========
  const safeText = (v) => (v === null || v === undefined || v === '' ? '-' : String(v))
  const toYmd = (v) => (!v ? '' : String(v).slice(0, 10))

  const apiGet = async (url) => {
    const res = await fetch(`${API_BASE}${url}`, { headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error(`GET 실패: ${url}`)
    return res.json()
  }

  const apiPost = async (url, body) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`POST 실패: ${url}\n${txt}`)
    }
    return res.json()
  }

  // ========= 상태 =========
  const [selectedOrderCd, setSelectedOrderCd] = useState(null)
  const [selectedDetailKey, setSelectedDetailKey] = useState(null)

  // 검색/정렬/페이지네이션
  const [searchType, setSearchType] = useState('ORDER_CD') // ORDER_CD, CUST_CD
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('')

  const [sortField, setSortField] = useState('ORDER_DT') // ORDER_DT, ORDER_CD
  const [sortOrder, setSortOrder] = useState('desc')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // 서버 데이터
  const [orderList, setOrderList] = useState([])
  const [orderHeader, setOrderHeader] = useState(null)

  // 상세 (working/saved)
  const [workingDetails, setWorkingDetails] = useState([])
  const [savedDetails, setSavedDetails] = useState([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 창고 모달
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [selectedDetailForWarehouse, setSelectedDetailForWarehouse] = useState(null)

  const [warehouseOptions, setWarehouseOptions] = useState([]) // [{whCd, stockQty, allocQty, availQty}]
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [selectedWarehouseOption, setSelectedWarehouseOption] = useState('')

  // ✅ footer 때문에 하단 짤림 방지
  const detailContentExtraStyle = { paddingBottom: '110px' }

  // ========= (요청 반영) 목록 테이블(왼쪽) 줄간격 통일 =========
  // 입고관리 느낌으로: 행 높이/패딩/라인하이트/수직정렬 고정
  const listThStyle = { padding: '8px 10px', fontSize: 12 }
  const listTdStyle = {
    padding: '8px 10px',
    fontSize: 12,
    lineHeight: 1.2,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  const listTrStyle = { height: 34 } // ✅ 행 높이 고정 (세로 줄 간격 맞춤)

  // ========= 상세 테이블 컴팩트 스타일 =========
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

  // ========= 정규화 =========
  const normalizeOrder = (o, idx) => ({
    _no: idx + 1,
    ORDER_CD: o.orderCd ?? o.ORDER_CD ?? '',
    ORDER_DT: toYmd(o.orderDt ?? o.ORDER_DT),
    CUST_CD: o.custCd ?? o.CUST_CD ?? '',
    CUST_EMP: o.custEmp ?? o.CUST_EMP ?? '',
    REMARK: o.remark ?? o.REMARK ?? '', // ✅ 목록에는 표시 안 하고, 상세에서만 사용
  })

  // ✅ 서버 기준으로만 완료(o3) 판단
  const normalizeDetail = (d) => {
    const orderCd = d?.id?.orderCd ?? d?.orderCd ?? d?.ORDER_CD ?? ''
    const seqNo = d?.id?.seqNo ?? d?.seqNo ?? d?.SEQ_NO ?? null

    const itemCd = d?.itemCd ?? d?.ITEM_CD ?? ''
    const orderQty = Number(d?.orderQty ?? d?.ORDER_QTY ?? 0)

    const whCd = d?.whCd ?? d?.WH_CD ?? ''
    const status = d?.status ?? d?.STATUS ?? 'o2'

    const key = `${orderCd}_${seqNo}`
    const isDone = status === 'o3'

    return {
      _key: key,
      ORDER_CD: orderCd,
      SEQ_NO: seqNo,
      ITEM_CD: itemCd,
      ITEM_NM: d?.itemNm ?? d?.ITEM_NM ?? '-',
      ORDER_QTY: orderQty,

      WAREHOUSE: whCd || '',
      STATUS_CODE: status || 'o2',

      // 저장 전 임시 선택
      PENDING_WAREHOUSE: '',

      isLocked: isDone,
    }
  }

  const detailToPayload = (detail) => ({
    id: { orderCd: detail.ORDER_CD, seqNo: detail.SEQ_NO },
    itemCd: detail.ITEM_CD,
    orderQty: detail.ORDER_QTY,
    whCd: detail.whCd ?? detail.WH_CD ?? null,
    status: detail.status ?? detail.STATUS ?? 'o2',
    remark: detail.remark ?? detail.REMARK ?? null,
  })

  // ========= 주문 목록 로딩 =========
  useEffect(() => {
    ;(async () => {
      try {
        const list = await apiGet('/api/order?sort=DESC')
        setOrderList((list ?? []).map((o, idx) => normalizeOrder(o, idx)))
      } catch (e) {
        console.error(e)
        alert('주문 목록 조회 실패')
      }
    })()
  }, [])

  // ========= 주문 선택 -> 헤더+상세 =========
  const loadOrder = async (orderCd) => {
    try {
      setSelectedDetailKey(null)
      setHasUnsavedChanges(false)

      const header = await apiGet(`/api/order/${encodeURIComponent(orderCd)}`)
      setOrderHeader({
        ORDER_CD: header.orderCd ?? orderCd,
        ORDER_DT: toYmd(header.orderDt),
        CUST_CD: header.custCd ?? '',
        CUST_EMP: header.custEmp ?? '',
        REMARK: header.remark ?? '',
      })

      const details = await apiGet(`/api/order/${encodeURIComponent(orderCd)}/details`)
      const normalizedDetails = (details ?? []).map(normalizeDetail)

      setWorkingDetails(normalizedDetails)
      setSavedDetails(normalizedDetails.map((d) => ({ ...d })))
    } catch (e) {
      console.error(e)
      alert('주문 상세 조회 실패')
      setOrderHeader(null)
      setWorkingDetails([])
      setSavedDetails([])
    }
  }

  const handleRowClick = async (orderCd) => {
    setSelectedOrderCd(orderCd)
    await loadOrder(orderCd)
  }

  // ========= 검색/정렬 =========
  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm)
    setCurrentPage(1)
  }

  // ✅ 입고처럼 상단 우측 새로고침
  const handleRefresh = async () => {
    setSelectedOrderCd(null)
    setSelectedDetailKey(null)
    setOrderHeader(null)
    setWorkingDetails([])
    setSavedDetails([])
    setHasUnsavedChanges(false)

    try {
      const list = await apiGet('/api/order?sort=DESC')
      setOrderList((list ?? []).map((o, idx) => normalizeOrder(o, idx)))
      setCurrentPage(1)
    } catch (e) {
      console.error(e)
      alert('새로고침 실패')
    }
  }

  // ✅ 주문일자(헤더) 클릭 정렬
  const handleSort = (field) => {
    if (sortField === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const filteredList = useMemo(() => {
    return orderList
      .filter((o) => {
        if (!appliedSearchTerm) return true
        if (searchType === 'ORDER_CD') return (o.ORDER_CD || '').includes(appliedSearchTerm)
        if (searchType === 'CUST_CD') return (o.CUST_CD || '').includes(appliedSearchTerm)
        return true
      })
      .sort((a, b) => {
        const av = a[sortField]
        const bv = b[sortField]

        // 날짜 정렬
        if (typeof av === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(av)) {
          return sortOrder === 'asc' ? new Date(av) - new Date(bv) : new Date(bv) - new Date(av)
        }

        // 문자열 정렬
        return sortOrder === 'asc'
          ? String(av).localeCompare(String(bv), 'ko')
          : String(bv).localeCompare(String(av), 'ko')
      })
  }, [orderList, appliedSearchTerm, searchType, sortField, sortOrder])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem)

  // ========= 상세 =========
  const currentDetails = useMemo(() => {
    if (!selectedOrderCd) return []
    return workingDetails.filter((d) => d.ORDER_CD === selectedOrderCd)
  }, [selectedOrderCd, workingDetails])

  // ========= 수정 헬퍼 =========
  const updateWorkingDetail = (detailKey, updater) => {
    setWorkingDetails((prev) => {
      let changed = false
      const next = prev.map((d) => {
        if (d._key !== detailKey) return d
        const updated = updater(d)
        if (updated !== d) changed = true
        return updated
      })
      if (changed) setHasUnsavedChanges(true)
      return next
    })
  }

  const handleCancelChanges = () => {
    setWorkingDetails(savedDetails.map((d) => ({ ...d })))
    setSelectedDetailKey(null)
    setHasUnsavedChanges(false)
  }

  const handleSave = async () => {
    if (!selectedOrderCd || !orderHeader) return

    // 저장할 때만: pending -> whCd 반영, status o3로 저장
    const payloadDetails = currentDetails.map((d) => {
      const whCd = d.PENDING_WAREHOUSE ? d.PENDING_WAREHOUSE : d.WAREHOUSE || null
      const status = whCd ? 'o3' : d.STATUS_CODE || 'o2'

      return detailToPayload({
        ...d,
        whCd,
        status,
      })
    })

    const payload = {
      orderCd: orderHeader.ORDER_CD,
      orderDt: orderHeader.ORDER_DT,
      custCd: orderHeader.CUST_CD,
      custEmp: orderHeader.CUST_EMP,
      remark: orderHeader.REMARK,
      details: payloadDetails,
    }

    try {
      await apiPost('/api/order', payload)
      await loadOrder(selectedOrderCd)
      setHasUnsavedChanges(false)
      alert('저장 완료')
    } catch (e) {
      console.error(e)
      alert('저장 실패 (콘솔 확인)')
    }
  }

  // ========= 창고 재고 조회 =========
  const fetchWarehousesByItem = async (itemCd) => {
    const data = await apiGet(`/api/stocks?itemCd=${encodeURIComponent(itemCd)}`)
    const content = data?.content ?? []

    const options = content
      .map((s) => {
        const whCd = s?.id?.whCd ?? ''
        const stockQty = Number(s?.stockQty ?? 0)
        const allocQty = Number(s?.allocQty ?? 0)
        const availQty = Number(stockQty - allocQty)
        return { whCd, stockQty, allocQty, availQty }
      })
      .filter((x) => x.whCd)
      .sort((a, b) => String(a.whCd).localeCompare(String(b.whCd), 'ko'))

    return options
  }

  const handleOpenWarehouseModal = async (detail) => {
    if (!detail) return
    if (detail.isLocked || detail.STATUS_CODE === 'o3') return

    setSelectedDetailForWarehouse(detail)
    setSelectedWarehouseOption(detail.PENDING_WAREHOUSE || detail.WAREHOUSE || '')
    setShowWarehouseModal(true)

    setWarehouseLoading(true)
    try {
      const options = await fetchWarehousesByItem(detail.ITEM_CD)
      setWarehouseOptions(options)
    } catch (e) {
      console.error(e)
      alert('창고 재고 조회 실패')
      setWarehouseOptions([])
    } finally {
      setWarehouseLoading(false)
    }
  }

  const handleConfirmWarehouse = () => {
    if (!selectedDetailForWarehouse || !selectedWarehouseOption) return

    updateWorkingDetail(selectedDetailForWarehouse._key, (d) => ({
      ...d,
      PENDING_WAREHOUSE: selectedWarehouseOption,
    }))

    setShowWarehouseModal(false)
    setSelectedDetailForWarehouse(null)
    setSelectedWarehouseOption('')
    setWarehouseOptions([])
  }

  // ✅ 상세 테이블용 버튼(작게)
  const assignButtonStyle = (disabled) => ({
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
  })

  return (
    <div className="customer-management-container">
      <div className="customer-management-wrapper">
        {/* ✅ 입고관리처럼 상단 */}
        <div className="customer-header">
          <div className="header-left-section">
            <h2 className="customer-title">출고관리 (주문)</h2>

            <div className="statistics-info statistics-customer">
              <span className="stat-label">총 주문 수:</span>
              <span className="stat-value">{orderList.length}</span>
              <span className="stat-unit">건</span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
              <SearchBar
                searchOptions={[
                  { value: 'ORDER_CD', label: '주문코드' },
                  { value: 'CUST_CD', label: '거래처코드' },
                ]}
                searchType={searchType}
                onSearchTypeChange={setSearchType}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onSearch={handleSearch}
              />
            </div>
          </div>

          <div className="header-buttons">
            <IconButton type="search" label="새로고침" onClick={handleRefresh} />
          </div>
        </div>

        {/* 메인 */}
        <div className="customer-content-layout">
          {/* 왼쪽 목록 */}
          <div className="customer-list-panel">
            <div className="list-table-wrapper">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="excel-th" style={{ ...listThStyle, width: 60 }}>
                      No
                    </th>
                    <th className="excel-th" style={listThStyle}>
                      주문코드
                    </th>

                    {/* ✅ 주문일자 헤더 클릭 정렬 (화살표 표시) */}
                    <th
                      className="excel-th sortable"
                      style={listThStyle}
                      onClick={() => handleSort('ORDER_DT')}
                    >
                      주문일자
                      {sortField === 'ORDER_DT' && (
                        <span className="sort-icon">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>

                    <th className="excel-th" style={listThStyle}>
                      거래처코드
                    </th>
                    <th className="excel-th" style={listThStyle}>
                      담당자
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.length === 0 ? (
                    <tr style={listTrStyle}>
                      <td
                        colSpan="5"
                        style={{
                          textAlign: 'center',
                          padding: '60px',
                          color: 'rgb(156, 163, 175)',
                          fontSize: '14px',
                          fontWeight: '500',
                          border: 'none',
                        }}
                      >
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((row) => (
                      <tr
                        key={row.ORDER_CD}
                        className={`excel-tr ${selectedOrderCd === row.ORDER_CD ? 'selected' : ''}`}
                        onClick={() => handleRowClick(row.ORDER_CD)}
                        style={listTrStyle} // ✅ 행 높이 고정
                      >
                        <td className="excel-td excel-td-number" style={listTdStyle}>
                          {row._no}
                        </td>
                        <td className="excel-td" style={listTdStyle}>
                          {row.ORDER_CD}
                        </td>
                        <td className="excel-td" style={listTdStyle}>
                          {row.ORDER_DT}
                        </td>
                        <td className="excel-td" style={listTdStyle}>
                          {safeText(row.CUST_CD)}
                        </td>
                        <td className="excel-td" style={listTdStyle}>
                          {safeText(row.CUST_EMP)}
                        </td>
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

          {/* 오른쪽 상세 */}
          <div className="customer-detail-panel">
            <div className="detail-header">
              <div className="detail-title-wrap">
                <div className="detail-title-row">
                  <h3 className="detail-title">주문 정보</h3>
                  <span className="detail-chip">INFO</span>
                </div>
                <div className="detail-subtext">
                  {selectedOrderCd && orderHeader
                    ? `${orderHeader.ORDER_CD} · ${orderHeader.ORDER_DT}`
                    : '주문 선택 대기'}
                </div>
              </div>
              <div className="detail-status">
                <span className="status-dot" aria-hidden="true" />
                <span className="status-text">{selectedOrderCd ? '선택됨' : '대기'}</span>
              </div>
            </div>

            <div className="detail-content" style={detailContentExtraStyle}>
              {selectedOrderCd && orderHeader ? (
                <>
                  {/* 기본 정보 */}
                  <div className="form-section">
                    <div className="section-title">기본 정보</div>
                    <div className="form-group">
                      <div className="form-row">
                        <div className="form-field-inline">
                          <label>주문코드</label>
                          <input type="text" value={orderHeader.ORDER_CD} disabled />
                        </div>
                        <div className="form-field-inline">
                          <label>주문일자</label>
                          <input type="text" value={orderHeader.ORDER_DT} disabled />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field-inline">
                          <label>거래처코드</label>
                          <input type="text" value={safeText(orderHeader.CUST_CD)} disabled />
                        </div>
                        <div className="form-field-inline">
                          <label>담당자</label>
                          <input type="text" value={safeText(orderHeader.CUST_EMP)} disabled />
                        </div>
                      </div>

                      {/* ✅ 비고는 상세에서만 */}
                      <div className="form-row">
                        <div className="form-field-inline" style={{ flex: 1 }}>
                          <label>비고</label>
                          <input type="text" value={safeText(orderHeader.REMARK)} disabled />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 상세 목록 */}
                  <div className="material-list-section">
                    <div className="section-header-with-buttons">
                      <div className="section-header">주문 상세 목록 ({currentDetails.length}건)</div>
                      {hasUnsavedChanges && <span className="dirty-indicator">변경 사항 저장 필요</span>}
                    </div>

                    <div className="table-wrapper" style={{ overflow: 'hidden', paddingBottom: 12 }}>
                      <table className="excel-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                        <thead>
                          <tr>
                            <th className="excel-th" style={{ ...compactThStyle, width: '5%' }}>
                              순번
                            </th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '12%' }}>
                              품목코드
                            </th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '30%' }}>
                              품목명
                            </th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '6%' }}>
                              수량
                            </th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '10%' }}>
                              상태
                            </th>
                            <th className="excel-th" style={{ ...compactThStyle, width: '37%' }}>
                              창고배정
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {currentDetails.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 12 }}>
                                상세 내역이 없습니다.
                              </td>
                            </tr>
                          ) : (
                            currentDetails.map((detail) => {
                              const isDone = detail.STATUS_CODE === 'o3'
                              const displayWh = detail.PENDING_WAREHOUSE || detail.WAREHOUSE || ''

                              return (
                                <tr
                                  key={detail._key}
                                  className={`excel-tr ${selectedDetailKey === detail._key ? 'selected' : ''}`}
                                  onClick={() => setSelectedDetailKey(detail._key)}
                                >
                                  <td className="excel-td excel-td-number" style={compactNumTdStyle}>
                                    {detail.SEQ_NO}
                                  </td>

                                  <td className="excel-td" style={compactCodeTdStyle} title={detail.ITEM_CD}>
                                    {detail.ITEM_CD}
                                  </td>

                                  <td className="excel-td" style={compactTdStyle} title={safeText(detail.ITEM_NM)}>
                                    {safeText(detail.ITEM_NM)}
                                  </td>

                                  <td className="excel-td excel-td-number" style={compactNumTdStyle}>
                                    {detail.ORDER_QTY}
                                  </td>

                                  <td className="excel-td" style={compactStatusTdStyle}>
                                    <span
                                      className={`status-badge ${isDone ? 'status-done' : 'status-pending'}`}
                                      style={{ fontSize: 11, padding: '2px 6px' }}
                                    >
                                      {isDone ? '출고 완료' : '출고 전'}
                                    </span>
                                  </td>

                                  {/* 창고명 전체표시 */}
                                  <td
                                    className="excel-td"
                                    onClick={(e) => e.stopPropagation()}
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
                                        title={displayWh ? displayWh : '미배정'}
                                      >
                                        {displayWh ? displayWh : '미배정'}
                                      </span>

                                      <button
                                        onClick={() => handleOpenWarehouseModal(detail)}
                                        disabled={isDone}
                                        style={assignButtonStyle(isDone)}
                                      >
                                        {isDone ? '확정' : displayWh ? '변경' : '배정'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 하단 버튼 */}
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
              ) : (
                <div className="empty-state-box" />
              )}
            </div>
          </div>
        </div>

        {/* 창고 선택 모달 */}
        {showWarehouseModal && selectedDetailForWarehouse && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
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
                width: 520,
                maxWidth: '100%',
                boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
              }}
            >
              <h3 style={{ marginBottom: 10, fontSize: 18, fontWeight: 700 }}>출고할 창고를 선택하세요.</h3>

              <div style={{ marginBottom: 10, fontSize: 12, color: '#475569' }}>
                품목: <b>{selectedDetailForWarehouse.ITEM_CD}</b> / 주문수량: <b>{selectedDetailForWarehouse.ORDER_QTY}</b>
              </div>

              {warehouseLoading ? (
                <div style={{ padding: 18, fontSize: 13, color: '#64748b' }}>창고 재고 조회 중...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {warehouseOptions.length === 0 ? (
                    <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 10, color: '#64748b' }}>
                      조회된 창고 재고가 없습니다.
                    </div>
                  ) : (
                    warehouseOptions.map((w) => {
                      const need = Number(selectedDetailForWarehouse.ORDER_QTY || 0)
                      const avail = Number(w.availQty || 0)
                      const insufficient = avail < need
                      const isSelected = selectedWarehouseOption === w.whCd
                      const disabled = insufficient

                      return (
                        <label
                          key={w.whCd}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: 12,
                            border: disabled ? '2px solid #ef4444' : isSelected ? '1px solid #4a90e2' : '1px solid #d1d5db',
                            borderRadius: 10,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            background: disabled ? '#fee2e2' : isSelected ? '#f5f9ff' : 'white',
                            opacity: disabled ? 0.85 : 1,
                          }}
                          onClick={() => {
                            if (disabled) return
                            setSelectedWarehouseOption(w.whCd)
                          }}
                        >
                          <input type="radio" checked={isSelected} readOnly disabled={disabled} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: disabled ? '#ef4444' : '#111827' }}>
                              {w.whCd} {disabled ? ' (수량 부족)' : ''}
                            </div>
                            <div style={{ fontSize: 12, color: disabled ? '#ef4444' : '#475569' }}>
                              재고: {w.stockQty} / 예약: {w.allocQty} / 가용: <b>{w.availQty}</b>
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleConfirmWarehouse}
                  disabled={!selectedWarehouseOption}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: '1px solid #4a90e2',
                    borderRadius: 10,
                    background: selectedWarehouseOption ? '#4a90e2' : '#cbd5e1',
                    color: 'white',
                    cursor: selectedWarehouseOption ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                  }}
                >
                  확인
                </button>
                <button
                  onClick={() => {
                    setShowWarehouseModal(false)
                    setSelectedDetailForWarehouse(null)
                    setSelectedWarehouseOption('')
                    setWarehouseOptions([])
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: '1px solid #d1d5db',
                    borderRadius: 10,
                    background: '#f1f5f9',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default 출고관리
