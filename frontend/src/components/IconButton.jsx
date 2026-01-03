import React from 'react';
import '../css/components/erp-button.css';
import '../css/components/ButtonIcon.css';

// 아이콘 렌더링 헬퍼 컴포넌트
const FolderIcon = ({ type }) => {
  let overlayClass = '';
  let overlayText = '';

  switch(type) {
    case 'new':
      overlayClass = 'overlay-add';
      overlayText = '+';
      break;
    case 'modify':
      overlayClass = 'overlay-edit';
      overlayText = '✓';
      break;
    case 'delete':
      overlayClass = 'overlay-delete';
      overlayText = 'x';
      break;
    default: return null;
  }

  return (
    <div className="btn-icon-wrapper">
      <div className="folder-icon"></div>
      <div className={`overlay-icon ${overlayClass}`}>
        {overlayText}
      </div>
    </div>
  );
};

export default function IconButton({ type, label, onClick, className = '', disabled = false }) {
  // 'save'는 erp-button (파란색 메인 버튼) 사용
  // 'new', 'modify', 'delete' 등은 상단 헤더의 투명 버튼(excel-btn) 사용

  if (type === 'save') {
    return (
      <button
        className={`erp-button erp-button-primary ${className}`}
        onClick={onClick}
        disabled={disabled}
      >
        {/* 저장 아이콘(이모지 대체) */}
        <span style={{marginRight: '4px'}}>💾</span>
        {label}
      </button>
    );
  }

  let btnClass = 'excel-btn';
  if (type === 'new') btnClass += ' excel-btn-new';
  if (type === 'modify') btnClass += ' excel-btn-modify';
  if (type === 'delete') btnClass += ' excel-btn-delete';

  return (
    <button
      className={`${btnClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <FolderIcon type={type} />
      <span className="btn-label">{label}</span>
    </button>
  );
}