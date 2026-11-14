
import React, { useEffect, useContext, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShopContext } from '../Context/ShopContext';

const API_BASE = (
    process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const { clearCart } = useContext(ShopContext);

    const clearCartRef = useRef(clearCart);
    clearCartRef.current = clearCart;

    const txRef =
        searchParams.get('tx_ref') ||
        searchParams.get('trx_ref');

    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState(
        'Verifying your payment. Please wait...'
    );
    const [orderNumber, setOrderNumber] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let cancelled = false;
        let timeoutId;

        const verifyPayment = async () => {
            if (!txRef) {
                setStatus('error');
                setMessage(
                    'Payment reference was not found. Please contact support.'
                );
                return;
            }

            const token = localStorage.getItem('auth-token');

            if (!token) {
                setStatus('error');
                setMessage(
                    `Please log in to verify your payment. Your payment reference is: ${txRef}`
                );
                return;
            }

            try {
                timeoutId = setTimeout(() => {
                    controller.abort();
                }, 25000);

                const response = await fetch(
                    `${API_BASE}/payments/chapa/verify/${encodeURIComponent(txRef)}`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal
                    }
                );

                const responseText = await response.text();

                let result = {};

                try {
                    result = responseText ? JSON.parse(responseText) : {};
                } catch {
                    throw new Error(
                        `The server returned an invalid response (HTTP ${response.status}).`
                    );
                }

                console.log('Payment verification HTTP status:', response.status);
                console.log('Payment verification response:', result);

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        result.error ||
                        `Payment verification failed (HTTP ${response.status}).`
                    );
                }

                const verified =
                    result.success === true ||
                    result.data?.success === true;

                if (!verified) {
                    throw new Error(
                        result.message ||
                        result.error ||
                        result.data?.message ||
                        'The backend has not confirmed this payment.'
                    );
                }

                if (cancelled) return;

                const number =
                    result.data?.orderNumber ||
                    result.data?.order_number ||
                    result.orderNumber ||
                    '';

                setOrderNumber(number);

                // Clear the cart only after the backend confirms payment.
                try {
                    const cartResult = await clearCartRef.current();

                    if (cancelled) return;

                    if (cartResult?.success === false) {
                        setStatus('success');
                        setMessage(
                            'Your payment was successful, but your cart could not be cleared. Please refresh your cart.'
                        );
                        return;
                    }
                } catch (cartError) {
                    console.error('Could not clear cart:', cartError);

                    if (cancelled) return;

                    setStatus('success');
                    setMessage(
                        'Your payment was successful, but your cart could not be cleared. Please refresh your cart.'
                    );
                    return;
                }

                if (cancelled) return;

                setStatus('success');
                setMessage(
                    result.message ||
                    result.data?.message ||
                    'Your payment was successfully verified!'
                );
            } catch (error) {
                if (cancelled) return;

                console.error('Payment verification error:', error);

                setStatus('error');

                if (error.name === 'AbortError') {
                    setMessage(
                        'Payment verification timed out. Please refresh this page to try again. Do not make another payment.'
                    );
                } else {
                    setMessage(
                        error.message ||
                        'We could not verify your payment. Please contact support.'
                    );
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };

        verifyPayment();

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [txRef]);

    return (
        <div
            style={{
                maxWidth: '600px',
                margin: '80px auto',
                padding: '35px',
                textAlign: 'center',
                borderRadius: '12px',
                boxShadow: '0 2px 15px rgba(0,0,0,0.1)',
                backgroundColor: '#fff'
            }}
        >
            {status === 'loading' && (
                <>
                    <h2>Verifying Payment...</h2>
                    <p>{message}</p>
                    <p>Please do not close this page.</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div style={{ fontSize: '60px', color: 'green' }}>
                        ✓
                    </div>

                    <h2 style={{ color: 'green' }}>
                        Payment Successful!
                    </h2>

                    <p>{message}</p>

                    {orderNumber && (
                        <p>
                            <strong>Order Number:</strong> {orderNumber}
                        </p>
                    )}

                    <p>
                        Thank you for shopping with us.
                        Your order has been confirmed.
                    </p>

                    <Link
                        to="/"
                        style={{
                            display: 'inline-block',
                            marginTop: '20px',
                            padding: '12px 25px',
                            backgroundColor: '#ff4141',
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '5px'
                        }}
                    >
                        Continue Shopping
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <div style={{ fontSize: '60px', color: 'red' }}>
                        !
                    </div>

                    <h2 style={{ color: 'red' }}>
                        Payment Verification Problem
                    </h2>

                    <p>{message}</p>

                    <p>
                        Please do not pay again until you have checked your
                        payment status.
                    </p>

                    <Link
                        to="/"
                        style={{
                            display: 'inline-block',
                            marginTop: '20px',
                            padding: '12px 25px',
                            backgroundColor: '#333',
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '5px'
                        }}
                    >
                        Return to Home
                    </Link>
                </>
            )}
        </div>
    );
};

export default PaymentSuccess;
