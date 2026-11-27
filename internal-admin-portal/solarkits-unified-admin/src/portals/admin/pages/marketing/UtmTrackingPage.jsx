import React, { useState, useEffect } from 'react';
import { FaLink, FaCopy, FaTrash, FaPlus, FaExternalLinkAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { marketingHttp, buildShortTrackingUrl, extractApiError } from './services/marketingApi';

export default function UtmTrackingPage() {
  const [title, setTitle] = useState('Franchisee Growth Campaign');
  const [baseUrl, setBaseUrl] = useState('https://solarkits.in/franchisee');
  const [source, setSource] = useState('whatsapp');
  const [medium, setMedium] = useState('campaign');
  const [campaign, setCampaign] = useState('franchisee_growth_2026');
  const [content, setContent] = useState('banner_roi_calculator');
  const [term, setTerm] = useState('epc_partner');
  const [shortCode, setShortCode] = useState('fr2026');

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [banner, setBanner] = useState(null);

  const params = new URLSearchParams();
  if (source) params.set('utm_source', source);
  if (medium) params.set('utm_medium', medium);
  if (campaign) params.set('utm_campaign', campaign);
  if (content) params.set('utm_content', content);
  if (term) params.set('utm_term', term);
  const sep = baseUrl.includes('?') ? '&' : '?';
  const fullUrl = params.toString() ? `${baseUrl}${sep}${params.toString()}` : baseUrl;
  const previewShortUrl = buildShortTrackingUrl(shortCode || 'link');

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/tracking-links');
      if (res.data?.success) {
        setLinks(res.data.data || []);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to fetch tracking links') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleCopy = (text, key = 'preview') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!baseUrl.trim() || !shortCode.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      await marketingHttp.post('/tracking-links', {
        title: title.trim() || campaign.trim() || shortCode.trim(),
        short_code: shortCode.trim(),
        base_url: baseUrl.trim(),
        utm_source: source.trim(),
        utm_medium: medium.trim(),
        utm_campaign: campaign.trim(),
        utm_content: content.trim(),
        utm_term: term.trim()
      });
      setBanner({ type: 'success', text: `Tracking link "/api/marketing/t/${shortCode.trim()}" saved and live in MongoDB!` });
      await loadLinks();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Could not save tracking link') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (id) => {
    if (!window.confirm('Delete this custom short tracking link?')) return;
    try {
      await marketingHttp.delete(`/tracking-links/${id}`);
      await loadLinks();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to delete tracking link') });
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FaLink className="w-3.5 h-3.5" />
          <span>Campaign Attribution & URL Generator</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign URL & UTM Tracking</h1>
        <p className="text-sm text-slate-500">Generate, persist, and monitor tracked short URLs resolved live by `/api/marketing/t/:code`.</p>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {banner.type === 'error' ? <FaExclamationTriangle className="shrink-0" /> : <FaCheckCircle className="shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSaveLink} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-lg font-bold">Create Tracked Short URL</h2>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Link Label / Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Landing Page URL *</label>
            <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">utm_source *</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
                <option value="whatsapp">whatsapp</option>
                <option value="email">email</option>
                <option value="sms">sms</option>
                <option value="partner_portal">partner_portal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">utm_medium *</label>
              <input type="text" value={medium} onChange={(e) => setMedium(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">utm_campaign *</label>
            <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">utm_content</label>
              <input type="text" value={content} onChange={(e) => setContent(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Custom Short Code *</label>
              <input type="text" value={shortCode} onChange={(e) => setShortCode(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" required />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            <FaPlus /> {saving ? 'Saving...' : 'Save & Activate Tracking Link'}
          </button>
        </form>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-lg font-bold">Live Short Tracking Link</h2>
            <p className="text-xs text-slate-500">Every click logs IP, User-Agent, and UTM tags in `marketing_utm_visits` before redirecting:</p>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between gap-2 break-all">
              <span>{previewShortUrl}</span>
              <button type="button" onClick={() => handleCopy(previewShortUrl, 'preview')} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 shrink-0 cursor-pointer">
                <FaCopy />
              </button>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Resolved Destination URL:</h4>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-mono break-all text-slate-600 dark:text-slate-300">{fullUrl}</div>
            </div>

            {copiedKey === 'preview' && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold text-center">Tracking Link copied to clipboard!</div>
            )}
          </div>
        </div>
      </div>

      {/* Persisted Tracking Links Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-lg font-bold">Active Tracking Links ({links.length})</h2>
        {loading ? (
          <div className="text-xs text-slate-400 py-6 text-center">Loading saved tracking links...</div>
        ) : links.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">No tracking links recorded yet. Save one above or launch a campaign.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-3">Title & Source</th>
                  <th className="py-3 px-3">Short URL</th>
                  <th className="py-3 px-3">UTM Campaign</th>
                  <th className="py-3 px-3">Clicks</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {links.map((l) => (
                  <tr key={l._id}>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{l.title}</div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">{l.source === 'campaign' ? 'Campaign Link' : 'Custom Link'}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-indigo-600 dark:text-indigo-400">
                      <a href={l.short_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        /t/{l.short_code} <FaExternalLinkAlt className="w-2.5 h-2.5" />
                      </a>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{l.utm_campaign || '-'}</td>
                    <td className="py-3 px-3 font-bold">{l.clicks || 0}</td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button type="button" onClick={() => handleCopy(l.short_url, l._id)} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer">
                        {copiedKey === l._id ? 'Copied' : 'Copy'}
                      </button>
                      {l.source === 'custom_link' && (
                        <button type="button" onClick={() => handleDeleteLink(l._id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete">
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
