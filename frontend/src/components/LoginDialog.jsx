import React, { useState } from 'react'

function LoginDialog({ showLogin, setShowLogin, saveId, setSaveId, autoLogin, setAutoLogin }) {
  // 1. 입력값을 저장할 State 추가
  const [userId, setUserId] = useState(''); // 초기값 비워둠 (테스트용으로 'ADMIN' 넣어도 됨)
  const [password, setPassword] = useState('');

  if (!showLogin) return null

  // 2. 로그인 처리 함수 추가
  const handleLogin = async () => {
    // 유효성 검사
    if (!userId || !password) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      // 백엔드 API 호출
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          pswd: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("isLoggedIn", "true"); 
        localStorage.setItem("userInfo", JSON.stringify(data));
        setShowLogin(false);
      } else {
        // 실패 시 (비밀번호 틀림 등)
        alert(data.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      alert('서버와 연결할 수 없습니다.');
    }
  };

  // 엔터키 입력 시 로그인 실행
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-dialog">
        <div className="login-dialog-title">
          <span>로그인</span>
          <button className="login-close" onClick={() => setShowLogin(false)}>×</button>
        </div>
        <div className="login-dialog-content">
          <div className="login-form">
            
            {/* 3. 아이디 입력 필드 수정 (defaultValue -> value, onChange) */}
            <div className="login-field">
              <label>사용자ID</label>
              <input 
                type="text" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ID를 입력하세요"
              />
            </div>

            {/* 4. 비밀번호 입력 필드 수정 */}
            <div className="login-field">
              <label>비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className="login-options">
              <label className="login-checkbox">
                <input 
                  type="checkbox" 
                  checked={saveId}
                  onChange={(e) => setSaveId(e.target.checked)}
                />
                <span>아이디 저장</span>
              </label>
              <label className="login-checkbox">
                <input 
                  type="checkbox" 
                  checked={autoLogin}
                  onChange={(e) => setAutoLogin(e.target.checked)}
                />
                <span>자동로그인</span>
              </label>
            </div>
            
            {/* 5. 로그인 버튼에 클릭 이벤트 연결 */}
            <button className="login-submit" onClick={handleLogin}>로그인</button>
          
          </div>
          <div className="login-logo">
            <div className="logo-circle">
              <div className="logo-text">FOOD MANUFACTURING</div>
            </div>
            <div className="logo-korean">식품 제조 유통 시스템</div>
            <div className="logo-english">FOOD MANUFACTURING & DISTRIBUTION SYSTEM</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginDialog