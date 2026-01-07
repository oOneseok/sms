import React from 'react'
import '../css/components/ButtonIcon.css'

/**
 * 아이콘이 있는 버튼 컴포넌트
 * @param {string} type - 버튼 타입: 'new', 'modify', 'delete'
 * @param {string} label - 버튼 라벨
 * @param {Function} onClick - 클릭 핸들러
 * @param {boolean} disabled - 비활성화 여부
 * @param {string} className - 추가 CSS 클래스
 */
function IconButton({ type, label, onClick, disabled = false, className = '' }) {
    const getButtonClass = () => {
        const baseClass = 'excel-btn'
        const typeClass = `excel-btn-${type}`
        return `${baseClass} ${typeClass} ${className}`.trim()
    }

    const renderIcon = () => {
        const overlayType = type === 'modify' ? 'edit' : type
        return (
            <span className="btn-icon-wrapper">
                <span className="folder-icon"></span>
                <span className={`overlay-icon overlay-${overlayType}`}>
                    {overlayType === 'edit' ? (
                        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.5 0.5L6.5 1.5L1.5 6.5H0.5V5.5L5.5 0.5Z" stroke="white" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M0.5 6.5H6.5" stroke="white" strokeWidth="0.7" strokeLinecap="round"/>
                        </svg>
                    ) : type === 'new' ? (
                        '+'
                    ) : (
                        '−'
                    )}
                </span>
            </span>
        )
    }

    return (
        <button 
            className={getButtonClass()} 
            onClick={onClick}
            disabled={disabled}
        >
            {renderIcon()}
            <span className="btn-label">{label}</span>
        </button>
    )
}

export default IconButton

