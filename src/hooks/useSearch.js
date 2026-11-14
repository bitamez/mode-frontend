import { useState } from 'react';
import productAPI from '../api/productAPI';
import resolveImage from '../utils/resolveImage';

export const useSearch = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [suggestions, setSuggestions] = useState(null);

    const search = async (query, filters = {}) => {
        try {
            setLoading(true);
            setError(null);
            setSuggestions(null);

            const response = await productAPI.search(query, filters);
            const productsData = (response.data.data || []).map(p => ({
                ...p, image: resolveImage(p.image)
            }));
            setResults(productsData);

            if (response.data.suggestions) {
                setSuggestions(response.data.suggestions);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Search failed');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const clearResults = () => {
        setResults([]);
        setSuggestions(null);
        setError(null);
    };

    return { results, loading, error, suggestions, search, clearResults };
};

export default useSearch;
