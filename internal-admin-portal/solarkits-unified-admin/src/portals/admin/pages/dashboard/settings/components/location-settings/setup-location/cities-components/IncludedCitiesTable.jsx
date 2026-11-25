import { FaBan, FaTrash } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function IncludedCitiesTable({
    currentData,
    searchQuery,
    currentPage,
    totalPages,
    itemsPerPage,
    filteredData,
    startIndex,
    selectedRow,
    onSort,
    onSearchChange,
    onPageChange,
    onItemsPerPageChange,
    onRowClick,
    onExclude,
    onDelete,
    getSortIcon,
    itemsPerPageOptions
}) {
    const endIndex = startIndex + itemsPerPage;

    return (
        <>
            {/* HEADER BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                        <HiOutlineLocationMarker className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-text-primary">Included Cities List</h3>
                        <p className="text-text-secondary text-xs">Cities ready for upload</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <SearchInputWithDropdown
                        placeholder="Search cities..."
                        inputValue={searchQuery}
                        onInputChange={(v) => onSearchChange(v)}
                        value={searchQuery || null}
                        onChange={(val) => onSearchChange(val || '')}
                        options={filteredData.map(c => ({
                            value: (c.city_name || '').toString(),
                            text: c.city_name || ''
                        }))}
                        className="w-full sm:w-48"
                    />

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary whitespace-nowrap">
                            {filteredData.length} results
                        </span>

                        <Dropdown
                            value={itemsPerPage}
                            onChange={onItemsPerPageChange}
                            options={itemsPerPageOptions}
                            className="w-32"
                        />
                    </div>
                </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="w-full rounded-xl border border-border">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-primary/5">
                            <tr>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                    onClick={() => onSort("city_name")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>City Name</span>
                                        {getSortIcon("city_name")}
                                    </div>
                                </th>

                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                    onClick={() => onSort("lat")}
                                >
                                    <div className="flex items-center gap-1">
                                        Latitude
                                        {getSortIcon("lat")}
                                    </div>
                                </th>

                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                    onClick={() => onSort("lng")}
                                >
                                    <div className="flex items-center gap-1">
                                        Longitude
                                        {getSortIcon("lng")}
                                    </div>
                                </th>

                                <th className="p-3 text-left text-sm font-semibold text-text-primary">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {currentData.length > 0 ? (
                                currentData.map((row, index) => {
                                    const isSelected =
                                        selectedRow?.type === "included" &&
                                        selectedRow?.index === startIndex + index;

                                    return (
                                        <tr
                                            key={startIndex + index}
                                            onClick={() => onRowClick(row, startIndex + index)}
                                            className={`hover:bg-primary/5 cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : ""
                                                }`}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                                        <HiOutlineLocationMarker className="text-primary text-sm" />
                                                    </div>
                                                    <span className="font-medium text-text-primary text-sm truncate">
                                                        {row.city_name}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-3 font-mono text-sm text-text-secondary">
                                                {row.lat}
                                            </td>

                                            <td className="p-3 font-mono text-sm text-text-secondary">
                                                {row.lng}
                                            </td>

                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        onClick={(e) => { e.stopPropagation(); onExclude(startIndex + index); }}
                                                        size="sm"
                                                        variant="warning"
                                                        leftIcon={<FaBan className="text-xs" />}
                                                        className="bg-amber-500 hover:bg-amber-600"
                                                    >
                                                        Exclude
                                                    </Button>
                                                    <IconButton
                                                        onClick={(e) => { e.stopPropagation(); onDelete(startIndex + index); }}
                                                        size="sm"
                                                        variant="danger"
                                                        title="Delete"
                                                    >
                                                        <FaTrash className="text-xs" />
                                                    </IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                                <HiOutlineLocationMarker className="text-primary text-lg" />
                                            </div>
                                            <p className="text-text-secondary text-sm">No cities found. Upload or add cities to see them here.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-text-secondary">
                        Showing <span className="font-semibold text-primary">{startIndex + 1}</span> to{" "}
                        <span className="font-semibold text-primary">{Math.min(endIndex, filteredData.length)}</span> of{" "}
                        <span className="font-semibold text-primary">{filteredData.length}</span> entries
                    </div>

                    <div className="flex items-center gap-2">
                        <IconButton
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            size="sm"
                            className="hover:bg-primary/10 transition-colors"
                            title="Previous page"
                        >
                            <FiChevronLeft className="text-sm" />
                        </IconButton>

                        <span className="px-4 py-2 text-sm bg-primary/5 rounded-lg font-medium">
                            {currentPage} / {totalPages}
                        </span>

                        <IconButton
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            size="sm"
                            className="hover:bg-primary/10 transition-colors"
                            title="Next page"
                        >
                            <FiChevronRight className="text-sm" />
                        </IconButton>
                    </div>
                </div>
            )}
        </>
    );
}