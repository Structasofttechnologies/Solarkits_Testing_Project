import React, { useState } from 'react';
import {
  FaFileAlt, FaPlus, FaSearch, FaEye, FaEdit, FaTrash, FaCode, FaCheckCircle,
  FaTag, FaMobileAlt, FaDesktop, FaTimes
} from 'react-icons/fa';
import EmailStudio from './components/EmailStudio';
import { generateResponsiveEmailHtml, DEFAULT_EXECUTIVE_CREATIVE } from './services/emailTemplateGenerator';

export default function EmailTemplatesPage() {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  const [modalFormData, setModalFormData] = useState({
    emailSubject: 'Special Diwali Wholesale Offer: 3kW Commercial Solar Kit at ₹1,35,000',
    emailPreviewText: 'Exclusive wholesale allocation for verified EPC contractors.',
    ctaText: 'Claim Kit Offer & Apply Coupon',
    destinationUrl: 'https://solarkits.in/solar-kits/3kw-dcr',
    hasCoupon: true,
    couponCode: 'SOLARDIWALI5000',
    discountType: 'per_kit',
    discountValue: 5000,
    minOrderQty: 25,
    includeKitDetailsInCreative: true,
    customCreative: {
      headline: 'Diwali Mega B2B Solar Dhamaka',
      subheading: 'Flat ₹5,000 Off per Kit with Zero Delay Dispatches',
      themeColor: '#2563eb',
      mediaType: 'image',
      heroImageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      customBodyText: 'Exclusive wholesale allocation for verified EPC contractors. Claim pre-booked subsidy approved kits directly from certified regional depots with guaranteed zero dispatch delay.',
      bulletPoints: [
        'MNRE & ALMM Approved Tier-1 High Efficiency Modules',
        'Instant Depot Dispatch within 24 Hours with Transit Insurance',
        'Special Festive Cashback Credited Directly to B2B Wallet',
        'End-to-End Subsidy Portal Documentation Assistance'
      ],
      footerDisclaimer: 'Valid for verified GST-registered EPC contractors only. Minimum order quantity applies as per Solar Shop rules.'
    }
  });

  const [templates, setTemplates] = useState([
    {
      _id: 'et_qbits_solarkits_exec',
      name: 'Solar EPCs, This One is For You (Executive Qbits & SolarKits Layout)',
      subject: 'Solar EPCs, this one is for you - SolarKits B2B Wholesale Pricing',
      category: 'Executive Format',
      tags: ['Executive', 'Hybrid Backup', 'Qbits Layout', 'High Value'],
      updated_at: new Date().toISOString().slice(0, 10),
      sent_count: 14250,
      open_rate: '52.4%',
      click_rate: '24.8%',
      html: generateResponsiveEmailHtml({
        emailSubject: 'Solar EPCs, this one is for you - SolarKits B2B Wholesale Pricing',
        emailPreviewText: "Quote solar plus battery backup in one system. Don't just sell solar, sell complete backup with direct depot dispatch.",
        ctaText: 'Get SolarKits Pricing Today →',
        destinationUrl: 'https://solarkits.in/solar-kits',
        customCreative: DEFAULT_EXECUTIVE_CREATIVE
      })
    },
    {
      _id: 'et1',
      name: 'Commercial Kit 3kW Diwali Slashed Price Announcement',
      subject: 'Special Diwali Wholesale Offer: 3kW Commercial Solar Kit at ₹1,35,000',
      category: 'Promotional',
      tags: ['Commercial', '3kW', 'Diwali Offer'],
      updated_at: '2026-11-14',
      sent_count: 8420,
      open_rate: '44.2%',
      click_rate: '18.5%',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #263880;">
            <h2 style="color: #263880; margin: 0;">SOLARKITS INDIA</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">India's Leading Solar Kit Distribution Network</p>
          </div>
          <div style="padding: 24px 0;">
            <h3 style="color: #1e293b;">Dear {{name}},</h3>
            <p style="color: #475569; line-height: 1.6;">We are pleased to introduce our exclusive wholesale pricing on the <strong>{{kit_name}}</strong> for registered EPC partners in your cluster.</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
              <span style="font-size: 14px; color: #64748b; text-decoration: line-through;">₹1,55,000</span>
              <div style="font-size: 28px; font-weight: bold; color: #16a34a;">{{campaign_price}}</div>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Inclusive of GST • Bhiwandi Central Warehouse Dispatch</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <a href="{{tracking_url}}" style="background: #263880; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Kit & Order Now</a>
            </div>
          </div>
        </div>
      `
    },
    {
      _id: 'et2',
      name: 'Dubai Champions EPC Reward Program Progress Update',
      subject: 'You are only 5 Kits away from Qualifying for the Dubai EPC Trip!',
      category: 'Reward Program',
      tags: ['Rewards', 'Dubai Trip', 'High Value'],
      updated_at: '2026-11-10',
      sent_count: 3200,
      open_rate: '58.6%',
      click_rate: '26.4%',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #d97706;">🌟 Dubai EPC Champions 2026</h2>
          <p>Hello {{name}}, you have achieved 20 out of 25 qualifying kits. Book 5 more kits before Dec 31 to confirm your international ticket!</p>
          <a href="{{tracking_url}}" style="background: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Check Your Reward Status</a>
        </div>
      `
    },
    {
      _id: 'et3',
      name: 'Inactive EPC Reactivation & Welcome Back Coupon',
      subject: 'We Miss You! Here is an exclusive ₹10,000 voucher for your next order',
      category: 'Reactivation',
      tags: ['Reactivation', 'Coupon'],
      updated_at: '2026-11-02',
      sent_count: 5100,
      open_rate: '38.1%',
      click_rate: '14.2%',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h3>Welcome Back to SolarKits, {{name}}!</h3>
          <p>Use code <strong>WELCOMEBACK10K</strong> on any kit order above ₹2,00,000.</p>
        </div>
      `
    }
  ]);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveNewTemplate = () => {
    const cr = modalFormData.customCreative || {};
    const newTmpl = {
      _id: `et_${Date.now()}`,
      name: cr.headline || 'Custom Designed Executive Promotional Email',
      subject: modalFormData.emailSubject || 'Solar EPCs, this one is for you - SolarKits B2B Wholesale Pricing',
      category: 'Executive Format',
      tags: ['Custom', 'Wholesale', 'Executive Layout'],
      updated_at: new Date().toISOString().slice(0, 10),
      sent_count: 0,
      open_rate: '0%',
      click_rate: '0%',
      html: generateResponsiveEmailHtml(modalFormData)
    };
    setTemplates([newTmpl, ...templates]);
    setShowBuilderModal(false);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaFileAlt className="w-3.5 h-3.5" />
            <span>Email Creative Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Templates</h1>
          <p className="text-sm text-slate-500">Design, save and manage responsive HTML promotional email templates with dynamic tokens and live previews.</p>
        </div>

        <button
          onClick={() => setShowBuilderModal(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
        >
          <FaPlus /> Design New Email Template
        </button>
      </div>

      {/* Dynamic Token Quick Reference */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500 uppercase mr-2 flex items-center gap-1">
          <FaTag className="w-3 h-3 text-indigo-500" /> Supported Dynamic Tags:
        </span>
        {['{{name}}', '{{company_name}}', '{{kit_name}}', '{{coupon_code}}', '{{discount_value}}', '{{warehouse_name}}', '{{tracking_url}}'].map(tag => (
          <code key={tag} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-mono text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-600">
            {tag}
          </code>
        ))}
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
        <FaSearch className="text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search template title or subject line..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent border-none outline-hidden text-sm"
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(t => (
          <div key={t._id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {t.category}
                </span>
                <span className="text-[11px] text-slate-400">{t.updated_at}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{t.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4">Subject: <em>"{t.subject}"</em></p>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-center mb-4">
                <div>
                  <div className="text-[10px] text-slate-400">Open Rate</div>
                  <div className="text-sm font-bold text-emerald-600">{t.open_rate}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Click Rate</div>
                  <div className="text-sm font-bold text-indigo-600">{t.click_rate}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  setSelectedTemplate(t);
                  setShowModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FaEye className="text-blue-600" /> Preview HTML
              </button>
              <div className="flex items-center gap-2 text-slate-400">
                <button title="Edit" className="p-1.5 hover:text-indigo-600 cursor-pointer"><FaEdit /></button>
                <button title="Delete" className="p-1.5 hover:text-rose-600 cursor-pointer"><FaTrash /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* HTML Preview Modal with Desktop/Mobile Switcher */}
      {showModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedTemplate.name}</h3>
                <p className="text-xs text-slate-500">Live preview with sample dynamic variables resolved</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      previewDevice === 'desktop' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <FaDesktop /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      previewDevice === 'mobile' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <FaMobileAlt /> Mobile
                  </button>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-center">
              <div className={`transition-all ${previewDevice === 'mobile' ? 'w-[320px] border-4 border-slate-700 rounded-2xl p-2 bg-white' : 'w-full'}`}>
                <div dangerouslySetInnerHTML={{
                  __html: selectedTemplate.html
                    .replace(/{{name}}/g, 'Aarav Patel (SunVolt Solar)')
                    .replace(/{{kit_name}}/g, '3 kW TopCon Commercial Solar Kit')
                    .replace(/{{campaign_price}}/g, '₹1,35,000')
                    .replace(/{{tracking_url}}/g, 'https://solarkits.in/solar-kits/3kw-dcr')
                }} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Design New Email Template Modal with EmailStudio */}
      {showBuilderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaFileAlt className="text-blue-600" /> Email Template Studio & Visual Builder
                </h3>
                <p className="text-xs text-slate-500">Design email creatives, configure hero image/video, format body typography, embed kit specs, and preview live on desktop & mobile.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <EmailStudio
              formData={modalFormData}
              setFormData={setModalFormData}
              selectedKitObjects={[]}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewTemplate}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Save & Add to Email Templates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
