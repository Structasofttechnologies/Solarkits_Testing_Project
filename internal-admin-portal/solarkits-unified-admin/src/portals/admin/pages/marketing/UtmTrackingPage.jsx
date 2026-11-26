import React, { useState } from 'react';
import { FaLink, FaCopy, FaCheck, FaExternalLinkAlt, FaQrcode } from 'react-icons/fa';

const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://solarkits.in').replace(/\/+$/, '');

export default function UtmTrackingPage() {
  const [baseUrl, setBaseUrl] = useState(`${PUBLIC_SITE_URL}/franchisee`);
  const [source, setSource] = useState('whatsapp');
  const [medium, setMedium] = useState('campaign');
  const [campaign, setCampaign] = useState('franchisee_growth_2026');
  const [content, setContent] = useState('banner_roi_calculator');
  const [term, setTerm] = useState('epc_partner');
  const [shortCode, setShortCode] = useState('fr2026');
  const [copied, setCopied] = useState(false);

  const fullUrl = `${baseUrl}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}&utm_content=${content}&utm_term=${term}`;
  const shortUrl = `${PUBLIC_SITE_URL}/t/${shortCode}`;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FaLink className="w-3.5 h-3.5" />
          <span>Campaign Attribution & URL Generator</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign URL & UTM Tracking</h1>
        <p className="text-sm text-slate-500">
          Generate unique campaign tracking links, create branded short URLs for WhatsApp messages & track visitor touchpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Generator Form */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-lg font-bold">UTM Parameter Generator</h2>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Landing Page URL *</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">utm_source *</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="whatsapp">whatsapp</option>
                <option value="email">email</option>
                <option value="sms">sms</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">utm_medium *</label>
              <input
                type="text"
                value={medium}
                onChange={e => setMedium(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">utm_campaign *</label>
            <input
              type="text"
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">utm_content</label>
              <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Custom Short Code</label>
              <input
                type="text"
                value={shortCode}
                onChange={e => setShortCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Generated Links Preview Box */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-lg font-bold">Generated Short Tracking Link</h2>
            <p className="text-xs text-slate-500">Perfect for WhatsApp messages, SMS, and promotional button CTAs:</p>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>{shortUrl}</span>
              <button
                onClick={() => handleCopy(shortUrl)}
                className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
              >
                <FaCopy />
              </button>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Attribution Target URL:</h4>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-mono break-all text-slate-600 dark:text-slate-300">
                {fullUrl}
              </div>
            </div>

            {copied && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold text-center">
                ✓ Tracking Link copied to clipboard!
              </div>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
            <h4 className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
              Touchpoint & Multi-Touch Attribution:
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When an EPC or customer opens this tracking link, SolarKits captures the visitor session. If they subsequently fill any registered website form, both <strong>First-Touch Source</strong> and <strong>Last-Touch Campaign</strong> are preserved without overwriting lead history.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
