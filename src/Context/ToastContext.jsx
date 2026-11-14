
import React, {
    createContext,
    useContext,
    useMemo
} from 'react';

import { useToast } from '../hooks/useToast';
import ToastContainer from '../Components/Toast/ToastContainer';

const ToastContext = createContext(null);

export const useToastContext = () => {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error(
            'useToastContext must be used within ToastProvider'
        );
    }

    return context;
};

export const ToastProvider = ({ children }) => {
    const toast = useToast();

    const contextValue = useMemo(() => ({
        toasts: toast.toasts,
        showToast: toast.showToast,
        removeToast: toast.removeToast,
        success: toast.success,
        error: toast.error,
        info: toast.info,
        warning: toast.warning
    }), [
        toast.toasts,
        toast.showToast,
        toast.removeToast
    ]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            <ToastContainer
                toasts={toast.toasts}
                removeToast={toast.removeToast}
            />
        </ToastContext.Provider>
    );
};

export default ToastContext;
