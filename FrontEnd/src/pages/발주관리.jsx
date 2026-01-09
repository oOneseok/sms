import React, { useState, useEffect, useRef } from 'react'
import '../css/pages/발주관리.css'
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

function 발주관리() {
    const location = useLocation();
  // 발주 목록 (TB_PURCHASE)
  const [orderList, setOrderList] = useState([])

  // ✅ 발주 목록 조회 + 각 발주의 상세 정보(상태 포함) 조회
  const reloadOrders = async () => {
    try {
      const data = await apiFetch("/api/purchase?sort=DESC");
      const purchases = Array.isArray(data) ? data : [];
      
      // 각 발주의 상세 정보를 병렬로 조회
      const mappedWithDetails = await Promise.all(
        purchases.map(async (p) => {
          try {
            const details = await apiFetch(`/api/purchase/${encodeURIComponent(p.purchaseCd)}/details`);
            return {
              PURCHASE_CD: p.purchaseCd,
              PURCHASE_DT: p.purchaseDt,
              CUST_CD: p.custCd,
              CUST_EMP: p.custEmp,
              REMARK: p.remark,
              PURCHASE_DET: (Array.isArray(details) ? details : []).map(d => ({
                SEQ_NO: d.id?.seqNo || d.seqNo,
                ITEM_CD: d.itemCd,
                ITEM_NM: d.itemNm || "", 
                ITEM_SPEC: d.itemSpec || "", // 규격도 받아온다면 연결
                ITEM_UNIT: d.itemUnit || "EA", // 단위도 받아온다면 연결
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
                PURCHASE_QTY: d.purchaseQty,
                ITEM_COST: d.itemCost || 0,
                STATUS: d.status || "p1",
                REMARK: d.remark || ""
              })),
            };
          } catch (e) {
            console.error(e); // 에러 로그 추가
            return {
              PURCHASE_CD: p.purchaseCd,
              PURCHASE_DT: p.purchaseDt,
              CUST_CD: p.custCd,
              CUST_EMP: p.custEmp,
              REMARK: p.remark,
              PURCHASE_DET: [],
            };
          }
        })
      );
      
      setOrderList(mappedWithDetails);
    } catch(err) {
      console.error("목록 조회 실패:", err); // 전체 목록 조회 실패 시 로그
    }
  };

  useEffect(() => {
    reloadOrders().catch(console.error);
  }, []);

  useEffect(() => {
    // focusId가 있고, 목록이 로딩된 상태라면 실행
    if (location.state?.focusId && orderList.length > 0) {
      const targetId = location.state.focusId;

      // 목록에서 해당 발주 찾기
      const targetRow = orderList.find(row => row.PURCHASE_CD === targetId);

      if (targetRow) {
        // 1. 상세 정보 열기 (선택된 상태로 만들면 기존 useEffect가 상세를 조회함)
        setSelectedOrder(targetId);
        
        // 3. 해당 행으로 스크롤 이동
        setPendingScrollRowId(targetId);

        // 4. 처리가 끝났으면 state를 비워줌 (새로고침 시 재실행 방지)
        window.history.replaceState({}, document.title);
      }
    }
  }, [orderList, location.state]);

  const refreshPurchaseList = reloadOrders; // 동일한 함수 사용

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState([])
  const [editingMaterialSeq, setEditingMaterialSeq] = useState(null)
  const [selectedMasterMaterials, setSelectedMasterMaterials] = useState([])
  const [showMaterialMasterPopup, setShowMaterialMasterPopup] = useState(false)
  const [showCompletionPopup, setShowCompletionPopup] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showConfirmedPopup, setShowConfirmedPopup] = useState(false)
  const [confirmedInfo, setConfirmedInfo] = useState(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showCanceledPopup, setShowCanceledPopup] = useState(false)
  const [canceledInfo, setCanceledInfo] = useState(null)
  // 발주 등록 완료 팝업에 사용할 정보(발주번호/담당자/금액)
  const [completionInfo, setCompletionInfo] = useState(null)
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
  const [searchType, setSearchType] = useState('custCode')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('')

  // 상태 필터
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('')

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

  // 폼 데이터 (TB_PURCHASE 구조)
  const [formData, setFormData] = useState({
    PURCHASE_CD: '',
    PURCHASE_DT: '',
    CUST_CD: '',
    CUST_EMP: '',
    REMARK: ''
  })

  const createDefaultMaterialFormData = () => ({
    ITEM_CD: '',
    ITEM_NM: '',
    ITEM_SPEC: '',
    ITEM_UNIT: '',
    PURCHASE_QTY: '1',
    ITEM_COST: '',
    STATUS: 'p1'
  })

  // 자재 입력 폼 데이터 (TB_PURCHASE_DET 구조)
  const [materialFormData, setMaterialFormData] = useState(createDefaultMaterialFormData())

  // 자재 목록 (TB_PURCHASE_DET)
  const [materialList, setMaterialList] = useState([])

  // 자재 마스터 데이터 (TB_ITEMMST에서 ITEM_FLAG = '01'인 자재만)
  const [materialMasterList, setMaterialMasterList] = useState([])

  // 거래처(매입처) 목록 (TB_CUSTMST에서 BIZ_FLAG = '01'인 구매처만)
  const [custMasterList, setCustMasterList] = useState([])
  const [showCustPopup, setShowCustPopup] = useState(false)
  const [selectedCustInPopup, setSelectedCustInPopup] = useState(null)

  useEffect(() => {
    (async () => {
      const data = await apiFetch("/api/item/materials") // ✅ 01만 내려오도록 백엔드 구현되어있다고 가정
      const mapped = (Array.isArray(data) ? data : []).map(it => ({
        ITEM_CD: it.itemCd,
        ITEM_NM: it.itemNm,
        ITEM_SPEC: it.itemSpec,
        ITEM_UNIT: it.itemUnit,
        ITEM_COST: it.itemCost,
      }))
      setMaterialMasterList(mapped)
    })().catch(console.error)
  }, [])

  // 거래처(구매처) 목록 조회
  useEffect(() => {
    (async () => {
      const data = await apiFetch("/api/cust?bizFlag=01") // 01=구매처(매입처)
      const mapped = (Array.isArray(data) ? data : []).map(c => ({
        CUST_CD: c.custCd,
        CUST_NM: c.custNm,
        PRESIDENT_NM: c.presidentNm,
        BIZ_NO: c.bizNo,
        EMP_NM: c.empNm || '',
        BIZ_TEL: c.bizTel,
      }))
      setCustMasterList(mapped)
    })().catch(console.error)
  }, [])

  // 거래처 선택 처리
  const handleSelectCust = (cust) => {
    setSelectedCustInPopup(cust.CUST_CD)
  }

  // 거래처 선택 확정 (발주번호만 설정)
  const handleConfirmCustSelection = () => {
    if (!selectedCustInPopup) {
      alert('거래처를 선택해주세요.')
      return
    }
    const cust = custMasterList.find(c => c.CUST_CD === selectedCustInPopup)
    if (cust) {
      setFormData(prev => ({
        ...prev,
        CUST_CD: cust.CUST_CD,    // ✅ 매입처 코드 설정
        CUST_EMP: cust.EMP_NM || '' // ✅ 담당자 자동 설정
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

  // 발주 선택 시 상세 정보 조회
  useEffect(() => {
    if (selectedOrder) {
      const order = orderList.find(o => o.PURCHASE_CD === selectedOrder)
      if (order) {
        setFormData({
          PURCHASE_CD: order.PURCHASE_CD || '',
          PURCHASE_DT: order.PURCHASE_DT || '',
          CUST_CD: order.CUST_CD || '',
          CUST_EMP: order.CUST_EMP || '',
          REMARK: order.REMARK || ''
        })
        setSelectedMaterials([])
        setEditingMaterialSeq(null)

        // ✅ 상세 정보 API 호출
        ;(async () => {
          try {
            const details = await apiFetch(`/api/purchase/${encodeURIComponent(order.PURCHASE_CD)}/details`)
            const mappedDetails = (Array.isArray(details) ? details : []).map(d => {
              // 품목 마스터에서 품목명, 규격, 단위, 단가 조회
              const itemInfo = materialMasterList.find(m => m.ITEM_CD === d.itemCd) || {}
              return {
                SEQ_NO: d.id?.seqNo || d.seqNo,
                ITEM_CD: d.itemCd,
                ITEM_NM: itemInfo.ITEM_NM || '',
                ITEM_SPEC: itemInfo.ITEM_SPEC || '',
                ITEM_UNIT: itemInfo.ITEM_UNIT || 'EA',
                PURCHASE_QTY: d.purchaseQty,
                ITEM_COST: itemInfo.ITEM_COST || 0,
                STATUS: d.status || 'p1',
                REMARK: d.remark || ''
              }
            })
            setMaterialList(mappedDetails)

            if (mappedDetails.length > 0) {
              const firstMaterial = mappedDetails[0]
              setMaterialFormData({
                ITEM_CD: firstMaterial.ITEM_CD || '',
                ITEM_NM: firstMaterial.ITEM_NM || '',
                ITEM_SPEC: firstMaterial.ITEM_SPEC || '',
                ITEM_UNIT: firstMaterial.ITEM_UNIT || 'EA',
                PURCHASE_QTY: String(firstMaterial.PURCHASE_QTY || ''),
                ITEM_COST: firstMaterial.ITEM_COST || '',
                STATUS: firstMaterial.STATUS || 'p1'
              })
            } else {
              setMaterialFormData(createDefaultMaterialFormData())
            }
          } catch (e) {
            console.error('상세 조회 실패:', e)
            setMaterialList([])
            setMaterialFormData(createDefaultMaterialFormData())
          }
        })()
      }
    } else {
      setFormData({
        PURCHASE_CD:'',
        PURCHASE_DT: '',
        CUST_CD: '',
        CUST_EMP: '',
        REMARK: ''
      })
      setMaterialList([])
      setSelectedMaterials([])
      setEditingMaterialSeq(null)
      setMaterialFormData(createDefaultMaterialFormData())
    }
  }, [selectedOrder, orderList, materialMasterList])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const nextData = { ...prev, [name]: value }
      const hasAnyValue = [nextData.PURCHASE_DT, nextData.CUST_CD, nextData.CUST_EMP, nextData.REMARK]
        .some(val => val && String(val).trim() !== '')
      setIsInputting(hasAnyValue)
      return nextData
    })
  }

  const handleMaterialInputChange = (e) => {
    const { name, value } = e.target
    setMaterialFormData(prev => {
      const newData = { ...prev, [name]: value }

      if (name === 'ITEM_CD' && value) {
        const material = materialMasterList.find(m => m.ITEM_CD === value)
        if (material) {
          const updatedData = {
            ...newData,
            ITEM_NM: material.ITEM_NM || '',
            ITEM_SPEC: material.ITEM_SPEC || '',
            ITEM_UNIT: material.ITEM_UNIT || 'EA',
            ITEM_COST: material.ITEM_COST || ''
          }
          const hasAnyValue = [updatedData.PURCHASE_QTY, updatedData.ITEM_COST]
            .some(val => val && String(val).trim() !== '')
          setIsInputting(hasAnyValue)
          return updatedData
        }
      }

      const hasAnyValue = [newData.PURCHASE_QTY, newData.ITEM_COST]
        .some(val => val && String(val).trim() !== '')
      setIsInputting(hasAnyValue)
      return newData
    })
  }

  const handleNew = () => {
    setSelectedOrder(null)
    setIsEditMode(true)
    setIsInputting(false)
    setIsCompleted(false)
    setFormData({
      PURCHASE_CD: '',
      PURCHASE_DT: '',
      CUST_CD: '',
      CUST_EMP: '',
      REMARK: ''
    })
    setMaterialList([])
    setSelectedMaterials([])
    setEditingMaterialSeq(null)
    setMaterialFormData(createDefaultMaterialFormData())
  }

  const handleModify = () => {
    if (selectedOrder) {
      setIsEditMode(true)
    } else {
      alert('수정할 발주를 선택해주세요.')
    }
  }

  const handleDelete = () => {
    if (!selectedOrder) {
      alert('삭제할 발주를 선택해주세요.')
      return
    }
    setShowDeletePopup(true)
  }

  // ✅ DB 반영: 삭제
  const handleConfirmDelete = async () => {
    try {
      await apiFetch(`/api/purchase/${encodeURIComponent(selectedOrder)}`, { method: "DELETE" })
      await refreshPurchaseList()
      setSelectedOrder(null)
      setShowDeletePopup('completed')
    } catch (e) {
      console.error(e)
      alert(`삭제 실패: ${e.message}`)
    }
  }

  // ✅ DB 반영: 저장/수정
  const handleSave = async () => {
  if (!formData.PURCHASE_DT) {
      alert('발주일자를 입력하세요.');
      return;
    }

    // ... (이하 기존 로직 동일)

    // ✅ 현재 편집 중인 자재가 있으면 먼저 materialList에 반영
    let finalMaterialList = [...materialList];
    if (editingMaterialSeq !== null && materialFormData.ITEM_CD) {
      finalMaterialList = finalMaterialList.map(item =>
        item.SEQ_NO === editingMaterialSeq
          ? {
              ...item,
              ITEM_CD: materialFormData.ITEM_CD,
              ITEM_NM: materialFormData.ITEM_NM,
              ITEM_SPEC: materialFormData.ITEM_SPEC,
              ITEM_UNIT: materialFormData.ITEM_UNIT,
              PURCHASE_QTY: materialFormData.PURCHASE_QTY,
              ITEM_COST: materialFormData.ITEM_COST,
              STATUS: materialFormData.STATUS || 'p1'
            }
          : item
      );
    }

    if (finalMaterialList.length === 0) {
      alert('자재를 최소 1건 이상 추가하세요.');
      return;
    }

    // ✅ 합계 금액(자재 목록 기준) 계산
    const totalAmount = finalMaterialList.reduce(
      (sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)),
      0
    )

    const payload = {
      purchaseCd: formData.PURCHASE_CD ? formData.PURCHASE_CD.trim() : null, // ✅ 없으면 null (자동생성 트리거)
      purchaseDt: formData.PURCHASE_DT,
      custCd: formData.CUST_CD || '',
      custEmp: formData.CUST_EMP || '',
      remark: formData.REMARK || '',
      details: finalMaterialList.map(m => ({
        seqNo: m.SEQ_NO,
        itemCd: m.ITEM_CD,
        purchaseQty: Number(m.PURCHASE_QTY) || 1,
        itemCost: Number(m.ITEM_COST) || 0, // ✅ 단가 추가
        status: m.STATUS || 'p1'
      }))
    };

    console.log('저장 payload:', JSON.stringify(payload, null, 2));

    try {
      // ✅ 백엔드에서 실제 저장된 발주번호 응답(JSON: { purchaseCd: "P2026..." })
      const saved = await apiFetch("/api/purchase", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // ✅ 팝업에서 사용할 정보(발주번호/담당자/금액) 먼저 저장
      setCompletionInfo({
        purchaseCode: saved?.purchaseCd || formData.PURCHASE_CD || '(자동 생성)',
        custEmp: formData.CUST_EMP || '-',
        amount: totalAmount
      })

      await reloadOrders();

      // 저장 완료 후 선택 초기화
      setSelectedOrder(null);
      setIsEditMode(false);
      setMaterialList([]);
      setFormData({
        PURCHASE_CD: '',
        PURCHASE_DT: '',
        CUST_CD: '',
        CUST_EMP: '',
        REMARK: ''
      });
      setMaterialFormData(createDefaultMaterialFormData());

      setShowCompletionPopup(true);
    } catch (e) {
      console.error(e);
      alert(`저장 실패: ${e.message}`);
    }
  };


  const handleConfirmOrder = () => {
    if (!selectedOrder) return
    if (materialList.length === 0) {
      alert('자재를 입력해주세요.')
      return
    }
    setShowConfirmDialog(true)
  }

  // ✅ DB 반영: 확정 (상태 p2로 변경 후 저장)
  const handleConfirmOrderYes = async () => {
    if (!selectedOrder) return
    if (materialList.length === 0) {
      alert('자재를 입력해주세요.')
      return
    }

    const amount = materialList.reduce(
      (sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)),
      0
    )
    setConfirmedInfo({
      purchaseCode: selectedOrder,
      custEmp: formData.CUST_EMP || '-',
      amount
    })

    try {
      const payload = {
        purchaseCd: formData.PURCHASE_CD,
        purchaseDt: formData.PURCHASE_DT,
        custCd: formData.CUST_CD,
        custEmp: formData.CUST_EMP,
        remark: formData.REMARK,
        details: (materialList || []).map(m => ({
          seqNo: m.SEQ_NO,
          itemCd: m.ITEM_CD,
          purchaseQty: Number(m.PURCHASE_QTY || 0),
          itemCost: Number(m.ITEM_COST || 0),
          status: "p2",
          remark: m.REMARK ?? ""
        }))
      }

      await apiFetch("/api/purchase", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      await refreshPurchaseList()

      // 확정 후 선택 초기화
      setSelectedOrder(null)
      setIsEditMode(false)
      setMaterialList([])
      setFormData({
        PURCHASE_CD: '',
        PURCHASE_DT: '',
        CUST_CD: '',
        CUST_EMP: '',
        REMARK: ''
      })
      setMaterialFormData(createDefaultMaterialFormData())

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

  // ✅ DB 반영: 취소 (상태 p9로 변경 후 저장)
  const handleCancelOrderYes = async () => {
    if (!selectedOrder) return

    const amount = materialList.reduce(
      (sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)),
      0
    )
    setCanceledInfo({
      purchaseCode: selectedOrder,
      custEmp: formData.CUST_EMP || '-',
      amount
    })

    try {
      const payload = {
        purchaseCd: formData.PURCHASE_CD,
        purchaseDt: formData.PURCHASE_DT,
        custCd: formData.CUST_CD,
        custEmp: formData.CUST_EMP,
        remark: formData.REMARK,
        details: (materialList || []).map(m => ({
          seqNo: m.SEQ_NO,
          itemCd: m.ITEM_CD,
          purchaseQty: Number(m.PURCHASE_QTY || 0),
          itemCost: Number(m.ITEM_COST || 0),
          status: "p9",
          remark: m.REMARK ?? ""
        }))
      }

      await apiFetch("/api/purchase", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      await refreshPurchaseList()

      // 취소 후 선택 초기화
      setSelectedOrder(null)
      setIsEditMode(false)
      setMaterialList([])
      setFormData({
        PURCHASE_CD: '',
        PURCHASE_DT: '',
        CUST_CD: '',
        CUST_EMP: '',
        REMARK: ''
      })
      setMaterialFormData(createDefaultMaterialFormData())

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
      const order = orderList.find(o => o.PURCHASE_CD === selectedOrder)
      if (order) {
        setFormData({
          PURCHASE_CD: order.PURCHASE_CD || '',
          PURCHASE_DT: order.PURCHASE_DT || '',
          CUST_CD: order.CUST_CD || '',
          CUST_EMP: order.CUST_EMP || '',
          REMARK: order.REMARK || ''
        })
        setMaterialList(order.PURCHASE_DET || [])
        setSelectedMaterials([])
        setEditingMaterialSeq(null)

        if (order.PURCHASE_DET && order.PURCHASE_DET.length > 0) {
          const firstMaterial = order.PURCHASE_DET[0]
          setMaterialFormData({
            ITEM_CD: firstMaterial.ITEM_CD || '',
            ITEM_NM: firstMaterial.ITEM_NM || '',
            ITEM_SPEC: firstMaterial.ITEM_SPEC || '',
            ITEM_UNIT: firstMaterial.ITEM_UNIT || 'EA',
            PURCHASE_QTY: String(firstMaterial.PURCHASE_QTY ?? '1'),
            ITEM_COST: firstMaterial.ITEM_COST || '',
            STATUS: firstMaterial.STATUS || 'p1'
          })
        } else {
          setMaterialFormData(createDefaultMaterialFormData())
        }
      }
    } else {
      setFormData({
        PURCHASE_CD:'',
        PURCHASE_DT: '',
        CUST_CD: '',
        CUST_EMP: '',
        REMARK: ''
      })
      setMaterialList([])
      setSelectedMaterials([])
      setEditingMaterialSeq(null)
      setMaterialFormData(createDefaultMaterialFormData())
      setIsInputting(false)
    }
  }

  const handleRowClick = (id) => {
    setSelectedOrder(id)
    setIsEditMode(true)
    setSelectedMaterials([])
    setEditingMaterialSeq(null)
    setIsInputting(false)
    setIsCompleted(false)
  }

  const handleAddMaterial = () => {
    if (!materialFormData.ITEM_CD || !materialFormData.PURCHASE_QTY) {
      alert('자재코드와 수량은 필수 입력 항목입니다.')
      return
    }

    const nextSeqNo = materialList.length > 0
      ? Math.max(...materialList.map(item => item.SEQ_NO)) + 1
      : 1

    if (editingMaterialSeq !== null) {
      setMaterialList(prev => prev.map(item =>
        item.SEQ_NO === editingMaterialSeq
          ? {
            ...item,
            PURCHASE_CD: formData.PURCHASE_CD || '',
            ITEM_CD: materialFormData.ITEM_CD,
            ITEM_NM: materialFormData.ITEM_NM,
            ITEM_SPEC: materialFormData.ITEM_SPEC,
            ITEM_UNIT: materialFormData.ITEM_UNIT,
            PURCHASE_QTY: materialFormData.PURCHASE_QTY,
            ITEM_COST: materialFormData.ITEM_COST,
            STATUS: materialFormData.STATUS || 'p1'
          }
          : item
      ))
    } else {
      const newMaterial = {
        SEQ_NO: nextSeqNo,
        PURCHASE_CD: formData.PURCHASE_CD || '',
        ITEM_CD: materialFormData.ITEM_CD,
        ITEM_NM: materialFormData.ITEM_NM,
        ITEM_SPEC: materialFormData.ITEM_SPEC,
        ITEM_UNIT: materialFormData.ITEM_UNIT,
        PURCHASE_QTY: materialFormData.PURCHASE_QTY,
        ITEM_COST: materialFormData.ITEM_COST,
        STATUS: materialFormData.STATUS || 'p1',
        REMARK: ''
      }
      setMaterialList(prev => [...prev, newMaterial])
    }

    setSelectedMaterials([])
    setEditingMaterialSeq(null)
    setMaterialFormData(createDefaultMaterialFormData())
  }

  const handleDeleteMaterial = () => {
    if (selectedMaterials.length === 0) {
      alert('삭제할 자재를 선택해주세요.')
      return
    }
    if (window.confirm('선택한 자재를 삭제하시겠습니까?')) {
      setMaterialList(prev => prev.filter(item => !selectedMaterials.includes(item.SEQ_NO)))
      setSelectedMaterials([])
      setEditingMaterialSeq(null)
      setMaterialFormData(createDefaultMaterialFormData())
    }
  }

  const handleMaterialCheckboxChange = (seqNo) => {
    setSelectedMaterials(prev => {
      const isSelected = prev.includes(seqNo)
      const nextSelected = isSelected ? prev.filter(item => item !== seqNo) : [...prev, seqNo]

      const targetSeq = isSelected ? (nextSelected[0] ?? null) : seqNo
      setEditingMaterialSeq(targetSeq ?? null)

      if (targetSeq !== null) {
        const material = materialList.find(item => item.SEQ_NO === targetSeq)
        if (material) {
          setMaterialFormData({
            ITEM_CD: material.ITEM_CD || '',
            ITEM_NM: material.ITEM_NM || '',
            ITEM_SPEC: material.ITEM_SPEC || '',
            ITEM_UNIT: material.ITEM_UNIT || 'EA',
            PURCHASE_QTY: String(material.PURCHASE_QTY ?? '1'),
            ITEM_COST: material.ITEM_COST || '',
            STATUS: material.STATUS || 'p1'
          })
        }
      } else {
        setMaterialFormData(createDefaultMaterialFormData())
      }

      return nextSelected
    })
  }

  const handleMaterialRowClick = (material) => {
    if (selectedOrder !== null && !isEditMode) return
    const seqNo = material.SEQ_NO
    // Ctrl/Cmd 키 없이 클릭하면 단일 선택, 체크박스로 다중 선택 가능
    setSelectedMaterials(prev => {
      // 이미 선택되어 있으면 유지, 아니면 새로 선택
      if (prev.includes(seqNo)) {
        return prev
      }
      return [seqNo]
    })
    setEditingMaterialSeq(seqNo)
    setMaterialFormData({
      ITEM_CD: material.ITEM_CD || '',
      ITEM_NM: material.ITEM_NM || '',
      ITEM_SPEC: material.ITEM_SPEC || '',
      ITEM_UNIT: material.ITEM_UNIT || 'EA',
      PURCHASE_QTY: String(material.PURCHASE_QTY ?? '1'),
      ITEM_COST: material.ITEM_COST || '',
      STATUS: material.STATUS || 'p1'
    })
  }

  const handleMasterMaterialClick = (material) => {
    if (selectedOrder !== null && !isEditMode) return
    setSelectedMaterials([])
    setEditingMaterialSeq(null)
    setMaterialFormData({
      ITEM_CD: material.ITEM_CD || '',
      ITEM_NM: material.ITEM_NM || '',
      ITEM_SPEC: material.ITEM_SPEC || '',
      ITEM_UNIT: material.ITEM_UNIT || 'EA',
      PURCHASE_QTY: '1',
      ITEM_COST: material.ITEM_COST || '',
      STATUS: 'p1'
    })
  }

  const handleMasterMaterialCheckboxChange = (itemCd) => {
    if (selectedOrder !== null && !isEditMode) return

    setSelectedMasterMaterials(prev => {
      const isSame = prev.includes(itemCd)
      const next = isSame ? [] : [itemCd]

      if (!isSame) {
        const material = materialMasterList.find(m => m.ITEM_CD === itemCd)
        if (material) {
          setSelectedMaterials([])
          setEditingMaterialSeq(null)
          setMaterialFormData({
            ITEM_CD: material.ITEM_CD || '',
            ITEM_NM: material.ITEM_NM || '',
            ITEM_SPEC: material.ITEM_SPEC || '',
            ITEM_UNIT: material.ITEM_UNIT || 'EA',
            PURCHASE_QTY: '',
            ITEM_COST: material.ITEM_COST || '',
            STATUS: 'p1'
          })
        }
      }
      return next
    })
  }

  const handleSelectAllMaster = (e) => {
    if (e.target.checked && materialMasterList.length > 0) {
      setSelectedMasterMaterials([materialMasterList[0].ITEM_CD])
      handleMasterMaterialClick(materialMasterList[0])
    } else {
      setSelectedMasterMaterials([])
    }
  }

  const handleAddMasterMaterials = () => {
    if (selectedOrder !== null && !isEditMode) {
      alert('수정 모드에서만 자재를 추가할 수 있습니다.')
      return
    }

    if (selectedMasterMaterials.length === 0) {
      alert('추가할 자재를 선택해주세요.')
      return
    }

    const material = materialMasterList.find(m => m.ITEM_CD === selectedMasterMaterials[0])
    if (material) {
      setMaterialFormData({
        ITEM_CD: material.ITEM_CD || '',
        ITEM_NM: material.ITEM_NM || '',
        ITEM_SPEC: material.ITEM_SPEC || '',
        ITEM_UNIT: material.ITEM_UNIT || 'EA',
        PURCHASE_QTY: '1',
        ITEM_COST: material.ITEM_COST || '',
        STATUS: 'p1'
      })
    }
    setSelectedMaterials([])
    setEditingMaterialSeq(null)
    setSelectedMasterMaterials([])
    setShowMaterialMasterPopup(false)
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const seqList = materialList.map(item => item.SEQ_NO)
      setSelectedMaterials(seqList)
      const firstMaterial = materialList[0]
      if (firstMaterial) {
        setEditingMaterialSeq(firstMaterial.SEQ_NO)
        setMaterialFormData({
          ITEM_CD: firstMaterial.ITEM_CD || '',
          ITEM_NM: firstMaterial.ITEM_NM || '',
          ITEM_SPEC: firstMaterial.ITEM_SPEC || '',
          ITEM_UNIT: firstMaterial.ITEM_UNIT || 'EA',
          PURCHASE_QTY: String(firstMaterial.PURCHASE_QTY ?? '1'),
          ITEM_COST: firstMaterial.ITEM_COST || '',
          STATUS: firstMaterial.STATUS || 'p1'
        })
      }
    } else {
      setSelectedMaterials([])
      setEditingMaterialSeq(null)
      setMaterialFormData(createDefaultMaterialFormData())
    }
  }

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm.trim())
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    setAppliedStatusFilter(statusFilter)
    // 검색 버튼 누르면 검색 패널 닫기
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSearchTerm('')
    setAppliedSearchTerm('')
    setAppliedStartDate('')
    setAppliedEndDate('')
    setStatusFilter('')
    setAppliedStatusFilter('')
  }

  // 발주 상태 계산 함수 (부분입고 포함)
  const getOrderStatus = (details) => {
    if (!details || details.length === 0) return 'p1'

    const statuses = details.map(d => d.STATUS || 'p1')

    // 모두 취소
    if (statuses.every(s => s === 'p9')) return 'p9'
    // 모두 입고완료
    if (statuses.every(s => s === 'p3')) return 'p3'
    // 일부 입고완료 또는 부분입고 (p3가 하나라도 있고, p1 또는 p2가 있으면)
    const hasComplete = statuses.some(s => s === 'p3')
    const hasPending = statuses.some(s => s === 'p1' || s === 'p2')
    if (hasComplete && hasPending) return 'p4' // 부분입고
    // 부분입고 상태가 있으면
    if (statuses.some(s => s === 'p4')) return 'p4'
    // 모두 확정
    if (statuses.every(s => s === 'p2')) return 'p2'
    // 확정이 하나라도 있으면 (혼합)
    if (statuses.some(s => s === 'p2')) return 'p2'

    return 'p1'
  }

  const filteredList = orderList.filter(order => {
    // 날짜 범위 필터
    if (appliedStartDate || appliedEndDate) {
      const orderDate = order.PURCHASE_DT
      if (orderDate) {
        if (appliedStartDate && orderDate < appliedStartDate) return false
        if (appliedEndDate && orderDate > appliedEndDate) return false
      }
    }

    // 상태 필터
    if (appliedStatusFilter) {
      const orderStatus = getOrderStatus(order.PURCHASE_DET)
      if (orderStatus !== appliedStatusFilter) return false
    }

    // 키워드 검색
    if (!appliedSearchTerm) return true

    const term = appliedSearchTerm.toLowerCase()
    switch (searchType) {
      case 'purchaseCode':
        return order.PURCHASE_CD?.toLowerCase().includes(term)
      case 'purchaseDate':
        return order.PURCHASE_DT?.includes(appliedSearchTerm)
      case 'custCode':
        // 매입처코드 또는 매입처명으로 검색
        const cust = custMasterList.find(c => c.CUST_CD === order.CUST_CD)
        const custNm = cust?.CUST_NM || ''
        return order.CUST_CD?.toLowerCase().includes(term) || custNm.toLowerCase().includes(term)
      case 'itemName':
        // 자재코드 또는 자재명으로 검색
        return order.PURCHASE_DET?.some(det =>
          det.ITEM_CD?.toLowerCase().includes(term) ||
          det.ITEM_NM?.toLowerCase().includes(term)
        )
      case 'custEmp':
        return order.CUST_EMP?.toLowerCase().includes(term)
      default:
        return true
    }
  })

  const isEditingMaterial = editingMaterialSeq !== null

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

    if (sortColumn === 'ITEM_CD' || sortColumn === 'ITEM_NM') {
      aValue = a.PURCHASE_DET?.[0]?.[sortColumn] || ''
      bValue = b.PURCHASE_DET?.[0]?.[sortColumn] || ''
    } else if (sortColumn === 'totalAmount') {
      aValue = (a.PURCHASE_DET || []).reduce((sum, det) => {
        const itemInfo = materialMasterList.find(m => m.ITEM_CD === det.ITEM_CD)
        const itemCost = det.ITEM_COST || itemInfo?.ITEM_COST || 0
        return sum + Number(det.PURCHASE_QTY || 0) * Number(itemCost)
      }, 0)
      bValue = (b.PURCHASE_DET || []).reduce((sum, det) => {
        const itemInfo = materialMasterList.find(m => m.ITEM_CD === det.ITEM_CD)
        const itemCost = det.ITEM_COST || itemInfo?.ITEM_COST || 0
        return sum + Number(det.PURCHASE_QTY || 0) * Number(itemCost)
      }, 0)
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    } else {
      const aStr = String(aValue || '')
      const bStr = String(bValue || '')
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    }
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = sortedList.slice(indexOfFirstItem, indexOfLastItem)

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

    const index = sortedList.findIndex(row => row.PURCHASE_CD === pendingScrollRowId)
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

  const isConfirmed = selectedOrder && materialList.length > 0 && materialList.some(m => m.STATUS === 'p2')
  const isCanceled = selectedOrder && materialList.length > 0 && materialList.some(m => m.STATUS === 'p9')
  const isReadOnly = isConfirmed || isCanceled

  return (
    <div className="customer-management-container">
      <div className="customer-management-wrapper">
        <div className="customer-header">
          <div className="header-left-section">
            <h2 className="page-title">발주관리</h2>
            <div className="statistics-info statistics-customer">
              <span className="stat-label">총 발주:</span>
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
            <IconButton type="modify" label="발주 등록" onClick={handleNew} />
            <IconButton type="delete" label="삭제" onClick={handleDelete} />
          </div>
        </div>

        {/* 메인 콘텐츠 레이아웃 */}
        <div className="order-content-layout">
          {/* 왼쪽: 발주 목록 - order-list-panel → customer-list-panel */}
          <div className="customer-list-panel">
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
                    <div className="filter-field">
                      <label className="filter-label">상태</label>
                      <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">전체</option>
                        <option value="p1">발주등록</option>
                        <option value="p2">발주확정</option>
                        <option value="p4">부분입고</option>
                        <option value="p3">입고완료</option>
                        <option value="p9">취소됨</option>
                      </select>
                    </div>
                    <div className="filter-field filter-field-keyword">
                      <label className="filter-label">키워드 검색</label>
                      <SearchBar
                        searchOptions={[
                          { value: 'purchaseCode', label: '발주번호', type: 'text' },
                          { value: 'custCode', label: '매입처', type: 'text' },
                          { value: 'itemName', label: '자재명', type: 'text' },
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
                    <th className="excel-th sortable" onClick={() => handleSort('PURCHASE_CD')}>
                      발주번호
                      {sortColumn === 'PURCHASE_CD' && (
                        <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th className="excel-th sortable" onClick={() => handleSort('CUST_CD')}>
                      매입처
                      {sortColumn === 'CUST_CD' && (
                        <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th className="excel-th sortable" onClick={() => handleSort('ITEM_CD')}>
                      자재코드
                      {sortColumn === 'ITEM_CD' && (
                        <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th className="excel-th sortable" onClick={() => handleSort('ITEM_NM')}>
                      자재명
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
                    <th className="excel-th sortable" onClick={() => handleSort('PURCHASE_DT')}>
                      발주일자
                      {sortColumn === 'PURCHASE_DT' && (
                        <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th className="excel-th">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((order, index) => {
                    const details = order.PURCHASE_DET || []
                    const totalAmount = details.reduce((sum, det) => {
                      // ITEM_COST가 없으면 materialMasterList에서 조회
                      const itemInfo = materialMasterList.find(m => m.ITEM_CD === det.ITEM_CD)
                      const itemCost = det.ITEM_COST || itemInfo?.ITEM_COST || 0
                      return sum + Number(det.PURCHASE_QTY || 0) * Number(itemCost)
                    }, 0)
                    const previewItems = details.slice(0, 1)
                    const overflowCount = details.length > 1 ? details.length - 1 : 0
                    const itemCdText = previewItems.map(det => det.ITEM_CD).filter(Boolean).join(', ')
                    const itemNmText = previewItems.map(det => det.ITEM_NM).filter(Boolean).join(', ')
                    const overflowLabel = overflowCount > 0 ? ` 외 ${overflowCount}건` : ''

                    const statusMap = {
                        'p1': '발주등록',
                        'p2': '발주확정',
                        'p3': '입고완료',
                        'p4': '부분입고',
                        'p9': '취소됨'
                    }
                    const orderStatus = getOrderStatus(details)
                    const statusText = statusMap[orderStatus] || '발주등록'

                    let statusClass = 'status-color-pending'; // 기본(p1): 주황
                    if (orderStatus === 'p2') statusClass = 'status-color-confirmed'; // p2: 초록
                    else if (orderStatus === 'p3') statusClass = 'status-color-complete'; // p3: 파랑
                    else if (orderStatus === 'p4') statusClass = 'status-color-partial'; // p4: 보라 (부분입고)
                    else if (orderStatus === 'p9') statusClass = 'status-color-cancelled'; // p9: 빨강

                    return (
                      <tr
                        key={order.PURCHASE_CD || index}
                        id={`excel-row-${order.PURCHASE_CD}`}
                        className={`excel-tr ${selectedOrder === order.PURCHASE_CD ? 'selected' : ''}`}
                        onClick={() => handleRowClick(order.PURCHASE_CD)}
                      >
                        <td className="excel-td excel-td-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="excel-td">{order.PURCHASE_CD}</td>
                        <td className="excel-td">{order.CUST_CD}</td>
                        <td className="excel-td">{itemCdText ? `${itemCdText}${overflowLabel}` : ''}</td>
                        <td className="excel-td">{itemNmText ? `${itemNmText}${overflowLabel}` : ''}</td>
                        <td className="excel-td" style={{ textAlign: 'right' }}>
                          {totalAmount ? totalAmount.toLocaleString() : ''}
                        </td>
                        <td className="excel-td">{order.CUST_EMP}</td>
                        <td className="excel-td">{order.PURCHASE_DT}</td>
                        <td className="excel-td">
                          <span className={`status-color ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              itemsPerPage={itemsPerPage}
              totalItems={sortedList.length}
              onPageChange={setCurrentPage}
              currentPage={currentPage}
            />
          </div>

          {/* 오른쪽: 상세 정보 및 자재 목록 - order-detail-panel → customer-detail-panel */}
          <div className="customer-detail-panel">
            <div className="detail-header">
              <div className="detail-title-wrap">
                <div className="detail-title-row">
                  <h3 className="detail-title">발주 정보</h3>
                  <span className="detail-chip">INFO</span>
                </div>
                <div className="detail-subtext">
                  {selectedOrder
                    ? `${formData.PURCHASE_CD || '코드'} · ${formData.CUST_CD || '매입처'}`
                    : '신규 등록 대기'}
                </div>
              </div>
              <div className="detail-status">
                <span className="status-dot" aria-hidden="true" />
                <span className="status-text">
                  {isConfirmed ? '발주 확정' : isCanceled ? '발주 취소' : isCompleted ? '등록 완료' : selectedOrder ? '선택됨' : isInputting ? '등록중' : '대기'}
                </span>
              </div>
            </div>

            <div className="detail-content">
              <div className="detail-meta-bar">
                <span className={`badge ${isConfirmed ? 'badge-success' : isCanceled ? 'badge-error' : isCompleted ? 'badge-success' : selectedOrder ? 'badge-edit' : 'badge-new'}`} style={isCanceled ? { backgroundColor: '#ef4444', color: 'white' } : {}}>
                  {isConfirmed ? '발주 확정' : isCanceled ? '발주 취소' : isCompleted ? '등록 완료' : selectedOrder ? '수정 모드' : '신규 등록'}
                </span>
                <span className="meta-text">
                  {isConfirmed
                    ? '발주가 확정되어 수정할 수 없습니다.'
                    : isCanceled
                      ? '발주가 취소되었습니다.'
                      : isCompleted
                        ? '발주가 성공적으로 등록되었습니다.'
                        : selectedOrder
                          ? '선택된 발주 정보를 저장하면 업데이트됩니다.'
                          : '발주번호와 매입처를 입력한 뒤 자재를 추가하세요.'}
                </span>
              </div>

              <div className="detail-sections-grid">
                <div className="form-section">
                  <div className="section-title-row">
                    <div>
                      <div className="section-title">기본 정보</div>
                      <div className="section-subtext">발주 식별 및 매입처, 담당자</div>
                    </div>
                    <div className="pill pill-soft">{formData.PURCHASE_CD || 'NEW'}</div>
                  </div>
                  <div className="form-grid form-grid-2">
                    <div className="form-field-inline">
                      <label>발주번호</label>
                      <input
                        type="text"
                        name="PURCHASE_CD"
                        value={formData.PURCHASE_CD}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'default' }}
                        placeholder="저장 시 자동 생성"
                      />
                    </div>
                    <div className="form-field-inline">
                      <label>발주일자</label>
                      <input
                        type="date"
                        name="PURCHASE_DT"
                        value={formData.PURCHASE_DT}
                        onChange={handleInputChange}
                        disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                        readOnly={isCompleted || isReadOnly}
                      />
                    </div>
                    <div className="form-field-inline">
                      <label>매입처</label>
                      {/* ✅ 수정됨: 여기에 팝업 트리거(onClick) 추가 */}
                      <input
                        type="text"
                        name="CUST_CD"
                        value={formData.CUST_CD}
                        readOnly
                        className="material-lookup-input" // 돋보기 아이콘 스타일 등 적용
                        disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                        onClick={() => {
                          // 수정 모드거나 신규 등록일 때만 팝업 오픈
                          if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                            setShowCustPopup(true)
                          }
                        }}
                        style={{
                          cursor: (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) ? 'pointer' : 'default'
                        }}
                        placeholder="클릭하여 매입처 선택"
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
                        placeholder="담당자명"
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

                {/* 자재 입력 폼 */}
                {!isReadOnly && (
                  <div className="form-section">
                    <div className="section-title-row">
                      <div>
                        <div className="section-title">자재 입력</div>
                        <div className="section-subtext">품목 선택 후 수량과 단가를 입력하세요.</div>
                      </div>
                      <div className="section-actions">
                        <button
                          className="ghost-btn"
                          onClick={handleAddMaterial}
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                        >
                          {isEditingMaterial ? '수정' : '추가'}
                        </button>
                        <button
                          className="ghost-btn"
                          onClick={() => setShowMaterialMasterPopup(true)}
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                        >
                          자재 목록 보기
                        </button>
                      </div>
                    </div>
                    <div className="form-grid form-grid-2">
                      <div className="form-field-inline">
                        <label>자재코드</label>
                        <input
                          type="text"
                          name="ITEM_CD"
                          value={materialFormData.ITEM_CD}
                          readOnly
                          className="material-lookup-input"
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                          onClick={() => {
                            if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                              setShowMaterialMasterPopup(true)
                            }
                          }}
                          placeholder="자재목록에서 선택"
                        />
                      </div>
                      <div className="form-field-inline">
                        <label>자재명</label>
                        <input
                          type="text"
                          name="ITEM_NM"
                          value={materialFormData.ITEM_NM}
                          readOnly
                          className="material-lookup-input"
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                          onClick={() => {
                            if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                              setShowMaterialMasterPopup(true)
                            }
                          }}
                          placeholder="자재목록에서 선택"
                        />
                      </div>
                      <div className="form-field-inline">
                        <label>규격</label>
                        <input
                          type="text"
                          name="ITEM_SPEC"
                          value={materialFormData.ITEM_SPEC}
                          readOnly
                          className="material-lookup-input"
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                          onClick={() => {
                            if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                              setShowMaterialMasterPopup(true)
                            }
                          }}
                          placeholder="자재목록에서 선택"
                        />
                      </div>
                      <div className="form-field-inline">
                        <label>단위</label>
                        <input
                          type="text"
                          name="ITEM_UNIT"
                          value={materialFormData.ITEM_UNIT}
                          readOnly
                          className="material-lookup-input"
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                          onClick={() => {
                            if (!isCompleted && !isReadOnly && (selectedOrder === null || isEditMode)) {
                              setShowMaterialMasterPopup(true)
                            }
                          }}
                          placeholder="자재목록에서 선택"
                        />
                      </div>
                      <div className="form-field-inline">
                        <label>수량</label>
                        <input
                          type="number"
                          name="PURCHASE_QTY"
                          value={materialFormData.PURCHASE_QTY}
                          onChange={handleMaterialInputChange}
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
                          value={materialFormData.ITEM_COST}
                          readOnly
                          disabled
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 발주 자재 목록 */}
              {materialList.length > 0 && (
                <div className="material-list-section">
                  <div className="section-header-with-buttons">
                    <div className="section-header">발주 자재 목록 ({materialList.length}건)</div>
                    <div className="section-buttons">
                      {!isReadOnly && (
                        <button
                          className="ghost-btn delete-btn"
                          onClick={handleDeleteMaterial}
                          disabled={isCompleted || (selectedOrder !== null && !isEditMode)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  {/* 발주 자재 목록 전용 래퍼/테이블 클래스 추가 */}
                  <div className="table-wrapper purchase-item-table-wrapper">
                    <table className="excel-table purchase-item-table">
                      <thead>
                        <tr>
                          <th className="excel-th" style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={materialList.length > 0 && selectedMaterials.length === materialList.length}
                              onChange={handleSelectAll}
                              disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                            />
                          </th>
                          <th className="excel-th" style={{ width: '45px' }}>No</th>
                          <th className="excel-th" style={{ width: '80px' }}>코드</th>
                          <th className="excel-th">자재명</th>
                          <th className="excel-th" style={{ width: '50px' }}>단위</th>
                          <th className="excel-th" style={{ width: '70px' }}>수량</th>
                          <th className="excel-th" style={{ width: '80px' }}>단가</th>
                          <th className="excel-th" style={{ width: '90px' }}>금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialList.map((material) => (
                          <tr
                            key={material.SEQ_NO}
                            className="excel-tr"
                            onClick={() => handleMaterialRowClick(material)}
                          >
                            <td className="material-td">
                              <input
                                type="checkbox"
                                checked={selectedMaterials.includes(material.SEQ_NO)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => handleMaterialCheckboxChange(material.SEQ_NO)}
                                disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                              />
                            </td>
                            <td className="material-td excel-td-number">{material.SEQ_NO}</td>
                            <td className="material-td" style={{ fontSize: '10px' }}>{material.ITEM_CD}</td>
                            <td className="material-td">{material.ITEM_NM}</td>
                            <td className="material-td">{material.ITEM_UNIT}</td>
                            <td className="material-td">{material.PURCHASE_QTY}</td>
                            <td className="material-td" style={{ fontSize: '10px' }}>{Number(material.ITEM_COST || 0).toLocaleString()}</td>
                            <td className="material-td" style={{ fontSize: '10px' }}>
                              {(Number(material.PURCHASE_QTY || 0) * Number(material.ITEM_COST || 0)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="excel-tr total-row">
                          <td colSpan="5" className="material-td" style={{ textAlign: 'center', fontWeight: '600' }}>합계</td>
                          <td className="material-td" style={{ fontWeight: '600' }}>
                            {materialList.reduce((sum, m) => sum + Number(m.PURCHASE_QTY || 0), 0)}
                          </td>
                          <td className="material-td"></td>
                          <td className="material-td" style={{ fontWeight: '600' }}>
                            {materialList.reduce((sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}
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
                      {selectedOrder ? '수정 완료' : '발주 등록'}
                    </button>
                  )}

                  {selectedOrder && !isEditMode && !isReadOnly && (
                    <button
                      className="erp-button erp-button-primary"
                      onClick={() => setIsEditMode(true)}
                      style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}
                    >
                      발주 수정
                    </button>
                  )}

                  {selectedOrder && !isReadOnly && (
                    <>
                      <button
                        className="erp-button"
                        onClick={handleConfirmOrder}
                        style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: 'white', marginLeft: '8px' }}
                      >
                        발주 확정
                      </button>
                      <button
                        className="erp-button erp-button-cancel"
                        onClick={handleCancelOrder}
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white', marginLeft: '8px' }}
                      >
                        발주 취소
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
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>✓ 발주가 확정되었습니다. (수정 불가)</span>
                </div>
              )}

              {/* 취소 상태 표시 */}
              {isCanceled && (
                <div className="detail-footer" style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>✗ 발주가 취소되었습니다.</span>
                </div>
              )}

              {isCompleted && !isModify && !isConfirmed && !isCanceled && (
                <div className="detail-footer" style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>✓ 발주가 등록되었습니다.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 자재 목록 팝업 (품목관리 데이터) */}
      {showMaterialMasterPopup && (
        <div className="popup-overlay" onClick={() => setShowMaterialMasterPopup(false)}>
          {/* 자재 목록 팝업 전용 클래스 추가 */}
          <div className="popup-content material-master-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">자재 목록 (품목관리)</h3>
              <button className="popup-close-btn" onClick={() => setShowMaterialMasterPopup(false)}>×</button>
            </div>
            <div className="popup-body">
              <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {/* 팝업 테이블 전용 클래스 추가 */}
                <table className="excel-table material-master-table">
                  <thead>
                    <tr>
                      <th className="excel-th">
                        <input
                          type="checkbox"
                          checked={selectedMasterMaterials.length > 0}
                          onChange={handleSelectAllMaster}
                          disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                        />
                      </th>
                      <th className="excel-th">No</th>
                      <th className="excel-th">자재코드</th>
                      <th className="excel-th">자재명</th>
                      <th className="excel-th">규격</th>
                      <th className="excel-th">단위</th>
                      <th className="excel-th">단가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialMasterList && materialMasterList.length > 0 ? (
                      materialMasterList.map((material, index) => (
                        <tr
                          key={material.ITEM_CD || index}
                          className="excel-tr"
                          onClick={() => {
                            if (isCompleted || (selectedOrder !== null && !isEditMode)) return
                            setSelectedMasterMaterials([material.ITEM_CD])
                            handleMasterMaterialClick(material)
                          }}
                          style={{ cursor: (isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)) ? 'default' : 'pointer' }}
                        >
                          <td className="excel-td" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedMasterMaterials.includes(material.ITEM_CD)}
                              onChange={() => handleMasterMaterialCheckboxChange(material.ITEM_CD)}
                              disabled={isCompleted || isReadOnly || (selectedOrder !== null && !isEditMode)}
                            />
                          </td>
                          <td className="excel-td excel-td-number">{index + 1}</td>
                          <td className="excel-td">{material.ITEM_CD}</td>
                          <td className="excel-td">{material.ITEM_NM}</td>
                          <td className="excel-td">{material.ITEM_SPEC}</td>
                          <td className="excel-td">{material.ITEM_UNIT}</td>
                          <td className="excel-td">{material.ITEM_COST}</td>
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
                onClick={handleAddMasterMaterials}
                disabled={isCompleted || isReadOnly || selectedMasterMaterials.length === 0 || (selectedOrder !== null && !isEditMode)}
              >
                추가
              </button>
              <button className="excel-btn excel-btn-modify" onClick={() => setShowMaterialMasterPopup(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 발주 완료 팝업 */}
      {showCompletionPopup && (
        <div className="popup-overlay" onClick={() => setShowCompletionPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #16a34a', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
              <h3 className="popup-title" style={{ color: '#15803d', margin: 0, fontSize: '20px' }}>✓ 발주가 완료되었습니다.</h3>
            </div>
            <div className="popup-body" style={{ padding: '40px 30px' }}>
              <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>발주가 성공적으로 {isModify ? '수정' : '등록'}되었습니다.</p>
                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                    발주번호: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{completionInfo?.purchaseCode ?? '-'}</span>
                  </p>
                  <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                    담당자: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{completionInfo?.custEmp ?? '-'}</span>
                  </p>
                  <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                    발주 금액: <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '8px', fontSize: '15px' }}>
                      {Number(completionInfo?.amount ?? 0).toLocaleString()}원
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center' }}>
              <button
                className="erp-button erp-button-primary"
                onClick={() => {
                  setShowCompletionPopup(false)
                  if (isModify) setIsCompleted(false)
                }}
                style={{ width: '120px' }}
              >
                {isModify ? '계속 수정' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 발주 확정 확인 팝업 */}
      {showConfirmDialog && (
        <div className="popup-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #3b82f6', background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' }}>
              <h3 className="popup-title" style={{ color: '#1d4ed8', margin: 0, fontSize: '20px' }}>발주 확정</h3>
            </div>
            <div className="popup-body" style={{ padding: '26px 24px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                발주를 확정하시겠습니까?
              </p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#6b7280', lineHeight: '1.6' }}>
                확정 후에는 수정할 수 없습니다.
              </p>

              <div style={{ marginTop: '16px', textAlign: 'left', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '6px 0', color: '#6b7280', fontSize: '13px' }}>
                  발주번호: <span style={{ fontWeight: '600', color: '#111827', marginLeft: '8px' }}>{selectedOrder}</span>
                </p>
                <p style={{ margin: '6px 0', color: '#6b7280', fontSize: '13px' }}>
                  담당자: <span style={{ fontWeight: '600', color: '#111827', marginLeft: '8px' }}>{formData.CUST_EMP || '-'}</span>
                </p>
                <p style={{ margin: '6px 0', color: '#6b7280', fontSize: '13px' }}>
                  발주 금액: <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '8px', fontSize: '14px' }}>{materialList.reduce((sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}원</span>
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

      {/* 발주 확정 완료 팝업 */}
      {showConfirmedPopup && (
        <div className="popup-overlay" onClick={() => setShowConfirmedPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #16a34a', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
              <h3 className="popup-title" style={{ color: '#15803d', margin: 0, fontSize: '20px' }}>✓ 발주가 확정되었습니다.</h3>
            </div>
            <div className="popup-body" style={{ padding: '26px 24px' }}>
              <div style={{ textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                  발주번호: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{confirmedInfo?.purchaseCode ?? selectedOrder}</span>
                </p>
                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                  담당자: <span style={{ fontWeight: '600', color: '#000', marginLeft: '8px' }}>{confirmedInfo?.custEmp ?? (formData.CUST_EMP || '-')}</span>
                </p>
                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '13px' }}>
                  발주 금액: <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '8px', fontSize: '15px' }}>{Number(confirmedInfo?.amount ?? materialList.reduce((sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)), 0)).toLocaleString()}원</span>
                </p>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="erp-button erp-button-primary" onClick={() => setShowConfirmedPopup(false)} style={{ width: '120px' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 발주 취소 확인 팝업 */}
      {showCancelDialog && (
        <div className="popup-overlay" onClick={() => setShowCancelDialog(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #f59e0b', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
              <h3 className="popup-title" style={{ color: '#92400e', margin: 0, fontSize: '20px' }}>발주 취소</h3>
            </div>
            <div className="popup-body" style={{ padding: '26px 24px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                발주를 취소하시겠습니까?
              </p>
              <div style={{ marginTop: '16px', textAlign: 'left', background: '#fffbeb', padding: '12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <p style={{ margin: '6px 0', color: '#92400e', fontSize: '13px' }}>
                  발주번호: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{selectedOrder}</span>
                </p>
                <p style={{ margin: '6px 0', color: '#92400e', fontSize: '13px' }}>
                  담당자: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{formData.CUST_EMP || '-'}</span>
                </p>
                <p style={{ margin: '6px 0', color: '#92400e', fontSize: '13px' }}>
                  발주 금액: <span style={{ fontWeight: '800', color: '#b91c1c', marginLeft: '8px', fontSize: '14px' }}>{materialList.reduce((sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)), 0).toLocaleString()}원</span>
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

      {/* 발주 취소 완료 팝업 */}
      {showCanceledPopup && (
        <div className="popup-overlay" onClick={() => setShowCanceledPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #f59e0b', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
              <h3 className="popup-title" style={{ color: '#92400e', margin: 0, fontSize: '20px' }}>✓ 발주가 취소되었습니다.</h3>
            </div>
            <div className="popup-body" style={{ padding: '26px 24px' }}>
              <div style={{ textAlign: 'left', background: '#fffbeb', padding: '15px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <p style={{ margin: '8px 0', color: '#92400e', fontSize: '13px' }}>
                  발주번호: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{canceledInfo?.purchaseCode ?? selectedOrder}</span>
                </p>
                <p style={{ margin: '8px 0', color: '#92400e', fontSize: '13px' }}>
                  담당자: <span style={{ fontWeight: '700', color: '#111827', marginLeft: '8px' }}>{canceledInfo?.custEmp ?? (formData.CUST_EMP || '-')}</span>
                </p>
                <p style={{ margin: '8px 0', color: '#92400e', fontSize: '13px' }}>
                  발주 금액: <span style={{ fontWeight: '800', color: '#b91c1c', marginLeft: '8px', fontSize: '15px' }}>{Number(canceledInfo?.amount ?? materialList.reduce((sum, m) => sum + (Number(m.PURCHASE_QTY || 0) * Number(m.ITEM_COST || 0)), 0)).toLocaleString()}원</span>
                </p>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="erp-button erp-button-primary" onClick={() => setShowCanceledPopup(false)} style={{ width: '120px', backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 발주 삭제 확인 팝업 */}
      {showDeletePopup === true && (
        <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '18px' }}>발주 삭제</h3>
            </div>
            <div className="popup-body" style={{ padding: '25px 20px' }}>
              <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>정말 삭제하시겠습니까?</p>
                {selectedOrder && orderList.find(o => o.PURCHASE_CD === selectedOrder) && (
                  <div style={{ textAlign: 'left', background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca', marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '8px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#991b1b' }}>발주번호</span>
                      <span style={{ color: '#374151' }}>{orderList.find(o => o.PURCHASE_CD === selectedOrder).PURCHASE_CD}</span>
                      <span style={{ fontWeight: '600', color: '#991b1b' }}>발주일자</span>
                      <span style={{ color: '#374151' }}>{orderList.find(o => o.PURCHASE_CD === selectedOrder).PURCHASE_DT}</span>
                      <span style={{ fontWeight: '600', color: '#991b1b' }}>거래처</span>
                      <span style={{ color: '#374151' }}>{orderList.find(o => o.PURCHASE_CD === selectedOrder).CUST_CD}</span>
                      <span style={{ fontWeight: '600', color: '#991b1b' }}>담당자</span>
                      <span style={{ color: '#374151' }}>{orderList.find(o => o.PURCHASE_CD === selectedOrder).CUST_EMP}</span>
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
              <button className="erp-button erp-button-default" onClick={() => setShowDeletePopup(false)} style={{ width: '100px' }}>취소</button>
              <button className="erp-button erp-button-primary" onClick={handleConfirmDelete} style={{ width: '100px', background: '#ef4444', border: '1px solid #ef4444' }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 발주 삭제 완료 팝업 */}
      {showDeletePopup === 'completed' && (
        <div className="popup-overlay" onClick={() => setShowDeletePopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="popup-header" style={{ borderBottom: '2px solid #ef4444', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <h3 className="popup-title" style={{ color: '#b91c1c', margin: 0, fontSize: '20px' }}>✓ 발주 삭제 완료</h3>
            </div>
            <div className="popup-body" style={{ padding: '40px 30px' }}>
              <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600' }}>발주가 성공적으로 삭제되었습니다.</p>
                <div style={{ textAlign: 'center', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>
                    목록으로 돌아갑니다.
                  </p>
                </div>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center' }}>
              <button className="erp-button erp-button-primary" onClick={() => setShowDeletePopup(false)} style={{ width: '120px' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 거래처(매입처) 선택 팝업 */}
      {showCustPopup && (
        <div className="popup-overlay" onClick={() => { setShowCustPopup(false); setSelectedCustInPopup(null); }}>
          {/* 거래처 선택 팝업 전용 클래스 추가 */}
          <div className="popup-content purchase-cust-popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="popup-header">
              <h3 className="popup-title">거래처 선택 (구매처)</h3>
              <button className="popup-close-btn" onClick={() => { setShowCustPopup(false); setSelectedCustInPopup(null); }}>×</button>
            </div>
            <div className="popup-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
                거래처를 선택하면 발주번호, 매입처 코드, 담당자가 자동으로 입력됩니다.
              </p>
              {/* table-wrapper를 전용 클래스로 분리 */}
              <div className="table-wrapper purchase-cust-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="excel-table purchase-cust-table">
                  <thead>
                    <tr>
                      <th className="excel-th" style={{ width: '40px' }}>선택</th>
                      <th className="excel-th">No</th>
                      <th className="excel-th">거래처코드</th>
                      <th className="excel-th">거래처명</th>
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
                          등록된 구매처가 없습니다.
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
              <button className="excel-btn excel-btn-modify" onClick={() => { setShowCustPopup(false); setSelectedCustInPopup(null); }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default 발주관리
