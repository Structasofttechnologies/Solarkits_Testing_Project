import React, { useState } from 'react';
import {
  FaWhatsapp, FaPlus, FaCheckCircle, FaClock, FaTimesCircle, FaMobileAlt,
  FaSyncAlt, FaDesktop, FaTimes
} from 'react-icons/fa';
import WhatsAppStudio from './components/WhatsAppStudio';

export default function WhatsAppTemplatesPage() {
  const [selected, setSelected] = useState(0);
  const [previewDevice, setPreviewDevice] = useState('mobile'); // 'mobile' | 'desktop'
  const [showBuilderModal, setShowBuilderModal] = useState(false);

  const [modalFormData, setModalFormData] = useState({
    ctaText: 'Claim Kit Offer',
    couponCode: 'SOLARDIWALI5000',
    discountValue: 5000,
    destinationUrl: 'https://solarkits.in/solar-kits/3kw-dcr',
    customCreative: {
      whatsapp: {
        body: '⚡ *Exclusive EPC Wholesale Alert!*\n\nHello {{first_name}},\n\nClaim flat {{discount_value}} on {{product_name}} directly dispatched from {{warehouse_name}}.\n\nUse coupon *{{coupon_code}}*.\n\nClick below to book your kits:',
        mediaType: 'document',
        mediaDetails: {
          name: 'Product Brochure.pdf',
          size: '2.4 MB'
        },
        buttons: [
          { id: 'btn_1', type: 'url', text: '📦 View Kit Online', url: '{{checkout_link}}' },
          { id: 'btn_2', type: 'call', text: '📞 Call Sales Desk', phone: '+919913421453' }
        ]
      }
    }
  });

  const [templates, setTemplates] = useState([
    {
      _id: 'wt1',
      name: 'solarkits_epc_promotional_v1',
      displayName: 'Commercial Kit Wholesale Discount Offer',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      header: 'IMAGE',
      headerUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=500',
      body: 'Hello {{1}},\n\nExclusive Solar EPC Alert! ⚡\n\nWe have slashed bulk wholesale pricing for the {{2}} at your nearest Bhiwandi Central Warehouse.\n\nApproved Price: {{3}}\nValid until: 30th November 2026\n\nClick below to reserve your delivery slot:',
      footer: 'SolarKits India • Authorized Solar Distribution Network',
      buttons: [
        { type: 'URL', text: '📦 View Kit Online', url: 'https://solarkits.in/t/mh3kw' },
        { type: 'PHONE_NUMBER', text: '📞 Call Sales Manager', phone: '+919913421453' }
      ]
    },
    {
      _id: 'wt2',
      name: 'solarkits_reward_trip_alert',
      displayName: 'Dubai EPC Champions Trip Qualification',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      header: 'TEXT',
      headerText: '🌟 Dubai EPC Champions 2026 Update',
      body: 'Dear {{1}},\n\nYou are just {{2}} kits away from winning an all-expenses-paid trip to Dubai!\n\nCurrent Qualifying Purchases: {{3}} Kits\nTarget: 25 Kits\n\nOrder today to claim your ticket before the program closes:',
      footer: 'SolarKits Rewards Team',
      buttons: [
        { type: 'URL', text: '✈️ View Reward Leaderboard', url: 'https://solarkits.in/rewards/dubai' }
      ]
    },
    {
      _id: 'wt3',
      name: 'solarkits_cart_recovery_reminder',
      displayName: 'Abandoned Cart 24-Hour Reminder',
      category: 'UTILITY',
      language: 'en',
      status: 'APPROVED',
      header: 'NONE',
      body: 'Hello {{1}},\n\nYou left items in your SolarKits wholesale cart: {{2}}.\n\nComplete your checkout within 24 hours to secure warehouse stock reservation.',
      footer: 'SolarKits Checkout Desk',
      buttons: [
        { type: 'URL', text: '🛒 Complete Purchase', url: 'https://solarkits.in/cart' }
      ]
    }
  ]);

  const curr = templates[selected];

  const handleSaveNewTemplate = () => {
    const wa = modalFormData.customCreative?.whatsapp || {};
    const newTmpl = {
      _id: `wt_${Date.now()}`,
      name: `solarkits_custom_${Date.now().toString().slice(-4)}`,
      displayName: 'Custom Designed WhatsApp Campaign Template',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      header: wa.mediaType === 'image' ? 'IMAGE' : 'NONE',
      headerUrl: wa.mediaDetails?.url || '',
      body: wa.body || '',
      footer: 'SolarKits India • Authorized Solar Distribution Network',
      buttons: (wa.buttons || []).map(b => ({
        type: b.type === 'call' ? 'PHONE_NUMBER' : 'URL',
        text: b.text,
        url: b.url || 'https://solarkits.in',
        phone: b.phone || '+919913421453'
      }))
    };
    setTemplates([newTmpl, ...templates]);
    setSelected(0);
    setShowBuilderModal(false);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaWhatsapp className="w-3.5 h-3.5" />
            <span>Meta Approved Message Templates</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">WhatsApp Message Templates</h1>
          <p className="text-sm text-slate-500">Manage Meta Cloud API approved templates with media headers, dynamic parameters, and call-to-action buttons.</p>
        </div>

        <button
          onClick={() => setShowBuilderModal(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
        >
          <FaPlus /> Design New Meta Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Templates List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Templates ({templates.length})</div>

          <div className="space-y-3">
            {templates.map((t, idx) => (
              <div
                key={t._id}
                onClick={() => setSelected(idx)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                  selected === idx
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{t.name}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <FaCheckCircle className="w-2.5 h-2.5" /> {t.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t.displayName}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{t.body.replace(/\{\{\d\}\}/g, '[Variable]')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Smartphone / Desktop Interactive Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-3">
            {/* Device Switcher */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-2">Preview Mode:</span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FaMobileAlt /> Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FaDesktop /> Desktop
                </button>
              </div>
            </div>

            <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'w-[320px]' : 'w-full'}`}>
              <div className={`border-4 border-slate-800 bg-slate-900 p-3 shadow-2xl relative ${
                previewDevice === 'mobile' ? 'rounded-[42px]' : 'rounded-2xl'
              }`}>
                {/* Notch (mobile only) */}
                {previewDevice === 'mobile' && (
                  <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2"></div>
                )}

                {/* Screen Header */}
                <div className="bg-[#075E54] text-white p-3 rounded-2xl flex items-center gap-2 mb-3 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">SK</div>
                  <div>
                    <div className="text-xs font-bold leading-tight">SolarKits B2B Official</div>
                    <div className="text-[10px] text-emerald-200">Verified Business Account • online</div>
                  </div>
                </div>

                {/* Chat Bubble Area */}
                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-2xl p-3 min-h-[380px] flex flex-col justify-end text-slate-900 dark:text-slate-100 text-xs">
                  <div className="bg-[#DCF8C6] dark:bg-[#005c4b] rounded-2xl rounded-tr-xs p-3 shadow-md space-y-2 border border-slate-200/50 dark:border-slate-700/50">
                    {curr.header === 'IMAGE' && (
                      <div className="rounded-xl overflow-hidden h-28 bg-slate-200">
                        <img src={curr.headerUrl} alt="Header" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {curr.header === 'TEXT' && (
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{curr.headerText}</div>
                    )}

                    <div className="text-[11px] whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-100">
                      {curr.body
                        .replace('{{1}}', 'Aarav Patel')
                        .replace('{{2}}', '3 kW TopCon Solar Kit')
                        .replace('{{3}}', '₹1,35,000')}
                    </div>

                    {curr.footer && (
                      <div className="text-[9px] text-slate-500 dark:text-emerald-200/70 border-t border-black/10 dark:border-white/10 pt-1">
                        {curr.footer}
                      </div>
                    )}

                    {/* Interactive Buttons */}
                    {curr.buttons && (
                      <div className="pt-1 space-y-1.5 border-t border-black/10 dark:border-white/10">
                        {curr.buttons.map((b, i) => (
                          <div
                            key={i}
                            className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] text-center border border-slate-200 dark:border-slate-700 shadow-2xs"
                          >
                            {b.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 mt-2 font-mono truncate">
                  Template: {curr.name}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Full-Screen Design New Meta Template Modal with WhatsAppStudio */}
      {showBuilderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaWhatsapp className="text-emerald-600" /> WhatsApp Template Studio & Visual Builder
                </h3>
                <p className="text-xs text-slate-500">Design message elements, insert variables, add interactive reply buttons, and preview live on mobile & desktop.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <WhatsAppStudio
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
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Save & Add to Meta Templates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
