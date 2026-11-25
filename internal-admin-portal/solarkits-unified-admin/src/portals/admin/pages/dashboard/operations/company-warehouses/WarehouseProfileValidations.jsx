import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import WarehouseProfileSections from "./components/WarehouseProfileSections";
import WarehouseProfileSection from "./components/WarehouseProfileSection";
import Loader from "@/components/Loader";
import { useHasPermission } from "@/components/PermissionCheck";

export default function WarehouseProfileValidations({ moduleUniqueId }) {
  const { warehouseId: id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate("/admin-panel/operations/company-warehouses");
      return;
    }
    fetchWarehouse(id);
  }, [id]);

  const fetchWarehouse = async (id) => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/warehouses/${id}?unique_id=${moduleUniqueId}&req_for=view`,
        {
          headers: {
            ...authHeaderObj(),
          },
        }
      );

      if (res.data.status !== "success" || !res.data.warehouse) {
        navigate("/admin-panel/operations/company-warehouses");
        return;
      }

      setData(res.data.warehouse);

    } catch (error) {
      console.log(error);
      navigate("/admin-panel/operations/company-warehouses");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader text="Loading warehouse profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/" element={<WarehouseProfileSections moduleUniqueId={moduleUniqueId} />} />
        <Route path="/:sectionId" element={<WarehouseProfileSection moduleUniqueId={moduleUniqueId} />} />
      </Routes>
    </div>
  );
}
