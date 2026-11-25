import React from "react";
import { FiChevronRight, FaChartLine, FaClock } from "react-icons/fa";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dropdown from "@/components/Dropdown";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export const DataGrid = ({
  title,
  description,
  count,
  countLabel,
  items,
  itemsPerPage,
  currentPage,
  totalPages,
  filteredItems,
  onItemsPerPageChange,
  onPageChange,
  searchQuery,
  onSearchChange,
  onItemClick,
  renderItem,
  itemsPerPageOptions = [
    { text: "4 per page", value: 4 },
    { text: "8 per page", value: 8 },
    { text: "12 per page", value: 12 },
    { text: "16 per page", value: 16 },
  ],
  emptyMessage = "No items found",
  emptyIcon: EmptyIcon = FaChartLine,
  gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  moduleUniqueId = null,
  permission = "view"
}) => {
  const hasPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission });
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pageNumbers.push(i);
      pageNumbers.push('...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1, '...');
      for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }

    return pageNumbers;
  };

  return (
    <RenderIfPermission 
      requiredUniqueId={moduleUniqueId} 
      permission={permission}
      fallback={
        <div className="card p-8 text-center">
          <div className="w-20 h-20 rounded-xl bg-linear-to-br from-primary to-primary-end flex items-center justify-center mx-auto mb-4 opacity-50">
            <EmptyIcon className="text-white text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2 opacity-50">{title}</h3>
          <p className="text-text-secondary mb-4 opacity-50">You don't have permission to view this data.</p>
        </div>
      }
    >
      <div className="card hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-5">
          {/* Last updated badge */}
          <div className="flex justify-end mb-4">
            <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
              <FaClock size={10} />
              {title}
            </span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                <EmptyIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">{title}</h3>
                <p className="text-text-secondary text-sm">{description}</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              {count} {countLabel}
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <SearchInputWithDropdown
              options={currentItems}
              value={null}
              inputValue={searchQuery}
              onInputChange={(val) => {
                onSearchChange(val);
                onPageChange(1);
              }}
              onChange={(selectedValue) => {
                const selected = items.find((item) => item.value === selectedValue);
                onSearchChange(selected?.name || "");
                onPageChange(1);
              }}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full"
            />
            {searchQuery && (
              <p className="mt-2 text-sm text-text-secondary">
                Found {filteredItems.length} items matching "{searchQuery}"
              </p>
            )}
          </div>

          {/* Grid or Empty State */}
          {filteredItems.length === 0 ? (
            <div className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <EmptyIcon className="text-primary text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">{emptyMessage}</h3>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className={`grid ${gridCols} gap-4`}>
                {currentItems.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="bg-surface rounded-xl border-2 border-border hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
                    onClick={() => onItemClick(item)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        {renderItem(item)}
                        <FiChevronRight className="text-text-secondary group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                      </div>
                      
                      {/* Status */}
                      <div className="text-xs text-text-secondary flex items-center">
                        <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                        Active
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">Show:</span>
                  <Dropdown
                    value={itemsPerPage}
                    onChange={onItemsPerPageChange}
                    options={itemsPerPageOptions}
                    className="w-32"
                  />
                </div>

                <div className="text-sm text-text-secondary">
                  Showing <span className="font-semibold text-primary">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-primary">
                    {Math.min(endIndex, filteredItems.length)}
                  </span>{" "}
                  of <span className="font-semibold text-primary">{filteredItems.length}</span> items
                </div>

                <div className="flex items-center gap-1">
                  <IconButton
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="hover:bg-primary/10 transition-colors"
                    title="First page"
                  >
                    <FiChevronsLeft />
                  </IconButton>

                  <IconButton
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="hover:bg-primary/10 transition-colors"
                    title="Previous page"
                  >
                    <FiChevronLeft />
                  </IconButton>

                  <span className="px-4 py-2 text-sm bg-primary/5 rounded-lg font-medium">
                    {currentPage} / {totalPages}
                  </span>

                  <IconButton
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="hover:bg-primary/10 transition-colors"
                    title="Next page"
                  >
                    <FiChevronRight />
                  </IconButton>

                  <IconButton
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hover:bg-primary/10 transition-colors"
                    title="Last page"
                  >
                    <FiChevronsRight />
                  </IconButton>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RenderIfPermission>
  );
};