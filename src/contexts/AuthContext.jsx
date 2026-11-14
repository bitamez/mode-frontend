
import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback
} from 'react';

import authAPI from '../api/authAPI';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('guest');
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const decodeToken = useCallback((token) => {
        try {
            const decoded = jwtDecode(token);

            if (!decoded.userId) {
                console.error('JWT does not contain userId:', decoded);
                return null;
            }

            return {
                userId: decoded.userId,
                email: decoded.email || '',
                username: decoded.username || '',
                role: decoded.role || 'customer',
                permissions: decoded.permissions || [],
                exp: decoded.exp
            };
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }, []);

    const isTokenExpired = useCallback((token) => {
        try {
            const decoded = jwtDecode(token);

            return !decoded.exp || decoded.exp * 1000 <= Date.now();
        } catch (error) {
            return true;
        }
    }, []);

    useEffect(() => {
        const initAuth = () => {
            const token = localStorage.getItem('auth-token');

            if (token && !isTokenExpired(token)) {
                const userData = decodeToken(token);

                if (userData) {
                    setUser(userData);
                    setRole(userData.role);
                    setPermissions(userData.permissions);
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('auth-token');
                }
            } else {
                localStorage.removeItem('auth-token');
                setRole('guest');
            }

            setLoading(false);
        };

        initAuth();
    }, [decodeToken, isTokenExpired]);

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);

            if (response.data.success && response.data.token) {
                const token = response.data.token;

                const userData = decodeToken(token);

                if (!userData || isTokenExpired(token)) {
                    return {
                        success: false,
                        error: 'Login returned an invalid or expired token.'
                    };
                }

                localStorage.setItem('auth-token', token);

                setUser(userData);
                setRole(userData.role);
                setPermissions(userData.permissions);
                setIsAuthenticated(true);

                return {
                    success: true,
                    user: userData
                };
            }

            return {
                success: false,
                error: response.data.error || 'Login failed'
            };
        } catch (error) {
            console.error('Login error:', error);

            return {
                success: false,
                error: error.response?.data?.error ||
                    error.response?.data?.message ||
                    'Login failed'
            };
        }
    };

    const signup = async (userData) => {
        try {
            const response = await authAPI.signup(userData);

            if (response.data.success && response.data.token) {
                const token = response.data.token;

                const decodedUser = decodeToken(token);

                if (!decodedUser || isTokenExpired(token)) {
                    return {
                        success: false,
                        error: 'Signup returned an invalid or expired token.'
                    };
                }

                localStorage.setItem('auth-token', token);

                setUser(decodedUser);
                setRole(decodedUser.role);
                setPermissions(decodedUser.permissions);
                setIsAuthenticated(true);

                return {
                    success: true,
                    user: decodedUser
                };
            }

            return {
                success: false,
                error: response.data.error || 'Signup failed'
            };
        } catch (error) {
            console.error('Signup error:', error);

            return {
                success: false,
                error: error.response?.data?.error ||
                    error.response?.data?.message ||
                    'Signup failed'
            };
        }
    };

    const logout = useCallback(() => {
        localStorage.removeItem('auth-token');

        setUser(null);
        setRole('guest');
        setPermissions([]);
        setIsAuthenticated(false);
    }, []);

    const hasRole = useCallback((requiredRole) => {
        if (!role) return false;

        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(role);
        }

        return role === requiredRole;
    }, [role]);

    const hasPermission = useCallback((requiredPermission) => {
        if (role === 'admin') return true;

        if (!permissions || permissions.length === 0) {
            return false;
        }

        if (Array.isArray(requiredPermission)) {
            return requiredPermission.some(
                permission => permissions.includes(permission)
            );
        }

        return permissions.includes(requiredPermission);
    }, [permissions, role]);

    const canAccess = useCallback((resource, action, scope = 'own') => {
        if (role === 'admin') return true;

        const permission = scope === 'all'
            ? `${resource}.${action}.all`
            : `${resource}.${action}.own`;

        return (
            hasPermission(permission) ||
            hasPermission(`${resource}.${action}`)
        );
    }, [role, hasPermission]);

    const getDisplayName = useCallback(() => {
        if (!user) return 'Guest';

        return user.username || user.email || 'User';
    }, [user]);

    const getRoleDisplayName = useCallback(() => {
        const roleNames = {
            admin: 'Administrator',
            seller: 'Seller',
            customer: 'Customer',
            delivery: 'Delivery Staff',
            support: 'Support Staff',
            finance: 'Finance Staff',
            guest: 'Guest'
        };

        return roleNames[role] || 'User';
    }, [role]);

    const isAdmin = useCallback(() => role === 'admin', [role]);
    const isSeller = useCallback(() => role === 'seller', [role]);
    const isCustomer = useCallback(() => role === 'customer', [role]);
    const isDelivery = useCallback(() => role === 'delivery', [role]);
    const isSupport = useCallback(() => role === 'support', [role]);
    const isFinance = useCallback(() => role === 'finance', [role]);

    const isGuest = useCallback(
        () => !isAuthenticated || role === 'guest',
        [isAuthenticated, role]
    );

    const value = {
        user,
        role,
        permissions,
        loading,
        isAuthenticated,

        login,
        signup,
        logout,

        hasRole,
        hasPermission,
        canAccess,

        getDisplayName,
        getRoleDisplayName,

        isAdmin,
        isSeller,
        isCustomer,
        isDelivery,
        isSupport,
        isFinance,
        isGuest
    };

    return (
        <AuthContext.Provider value={value}>
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

export const usePermission = (permission) => {
    const { hasPermission } = useAuth();
    return hasPermission(permission);
};

export const useRole = (role) => {
    const { hasRole } = useAuth();
    return hasRole(role);
};

export default AuthContext;
