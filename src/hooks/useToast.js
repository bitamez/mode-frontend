
import { useState, useCallback, useEffect } from 'react';

export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(
        (message, type = 'success', duration = 3000) => {
            const id = `${Date.now()}-${Math.random()}`;

            setToasts(prev => [
                ...prev,
                { id, message, type, duration }
            ]);

            return id;
        },
        []
    );

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    useEffect(() => {
        if (toasts.length === 0) return;

        const timers = toasts.map(toast =>
            setTimeout(() => {
                removeToast(toast.id);
            }, toast.duration)
        );

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [toasts, removeToast]);

    return {
        toasts,
        showToast,
        removeToast,
        success: (message, duration) =>
            showToast(message, 'success', duration),
        error: (message, duration) =>
            showToast(message, 'error', duration),
        info: (message, duration) =>
            showToast(message, 'info', duration),
        warning: (message, duration) =>
            showToast(message, 'warning', duration),
    };
};
