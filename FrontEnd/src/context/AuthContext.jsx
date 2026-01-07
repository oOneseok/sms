// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

// Context 생성
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // 사용자 정보 (id, name 등)
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 여부
  const [loading, setLoading] = useState(true); // 초기 로딩 상태

  // 앱 실행 시 세션 스토리지 확인 (새로고침 시 로그인 유지)
  useEffect(() => {
    const storedLogin = sessionStorage.getItem("isLoggedIn");
    const storedUser = sessionStorage.getItem("userInfo");

    if (storedLogin === "true" && storedUser) {
      setIsLoggedIn(true);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 로그인 함수 (LoginDialog에서 호출)
  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("userInfo", JSON.stringify(userData));
  };

  // 로그아웃 함수 (Header에서 호출)
  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userInfo");
    // 필요 시 메인으로 리다이렉트
    window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 커스텀 훅 (컴포넌트에서 쉽게 쓰기 위함)
export const useAuth = () => useContext(AuthContext);