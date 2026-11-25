import React from "react";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import IconButton from "./IconButton";

/**
 * Standardized Pagination Component
 * @param {Object} props
 * @param {Number} props.currentPage - Current active page
 * @param {Number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Number} props.totalItems - Total items count (optional)
 * @param {Number} props.pageSize - Items per page (optional)
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = ""
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 ${className}`}>
      {/* Items Count */}
      <div className="text-sm text-text-secondary font-medium">
        {totalItems && pageSize ? (
          <>
            Showing <span className="text-text-primary font-bold">{startItem}</span> to{' '}
            <span className="text-text-primary font-bold">{endItem}</span> of{' '}
            <span className="text-text-primary font-bold">{totalItems}</span> results
          </>
        ) : (
          `Page ${currentPage} of ${totalPages}`
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="rounded-lg"
          title="First Page"
        >
          <FiChevronsLeft size={16} />
        </IconButton>
        
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg"
          title="Previous Page"
        >
          <FiChevronLeft size={16} />
        </IconButton>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map(number => (
            <button
              key={number}
              onClick={() => onPageChange(number)}
              className={`
                min-w-[32px] h-8 px-2 rounded-lg text-xs font-black transition-all duration-300
                ${currentPage === number 
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-110' 
                  : 'text-text-secondary hover:bg-surface-hover hover:text-primary'
                }
              `}
            >
              {number}
            </button>
          ))}
        </div>

        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg"
          title="Next Page"
        >
          <FiChevronRight size={16} />
        </IconButton>

        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="rounded-lg"
          title="Last Page"
        >
          <FiChevronsRight size={16} />
        </IconButton>
      </div>
    </div>
  );
};

export default Pagination;
