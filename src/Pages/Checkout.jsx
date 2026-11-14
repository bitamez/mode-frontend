
import React, {
    useState,
    useContext,
    useEffect,
    useRef
} from 'react';

import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../Context/ShopContext';
import { useToastContext } from '../Context/ToastContext';
import './CSS/Checkout.css';

const API_URL = (
    process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const Checkout = () => {
    const navigate = useNavigate();

    const {
        all_product,
        cartItems,
        getTotalCartAmount,
        userId,
        refreshCart
    } = useContext(ShopContext);

    const {
        success: showSuccess,
        error: showError,
        info: showInfo,
        warning: showWarning
    } = useToastContext();

    // Keep the latest toast functions without making effects run repeatedly.
    const toastRef = useRef({});

    toastRef.current = {
        showSuccess,
        showError,
        showInfo,
        showWarning
    };

    const [loading, setLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState('');

    const [shippingAddress, setShippingAddress] = useState({
        fullName: '',
        phone: '',
        address: '',
        city: '',
        region: '',
        postalCode: ''
    });

    const [bankTransferDetails, setBankTransferDetails] = useState(null);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);

    const subtotal = getTotalCartAmount();
    const tax = subtotal * 0.15;
    const shippingFee = subtotal > 1000 ? 0 : 50;
    const total = subtotal + tax + shippingFee;

    // Load payment methods only once when Checkout mounts.
    useEffect(() => {
        let cancelled = false;

        const fetchPaymentMethods = async () => {
            try {
                console.log('Fetching payment methods...');

                const response = await fetch(
                    `${API_URL}/payments/methods`
                );

                const result = await response.json();

                console.log('Payment methods API response:', result);

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        result.error ||
                        'Failed to load payment methods'
                    );
                }

                if (cancelled) return;

                const methods = Array.isArray(result.data)
                    ? result.data
                    : [];

                setPaymentMethods(methods);

                const codMethod = methods.find(
                    method =>
                        method.provider === 'cash_on_delivery'
                );

                setSelectedPayment(
                    codMethod?.provider ||
                    methods[0]?.provider ||
                    ''
                );

            } catch (error) {
                if (!cancelled) {
                    console.error(
                        'Payment methods loading error:',
                        error
                    );

                    setPaymentMethods([]);
                    setSelectedPayment('');

                    toastRef.current.showError?.(error.message);
                }
            }
        };

        fetchPaymentMethods();

        return () => {
            cancelled = true;
        };
    }, []);

    // Redirect when the cart is empty.
    useEffect(() => {
        if (subtotal === 0) {
            toastRef.current.showWarning?.(
                'Your cart is empty!'
            );

            navigate('/cart', { replace: true });
        }
    }, [subtotal, navigate]);

    // Get authentication token.
    const getToken = () => {
        return localStorage.getItem('auth-token');
    };

    // Handle shipping form changes.
    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setShippingAddress(previous => ({
            ...previous,
            [name]: value
        }));
    };

    // Handle payment method selection.
    const handlePaymentMethodChange = (provider) => {
        setSelectedPayment(provider);

        if (provider === 'bank_transfer') {
            setBankTransferDetails({
                bankName:
                    process.env.REACT_APP_BANK_NAME ||
                    'Commercial Bank of Ethiopia',

                accountNumber:
                    process.env.REACT_APP_BANK_ACCOUNT ||
                    '1000123456789',

                accountName:
                    process.env.REACT_APP_BANK_ACCOUNT_NAME ||
                    'Modo E-Commerce',

                referenceCode:
                    `REF-${Date.now()}-${Math.random()
                        .toString(36)
                        .substring(2, 9)
                        .toUpperCase()}`,

                amount: total
            });
        } else {
            setBankTransferDetails(null);
            setReceiptFile(null);
            setReceiptPreview(null);
        }
    };

    // Handle bank transfer receipt upload.
    const handleReceiptUpload = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toastRef.current.showError?.(
                'Please upload an image file.'
            );

            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toastRef.current.showError?.(
                'File size must be less than 5MB.'
            );

            event.target.value = '';
            return;
        }

        setReceiptFile(file);

        const reader = new FileReader();

        reader.onloadend = () => {
            setReceiptPreview(reader.result);
        };

        reader.readAsDataURL(file);
    };

    // Parse and validate API responses.
    const readResponse = async (response) => {
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success !== true) {
            throw new Error(
                result.message ||
                result.error ||
                `Request failed with status ${response.status}`
            );
        }

        return result;
    };

    // Place order.
    const handlePlaceOrder = async () => {
        if (loading) return;

        if (!selectedPayment) {
            toastRef.current.showWarning?.(
                'Please select a payment method.'
            );
            return;
        }

        if (
            !paymentMethods.some(
                method => method.provider === selectedPayment
            )
        ) {
            toastRef.current.showError?.(
                'Invalid payment method. Please refresh the page.'
            );
            return;
        }

        if (
            !shippingAddress.fullName.trim() ||
            !shippingAddress.phone.trim() ||
            !shippingAddress.address.trim() ||
            !shippingAddress.city.trim() ||
            !shippingAddress.region.trim()
        ) {
            toastRef.current.showWarning?.(
                'Please fill in all required shipping fields.'
            );
            return;
        }

        if (
            selectedPayment === 'bank_transfer' &&
            !receiptFile
        ) {
            toastRef.current.showWarning?.(
                'Please upload your payment receipt.'
            );
            return;
        }

        const token = getToken();

        if (!token || !userId) {
            toastRef.current.showError?.(
                'Please log in before placing your order.'
            );

            navigate('/login');
            return;
        }

        setLoading(true);

        try {
            // Validate JWT.
            let decodedToken;

            try {
                decodedToken = JSON.parse(
                    atob(token.split('.')[1])
                );
            } catch {
                throw new Error(
                    'Your login session is invalid. Please log in again.'
                );
            }

            if (
                decodedToken.exp &&
                decodedToken.exp * 1000 <= Date.now()
            ) {
                localStorage.removeItem('auth-token');

                throw new Error(
                    'Your login session has expired. Please log in again.'
                );
            }

            if (!decodedToken.userId) {
                console.error(
                    'JWT payload missing userId:',
                    decodedToken
                );

                throw new Error(
                    'Your login token does not contain a user ID. Please log in again.'
                );
            }

            console.log('Checkout user ID:', userId);
            console.log('JWT user ID:', decodedToken.userId);
            console.log('Selected payment:', selectedPayment);

            // STEP 1: Synchronize cart with backend.
            console.log('Synchronizing cart...');

            const syncResponse = await fetch(
                `${API_URL}/cart/${encodeURIComponent(userId)}/sync`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        frontendCart: cartItems
                    })
                }
            );

            const syncData = await readResponse(syncResponse);

            console.log('Cart sync response:', syncData);

            // STEP 2: Create order.
            console.log('Creating order...');

            const orderResponse = await fetch(
                `${API_URL}/orders`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        shippingAddress,
                        paymentMethod: selectedPayment,
                        notes:
                            selectedPayment === 'bank_transfer'
                                ? `Reference: ${bankTransferDetails.referenceCode}`
                                : ''
                    })
                }
            );

            const orderData = await readResponse(orderResponse);

            const order = orderData.data;

            const orderId = order?._id || order?.id;

            if (!orderId) {
                console.error('Order response:', orderData);

                throw new Error(
                    'Order was created but its ID is missing.'
                );
            }

            console.log('Order created:', orderId);

            // STEP 3: Upload bank transfer receipt.
            if (
                selectedPayment === 'bank_transfer' &&
                receiptFile
            ) {
                const formData = new FormData();

                formData.append('receipt', receiptFile);
                formData.append('orderId', orderId);

                formData.append(
                    'referenceCode',
                    bankTransferDetails.referenceCode
                );

                const uploadResponse = await fetch(
                    `${API_URL}/payments/bank-transfer/upload-receipt`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        body: formData
                    }
                );

                await readResponse(uploadResponse);

                console.log('Bank receipt uploaded successfully.');
            }

            // STEP 4: Process payment.
            console.log('Processing payment...');

            const paymentResponse = await fetch(
                `${API_URL}/payments/process`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        orderId,
                        paymentMethod: selectedPayment,
                        paymentDetails: {
                            firstName:
                                shippingAddress.fullName.split(' ')[0],

                            lastName:
                                shippingAddress.fullName
                                    .split(' ')
                                    .slice(1)
                                    .join(' '),

                            phoneNumber: shippingAddress.phone,

                            referenceNumber:
                                selectedPayment === 'bank_transfer'
                                    ? bankTransferDetails.referenceCode
                                    : undefined
                        }
                    })
                }
            );

            const paymentData = await readResponse(paymentResponse);

            console.log('Payment response:', paymentData);

            const payment =
                paymentData.data?.payment ||
                paymentData.data ||
                {};

            // STEP 5: Handle payment result.
            if (
                selectedPayment === 'cash_on_delivery' ||
                selectedPayment === 'bank_transfer'
            ) {
                if (refreshCart) {
                    await refreshCart();
                }

                toastRef.current.showSuccess?.(
                    selectedPayment === 'cash_on_delivery'
                        ? 'Order placed successfully! Payment is pending.'
                        : 'Order placed! Payment is pending admin verification.'
                );

                navigate('/profile');

                return;
            }

            // Redirect to Chapa, PayPal, or another online gateway.
            const paymentUrl =
                payment.paymentUrl ||
                payment.approvalUrl ||
                payment.checkout_url ||
                payment.checkoutUrl;

            if (paymentUrl) {
                toastRef.current.showInfo?.(
                    'Redirecting to payment gateway...'
                );

                window.location.assign(paymentUrl);
                return;
            }

            console.error(
                'Payment URL missing from response:',
                paymentData
            );

            throw new Error(
                'Payment was initialized but the payment URL was not returned.'
            );

        } catch (error) {
            console.error('Checkout error:', error);

            toastRef.current.showError?.(
                error.message || 'Failed to process your order.'
            );

            if (
                /session|login|token/i.test(error.message || '')
            ) {
                navigate('/login');
            }

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-container">
            <h1>Checkout</h1>

            <div className="checkout-content">

                {/* LEFT SIDE */}
                <div className="checkout-left">

                    {/* SHIPPING ADDRESS */}
                    <div className="checkout-section">
                        <h2>Shipping Address</h2>

                        <form
                            className="checkout-form"
                            onSubmit={event => event.preventDefault()}
                        >
                            <div className="form-group">
                                <label>Full Name *</label>

                                <input
                                    type="text"
                                    name="fullName"
                                    value={shippingAddress.fullName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number *</label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={shippingAddress.phone}
                                    onChange={handleInputChange}
                                    placeholder="+251912345678"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Address *</label>

                                <input
                                    type="text"
                                    name="address"
                                    value={shippingAddress.address}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>City *</label>

                                    <input
                                        type="text"
                                        name="city"
                                        value={shippingAddress.city}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Region *</label>

                                    <input
                                        type="text"
                                        name="region"
                                        value={shippingAddress.region}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Postal Code</label>

                                <input
                                    type="text"
                                    name="postalCode"
                                    value={shippingAddress.postalCode}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </form>
                    </div>

                    {/* PAYMENT METHODS */}
                    <div className="checkout-section">
                        <h2>Payment Method</h2>

                        {paymentMethods.length === 0 ? (
                            <p>
                                No payment methods are currently available.
                            </p>
                        ) : (
                            <div className="payment-methods">
                                {paymentMethods.map(method => (
                                    <div
                                        key={method.id || method.provider}
                                        className={`payment-method ${
                                            selectedPayment === method.provider
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            handlePaymentMethodChange(
                                                method.provider
                                            )
                                        }
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value={method.provider}
                                            checked={
                                                selectedPayment === method.provider
                                            }
                                            onChange={() =>
                                                handlePaymentMethodChange(
                                                    method.provider
                                                )
                                            }
                                        />

                                        <div className="payment-info">
                                            <span className="payment-icon">
                                                {method.icon || '💳'}
                                            </span>

                                            <div>
                                                <strong>
                                                    {method.displayName}
                                                </strong>

                                                <p>
                                                    {method.description || ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* BANK TRANSFER */}
                        {selectedPayment === 'bank_transfer' &&
                            bankTransferDetails && (
                                <div className="bank-transfer-details">
                                    <h3>Bank Transfer Instructions</h3>

                                    <div className="bank-info">
                                        <div className="info-row">
                                            <span className="label">
                                                Bank Name:
                                            </span>

                                            <span className="value">
                                                {bankTransferDetails.bankName}
                                            </span>
                                        </div>

                                        <div className="info-row">
                                            <span className="label">
                                                Account Name:
                                            </span>

                                            <span className="value">
                                                {bankTransferDetails.accountName}
                                            </span>
                                        </div>

                                        <div className="info-row">
                                            <span className="label">
                                                Account Number:
                                            </span>

                                            <span className="value">
                                                {bankTransferDetails.accountNumber}
                                            </span>
                                        </div>

                                        <div className="info-row highlight">
                                            <span className="label">
                                                Reference Code:
                                            </span>

                                            <span className="value">
                                                {bankTransferDetails.referenceCode}
                                            </span>
                                        </div>

                                        <div className="info-row highlight">
                                            <span className="label">
                                                Amount:
                                            </span>

                                            <span className="value">
                                                {bankTransferDetails.amount.toFixed(2)} ETB
                                            </span>
                                        </div>
                                    </div>

                                    <div className="transfer-instructions">
                                        <p>
                                            <strong>Instructions:</strong>
                                        </p>

                                        <ol>
                                            <li>
                                                Transfer the exact amount to the account above.
                                            </li>
                                            <li>
                                                Use the reference code in your transfer description.
                                            </li>
                                            <li>
                                                Take a screenshot of your payment receipt.
                                            </li>
                                            <li>
                                                Upload the receipt below.
                                            </li>
                                            <li>
                                                Admin will verify and confirm your payment.
                                            </li>
                                        </ol>
                                    </div>

                                    <div className="receipt-upload">
                                        <label htmlFor="receipt">
                                            Upload Payment Receipt *
                                        </label>

                                        <input
                                            type="file"
                                            id="receipt"
                                            accept="image/*"
                                            onChange={handleReceiptUpload}
                                            required
                                        />

                                        {receiptPreview && (
                                            <div className="receipt-preview">
                                                <img
                                                    src={receiptPreview}
                                                    alt="Payment receipt preview"
                                                />

                                                <button
                                                    type="button"
                                                    className="remove-receipt"
                                                    onClick={() => {
                                                        setReceiptFile(null);
                                                        setReceiptPreview(null);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="checkout-right">
                    <div className="order-summary">
                        <h2>Order Summary</h2>

                        <div className="order-items">
                            {all_product.map(product => {
                                const quantity =
                                    cartItems[product.id] || 0;

                                if (quantity <= 0) return null;

                                return (
                                    <div
                                        key={product.id}
                                        className="order-item"
                                    >
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                        />

                                        <div className="item-details">
                                            <p className="item-name">
                                                {product.name}
                                            </p>

                                            <p className="item-quantity">
                                                Qty: {quantity}
                                            </p>
                                        </div>

                                        <p className="item-price">
                                            {(
                                                product.new_price * quantity
                                            ).toFixed(2)} ETB
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="order-totals">
                            <div className="total-row">
                                <span>Subtotal:</span>

                                <span>
                                    {subtotal.toFixed(2)} ETB
                                </span>
                            </div>

                            <div className="total-row">
                                <span>Tax (15%):</span>

                                <span>
                                    {tax.toFixed(2)} ETB
                                </span>
                            </div>

                            <div className="total-row">
                                <span>Shipping:</span>

                                <span>
                                    {shippingFee === 0
                                        ? 'Free'
                                        : `${shippingFee.toFixed(2)} ETB`}
                                </span>
                            </div>

                            <hr />

                            <div className="total-row total">
                                <strong>Total:</strong>

                                <strong>
                                    {total.toFixed(2)} ETB
                                </strong>
                            </div>
                        </div>

                        <button
                            className="place-order-btn"
                            onClick={handlePlaceOrder}
                            disabled={
                                loading ||
                                paymentMethods.length === 0 ||
                                !selectedPayment
                            }
                        >
                            {loading
                                ? 'Processing...'
                                : 'Place Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
