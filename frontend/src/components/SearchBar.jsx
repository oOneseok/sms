import React from 'react';
import '../css/components/SearchBar.css';

export default function SearchBar({
  searchOptions,
  searchType,
  onSearchTypeChange,
  searchTerm,
  onSearchTermChange,
  onSearch
}) {
  return (
    <div className="search-bar-inline">
      <select
        className="search-select"
        value={searchType}
        onChange={(e) => onSearchTypeChange(e.target.value)}
      >
        {searchOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <input
        type="text"
        className="search-input"
        placeholder="검색어를 입력하세요"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
      />

      <button className="search-btn" onClick={onSearch}>
        조회
      </button>
    </div>
  );
}