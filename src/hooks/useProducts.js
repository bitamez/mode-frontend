import { useState, useEffect } from 'react';
import productAPI from '../api/productAPI';
import resolveImage from '../utils/resolveImage';

export const useProducts = (filters = {}) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line
    }, [JSON.stringify(filters)]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await productAPI.getAll(filters);
            const productsData = (response.data.data || []).map(p => ({
                ...p, image: resolveImage(p.image)
            }));
            setProducts(productsData);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch products');
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    return { products, loading, error, refetch: fetchProducts };
};

export const useProduct = (productId, userId = null) => {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (productId) fetchProduct();
        // eslint-disable-next-line
    }, [productId, userId]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await productAPI.getById(productId, userId);
            const p = response.data.data;
            setProduct(p ? { ...p, image: resolveImage(p.image) } : null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch product');
            console.error('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    };

    return { product, loading, error, refetch: fetchProduct };
};

export default useProducts;
