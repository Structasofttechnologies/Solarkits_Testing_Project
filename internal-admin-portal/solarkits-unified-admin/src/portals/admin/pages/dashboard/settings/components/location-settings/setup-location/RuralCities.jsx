import { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useLoadScript } from "@react-google-maps/api";
import { setAlert } from "@/features/alert.slice";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import UploadCard from "./cities-components/UploadCard";
import MapSection from "./cities-components/MapSection";
import SingleCityForm from "./cities-components/SingleCityForm";
import IncludedCitiesTable from "./cities-components/IncludedCitiesTable";
import OutsideBoundaryPoints from "./cities-components/OutsideBoundaryPoints";
import ExcludedPointsList from "./cities-components/ExcludedPointsList";
import SavedCities from "./cities-components/SavedCities";
import readXlsxFile from "read-excel-file";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
    FaUpload,
    FaTrash,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaChartLine,
    FaClock,
    FaCity,
    FaBan,
    FaHome,
    FaExclamationTriangle,
    FaMapMarkedAlt
} from "react-icons/fa";
import ReactCountryFlag from "react-country-flag";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { FiChevronLeft, FiMap, FiLayers } from "react-icons/fi";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";


export default function RuralCities({ moduleUniqueId }) {
    const hasEditPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" });
    const hasViewPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "view" });
    const [ruralCities, setRuralCities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [singleCity, setSingleCity] = useState({
        city_name: "",
        lat: "",
        lng: "",
    });
    const [isAdding, setIsAdding] = useState(false);
    const [boundaries, setBoundaries] = useState([]);
    const [mapCenter, setMapCenter] = useState(null);
    const [nearPoints, setNearPoints] = useState([]);
    const [farPoints, setFarPoints] = useState([]);
    const [excludedPoints, setExcludedPoints] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [savedSearchQuery, setSavedSearchQuery] = useState("");
    const [excludedSearchQuery, setExcludedSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("included");
    const [boundaryFetched, setBoundaryFetched] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [selectedRow, setSelectedRow] = useState(null);

    // Pagination for excluded list
    const [excludedCurrentPage, setExcludedCurrentPage] = useState(1);
    const [excludedItemsPerPage, setExcludedItemsPerPage] = useState(10);
    const excludedItemsPerPageOptions = [
        { value: 5, text: "5 per page" },
        { value: 10, text: "10 per page" },
        { value: 15, text: "15 per page" },
        { value: 20, text: "20 per page" },
    ];

    // Confirmation Popup states
    const [confirmationPopup, setConfirmationPopup] = useState({
        isOpen: false,
        title: "",
        message: "",
        mode: "text",
        variant: "info",
        onConfirm: null,
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const itemsPerPageOptions = [
        { value: 5, text: "5 per page" },
        { value: 10, text: "10 per page" },
        { value: 15, text: "15 per page" },
        { value: 20, text: "20 per page" },
        { value: 25, text: "25 per page" },
    ];

    // Pagination for saved cities
    const [savedCurrentPage, setSavedCurrentPage] = useState(1);
    const [savedItemsPerPage, setSavedItemsPerPage] = useState(10);
    const savedItemsPerPageOptions = [
        { value: 5, text: "5 per page" },
        { value: 10, text: "10 per page" },
        { value: 15, text: "15 per page" },
        { value: 20, text: "20 per page" },
    ];
    const [savedSortConfig, setSavedSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });
    const [excludedSortConfig, setExcludedSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });

    const API_URL = import.meta.env.VITE_API_URL;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    });

    // helper to geocode an Excel row when coords are not provided
    const geocodeRow = async (row) => {
        if (row.lat && row.lng) return row;
        if (!row.city_name) return row;
        try {
            const addressString = [
                row.city_name,
                urbanCity?.name,
                district?.name,
                stateData?.name,
                country?.name
            ]
                .filter(Boolean)
                .join("|");

            const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                params: {
                    address: addressString,
                    key: GOOGLE_MAPS_API_KEY
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                const { lat, lng } = response.data.results[0].geometry.location;
                return { ...row, lat: lat.toFixed(6), lng: lng.toFixed(6) };
            }
        } catch (error) {
            console.error("Geocoding error during upload:", error);
        }
        return row;
    };

    const location = useLocation();
    const stateData = location.state?.state;
    const country = location.state?.country;
    const district = location.state?.district;
    const urbanCity = location.state?.urbanCity;

    // Helper function to check if a city is already managed
    const isCityAlreadyManaged = (cityToCheck, currentExcelData, currentExcludedPoints, currentRuralCities) => {
        const nameToCheck = (cityToCheck.city_name || cityToCheck.name || '').toString().toLowerCase();
        const latToCheck = parseFloat(cityToCheck.lat);
        const lngToCheck = parseFloat(cityToCheck.lng);

        const inRuralCities = currentRuralCities.some(rc =>
            (rc.name || '').toString().toLowerCase() === nameToCheck &&
            parseFloat(rc.lat) === latToCheck &&
            parseFloat(rc.lng) === lngToCheck
        );
        if (inRuralCities) return true;

        const inExcelData = currentExcelData.some(ed =>
            (ed.city_name || '').toString().toLowerCase() === nameToCheck &&
            parseFloat(ed.lat) === latToCheck &&
            parseFloat(ed.lng) === lngToCheck
        );
        if (inExcelData) return true;

        const inExcludedPoints = currentExcludedPoints.some(ep =>
            ep.urbanCityId === urbanCity?.id &&
            (ep.city_name || '').toString().toLowerCase() === nameToCheck &&
            parseFloat(ep.lat) === latToCheck &&
            parseFloat(ep.lng) === lngToCheck
        );
        if (inExcludedPoints) return true;

        return false;
    };

    const handleExcludeRow = (index) => {
        const item = currentData[index];
        if (item) {
            setConfirmationPopup({
                isOpen: true,
                title: "Exclude Rural City",
                message: `Are you sure you want to move "${item.city_name}" to the excluded list for this urban city?`,
                mode: "text",
                variant: "warning",
                confirmText: "Exclude",
                onConfirm: async () => {
                    try {
                        setLoading(true);
                        await axios.post(
                            `${API_URL}/geolocation/exclude-rural-city?unique_id=${moduleUniqueId}&req_for=edit`,
                            { name: item.city_name, lat: item.lat, lng: item.lng},
                            { headers: { ...authHeaderObj() } }
                        );
                        setExcelData(prev => prev.filter(c => c.city_name !== item.city_name || c.lat !== item.lat || c.lng !== item.lng));
                        await fetchExcludedCities();
                        dispatch(setAlert({ message: `"${item.city_name}" has been moved to the excluded list.`, type: 'success' }));
                    } catch (err) {
                        dispatch(setAlert({ message: err.response?.data?.message || 'Failed to exclude city.', type: 'error' }));
                    } finally {
                        setLoading(false);
                        setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                    }
                },
            });
        }
    };

    const handleRemoveRow = (index) => {
        const item = filteredData[index];
        if (item) {
            setConfirmationPopup({
                isOpen: true,
                title: "Remove Rural City",
                message: `Are you sure you want to remove "${item.city_name}" from this list?`,
                mode: "text",
                variant: "danger",
                confirmText: "Remove",
                onConfirm: () => {
                    setExcelData(prev => prev.filter(c => c.city_name !== item.city_name || c.lat !== item.lat || c.lng !== item.lng));
                    dispatch(setAlert({ message: `"${item.city_name}" removed from the list.`, type: 'info' }));
                    if (currentData.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                },
            });
        }
    };

    const handleIncludeNear = (index) => {
        setNearPoints((prev) => {
            const item = prev[index];
            if (!item) return prev;

            if (isCityAlreadyManaged(item, excelData, excludedPoints, ruralCities)) {
                dispatch(setAlert({
                    message: `${item.city_name || 'Location'} is already managed and was not added again.`,
                    type: 'warning'
                }));
                setExcludedPoints(excl => excl.filter(e => (e.city_name || '').toString().toLowerCase() !== (item.city_name || '').toString().toLowerCase()));
                return prev.filter((_, i) => i !== index);
            }

            const name = (item.city_name || '').toString().toLowerCase();
            setExcludedPoints((excl) => excl.filter(e => !((e.city_name || '').toString().toLowerCase() === name && e.urbanCityId === urbanCity?.id)));

            setExcelData((ex) => {
                const already = ex.some(e => (e.city_name || '').toString().toLowerCase() === name);
                if (already) return ex;
                return [...ex, { ...item, status: 'included' }];
            });

            dispatch(setAlert({ message: `${item.city_name || 'Location'} included in list`, type: 'success' }));
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        readXlsxFile(file).then(async (rows) => {
            if (rows.length === 0) {
                dispatch(setAlert({ message: "Excel file is empty", type: "error" }));
                e.target.value = "";
                return;
            }

            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] || "";
                });
                return obj;
            });

            // city_name is the only absolutely required column; lat/lng will be
            // looked up via geocoding if missing.
            const requiredColumns = ["city_name"];
            const columns = Object.keys(data[0] || {});

            const missingColumns = requiredColumns.filter(
                (col) => !columns.includes(col)
            );

            if (missingColumns.length > 0) {
                dispatch(
                    setAlert({
                        message: `Missing required column: ${missingColumns.join(", ")}`,
                        type: "error",
                    })
                );
                e.target.value = "";
                return;
            }

            // keep only rows that at least have a city_name
            let candidateData = data.filter((row) =>
                row.city_name && row.city_name.toString().trim() !== ""
            );

            // geocode any rows missing lat/lng
            candidateData = await Promise.all(candidateData.map(geocodeRow));

            const invalidRows = candidateData.filter(
                (row) => !row.lat || !row.lng
            );

            if (invalidRows.length > 0) {
                dispatch(
                    setAlert({
                        message:
                            "Some rows could not be geocoded (missing latitude/longitude) and will be skipped.",
                        type: "warning",
                    })
                );
            }

            // only keep rows where we have coordinates
            const usableData = candidateData.filter(
                (row) => row.lat && row.lng
            );

            const skippedFromUpload = [];

            const boundaryGeometry = boundaries?.[0]?.geometry || null;
            if (!boundaryGeometry) {
                setExcelData([]);
                setNearPoints(usableData.map((r) => ({ ...r, status: 'unknown' })));
                setFarPoints([]);
                setExcludedPoints([]);
                setCurrentPage(1);
                e.target.value = "";
                dispatch(
                    setAlert({
                        message:
                            "District boundary not loaded yet. Points cannot be validated. Please load the district boundary and re-upload, or review the nearby/unknown list.",
                        type: "warning",
                    })
                );
                return;
            }
            const thresholdMeters = 5000;

            const inside = [];
            const near = [];
            const far = [];

            const extractPaths = (geometry) => {
                if (!geometry?.coordinates) return [];
                const { type, coordinates } = geometry;
                if (type === "Polygon") {
                    return [coordinates.map(ring => ring.map(([lng, lat]) => ({ lat: parseFloat(lat), lng: parseFloat(lng) })))];
                } else if (type === "MultiPolygon") {
                    return coordinates.map(polygonCoordinates => polygonCoordinates.map(ring => ring.map(([lng, lat]) => ({ lat: parseFloat(lat), lng: parseFloat(lng) }))));
                }
                return [];
            };

            const pointInRing = (point, ring) => {
                let insideFlag = false;
                for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                    const xi = ring[i].lng, yi = ring[i].lat;
                    const xj = ring[j].lng, yj = ring[j].lat;
                    const intersect = ((yi > point.lat) !== (yj > point.lat)) && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi + 0.0) + xi);
                    if (intersect) insideFlag = !insideFlag;
                }
                return insideFlag;
            };

            const isPointInPolygon = (point, polygon) => {
                if (!polygon || polygon.length === 0) return false;
                if (!pointInRing(point, polygon[0])) return false;
                return !polygon.slice(1).some(hole => pointInRing(point, hole));
            };


            const pointToSegmentDistance = (p, v, w) => {
                const A = { lat: v.lat, lng: v.lng };
                const B = { lat: w.lat, lng: w.lng };
                const toRad = (x) => (x * Math.PI) / 180;
                const latFactor = 111320;
                const xA = (A.lng - p.lng) * Math.cos(toRad(p.lat)) * latFactor;
                const yA = (A.lat - p.lat) * latFactor;
                const xB = (B.lng - p.lng) * Math.cos(toRad(p.lat)) * latFactor;
                const yB = (B.lat - p.lat) * latFactor;
                const xP = 0, yP = 0;
                const dx = xB - xA, dy = yB - yA;
                const l2 = dx * dx + dy * dy;
                if (l2 === 0) return Math.sqrt((xP - xA) * (xP - xA) + (yP - yA) * (yP - yA));
                let t = ((xP - xA) * dx + (yP - yA) * dy) / l2;
                t = Math.max(0, Math.min(1, t));
                const projX = xA + t * dx;
                const projY = yA + t * dy;
                return Math.sqrt((xP - projX) * (xP - projX) + (yP - projY) * (yP - projY));
            };

            const distanceToGeometryMeters = (pt, geometry) => {
                if (!geometry) return Infinity;
                const paths = extractPaths(geometry);
                let minDist = Infinity;
                for (const polygon of paths) {
                    for (const ring of polygon) {
                        for (let i = 0; i < ring.length - 1; i++) {
                            minDist = Math.min(minDist, pointToSegmentDistance(pt, ring[i], ring[i + 1]));
                        }
                    }
                }
                return minDist;
            };

            for (const row of usableData) {
                if (isCityAlreadyManaged(row, excelData, excludedPoints, ruralCities)) {
                    skippedFromUpload.push(row);
                    continue;
                }

                const pt = { lat: +row.lat, lng: +row.lng };
                if (!boundaryGeometry) {
                    inside.push({ ...row, status: 'unknown' });
                    continue;
                }

                const polygons = extractPaths(boundaryGeometry);
                const isInside = polygons.some(polygon =>
                    isPointInPolygon(pt, polygon)
                );

                if (isInside) inside.push({ ...row, status: 'inside' });
                else {
                    const dist = distanceToGeometryMeters(pt, boundaryGeometry);
                    if (dist <= thresholdMeters) {
                        near.push({ ...row, status: 'near', distanceMeters: Math.round(dist) });
                    } else {
                        far.push({ ...row, status: 'far', distanceMeters: Math.round(dist) });
                    }
                }
            }

            setExcelData((prev) => {
                const names = new Set(prev.map(p => (p.city_name || '').toString().toLowerCase()));
                const toAdd = inside.filter(i => !names.has((i.city_name || '').toString().toLowerCase())).map(i => ({ ...i }));
                return [...prev, ...toAdd];
            });

            const allOutsidePoints = [...near, ...far].map((r) => ({ ...r }));
            setNearPoints(allOutsidePoints);
            setFarPoints(far.map((r) => ({ ...r })));
            setExcludedPoints(prev => prev.filter(ep => !allOutsidePoints.some(op => (op.city_name || '').toString().toLowerCase() === (ep.city_name || '').toString().toLowerCase())));

            if (far.length > 0) {
                dispatch(setAlert({ message: `${far.length} points are outside boundary. Review them in the Outside Boundary section.`, type: 'warning' }));
            }
            setCurrentPage(1);
            setExcludedCurrentPage(1);

            e.target.value = "";

            dispatch(
                setAlert({
                    message: `Successfully loaded ${inside.length} cities from Excel. ${near.length} nearby points require review. ${far.length} points were skipped. ${skippedFromUpload.length > 0
                        ? `${skippedFromUpload.length} cities were skipped because they are already managed. `
                        : ''}${invalidRows.length > 0
                        ? `${invalidRows.length} rows could not be geocoded and were ignored.`
                        : ''}`,
                    type: "success",
                })
            );
        }).catch((error) => {
            dispatch(setAlert({ message: "Error reading Excel file: " + error.message, type: "error" }));
            e.target.value = "";
        });
    };

    const handleAddSingleCity = () => {
        const { city_name, lat, lng } = singleCity;

        if (!city_name || !lat || !lng) {
            return dispatch(
                setAlert({
                    message: "Please fill all fields before adding.",
                    type: "error",
                })
            );
        }

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return dispatch(
                setAlert({
                    message: "Please enter valid latitude (-90 to 90) and longitude (-180 to 180)",
                    type: "error",
                })
            );
        }

        if (isCityAlreadyManaged(singleCity, excelData, excludedPoints, ruralCities)) {
            if (excludedPoints.some(ep => (ep.city_name || '').toString().toLowerCase() === (city_name || '').toString().toLowerCase() && ep.urbanCityId === urbanCity?.id)) {
                return dispatch(setAlert({ message: `City "${city_name}" is already in the excluded list.`, type: 'warning' }));
            }
            return dispatch(setAlert({ message: `City with name "${city_name}" already exists in the list.`, type: 'warning' }));
        }

        setIsAdding(true);

        setTimeout(() => {
            setExcelData((prev) => [...prev, { city_name, lat, lng }]);
            setSingleCity({ city_name: "", lat: "", lng: "", });
            setIsAdding(false);
            dispatch(setAlert({ message: "City added successfully!", type: "success", }));
        }, 500);
    };

    const handleBulkUpload = () => {
        if (excelData.length === 0) {
            dispatch(setAlert({ message: "No cities to upload. Please add cities first.", type: "warning", }));
            return;
        }

        setConfirmationPopup({
            isOpen: true,
            title: "Confirm Bulk Upload",
            message: `You are about to upload ${excelData.length} rural cities for ${urbanCity.name}. This action cannot be undone.`,
            mode: "text",
            variant: "warning",
            confirmText: `Upload ${excelData.length} Cities`,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    const payload = {
                        urban_city_id: urbanCity.id,
                        cities: excelData.map((city) => ({
                            name: city.city_name,
                            lat: city.lat,
                            lng: city.lng,
                        })),
                    };

                    await axios.post(
                        `${API_URL}/geolocation/add-rural-cities?unique_id=${moduleUniqueId}&req_for=add`,
                        payload,
                        { headers: { ...authHeaderObj() } }
                    );

                    dispatch(setAlert({ message: `${excelData.length} rural cities have been successfully uploaded.`, type: "success" }));

                    setExcelData([]);
                    setNearPoints([]);

                    await fetchSavedRuralCities();
                    await fetchExcludedCities();
                    setCurrentPage(1);

                } catch (err) {
                    console.error('Error during bulk upload:', err);
                    dispatch(setAlert({ message: err.response?.data?.message || 'Failed to upload cities.', type: 'error' }));
                } finally {
                    setLoading(false);
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };

    const handleIncludeFromExcluded = (index) => {
        const item = excludedCurrentData[index];
        if (!item) return;
        const name = (item.city_name || '').toString().toLowerCase();

        if (isCityAlreadyManaged(item, excelData, [], ruralCities)) {
            dispatch(setAlert({
                message: `${item.city_name || 'Location'} is already managed and was not added again.`,
                type: 'warning'
            }));
            setExcludedPoints(prev => prev.filter(e => !(e.urbanCityId === urbanCity?.id && (e.city_name || '').toString().toLowerCase() === name)));
            return;
        }

        setExcelData(prev => [...prev, { ...item, status: 'included' }]);
        setExcludedPoints(prev => prev.filter(e => !(e.urbanCityId === urbanCity?.id && (e.city_name || '').toString().toLowerCase() === name)));

        if (finalExcludedPoints.length % excludedItemsPerPage === 1 && excludedCurrentPage > 1) {
            setExcludedCurrentPage(excludedCurrentPage - 1);
        }

        dispatch(setAlert({ message: `${item.city_name || 'Location'} included from excluded list.`, type: 'success' }));
    };

    const handleRemoveExcluded = (index, cityId) => {
        const item = excludedCurrentData[index];
        if (!item) return;

        setConfirmationPopup({
            isOpen: true,
            title: "Delete Excluded Point",
            message: `Are you sure you want to permanently delete "${item.city_name}" from the excluded list?`,
            mode: "text",
            variant: "danger",
            confirmText: "Delete",
            onConfirm: async () => {
                if (!cityId) {
                    setExcludedPoints(prev => prev.filter(e => !(e.urbanCityId === urbanCity?.id && (e.city_name || '').toString().toLowerCase() === (item.city_name || '').toString().toLowerCase())));
                    if (excludedCurrentData.length === 1 && excludedCurrentPage > 1) {
                        setExcludedCurrentPage(excludedCurrentPage - 1);
                    }
                    dispatch(setAlert({ message: `"${item.city_name}" removed from list.`, type: 'info' }));
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                    return;
                }

                try {
                    setLoading(true);
                    await axios.delete(
                        `${API_URL}/geolocation/excluded-rural-city/${cityId}?unique_id=${moduleUniqueId}&req_for=delete`,
                        { headers: { ...authHeaderObj() } }
                    );

                    setExcludedPoints(prev => prev.filter(p => p.city_id !== cityId));
                    if (excludedCurrentData.length === 1 && excludedCurrentPage > 1) {
                        setExcludedCurrentPage(excludedCurrentPage - 1);
                    }
                    dispatch(setAlert({ message: `"${item.city_name}" has been permanently deleted.`, type: 'success' }));
                } catch (err) {
                    console.error('Error deleting excluded city:', err);
                    dispatch(setAlert({ message: err.response?.data?.message || 'Failed to delete excluded point.', type: 'error' }));
                } finally {
                    setLoading(false);
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };

    const handleExcludeCity = (cityName, lat, lng) => {
        if (!API_URL || !urbanCity?.id) return;

        setConfirmationPopup({
            isOpen: true,
            title: "Exclude City",
            message: `Are you sure you want to exclude "${cityName}" from this urban city?`,
            mode: "text",
            variant: "warning",
            confirmText: "Exclude",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await axios.post(
                        `${API_URL}/geolocation/exclude-rural-city?unique_id=${moduleUniqueId}&req_for=edit`,
                        { name: cityName, lat, lng },
                        { headers: { ...authHeaderObj() } }
                    );

                    setNearPoints(prev => prev.filter(p => (p.city_name || '').toString().toLowerCase() !== (cityName || '').toString().toLowerCase()));
                    setExcludedPoints(prev => [
                        ...prev,
                        {
                            city_name: cityName,
                            lat,
                            lng,
                            status: 'excluded',
                            urbanCityId: urbanCity?.id || null
                        }
                    ]);

                    dispatch(setAlert({ message: `"${cityName}" successfully excluded from this urban city.`, type: 'success' }));
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error('Error excluding city:', err);
                    dispatch(setAlert({ message: err.response?.data?.message || 'Failed to exclude city.', type: 'error' }));
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleExcludeFromSaved = (cityName, lat, lng) => {
        setConfirmationPopup({
            isOpen: true,
            title: "Exclude Saved City",
            message: `Are you sure you want to move "${cityName}" to the excluded list?`,
            mode: "text",
            variant: "warning",
            confirmText: "Exclude",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await axios.post(
                        `${API_URL}/geolocation/exclude-rural-city?unique_id=${moduleUniqueId}&req_for=edit`,
                        { name: cityName, lat, lng, urban_city_id: urbanCity.id },
                        { headers: { ...authHeaderObj() } }
                    );

                    await fetchSavedRuralCities();
                    await fetchExcludedCities();

                    dispatch(setAlert({ message: `"${cityName}" has been moved to the excluded list.`, type: 'success' }));
                } catch (err) {
                    console.error('Error excluding saved city:', err);
                    dispatch(setAlert({ message: err.response?.data?.message || 'Failed to exclude city.', type: 'error' }));
                } finally {
                    setLoading(false);
                    setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };

    const clearAllCities = () => {
        if (excelData.length === 0) return;

        setConfirmationPopup({
            isOpen: true,
            title: "Clear All Cities",
            message: `You are about to delete ${excelData.length} cities permanently.`,
            mode: "text",
            variant: "danger",
            confirmText: "Clear All",
            onConfirm: (otp) => {
                setExcelData([]);
                setCurrentPage(1);
                dispatch(setAlert({ message: "All cities cleared successfully", type: "success", }));
                setConfirmationPopup(prev => ({ ...prev, isOpen: false }));
            },
        });
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const requestSavedSort = (key) => {
        let direction = 'ascending';
        if (savedSortConfig.key === key && savedSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSavedSortConfig({ key, direction });
    };

    const requestExcludedSort = (key) => {
        let direction = 'ascending';
        if (excludedSortConfig.key === key && excludedSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setExcludedSortConfig({ key, direction });
    };

    const getSavedSortIcon = (key) => {
        if (savedSortConfig.key !== key) {
            return <FaSort className="text-text-secondary ml-1" />;
        }
        if (savedSortConfig.direction === 'ascending') {
            return <FaSortUp className="text-primary ml-1" />;
        }
        return <FaSortDown className="text-primary ml-1" />;
    };

    const getExcludedSortIcon = (key) => {
        if (excludedSortConfig.key !== key) {
            return <FaSort className="text-text-secondary ml-1" />;
        }
        if (excludedSortConfig.direction === 'ascending') {
            return <FaSortUp className="text-primary ml-1" />;
        }
        return <FaSortDown className="text-primary ml-1" />;
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <FaSort className="text-text-secondary ml-1" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <FaSortUp className="text-primary ml-1" />;
        }
        return <FaSortDown className="text-primary ml-1" />;
    };

    const sortedData = useMemo(() => {
        let sortableData = [...excelData];
        if (sortConfig.key) {
            sortableData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (sortConfig.key === 'lat' || sortConfig.key === 'lng') {
                    if (parseFloat(aVal) < parseFloat(bVal)) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (parseFloat(aVal) > parseFloat(bVal)) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                }

                if (aVal < bVal) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [excelData, sortConfig]);

    const filteredData = useMemo(() => {
        if (!searchQuery || searchQuery.trim() === "") return sortedData;
        const q = searchQuery.toString().toLowerCase().trim();
        return sortedData.filter(r => (r.city_name || "").toString().toLowerCase().includes(q));
    }, [sortedData, searchQuery]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(Number(value));
        setCurrentPage(1);
    };

    useEffect(() => {
        if (!urbanCity || !district || !stateData || !country) {
            navigate(location.pathname.replace("/rural-cities", ""));
            dispatch(setAlert({ message: "Missing location data. Redirected to setup location.", type: "error", }));
        }
    }, [urbanCity, district, stateData, country, navigate, dispatch]);

    useEffect(() => {
        if (!API_URL || !urbanCity?.id) return;

        let isMounted = true;

        const fetchRuralCities = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/geolocation/rural-cities/${urbanCity.id}?unique_id=${moduleUniqueId}&req_for=view`,
                    { headers: { ...authHeaderObj() }, }
                );

                if (!isMounted) return;
                const formatted = res.data.rural_cities.map((c) => ({
                    text: c.name,
                    value: c.id,
                    ...c,
                }));
                setRuralCities(formatted);
            } catch (err) {
                console.error("❌ Error fetching rural cities:", err);
                dispatch(setAlert({ message: "Failed to load rural cities.", type: "error", }));
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchRuralCities();
        return () => {
            isMounted = false;
        };
    }, [urbanCity?.id, API_URL]);

    const excludedForUrbanCity = excludedPoints.filter(e => e.urbanCityId === urbanCity?.id);

    const excludedNotInIncluded = excludedForUrbanCity.filter(ex => {
        const isInExcel = excelData.some(e => (e.city_name || '').toString().toLowerCase() === (ex.city_name || '').toString().toLowerCase());
        const isInNear = nearPoints.some(n => (n.city_name || '').toString().toLowerCase() === (ex.city_name || '').toString().toLowerCase());
        return !isInExcel && !isInNear;
    });

    const finalExcludedPoints = excludedNotInIncluded.filter(ex => {
        const isInRuralCities = ruralCities.some(rc =>
            (rc.name || '').toString().toLowerCase() === (ex.city_name || '').toString().toLowerCase() &&
            parseFloat(rc.lat) === parseFloat(ex.lat) &&
            parseFloat(rc.lng) === parseFloat(ex.lng)
        );
        return !isInRuralCities;
    });

    const markers = [
        ...excelData.map((c, idx) => ({
            lat: +c.lat,
            lng: +c.lng,
            status: 'included',
            title: c.city_name,
            isSelected: selectedRow?.type === 'included' && selectedRow?.index === idx,
            info: {
                name: c.city_name,
                type: 'Included City',
                lat: c.lat,
                lng: c.lng
            },
            onClick: () => {
                setSelectedMarker({
                    name: c.city_name,
                    type: 'Included City',
                    lat: c.lat,
                    lng: c.lng,
                    status: 'included'
                });
                setSelectedRow({ type: 'included', index: idx, data: c });
            }
        })),
        ...ruralCities.map((c, idx) => ({
            lat: +c.lat,
            lng: +c.lng,
            status: 'saved',
            title: c.name,
            isSelected: selectedRow?.type === 'rural' && selectedRow?.index === idx,
            info: {
                name: c.name,
                type: 'Saved City',
                lat: c.lat,
                lng: c.lng
            },
            onClick: () => {
                setSelectedMarker({
                    name: c.name,
                    type: 'Saved City',
                    lat: c.lat,
                    lng: c.lng,
                    status: 'included'
                });
                setSelectedRow({ type: 'rural', index: idx, data: c });
            }
        })),
        ...nearPoints.map((c, idx) => ({
            lat: +c.lat,
            lng: +c.lng,
            status: 'near',
            title: c.city_name,
            distanceMeters: c.distanceMeters,
            isSelected: selectedRow?.type === 'outside' && selectedRow?.index === idx,
            info: {
                name: c.city_name,
                type: c.status === 'far' ? 'Far Point' : 'Nearby Point',
                lat: c.lat,
                lng: c.lng,
                distance: `~${c.distanceMeters}m from border`
            },
            onClick: () => {
                setSelectedMarker({
                    name: c.city_name,
                    type: c.status === 'far' ? 'Far Point' : 'Nearby Point',
                    lat: c.lat,
                    lng: c.lng,
                    distance: `~${c.distanceMeters}m from border`,
                    status: c.status
                });
                setSelectedRow({ type: 'outside', index: idx, data: c });
            }
        })),
        ...finalExcludedPoints.map((c, idx) => ({
            lat: +c.lat,
            lng: +c.lng,
            status: 'excluded',
            title: c.city_name,
            isSelected: selectedRow?.type === 'excluded' && selectedRow?.index === idx,
            info: {
                name: c.city_name,
                type: 'Excluded',
                lat: c.lat,
                lng: c.lng
            },
            onClick: () => {
                setSelectedMarker({
                    name: c.city_name,
                    type: 'Excluded',
                    lat: c.lat,
                    lng: c.lng,
                    status: 'excluded'
                });
                setSelectedRow({ type: 'excluded', index: idx, data: c });
            }
        }))
    ];

    const excludedFilteredData = useMemo(() => {
        let sortableData = [...finalExcludedPoints];

        if (excludedSortConfig.key) {
            sortableData.sort((a, b) => {
                const aVal = a[excludedSortConfig.key];
                const bVal = b[excludedSortConfig.key];

                if (aVal < bVal) {
                    return excludedSortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return excludedSortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        if (!excludedSearchQuery || excludedSearchQuery.trim() === "") {
            return sortableData;
        }
        const q = excludedSearchQuery.toString().toLowerCase().trim();
        return sortableData.filter(r => (r.city_name || "").toString().toLowerCase().includes(q));

    }, [finalExcludedPoints, excludedSearchQuery, excludedSortConfig]);

    const excludedTotalPages = Math.ceil(excludedFilteredData.length / excludedItemsPerPage);
    const excludedStartIndex = (excludedCurrentPage - 1) * excludedItemsPerPage;
    const excludedEndIndex = Math.min(excludedStartIndex + excludedItemsPerPage, excludedFilteredData.length);
    const excludedCurrentData = excludedFilteredData.slice(excludedStartIndex, excludedEndIndex);

    const savedSortedData = useMemo(() => {
        let sortableData = [...ruralCities];
        if (savedSortConfig.key) {
            sortableData.sort((a, b) => {
                const aVal = a[savedSortConfig.key];
                const bVal = b[savedSortConfig.key];

                if (savedSortConfig.key === 'lat' || savedSortConfig.key === 'lng') {
                    if (parseFloat(aVal) < parseFloat(bVal)) return savedSortConfig.direction === 'ascending' ? -1 : 1;
                    if (parseFloat(aVal) > parseFloat(bVal)) return savedSortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                if (aVal < bVal) return savedSortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return savedSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [ruralCities, savedSortConfig]);

    const savedFilteredData = useMemo(() => {
        if (!savedSearchQuery || savedSearchQuery.trim() === "") return savedSortedData;
        const q = savedSearchQuery.toString().toLowerCase().trim();
        return savedSortedData.filter(r => (r.name || "").toString().toLowerCase().includes(q));
    }, [savedSortedData, savedSearchQuery]);

    const savedTotalPages = Math.ceil(savedFilteredData.length / savedItemsPerPage);
    const savedStartIndex = (savedCurrentPage - 1) * savedItemsPerPage;
    const savedEndIndex = savedStartIndex + savedItemsPerPage;
    const savedCurrentData = savedFilteredData.slice(savedStartIndex, savedEndIndex);

    useEffect(() => {
        if (!API_URL || !district?.id) return;
        let isMounted = true;

        const fetchDistrictBoundary = async () => {
            try {
                const res = await axios.post(
                    `${API_URL}/geolocation/district?unique_id=${moduleUniqueId}&req_for=view`,
                    { district: district.name, state: stateData?.name, country: country?.name },
                    { headers: { ...authHeaderObj() } }
                );

                if (!isMounted) return;
                const geo = res.data?.district || res.data?.geometry || res.data?.boundary || null;
                if (geo && geo.geometry) {
                    setBoundaries([{ id: district.id, level: 'district', geometry: geo.geometry }]);
                    setBoundaryFetched(true);

                    if (geo.lat && geo.lng) {
                        setMapCenter({ lat: +geo.lat, lng: +geo.lng });
                    } else {
                        const computeCenterFromGeometry = (g) => {
                            if (!g || !g.coordinates) return null;
                            const { type, coordinates } = g;
                            const coords = [];
                            if (type === 'Polygon') {
                                coordinates[0].forEach(([lng, lat]) => coords.push({ lat: +lat, lng: +lng }));
                            } else if (type === 'MultiPolygon') {
                                coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lng, lat]) => coords.push({ lat: +lat, lng: +lng }))));
                            }
                            if (coords.length === 0) return null;
                            const avg = coords.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
                            return { lat: avg.lat / coords.length, lng: avg.lng / coords.length };
                        };
                        const center = computeCenterFromGeometry(geo.geometry);
                        if (center) setMapCenter(center);
                    }
                } else {
                    setBoundaryFetched(true);
                }
            } catch (err) {
                console.error('Error fetching boundary for district:', err);
                setBoundaryFetched(true);
            }
        };

        fetchDistrictBoundary();
        return () => {
            isMounted = false;
        };
    }, [district?.id, stateData?.name, country?.name, API_URL]);

    const fetchSavedRuralCities = async () => {
        if (!API_URL || !urbanCity?.id) return;
        try {
            const res = await axios.get(`${API_URL}/geolocation/rural-cities/${urbanCity.id}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
            setRuralCities(res.data.rural_cities || []);
        } catch (err) {
            console.error("❌ Error fetching saved rural cities:", err);
            dispatch(setAlert({ message: "Failed to load saved rural cities.", type: "error" }));
        }
    };

    const fetchExcludedCities = async () => {
        if (!API_URL || !urbanCity?.id) return;
        let isMounted = true;
        try {
            const res = await axios.get(`${API_URL}/geolocation/excluded-rural-cities?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });

            if (!isMounted) return;
            const excludedData = res.data?.excluded_cities || [];

            setExcludedPoints(prev => {
                const existing = prev.filter(e => e.urbanCityId !== urbanCity?.id || e.fromApi !== true);

                const newData = excludedData.map(city => ({
                    city_id: city.id,
                    city_name: city.name || city.city_name,
                    lat: city.lat,
                    lng: city.lng,
                    status: 'excluded',
                    urbanCityId: urbanCity?.id,
                    fromApi: true
                }));

                const combined = [...existing];
                newData.forEach(newItem => {
                    const exists = combined.some(item =>
                        (item.city_name || '').toString().toLowerCase() === (newItem.city_name || '').toString().toLowerCase()
                    );
                    if (!exists) combined.push(newItem);
                });
                return combined;
            });
        } catch (err) {
            console.error('Error fetching excluded cities:', err);
        }
    };

    useEffect(() => {
        fetchSavedRuralCities();
        fetchExcludedCities();
    }, [urbanCity?.id, API_URL]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [filteredData.length, itemsPerPage]);

    useEffect(() => {
        if (excludedCurrentPage > excludedTotalPages && excludedTotalPages > 0) {
            setExcludedCurrentPage(excludedTotalPages);
        }
    }, [excludedFilteredData.length, excludedItemsPerPage]);

    useEffect(() => {
        if (savedCurrentPage > savedTotalPages && savedTotalPages > 0) {
            setSavedCurrentPage(savedTotalPages);
        }
    }, [savedFilteredData.length, savedItemsPerPage]);

    const renderPagination = (currentPage, totalPages, handlePageChange) => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <Button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    size="sm"
                    variant={currentPage === i ? "primary" : "ghost"}
                    className="min-w-10"
                >
                    {i}
                </Button>
            );
        }

        return pages;
    };    return (
        <div className="space-y-6">
            <PageHeader
                title={urbanCity?.name || "Rural Cities"}
                subtitle={`Manage rural cities and village boundaries within ${urbanCity?.name || 'the selected urban city'}.`}
                icon={FaHome}
                showBackButton={true}
                onBackClick={() => navigate(location.pathname.replace("/rural-cities", "/urban-cities"), {
                    state: { country, state: stateData, district },
                })}
                stats={[
                    { label: "Saved Cities", value: ruralCities.length, description: "In system" },
                    { label: "To Upload", value: excelData.length, description: "Included" },
                    { label: "Outside", value: nearPoints.length, description: "Review needed" },
                    { label: "Excluded", value: finalExcludedPoints.length, description: "Permanent" }
                ]}
            />

            <RenderIfPermission
                requiredUniqueId={moduleUniqueId}
                permission="edit"
                fallback={
                    <div className="card p-8 text-center">
                        <div className="w-20 h-20 rounded-xl bg-linear-to-br from-primary to-primary-end flex items-center justify-center mx-auto mb-4">
                            <FaBan className="text-white text-3xl" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h3>
                        <p className="text-text-secondary mb-4">You don't have permission to manage rural cities.</p>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* MAIN CONTENT GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* LEFT COLUMN - UPLOAD & MAP */}
                        <div className="md:col-span-2 xl:col-span-2 space-y-6">
                            {/* UPLOAD CARD */}
                            <UploadCard
                                boundaryFetched={boundaryFetched}
                                handleFile={handleFile}
                                excelData={excelData}
                            />

                            {/* MAP SECTION */}
                            <MapSection
                                isLoaded={isLoaded}
                                boundaryFetched={boundaryFetched}
                                markers={markers}
                                boundaries={boundaries}
                                mapCenter={mapCenter}
                                excelData={excelData}
                                nearPoints={nearPoints}
                                excludedForDistrict={excludedForUrbanCity}
                                selectedMarker={selectedMarker}
                                setSelectedMarker={setSelectedMarker}
                            />

                            {/* SINGLE CITY ADD FORM */}
                            <SingleCityForm
                                isAdding={isAdding}
                                singleCity={singleCity}
                                setSingleCity={setSingleCity}
                                onAddCity={handleAddSingleCity}
                                country={country}
                                stateData={stateData}
                                district={district}
                            />
                        </div>

                        {/* RIGHT COLUMN - STATS & OUTSIDE POINTS */}
                        <div className="md:col-span-2 xl:col-span-1 space-y-6">
                            {/* STATISTICS */}
                            {excelData.length > 0 && (
                                <div className="card p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                                            <FaChartLine className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-text-primary">Statistics</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                                            <span className="text-sm text-text-secondary">Total Cities</span>
                                            <span className="font-bold text-primary">{excelData.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                            <span className="text-sm text-text-secondary">Unique Names</span>
                                            <span className="font-bold text-success">{new Set(excelData.map(c => c.city_name)).size}</span>
                                        </div>
                                        <div className="p-2 bg-amber-50 rounded-lg">
                                            <span className="text-sm text-text-secondary block mb-1">Latitude Range</span>
                                            <span className="font-bold text-amber-600 text-sm">
                                                {Math.min(...excelData.map(c => parseFloat(c.lat))).toFixed(2)}° - {Math.max(...excelData.map(c => parseFloat(c.lat))).toFixed(2)}°
                                            </span>
                                        </div>
                                        <div className="p-2 bg-red-50 rounded-lg">
                                            <span className="text-sm text-text-secondary block mb-1">Longitude Range</span>
                                            <span className="font-bold text-danger text-sm">
                                                {Math.min(...excelData.map(c => parseFloat(c.lng))).toFixed(2)}° - {Math.max(...excelData.map(c => parseFloat(c.lng))).toFixed(2)}°
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OUTSIDE BOUNDARY POINTS */}
                            <OutsideBoundaryPoints
                                nearPoints={nearPoints}
                                selectedRow={selectedRow}
                                onPointClick={(p, i) => {
                                    setSelectedMarker({
                                        name: p.city_name,
                                        type: p.status === 'far' ? 'Far Point' : 'Nearby Point',
                                        lat: p.lat,
                                        lng: p.lng,
                                        distance: `~${p.distanceMeters}m from border`,
                                        status: p.status
                                    });
                                    setSelectedRow({ type: 'outside', index: i, data: p });
                                }}
                                onIncludeNear={handleIncludeNear}
                                onExcludeCity={handleExcludeCity}
                            />
                        </div>
                    </div>

                    {/* TAB NAVIGATION FOR DATA VIEWS */}
                    <div className="card overflow-hidden">
                        {/* TABS */}
                        <div className="flex border-b border-border overflow-x-auto">
                            <button
                                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'included' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                onClick={() => setActiveTab('included')}
                            >
                                Included Cities ({excelData.length})
                            </button>
                            <button
                                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'saved' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                onClick={() => setActiveTab('saved')}
                            >
                                Saved Cities ({ruralCities.length})
                            </button>
                            <button
                                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'excluded' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                onClick={() => setActiveTab('excluded')}
                            >
                                Excluded Points ({finalExcludedPoints.length})
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="p-5">
                            {activeTab === 'included' ? (
                                <>
                                    <IncludedCitiesTable
                                        currentData={currentData}
                                        sortConfig={sortConfig}
                                        searchQuery={searchQuery}
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        itemsPerPage={itemsPerPage}
                                        filteredData={filteredData}
                                        startIndex={startIndex}
                                        selectedRow={selectedRow}
                                        onSort={requestSort}
                                        onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                                        onPageChange={handlePageChange}
                                        onItemsPerPageChange={handleItemsPerPageChange}
                                        onRowClick={(row, idx) => {
                                            setSelectedMarker({
                                                name: row.city_name,
                                                type: 'Included City',
                                                lat: row.lat,
                                                lng: row.lng,
                                                status: 'included'
                                            });
                                            setSelectedRow({ type: 'included', index: idx, data: row });
                                        }}
                                        onDelete={handleRemoveRow}
                                        onExclude={handleExcludeRow}
                                        getSortIcon={getSortIcon}
                                        renderPagination={renderPagination}
                                        itemsPerPageOptions={itemsPerPageOptions}
                                    />

                                    {/* ACTION BUTTONS */}
                                    <div className="mt-6 pt-4 border-t border-border">
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={handleBulkUpload}
                                                disabled={excelData.length === 0}
                                                className="flex-1 bg-linear-120 from-primary to-primary-end"
                                                variant="success"
                                                leftIcon={<FaUpload className="mr-2" />}
                                            >
                                                Upload All ({excelData.length})
                                            </Button>
                                            <IconButton
                                                onClick={clearAllCities}
                                                disabled={excelData.length === 0}
                                                variant="danger"
                                                size="md"
                                                title="Clear all cities"
                                            >
                                                <FaTrash />
                                            </IconButton>
                                        </div>
                                    </div>
                                </>
                            ) : activeTab === 'saved' ? (
                                <SavedCities
                                    currentData={savedCurrentData}
                                    sortConfig={savedSortConfig}
                                    searchQuery={savedSearchQuery}
                                    currentPage={savedCurrentPage}
                                    totalPages={savedTotalPages}
                                    itemsPerPage={savedItemsPerPage}
                                    filteredData={savedFilteredData}
                                    startIndex={savedStartIndex}
                                    selectedRow={selectedRow}
                                    onSort={requestSavedSort}
                                    onSearchChange={(v) => { setSavedSearchQuery(v); setSavedCurrentPage(1); }}
                                    onPageChange={setSavedCurrentPage}
                                    onItemsPerPageChange={(val) => { setSavedItemsPerPage(val); setSavedCurrentPage(1); }}
                                    onRowClick={(row, idx) => {
                                        setSelectedRow({ type: 'rural', index: idx, data: row });
                                    }}
                                    onExclude={handleExcludeFromSaved}
                                    getSortIcon={getSavedSortIcon}
                                    renderPagination={renderPagination}
                                    rowType="rural"
                                    itemsPerPageOptions={savedItemsPerPageOptions}
                                />
                            ) : (
                                <ExcludedPointsList
                                    excludedCurrentData={excludedCurrentData}
                                    excludedFilteredData={excludedFilteredData}
                                    excludedCurrentPage={excludedCurrentPage}
                                    excludedTotalPages={excludedTotalPages}
                                    excludedSearchQuery={excludedSearchQuery}
                                    excludedItemsPerPage={excludedItemsPerPage}
                                    selectedRow={selectedRow}
                                    onSearchChange={(v) => {
                                        setExcludedSearchQuery(v);
                                        setExcludedCurrentPage(1);
                                    }}
                                    onPageChange={setExcludedCurrentPage}
                                    onItemsPerPageChange={(val) => {
                                        setExcludedItemsPerPage(val);
                                        setExcludedCurrentPage(1);
                                    }}
                                    onPointClick={(p, idx) => {
                                        setSelectedMarker({
                                            name: p.city_name,
                                            type: 'Excluded',
                                            lat: p.lat,
                                            lng: p.lng,
                                            status: 'excluded'
                                        });
                                        setSelectedRow({ type: 'excluded', index: idx, data: p });
                                    }}
                                    onIncludeFromExcluded={handleIncludeFromExcluded}
                                    onRemoveExcluded={handleRemoveExcluded}
                                    renderPagination={renderPagination}
                                    excludedItemsPerPageOptions={excludedItemsPerPageOptions}
                                    excludedForDistrict={finalExcludedPoints}
                                    onSort={requestExcludedSort}
                                    getSortIcon={getExcludedSortIcon}
                                />
                            )}
                        </div>
                    </div>

                    {/* Confirmation Popup */}
                    <ConfirmationPopup
                        isOpen={confirmationPopup.isOpen}
                        title={confirmationPopup.title}
                        message={confirmationPopup.message}
                        mode={confirmationPopup.mode}
                        variant={confirmationPopup.variant}
                        confirmText={confirmationPopup.confirmText || "Confirm"}
                        otpMessage={confirmationPopup.otpMessage}
                        onConfirm={confirmationPopup.onConfirm}
                        onCancel={() => setConfirmationPopup(prev => ({ ...prev, isOpen: false }))}
                        isLoading={loading}
                    />
                </div>
            </RenderIfPermission>

            {/* ✅ Saved Rural Cities View (show only when user doesn't have edit but has view) */}
            {!hasEditPermission && hasViewPermission && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="card p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                                <FaHome className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary">{urbanCity?.name}</h2>
                                <p className="text-text-secondary">Viewing saved rural cities</p>
                            </div>
                        </div>
                    </div>

                    {/* SAVED CITIES GRID */}
                    <div className="card p-5">
                        <SavedCities
                            currentData={savedCurrentData}
                            sortConfig={savedSortConfig}
                            searchQuery={savedSearchQuery}
                            currentPage={savedCurrentPage}
                            totalPages={savedTotalPages}
                            itemsPerPage={savedItemsPerPage}
                            filteredData={savedFilteredData}
                            startIndex={savedStartIndex}
                            selectedRow={selectedRow}
                            onSort={requestSavedSort}
                            onSearchChange={(v) => { setSavedSearchQuery(v); setSavedCurrentPage(1); }}
                            onPageChange={setSavedCurrentPage}
                            onItemsPerPageChange={(val) => { setSavedItemsPerPage(val); setSavedCurrentPage(1); }}
                            onRowClick={(row, idx) => {
                                setSelectedRow({ type: 'rural', index: idx, data: row });
                            }}
                            onExclude={() => { }}
                            getSortIcon={getSavedSortIcon}
                            renderPagination={renderPagination}
                            rowType="rural"
                            itemsPerPageOptions={savedItemsPerPageOptions}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}