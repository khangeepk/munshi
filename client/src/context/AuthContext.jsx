import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to fetch user profile using a token
  const fetchProfile = async (authToken) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile.');
      }

      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
      return data.user;
    } catch (error) {
      console.error('Profile fetch failed:', error);
      // Clear invalid auth state if profile fetch fails
      logout();
      return null;
    }
  };

  // Run on mount to restore user session if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await fetchProfile(token);
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Pass server-returned error message through to component
        throw new Error(data.error || 'Invalid credentials');
      }

      // Save credentials & state
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);

      return {
        role: data.user.role,
        loginAs: data.loginAs,
      };
    } catch (error) {
      console.error('Login action error:', error);
      throw error;
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Impersonate advocate session
  const impersonate = async (advocateToken) => {
    const adminToken = localStorage.getItem('token');
    localStorage.setItem('adminToken', adminToken);

    localStorage.setItem('token', advocateToken);
    setToken(advocateToken);

    await fetchProfile(advocateToken);
  };

  // Terminate impersonation and restore admin session
  const stopImpersonating = async () => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      localStorage.removeItem('adminToken');
      localStorage.setItem('token', adminToken);
      setToken(adminToken);
      await fetchProfile(adminToken);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, isAuthenticated, isLoading, login, logout, impersonate, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
