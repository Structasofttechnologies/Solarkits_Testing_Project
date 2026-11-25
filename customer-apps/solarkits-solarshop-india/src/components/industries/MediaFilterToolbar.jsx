import React from "react";
import {
  FiSearch,
  FiX,
  FiGrid,
  FiList,
  FiFilter,
  FiVideo,
  FiFileText,
  FiImage,
  FiPlay,
  FiLayers,
} from "react-icons/fi";

const FILTER_TABS = [
  { value: "ALL", label: "All Assets", icon: FiLayers },
  { value: "VIDEO", label: "Videos", icon: FiVideo },
  { value: "POSTER", label: "Posters & Specs", icon: FiFileText },
  { value: "PHOTO", label: "Photos", icon: FiImage },
  { value: "EXPLAINER_VIDEO", label: "Explainer Guides", icon: FiPlay },
];

export default function MediaFilterToolbar({
  activeType = "ALL",
  onSelectType,
  searchQuery = "",
  onSearchChange,
  sortOption = "featured",
  onSortChange,
  viewMode = "GRID",
  onToggleViewMode,
  totalResults = 0,
}) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-8">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onSelectType(tab.value)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
                }`}
              >
                <Icon className={isActive ? "text-blue-600" : "text-slate-500"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search, Sort, and View Mode */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search posters, videos..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="featured">Featured First</option>
            <option value="popular">Most Viewed</option>
            <option value="newest">Newest Added</option>
          </select>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => onToggleViewMode("GRID")}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FiGrid className="text-base" />
            </button>
            <button
              onClick={() => onToggleViewMode("LIST")}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FiList className="text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
