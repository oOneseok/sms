// src/components/LoginDialog.js
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext' // Context import

// props로 받을 필요 없음 (Context 사용)
function LoginDialog() { 
  const { login } = useAuth(); // login 함수 가져오기
  
  const [userId, setUserId] = useState(''); 
  const [password, setPassword] = useState('');
  // 자동 로그인 등의 옵션은 필요하다면 state로 관리하거나 제거

  const handleLogin = async () => {
    if (!userId || !password) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pswd: password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 성공 시 Context의 login 함수 호출 -> App.js 리렌더링 -> 다이얼로그 사라짐
        // data 예시: { userId: 'admin', userName: '관리자', ... }
        login(data); 
      } else {
        alert(data.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      alert('서버와 연결할 수 없습니다.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-overlay">
      <div className="login-dialog">
        <div className="login-dialog-title">
          <span>로그인</span>
          {/* 닫기 버튼 제거하거나 앱 종료 로직 등으로 변경 가능 */}
        </div>
        <div className="login-dialog-content">
          <div className="login-form">
            <div className="login-field">
              <label>사용자ID</label>
              <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={handleKeyDown} placeholder="ID를 입력하세요" />
            </div>
            <div className="login-field">
              <label>비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} placeholder="비밀번호를 입력하세요" />
            </div>
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