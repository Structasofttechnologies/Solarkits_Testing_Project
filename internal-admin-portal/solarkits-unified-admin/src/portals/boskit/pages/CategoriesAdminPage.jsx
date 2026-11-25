import React, { useState, useEffect } from "react";
import { FiLayers, FiSearch, FiRefreshCw } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/categories`);
      if (res.data?.success) {
        setCategories(res.data.data?.categories || []);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiLayers /> Taxonomy & Classification
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            BOSKIT Product Categories
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Component classifications for solar kits, mounting structures, protection switchgears, and wiring.
          </p>
        </div>
        <button
          onClick={loadCategories}
          className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading categories...
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  {cat.slug || "category"}
                </span>
                <span className="text-xs text-text-muted">{cat.products_count || 12} Products</span>
              </div>
              <h3 className="font-heading font-black text-lg text-text-primary">{cat.name}</h3>
              <p className="text-xs text-text-secondary">
                Certified component group for commercial and utility rooftop distribution.
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
