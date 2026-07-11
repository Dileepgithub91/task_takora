import React, { useEffect, useMemo, useState } from 'react';

export function byCreatedDesc(a, b) {
  const first = new Date(a?.createdAt || a?.updatedAt || a?.date || 0).getTime();
  const second = new Date(b?.createdAt || b?.updatedAt || b?.date || 0).getTime();
  return second - first;
}

export function usePagination(items = [], options = {}) {
  const {
    initialPageSize = 10,
    resetKey = '',
    pageSizeOptions = [5, 10, 20, 50]
  } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    totalItems,
    pageItems,
    pageSizeOptions
  };
}

export default function Pagination({
  page,
  pageSize,
  setPage,
  setPageSize,
  totalPages,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50]
}) {
  if (!totalItems || totalItems <= pageSize) return null;

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="paginationBar">
      <div className="paginationInfo">
        Showing <b>{start}</b>-<b>{end}</b> of <b>{totalItems}</b>
      </div>

      <div className="paginationControls">
        <select
          value={pageSize}
          onChange={event => setPageSize(Number(event.target.value))}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>

        <button
          type="button"
          className="secondary"
          disabled={page <= 1}
          onClick={() => setPage(1)}
        >
          First
        </button>

        <button
          type="button"
          className="secondary"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>

        <span className="paginationPage">Page {page} / {totalPages}</span>

        <button
          type="button"
          className="secondary"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>

        <button
          type="button"
          className="secondary"
          disabled={page >= totalPages}
          onClick={() => setPage(totalPages)}
        >
          Last
        </button>
      </div>
    </div>
  );
}
