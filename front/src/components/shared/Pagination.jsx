import React from "react";

const Pagination = ({ currentPage, lastPage, onPageChange }) => {
    if (lastPage <= 1) return null;

    const getPages = () => {
        if (lastPage <= 7) {
            return Array.from({ length: lastPage }, (_, i) => i + 1);
        }

        const pages = [1];

        if (currentPage > 3) pages.push('...');

        const start = Math.max(2, currentPage - 1);
        const end   = Math.min(lastPage - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);

        if (currentPage < lastPage - 2) pages.push('...');

        pages.push(lastPage);
        return pages;
    };

    return (
        <nav>
            <ul className="pagination justify-content-center mt-2 flex-wrap">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => onPageChange(currentPage - 1)}>
                        ‹ Préc.
                    </button>
                </li>
                {getPages().map((page, i) =>
                    page === '...'
                        ? <li key={`dots-${i}`} className="page-item disabled">
                            <span className="page-link">…</span>
                          </li>
                        : <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => onPageChange(page)}>
                                {page}
                            </button>
                          </li>
                )}
                <li className={`page-item ${currentPage === lastPage ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => onPageChange(currentPage + 1)}>
                        Suiv. ›
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Pagination;
