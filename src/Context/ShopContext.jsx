
import React, { createContext, useState, useEffect } from 'react';
import productAPI from '../api/productAPI';
import cartAPI from '../api/cartAPI';
import interactionAPI from '../api/interactionAPI';

// Product images
import p1 from '../Components/Assets/product_1.png';
import p2 from '../Components/Assets/product_2.png';
import p3 from '../Components/Assets/product_3.png';
import p4 from '../Components/Assets/product_4.png';
import p5 from '../Components/Assets/product_5.png';
import p6 from '../Components/Assets/product_6.png';
import p7 from '../Components/Assets/product_7.png';
import p8 from '../Components/Assets/product_8.png';
import p9 from '../Components/Assets/product_9.png';
import p10 from '../Components/Assets/product_10.png';
import p11 from '../Components/Assets/product_11.png';
import p12 from '../Components/Assets/product_12.png';
import p13 from '../Components/Assets/product_13.png';
import p14 from '../Components/Assets/product_14.png';
import p15 from '../Components/Assets/product_15.png';
import p16 from '../Components/Assets/product_16.png';
import p17 from '../Components/Assets/product_17.png';
import p18 from '../Components/Assets/product_18.png';
import p19 from '../Components/Assets/product_19.png';
import p20 from '../Components/Assets/product_20.png';
import p21 from '../Components/Assets/product_21.png';
import p22 from '../Components/Assets/product_22.png';
import p23 from '../Components/Assets/product_23.png';
import p24 from '../Components/Assets/product_24.png';
import p25 from '../Components/Assets/product_25.png';
import p26 from '../Components/Assets/product_26.png';
import p27 from '../Components/Assets/product_27.png';
import p28 from '../Components/Assets/product_28.png';
import p29 from '../Components/Assets/product_29.png';
import p30 from '../Components/Assets/product_30.png';
import p31 from '../Components/Assets/product_31.png';
import p32 from '../Components/Assets/product_32.png';
import p33 from '../Components/Assets/product_33.png';
import p34 from '../Components/Assets/product_34.png';
import p35 from '../Components/Assets/product_35.png';
import p36 from '../Components/Assets/product_36.png';

const IMAGE_MAP = {
    'product_1.png': p1,
    'product_2.png': p2,
    'product_3.png': p3,
    'product_4.png': p4,
    'product_5.png': p5,
    'product_6.png': p6,
    'product_7.png': p7,
    'product_8.png': p8,
    'product_9.png': p9,
    'product_10.png': p10,
    'product_11.png': p11,
    'product_12.png': p12,
    'product_13.png': p13,
    'product_14.png': p14,
    'product_15.png': p15,
    'product_16.png': p16,
    'product_17.png': p17,
    'product_18.png': p18,
    'product_19.png': p19,
    'product_20.png': p20,
    'product_21.png': p21,
    'product_22.png': p22,
    'product_23.png': p23,
    'product_24.png': p24,
    'product_25.png': p25,
    'product_26.png': p26,
    'product_27.png': p27,
    'product_28.png': p28,
    'product_29.png': p29,
    'product_30.png': p30,
    'product_31.png': p31,
    'product_32.png': p32,
    'product_33.png': p33,
    'product_34.png': p34,
    'product_35.png': p35,
    'product_36.png': p36
};

const resolveImage = (product) => {
    const raw = typeof product === 'string'
        ? product
        : product?.image;

    if (!raw) return null;

    if (
        raw.startsWith('http') ||
        raw.startsWith('data:') ||
        raw.startsWith('/')
    ) {
        return raw;
    }

    return IMAGE_MAP[raw] || raw;
};

export const ShopContext = createContext(null);

