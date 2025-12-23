// 1. 현재 로그인한 사용자 ID 가져오는 함수
const getUserId = () => {
  const stored = sessionStorage.getItem("userInfo");
  if (stored) {
    try {
      return JSON.parse(stored).userId || 'system';
    } catch (e) { return 'system'; }
  }
  return 'anonymous';
};

// 2. fetch를 감싼 "나만의 API 함수"
export const callApi = async (url, method = 'GET', body = null) => {
  const userId = getUserId();
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-USER-ID': userId,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // 실제 요청 전송
  const response = await fetch(url, options);

  // 응답 처리 (에러 등 공통 처리 가능)
  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  // 내용이 없으면(DELETE 등) null 반환, 있으면 JSON 반환
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};