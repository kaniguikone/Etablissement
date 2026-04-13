import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const push = useCallback((type, message) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const toast = {
        success: (msg) => push('success', msg),
        error:   (msg) => push('danger',  msg),
        info:    (msg) => push('info',    msg),
    };

    const configs = {
        success: { icon: 'fas fa-check-circle', bg: '#198754', label: 'Succès' },
        danger:  { icon: 'fas fa-times-circle',  bg: '#dc3545', label: 'Erreur' },
        info:    { icon: 'fas fa-info-circle',    bg: '#0dcaf0', label: 'Info'   },
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Conteneur des toasts — bas à droite */}
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280, maxWidth: 380 }}>
                {toasts.map(t => {
                    const c = configs[t.type] || configs.info;
                    return (
                        <div key={t.id} style={{
                            background: c.bg, color: '#fff', borderRadius: 8,
                            padding: '10px 16px', boxShadow: '0 4px 14px rgba(0,0,0,.25)',
                            display: 'flex', alignItems: 'center', gap: 10,
                            animation: 'slideIn .2s ease',
                        }}>
                            <i className={c.icon} style={{ fontSize: 18, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, lineHeight: 1.4 }}>{t.message}</span>
                        </div>
                    );
                })}
            </div>
            <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }`}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
