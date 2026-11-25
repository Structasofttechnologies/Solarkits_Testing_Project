import { FaBan } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function SavedCities({
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
    getSortIcon,
    itemsPerPageOptions,
    rowType = 'urban'
}) {
    const endIndex = startIndex + itemsPerPage;

    return (
        <>
            {/* HEADER BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                        <HiOutlineLocationMarker className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-text-primary">Saved Cities List</h3>
                        <p className="text-text-secondary text-xs">Permanently saved in database</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <SearchInputWithDropdown
                        placeholder="Search saved cities..."
                        inputValue={searchQuery}
                        onInputChange={(v) => onSearchChange(v)}
                        value={searchQuery || null}
                        onChange={(val) => onSearchChange(val || '')}
                        options={filteredData.map(c => ({
                            value: (c.name || '').toString(),
                            text: c.name || ''
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
                        <thead className="bg-green-50">
                            <tr>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-green-100/50 transition-colors"
                                    onClick={() => onSort("name")}
                                >
                                    <div className="flex items-center gap-1">
                                        City Name
                                        {getSortIcon("name")}
                                    </div>
                                </th>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-green-100/50 transition-colors"
                                    onClick={() => onSort("lat")}
                                >
                                    <div className="flex items-center gap-1">
                                        Latitude
                                        {getSortIcon("lat")}
                                    </div>
                                </th>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-green-100/50 transition-colors"
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
                                    const isSelected = selectedRow?.type === rowType && selectedRow?.index === startIndex + index;
                                    return (
                                        <tr
                                            key={row.id}
                                            onClick={() => onRowClick(row, startIndex + index)}
                                            className={`hover:bg-green-50/50 cursor-pointer transition-colors ${isSelected ? "bg-green-100/50" : ""}`}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                                        <HiOutlineLocationMarker className="text-green-600 text-sm" />
                                                    </div>
                                                    <span className="font-medium text-text-primary text-sm truncate">{row.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-sm text-text-secondary">{row.lat}</td>
                                            <td className="p-3 font-mono text-sm text-text-secondary">{row.lng}</td>
                                            <td className="p-3">
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onExclude(row.name, row.lat, row.lng);
                                                    }}
                                                    size="sm"
                                                    variant="warning"
                                                    leftIcon={<FaBan className="text-xs" />}
                                                    className="bg-amber-500 hover:bg-amber-600"
                                                >
                                                    Exclude
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                                <HiOutlineLocationMarker className="text-green-600 text-lg" />
                                            </div>
                                            <p className="text-text-secondary text-sm">No saved cities found for this district.</p>
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
                        Showing <span className="font-semibold text-green-600">{startIndex + 1}</span> to{" "}
                        <span className="font-semibold text-green-600">{Math.min(endIndex, filteredData.length)}</span> of{" "}
                        <span className="font-semibold text-green-600">{filteredData.length}</span> entries
                    </div>

                    <div className="flex items-center gap-2">
                        <IconButton
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            size="sm"
                            className="hover:bg-green-100/50 transition-colors"
                            title="Previous page"
                        >
                            <FiChevronLeft className="text-sm" />
                        </IconButton>

                        <span className="px-4 py-2 text-sm bg-green-50 rounded-lg font-medium">
                            {currentPage} / {totalPages}
                        </span>

                        <IconButton
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            size="sm"
                            className="hover:bg-green-100/50 transition-colors"
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