import React, { useState, useEffect } from 'react';
import {
  FiFileText,
  FiPlusCircle,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiEye,
  FiSearch,
  FiRefreshCw,
  FiExternalLink,
} from 'react-icons/fi';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ContentManagementPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState('all');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'desktop_banner',
    display_position: 'hero',
    media_url: '',
    cta_text: 'Explore Catalogue',
    cta_url: '/products',
    priority: 10,
    status: 'published',
  });
  const [saving, setSaving] = useState(false);

  const fetchContent = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/boskit/v1/admin/content`, {
        params: {
          position: selectedPos !== 'all' ? selectedPos : undefined,
          search: search || undefined,
        },
      })
      .then((res) => {
        if (res.data?.success) setItems(res.data.items || []);
      })
      .catch((err) => console.error('Error loading content:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContent();
  }, [selectedPos, search]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editItem) {
        await axios.put(`${API_BASE}/boskit/v1/admin/content/${editItem.id}`, formData);
      } else {
        await axios.post(`${API_BASE}/boskit/v1/admin/content`, formData);
      }
      setShowModal(false);
      setEditItem(null);
      fetchContent();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this marketing content item?')) return;
    try {
      await axios.delete(`${API_BASE}/boskit/v1/admin/content/${id}`);
      fetchContent();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary">
            Content & Marketing Management
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Manage promotional hero banners, marketing announcements, and product spotlight campaigns across BOSKIT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditItem(null);
              setFormData({
                title: '',
                description: '',
                content_type: 'desktop_banner',
                display_position: 'hero',
                media_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
                cta_text: 'Apply for Dealership',
                cta_url: '/distributor',
                priority: 10,
                status: 'published',
              });
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 cursor-pointer transition-all"
          >
            <FiPlusCircle size={16} /> Create Content Item
          </button>
          <button
            onClick={fetchContent}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-text-primary border border-border shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FiRefreshCw className={loading ? 'animate-spin text-primary' : 'text-primary'} />
          </button>
        </div>
      </div>

      {/* Position Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', name: 'All Positions' },
          { id: 'hero', name: 'Hero Banners' },
          { id: 'announcement', name: 'Announcement Bar' },
          { id: 'promotional', name: 'Promo Highlights' },
          { id: 'footer', name: 'Footer Features' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedPos(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedPos === tab.id
                ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-text-muted">Loading CMS content...</div>
        ) : items.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-text-muted">
            No content items created for this filter. Click "Create Content Item" to add marketing banners.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    {item.display_position}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {item.media_url && (
                  <div className="h-36 rounded-xl bg-surface-hover overflow-hidden border border-border">
                    <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <h3 className="font-heading font-bold text-base text-text-primary">{item.title}</h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{item.description}</p>
                </div>

                {item.cta_text && (
                  <div className="text-xs text-text-secondary font-semibold flex items-center gap-1">
                    <span>CTA: {item.cta_text}</span>
                    <span className="text-text-muted font-mono text-[10px]">({item.cta_url})</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-text-muted font-mono">Priority: {item.priority}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditItem(item);
                      setFormData({
                        title: item.title,
                        description: item.description || '',
                        content_type: item.content_type,
                        display_position: item.display_position,
                        media_url: item.media_url || '',
                        cta_text: item.cta_text || '',
                        cta_url: item.cta_url || '',
                        priority: item.priority || 10,
                        status: item.status || 'published',
                      });
                      setShowModal(true);
                    }}
                    className="p-2 text-text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                  >
                    <FiEdit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-text-secondary hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-heading font-bold text-lg text-text-primary">
              {editItem ? 'Edit Content Item' : 'Create New Marketing Item'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-text-primary font-semibold block mb-1">Headline Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Master Solar Distribution Program"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-text-primary font-semibold block mb-1">Description / Subtitle</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Supporting marketing message..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-primary font-semibold block mb-1">Display Position</label>
                  <select
                    value={formData.display_position}
                    onChange={(e) => setFormData({ ...formData, display_position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                  >
                    <option value="hero">Hero Banners</option>
                    <option value="announcement">Announcement Bar</option>
                    <option value="promotional">Promo Highlights</option>
                    <option value="footer">Footer</option>
                  </select>
                </div>
                <div>
                  <label className="text-text-primary font-semibold block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-text-primary font-semibold block mb-1">Media Image URL</label>
                <input
                  type="url"
                  value={formData.media_url}
                  onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-primary font-semibold block mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    placeholder="e.g. Join Network"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-primary font-semibold block mb-1">CTA Action URL</label>
                  <input
                    type="text"
                    value={formData.cta_url}
                    onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                    placeholder="/distributor"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-hover/50 border border-border text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-surface-hover cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

