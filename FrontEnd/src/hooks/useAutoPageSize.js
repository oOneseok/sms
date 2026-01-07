import { useState, useEffect } from 'react';

/**
 * 자동 페이지 사이즈 계산 훅
 * @param {React.RefObject} containerRef - 테이블 wrapper ref
 * @param {number} rowHeight - 한 행의 높이(px)
 * @param {number} headerHeight - 헤더 높이(px)
 * @param {number} minItems - 최소 행 수(기본 10)
 * @param {number} maxItems - 최대 행 수(기본 25)
 * @returns {number} itemsPerPage
 */
export function useAutoPageSize(
  containerRef,
  rowHeight = 27,
  headerHeight = 30,
  minItems = 10,
  maxItems = 25
) {
  const [itemsPerPage, setItemsPerPage] = useState(minItems);

  useEffect(() => {
    function calc() {
      if (!containerRef.current) {
        setItemsPerPage(minItems);
        return;
      }
      const containerHeight = containerRef.current.clientHeight || 0;
      const available = Math.max(0, containerHeight - headerHeight);
      const raw = rowHeight > 0 ? Math.floor(available / rowHeight) : minItems;
      const clamped = Math.max(minItems, Math.min(raw, maxItems));
      setItemsPerPage(clamped);
    }
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', calc);
    }
    // devicePixelRatio zoom fallback
    let lastDpr = window.devicePixelRatio;
    const dprCheck = setInterval(() => {
      if (window.devicePixelRatio !== lastDpr) {
        lastDpr = window.devicePixelRatio;
        calc();
      }
    }, 300);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('orientationchange', calc);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', calc);
      }
      clearInterval(dprCheck);
    };
    // eslint-disable-next-line
  }, [containerRef, rowHeight, headerHeight, minItems, maxItems]);

  return itemsPerPage;
}
