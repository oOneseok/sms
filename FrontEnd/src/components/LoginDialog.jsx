// src/components/LoginDialog.js
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function LoginDialog() {
  const { login } = useAuth(); // login 함수 가져오기
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [saveId, setSaveId] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)

  const handleLogin = async () => {
    if (!userId || !password) {
      alert('아이디와 비밀번호를 모두 입력해주세요.')
      return
    }

    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pswd: password }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json()
        
        // 아이디 저장 로직
        if (saveId) localStorage.setItem('savedUserId', userId);
        else localStorage.removeItem('savedUserId');

        // 로그인 성공 처리 (Context)
        login(data); 
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('로그인 에러:', error)
      alert('서버와 연결할 수 없습니다.')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="login-overlay">
      <div className="login-dialog">
        <div className="login-dialog-title">
          <span>로그인</span>
        </div>
        <div className="login-dialog-content">
          <div className="login-form">
            <div className="login-field">
              <label>사용자ID</label>
              <input 
                type="text" 
                value={userId} 
                onChange={(e) => setUserId(e.target.value)} 
                onKeyDown={handleKeyDown}
                placeholder="ID 입력"
              />
            </div>
            <div className="login-field">
              <label>비밀번호</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyDown={handleKeyDown}
                placeholder="비밀번호 입력"
              />
            </div>
            <div className="login-options">
              <label className="login-checkbox">
                <input type="checkbox" checked={saveId} onChange={(e) => setSaveId(e.target.checked)} />
                <span>아이디 저장</span>
              </label>
              <label className="login-checkbox">
                <input type="checkbox" checked={autoLogin} onChange={(e) => setAutoLogin(e.target.checked)} />
                <span>자동로그인</span>
              </label>
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