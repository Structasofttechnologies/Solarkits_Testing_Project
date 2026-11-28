import store from "./store";

function isJwtExpired(token) {
  try {
    if (!token) return true;
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const parts = raw.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 <= Date.now() + 10000;
  } catch (e) {
    return false;
  }
}

export function getAuthToken() {
  try {
    // 1. Check localStorage 'login' first as it is directly updated upon silent refresh
    const rawLogin = localStorage.getItem('login');
    if (rawLogin) {
      try {
        const parsed = JSON.parse(rawLogin);
        const t = parsed?.token || (typeof parsed === 'string' ? parsed : null);
        if (t && !isJwtExpired(t)) {
          return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
        }
      } catch (e) {
        if (typeof rawLogin === 'string' && rawLogin.startsWith('eyJ') && !isJwtExpired(rawLogin)) {
          return `Bearer ${rawLogin}`;
        }
      }
    }

    // 2. Redux Store token if not expired
    const fromStore = store.getState()?.auth?.token;
    if (fromStore && !isJwtExpired(fromStore)) {
      return fromStore.startsWith('Bearer ') ? fromStore : `Bearer ${fromStore}`;
    }

    // 3. Fallback raw tokens if not expired
    const rawToken = localStorage.getItem('token') || localStorage.getItem('auth_token') || sessionStorage.getItem('token');
    if (rawToken && !isJwtExpired(rawToken)) {
      return rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
    }

    // 4. Fallback to existing token
    if (rawLogin) {
      try {
        const parsed = JSON.parse(rawLogin);
        if (parsed?.token) {
          return parsed.token.startsWith('Bearer ') ? parsed.token : `Bearer ${parsed.token}`;
        }
      } catch (e) {}
    }
    if (fromStore) {
      return fromStore.startsWith('Bearer ') ? fromStore : `Bearer ${fromStore}`;
    }

    return null;
  } catch (e) {
    return null;
  }
}

export function authHeaderObj() {
  const t = getAuthToken();
  return t ? { Authorization: t } : {};
}
