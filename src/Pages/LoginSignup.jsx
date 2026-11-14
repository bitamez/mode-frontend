
import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CSS/LoginSignup.css';

import { useAuth } from '../contexts/AuthContext';
import { ShopContext } from '../Context/ShopContext';
import { useToastContext } from '../Context/ToastContext';

const LoginSignup = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { login: authLogin, signup: authSignup } = useAuth();
    const { addToCart } = useContext(ShopContext);
    const toast = useToastContext();

    const [state, setState] = useState('Login');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const changeHandler = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        setErrors(prev => ({
            ...prev,
            [name]: '',
            general: ''
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (state === 'Sign Up') {
            if (!formData.username.trim()) {
                newErrors.username = 'Username is required';
            } else if (formData.username.trim().length < 3) {
                newErrors.username = 'Username must be at least 3 characters';
            }

            if (!agreedToTerms) {
                newErrors.terms = 'You must agree to the terms and conditions';
            }
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    // Restore any product the customer wanted to add before logging in.
    const addPendingCartItem = async () => {
        const pendingItem = localStorage.getItem('pendingCartItem');

        if (!pendingItem) return;

        try {
            let itemData;

            try {
                itemData = JSON.parse(pendingItem);
            } catch {
                itemData = pendingItem;
            }

            if (itemData && typeof itemData === 'object' && itemData.productId) {
                const quantity = Math.max(1, Number(itemData.quantity) || 1);

                for (let i = 0; i < quantity; i++) {
                    await addToCart(itemData.productId);
                }
            } else {
                const productId = Number(itemData);

                if (Number.isFinite(productId) && productId > 0) {
                    await addToCart(productId);
                }
            }

            localStorage.removeItem('pendingCartItem');
            toast.success('Your pending product has been added to your cart!');
        } catch (error) {
            console.error('Pending cart item error:', error);
            // Do not cancel a successful login because of a cart error.
        }
    };

    const getRedirectPath = (user) => {
        const userRole = user?.role || 'customer';

        if (userRole === 'admin') return '/admin';
        if (userRole === 'seller') return '/seller';
        if (userRole === 'delivery') return '/delivery';

        // Preserve the page the customer originally wanted to visit.
        return location.state?.from || '/';
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            // IMPORTANT: Use AuthContext instead of saving the token manually.
            const result = await authLogin({
                email: formData.email.trim(),
                password: formData.password
            });

            if (!result.success) {
                setErrors({
                    general: result.error || 'Login failed. Please try again.'
                });
                return;
            }

            toast.success(
                `Welcome back, ${result.user?.username || result.user?.email || 'Customer'}!`
            );

            await addPendingCartItem();

            const redirectPath = getRedirectPath(result.user);

            navigate(redirectPath, { replace: true });

        } catch (error) {
            console.error('Login error:', error);

            setErrors({
                general: error.message || 'Login failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            const result = await authSignup({
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password
            });

            if (!result.success) {
                setErrors({
                    general: result.error || 'Signup failed. Please try again.'
                });
                return;
            }

            toast.success('Your account was created successfully!');

            const redirectPath = getRedirectPath(result.user);

            navigate(redirectPath, { replace: true });

        } catch (error) {
            console.error('Signup error:', error);

            setErrors({
                general: error.message || 'Signup failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = (e) => {
        e.preventDefault();

        if (loading) return;

        if (state === 'Login') {
            handleLogin();
        } else {
            handleSignup();
        }
    };

    const switchState = (newState) => {
        setState(newState);

        setErrors({});

        setFormData({
            username: '',
            email: '',
            password: ''
        });

        setAgreedToTerms(false);
    };

    return (
        <div className="loginsignup">
            <div className="loginsignup-container">

                <h1>{state}</h1>

                {errors.general && (
                    <div className="error-message general-error">
                        {errors.general}
                    </div>
                )}

                <form onSubmit={handleContinue}>

                    <div className="loginsignup-fields">

                        {state === 'Sign Up' && (
                            <div className="input-group">
                                <input
                                    name="username"
                                    value={formData.username}
                                    onChange={changeHandler}
                                    type="text"
                                    placeholder="Your Name"
                                    className={errors.username ? 'error' : ''}
                                    autoComplete="name"
                                />

                                {errors.username && (
                                    <span className="error-message">
                                        {errors.username}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="input-group">
                            <input
                                name="email"
                                value={formData.email}
                                onChange={changeHandler}
                                type="email"
                                placeholder="Email Address"
                                className={errors.email ? 'error' : ''}
                                autoComplete="email"
                            />

                            {errors.email && (
                                <span className="error-message">
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        <div className="input-group">
                            <input
                                name="password"
                                value={formData.password}
                                onChange={changeHandler}
                                type="password"
                                placeholder="Password"
                                className={errors.password ? 'error' : ''}
                                autoComplete={
                                    state === 'Login'
                                        ? 'current-password'
                                        : 'new-password'
                                }
                            />

                            {errors.password && (
                                <span className="error-message">
                                    {errors.password}
                                </span>
                            )}
                        </div>

                    </div>

                    {state === 'Sign Up' && (
                        <div className="loginsignup-agree">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => {
                                    setAgreedToTerms(e.target.checked);

                                    setErrors(prev => ({
                                        ...prev,
                                        terms: ''
                                    }));
                                }}
                            />

                            <p>
                                By continuing, I agree to the terms of use
                                and privacy policy.
                            </p>
                        </div>
                    )}

                    {errors.terms && (
                        <span className="error-message terms-error">
                            {errors.terms}
                        </span>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Please wait...' : 'Continue'}
                    </button>

                </form>

                {state === 'Sign Up' ? (
                    <p className="loginsignup-login">
                        Already have an account?
                        <span onClick={() => switchState('Login')}>
                            {' '}Login here
                        </span>
                    </p>
                ) : (
                    <>
                        <p className="loginsignup-login">
                            Create an account?
                            <span onClick={() => switchState('Sign Up')}>
                                {' '}Click here
                            </span>
                        </p>

                        <p className="loginsignup-forgot">
                            <span
                                onClick={() => navigate('/forgot-password')}
                                style={{ cursor: 'pointer' }}
                            >
                                Forgot your password?
                            </span>
                        </p>
                    </>
                )}

            </div>
        </div>
    );
};

export default LoginSignup;
