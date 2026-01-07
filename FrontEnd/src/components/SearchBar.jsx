import React from 'react'
import '../css/components/SearchBar.css'

/**
 * 검색바 컴포넌트
 * @param {Array} searchOptions - 검색 옵션 [{value: string, label: string, type: 'text'|'date'}]
 * @param {string} searchType - 현재 선택된 검색 타입
 * @param {Function} onSearchTypeChange - 검색 타입 변경 핸들러
 * @param {string} searchTerm - 검색어
 * @param {Function} onSearchTermChange - 검색어 변경 핸들러
 * @param {Function} onSearch - 검색 실행 핸들러 (선택적)
 * @param {string} placeholder - 검색어 입력창 placeholder (기본: "검색어를 입력하세요")
 */
function SearchBar({
    searchOptions = [],
    searchType,
    onSearchTypeChange,
    searchTerm,
    onSearchTermChange,
    onSearch,
    placeholder = "검색어를 입력하세요"
}) {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch()
        }
    }

    const handleSearchClick = () => {
        if (onSearch) {
            onSearch()
        }
    }

    // 현재 선택된 검색 옵션 찾기
    const currentOption = searchOptions.find(opt => opt.value === searchType)
    const inputType = currentOption?.type || 'text'

    return (
        <div className="search-bar-inline">
            {searchOptions.length > 0 && (
                <select
                    className="search-select"
                    value={searchType}
                    onChange={(e) => onSearchTypeChange(e.target.value)}
                >
                    {searchOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )}
            {inputType === 'select' ? (
                <select
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                >
                    {(currentOption?.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={inputType}
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={inputType === 'date' ? '' : placeholder}
                />
            )}
            {onSearch && (
                <button
                    type="button"
                    className="search-btn"
                    onClick={handleSearchClick}
                >
                    조회
                </button>
            )}
        </div>
    )
}

export default SearchBar

