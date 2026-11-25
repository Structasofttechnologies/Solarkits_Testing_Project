import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const BdeAuthContext = createContext(null);

export function BdeAuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('bde_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('bde_user');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile/me');
      setProfile(res.data.data);
      if (res.data.data) {
        setUser(prev => {
          const updated = {
            ...prev,
            ...res.data.data,
          };
          localStorage.setItem('bde_user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, pin, rememberMe = false) => {
    const res = await api.post('/auth/login', {
      identifier,
      pin,
      password: pin,
      remember_me: rememberMe,
    });

    const newToken = res.data.token;
    const userData = res.data.data || res.data.bde || res.data.user || null;

    setToken(newToken);
    setUser(userData);
    localStorage.setItem('bde_token', newToken);
    if (userData) {
      localStorage.setItem('bde_user', JSON.stringify(userData));
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      setProfile(null);
      localStorage.removeItem('bde_token');
      localStorage.removeItem('bde_user');
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });

    if (res.data.token) {
      setToken(res.data.token);
      localStorage.setItem('bde_token', res.data.token);
    }

    setUser(prev => {
      const updated = { ...prev, is_first_login: false };
      localStorage.setItem('bde_user', JSON.stringify(updated));
      return updated;
    });
    return res.data;
  };

  const updateProfile = async (updateData) => {
    const res = await api.put('/profile/update', updateData);
    await fetchProfile();
    return res.data;
  };

  return (
    <BdeAuthContext.Provider
      value={{
        token,
        user,
        profile,
        loading,
        canOnboardEpc: (profile?.can_onboard_epc ?? user?.can_onboard_epc) !== false,
        canOnboardFranchise: (profile?.can_onboard_franchise ?? user?.can_onboard_franchise) !== false,
        login,
        logout,
        changePassword,
        updateProfile,
        refreshProfile: fetchProfile,
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </BdeAuthContext.Provider>
  );
}

export function useBdeAuth() {
  const context = useContext(BdeAuthContext);
  if (!context) {
    throw new Error('useBdeAuth must be used within a BdeAuthProvider');
  }
  return context;
}