const ShopContextProvider = (props) => {
    const [allProducts, setAllProducts] = useState([]);
    const [cartItems, setCartItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    // Get user ID from authentication token
    useEffect(() => {
        const token = localStorage.getItem('auth-token');

        if (token) {
            try {
                const payload = JSON.parse(
                    atob(token.split('.')[1])
                );

                setUserId(payload.userId || payload.id || null);
            } catch (error) {
                console.error('Error decoding token:', error);
                setUserId(null);
            }
        } else {
            setUserId(null);
            loadGuestCart();
        }
    }, []);

    // Load guest cart
    const loadGuestCart = () => {
        try {
            const guestCart = localStorage.getItem('guest-cart');

            if (guestCart) {
                setCartItems(JSON.parse(guestCart));
            } else {
                setCartItems({});
            }
        } catch (error) {
            console.error('Error loading guest cart:', error);
            setCartItems({});
        }
    };

    // Save guest cart
    const saveGuestCart = (cart) => {
        try {
            localStorage.setItem(
                'guest-cart',
                JSON.stringify(cart)
            );
        } catch (error) {
            console.error('Error saving guest cart:', error);
        }
    };

    // Fetch products
    useEffect(() => {
        fetchProducts();
    }, []);

    // Fetch cart when user is available
    useEffect(() => {
        if (userId) {
            syncGuestCartToBackend().then(() => fetchCart());
        }
    }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync guest cart after login
    const syncGuestCartToBackend = async () => {
        try {
            const guestCart = localStorage.getItem('guest-cart');

            if (!guestCart || !userId) return;

            const guestCartItems = JSON.parse(guestCart);

            for (const [productId, quantity] of Object.entries(guestCartItems)) {
                if (quantity > 0) {
                    const product = allProducts.find(
                        p => String(p.id) === String(productId)
                    );

                    if (product) {
                        await cartAPI.addItem(
                            userId,
                            productId,
                            quantity,
                            product.new_price
                        );
                    }
                }
            }

            localStorage.removeItem('guest-cart');

            console.log('Guest cart synced successfully');
        } catch (error) {
            console.error('Error syncing guest cart:', error);
        }
    };

    // Fetch all products
    const fetchProducts = async () => {
        try {
            setLoading(true);

            const response = await productAPI.getAll({
                limit: 100
            });

            const products = response.data.data || [];

            const resolved = products.map(product => ({
                ...product,
                image: resolveImage(product)
            }));

            setAllProducts(resolved);
        } catch (error) {
            console.error('Error fetching products:', error);
            console.error(
                'Error details:',
                error.response || error.message
            );
        } finally {
            setLoading(false);
        }
    };

    // Fetch logged-in user's cart
    const fetchCart = async () => {
        if (!userId) return;

        try {
            const response = await cartAPI.getCart(userId);
            const cart = response.data.data;

            const cartObj = {};

            if (cart && Array.isArray(cart.items)) {
                cart.items.forEach(item => {
                    cartObj[item.productId] = item.quantity;
                });
            }

            setCartItems(cartObj);

            return cartObj;
        } catch (error) {
            console.error('Error fetching cart:', error);
            return null;
        }
    };

    // Add item to cart
    const addToCart = async (itemId) => {
        const token = localStorage.getItem('auth-token');

        // Guest cart
        if (!token || !userId) {
            const newCart = {
                ...cartItems,
                [itemId]: (cartItems[itemId] || 0) + 1
            };

            setCartItems(newCart);
            saveGuestCart(newCart);

            return {
                success: true,
                isGuest: true
            };
        }

        try {
            const product = allProducts.find(
                p => String(p.id) === String(itemId)
            );

            if (!product) {
                return {
                    success: false,
                    error: 'Product not found'
                };
            }

            setCartItems(prev => ({
                ...prev,
                [itemId]: (prev[itemId] || 0) + 1
            }));

            await cartAPI.addItem(
                userId,
                itemId,
                1,
                product.new_price
            );

            await fetchCart();

            interactionAPI.track(
                itemId,
                userId,
                'cart_add'
            ).catch(error => {
                console.error(
                    'Error tracking interaction:',
                    error.message
                );
            });

            return { success: true };
        } catch (error) {
            console.error('Error adding to cart:', error);

            setCartItems(prev => {
                const newCart = { ...prev };

                if (newCart[itemId] > 1) {
                    newCart[itemId]--;
                } else {
                    delete newCart[itemId];
                }

                return newCart;
            });

            return {
                success: false,
                error: error.message
            };
        }
    };

    // Remove one item from cart
    const removeFromCart = async (itemId) => {
        const token = localStorage.getItem('auth-token');

        // Guest cart
        if (!token || !userId) {
            const newQuantity = (cartItems[itemId] || 0) - 1;
            const newCart = { ...cartItems };

            if (newQuantity <= 0) {
                delete newCart[itemId];
            } else {
                newCart[itemId] = newQuantity;
            }

            setCartItems(newCart);
            saveGuestCart(newCart);

            return;
        }

        try {
            const newQuantity = (cartItems[itemId] || 0) - 1;

            if (newQuantity <= 0) {
                const newCart = { ...cartItems };
                delete newCart[itemId];

                setCartItems(newCart);

                await cartAPI.removeItem(userId, itemId);
            } else {
                setCartItems(prev => ({
                    ...prev,
                    [itemId]: newQuantity
                }));

                await cartAPI.updateItemQuantity(
                    userId,
                    itemId,
                    newQuantity
                );
            }
        } catch (error) {
            console.error('Error removing cart item:', error);
            await fetchCart();
        }
    };

    // NEW: Clear the complete cart after successful payment
    const clearCart = async () => {
        console.log('Clearing shopping cart...');

        // Clear guest cart locally
        localStorage.removeItem('guest-cart');

        // Update the screen immediately
        setCartItems({});

        const token = localStorage.getItem('auth-token');

        // Guest cart is already cleared
        if (!token || !userId) {
            console.log('Guest cart cleared');
            return { success: true };
        }

        try {
            // Get the latest cart from backend
            const response = await cartAPI.getCart(userId);
            const cart = response.data.data;

            const items = cart?.items || [];

            // Remove every item from the backend cart
            for (const item of items) {
                const productId = item.productId || item.product_id;

                if (productId) {
                    await cartAPI.removeItem(userId, productId);
                }
            }

            // Make sure the frontend cart stays empty
            setCartItems({});
            localStorage.removeItem('guest-cart');

            console.log('Shopping cart cleared successfully');

            return { success: true };
        } catch (error) {
            console.error('Error clearing backend cart:', error);

            // Reload backend cart if clearing failed
            await fetchCart();

            return {
                success: false,
                error: error.message
            };
        }
    };

    // Calculate cart total
    const getTotalCartAmount = () => {
        let totalAmount = 0;

        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                const itemInfo = allProducts.find(
                    product =>
                        String(product.id) === String(item) ||
                        String(product._id) === String(item)
                );

                if (itemInfo) {
                    totalAmount +=
                        itemInfo.new_price * cartItems[item];
                }
            }
        }

        return totalAmount;
    };

    // Calculate total quantity in cart
    const getTotalCartItems = () => {
        let totalItem = 0;

        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                totalItem += cartItems[item];
            }
        }

        return totalItem;
    };

    const contextValue = {
        all_product: allProducts,
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        getTotalCartAmount,
        getTotalCartItems,
        loading,
        userId,
        refreshProducts: fetchProducts,
        refreshCart: fetchCart
    };

    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
