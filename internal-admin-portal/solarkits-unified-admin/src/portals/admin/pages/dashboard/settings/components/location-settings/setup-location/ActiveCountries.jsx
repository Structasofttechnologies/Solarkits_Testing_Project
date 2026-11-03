import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FaGlobeAmericas,
  FaMapMarkerAlt,
  FaMap,
  FaMapPin,
  FaLayerGroup,
  FaDrawPolygon,
  FaSpinner,
  FaCheckCircle,
  FaPlus,
  FaChartLine,
  FaBan,
  FaClock
} from "react-icons/fa";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import ReactCountryFlag from "react-country-flag";
import Loader from "@/components/Loader";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import {FiChevronRight} from "react-icons/fi";
import RenderIfPermission from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";


export default function ActiveCountries({ moduleUniqueId }) {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const refreshCountries = useCallback(async () => {
    if (!API_URL || !authHeaderObj()?.Authorization) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/geolocation/countries?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: { ...authHeaderObj() },
      });

      const formatted = res.data.countries.map((c) => ({
        text: (
          <span className="flex items-center gap-2">
            <ReactCountryFlag countryCode={c.iso2} svg className="text-lg" />
            {c.name}
          </span>
        ),
        value: c.id,
        ...c,
      }));

      setCountries(formatted);
      setCurrentPage(1);
    } catch (err) {
      console.error("❌ Error fetching countries:", err);
      setError("Failed to load countries.");
      dispatch(setAlert({ message: "Failed to load countries.", type: "error" }));
    } finally {
      setLoading(false);
    }
  }, [API_URL, dispatch]);

  useEffect(() => {
    refreshCountries();
  }, [refreshCountries]);

  // ✅ Activate country and refresh list (no page reload)
  const handleActivate = async () => {
    if (!country) {
      dispatch(setAlert({ message: "Please select a country first.", type: "error" }));
      return;
    }

    try {
      setActivating(true);
      await axios.post(
        `${API_URL}/geolocation/activate-country/?unique_id=${moduleUniqueId}&req_for=edit`,
        { country_id: country },
        { headers: { ...authHeaderObj() } }
      );

      dispatch(
        setAlert({
          message: `${countries.find((c) => c.id == country).name} activated successfully!`,
          type: "success",
        })
      );

      await refreshCountries(); // ✅ refresh after activation
      setCountry(null);
    } catch (err) {
      console.error("❌ Activation failed:", err);
      dispatch(
        setAlert({
          message: err.response?.data?.message || "Failed to activate country.",
          type: "error",
        })
      );
    } finally {
      setActivating(false);
    }
  };

  const activeCountries = countries.filter((c) => c.is_active);
  const inactiveCountries = countries.filter((c) => !c.is_active);

  // Filter active countries based on search query
  const filteredActiveCountries = activeCountries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredActiveCountries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentActiveCountries = filteredActiveCountries.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Items per page options for dropdown
  const itemsPerPageOptions = [
    { text: "4 per page", value: 4 },
    { text: "8 per page", value: 8 },
    { text: "12 per page", value: 12 },
    { text: "16 per page", value: 16 },
    { text: "20 per page", value: 20 },
  ];

  if (loading) {
    return (
      <Loader text="Loading countries..." />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-start justify-center">
        <div className="card border-danger p-8 text-center w-full">
          <div className="w-20 h-20 rounded-xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
            <FaGlobeAmericas className="text-white text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-danger mb-2">Failed to load countries</h3>
          <p className="text-text-secondary mb-4">{error}</p>
          <Button
            onClick={refreshCountries}
            variant="danger"
            className="bg-linear-to-r from-red-500 to-red-600"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Countries"
        subtitle="Manage active countries and their geographical regions within the SolarKits ecosystem."
        icon={FaGlobeAmericas}
        stats={[
          { label: "Total Countries", value: countries.length, description: "In system" },
          { label: "Active", value: activeCountries.length, description: "Managed" },
          { label: "Inactive", value: inactiveCountries.length, description: "Available" }
        ]}
      />

      {/* ✅ Activation Section */}
      <RenderIfPermission
        requiredUniqueId={moduleUniqueId}
        permission="edit"
        fallback={
          <div className="card p-8 text-center">
            <div className="w-20 h-20 rounded-xl bg-linear-to-br from-primary to-primary-end flex items-center justify-center mx-auto mb-4">
              <FaBan className="text-white text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h3>
            <p className="text-text-secondary mb-4">You don't have permission to manage countries.</p>
          </div>
        }
      >
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="p-5">
            {/* Last updated badge */}
            <div className="flex justify-end mb-4">
              <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                <FaClock size={10} />
                Activate country
              </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                <FaPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Activate New Country</h3>
                <p className="text-text-secondary text-sm">Select a country to activate and start managing regions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Country
                </label>

                {inactiveCountries.length > 0 ? (
                  <DropdownWithSearchInput
                    value={country}
                    onChange={setCountry}
                    options={inactiveCountries}
                    className="w-full"
                    placeholder="Choose a country to activate..."
                  />
                ) : (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                    All countries are already active!
                  </div>
                )}
              </div>

              <div>
                {country && (
                  <Button
                    onClick={handleActivate}
                    disabled={activating}
                    className="w-full bg-linear-to-r from-primary to-primary-end"
                    leftIcon={activating ? <FaSpinner className="animate-spin mr-2" /> : <FaCheckCircle className="mr-2" />}
                    loading={activating}
                  >
                    {activating ? 'Activating...' : 'Activate Country'}
                  </Button>
                )}
              </div>
            </div>

            {country && (
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-4">
                  <ReactCountryFlag
                    countryCode={countries.find(c => c.id == country)?.iso2}
                    svg
                    className="text-2xl"
                  />
                  <div>
                    <h4 className="font-semibold text-text-primary">{countries.find(c => c.id == country)?.name}</h4>
                    <p className="text-sm text-text-secondary">
                      Ready to activate
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </RenderIfPermission>

      {/* ✅ Active Countries Grid */}
      <RenderIfPermission
        requiredUniqueId={moduleUniqueId}
        permission="view"
      >
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="p-5">
            <div className="flex justify-end mb-4">
              <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                <FaClock size={10} />
                Active countries
              </span>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                  <FaChartLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Active Countries</h3>
                  <p className="text-text-secondary text-sm">Manage your active countries and their regions</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                {activeCountries.length} Active
              </div>
            </div>

            <div className="mb-6">
              <SearchInputWithDropdown
                options={currentActiveCountries}
                value={null}
                inputValue={searchQuery}
                onInputChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                onChange={(selectedValue) => {
                  const selected = countries.find((c) => c.value === selectedValue);
                  setSearchQuery(selected?.name || "");
                  setCurrentPage(1);
                }}
                placeholder="Search active countries by name..."
                className="w-full"
              />
              {searchQuery && (
                <p className="mt-2 text-sm text-text-secondary">
                  Found {filteredActiveCountries.length} active countries matching "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        </div>

        {activeCountries.length === 0 ? (
          <div className="card p-5">
            <div className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaGlobeAmericas className="text-primary text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Countries</h3>
              <p className="text-text-secondary max-w-md mx-auto text-sm">
                Activate your first country to start managing states, districts, and regions.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Active Countries Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentActiveCountries.map((country, index) => (
                <div
                  key={country.id || index}
                  className="card hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
                  onClick={() =>
                    navigate(
                      "active-states",
                      {
                        state: {
                          country: {
                            id: country.id,
                            name: country.name,
                            iso2: country.iso2,
                          },
                        },
                      }
                    )
                  }
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ReactCountryFlag
                          countryCode={country.iso2}
                          svg
                          className="text-2xl"
                        />
                        <div>
                          <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                            {country.name}
                          </h3>
                          <p className="text-xs text-text-secondary flex items-center mt-1">
                            <FaCheckCircle className="text-success mr-1 w-3 h-3" />
                            Active
                          </p>
                        </div>
                      </div>
                      <FiChevronRight className="text-text-secondary group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Stats: States, Districts & Total Pincodes */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaMap className="text-blue-600 text-xs" />
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">States</span>
                        </div>
                        <p className="text-base font-black text-blue-950">{country.active_states_count || 0}</p>
                      </div>
                      <div className="bg-purple-50/80 border border-purple-100 rounded-xl p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaMapMarkerAlt className="text-purple-600 text-xs" />
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Districts</span>
                        </div>
                        <p className="text-base font-black text-purple-950">{country.active_districts_count || 0}</p>
                      </div>
                      <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaMapPin className="text-emerald-600 text-xs" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Pincodes</span>
                        </div>
                        <p className="text-base font-black text-emerald-950">{country.total_pincodes_count || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredActiveCountries.length}
                pageSize={itemsPerPage}
                className="mt-6 border-t border-border pt-4"
              />
            </div>
          </>
        )}
      </RenderIfPermission>
    </div>
  );
}