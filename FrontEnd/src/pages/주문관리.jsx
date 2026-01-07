import React, { useState, useEffect, useRef } from 'react'
import '../css/pages/주문관리.css'
import IconButton from '../components/IconButton'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'
import { useLocation } from 'react-router-dom'

const API_BASE = "" // vite proxy 사용: "/api" 그대로 호출

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    let msg = ""
    try { msg = await res.text() } catch {}
    throw new Error(`HTTP ${res.status} ${msg}`)
  }
  // 204 대응
  const ct = res.headers.get("content-type") || ""
  if (ct.includes("application/json")) return res.json()
  return null
}

function 주문관리() {
    const location = useLocation();
    // 주문 목록 (TB_ORDER)
    const [orderList, setOrderList] = useState([])

    // ✅ 주문 목록 조회 + 각 주문의 상세 정보(상태 포함) 조회
    const reloadOrders = async () => {
        const data = await apiFetch("/api/order?sort=DESC");
        const orders = Array.isArray(data) ? data : [];
        
        // 각 주문의 상세 정보를 병렬로 조회
        const mappedWithDetails = await Promise.all(
          orders.map(async (o) => {
            try {
              const details = await apiFetch(`/api/order/${encodeURIComponent(o.orderCd)}/details`);
              return {
                ORDER_CD: o.orderCd,
                ORDER_DT: o.orderDt,
                CUST_CD: o.custCd,
                CUST_NM: o.custNm || '',
                CUST_EMP: o.custEmp,
                REMARK: o.remark,
                ORDER_DET: (Array.isArray(details) ? details : []).map(d => ({
                  SEQ_NO: d.seqNo,
                  ITEM_CD: d.itemCd,
                  ITEM_NM: d.itemNm || '',
                  ITEM_SPEC: "",
                  ITEM_UNIT: "EA",
                  ORDER_QTY: d.orderQty,
                  ITEM_COST: 0,
                  STATUS: d.status || "o1",
                  REMARK: d.remark || ""
                })),
              };
            } catch (e) {
              return {
                ORDER_CD: o.orderCd,
                ORDER_DT: o.orderDt,
                CUST_CD: o.custCd,
                CUST_NM: o.custNm || '',
                CUST_EMP: o.custEmp,
                REMARK: o.remark,
                ORDER_DET: [],
              };
            }
          })
        );
        
        setOrderList(mappedWithDetails);
    };

    useEffect(() => {
        reloadOrders().catch(console.error);
    }, []);

    useEffect(() => {
        // 1. 넘어온 focusId가 있고, 목록(orderList)이 로딩된 상태인지 확인
        if (location.state?.focusId && orderList.length > 0) {
            const targetId = location.state.focusId;

            // 2. 목록에 해당 ID가 존재하는지 확인
            const targetRow = orderList.find(row => row.ORDER_CD === targetId);

            if (targetRow) {
                setSelectedOrder(targetId); 
                setIsEditMode(true); // 수정 모드로 열어서 상세 보여주기

                // 4. 해당 행으로 스크롤 이동 (이미 만들어둔 로직 활용)
                setPendingScrollRowId(targetId);

                // 5. 처리가 끝났으면 state를 비워서 새로고침 시 다시 실행되지 않게 함
                window.history.replaceState({}, document.title);
            }
        }
    }, [orderList, location.state]);

    const refreshOrderList = reloadOrders; // 동일한 함수 사용

    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedItems, setSelectedItems] = useState([])
    const [editingItemSeq, setEditingItemSeq] = useState(null)
    const [selectedMasterItems, setSelectedMasterItems] = useState([])
    const [showItemMasterPopup, setShowItemMasterPopup] = useState(false)
    const [showCompletionPopup, setShowCompletionPopup] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [showConfirmedPopup, setShowConfirmedPopup] = useState(false)
    const [confirmedInfo, setConfirmedInfo] = useState(null)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [showCanceledPopup, setShowCanceledPopup] = useState(false)
    const [canceledInfo, setCanceledInfo] = useState(null)
    const [showDeletePopup, setShowDeletePopup] = useState(false)
    const [isModify, setIsModify] = useState(false)
    const [isInputting, setIsInputting] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(25)

    const listTableWrapperRef = useRef(null)
    const [pendingScrollRowId, setPendingScrollRowId] = useState(null)

    // 검색 필터
    const [searchType, setSearchType] = useState('orderCode')
    const [searchTerm, setSearchTerm] = useState('')
    const [appliedSearchTerm, setAppliedSearchTerm] = useState('')
    
    // 날짜 범위 검색
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [appliedStartDate, setAppliedStartDate] = useState('')
    const [appliedEndDate, setAppliedEndDate] = useState('')
    
    // 필터 드롭다운 상태
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // 정렬 상태
    const [sortColumn, setSortColumn] = useState(null)
    const [sortDirection, setSortDirection] = useState('asc') // 'asc' or 'desc'

    // 폼 데이터 (TB_ORDER 구조)
    const [formData, setFormData] = useState({
        ORDER_CD: '',       // 주문번호 (자동생성)
        ORDER_DT: '',       // 주문일자
        CUST_CD: '',        // 고객사 코드
        CUST_EMP: '',       // 담당자
        REMARK: ''          // 비고
    })

    const createDefaultItemFormData = () => ({
        ITEM_CD: '',
        ITEM_NM: '',
        ITEM_SPEC: '',
        ITEM_UNIT: '',
        ORDER_QTY: '1',
        ITEM_COST: '',
        STATUS: 'o1'
    })

    // 품목 입력 폼 데이터 (TB_ORDER_DET 구조)
    const [itemFormData, setItemFormData] = useState(createDefaultItemFormData())

    // 품목 목록 (TB_ORDER_DET)
    const [itemList, setItemList] = useState([])

    // 품목 마스터 데이터 (TB_ITEMMST에서 ITEM_FLAG = '02'인 품목만)
    const [itemMasterList, setItemMasterList] = useState([])

    // 고객사(판매처) 목록 (TB_CUSTMST에서 BIZ_FLAG = '02'인 판매처만)
    const [custMasterList, setCustMasterList] = useState([])
    const [showCustPopup, setShowCustPopup] = useState(false)
    const [selectedCustInPopup, setSelectedCustInPopup] = useState(null)

    // ✅ 품목 마스터 조회 (ITEM_FLAG=02: 제품)
    useEffect(() => {
        (async () => {
            const data = await apiFetch("/api/item/products") // ✅ 02만 내려오도록 백엔드 구현
            const mapped = (Array.isArray(data) ? data : []).map(it => ({
                ITEM_CD: it.itemCd,
                ITEM_NM: it.itemNm,
                ITEM_SPEC: it.itemSpec,
                ITEM_UNIT: it.itemUnit,
                ITEM_COST: it.itemCost,
            }))
            setItemMasterList(mapped)
        })().catch(console.error)
    }, [])

    // ✅ 고객사(판매처) 목록 조회 (BIZ_FLAG=02)
    useEffect(() => {
        (async () => {
            const data = await apiFetch("/api/cust?bizFlag=02") // 02=판매처(고객사)
            const mapped = (Array.isArray(data) ? data : []).map(c => ({
                CUST_CD: c.custCd,
                CUST_NM: c.custNm,
                PRESIDENT_NM: c.presidentNm,
                BIZ_NO: c.bizNo,
                EMP_NM: c.empNm,
                BIZ_TEL: c.bizTel,
            }))
            setCustMasterList(mapped)
        })().catch(console.error)
    }, [])

    // 고객사 선택 처리
    const handleSelectCust = (cust) => {
        setSelectedCustInPopup(cust.CUST_CD)
    }

    // ✅ [수정] 고객사 선택 확정 (고객사, 담당자 자동 입력)
    const handleConfirmCustSelection = () => {
        if (!selectedCustInPopup) {
            alert('고객사를 선택해주세요.')
            return
        }
        const cust = custMasterList.find(c => c.CUST_CD === selectedCustInPopup)
        if (cust) {
            setFormData(prev => ({
                ...prev,
                CUST_CD: cust.CUST_CD,      // 고객사 코드
                CUST_EMP: cust.EMP_NM || '' // 담당자 자동 입력
            }))
            setIsInputting(true)
        }
        setShowCustPopup(false)
        setSelectedCustInPopup(null)
    }

    // 검색 타입이 변경될 때 검색어 초기화
    useEffect(() => {
        setSearchTerm('')
        setAppliedSearchTerm('')
    }, [searchType])

    // 주문 선택 시 상세 정보 조회
    useEffect(() => {
        if (selectedOrder) {
            const order = orderList.find(o => o.ORDER_CD === selectedOrder)
            if (order) {
                setFormData({
                    ORDER_CD: order.ORDER_CD || '',
                    ORDER_DT: order.ORDER_DT || '',
                    CUST_CD: order.CUST_CD || '',
                    CUST_EMP: order.CUST_EMP || '',
                    REMARK: order.REMARK || ''
                })
                setSelectedItems([])
                setEditingItemSeq(null)

                // ✅ 상세 정보 API 호출
                ;(async () => {
                    try {
                        const details = await apiFetch(`/api/order/${encodeURIComponent(order.ORDER_CD)}/details`)
                        const mappedDetails = (Array.isArray(details) ? details : []).map(d => {
                            // 품목 마스터에서 품목명, 규격, 단위, 단가 조회
                            const itemInfo = itemMasterList.find(m => m.ITEM_CD === d.itemCd) || {}
                            return {
                                SEQ_NO: d.seqNo,
                                ITEM_CD: d.itemCd,
                                ITEM_NM: d.itemNm || itemInfo.ITEM_NM || '',
                                ITEM_SPEC: itemInfo.ITEM_SPEC || '',
                                ITEM_UNIT: itemInfo.ITEM_UNIT || 'EA',
                                ORDER_QTY: d.orderQty,
                                ITEM_COST: itemInfo.ITEM_COST || 0,
                                STATUS: d.status || 'o1',
                                REMARK: d.remark || ''
                            }
                        })
                        setItemList(mappedDetails)

                        if (mappedDetails.length > 0) {
                            const firstItem = mappedDetails[0]
                            setItemFormData({
                                ITEM_CD: firstItem.ITEM_CD || '',
                                ITEM_NM: firstItem.ITEM_NM || '',
                                ITEM_SPEC: firstItem.ITEM_SPEC || '',
                                ITEM_UNIT: firstItem.ITEM_UNIT || 'EA',
                                ORDER_QTY: String(firstItem.ORDER_QTY || ''),
                                ITEM_COST: firstItem.ITEM_COST || '',
                                STATUS: firstItem.STATUS || 'o1'
                            })
                        } else {
                            setItemFormData(createDefaultItemFormData())
                        }
                    } catch (e) {
                        console.error('상세 조회 실패:', e)
                        setItemList([])
                        setItemFormData(createDefaultItemFormData())
                    }
                })()
            }
        } else {
            setFormData({
                ORDER_CD: '',
                ORDER_DT: '',
                CUST_CD: '',
                CUST_EMP: '',
                REMARK: ''
            })
            setItemList([])
            setSelectedItems([])
            setEditingItemSeq(null)
            setItemFormData(createDefaultItemFormData())
        }
    }, [selectedOrder, orderList, itemMasterList])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => {
            const nextData = {
                ...prev,
                [name]: value
            }
            // ORDER_CD를 제외한 필드들만 확인 (자동 생성되는 코드는 제외)
            const hasAnyValue = [nextData.ORDER_DT, nextData.CUST_CD, nextData.CUST_EMP, nextData.REMARK]
                .some(val => val && String(val).trim() !== '')
            setIsInputting(hasAnyValue)
            return nextData
        })
    }

    const handleItemInputChange = (e) => {
        const { name, value } = e.target
        setItemFormData(prev => {
            const nextData = {
                ...prev,
                [name]: value
            }

            if (name === 'ITEM_CD' && value) {
                const item = itemMasterList.find(m => m.ITEM_CD === value)
                if (item) {
                    const updatedData = {
                        ...nextData,
                        ITEM_NM: item.ITEM_NM || '',
                        ITEM_SPEC: item.ITEM_SPEC || '',
                        ITEM_UNIT: item.ITEM_UNIT || 'EA',
                        ITEM_COST: item.ITEM_COST || ''
                    }
                    const hasAnyValue = [updatedData.ORDER_QTY, updatedData.ITEM_COST]
                        .some(val => val && String(val).trim() !== '')
                    setIsInputting(hasAnyValue)
                    return updatedData
                }
            }

            // ORDER_QTY와 ITEM_COST만 확인
            const hasAnyValue = [nextData.ORDER_QTY, nextData.ITEM_COST]
                .some(val => val && String(val).trim() !== '')
            setIsInputting(hasAnyValue)
            return nextData
        })
    }

    const handleNew = () => {
        setSelectedOrder(null)
        setIsEditMode(true)
        setIsInputting(false)
        setIsCompleted(false)
        setFormData({
            ORDER_CD: '',
            ORDER_DT: '',
            CUST_CD: '',
            CUST_EMP: '',
            REMARK: ''
        })
        setItemList([])
        setSelectedItems([])
        setEditingItemSeq(null)
        setItemFormData(createDefaultItemFormData())
    }

    const handleModify = () => {
        if (selectedOrder) {
            setIsEditMode(true)
        } else {
            alert('수정할 주문을 선택해주세요.')
        }
    }

    const handleDelete = () => {
        if (!selectedOrder) {
            alert('삭제할 주문을 선택해주세요.')
            return
        }
        setShowDeletePopup(true)
    }

    // ✅ DB 반영: 삭제
    const handleConfirmDelete = async () => {
        try {
            await apiFetch(`/api/order/${encodeURIComponent(selectedOrder)}`, { method: "DELETE" })
            await refreshOrderList()
            setSelectedOrder(null)
            setShowDeletePopup('completed')
        } catch (e) {
            console.error(e)
            alert(`삭제 실패: ${e.message}`)
        }
    }

    // ✅ DB 반영: 저장/수정
    const handleSave = async () => {
        // [수정됨] 주문번호 필수 체크 제거 (자동생성)
        /*
        if (!formData.ORDER_CD || !formData.ORDER_CD.trim()) {
            alert('주문번호를 입력하세요.');
            return;
        }
        */
        if (!formData.ORDER_DT) {
            alert('주문일자를 입력하세요.');
            return;
        }
        
        // ✅ 현재 편집 중인 품목이 있으면 먼저 itemList에 반영
        let finalItemList = [...itemList];
        if (editingItemSeq !== null && itemFormData.ITEM_CD) {
            finalItemList = finalItemList.map(item =>
                item.SEQ_NO === editingItemSeq
                    ? {
                        ...item,
                        ITEM_CD: itemFormData.ITEM_CD,
                        ITEM_NM: itemFormData.ITEM_NM,
                        ITEM_SPEC: itemFormData.ITEM_SPEC,
                        ITEM_UNIT: itemFormData.ITEM_UNIT,
                        ORDER_QTY: itemFormData.ORDER_QTY,
                        ITEM_COST: itemFormData.ITEM_COST,
                        STATUS: itemFormData.STATUS || 'o1'
                    }
                    : item
            );
        }
        
        if (finalItemList.length === 0) {
            alert('품목을 최소 1건 이상 추가하세요.');
            return;
        }

        const payload = {
            orderCd: formData.ORDER_CD ? formData.ORDER_CD.trim() : null, // ✅ 없으면 null (자동생성)
            orderDt: formData.ORDER_DT,
            custCd: formData.CUST_CD || '',
            custEmp: formData.CUST_EMP || '',
            remark: formData.REMARK || '',
            details: finalItemList.map(m => ({
                seqNo: m.SEQ_NO,
                itemCd: m.ITEM_CD,
                orderQty: Number(m.ORDER_QTY) || 1,
                status: m.STATUS || 'o1'
            }))
        };
        
        console.log('저장 payload:', JSON.stringify(payload, null, 2));

        try {
            await apiFetch("/api/order", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            await reloadOrders();
            
            // 저장 완료 후 선택 초기화
            setSelectedOrder(null);
            setIsEditMode(false);
            setItemList([]);
            setFormData({
                ORDER_CD: '',
                ORDER_DT: '',
                CUST_CD: '',
                CUST_EMP: '',
                REMARK: ''
            });
            setItemFormData(createDefaultItemFormData());

            // 👉 기존 UI 로직 유지
            setShowCompletionPopup(true);
        } catch (e) {
            console.error(e);
            alert(`저장 실패: ${e.message}`);
        }
    }

    const handleConfirmOrder = () => {
        if (!selectedOrder) return
        setShowConfirmDialog(true)
    }

    // ✅ DB 반영: 확정 (상태 o2로 변경 후 저장)
    const handleConfirmOrderYes = async () => {
        if (!selectedOrder) return
        if (itemList.length === 0) {
            alert('품목을 입력해주세요.')
            return
        }

        const amount = itemList.reduce(
            (sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)),
            0
        )
        setConfirmedInfo({
            orderCode: selectedOrder,
            custEmp: formData.CUST_EMP || '-',
            amount
        })

        try {
            const payload = {
                orderCd: formData.ORDER_CD,
                orderDt: formData.ORDER_DT,
                custCd: formData.CUST_CD,
                custEmp: formData.CUST_EMP,
                remark: formData.REMARK,
                details: (itemList || []).map(m => ({
                    seqNo: m.SEQ_NO,
                    itemCd: m.ITEM_CD,
                    orderQty: Number(m.ORDER_QTY || 0),
                    status: "o2",
                    remark: m.REMARK ?? ""
                }))
            }

            await apiFetch("/api/order", {
                method: "POST",
                body: JSON.stringify(payload)
            })

            await refreshOrderList()
            
            // 확정 후 선택 초기화
            setSelectedOrder(null)
            setIsEditMode(false)
            setItemList([])
            setFormData({
                ORDER_CD: '',
                ORDER_DT: '',
                CUST_CD: '',
                CUST_EMP: '',
                REMARK: ''
            })
            setItemFormData(createDefaultItemFormData())
            
            setShowConfirmDialog(false)
            setShowConfirmedPopup(true)
        } catch (e) {
            console.error(e)
            alert(`확정 실패: ${e.message}`)
        }
    }

    const handleCancelOrder = () => {
        if (!selectedOrder) return
        setShowCancelDialog(true)
    }

    // ✅ DB 반영: 취소 (상태 o9로 변경 후 저장)
    const handleCancelOrderYes = async () => {
        if (!selectedOrder) return

        const amount = itemList.reduce(
            (sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)),
            0
        )
        setCanceledInfo({
            orderCode: selectedOrder,
            custEmp: formData.CUST_EMP || '-',
            amount
        })

        try {
            const payload = {
                orderCd: formData.ORDER_CD,
                orderDt: formData.ORDER_DT,
                custCd: formData.CUST_CD,
                custEmp: formData.CUST_EMP,
                remark: formData.REMARK,
                details: (itemList || []).map(m => ({
                    seqNo: m.SEQ_NO,
                    itemCd: m.ITEM_CD,
                    orderQty: Number(m.ORDER_QTY || 0),
                    status: "o9",
                    remark: m.REMARK ?? ""
                }))
            }

            await apiFetch("/api/order", {
                method: "POST",
                body: JSON.stringify(payload)
            })

            await refreshOrderList()
            
            // 취소 후 선택 초기화
            setSelectedOrder(null)
            setIsEditMode(false)
            setItemList([])
            setFormData({
                ORDER_CD: '',
                ORDER_DT: '',
                CUST_CD: '',
                CUST_EMP: '',
                REMARK: ''
            })
            setItemFormData(createDefaultItemFormData())
            
            setShowCancelDialog(false)
            setShowCanceledPopup(true)
        } catch (e) {
            console.error(e)
            alert(`취소 실패: ${e.message}`)
        }
    }

    const handleCancel = () => {
        setIsEditMode(false)
        if (selectedOrder) {
            const order = orderList.find(o => o.ORDER_CD === selectedOrder)
            if (order) {
                setFormData({
                    ORDER_CD: order.ORDER_CD || '',
                    ORDER_DT: order.ORDER_DT || '',
                    CUST_CD: order.CUST_CD || '',
                    CUST_EMP: order.CUST_EMP || '',
                    REMARK: order.REMARK || ''
                })
                setItemList(order.ORDER_DET || [])
                setSelectedItems([])
                setEditingItemSeq(null)

                if (order.ORDER_DET && order.ORDER_DET.length > 0) {
                    const firstItem = order.ORDER_DET[0]
                    setItemFormData({
                        ITEM_CD: firstItem.ITEM_CD || '',
                        ITEM_NM: firstItem.ITEM_NM || '',
                        ITEM_SPEC: firstItem.ITEM_SPEC || '',
                        ITEM_UNIT: firstItem.ITEM_UNIT || 'EA',
                        ORDER_QTY: String(firstItem.ORDER_QTY ?? '1'),
                        ITEM_COST: firstItem.ITEM_COST || '',
                        STATUS: firstItem.STATUS || 'o1'
                    })
                } else {
                    setItemFormData(createDefaultItemFormData())
                }
            }
        } else {
            setFormData({
                ORDER_CD:'',
                ORDER_DT: '',
                CUST_CD: '',
                CUST_EMP: '',
                REMARK: ''
            })
            setItemList([])
            setSelectedItems([])
            setEditingItemSeq(null)
            setItemFormData(createDefaultItemFormData())
            setIsInputting(false)
        }
    }

    const handleRowClick = (id) => {
        setSelectedOrder(id)
        setIsEditMode(true)
        setSelectedItems([])
        setEditingItemSeq(null)
        setIsInputting(false)
        setIsCompleted(false)
    }

    const handleAddItem = () => {
        if (!itemFormData.ITEM_CD || !itemFormData.ORDER_QTY) {
            alert('품목코드와 수량은 필수 입력 항목입니다.')
            return
        }

        const nextSeqNo = itemList.length > 0
            ? Math.max(...itemList.map(item => item.SEQ_NO)) + 1
            : 1

        if (editingItemSeq !== null) {
            // 선택된 품목 수정
            setItemList(prev => prev.map(item =>
                item.SEQ_NO === editingItemSeq
                    ? {
                        ...item,
                        ORDER_CD: formData.ORDER_CD || '',
                        ITEM_CD: itemFormData.ITEM_CD,
                        ITEM_NM: itemFormData.ITEM_NM,
                        ITEM_SPEC: itemFormData.ITEM_SPEC,
                        ITEM_UNIT: itemFormData.ITEM_UNIT,
                        ORDER_QTY: itemFormData.ORDER_QTY,
                        ITEM_COST: itemFormData.ITEM_COST,
                        STATUS: itemFormData.STATUS || 'o1'
                    }
                    : item
            ))
        } else {
            const newItem = {
                SEQ_NO: nextSeqNo,
                ORDER_CD: formData.ORDER_CD || '',
                ITEM_CD: itemFormData.ITEM_CD,
                ITEM_NM: itemFormData.ITEM_NM,
                ITEM_SPEC: itemFormData.ITEM_SPEC,
                ITEM_UNIT: itemFormData.ITEM_UNIT,
                ORDER_QTY: itemFormData.ORDER_QTY,
                ITEM_COST: itemFormData.ITEM_COST,
                STATUS: itemFormData.STATUS || 'o1',
                REMARK: ''
            }

            setItemList(prev => [...prev, newItem])
        }

        setSelectedItems([])
        setEditingItemSeq(null)
        setItemFormData(createDefaultItemFormData())
    }

    const handleDeleteItem = () => {
        if (selectedItems.length === 0) {
            alert('삭제할 품목을 선택해주세요.')
            return
        }
        if (window.confirm('선택한 품목을 삭제하시겠습니까?')) {
            setItemList(prev => prev.filter(item => !selectedItems.includes(item.SEQ_NO)))
            setSelectedItems([])
            setEditingItemSeq(null)
            setItemFormData(createDefaultItemFormData())
        }
    }

    const handleItemCheckboxChange = (seqNo) => {
        setSelectedItems(prev => {
            const isSelected = prev.includes(seqNo)
            const nextSelected = isSelected ? prev.filter(item => item !== seqNo) : [...prev, seqNo]

            const targetSeq = isSelected ? (nextSelected[0] ?? null) : seqNo
            setEditingItemSeq(targetSeq ?? null)

            if (targetSeq !== null) {
                const item = itemList.find(det => det.SEQ_NO === targetSeq)
                if (item) {
                    setItemFormData({
                        ITEM_CD: item.ITEM_CD || '',
                        ITEM_NM: item.ITEM_NM || '',
                        ITEM_SPEC: item.ITEM_SPEC || '',
                        ITEM_UNIT: item.ITEM_UNIT || 'EA',
                        ORDER_QTY: String(item.ORDER_QTY ?? '1'),
                        ITEM_COST: item.ITEM_COST || '',
                        STATUS: item.STATUS || 'o1'
                    })
                }
            } else {
                setItemFormData(createDefaultItemFormData())
            }

            return nextSelected
        })
    }

    const handleItemRowClick = (item) => {
        if (selectedOrder !== null && !isEditMode) return
        const seqNo = item.SEQ_NO
        // Ctrl/Cmd 키 없이 클릭하면 단일 선택, 체크박스로 다중 선택 가능
        setSelectedItems(prev => {
            if (prev.includes(seqNo)) {
                return prev
            }
            return [seqNo]
        })
        setEditingItemSeq(seqNo)
        setItemFormData({
            ITEM_CD: item.ITEM_CD || '',
            ITEM_NM: item.ITEM_NM || '',
            ITEM_SPEC: item.ITEM_SPEC || '',
            ITEM_UNIT: item.ITEM_UNIT || 'EA',
            ORDER_QTY: String(item.ORDER_QTY ?? '1'),
            ITEM_COST: item.ITEM_COST || '',
            STATUS: item.STATUS || 'o1'
        })
    }

    const handleMasterItemClick = (item) => {
        if (selectedOrder !== null && !isEditMode) {
            return
        }
        setSelectedItems([])
        setEditingItemSeq(null)
        setItemFormData({
            ITEM_CD: item.ITEM_CD || '',
            ITEM_NM: item.ITEM_NM || '',
            ITEM_SPEC: item.ITEM_SPEC || '',
            ITEM_UNIT: item.ITEM_UNIT || 'EA',
            ORDER_QTY: '1',
            ITEM_COST: item.ITEM_COST || '',
            STATUS: 'o1'
        })
    }

    const handleMasterItemCheckboxChange = (itemCd) => {
        if (selectedOrder !== null && !isEditMode) return

        setSelectedMasterItems(prev => {
            const isSame = prev.includes(itemCd)
            const next = isSame ? [] : [itemCd]

            if (!isSame) {
                const item = itemMasterList.find(m => m.ITEM_CD === itemCd)
                if (item) {
                    setSelectedItems([])
                    setEditingItemSeq(null)
                    setItemFormData({
                        ITEM_CD: item.ITEM_CD || '',
                        ITEM_NM: item.ITEM_NM || '',
                        ITEM_SPEC: item.ITEM_SPEC || '',
                        ITEM_UNIT: item.ITEM_UNIT || 'EA',
                        ORDER_QTY: '',
                        ITEM_COST: item.ITEM_COST || '',
                        STATUS: 'o1'
                    })
                }
            }

            return next
        })
    }

    const handleSelectAllMaster = (e) => {
        if (e.target.checked && itemMasterList.length > 0) {
            setSelectedMasterItems([itemMasterList[0].ITEM_CD])
            handleMasterItemClick(itemMasterList[0])
        } else {
            setSelectedMasterItems([])
        }
    }

    const handleAddMasterItems = () => {
        if (selectedOrder !== null && !isEditMode) {
            alert('수정 모드에서만 품목을 추가할 수 있습니다.')
            return
        }

        if (selectedMasterItems.length === 0) {
            alert('추가할 품목을 선택해주세요.')
            return
        }

        const item = itemMasterList.find(m => m.ITEM_CD === selectedMasterItems[0])
        if (item) {
            setItemFormData({
                ITEM_CD: item.ITEM_CD || '',
                ITEM_NM: item.ITEM_NM || '',
                ITEM_SPEC: item.ITEM_SPEC || '',
                ITEM_UNIT: item.ITEM_UNIT || 'EA',
                ORDER_QTY: '1',
                ITEM_COST: item.ITEM_COST || '',
                STATUS: 'o1'
            })
        }
        setSelectedItems([])
        setEditingItemSeq(null)
        setSelectedMasterItems([])
        setShowItemMasterPopup(false)
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const seqList = itemList.map(item => item.SEQ_NO)
            setSelectedItems(seqList)
            const firstItem = itemList[0]
            if (firstItem) {
                setEditingItemSeq(firstItem.SEQ_NO)
                setItemFormData({
                    ITEM_CD: firstItem.ITEM_CD || '',
                    ITEM_NM: firstItem.ITEM_NM || '',
                    ITEM_SPEC: firstItem.ITEM_SPEC || '',
                    ITEM_UNIT: firstItem.ITEM_UNIT || 'EA',
                    ORDER_QTY: String(firstItem.ORDER_QTY ?? '1'),
                    ITEM_COST: firstItem.ITEM_COST || '',
                    STATUS: firstItem.STATUS || 'o1'
                })
            }
        } else {
            setSelectedItems([])
            setEditingItemSeq(null)
            setItemFormData(createDefaultItemFormData())
        }
    }

    const handleSearch = () => {
        setAppliedSearchTerm(searchTerm)
        setAppliedStartDate(startDate)
        setAppliedEndDate(endDate)
    }

    const handleResetFilters = () => {
        setStartDate('')
        setEndDate('')
        setSearchTerm('')
        setAppliedSearchTerm('')
        setAppliedStartDate('')
        setAppliedEndDate('')
    }

    // 필터링된 목록
    const filteredList = orderList.filter(order => {
        // 날짜 범위 필터 (시작일, 종료일이 있을 경우)
        if (appliedStartDate || appliedEndDate) {
            const orderDate = order.ORDER_DT
            if (orderDate) {
                if (appliedStartDate && orderDate < appliedStartDate) return false
                if (appliedEndDate && orderDate > appliedEndDate) return false
            }
        }
        
        // 검색어 필터
        if (!appliedSearchTerm) return true
        
        switch (searchType) {
            case 'orderCode':
                return order.ORDER_CD?.includes(appliedSearchTerm)
            case 'orderDate':
                return order.ORDER_DT?.includes(appliedSearchTerm)
            case 'custCode':
                return order.CUST_CD?.includes(appliedSearchTerm)
            case 'itemName':
                return order.ORDER_DET?.some(det => det.ITEM_NM?.includes(appliedSearchTerm))
            case 'custEmp':
                return order.CUST_EMP?.includes(appliedSearchTerm)
            default:
                return true
        }
    })

    const isEditingItem = editingItemSeq !== null

    const handleSort = (columnName) => {
        if (sortColumn === columnName) {
            setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortColumn(columnName)
            setSortDirection('asc')
        }
    }

    const sortedList = [...filteredList].sort((a, b) => {
        if (!sortColumn) return 0

        let aValue = a[sortColumn]
        let bValue = b[sortColumn]

        // 중첩된 품목 정보 처리 (예: ITEM_NM, ITEM_CD 등)
        if (sortColumn === 'ITEM_CD' || sortColumn === 'ITEM_NM') {
            aValue = a.ORDER_DET?.[0]?.[sortColumn] || ''
            bValue = b.ORDER_DET?.[0]?.[sortColumn] || ''
        } else if (sortColumn === 'totalAmount') {
            aValue = (a.ORDER_DET || []).reduce((sum, det) => sum + Number(det.ORDER_QTY || 0) * Number(det.ITEM_COST || 0), 0)
            bValue = (b.ORDER_DET || []).reduce((sum, det) => sum + Number(det.ORDER_QTY || 0) * Number(det.ITEM_COST || 0), 0)
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else {
            // 다른 타입의 경우 문자열로 변환하여 비교
            const aStr = String(aValue || '')
            const bStr = String(bValue || '')
            return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
        }
    })

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = sortedList.slice(indexOfFirstItem, indexOfLastItem)

    // 현재 페이지에 표시할 데이터가 없으면(삭제/필터 등) 이전 유효 페이지로 이동
    useEffect(() => {
        if (sortedList.length === 0) {
            if (currentPage !== 1) setCurrentPage(1)
            return
        }

        const lastPage = Math.max(1, Math.ceil(sortedList.length / itemsPerPage))
        if (currentPage > lastPage) {
            setCurrentPage(lastPage)
            return
        }

        if (currentItems.length === 0 && currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }, [sortedList.length, currentItems.length, currentPage])

    useEffect(() => {
        if (pendingScrollRowId == null) return

        const index = sortedList.findIndex(row => row.ORDER_CD === pendingScrollRowId)
        if (index === -1) {
            setPendingScrollRowId(null)
            return
        }

        const targetPage = Math.floor(index / itemsPerPage) + 1
        if (currentPage !== targetPage) {
            setCurrentPage(targetPage)
            return
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const rowElement = document.getElementById(`excel-row-${pendingScrollRowId}`)
                if (rowElement) {
                    rowElement.scrollIntoView({ block: 'end' })
                } else if (listTableWrapperRef.current) {
                    listTableWrapperRef.current.scrollTop = listTableWrapperRef.current.scrollHeight
                }
                setPendingScrollRowId(null)
            })
        })
    }, [pendingScrollRowId, sortedList, currentPage])

    const isConfirmed = selectedOrder && itemList.length > 0 && itemList.some(m => m.STATUS === 'o2')
    const isCanceled = selectedOrder && itemList.length > 0 && itemList.some(m => m.STATUS === 'o9')
    const isReadOnly = isConfirmed || isCanceled

    return (
        <div className="customer-management-container">
              <div className="customer-management-wrapper">
                <div className="customer-header">
                    <div className="header-left-section">
                        <h2 className="page-title">주문관리</h2>
                        <div className="statistics-info">
                            <span className="stat-label">총 주문:</span>
                            <span className="stat-value">{orderList.length}</span>
                            <span className="stat-unit">건</span>
                        </div>
                        <button
                            className="filter-toggle-btn"
                            onClick={() => setIsFilterOpen(prev => !prev)}
                        >
                            <span>{isFilterOpen ? '▲' : '▼'} 검색 필터</span>
                        </button>
                    </div>
                    <div className="header-buttons">
                        <IconButton type="modify" label="주문 등록" onClick={handleNew} />
                        <IconButton type="delete" label="삭제" onClick={handleDelete} />
                    </div>
                </div>

                {/* 메인 콘텐츠 레이아웃 */}
                <div className="order-content-layout">
                    {/* 왼쪽: 주문 목록 */}
                    <div className="order-list-panel">
                        <div className="list-table-wrapper" ref={listTableWrapperRef}>
                            <div className={`filter-slide ${isFilterOpen ? 'open' : ''}`}>
                                <div className="advanced-filter-panel">
                                    <div className="filter-row">
                                        <div className="filter-field">
                                            <label className="filter-label">기간 검색</label>
                                            <div className="date-range-filter">
                                                <input
                                                    type="date"
                                                    className="date-input"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                />
                                                <span className="date-separator">~</span>
                                                <input
                                                    type="date"
                                                    className="date-input"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="filter-field filter-field-keyword">
                                            <label className="filter-label">키워드 검색</label>
                                            <SearchBar
                                                searchOptions={[
                                                    { value: 'custCode', label: '고객사', type: 'text' },
                                                    { value: 'itemName', label: '품목명', type: 'text' },
                                                    { value: 'custEmp', label: '담당자', type: 'text' }
                                                ]}
                                                searchType={searchType}
                                                onSearchTypeChange={setSearchType}
                                                searchTerm={searchTerm}
                                                onSearchTermChange={setSearchTerm}
                                            />
                                        </div>
                                        <div className="filter-actions">
                                            <button className="filter-search-btn" onClick={handleSearch}>
                                                검색
                                            </button>
                                            <button className="filter-reset-btn" onClick={handleResetFilters}>
                                                초기화
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <table className="excel-table">
                                <thead>
                                <tr>
                                    <th className="excel-th">No</th>
                                    <th className="excel-th sortable" onClick={() => handleSort('ORDER_CD')}>
                                        주문번호
                                        {sortColumn === 'ORDER_CD' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th sortable" onClick={() => handleSort('CUST_CD')}>
                                        고객사
                                        {sortColumn === 'CUST_CD' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th sortable" onClick={() => handleSort('ITEM_CD')}>
                                        품목코드
                                        {sortColumn === 'ITEM_CD' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th sortable" onClick={() => handleSort('ITEM_NM')}>
                                        품목명
                                        {sortColumn === 'ITEM_NM' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th sortable" onClick={() => handleSort('totalAmount')}>
                                        금액
                                        {sortColumn === 'totalAmount' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th sortable" onClick={() => handleSort('CUST_EMP')}>
                                        담당자
                                        {sortColumn === 'CUST_EMP' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th sortable" onClick={() => handleSort('ORDER_DT')}>
                                        주문일자
                                        {sortColumn === 'ORDER_DT' && (
                                            <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </th>
                                    <th className="excel-th">상태</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentItems.map((order, index) => {
                                    const details = order.ORDER_DET || []
                                    const totalAmount = details.reduce((sum, det) => sum + Number(det.ORDER_QTY || 0) * Number(det.ITEM_COST || 0), 0)
                                    const previewItems = details.slice(0, 1)
                                    const overflowCount = details.length > 1 ? details.length - 1 : 0
                                    const itemCdText = previewItems.map(det => det.ITEM_CD).filter(Boolean).join(', ')
                                    const itemNmText = previewItems.map(det => det.ITEM_NM).filter(Boolean).join(', ')
                                    const overflowLabel = overflowCount > 0 ? ` 외 ${overflowCount}건` : ''
                                    
                                    // 상태 표시 로직 (첫 번째 품목의 상태를 대표값으로 사용)
                                    const statusMap = {
                                        'o1': '주문등록',
                                        'o2': '주문확정',
                                        'o3': '출고완료', 
                                        'o9': '취소됨'
                                    }
                                    const firstStatus = details.length > 0 ? details[0].STATUS : 'o1'
                                    const statusText = statusMap[firstStatus] || '주문등록'

                                    return (
                                        <tr
                                            key={order.ORDER_CD || index}
                                            id={`excel-row-${order.ORDER_CD}`}
                                            className={`excel-tr ${selectedOrder === order.ORDER_CD ? 'selected' : ''}`}
                                            onClick={() => handleRowClick(order.ORDER_CD)}
                                        >
                                            <td className="excel-td excel-td-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="excel-td">{order.ORDER_CD}</td>
                                            <td className="excel-td">{order.CUST_CD}</td>
                                            <td className="excel-td">
                                                {itemCdText ? `${itemCdText}${overflowLabel}` : ''}
                                            </td>
                                            <td className="excel-td">
                                                {itemNmText ? `${itemNmText}${overflowLabel}` : ''}
                                            </td>
                                            <td className="excel-td" style={{ textAlign: 'right' }}>
                                                {totalAmount ? totalAmount.toLocaleString() : ''}
                                            </td>
                                            <td className="excel-td">{order.CUST_EMP}</td>
                                            <td className="excel-td">{order.ORDER_DT}</td>
                                            <td className="excel-td">
                                                <span className={`status-text status-${firstStatus}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                            <Pagination
                                itemsPerPage={itemsPerPage}
                                totalItems={sortedList.length}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>

                    {/* 오른쪽: 상세 정보 및 품목 목록 */}
                    <div className="order-detail-panel">
                        <div className="detail-header">
                            <div className="detail-title-wrap">
                                <div className="detail-title-row">
                                    <h3 className="detail-title">주문 정보</h3>
                                    <span className="detail-chip">INFO</span>
                                </div>
                                <div className="detail-subtext">
                                    {selectedOrder
                                        ? `${formData.ORDER_CD || '코드'} · ${formData.CUST_CD || '고객사'}`
                                        : '신규 등록 대기'}
                                </div>
                            </div>
                            <div className="detail-status">
                                <span className="status-dot" aria-hidden="true" />
                                <span className="status-text">
                                    {isConfirmed ? '주문 확정' : isCanceled ? '주문 취소' : isCompleted ? '등록 완료' : selectedOrder ? '선택됨' : isInputting ? '등록중' : '대기'}
                                </span>
                            </div>
                        </div>

                        <div className="detail-content">
                            <div className="detail-meta-bar">
                                <span className={`badge ${isConfirmed ? 'badge-success' : isCanceled ? 'badge-error' : isCompleted ? 'badge-success' : selectedOrder ? 'badge-edit' : 'badge-new'}`} style={isCanceled ? {backgroundColor: '#ef4444', color: 'white'} : {}}>
                                    {isConfirmed ? '주문 확정' : isCanceled ? '주문 취소' : isCompleted ? '등록 완료' : selectedOrder ? '수정 모드' : '신규 등록'}
                                </span>
                                <span className="meta-text">
                                    {isConfirmed 
                                        ? '주문이 확정되어 수정할 수 없습니다.' 
                                        : isCanceled 
                                        ? '주문이 취소되었습니다.' 
                                        : isCompleted
                                        ? '주문이 성공적으로 등록되었습니다.'
                                        : selectedOrder
                                        ? '선택된 주문 정보를 저장하면 업데이트됩니다.'
                                        : '주문번호와 고객사를 입력한 뒤 품목을 추가하세요.'}
                                </span>
                            </div>

                            <div className="detail-sections-grid">
                                <div className="form-section">
                                    <div className="section-title-row">
                                        <div>
                                            <div className="section-title">기본 정보</div>
                                            <div className="section-subtext">주문 식별 및 고객사, 담당자</div>
                                        </div>
                                        <div className="pill pill-soft">{formData.ORDER_CD || 'NEW'}</div>
                                    </div>
                                    <div className="form-grid form-grid-2">
                                        <div className="form-field-inline">
                                            <label>주문번호</label>
                                            {/* ✅ 수정됨: 클릭 이벤트 제거, 완전히 읽기 전용 */}
                                            <input
                                                type="text"
                                                name="ORDER_CD"
                                                value={formData.ORDER_CD}
                                                readOnly
                                                disabled
                                                style={{ backgroundColor: '#f3f4f6', cursor: 'default' }}
                                                placeholder="저장 시 자동 생성"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>주문일자</label>
                                            <input
                                                type="date"
                                                name="ORDER_DT"
                                                value={formData.ORDER_DT}
                                                onChange={handleInputChange}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                readOnly={isCompleted || isReadOnly}
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>고객사</label>
                                            {/* ✅ 수정됨: 여기에 팝업 트리거(onClick) 추가 */}
                                            <input
                                                type="text"
                                                name="CUST_CD"
                                                value={formData.CUST_CD}
                                                readOnly
                                                className="material-lookup-input"
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                onClick={() => {
                                                    if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                                                        setShowCustPopup(true)
                                                    }
                                                }}
                                                style={{ cursor: (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) ? 'pointer' : 'default' }}
                                                placeholder="클릭하여 고객사 선택"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>담당자</label>
                                            <input
                                                type="text"
                                                name="CUST_EMP"
                                                value={formData.CUST_EMP}
                                                onChange={handleInputChange}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                readOnly={isCompleted || isReadOnly}
                                                placeholder="담당자명 (자동입력)"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-grid form-grid-1">
                                        <div className="form-field-inline">
                                            <label>비고</label>
                                            <textarea
                                                name="REMARK"
                                                value={formData.REMARK}
                                                onChange={handleInputChange}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                readOnly={isCompleted || isReadOnly}
                                                rows="2"
                                                placeholder="특이사항 메모"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 품목 입력 폼 */}
                                {!isReadOnly && (
                                <div className="form-section">
                                    <div className="section-title-row">
                                        <div>
                                            <div className="section-title">품목 입력</div>
                                            <div className="section-subtext">품목 선택 후 수량과 단가를 입력하세요.</div>
                                        </div>
                                        <div className="section-actions">
                                            <button
                                                className="ghost-btn"
                                                onClick={handleAddItem}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                            >
                                                {isEditingItem ? '수정' : '추가'}
                                            </button>
                                            <button
                                                className="ghost-btn"
                                                onClick={() => setShowItemMasterPopup(true)}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                            >
                                                품목 목록 보기
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-grid form-grid-2">
                                        <div className="form-field-inline">
                                            <label>품목코드</label>
                                            <input
                                                type="text"
                                                name="ITEM_CD"
                                                value={itemFormData.ITEM_CD}
                                                readOnly
                                                className="material-lookup-input"
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                onClick={() => {
                                                    if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                                                        setShowItemMasterPopup(true)
                                                    }
                                                }}
                                                placeholder="품목목록에서 선택"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>품목명</label>
                                            <input
                                                type="text"
                                                name="ITEM_NM"
                                                value={itemFormData.ITEM_NM}
                                                readOnly
                                                className="material-lookup-input"
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                onClick={() => {
                                                    if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                                                        setShowItemMasterPopup(true)
                                                    }
                                                }}
                                                placeholder="품목목록에서 선택"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>규격</label>
                                            <input
                                                type="text"
                                                name="ITEM_SPEC"
                                                value={itemFormData.ITEM_SPEC}
                                                readOnly
                                                className="material-lookup-input"
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                onClick={() => {
                                                    if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                                                        setShowItemMasterPopup(true)
                                                    }
                                                }}
                                                placeholder="품목목록에서 선택"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>단위</label>
                                            <input
                                                type="text"
                                                name="ITEM_UNIT"
                                                value={itemFormData.ITEM_UNIT}
                                                readOnly
                                                className="material-lookup-input"
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                onClick={() => {
                                                    if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                                                        setShowItemMasterPopup(true)
                                                    }
                                                }}
                                                placeholder="품목목록에서 선택"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>수량</label>
                                            <input
                                                type="number"
                                                name="ORDER_QTY"
                                                value={itemFormData.ORDER_QTY}
                                                onChange={handleItemInputChange}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                readOnly={isCompleted || isReadOnly}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="form-field-inline">
                                            <label>단가</label>
                                            <input
                                                type="number"
                                                name="ITEM_COST"
                                                value={itemFormData.ITEM_COST}
                                                readOnly
                                                disabled
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>

                            {/* 주문 품목 목록 */}
                            {itemList.length > 0 && (
                                <div className="material-list-section">
                                    <div className="section-header-with-buttons">
                                        <div className="section-header">주문 품목 목록 ({itemList.length}건)</div>
                                        <div className="section-buttons">
                                            {!isReadOnly && (
                                                <button
                                                    className="ghost-btn delete-btn"
                                                    onClick={handleDeleteItem}
                                                    disabled={isCompleted || (selectedOrder !== null && !isEditMode)}
                                                >
                                                    삭제
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="table-wrapper">
                                        <table className="excel-table">
                                            <thead>
                                            <tr>
                                                <th className="excel-th" style={{width:'40px'}}>
                                                    <input
                                                        type="checkbox"
                                                        checked={itemList.length > 0 && selectedItems.length === itemList.length}
                                                        onChange={handleSelectAll}
                                                        disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                    />
                                                </th>
                                                <th className="excel-th" style={{width:'45px'}}>No</th>
                                                <th className="excel-th" style={{width:'80px'}}>코드</th>
                                                <th className="excel-th">품목명</th>
                                                <th className="excel-th" style={{width:'50px'}}>단위</th>
                                                <th className="excel-th" style={{width:'70px'}}>수량</th>
                                                <th className="excel-th" style={{width:'80px'}}>단가</th>
                                                <th className="excel-th" style={{width:'90px'}}>금액</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {itemList.map((item) => (
                                                <tr
                                                    key={item.SEQ_NO}
                                                    className="excel-tr"
                                                    onClick={() => handleItemRowClick(item)}
                                                >
                                                    <td className="excel-td">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedItems.includes(item.SEQ_NO)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={() => handleItemCheckboxChange(item.SEQ_NO)}
                                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                            />
                                                    </td>
                                                    <td className="excel-td excel-td-number">{item.SEQ_NO}</td>
                                                    <td className="excel-td" style={{fontSize:'10px'}}>{item.ITEM_CD}</td>
                                                    <td className="excel-td">{item.ITEM_NM}</td>
                                                    <td className="excel-td">{item.ITEM_UNIT}</td>
                                                    <td className="excel-td">{item.ORDER_QTY}</td>
                                                    <td className="excel-td" style={{fontSize:'10px'}}>{Number(item.ITEM_COST || 0).toLocaleString()}</td>
                                                    <td className="excel-td" style={{fontSize:'10px'}}>
                                                        {(Number(item.ORDER_QTY || 0) * Number(item.ITEM_COST || 0)).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="excel-tr total-row">
                                                <td colSpan="5" className="excel-td" style={{textAlign:'center', fontWeight:'600'}}>합계</td>
                                                <td className="excel-td" style={{fontWeight:'600'}}>
                                                    {itemList.reduce((sum, m) => sum + Number(m.ORDER_QTY || 0), 0)}
                                                </td>
                                                <td className="excel-td"></td>
                                                <td className="excel-td" style={{fontWeight:'600'}}>
                                                    {itemList.reduce((sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {!isCompleted && (
                                <div className="detail-footer">
                                    {(isEditMode || !selectedOrder) && !isReadOnly && (
                                        <button 
                                            className="erp-button erp-button-primary" 
                                            onClick={handleSave} 
                                            disabled={isReadOnly}
                                            style={{ 
                                                backgroundColor: selectedOrder ? '#0ea5e9' : '#16a34a', 
                                                borderColor: selectedOrder ? '#0ea5e9' : '#16a34a' 
                                            }}
                                        >
                                            {selectedOrder ? '수정 완료' : '주문 등록'}
                                        </button>
                                    )}
                                    
                                    {selectedOrder && !isEditMode && !isReadOnly && (
                                        <button 
                                            className="erp-button erp-button-primary" 
                                            onClick={() => setIsEditMode(true)}
                                            style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}
                                        >
                                            주문 수정
                                        </button>
                                    )}

                                    {selectedOrder && !isReadOnly && (
                                        <>
                                            <button 
                                                className="erp-button" 
                                                onClick={handleConfirmOrder}
                                                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: 'white', marginLeft: '8px' }}
                                            >
                                                주문 확정
                                            </button>
                                            <button 
                                                className="erp-button erp-button-cancel"
                                                onClick={handleCancelOrder}
                                                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white', marginLeft: '8px' }}
                                            >
                                                주문 취소
                                            </button>
                                        </>
                                    )}

                                    {!isReadOnly && (
                                        <button
                                            className="erp-button erp-button-default"
                                            onClick={selectedOrder ? handleDelete : handleCancel}
                                            disabled={!selectedOrder && !isInputting}
                                        >
                                            {selectedOrder ? '삭제' : '취소'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* 확정 상태 표시 */}
                            {isConfirmed && (
                                <div className="detail-footer" style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>✓ 주문이 확정되었습니다. (수정 불가)</span>
                                </div>
                            )}

                            {/* 취소 상태 표시 */}
                            {isCanceled && (
                                <div className="detail-footer" style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>✗ 주문이 취소되었습니다.</span>
                                </div>
                            )}

                            {isCompleted && !isModify && !isConfirmed && !isCanceled && (
                                <div className="detail-footer" style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>✓ 주문이 등록되었습니다.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 품목 목록 팝업 (품목관리 데이터) */}
            {showItemMasterPopup && (
                <div className="popup-overlay" onClick={() => setShowItemMasterPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                        <div className="popup-header">
                            <h3 className="popup-title">품목 목록 (품목관리)</h3>
                            <button
                                className="popup-close-btn"
                                onClick={() => setShowItemMasterPopup(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="popup-body">
                            <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <table className="excel-table">
                                    <thead>
                                    <tr>
                                        <th className="excel-th">
                                            <input
                                                type="checkbox"
                                                checked={selectedMasterItems.length > 0}
                                                onChange={handleSelectAllMaster}
                                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                            />
                                        </th>
                                        <th className="excel-th">No</th>
                                        <th className="excel-th">품목코드</th>
                                        <th className="excel-th">품목명</th>
                                        <th className="excel-th">규격</th>
                                        <th className="excel-th">단위</th>
                                        <th className="excel-th">단가</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {itemMasterList && itemMasterList.length > 0 ? (
                                        itemMasterList.map((item, index) => (
                                            <tr
                                                key={item.ITEM_CD || index}
                                                className="excel-tr"
                                                onClick={() => {
                                                    if (isCompleted || (selectedOrder !== null && !isEditMode)) return
                                                    setSelectedMasterItems([item.ITEM_CD])
                                                    handleMasterItemClick(item)
                                                }}
                                                style={{ cursor: (isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)) ? 'default' : 'pointer' }}
                                            >
                                                <td className="excel-td" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMasterItems.includes(item.ITEM_CD)}
                                                        onChange={() => handleMasterItemCheckboxChange(item.ITEM_CD)}
                                                        disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                                                    />
                                                </td>
                                                <td className="excel-td excel-td-number">{index + 1}</td>
                                                <td className="excel-td">{item.ITEM_CD}</td>
                                                <td className="excel-td">{item.ITEM_NM}</td>
                                                <td className="excel-td">{item.ITEM_SPEC}</td>
                                                <td className="excel-td">{item.ITEM_UNIT}</td>
                                                <td className="excel-td">{item.ITEM_COST}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="excel-td" style={{ textAlign: 'center', color: '#999' }}>
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="excel-btn excel-btn-new"
                                onClick={handleAddMasterItems}
                                disabled={isCompleted || isReadOnly || selectedMasterItems.length === 0 || (selectedOrder !== null && !isEditMode)}
                            >
                                추가
                            </button>
                            <button
                                className="excel-btn excel-btn-modify"
                                onClick={() => setShowItemMasterPopup(false)}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 확정/수정 완료 팝업 */}
            {showCompletionPopup && (
                <div className="popup-overlay" onClick={() => setShowCompletionPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #16a34a', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#15803d', margin: 0, fontSize: '20px' }}>✓ 주문이 완료되었습니다.</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '40px 30px' }}>
                            <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>주문이 성공적으로 {isModify ? '수정' : '등록'}되었습니다.</p>
                                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                                        주문번호: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.ORDER_CD}</span>
                                    </p>
                                    <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                                        담당자: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{formData.CUST_EMP || '-'}</span>
                                    </p>
                                    <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                                        주문 금액: <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '8px', fontSize: '15px' }}>{itemList.reduce((sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}원</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}>
                            <button
                                className="erp-button erp-button-primary"
                                onClick={() => {
                                    setShowCompletionPopup(false)
                                    if (isModify) {
                                        setIsCompleted(false)
                                    }
                                }}
                                style={{ width: '120px' }}
                            >
                                {isModify ? '계속 수정' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 확정 확인 팝업 (예/아니오) */}
            {showConfirmDialog && (
                <div className="popup-overlay" onClick={() => setShowConfirmDialog(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #3b82f6', background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#1d4ed8', margin: 0, fontSize: '20px' }}>주문 확정</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '26px 24px' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                                주문을 확정하시겠습니까?
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#6b7280', lineHeight: '1.6' }}>
                                확정 후에는 수정할 수 없습니다.
                            </p>

                            <div style={{ marginTop: '16px', textAlign: 'left', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '6px 0', color: '#6b7280', fontSize: '13px' }}>
                                    주문번호: <span style={{ fontWeight: '600', color: '#111827', marginLeft: '8px' }}>{selectedOrder}</span>
                                </p>
                                <p style={{ margin: '6px 0', color: '#6b7280', fontSize: '13px' }}>
                                    담당자: <span style={{ fontWeight: '600', color: '#111827', marginLeft: '8px' }}>{formData.CUST_EMP || '-'}</span>
                                </p>
                                <p style={{ margin: '6px 0', color: '#6b7280', fontSize: '13px' }}>
                                    주문 금액: <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '8px', fontSize: '14px' }}>{itemList.reduce((sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}원</span>
                                </p>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', gap: '10px' }}>
                            <button type="button" className="erp-button erp-button-default" onClick={() => setShowConfirmDialog(false)} style={{ width: '120px' }}>아니오</button>
                            <button type="button" className="erp-button erp-button-primary" onClick={handleConfirmOrderYes} style={{ width: '120px' }}>예</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 확정 완료 팝업 (무엇이 확정됐는지 표시) */}
            {showConfirmedPopup && (
                <div className="popup-overlay" onClick={() => setShowConfirmedPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #16a34a', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#15803d', margin: 0, fontSize: '20px' }}>✓ 주문이 확정되었습니다.</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '26px 24px' }}>
                            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                                    주문번호: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{confirmedInfo?.orderCode ?? selectedOrder}</span>
                                </p>
                                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                                    담당자: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{confirmedInfo?.custEmp ?? (formData.CUST_EMP || '-')}</span>
                                </p>
                                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                                    주문 금액: <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '8px', fontSize: '15px' }}>{Number(confirmedInfo?.amount ?? itemList.reduce((sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)), 0)).toLocaleString()}원</span>
                                </p>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}>
                            <button type="button" className="erp-button erp-button-primary" onClick={() => setShowConfirmedPopup(false)} style={{ width: '120px' }}>확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 취소 확인 팝업 (예/아니오) */}
            {showCancelDialog && (
                <div className="popup-overlay" onClick={() => setShowCancelDialog(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #f59e0b', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#92400e', margin: 0, fontSize: '20px' }}>주문 취소</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '26px 24px' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                                주문을 취소하시겠습니까?
                            </p>
                            <div style={{ marginTop: '16px', textAlign: 'left', background: '#fffbeb', padding: '12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <p style={{ margin: '6px 0', color: '#92400e', fontSize: '13px' }}>
                                    주문번호: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{selectedOrder}</span>
                                </p>
                                <p style={{ margin: '6px 0', color: '#92400e', fontSize: '13px' }}>
                                    담당자: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{formData.CUST_EMP || '-'}</span>
                                </p>
                                <p style={{ margin: '6px 0', color: '#92400e', fontSize: '13px' }}>
                                    주문 금액: <span style={{ fontWeight: '800', color: '#b91c1c', marginLeft: '8px', fontSize: '14px' }}>{itemList.reduce((sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}원</span>
                                </p>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', gap: '10px' }}>
                            <button type="button" className="erp-button erp-button-default" onClick={() => setShowCancelDialog(false)} style={{ width: '120px' }}>아니오</button>
                            <button type="button" className="erp-button erp-button-primary" onClick={handleCancelOrderYes} style={{ width: '120px', backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>예</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 취소 완료 팝업 (무엇이 취소됐는지 표시) */}
            {showCanceledPopup && (
                <div className="popup-overlay" onClick={() => setShowCanceledPopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #f59e0b', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#92400e', margin: 0, fontSize: '20px' }}>✓ 주문이 취소되었습니다.</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '26px 24px' }}>
                            <div style={{ textAlign: 'left', background: '#fffbeb', padding: '15px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <p style={{ margin: '8px 0', color: '#92400e', fontSize: '13px' }}>
                                    주문번호: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{canceledInfo?.orderCode ?? selectedOrder}</span>
                                </p>
                                <p style={{ margin: '8px 0', color: '#92400e', fontSize: '13px' }}>
                                    담당자: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{canceledInfo?.custEmp ?? (formData.CUST_EMP || '-')}</span>
                                </p>
                                <p style={{ margin: '8px 0', color: '#92400e', fontSize: '13px' }}>
                                    주문 금액: <span style={{ fontWeight: '800', color: '#b91c1c', marginLeft: '8px', fontSize: '15px' }}>{Number(canceledInfo?.amount ?? itemList.reduce((sum, m) => sum + (Number(m.ORDER_QTY || 0) * Number(m.ITEM_COST || 0)), 0)).toLocaleString()}원</span>
                                </p>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}>
                            <button type="button" className="erp-button erp-button-primary" onClick={() => setShowCanceledPopup(false)} style={{ width: '120px', backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 삭제 확인 팝업 */}
            {showDeletePopup === true && (
                <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '18px' }}>주문 삭제</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '25px 20px' }}>
                            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '15px' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>정말 삭제하시겠습니까?</p>
                                {selectedOrder && orderList.find(o => o.ORDER_CD === selectedOrder) && (
                                    <div style={{ textAlign: 'left', background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca', marginBottom: '12px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '8px', fontSize: '13px' }}>
                                            <span style={{ fontWeight: '600', color: '#991b1b' }}>주문번호</span>
                                            <span style={{ color: '#374151' }}>{orderList.find(o => o.ORDER_CD === selectedOrder).ORDER_CD}</span>
                                            <span style={{ fontWeight: '600', color: '#991b1b' }}>주문일자</span>
                                            <span style={{ color: '#374151' }}>{orderList.find(o => o.ORDER_CD === selectedOrder).ORDER_DT}</span>
                                            <span style={{ fontWeight: '600', color: '#991b1b' }}>고객사</span>
                                            <span style={{ color: '#374151' }}>{orderList.find(o => o.ORDER_CD === selectedOrder).CUST_CD}</span>
                                            <span style={{ fontWeight: '600', color: '#991b1b' }}>담당자</span>
                                            <span style={{ color: '#374151' }}>{orderList.find(o => o.ORDER_CD === selectedOrder).CUST_EMP}</span>
                                        </div>
                                    </div>
                                )}
                                <div style={{ textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                                    <p style={{ margin: '0', color: '#991b1b', fontSize: '12px', fontWeight: '500' }}>
                                        삭제된 데이터는 복구할 수 없습니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', gap: '8px' }}>
                            <button
                                className="erp-button erp-button-default"
                                onClick={() => setShowDeletePopup(false)}
                                style={{ width: '100px' }}
                            >
                                취소
                            </button>
                            <button
                                className="erp-button erp-button-primary"
                                onClick={handleConfirmDelete}
                                style={{ width: '100px', background: '#ef4444', border: '1px solid #ef4444' }}
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주문 삭제 완료 팝업 */}
            {showDeletePopup === 'completed' && (
                <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
                            <h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '20px' }}>✓ 주문 삭제 완료</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '40px 30px' }}>
                            <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>주문이 성공적으로 삭제되었습니다.</p>
                                <div style={{ textAlign: 'center', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>
                                        목록으로 돌아갑니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center' }}>
                            <button
                                className="erp-button erp-button-primary"
                                onClick={() => setShowDeletePopup(false)}
                                style={{ width: '120px' }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 고객사(판매처) 선택 팝업 */}
            {showCustPopup && (
                <div className="popup-overlay" onClick={() => { setShowCustPopup(false); setSelectedCustInPopup(null); }}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="popup-header">
                            <h3 className="popup-title">고객사 선택 (판매처)</h3>
                            <button
                                className="popup-close-btn"
                                onClick={() => { setShowCustPopup(false); setSelectedCustInPopup(null); }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="popup-body">
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
                                고객사를 선택하면 주문번호, 고객사 코드, 담당자가 자동으로 입력됩니다.
                            </p>
                            <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="excel-table">
                                    <thead>
                                    <tr>
                                        <th className="excel-th" style={{ width: '40px' }}>선택</th>
                                        <th className="excel-th">No</th>
                                        <th className="excel-th">고객사코드</th>
                                        <th className="excel-th">고객사명</th>
                                        <th className="excel-th">대표자</th>
                                        <th className="excel-th">사업자번호</th>
                                        <th className="excel-th">담당자</th>
                                        <th className="excel-th">전화번호</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {custMasterList && custMasterList.length > 0 ? (
                                        custMasterList.map((cust, index) => (
                                            <tr
                                                key={cust.CUST_CD || index}
                                                className={`excel-tr ${selectedCustInPopup === cust.CUST_CD ? 'selected' : ''}`}
                                                onClick={() => handleSelectCust(cust)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="excel-td" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="radio"
                                                        name="custSelection"
                                                        checked={selectedCustInPopup === cust.CUST_CD}
                                                        onChange={() => handleSelectCust(cust)}
                                                    />
                                                </td>
                                                <td className="excel-td excel-td-number">{index + 1}</td>
                                                <td className="excel-td">{cust.CUST_CD}</td>
                                                <td className="excel-td">{cust.CUST_NM}</td>
                                                <td className="excel-td">{cust.PRESIDENT_NM}</td>
                                                <td className="excel-td">{cust.BIZ_NO}</td>
                                                <td className="excel-td">{cust.EMP_NM}</td>
                                                <td className="excel-td">{cust.BIZ_TEL}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="excel-td" style={{ textAlign: 'center', color: '#999' }}>
                                                등록된 고객사가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="excel-btn excel-btn-new"
                                onClick={handleConfirmCustSelection}
                                disabled={!selectedCustInPopup}
                            >
                                선택
                            </button>
                            <button
                                className="excel-btn excel-btn-modify"
                                onClick={() => { setShowCustPopup(false); setSelectedCustInPopup(null); }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default 주문관리