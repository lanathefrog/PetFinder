import React, { createContext, useContext, useState } from "react";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const audio = new Audio("./pop.mp3");
    audio.volume = 0.4; //

    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = "success") => {
        const id = Date.now();
        audio.currentTime = 0;
        audio.play().catch(() => {});

        const newToast = {
            id,
            message,
            type,
            closing: false
        };

        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            startClosing(id);
        }, 4000);
    };

    const startClosing = (id) => {
        setToasts(prev =>
            prev.map(t =>
                t.id === id ? { ...t, closing: true } : t
            )
        );

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 400); // час анімації
    };


    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <div className="toast-container">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast ${toast.type} ${toast.closing ? "closing" : ""}`}
                    >
                        <div className="toast-content">
                            {toast.message}
                            <button
                                className="toast-close"
                                onClick={() => startClosing(toast.id)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="toast-progress"></div>
                    </div>

                ))}
            </div>

        </ToastContext.Provider>
    );
};
