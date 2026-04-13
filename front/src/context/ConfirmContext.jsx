import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState({ open: false, message: '' });
    const resolveRef = useRef(null);

    const confirmer = useCallback((message) => {
        setState({ open: true, message });
        return new Promise(resolve => { resolveRef.current = resolve; });
    }, []);

    const repondre = (valeur) => {
        setState({ open: false, message: '' });
        resolveRef.current?.(valeur);
    };

    return (
        <ConfirmContext.Provider value={{ confirmer }}>
            {children}
            {state.open && (
                <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.45)' }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-0 pb-0">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="fas fa-exclamation-triangle text-warning fs-5" />
                                    <h6 className="modal-title mb-0 fw-semibold">Confirmation</h6>
                                </div>
                            </div>
                            <div className="modal-body pt-2 pb-1">
                                <p className="mb-0">{state.message}</p>
                            </div>
                            <div className="modal-footer border-0 pt-1">
                                <button className="btn btn-secondary btn-sm" onClick={() => repondre(false)}>Annuler</button>
                                <button className="btn btn-danger btn-sm" onClick={() => repondre(true)}>Confirmer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => useContext(ConfirmContext);
