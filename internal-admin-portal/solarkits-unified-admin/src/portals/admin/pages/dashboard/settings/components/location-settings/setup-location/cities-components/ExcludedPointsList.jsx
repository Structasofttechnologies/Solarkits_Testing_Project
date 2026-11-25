import { FaFilter, FaPlus, FaTrash, FaClock } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function ExcludedPointsList({
    excludedCurrentData,
    excludedFilteredData,
    excludedCurrentPage,
    excludedTotalPages,
    excludedSearchQuery,
    excludedItemsPerPage,
    selectedRow,
    onSearchChange,
    onPageChange,
    onItemsPerPageChange,
    onPointClick,
    onIncludeFromExcluded,
    onRemoveExcluded,
    renderPagination,
    excludedItemsPerPageOptions,
    excludedForDistrict,
    onSort,
    getSortIcon
}) {
    const excludedStartIndex = (excludedCurrentPage - 1) * excludedItemsPerPage;
    const excludedEndIndex = Math.min(excludedStartIndex + excludedItemsPerPage, excludedFilteredData.length);

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-red-500 to-red-600 text-white">
                        <FaFilter className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-text-primary">Excluded Points</h3>
                        <p className="text-text-secondary text-xs">Permanently excluded from this district</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <SearchInputWithDropdown
                        placeholder="Search excluded points..."
                        inputValue={excludedSearchQuery}
                        onInputChange={(v) => onSearchChange(v)}
                        value={excludedSearchQuery || null}
                        onChange={(val) => onSearchChange(val || '')}
                        options={excludedForDistrict.map(c => ({
                            value: (c.city_name || '').toString(),
                            text: c.city_name || ''
                        }))}
                        className="w-full sm:w-48"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">
                            {excludedFilteredData.length} results
                        </span>
                        <Dropdown
                            value={excludedItemsPerPage}
                            onChange={(val) => onItemsPerPageChange(Number(val))}
                            options={excludedItemsPerPageOptions}
                            className="w-32"
                        />
                    </div>
                </div>
            </div>

            {/* EXCLUDED LIST */}
            <div className="w-full rounded-xl border border-border">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-red-50">
                            <tr>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-red-100/50 transition-colors"
                                    onClick={() => onSort('city_name')}
                                >
                                    <div className="flex items-center gap-1">
                                        City Name
                                        {getSortIcon('city_name')}
                                    </div>
                                </th>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-red-100/50 transition-colors"
                                    onClick={() => onSort('lat')}
                                >
                                    <div className="flex items-center gap-1">
                                        Coordinates
                                        {getSortIcon('lat')}
                                    </div>
                                </th>
                                <th
                                    className="p-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-red-100/50 transition-colors"
                                    onClick={() => onSort('status')}
                                >
                                    <div className="flex items-center gap-1">
                                        Status
                                        {getSortIcon('status')}
                                    </div>
                                </th>
                                <th className="p-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {excludedCurrentData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                                                <FaFilter className="text-red-500 text-lg" />
                                            </div>
                                            <p className="text-text-secondary text-sm">No excluded points found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                excludedCurrentData.map((p, idx) => {
                                    const isFar = p.status === 'far' || (p.distanceMeters && p.distanceMeters > 5000);
                                    const isNear = p.status === 'near' || (p.distanceMeters && p.distanceMeters <= 5000);
                                    const isSelected = selectedRow?.type === 'excluded' && selectedRow?.index === idx;
                                    return (
                                        <tr
                                            key={idx}
                                            onClick={() => onPointClick(p, idx)}
                                            className={`hover:bg-red-50/50 cursor-pointer transition-colors ${isSelected ? "bg-red-100/50" : ""
                                                }`}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                                        <HiOutlineLocationMarker className="text-red-500 text-sm" />
                                                    </div>
                                                    <span className="font-medium text-text-primary text-sm truncate">
                                                        {p.city_name || `Location ${idx + 1}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-sm text-text-secondary">
                                                {p.lat}, {p.lng}
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isFar
                                                        ? 'bg-red-100 text-red-700'
                                                        : isNear
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {isFar ? 'Far' : isNear ? 'Near' : 'Excluded'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onIncludeFromExcluded(idx);
                                                        }}
                                                        size="sm"
                                                        variant="success"
                                                        leftIcon={<FaPlus className="mr-1 text-xs" />}
                                                        className="bg-green-500 hover:bg-green-600"
                                                    >
                                                        Include
                                                    </Button>
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveExcluded(idx, p.city_id);
                                                        }}
                                                        size="sm"
                                                        variant="danger"
                                                        leftIcon={<FaTrash className="mr-1 text-xs" />}
                                                        className="bg-red-500 hover:bg-red-600"
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGINATION */}
            {excludedTotalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-text-secondary">
                        Showing <span className="font-semibold text-red-500">{excludedStartIndex + 1}</span> to <span className="font-semibold text-red-500">{excludedEndIndex}</span> of <span className="font-semibold text-red-500">{excludedFilteredData.length}</span> entries
                    </div>

                    <div className="flex items-center gap-2">
                        <IconButton
                            onClick={() => onPageChange(Math.max(1, excludedCurrentPage - 1))}
                            disabled={excludedCurrentPage === 1}
                            size="sm"
                            className="hover:bg-red-100/50 transition-colors"
                        >
                            <FiChevronLeft className="text-sm" />
                        </IconButton>

                        <span className="px-4 py-2 text-sm bg-red-50 rounded-lg font-medium">
                            {excludedCurrentPage} / {excludedTotalPages}
                        </span>

                        <IconButton
                            onClick={() => onPageChange(Math.min(excludedTotalPages, excludedCurrentPage + 1))}
                            disabled={excludedCurrentPage === excludedTotalPages}
                            size="sm"
                            className="hover:bg-red-100/50 transition-colors"
                        >
                            <FiChevronRight className="text-sm" />
                        </IconButton>
                    </div>
                </div>
            )}
        </>
    );
}