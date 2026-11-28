import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBullhorn,
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaCheckCircle,
  FaEnvelope,
  FaWhatsapp,
  FaUsers,
  FaMapMarkerAlt,
  FaCogs,
  FaCalendarAlt,
  FaEye,
  FaExclamationTriangle,
  FaPaperPlane,
  FaInfoCircle,
  FaTag,
  FaWarehouse,
  FaChartLine,
  FaClock,
  FaEdit,
  FaRocket,
  FaShieldAlt,
  FaBoxes,
  FaCoins,
  FaPlus,
  FaTimes,
  FaGift,
  FaExternalLinkAlt,
  FaFilter,
  FaLayerGroup,
  FaMapPin,
  FaUserPlus,
  FaStore,
  FaVideo,
  FaImage,
  FaPlay,
  FaListUl,
  FaBan,
  FaLandmark
} from 'react-icons/fa';
import IndiaTargetingMap from './components/IndiaTargetingMap';
import WhatsAppStudio from './components/WhatsAppStudio';
import EmailStudio from './components/EmailStudio';
import { marketingHttp, extractApiError } from './services/marketingApi';
import { generateResponsiveEmailHtml } from './services/emailTemplateGenerator';
import {
  CAMPAIGN_OBJECTIVES,
  fetchAreaKits,
  fetchMarketingMasterResources,
  fetchLiveQueueStatus,
  fetchLiveGovtTenderConfigs,
  fetchMarketingStates,
  fetchMarketingDistricts,
  fetchSegments
} from './services/marketingDataService';

const WIZARD_STEPS = [
  { id: 1, label: 'Details & Senders', icon: FaBullhorn, desc: 'Identity, channel, owner & senders' },
  { id: 2, label: 'Area & Audience', icon: FaMapMarkerAlt, desc: 'States, clusters, segments & consent' },
  { id: 3, label: 'Purpose, Kits & Coupon', icon: FaGift, desc: 'Objective, area kits & OfferMaster' },
  { id: 4, label: 'Creative Studio', icon: FaCogs, desc: 'WhatsApp & Email template studio' },
  { id: 5, label: 'MIS Targets', icon: FaChartLine, desc: 'Pipeline goals & conversion targets' },
  { id: 6, label: 'Schedule & Suppression', icon: FaCalendarAlt, desc: 'Timing, frequency & smart stop rules' },
  { id: 7, label: 'Review & Launch', icon: FaRocket, desc: 'Live test send & database dispatch' }
];

export default function CreateCampaignWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [creativeChannelTab, setCreativeChannelTab] = useState('WHATSAPP');

  // Live master resources, segment groups & govt tender configs from MongoDB
  const [clustersList, setClustersList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [activeStatesList, setActiveStatesList] = useState([]);
  const [liveKitsCatalog, setLiveKitsCatalog] = useState([]);
  const [ownersList, setOwnersList] = useState([]);
  const [industriesList, setIndustriesList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [sendersList, setSendersList] = useState([]);
  const [dbTemplates, setDbTemplates] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);
  const [segmentGroupsList, setSegmentGroupsList] = useState([]);
  const [marketingStates, setMarketingStates] = useState([]);
  const [segmentDistricts, setSegmentDistricts] = useState([]);
  const [selectedSegmentStateId, setSelectedSegmentStateId] = useState('');
  const [govtTenderConfigsList, setGovtTenderConfigsList] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Live audience preview & submission state
  const [audiencePreview, setAudiencePreview] = useState({
    total_eligible: 0,
    total_excluded: 0,
    unsubscribed_skipped: 0,
    consent_skipped: 0,
    sample_preview: [],
    consent_breakdown: { email_consented: 0, whatsapp_consented: 0, total_accounts: 0, imported_leads: 0 }
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Real test send state
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Details, Owner, Budget & Senders
    campaignName: '',
    assigned_manager: '',
    owner: '',
    budget: 0,
    channel: 'BOTH', // EMAIL | WHATSAPP | BOTH
    status: 'draft',
    email_sender_id: '',
    whatsapp_sender_id: '',

    // Step 2: Multi-Area, Segment & Audience
    segment_id: '',
    selectedStates: [],
    selectedClusterIds: [],
    servingWarehouses: [],
    locationBasis: 'registered',
    inactivityWindow: 'all',
    industryPreference: 'ALL',
    require_consent: true,
    include_imported_leads: true,
    audienceGroups: {
      registered: true,
      verified: true,
      buyer: true
    },
    selectedSegmentIds: [],
    segmentStateFilter: '',
    segmentDistrictFilter: '',

    // Step 3: Purpose, Kits & Coupon Engine
    objective: 'seasonal_coupon',
    destinationUrl: 'https://solarkits.in/solar-kits?utm_source=solarkits_marketing',
    ctaText: 'Apply Coupon & Claim Kit Offer',
    selectedKitIds: [],
    kitMoqs: {},
    hasCoupon: false,
    coupon_offer_id: '',
    couponCode: '',
    discountType: 'per_kit', // 'flat' | 'per_kit' | 'percent'
    discountValue: 5000,
    minOrderQty: 1,
    includeKitDetailsInCreative: true,
    couponExpiry: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 16),
    singleUsePerEpc: true,
    deactivateOnCampaignEnd: true,

    // Step 4: Creative & Message Template Studio
    templateMode: 'custom', // 'preset' | 'custom'
    selectedWhatsAppTemplateId: '',
    selectedEmailTemplateId: '',
    emailSubject: 'Exclusive SolarKits B2B Wholesale Kit Offer',
    customCreative: {
      headline: "DON'T JUST SELL SOLAR. SELL COMPLETE BACKUP.",
      subheading: 'Tier-1 ALMM Modules + High-Efficiency Inverters + Pre-Engineered Structure in One Single Dispatch.',
      themeColor: '#263880',
      accentColor: '#f59e0b',
      stripColor: '#ea580c',
      contactPhone: '+91 99134 21453',
      contactWebsite: 'solarkits.in',
      categoryTag: 'B2B WHOLESALE KITS BY SOLARKITS',
      h1Title: 'Solar EPCs, this one is for you.',
      mediaType: 'banner',
      heroImageUrl: '',
      videoUrl: '',
      customBodyText: 'Your customers want rooftop solar that keeps the power running during grid outages too. With SolarKits Pre-Engineered Hybrid & DCR Combos, quote solar plus battery storage in one complete package and win projects that on-grid-only EPCs lose.',
      valuePills: [
        '1. Add Backup to Quotes',
        '2. Higher Ticket Size',
        '3. Depot Support'
      ],
      bulletPoints: [
        'Higher Project Value & Margin: Sell complete combo (Panels + Inverter + Battery + Structure) in one order and maximize ticket size.',
        'Win More Quotes Against Competitors: Deliver unmatched power cut reliability with up to 98% inverter efficiency and guaranteed MNRE & ALMM compliance.',
        'Free Engineering Tools & Technical Helpdesk: Instant access to CAD drawings, SLDs, datasheets, sizing tools, and direct dedicated technical support.',
        'Regional Depots & Fast Dispatch Across India: Dispatches within 24 hours from regional warehouses (Bhiwandi, Surat, Ahmedabad, Pune, Jaipur) with full transit insurance.'
      ],
      closingPitch: 'Sell complete solar power, not just panels. Choose SolarKits.',
      secondaryCtaText: 'Explore Wholesale Solar Kits →',
      footerDisclaimer: '*Exclusive wholesale rates applicable for verified GST-registered EPC contractors only.'
    },

    // Step 5: MIS Target Reference (Connected directly to Step 3 kits)
    targetKitCount: 25,
    targetLeads: 50,
    quarterlyKitGoal: 50,
    achievedBaseline: 0,
    kitTargets: {},
    targetEpcSignups: 50,

    // Step 6: Schedule & Smart Suppression Guard
    launchMode: 'immediate', // 'immediate' | 'scheduled'
    scheduledDate: '',
    scheduledTime: '',
    repeatFrequency: 'weekly', // 'once' | 'daily' | 'weekly' | 'monthly'
    repeatDay: 'Monday',
    repeatTime: '10:30',
    stopOnGoalAchievement: true, // Smart suppression
    followUpTrigger: 'clicked_no_cart',
    followUpDelayValue: 2,
    followUpDelayUnit: 'days', // 'hours' | 'days'
  });

  // Load all live master resources, senders, templates, segments, segment groups, tenders & queue status
  useEffect(() => {
    let mounted = true;
    async function loadResources() {
      setLoadingData(true);
      try {
        const [resources, sendersRes, templatesRes, segmentsRes, qStatus, mktStatesRes, tList] = await Promise.all([
          fetchMarketingMasterResources(true),
          marketingHttp.get('/senders').catch(() => null),
          marketingHttp.get('/templates').catch(() => null),
          marketingHttp.get('/audience/segments').catch(() => null),
          fetchLiveQueueStatus(),
          fetchMarketingStates().catch(() => []),
          fetchLiveGovtTenderConfigs().catch(() => [])
        ]);
        if (!mounted) return;

        const normClusters = (resources.clusters || []).map((c) => ({
          ...c,
          id: String(c._id || c.id),
          name: c.cluster_name || c.name,
          state: c.state_name || '',
          districts: c.district_names || []
        }));
        const normWarehouses = (resources.warehouses || []).map((w) => ({
          ...w,
          id: String(w._id || w.id),
          name: w.warehouse_name || w.warehouse_code,
          code: w.warehouse_code,
          state: w.state_name || ''
        }));
        const normKits = (resources.kits || []).map((k) => {
          const id = String(k._id || k.id);
          const loose = Array.isArray(k.loose_order_quantities) ? k.loose_order_quantities : [];
          const ord = Array.isArray(k.order_quantities) ? k.order_quantities : [];
          const moq = Number(loose[0] || ord[0] || 1);
          const price = Number(k.selling_price_cached || k.base_price_cached || 0);
          return {
            ...k,
            id,
            _id: id,
            name: k.name || 'Solar Combo Kit',
            sub_title: k.description || `${k.capacity || ''} kW Solar Kit`.trim(),
            base_price: price,
            defaultPrice: price,
            price,
            moq,
            loose_order_quantities: loose,
            image: k.kit_image || ''
          };
        });

        setClustersList(normClusters);
        setWarehousesList(normWarehouses);
        setActiveStatesList((resources.states || []).map((s) => ({ ...s, id: String(s._id || s.id) })));
        setLiveKitsCatalog(normKits);
        setOwnersList(resources.owners || []);
        setIndustriesList(resources.industries || []);
        setCouponsList(resources.coupons || []);
        if (Array.isArray(mktStatesRes)) setMarketingStates(mktStatesRes);
        if (Array.isArray(tList)) setGovtTenderConfigsList(tList);

        const allSenders = sendersRes?.data?.data || sendersRes?.data?.senders || [];
        setSendersList(allSenders);
        const allTemplates = templatesRes?.data?.data || templatesRes?.data?.templates || [];
        setDbTemplates(allTemplates);
        const allSegments = segmentsRes?.data?.data || [];
        setSegmentsList(allSegments);
        setQueueStatus(qStatus);

        const defaultEmailSender = allSenders.find((s) => s.type === 'email' && s.is_active && s.is_default) || allSenders.find((s) => s.type === 'email' && s.is_active) || allSenders.find((s) => s.type === 'email');
        const defaultWaSender = allSenders.find((s) => s.type === 'whatsapp' && s.is_active && s.is_default) || allSenders.find((s) => s.type === 'whatsapp' && s.is_active) || allSenders.find((s) => s.type === 'whatsapp');
        const firstOwner = (resources.owners || [])[0];

        setFormData((prev) => ({
          ...prev,
          assigned_manager: prev.assigned_manager || (firstOwner ? String(firstOwner._id) : ''),
          owner: prev.owner || (firstOwner ? firstOwner.name : 'Admin'),
          email_sender_id: prev.email_sender_id || (defaultEmailSender ? String(defaultEmailSender._id) : ''),
          whatsapp_sender_id: prev.whatsapp_sender_id || (defaultWaSender ? String(defaultWaSender._id) : '')
        }));
      } catch (err) {
        if (mounted) {
          setSubmitError(extractApiError(err, 'Failed to load campaign master resources'));
        }
      } finally {
        if (mounted) setLoadingData(false);
      }
    }
    loadResources();
    return () => { mounted = false; };
  }, []);

  // Load cascading GeoLevel2 districts when Segment State filter changes
  useEffect(() => {
    if (!selectedSegmentStateId && !formData.segmentStateFilter) {
      setSegmentDistricts([]);
      return;
    }
    fetchMarketingDistricts({
      stateId: selectedSegmentStateId,
      stateName: formData.segmentStateFilter
    })
      .then((list) => setSegmentDistricts(list))
      .catch(() => setSegmentDistricts([]));
  }, [selectedSegmentStateId, formData.segmentStateFilter]);

  // Reload live Segment Groups whenever State/District segment filters change
  useEffect(() => {
    fetchSegments({
      state: formData.segmentStateFilter || undefined,
      district: formData.segmentDistrictFilter || undefined
    })
      .then(({ segments }) => setSegmentGroupsList(segments || []))
      .catch((err) => console.error('Failed loading segment groups in wizard:', err));
  }, [formData.segmentStateFilter, formData.segmentDistrictFilter]);

  // Distinct available states strictly from MongoDB active states or clusters
  const availableStates = useMemo(() => {
    if (activeStatesList.length > 0) {
      return activeStatesList.map(s => s.name || s);
    }
    const s = new Set();
    clustersList.forEach(c => {
      const st = c.state_name || c.state;
      if (st) s.add(st);
    });
    return Array.from(s).sort();
  }, [activeStatesList, clustersList]);

  // Available clusters filtered by selected states
  const filteredClusters = useMemo(() => {
    if (!formData.selectedStates.length) return clustersList;
    return clustersList.filter(c => {
      const cState = (c.state_name || c.state || '').trim().toLowerCase();
      return formData.selectedStates.some(st => (st || '').trim().toLowerCase() === cState);
    });
  }, [clustersList, formData.selectedStates]);

  // Sync serving warehouses when selected clusters change
  useEffect(() => {
    if (clustersList.length === 0) return;
    const selectedClusterNames = formData.selectedClusterIds
      .map((cid) => clustersList.find((c) => c.cluster_code === cid || c.id === cid || String(c._id) === cid))
      .filter(Boolean)
      .map((c) => (c.cluster_name || c.name || '').toLowerCase());

    const matchedWarehouses = warehousesList
      .filter((w) => {
        const whClusters = (w.clusters || []).map((cn) => String(cn).toLowerCase());
        const byCluster = selectedClusterNames.some((cn) => whClusters.includes(cn));
        const byState = formData.selectedStates.some((st) => String(w.state_name || '').toLowerCase() === st.toLowerCase());
        return selectedClusterNames.length > 0 ? byCluster : byState;
      })
      .map((w) => w.warehouse_code || w.code || w.id);

    setFormData(prev => ({ ...prev, servingWarehouses: matchedWarehouses }));
  }, [formData.selectedClusterIds, formData.selectedStates, clustersList, warehousesList]);

  // Detailed serving warehouses objects from live master
  const servingWarehousesDetailed = useMemo(() => {
    return formData.servingWarehouses.map(whCode => {
      const found = warehousesList.find(w =>
        (w.warehouse_code === whCode) || (w.code === whCode) || (w.id === whCode) || (String(w._id) === whCode)
      );
      if (found) return found;
      return {
        id: whCode,
        warehouse_code: whCode,
        name: whCode,
        warehouse_name: whCode,
        city: 'Depot',
        address: whCode
      };
    });
  }, [formData.servingWarehouses, warehousesList]);

  // Covered territory districts aggregated from selected clusters
  const coveredDistricts = useMemo(() => {
    const dSet = new Set();
    formData.selectedClusterIds.forEach(cid => {
      const found = clustersList.find(c => (c.cluster_code || c.id || c._id) === cid);
      if (found && Array.isArray(found.districts)) {
        found.districts.forEach(d => dSet.add(d));
      }
    });
    return Array.from(dSet);
  }, [formData.selectedClusterIds, clustersList]);

  // Dynamically fetched Area Kits according to serving warehouses and live catalog
  const dynamicAreaKits = useMemo(() => {
    return fetchAreaKits(formData.servingWarehouses, liveKitsCatalog);
  }, [formData.servingWarehouses, liveKitsCatalog]);

  // Detect if any EPC group is selected vs Segment-only mode
  const hasAnyEpcGroup = useMemo(() => {
    return Boolean(formData.audienceGroups.registered || formData.audienceGroups.verified || formData.audienceGroups.buyer);
  }, [formData.audienceGroups]);

  // Dynamically fetched and state-filtered Government Tender Kits
  const govtTenderFilteredKits = useMemo(() => {
    if (!govtTenderConfigsList || govtTenderConfigsList.length === 0) return [];

    const activeSelectedStates = formData.selectedStates || [];
    const matchingConfigs = govtTenderConfigsList.filter(cfg => {
      if (cfg.is_active === false) return false;
      if (activeSelectedStates.length === 0) return true;
      const cfgState = (cfg.target_state_name || cfg.state_name || cfg.state || '').trim().toLowerCase();
      return activeSelectedStates.some(st => (st || '').trim().toLowerCase() === cfgState);
    });

    const result = [];
    const seenMap = new Set();

    matchingConfigs.forEach(cfg => {
      const cfgKitId = (cfg.combo_kit_id?._id || cfg.combo_kit_id || '').toString();
      const baseKit = dynamicAreaKits.find(k => (k.id === cfgKitId || k._id === cfgKitId)) ||
                      liveKitsCatalog.find(k => (k.id === cfgKitId || k._id === cfgKitId)) ||
                      (cfg.combo_kit_details ? {
                        id: cfgKitId,
                        name: cfg.combo_kit_details.kit_title || cfg.store_display_name,
                        base_price: cfg.combo_kit_details.price_with_tax || 89317,
                        stockQty: 50,
                        moq: 25,
                        warranty: '12 Years',
                        components_summary: 'Inverter + Panels + BOS Structure'
                      } : null);

      if (!baseKit) return;

      const uniqueKey = `${cfgKitId}-${cfg.target_state_name || ''}`;
      if (seenMap.has(uniqueKey)) return;
      seenMap.add(uniqueKey);

      result.push({
        ...baseKit,
        id: baseKit.id || cfgKitId,
        combo_kit_id: cfgKitId,
        tender_config_id: cfg._id || cfg.id,
        target_state: cfg.target_state_name || cfg.state_name || 'All India',
        tender_name: cfg.store_display_name || baseKit.name,
        tender_tagline: cfg.tagline || 'Specially Configured for Government Projects',
        tender_description: cfg.tender_description || 'State-specific tender configuration with bulk procurement support and DCR compliant solar modules.',
        primary_badge: cfg.primary_badge_text || 'GOVT. TENDER',
        secondary_badge: cfg.secondary_badge_text || 'Bulk Supply',
        dcr_module_available: cfg.dcr_module_available !== false,
        tender_image_url: cfg.product_image_url || baseKit.image || baseKit.display_image,
        explainer_video_url: cfg.explainer_video_url,
        is_govt_tender: true
      });
    });

    return result;
  }, [govtTenderConfigsList, formData.selectedStates, dynamicAreaKits, liveKitsCatalog]);

  const displayedStep3Kits = useMemo(() => {
    return formData.objective === 'govt_tender_promotion' ? govtTenderFilteredKits : dynamicAreaKits;
  }, [formData.objective, govtTenderFilteredKits, dynamicAreaKits]);

  // Detect if ONLY Registered EPC is selected (Registered EPCs haven't logged in yet and have no preferences)
  const isOnlyRegistered = useMemo(() => {
    return Boolean(formData.audienceGroups.registered && !formData.audienceGroups.verified && !formData.audienceGroups.buyer);
  }, [formData.audienceGroups]);

  // Resolve selected ObjectIds & names cleanly for API requests
  const resolvedTargeting = useMemo(() => {
    const combinedStates = [...marketingStates, ...activeStatesList];
    const stateIds = Array.from(
      new Set(
        formData.selectedStates
          .map((stName) => {
            const match = combinedStates.find((s) => String(s?.name || s || '').trim().toLowerCase() === String(stName || '').trim().toLowerCase());
            return match ? String(match._id || match.id) : null;
          })
          .filter((id) => id && /^[a-f\d]{24}$/i.test(id))
      )
    );

    const matchedClusters = clustersList.filter((c) =>
      formData.selectedClusterIds.includes(c.cluster_code) ||
      formData.selectedClusterIds.includes(c.id) ||
      formData.selectedClusterIds.includes(String(c._id))
    );
    const clusterIds = matchedClusters.map((c) => String(c._id || c.id)).filter((id) => /^[a-f\d]{24}$/i.test(id));
    const clusterNames = matchedClusters.map((c) => c.cluster_name || c.name).filter(Boolean);

    const matchedWhs = warehousesList.filter((w) =>
      formData.servingWarehouses.includes(w.warehouse_code) ||
      formData.servingWarehouses.includes(w.code) ||
      formData.servingWarehouses.includes(String(w._id))
    );
    const warehouseIds = matchedWhs.map((w) => String(w._id || w.id)).filter((id) => /^[a-f\d]{24}$/i.test(id));

    const areaType = clusterIds.length > 0 || clusterNames.length > 0
      ? 'cluster'
      : formData.selectedStates.length > 0
      ? 'state'
      : 'all_india';

    return {
      segment_id: formData.segment_id || null,
      epc_groups: {
        registered_epc: Boolean(formData.audienceGroups.registered),
        verified_epc: Boolean(formData.audienceGroups.verified),
        buyer_epc: Boolean(formData.audienceGroups.buyer)
      },
      area_type: areaType,
      state_ids: stateIds,
      state_names: formData.selectedStates,
      cluster_ids: clusterIds,
      cluster_names: clusterNames,
      warehouse_ids: warehouseIds,
      warehouse_names: formData.servingWarehouses,
      segment_ids: formData.selectedSegmentIds || [],
      segment_state_filter: formData.segmentStateFilter || '',
      segment_district_filter: formData.segmentDistrictFilter || '',
      industry_ids: formData.industryPreference && formData.industryPreference !== 'ALL' && /^[a-f\d]{24}$/i.test(formData.industryPreference)
        ? [formData.industryPreference]
        : [],
      kit_ids: formData.selectedKitIds.filter((id) => /^[a-f\d]{24}$/i.test(String(id))),
      channel: String(formData.channel || 'both').toLowerCase(),
      include_imported_leads: Boolean(formData.include_imported_leads),
      require_consent: Boolean(formData.require_consent)
    };
  }, [
    marketingStates,
    activeStatesList,
    clustersList,
    warehousesList,
    formData.segment_id,
    formData.selectedStates,
    formData.selectedClusterIds,
    formData.servingWarehouses,
    formData.audienceGroups,
    formData.selectedSegmentIds,
    formData.segmentStateFilter,
    formData.segmentDistrictFilter,
    formData.industryPreference,
    formData.selectedKitIds,
    formData.channel,
    formData.include_imported_leads,
    formData.require_consent
  ]);

  // Toggle isolated Segment Group selection
  const handleToggleSegment = (segId) => {
    if (!segId) return;
    setFormData((prev) => {
      const exists = prev.selectedSegmentIds.includes(segId);
      const next = exists
        ? prev.selectedSegmentIds.filter((id) => id !== segId)
        : [...prev.selectedSegmentIds, segId];
      return { ...prev, selectedSegmentIds: next };
    });
  };

  // Live MongoDB Audience Preview (Zero fake multipliers)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await marketingHttp.post('/audience/preview', resolvedTargeting);
        if (active && res.data?.success && res.data?.data) {
          setAudiencePreview(res.data.data);
        }
      } catch (err) {
        if (active) console.warn('Live audience preview notice:', err.message);
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [resolvedTargeting]);

  const audienceCalculation = useMemo(() => {
    const eligible = Number(audiencePreview?.total_eligible ?? audiencePreview?.deduplicatedTotal ?? 0);
    const epcCount = Number(audiencePreview?.epcCount ?? audiencePreview?.source_breakdown?.epc_accounts ?? eligible);
    const segmentCount = Number(audiencePreview?.segmentCount ?? audiencePreview?.source_breakdown?.segment_groups ?? 0);
    return {
      rawTotal: eligible + Number(audiencePreview?.total_excluded || 0),
      deduplicatedTotal: eligible,
      epcCount,
      segmentCount
    };
  }, [audiencePreview]);

  // Reset industry preference to 'ALL' if only registered EPC is selected
  useEffect(() => {
    if (isOnlyRegistered && formData.industryPreference !== 'ALL') {
      setFormData(prev => ({ ...prev, industryPreference: 'ALL' }));
    }
  }, [isOnlyRegistered, formData.industryPreference]);

  // Projected campaign revenue based on selected kits and individual kit targets
  const selectedKitsRevenue = useMemo(() => {
    return formData.selectedKitIds.reduce((sum, kid) => {
      const kit = (displayedStep3Kits || dynamicAreaKits).find(k => k.id === kid) || liveKitsCatalog.find(k => k.id === kid) || { base_price: 0 };
      const price = Number(kit.base_price || kit.defaultPrice || kit.price || 0);
      const qty = Number(formData.kitTargets?.[kid] ?? 20);
      return sum + (price * qty);
    }, 0);
  }, [formData.selectedKitIds, formData.kitTargets, displayedStep3Kits, dynamicAreaKits, liveKitsCatalog]);

  // Helper to toggle state selection
  const handleToggleState = (stateName) => {
    if (!stateName) return;
    setFormData(prev => {
      const exists = prev.selectedStates.some(s => s.toLowerCase() === stateName.toLowerCase());
      let nextStates;
      if (exists) {
        nextStates = prev.selectedStates.filter(s => s.toLowerCase() !== stateName.toLowerCase());
      } else {
        nextStates = [...prev.selectedStates, stateName];
      }

      const matchingClusters = clustersList
        .filter(c => nextStates.some(st => (c.state_name || c.state || '').toLowerCase() === st.toLowerCase()))
        .map(c => c.cluster_code || c.id || c._id);

      return {
        ...prev,
        selectedStates: nextStates,
        selectedClusterIds: matchingClusters
      };
    });
  };

  // Helper to toggle cluster selection
  const handleToggleCluster = (clusterId) => {
    setFormData(prev => {
      const exists = prev.selectedClusterIds.includes(clusterId);
      let nextIds;
      if (exists) {
        nextIds = prev.selectedClusterIds.filter(id => id !== clusterId);
      } else {
        nextIds = [...prev.selectedClusterIds, clusterId];
      }
      return { ...prev, selectedClusterIds: nextIds };
    });
  };

  // Objective change handler - aligned with MarketingCampaign.campaign_objective schema enum
  const handleObjectiveChange = (newObjective) => {
    let nextCta = formData.ctaText;
    let nextUrl = formData.destinationUrl;
    let nextHasCoupon = formData.hasCoupon;

    if (newObjective === 'seasonal_coupon') {
      nextCta = 'Apply Coupon & Claim Kit Offer';
      nextUrl = 'https://solarkits.in/solar-kits?utm_source=solarkits_marketing&utm_campaign=seasonal_coupon';
      nextHasCoupon = true;
    } else if (newObjective === 'sales') {
      nextCta = 'Order Wholesale Kits Online';
      nextUrl = 'https://solarkits.in/store?utm_source=solarkits_marketing&utm_campaign=kit_sales';
    } else if (newObjective === 'epc_onboarding' || newObjective === 'lead_generation') {
      nextCta = 'Register as EPC Partner & Claim ₹5,000 Credit';
      nextUrl = 'https://solarkits.in/register/epc?utm_source=solarkits_marketing&utm_campaign=epc_onboarding';
    } else if (newObjective === 'store_visits') {
      nextCta = 'Locate Nearest Franchise Depot & Claim Pass';
      nextUrl = 'https://solarkits.in/franchise-stores?utm_source=solarkits_marketing&utm_campaign=store_visits';
    } else if (newObjective === 'product_promotion') {
      nextCta = 'Explore TopCon Bifacial Kits & Specs';
      nextUrl = 'https://solarkits.in/products?utm_source=solarkits_marketing&utm_campaign=product_promotion';
    } else if (newObjective === 'add_to_cart') {
      nextCta = 'Resume Order & Apply Discount';
      nextUrl = 'https://solarkits.in/cart?utm_source=solarkits_marketing&utm_campaign=add_to_cart';
    } else if (newObjective === 'epc_activation') {
      nextCta = 'Reactivate Account & Explore Combos';
      nextUrl = 'https://solarkits.in/portal/dashboard?utm_source=solarkits_marketing&utm_campaign=epc_activation';
    } else if (newObjective === 'govt_tender_promotion') {
      nextCta = 'Explore Govt Tender Solar Kits';
      nextUrl = 'https://solarkits.in/govt-tenders?utm_source=solarkits_marketing&utm_campaign=govt_tender_promotion';
    }

    setFormData(prev => ({
      ...prev,
      objective: newObjective,
      hasCoupon: nextHasCoupon,
      ctaText: nextCta,
      destinationUrl: nextUrl
    }));
  };

  // Helper to toggle kit selection with target synchronization & automatic MOQ sync
  const handleToggleKit = (kitId) => {
    setFormData(prev => {
      const exists = prev.selectedKitIds.includes(kitId);
      let nextKits;
      if (exists) {
        nextKits = prev.selectedKitIds.filter(id => id !== kitId);
      } else {
        nextKits = [...prev.selectedKitIds, kitId];
      }
      const updatedTargets = { ...prev.kitTargets };
      if (!updatedTargets[kitId]) {
        updatedTargets[kitId] = 25;
      }
      const newTotal = nextKits.reduce((acc, id) => acc + (updatedTargets[id] || 0), 0);

      const selKits = displayedStep3Kits.filter(k => nextKits.includes(k.id));
      const autoMoq = selKits.length > 0
        ? Math.min(...selKits.map(k => prev.kitMoqs?.[k.id] ?? k.moq ?? 1))
        : 1;

      return {
        ...prev,
        selectedKitIds: nextKits,
        kitTargets: updatedTargets,
        targetKitCount: newTotal > 0 ? newTotal : prev.targetKitCount,
        minOrderQty: autoMoq > 0 ? autoMoq : prev.minOrderQty
      };
    });
  };

  // Selected kit objects from live catalog (or tender filtered kits when objective is govt_tender_promotion)
  const selectedKitObjects = useMemo(() => {
    return displayedStep3Kits.filter(k => formData.selectedKitIds.includes(k.id));
  }, [displayedStep3Kits, formData.selectedKitIds]);

  // Minimum required store loose batch MOQ among selected kits
  const minimumRequiredMoq = useMemo(() => {
    if (selectedKitObjects.length === 0) return 25;
    return Math.min(...selectedKitObjects.map(k => k.moq ?? 25));
  }, [selectedKitObjects]);

  // Invalid kits where user-configured MOQ is strictly less than store loose batch MOQ
  const invalidMoqKits = useMemo(() => {
    return selectedKitObjects.filter(k => {
      const currentVal = formData.kitMoqs?.[k.id] ?? k.moq ?? 25;
      const storeReq = k.moq ?? 25;
      return currentVal < storeReq;
    });
  }, [selectedKitObjects, formData.kitMoqs]);

  // If ANY selected kit is below store MOQ, or overall minOrderQty is below minimumRequiredMoq
  const isMoqInvalid = invalidMoqKits.length > 0 || Number(formData.minOrderQty) < minimumRequiredMoq;

  const handleAutoFixAllMoqs = () => {
    setFormData(prev => {
      const updatedKitMoqs = { ...prev.kitMoqs };
      selectedKitObjects.forEach(k => {
        updatedKitMoqs[k.id] = k.moq ?? 25;
      });
      const lowest = Math.min(...selectedKitObjects.map(k => k.moq ?? 25));
      return {
        ...prev,
        kitMoqs: updatedKitMoqs,
        minOrderQty: lowest
      };
    });
  };

  // Helper to adjust per-kit targets in Step 5
  const handleKitTargetChange = (kitId, value) => {
    const val = Math.max(0, parseInt(value, 10) || 0);
    setFormData(prev => {
      const updatedTargets = {
        ...prev.kitTargets,
        [kitId]: val
      };
      const total = prev.selectedKitIds.reduce((sum, id) => sum + (updatedTargets[id] || 0), 0);
      return {
        ...prev,
        kitTargets: updatedTargets,
        targetKitCount: total
      };
    });
  };

  // Build final email HTML dynamically from EmailStudio designer state
  const generatedEmailHtml = useMemo(() => {
    try {
      return generateResponsiveEmailHtml(formData.customCreative || {}, selectedKitObjects, warehousesList);
    } catch {
      return `<p>${formData.customCreative?.customBodyText || formData.campaignName}</p>`;
    }
  }, [formData.customCreative, formData.campaignName, selectedKitObjects, warehousesList]);

  // Real test send via backend SMTP/Resend/SES and Meta WhatsApp Cloud API
  const handleTestSend = async () => {
    const ch = String(formData.channel || 'BOTH').toLowerCase();
    if ((ch === 'email' || ch === 'both') && !testEmail.trim()) {
      setSubmitError('Enter a test email address before sending a test.');
      return;
    }
    if ((ch === 'whatsapp' || ch === 'both') && !testPhone.trim()) {
      setSubmitError('Enter a test WhatsApp phone number before sending a test.');
      return;
    }
    setTestSending(true);
    setTestResult(null);
    setSubmitError(null);
    try {
      const res = await marketingHttp.post('/campaigns/test-send', {
        channel: ch,
        email_sender_id: formData.email_sender_id || null,
        whatsapp_sender_id: formData.whatsapp_sender_id || null,
        email_template_id: formData.selectedEmailTemplateId || null,
        whatsapp_template_id: formData.selectedWhatsAppTemplateId || null,
        test_email: testEmail.trim() || undefined,
        test_phone: testPhone.trim() || undefined,
        subject: formData.emailSubject || formData.customCreative?.headline || formData.campaignName || 'SolarKits Test Dispatch',
        html_content: formData.selectedEmailTemplateId ? undefined : generatedEmailHtml,
        whatsapp_body: formData.selectedWhatsAppTemplateId ? undefined : (formData.customCreative?.whatsapp?.body || ''),
        variables: {
          coupon_code: formData.couponCode || '',
          discount_value: String(formData.discountValue || '')
        }
      });
      setTestResult(res.data);
    } catch (err) {
      setSubmitError(extractApiError(err, 'Test message dispatch failed'));
    } finally {
      setTestSending(false);
    }
  };

  // Create / Schedule / Launch real MongoDB campaign
  const handleLaunchCampaign = async (mode = 'launch') => {
    if (!formData.campaignName.trim()) {
      setSubmitError('Campaign name is required.');
      setCurrentStep(1);
      return;
    }
    const ch = String(formData.channel || 'BOTH').toLowerCase();
    if (mode === 'launch' && audienceCalculation.deduplicatedTotal === 0) {
      setSubmitError('0 eligible recipients matched your current filters. Adjust targeting or save as Draft.');
      return;
    }

    setSavingCampaign(true);
    setSubmitError(null);
    try {
      // If custom coupon configured and not yet saved as OfferMaster, persist it to OfferMaster first
      let couponOfferId = formData.coupon_offer_id || null;
      if (formData.hasCoupon && formData.couponCode.trim() && !couponOfferId) {
        try {
          const cRes = await marketingHttp.post('/coupons', {
            offer_name: `${formData.campaignName.trim()} Coupon`,
            coupon_code: formData.couponCode.trim().toUpperCase(),
            discount_type: formData.discountType === 'percent' ? 'percentage' : 'flat',
            discount_value: Number(formData.discountValue || 0),
            end_date: formData.couponExpiry || null,
            products_applicable: resolvedTargeting.kit_ids,
            is_active: true
          });
          couponOfferId = cRes.data?.data?._id || null;
        } catch (couponErr) {
          console.warn('Coupon creation note:', couponErr.message);
        }
      }

      const startDateIso =
        mode === 'scheduled' && formData.scheduledDate
          ? new Date(`${formData.scheduledDate}T${formData.scheduledTime || '10:00'}:00`).toISOString()
          : new Date().toISOString();

      const resolvedEmailSubject = formData.emailSubject || formData.customCreative?.headline || null;
      const resolvedEmailHtml = formData.selectedEmailTemplateId ? null : generatedEmailHtml;

      const payload = {
        campaign_name: formData.campaignName.trim(),
        campaign_type: ch,
        campaign_objective: formData.objective,
        assigned_manager: /^[a-f\d]{24}$/i.test(String(formData.assigned_manager)) ? formData.assigned_manager : null,
        budget: Number(formData.budget || 0),
        status: mode === 'scheduled' ? 'scheduled' : 'draft',
        launch_immediately: mode === 'launch',
        start_date: startDateIso,
        send_mode: formData.repeatFrequency === 'once' ? 'one_time' : 'recurring',
        repeat_frequency: ['daily', 'weekly', 'monthly'].includes(formData.repeatFrequency) ? formData.repeatFrequency : 'weekly',
        send_time: formData.repeatTime || '10:30',
        stop_on_purchase: Boolean(formData.stopOnGoalAchievement),
        stop_on_target_reached: Boolean(formData.stopOnGoalAchievement),
        destination_url: formData.destinationUrl || 'https://solarkits.in',
        email_sender_id: /^[a-f\d]{24}$/i.test(String(formData.email_sender_id)) ? formData.email_sender_id : null,
        whatsapp_sender_id: /^[a-f\d]{24}$/i.test(String(formData.whatsapp_sender_id)) ? formData.whatsapp_sender_id : null,
        email_template_id: /^[a-f\d]{24}$/i.test(String(formData.selectedEmailTemplateId)) ? formData.selectedEmailTemplateId : null,
        whatsapp_template_id: /^[a-f\d]{24}$/i.test(String(formData.selectedWhatsAppTemplateId)) ? formData.selectedWhatsAppTemplateId : null,
        email_subject: resolvedEmailSubject,
        email_html_content: resolvedEmailHtml,
        email_subject_override: resolvedEmailSubject,
        email_html_override: resolvedEmailHtml,
        whatsapp_body_override: formData.selectedWhatsAppTemplateId ? null : (formData.customCreative?.whatsapp?.body || null),
        coupon_offer_id: couponOfferId,
        coupon_code: formData.hasCoupon && formData.couponCode ? formData.couponCode.trim().toUpperCase() : null,
        target_leads: Number(formData.targetLeads || 0),
        target_conversions: formData.objective === 'epc_onboarding' ? Number(formData.targetEpcSignups || 0) : Number(formData.targetKitCount || 0),
        target_revenue: Number(selectedKitsRevenue || 0),
        target_messages: audienceCalculation.deduplicatedTotal,
        ...resolvedTargeting
      };

      const res = await marketingHttp.post('/campaigns', payload);
      if (res.data?.success) {
        navigate('/marketing-panel/campaigns');
      } else {
        setSubmitError(res.data?.message || 'Failed to save campaign.');
      }
    } catch (err) {
      setSubmitError(extractApiError(err, 'Failed to save/launch campaign'));
    } finally {
      setSavingCampaign(false);
    }
  };

  // Selected WhatsApp and Email template objects from DB templates
  const activeWATemplate = useMemo(() => {
    return (
      dbTemplates.find((t) => String(t._id) === String(formData.selectedWhatsAppTemplateId) && t.channel === 'whatsapp') || {
        name: 'Custom WhatsApp Studio Message',
        body_text: formData.customCreative?.whatsapp?.body || ''
      }
    );
  }, [dbTemplates, formData.selectedWhatsAppTemplateId, formData.customCreative?.whatsapp?.body]);

  const activeEmailTemplate = useMemo(() => {
    return (
      dbTemplates.find((t) => String(t._id) === String(formData.selectedEmailTemplateId) && t.channel === 'email') || {
        name: formData.customCreative?.headline || 'Custom Email Studio Design',
        subject: formData.emailSubject
      }
    );
  }, [dbTemplates, formData.selectedEmailTemplateId, formData.customCreative?.headline, formData.emailSubject]);

  // Formatted preview text with variables replaced
  const waPreviewBody = useMemo(() => {
    if (formData.templateMode === 'custom') {
      const cr = formData.customCreative;
      const kitDetails = (formData.includeKitDetailsInCreative && selectedKitObjects.length > 0)
        ? '\n\n' + selectedKitObjects.map(k =>
            `📦 *${k.name}*\n` +
            `⚡ Special Price: ₹${Number(k.base_price).toLocaleString('en-IN')} / kit\n` +
            `📊 Batch Order: ${formData.kitMoqs?.[k.id] ?? k.moq ?? 25} Kits (${k.components_summary || k.sub_title})\n` +
            `🛡️ ${k.warranty || '12 Years'} Warranty • Advance: ${k.advance_percent || 50}% / Balance: ${k.balance_percent || 50}%`
          ).join('\n\n')
        : '';
      const bullets = Array.isArray(cr.bulletPoints) && cr.bulletPoints.length > 0
        ? '\n\n' + cr.bulletPoints.map(b => `✓ ${b}`).join('\n')
        : '';
      const couponSnippet = formData.couponCode
        ? `\n\n🎟️ *Use Coupon:* ${formData.couponCode} (₹${Number(formData.discountValue).toLocaleString('en-IN')} Off • Min Order: ${formData.minOrderQty} Kits)`
        : '';
      const disclaimer = cr.footerDisclaimer ? `\n\n_${cr.footerDisclaimer}_` : '';
      return `*${cr.headline}*\n_${cr.subheading}_\n\n${cr.customBodyText}${kitDetails}${bullets}${couponSnippet}${disclaimer}`;
    }
    const discountStr = formData.discountType === 'percent'
      ? `${formData.discountValue}%`
      : `₹${Number(formData.discountValue).toLocaleString('en-IN')}`;
    const kitName = selectedKitObjects[0]?.name || (formData.selectedKitIds.length > 0 ? 'Solar Combo' : 'Eligible');
    const whName = formData.servingWarehouses[0] ? formData.servingWarehouses[0] : 'Certified Hub';
    const expiryStr = formData.couponExpiry ? new Date(formData.couponExpiry).toLocaleDateString('en-IN') : 'End of Month';

    let bodyText = (activeWATemplate.body_text || activeWATemplate.body || '')
      .replace('{{1}}', discountStr)
      .replace('{{2}}', kitName)
      .replace('{{3}}', formData.couponCode)
      .replace('{{4}}', whName)
      .replace('{{5}}', expiryStr);

    if (formData.includeKitDetailsInCreative && selectedKitObjects.length > 0) {
      bodyText += '\n\n' + selectedKitObjects.map(k =>
        `📦 *${k.name}*\n` +
        `⚡ Special Price: ₹${Number(k.base_price).toLocaleString('en-IN')} / kit\n` +
        `📊 Batch Order: ${formData.kitMoqs?.[k.id] ?? k.moq ?? 25} Kits (${k.components_summary || k.sub_title})\n` +
        `🛡️ ${k.warranty || '12 Years'} Warranty • Advance: ${k.advance_percent || 50}% / Balance: ${k.balance_percent || 50}%`
      ).join('\n\n');
    }

    return bodyText;
  }, [formData, activeWATemplate, selectedKitObjects]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Enterprise Campaign Builder
            </span>
            <span className="text-xs text-slate-400">Step {currentStep} of 7</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FaRocket className="text-indigo-600" /> Create Multi-Territory Campaign
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Target verified EPC contractors, allocate real warehouse stock, auto-sync coupon voucher & studio creatives.
          </p>
        </div>

        {/* Live Dispatch Engine & Eligible Audience Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FaUsers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Live Eligible Audience</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {previewLoading ? 'Calculating...' : `${audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')} EPCs`}
              </p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <p className="text-[10px] uppercase font-bold text-slate-400">Dispatch Queue</p>
            <p className="font-black text-indigo-600 dark:text-indigo-400">
              {queueStatus ? `${queueStatus.pending ?? 0} Pending` : 'Ready'}
            </p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><FaExclamationTriangle /> {submitError}</span>
          <button type="button" onClick={() => setSubmitError(null)} className="cursor-pointer"><FaTimes /></button>
        </div>
      )}

      {/* 7-Step Navigation Bar */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-x-auto">
        <div className="flex items-center min-w-[750px] justify-between">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex-1 py-2.5 px-2 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDone
                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    : 'text-slate-400 opacity-60 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                    isActive
                      ? 'bg-white text-indigo-600'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {isDone ? <FaCheck className="w-3 h-3" /> : step.id}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate leading-tight">{step.label}</p>
                  <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Details & Message Wallet Setup */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaBullhorn className="text-indigo-600" /> 1. Campaign Identity & Message Wallet Setup
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure campaign name, channel, and review live credit wallet. No manual quota limit is required — credits are auto-deducted on launch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.campaignName}
                onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
                placeholder="e.g. Maharashtra Cluster — 3 kW Repeat Orders"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Campaign Owner / Manager (CMS User)
              </label>
              <select
                value={formData.assigned_manager}
                onChange={(e) => {
                  const selOwner = ownersList.find((o) => String(o._id) === e.target.value);
                  setFormData({ ...formData, assigned_manager: e.target.value, owner: selOwner?.name || '' });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Unassigned / Current Admin --</option>
                {ownersList.map((o) => (
                  <option key={o._id} value={String(o._id)}>
                    {o.name} {o.department_name ? `(${o.department_name})` : o.email ? `(${o.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Allocated Campaign Budget (₹ INR)
              </label>
              <input
                type="number"
                min={0}
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
                placeholder="e.g. 25000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">
              Communication Channel *
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'EMAIL', label: 'Email Only', icon: FaEnvelope, color: 'text-blue-600', desc: 'HTML newsletters, quotes & proposals' },
                { id: 'WHATSAPP', label: 'WhatsApp Only', icon: FaWhatsapp, color: 'text-emerald-600', desc: 'Meta Business API high-open alerts' },
                { id: 'BOTH', label: 'Omnichannel (Both)', icon: FaBullhorn, color: 'text-indigo-600', desc: 'Simultaneous Email & WhatsApp blast' }
              ].map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => setFormData({ ...formData, channel: ch.id })}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    formData.channel === ch.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ch.icon className={`w-5 h-5 ${ch.color}`} />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{ch.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{ch.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sender Accounts & Live Queue Engine Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-slate-50 to-emerald-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <FaPaperPlane className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Verified Dispatch Senders & Queue Status</h4>
                  <p className="text-xs text-slate-500">
                    Select active SMTP / Resend / AWS SES email senders and Meta WhatsApp Business numbers
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                Queue: {queueStatus ? `${queueStatus.pending ?? 0} pending • ${queueStatus.sent ?? 0} sent` : 'Idle'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(formData.channel === 'EMAIL' || formData.channel === 'BOTH') && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email Sender Profile</label>
                  <select
                    value={formData.email_sender_id}
                    onChange={(e) => setFormData({ ...formData, email_sender_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="">-- Auto (Default Active / .env Provider) --</option>
                    {sendersList.filter((s) => s.type === 'email').map((s) => (
                      <option key={s._id} value={String(s._id)}>
                        {s.name} ({s.email_provider?.toUpperCase()} • {s.from_email}) [{s.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.channel === 'WHATSAPP' || formData.channel === 'BOTH') && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">WhatsApp Business Sender</label>
                  <select
                    value={formData.whatsapp_sender_id}
                    onChange={(e) => setFormData({ ...formData, whatsapp_sender_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="">-- Auto (Default Active / .env Meta Cloud) --</option>
                    {sendersList.filter((s) => s.type === 'whatsapp').map((s) => (
                      <option key={s._id} value={String(s._id)}>
                        {s.name} ({s.whatsapp_phone_number || s.whatsapp_phone_number_id}) [{s.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Multi-Area & Audience Targeting (Map + Clusters + Serving Warehouses) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaMapMarkerAlt className="text-indigo-600" /> 2. Area & EPC Audience Targeting
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select State first or click directly on the India territory map. Target dynamic clusters from Admin Panel, auto-linking the real Serving Warehouses and covered districts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Interactive India Territory Map */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-indigo-600" /> Interactive India Territory Map
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {formData.selectedStates.length} Selected
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 text-center">
                Click state to select or toggle multiple territories
              </p>

              <div className="w-full flex justify-center overflow-hidden border border-slate-100 dark:border-slate-700/60 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-2">
                <IndiaTargetingMap
                  selectedStates={formData.selectedStates}
                  onToggleState={handleToggleState}
                />
              </div>

              {/* State badges below map */}
              <div className="w-full mt-4 flex flex-wrap gap-1.5">
                {availableStates.map(st => {
                  const isSel = formData.selectedStates.some(s => s.toLowerCase() === st.toLowerCase());
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleToggleState(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isSel && '✓ '} {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 7 Cols: Form Fields (State -> Cluster -> Warehouse -> Districts -> Audience) */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. SELECT TARGET STATE(S) */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-indigo-600" /> 1. Select Target State *
                  </label>
                  <span className="text-[11px] text-slate-400">Multiple States Supported</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleToggleState(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">+ Add or Toggle State ({availableStates.length} Available)...</option>
                    {availableStates.map(st => (
                      <option key={st} value={st}>
                        {formData.selectedStates.includes(st) ? `✓ ${st} (Already Selected)` : st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected states chip list */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.selectedStates.map(st => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    >
                      <FaCheck className="w-2.5 h-2.5" /> {st}
                      <button
                        type="button"
                        onClick={() => handleToggleState(st)}
                        className="ml-1 text-indigo-400 hover:text-indigo-800 cursor-pointer"
                        title="Remove state"
                      >
                        <FaTimes className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. TARGET CLUSTERS IN SELECTED STATES */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FaLayerGroup className="text-indigo-600" /> 2. Target Clusters in {formData.selectedStates.join(', ') || 'Selected States'} *
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200">
                    {filteredClusters.length} Clusters Found ({formData.selectedClusterIds.length} Selected)
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-900/20">
                  {filteredClusters.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 text-center">
                      No clusters found. Please click or select a state above or on the map.
                    </p>
                  ) : (
                    filteredClusters.map(c => {
                      const cid = c.cluster_code || c.id || c._id;
                      const cname = c.cluster_name || c.name;
                      const cstate = c.state_name || c.state;
                      const cwh = c.warehouse_name || c.warehouseName || c.warehouse_code || c.warehouseCode;
                      const checked = formData.selectedClusterIds.includes(cid);

                      return (
                        <div
                          key={cid}
                          onClick={() => handleToggleCluster(cid)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            checked
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="rounded-sm text-indigo-600 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold">{cname}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                State: <strong className="text-slate-700 dark:text-slate-300">{cstate}</strong> • Depot: {cwh}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                            {cid}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. SERVING WAREHOUSE (AUTO-LINKED REAL MASTER) */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FaWarehouse className="text-emerald-600" /> 3. Serving Warehouse (Auto-Linked Real Master) *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200">
                    Auto-Linked
                  </span>
                </div>

                <div className="space-y-2">
                  {servingWarehousesDetailed.map(wh => (
                    <div
                      key={wh.id || wh.warehouse_code}
                      className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0 mt-0.5">
                        <FaWarehouse className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {wh.warehouse_name || wh.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          📍 {wh.address || 'Certified Regional Warehouse Hub'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COVERED DISTRICTS & PIN TERRITORY */}
              {coveredDistricts.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                    Covered Territory Districts for Selected Clusters:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {coveredDistricts.map(dist => (
                      <span
                        key={dist}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                      >
                        <FaMapPin className="text-rose-500 w-2.5 h-2.5" /> {dist}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TARGET EPC AUDIENCE GROUPS & ISOLATED SEGMENT GROUPS */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                    Target EPC Audience Groups (Deduplicated)
                  </label>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Uncheck all 3 for Segment-Only Campaigns • Active EPCs:{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">{audienceCalculation.epcCount.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'registered', title: 'Registered EPC', desc: 'Completed basic signup' },
                    { key: 'verified', title: 'Verified EPC', desc: 'GST & KYC approved' },
                    { key: 'buyer', title: 'Buyer EPC', desc: '1+ historical kit purchase' }
                  ].map(grp => (
                    <label
                      key={grp.key}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        formData.audienceGroups[grp.key]
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{grp.title}</span>
                        <input
                          type="checkbox"
                          checked={formData.audienceGroups[grp.key]}
                          onChange={(e) => setFormData({
                            ...formData,
                            audienceGroups: {
                              ...formData.audienceGroups,
                              [grp.key]: e.target.checked
                            }
                          })}
                          className="rounded-sm text-indigo-600"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">{grp.desc}</p>
                    </label>
                  ))}
                </div>

                {/* Optional Saved Segment & Consent Policies */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block mb-1">
                      Saved Dynamic Filter Segment (Optional)
                    </label>
                    <select
                      value={formData.segment_id}
                      onChange={(e) => setFormData({ ...formData, segment_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 font-semibold"
                    >
                      <option value="">-- Custom Filters Below --</option>
                      {segmentsList.map((seg) => (
                        <option key={seg._id} value={String(seg._id)}>
                          {seg.name} ({seg.cached_count ?? 0} EPCs)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-center gap-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.require_consent}
                        onChange={(e) => setFormData({ ...formData, require_consent: e.target.checked })}
                      />
                      <span>Enforce explicit opt-in channel consent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.include_imported_leads}
                        onChange={(e) => setFormData({ ...formData, include_imported_leads: e.target.checked })}
                      />
                      <span>Include CSV / Website EPC Leads</span>
                    </label>
                  </div>
                </div>

                {/* ISOLATED SEGMENT GROUPS (NON-EPC LEADS) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <FaLayerGroup className="text-amber-500" /> Target Isolated Segment Groups (Non-EPC Leads)
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Select non-EPC Segment Groups (auto-excludes leads who already verified a GSTIN).
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Segment Leads: {audienceCalculation.segmentCount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Live MongoDB State & District Filters for Segment Groups */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={selectedSegmentStateId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const st = marketingStates.find((s) => String(s._id) === id);
                        setSelectedSegmentStateId(id);
                        setFormData((prev) => ({
                          ...prev,
                          segmentStateFilter: st?.name || '',
                          segmentDistrictFilter: ''
                        }));
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <option value="">All Segment States (Live DB)</option>
                      {marketingStates.map((st) => (
                        <option key={st._id} value={st._id}>{st.name}</option>
                      ))}
                    </select>

                    <select
                      value={formData.segmentDistrictFilter}
                      onChange={(e) => setFormData((prev) => ({ ...prev, segmentDistrictFilter: e.target.value }))}
                      disabled={!selectedSegmentStateId}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                    >
                      <option value="">{selectedSegmentStateId ? 'All Districts in State' : 'Select Segment State First'}</option>
                      {segmentDistricts.map((dist) => (
                        <option key={dist._id} value={dist.name}>{dist.name}</option>
                      ))}
                    </select>
                  </div>

                  {segmentGroupsList.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center">
                      No isolated Segment Groups found yet. Create groups under <strong>Marketing Portal → Segment Groups</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {segmentGroupsList.map((seg) => {
                        const isChecked = formData.selectedSegmentIds.includes(seg._id);
                        const filteredCnt = seg.filtered_contact_count ?? seg.contact_count ?? 0;
                        return (
                          <label
                            key={seg._id}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                              isChecked
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{seg.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  {seg.segment_type}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {filteredCnt.toLocaleString('en-IN')} active leads
                                {(formData.segmentStateFilter || formData.segmentDistrictFilter) && ` (filtered)`}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSegment(seg._id)}
                              className="mt-0.5 rounded-sm text-amber-600"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Industry Preference Segment Filter (DB Industries) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                      Filter by EPC Industry Interest (Buyer Preferences)
                    </label>
                    {!hasAnyEpcGroup ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        Segment-Only Mode Active
                      </span>
                    ) : isOnlyRegistered ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        Disabled for Registered-Only EPCs
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Live EPC audience filter
                      </span>
                    )}
                    )}
                  </div>

                  {!hasAnyEpcGroup ? (
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      Targeting Selected Isolated Segment Groups only (all 3 EPC checkboxes unchecked).
                    </div>
                  ) : isOnlyRegistered ? (
                    <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Industry filter is disabled for newly registered EPCs</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                          Eligible count: <strong>{audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')} contractors</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, industryPreference: 'ALL' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          (formData.industryPreference || 'ALL') === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        All Industries
                      </button>
                      {industriesList.map((ind) => {
                        const indId = String(ind._id);
                        const isSelected = formData.industryPreference === indId;
                        return (
                          <button
                            key={indId}
                            type="button"
                            onClick={() => setFormData({ ...formData, industryPreference: indId })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {ind.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Audience Resolution Summary from MongoDB */}
                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Live MongoDB Eligible Audience Count
                    </span>
                    <p className="text-xl font-black text-white">
                      {previewLoading ? 'Calculating...' : audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-normal text-slate-300">Target Recipients</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Unsubscribed skipped: {audiencePreview?.unsubscribed_skipped ?? 0} • Consent skipped: {audiencePreview?.consent_skipped ?? 0}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/40 text-[11px] font-bold text-indigo-200">
                        Target EPCs: {audienceCalculation.epcCount.toLocaleString('en-IN')}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/40 text-[11px] font-bold text-amber-200">
                        Segment Leads (Non-EPC): {audienceCalculation.segmentCount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Database Breakdown
                    </span>
                    <p className="font-bold text-emerald-400">
                      {audiencePreview?.consent_breakdown?.email_consented ?? 0} Email • {audiencePreview?.consent_breakdown?.whatsapp_consented ?? 0} WhatsApp
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formData.selectedStates.length || 'All'} States • {formData.selectedClusterIds.length || 'All'} Clusters
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Purpose, Area-Linked Kits & Coupon Engine */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaGift className="text-indigo-600" /> 3. Campaign Purpose, Area Kits & Coupon Voucher Engine
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Set strategic campaign objective, select kits dynamically in-stock at serving warehouses, and configure single-use EPC discount vouchers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Campaign Purpose / Strategic Objective *
              </label>
              <select
                value={formData.objective}
                onChange={(e) => handleObjectiveChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {CAMPAIGN_OBJECTIVES.map(obj => (
                  <option key={obj.id} value={obj.id}>
                    {obj.label || obj.name} {obj.desc ? `— ${obj.desc}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Call to Action (CTA Button) *
              </label>
              <select
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="Add to Cart & Apply Coupon">Add to Cart & Apply Coupon</option>
                <option value="Register as EPC Partner & Claim ₹5,000 Credit">Register as EPC Partner & Claim ₹5,000 Credit</option>
                <option value="Locate Nearest Franchise Depot & Claim Pass">Locate Nearest Franchise Depot & Claim Pass</option>
                <option value="Complete KYC & Unlock Wholesale Pricing">Complete KYC & Unlock Wholesale Pricing</option>
                <option value="View Kit Online (Direct PDP)">View Kit Online (Direct PDP)</option>
                <option value="Request Wholesale Price List">Request Wholesale Price List</option>
                <option value="Explore TopCon Bifacial Kits & Specs">Explore TopCon Bifacial Kits & Specs</option>
                <option value="Resume Order & Apply ₹5,000 Discount">Resume Order & Apply ₹5,000 Discount</option>
                <option value="Reactivate Account & Claim ₹7,500 Credit">Reactivate Account & Claim ₹7,500 Credit</option>
                <option value="Explore Govt Tender Solar Kits">Explore Govt Tender Solar Kits</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
              Destination Landing URL (Auto-Generated with Campaign UTM & Auto-Coupon)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.destinationUrl}
                onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
              <a
                href={formData.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600"
              >
                <FaExternalLinkAlt className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 1. DEDICATED PURPOSE: DISCOUNT COUPON & PROMOTIONAL OFFER */}
          {formData.objective === 'seasonal_coupon' && (
            <>
              {/* Dynamically Fetched Area Kits for Coupon Eligibility */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <FaBoxes className="text-amber-600" /> Select Eligible Solar Kits for this Coupon Code *
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coupon voucher will strictly apply only to these selected in-stock kits from your serving warehouses.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Warehouses: {formData.servingWarehouses.join(', ') || 'All Depots'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dynamicAreaKits.map(kit => {
                    const isSelected = formData.selectedKitIds.includes(kit.id);
                    const kitPrice = Number(kit.base_price || kit.defaultPrice || kit.price || 89317);
                    const kitStock = Number(kit.stockQty ?? kit.stock_in_selected_warehouses ?? 0);
                    const kitMoqVal = formData.kitMoqs?.[kit.id] ?? kit.moq ?? 25;

                    return (
                      <div
                        key={kit.id}
                        onClick={() => handleToggleKit(kit.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{kit.name}</span>
                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white">
                                    Coupon Eligible
                                  </span>
                                )}
                              </div>

                              {/* Components & Spec Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap my-1">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                  ⚡ {kit.name.split(' ')[0]} {kit.name.split(' ')[1]}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                  🛡️ {kit.warranty || '12 Years'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                  GST 5% Included
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                                {kit.components_summary || kit.sub_title}
                              </p>
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ Included' : '+ Add Kit'}
                            </button>
                          </div>

                          {/* Pricing Display */}
                          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              ₹{kitPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">/ kit</span>
                            {kit.batch_total && (
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                • Batch: ₹{Number(kit.batch_total).toLocaleString('en-IN')} ({kit.moq} kits)
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ {kitStock} Units Live in Serving Warehouses
                            {formData.servingWarehouses.length > 1 && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">
                                ({formData.servingWarehouses.map(w => `${w}: ${kit.warehouse_stock?.[w] || 0}`).join(' • ')})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Solar Shop MOQ Requirement with Quick Batch Selector */}
                        <div
                          className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <FaBoxes className="text-amber-600 w-3.5 h-3.5" /> Solar Shop Wholesale MOQ:
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Loose order batch requirement in store
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                value={kitMoqVal}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setFormData(prev => ({
                                    ...prev,
                                    kitMoqs: { ...prev.kitMoqs, [kit.id]: val },
                                    minOrderQty: val
                                  }));
                                }}
                                className="w-16 px-2 py-0.5 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                              />
                              <span className="text-[11px] font-bold text-slate-500">Kits</span>
                            </div>
                          </div>

                          {/* Quick Store Batch Quantity Pills */}
                          {kit.loose_order_quantities && kit.loose_order_quantities.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Store Batches:</span>
                              {kit.loose_order_quantities.map(qty => (
                                <button
                                  key={qty}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      kitMoqs: { ...prev.kitMoqs, [kit.id]: qty },
                                      minOrderQty: qty
                                    }));
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    kitMoqVal === qty
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                  }`}
                                >
                                  {qty} Kits
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coupon Code Configuration Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-amber-200 dark:border-amber-800/60 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FaGift className="text-amber-600 w-5 h-5" />
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Coupon Voucher Configuration & OfferMaster Link
                    </h4>
                  </div>
                  <select
                    value={formData.coupon_offer_id}
                    onChange={(e) => {
                      const sel = couponsList.find((c) => String(c._id) === e.target.value);
                      if (sel) {
                        setFormData((p) => ({
                          ...p,
                          hasCoupon: true,
                          coupon_offer_id: String(sel._id),
                          couponCode: sel.coupon_code || p.couponCode,
                          discountType: sel.discount_type === 'percentage' ? 'percent' : 'flat',
                          discountValue: sel.discount_value || p.discountValue
                        }));
                      } else {
                        setFormData((p) => ({ ...p, coupon_offer_id: '' }));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="">-- Create / Custom Code Below --</option>
                    {couponsList.filter((c) => c.coupon_code).map((c) => (
                      <option key={c._id} value={String(c._id)}>
                        {c.coupon_code} — {c.offer_name} ({c.discount_value}{c.discount_type === 'percentage' ? '%' : '₹'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Coupon Voucher Code *
                    </label>
                    <input
                      type="text"
                      value={formData.couponCode}
                      onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold uppercase focus:outline-hidden focus:border-amber-500"
                      placeholder="e.g. SOLARDIWALI5000"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                    >
                      <option value="per_kit">Per Kit Discount (₹ / Kit)</option>
                      <option value="flat">Flat Discount on Order Total (₹)</option>
                      <option value="percent">Percentage Discount (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-hidden focus:border-amber-500"
                      placeholder="e.g. 5000"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase flex items-center justify-between">
                      <span>Minimum Order Qty (MOQ) *</span>
                      <span className={`text-[10px] font-bold ${isMoqInvalid ? 'text-red-600' : 'text-emerald-600'}`}>
                        {selectedKitObjects.length > 1
                          ? `${selectedKitObjects.length} Kits Selected`
                          : `store req: ≥ ${minimumRequiredMoq} kits`}
                      </span>
                    </label>

                    {selectedKitObjects.length <= 1 ? (
                      <div>
                        <input
                          type="number"
                          min="1"
                          value={formData.minOrderQty}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            const kId = selectedKitObjects[0]?.id;
                            setFormData(prev => ({
                              ...prev,
                              minOrderQty: val,
                              kitMoqs: kId ? { ...prev.kitMoqs, [kId]: val } : prev.kitMoqs
                            }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-sm font-bold focus:outline-hidden ${
                            isMoqInvalid
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500'
                          }`}
                          placeholder="25"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Coupon unlocks in Solar Shop cart only when EPC orders ≥ this MOQ of eligible kits.
                        </p>
                      </div>
                    ) : (
                      /* When multiple kits are selected, show compact summary pill */
                      <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Selected Kit MOQs:</span>
                          <span className="text-[10px] font-black text-indigo-600">
                            {selectedKitObjects.map(k => `${formData.kitMoqs?.[k.id] ?? k.moq ?? 25}`).join(' / ')} Kits
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {selectedKitObjects.map(k => {
                            const kMoq = formData.kitMoqs?.[k.id] ?? k.moq ?? 25;
                            const isBelow = kMoq < (k.moq || 25);
                            return (
                              <span
                                key={k.id}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                                  isBelow
                                    ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200'
                                }`}
                              >
                                {k.name.split(' ')[0]} {k.name.split(' ')[1]}: <strong>{kMoq}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🎯 Individual MOQ Requirements for ALL Selected Kits */}
                {selectedKitObjects.length > 0 && (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/90 dark:border-amber-800/60 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-amber-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                          <FaBoxes className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                          Minimum Order Quantity (MOQ) for Each Included Kit ({selectedKitObjects.length} Kits Selected)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                        Live Auto-Synced from Solar Shop Wholesale Batches
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedKitObjects.map(kit => {
                        const kitMoqVal = formData.kitMoqs?.[kit.id] ?? kit.moq ?? 25;
                        const storeReqMoq = kit.moq ?? 25;
                        const isKitInvalid = kitMoqVal < storeReqMoq;

                        return (
                          <div
                            key={kit.id}
                            className={`p-3.5 rounded-xl border-2 transition-all space-y-2.5 ${
                              isKitInvalid
                                ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                                : 'border-amber-200 dark:border-slate-700 bg-amber-50/20 dark:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={kit.name}>
                                  {kit.name}
                                </h5>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    ₹{Number(kit.base_price).toLocaleString('en-IN')} / kit
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                    isKitInvalid
                                      ? 'text-red-700 bg-red-100 dark:bg-red-900/50'
                                      : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50'
                                  }`}>
                                    Store MOQ: ≥ {storeReqMoq} Kits
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white shrink-0">
                                Included
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Minimum Order Qty:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={kitMoqVal}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setFormData(prev => {
                                      const updatedKitMoqs = { ...prev.kitMoqs, [kit.id]: val };
                                      const lowest = Math.min(...selectedKitObjects.map(k => k.id === kit.id ? val : (updatedKitMoqs[k.id] ?? k.moq ?? 25)));
                                      return {
                                        ...prev,
                                        kitMoqs: updatedKitMoqs,
                                        minOrderQty: lowest
                                      };
                                    });
                                  }}
                                  className={`w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border focus:outline-hidden ${
                                    isKitInvalid
                                      ? 'border-red-500 bg-white text-red-900 focus:border-red-600'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500'
                                  }`}
                                />
                                <span className="text-[11px] font-bold text-slate-500">Kits</span>
                              </div>
                            </div>

                            {/* Store Batch Quantity Quick Buttons */}
                            {kit.loose_order_quantities && kit.loose_order_quantities.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Store Batches:</span>
                                {kit.loose_order_quantities.map(qty => (
                                  <button
                                    key={qty}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => {
                                        const updatedKitMoqs = { ...prev.kitMoqs, [kit.id]: qty };
                                        const lowest = Math.min(...selectedKitObjects.map(k => k.id === kit.id ? qty : (updatedKitMoqs[k.id] ?? k.moq ?? 25)));
                                        return {
                                          ...prev,
                                          kitMoqs: updatedKitMoqs,
                                          minOrderQty: lowest
                                        };
                                      });
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                      kitMoqVal === qty
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                  >
                                    {qty} Kits
                                  </button>
                                ))}
                              </div>
                            )}

                            {isKitInvalid && (
                              <p className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                ⚠ Minimum order in Solar Shop is {storeReqMoq} kits!
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Validation Banner if ANY Selected Kit is Below Store Threshold */}
                {isMoqInvalid && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <FaExclamationTriangle className="text-red-600 w-4 h-4 shrink-0" />
                      <div>
                        <span className="font-bold block">Coupon Code Disabled & Inactive in Solar Shop</span>
                        <p className="text-[11px] text-red-700 dark:text-red-300">
                          {invalidMoqKits.length > 0
                            ? invalidMoqKits.map(k => `${k.name} has MOQ ${formData.kitMoqs?.[k.id] || k.moq} (Store requires ≥ ${k.moq} Kits)`).join(' • ')
                            : `Selected MOQ (${formData.minOrderQty} Kits) is less than the store required minimum.`}
                          . Contractors will NOT be able to apply this coupon code at checkout!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFixAllMoqs}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Auto-Fix All MOQs to Store Batches
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-100 dark:border-slate-700/60">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Coupon Expiry Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.couponExpiry}
                      onChange={(e) => setFormData({ ...formData, couponExpiry: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.singleUsePerEpc}
                        onChange={(e) => setFormData({ ...formData, singleUsePerEpc: e.target.checked })}
                        className="rounded-sm text-amber-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Single Use per EPC: Limit 1 redemption per verified GSTIN
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.deactivateOnCampaignEnd}
                        onChange={(e) => setFormData({ ...formData, deactivateOnCampaignEnd: e.target.checked })}
                        className="rounded-sm text-amber-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Auto-deactivate coupon code immediately when campaign ends or is paused
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DEDICATED PURPOSE: GOVERNMENT & PSU TENDER KITS PROMOTION */}
          {formData.objective === 'govt_tender_promotion' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-slate-900/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-slate-950/40 border-2 border-blue-500/30 dark:border-blue-700/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                      <FaLandmark className="w-5 h-5 text-amber-300" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        Government & PSU Tender Solar Kits Promotion
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Promoting state-approved tender combo kits with DCR compliance, wholesale bulk supply tags, and state specifications.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Step 2 Target States:</span>
                    {formData.selectedStates && formData.selectedStates.length > 0 ? (
                      formData.selectedStates.map(st => (
                        <span key={st} className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-300">
                          🏛️ {st}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        No states selected in Step 2
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Kit Selection Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <FaBoxes className="text-blue-600" /> Select Government Tender Kits Mapped for Selected States *
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Showing only combo kits configured under Govt Tender Kits Configuration that actively match your Step 2 state selection.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {govtTenderFilteredKits.length} Available in Selected States
                  </span>
                </div>

                {govtTenderFilteredKits.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-2">
                    <FaExclamationTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No Government Tender Kits Configured for Selected States ({formData.selectedStates.join(', ') || 'None'})
                    </h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      There are currently no active Government Tender Kit configurations matching the states selected in Step 2.
                      Please map combo kits to these states in <strong>Product Configurations &gt; Govt Tender Kits</strong> or select different states in Step 2.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {govtTenderFilteredKits.map(kit => {
                      const isSelected = formData.selectedKitIds.includes(kit.id);
                      const kitPrice = Number(kit.base_price || kit.defaultPrice || kit.price || 89317);
                      const kitStock = Number(kit.stockQty ?? kit.stock_in_selected_warehouses ?? 0);
                      const kitMoqVal = formData.kitMoqs?.[kit.id] ?? kit.moq ?? 25;

                      return (
                        <div
                          key={kit.id}
                          onClick={() => handleToggleKit(kit.id)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {/* Tender State & Badge Row */}
                                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-700 text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                                    <FaLandmark className="text-[9px] text-amber-300" />
                                    {kit.primary_badge || 'GOVT. TENDER'}
                                  </span>
                                  {kit.target_state && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                      📍 {kit.target_state}
                                    </span>
                                  )}
                                  {kit.secondary_badge && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white shadow-2xs uppercase">
                                      {kit.secondary_badge}
                                    </span>
                                  )}
                                  {kit.dcr_module_available && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                      ✓ DCR Modules
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {kit.tender_name || kit.name}
                                  </span>
                                </div>

                                {/* Tender Tagline */}
                                {kit.tender_tagline && (
                                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 italic mb-1">
                                    "{kit.tender_tagline}"
                                  </p>
                                )}

                                {/* Tender Specifications & Eligibility Box */}
                                {kit.tender_description && (
                                  <div className="my-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                                    <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                                      🏛️ Tender Specifications & Eligibility:
                                    </p>
                                    <p className="line-clamp-2 leading-relaxed">
                                      {kit.tender_description}
                                    </p>
                                  </div>
                                )}

                                {/* Base Catalog Kit components */}
                                <div className="flex items-center gap-1.5 flex-wrap my-1">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                    ⚡ Base: {kit.name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                    🛡️ {kit.warranty || '12 Years'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                    GST 5% Included
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                                  {kit.components_summary || kit.sub_title}
                                </p>
                              </div>

                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {isSelected ? '✓ Included' : '+ Add Kit'}
                              </button>
                            </div>

                            {/* Pricing Display */}
                            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                ₹{kitPrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">/ kit</span>
                              {kit.batch_total && (
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                  • Batch: ₹{Number(kit.batch_total).toLocaleString('en-IN')} ({kit.moq} kits)
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                              ✓ {kitStock} Units Live in Serving Warehouses
                              {formData.servingWarehouses.length > 1 && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">
                                  ({formData.servingWarehouses.map(w => `${w}: ${kit.warehouse_stock?.[w] || 0}`).join(' • ')})
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Solar Shop MOQ Requirement with Quick Batch Selector */}
                          <div
                            className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <FaBoxes className="text-blue-600 w-3.5 h-3.5" /> Solar Shop Wholesale MOQ:
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Loose order batch requirement in store
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={kitMoqVal}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setFormData(prev => ({
                                      ...prev,
                                      kitMoqs: { ...prev.kitMoqs, [kit.id]: val },
                                      minOrderQty: val
                                    }));
                                  }}
                                  className="w-16 px-2 py-0.5 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                                />
                                <span className="text-[11px] font-bold text-slate-500">Kits</span>
                              </div>
                            </div>

                            {/* Quick Store Batch Quantity Pills */}
                            {kit.loose_order_quantities && kit.loose_order_quantities.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Store Batches:</span>
                                {kit.loose_order_quantities.map(qty => (
                                  <button
                                    key={qty}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        kitMoqs: { ...prev.kitMoqs, [kit.id]: qty },
                                        minOrderQty: qty
                                      }));
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                      kitMoqVal === qty
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                  >
                                    {qty} Kits
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. DEDICATED PURPOSE: DIRECT KIT SALES & REPEAT ORDERS */}
          {formData.objective === 'sales' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <FaBoxes className="text-indigo-600" /> Select In-Stock Solar Kits for Direct Commercial Wholesale Orders *
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select commercial kits to allocate for direct repeat wholesale orders across serving depots.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Serving: {formData.servingWarehouses.join(', ') || 'All Depots'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dynamicAreaKits.map(kit => {
                    const isSelected = formData.selectedKitIds.includes(kit.id);
                    const kitPrice = Number(kit.base_price || kit.defaultPrice || kit.price || 89317);
                    const kitStock = Number(kit.stockQty ?? kit.stock_in_selected_warehouses ?? 0);
                    const kitMoqVal = formData.kitMoqs?.[kit.id] ?? kit.moq ?? 25;

                    return (
                      <div
                        key={kit.id}
                        onClick={() => handleToggleKit(kit.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{kit.name}</span>
                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-600 text-white">
                                    Selected for Sale
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap my-1">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                  ⚡ {kit.name.split(' ')[0]} {kit.name.split(' ')[1]}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                  🛡️ {kit.warranty || '12 Years'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                  GST 5% Included
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                                {kit.components_summary || kit.sub_title}
                              </p>
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ Added' : '+ Allocate Kit'}
                            </button>
                          </div>

                          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              ₹{kitPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">/ kit</span>
                            {kit.batch_total && (
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                • Batch: ₹{Number(kit.batch_total).toLocaleString('en-IN')} ({kit.moq} kits)
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ {kitStock} Units Live in Serving Warehouses
                            {formData.servingWarehouses.length > 1 && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">
                                ({formData.servingWarehouses.map(w => `${w}: ${kit.warehouse_stock?.[w] || 0}`).join(' • ')})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Quick Store Batch Quantity Pills */}
                        {kit.loose_order_quantities && kit.loose_order_quantities.length > 0 && (
                          <div
                            className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Wholesale Batches:</span>
                            {kit.loose_order_quantities.map(qty => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    kitMoqs: { ...prev.kitMoqs, [kit.id]: qty },
                                    minOrderQty: qty
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  kitMoqVal === qty
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {qty} Kits
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Direct Wholesale Pricing & Volume Terms Box */}
              <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <FaTag className="text-indigo-600" /> Commercial Wholesale Terms & Dispatch Guarantees
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Minimum Order Qty (MOQ)</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white">1 Kit Minimum</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Direct contractor pallet dispatch</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Dispatch SLA</span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">Same-Day / 24-Hour Dispatch</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">From certified serving depots</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Payment & Credit Slabs</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Net-15 / Advance Slabs</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Automated GST wholesale invoice</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DEDICATED PURPOSE: ADD TO CART & QUOTATION PUSH */}
          {formData.objective === 'add_to_cart' && (
            <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FaBoxes className="text-amber-600" /> Abandoned Cart Recovery & Direct Quotation Push
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target EPCs with pending items in cart or open quotation requests with exclusive checkout incentives.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 border border-amber-300">
                  Cart Push
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Cart Recovery Code *
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Cart Checkout Discount Value (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. DEDICATED PURPOSE: PRODUCT PROMOTION & AWARENESS */}
          {formData.objective === 'product_promotion' && (
            <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-slate-900 border border-blue-200 dark:border-blue-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FaRocket className="text-blue-600" /> New Technology & Product Awareness Showcase
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Promote high-efficiency N-Type TopCon bifacial panels, hybrid inverters & BOS combo innovations.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 border border-blue-300">
                  Tech Showcase
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Includes Direct Datasheet & Engineering Specs Link</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">EPCs can download certified technical brochures & warranty cards directly from CTA.</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                  Datasheet Attached
                </span>
              </div>
            </div>
          )}

          {/* 5. DEDICATED PURPOSE: INACTIVE EPC REACTIVATION */}
          {formData.objective === 'epc_activation' && (
            <div className="p-5 rounded-2xl bg-rose-50/40 dark:bg-slate-900 border border-rose-200 dark:border-rose-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FaClock className="text-rose-600" /> Inactive EPC Contractor Reactivation & Win-Back Drive
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target EPCs who haven't placed an order in 60+ days with special welcome-back wallet credits.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 border border-rose-300">
                  Win-Back
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Win-Back Voucher Code *
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Win-Back Reorder Credit (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CONDITIONAL SECTION: EPC SIGN-UP & CONTRACTOR REGISTRATION DRIVE */}
          {formData.objective === 'epc_onboarding' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-indigo-200 dark:border-indigo-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaUserPlus className="text-indigo-600 w-5 h-5" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    New EPC Contractor Registration & Onboarding Engine
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300">
                  Partner Acquisition
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Registration Welcome Voucher *
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold uppercase focus:outline-hidden focus:border-indigo-500"
                    placeholder="WELCOMEEPC"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Credited automatically upon verified GST registration</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Welcome Credit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-hidden focus:border-indigo-500"
                    placeholder="5000"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Direct wallet cashback on first B2B purchase</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    EPC Registration Expiry / Offer Window
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.couponExpiry}
                    onChange={(e) => setFormData({ ...formData, couponExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 space-y-2">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide block">
                  Contractor Verification Guarantees
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded-sm text-indigo-600" />
                    <span>Mandatory GSTIN & PAN Auto-Verification via Sandbox</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded-sm text-indigo-600" />
                    <span>Physical Welcome Swatch & Solar Cable Sample Kit Dispatched</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* CONDITIONAL SECTION: FRANCHISE STORE VISITS */}
          {formData.objective === 'store_visits' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaStore className="text-emerald-600 w-5 h-5" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Franchise Store Footfall & Walk-in Pickup Voucher
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  Depot Pickup Incentive
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Store Walk-in Voucher Code *
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold uppercase focus:outline-hidden focus:border-emerald-500"
                    placeholder="STOREVISIT2000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Counter Pickup Credit (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-hidden focus:border-emerald-500"
                    placeholder="2000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Voucher Expiry
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.couponExpiry}
                    onChange={(e) => setFormData({ ...formData, couponExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide block mb-2">
                  Participating Franchise Depots for this Campaign:
                </span>
                <div className="flex flex-wrap gap-2">
                  {servingWarehousesDetailed.map(wh => (
                    <span
                      key={wh.id || wh.warehouse_code}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
                    >
                      <FaWarehouse className="text-emerald-600 w-3 h-3" /> {wh.warehouse_name || wh.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONDITIONAL SECTION: EPC KYC ONBOARDING DRIVE */}
          {formData.objective === 'epc_onboarding' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-amber-200 dark:border-amber-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-amber-600 w-5 h-5" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    EPC KYC Verification & Compliance Acceleration
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  Compliance Drive
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    KYC Incentive Reward Code *
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold uppercase focus:outline-hidden focus:border-amber-500"
                    placeholder="KYCVERIFIED1000"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unlocked directly upon GST and Bank account approval</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Instant Wallet Bonus (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-hidden focus:border-amber-500"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Creative & Message Template Studio (WhatsApp & Email) */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaCogs className="text-indigo-600" /> 4. Creative & Message Template Studio
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose Meta-approved WhatsApp message templates and responsive HTML email designs, or design custom dynamic creatives.
              </p>
            </div>

            {/* If channel is BOTH, allow switching between WhatsApp and Email studios */}
            {formData.channel === 'BOTH' && (
              <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCreativeChannelTab('WHATSAPP')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    creativeChannelTab === 'WHATSAPP'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FaWhatsapp className="w-3.5 h-3.5" /> WhatsApp Studio
                </button>
                <button
                  type="button"
                  onClick={() => setCreativeChannelTab('EMAIL')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    creativeChannelTab === 'EMAIL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FaEnvelope className="w-3.5 h-3.5" /> Email Studio
                </button>
              </div>
            )}
          </div>

          {/* MongoDB Saved Templates & Subject Quick Binding */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {(formData.channel === 'EMAIL' || formData.channel === 'BOTH') && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email Subject Line *</label>
                  <input
                    type="text"
                    value={formData.emailSubject}
                    onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
                    placeholder="Subject line..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bind Saved DB Email Template (Optional)</label>
                  <select
                    value={formData.selectedEmailTemplateId}
                    onChange={(e) => {
                      const sel = dbTemplates.find((t) => String(t._id) === e.target.value);
                      setFormData((p) => ({
                        ...p,
                        selectedEmailTemplateId: e.target.value,
                        emailSubject: sel?.subject || p.emailSubject,
                        templateMode: e.target.value ? 'preset' : 'custom'
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
                  >
                    <option value="">-- Use Custom Email Studio Design Below --</option>
                    {dbTemplates.filter((t) => t.channel === 'email').map((t) => (
                      <option key={t._id} value={String(t._id)}>
                        {t.name} [{t.status}]
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {(formData.channel === 'WHATSAPP' || formData.channel === 'BOTH') && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bind Saved DB WhatsApp Template (Optional)</label>
                <select
                  value={formData.selectedWhatsAppTemplateId}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      selectedWhatsAppTemplateId: e.target.value,
                      templateMode: e.target.value ? 'preset' : 'custom'
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
                >
                  <option value="">-- Use Custom WhatsApp Studio Message Below --</option>
                  {dbTemplates.filter((t) => t.channel === 'whatsapp').map((t) => (
                    <option key={t._id} value={String(t._id)}>
                      {t.name} ({t.wa_template_name || 'meta'}) [{t.status}]
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Render Active Studio */}
          {(formData.channel === 'WHATSAPP' || (formData.channel === 'BOTH' && creativeChannelTab === 'WHATSAPP')) && (
            <WhatsAppStudio
              formData={formData}
              setFormData={setFormData}
              selectedKitObjects={selectedKitObjects}
              allKitsCatalog={dynamicAreaKits}
              warehousesList={warehousesList}
            />
          )}

          {(formData.channel === 'EMAIL' || (formData.channel === 'BOTH' && creativeChannelTab === 'EMAIL')) && (
            <EmailStudio
              formData={formData}
              setFormData={setFormData}
              selectedKitObjects={selectedKitObjects}
              allKitsCatalog={dynamicAreaKits}
              warehousesList={warehousesList}
            />
          )}
        </div>
      )}

      {/* STEP 5: MIS Target Reference */}
      {currentStep === 5 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaChartLine className="text-indigo-600" /> 5. Territory MIS Sales Targets & Conversion Goals
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cluster sales goals set in Master Admin. Review target kits, current gap, and required conversion rate for this campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Target Area EPCs</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Live eligible recipients</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Target Leads Expected</label>
              <input
                type="number"
                min={0}
                value={formData.targetLeads}
                onChange={(e) => setFormData({ ...formData, targetLeads: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-black text-indigo-600"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Quarterly Kit Goal</label>
              <input
                type="number"
                min={0}
                value={formData.quarterlyKitGoal}
                onChange={(e) => setFormData({ ...formData, quarterlyKitGoal: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-black text-emerald-600"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] uppercase font-bold text-amber-600">Target Conversion Needed</span>
              <p className="text-xl font-black text-amber-600 mt-1">
                {formData.objective === 'epc_onboarding' ? formData.targetEpcSignups : formData.targetKitCount}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Est. {audienceCalculation.deduplicatedTotal > 0 ? (((formData.objective === 'epc_onboarding' ? formData.targetEpcSignups : formData.targetKitCount) / audienceCalculation.deduplicatedTotal) * 100).toFixed(2) : '0.00'}% conversion
              </p>
            </div>
          </div>

          {/* CONNECTED TARGETS: KIT-RELATED OBJECTIVES */}
          {formData.objective !== 'epc_onboarding' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FaBoxes className="text-indigo-600" /> Target Breakdown by Selected Solar Kits (Connected to Step 3) *
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Set specific closing targets for each kit selected in Step 3. Units are dynamically summed into your campaign goal.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {formData.selectedKitIds.length} Kit Model(s) Selected
                </span>
              </div>

              {formData.selectedKitIds.length === 0 ? (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-500">No kits are currently selected in Step 3.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Go to Step 3 & Select Kits
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.selectedKitIds.map(kitId => {
                    const kit = dynamicAreaKits.find(k => k.id === kitId) || liveKitsCatalog.find(k => k.id === kitId) || {
                      id: kitId,
                      name: kitId,
                      sku: 'SLR-CK',
                      base_price: 0,
                      stockQty: 0
                    };
                    const kitPrice = Number(kit.base_price || kit.defaultPrice || kit.price || 135000);
                    const stock = Number(kit.stockQty ?? kit.stock_in_selected_warehouses ?? 30);
                    const currentTarget = formData.kitTargets?.[kitId] ?? 20;
                    const estRevenue = currentTarget * kitPrice;

                    return (
                      <div
                        key={kitId}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={kit.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop&q=80'}
                            alt={kit.name}
                            className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{kit.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {kit.sku || 'SLR-CK-AUTO'}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Base: <strong>₹{kitPrice.toLocaleString('en-IN')}</strong>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ {stock} Units in Depots
                                {formData.servingWarehouses.length > 1 && (
                                  <span className="text-[9px] text-slate-500 font-normal ml-1">
                                    ({formData.servingWarehouses.map(w => `${w}: ${kit.warehouse_stock?.[w] || 0}`).join(' • ')})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700/60">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                              Target Kits to Close *
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={currentTarget}
                                onChange={(e) => handleKitTargetChange(kitId, e.target.value)}
                                className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-black text-center text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                              />
                              <span className="text-xs font-bold text-slate-500">Kits</span>
                            </div>
                          </div>

                          <div className="min-w-[130px] text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Projected Revenue
                            </span>
                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1">
                              ₹{estRevenue.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary Totals Card */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Total Campaign Target Goal
                      </span>
                      <p className="text-2xl font-black text-white mt-0.5">
                        {formData.targetKitCount} <span className="text-xs font-normal text-slate-300">Total Kits to Close</span>
                      </p>
                      <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                        Goal covers {formData.quarterlyKitGoal > 0 ? ((formData.targetKitCount / formData.quarterlyKitGoal) * 100).toFixed(1) : '0.0'}% of configured quarterly target ({formData.quarterlyKitGoal} Kits)
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Required Conversion Rate
                        </span>
                        <p className="text-lg font-black text-emerald-400 mt-0.5">
                          ~{audienceCalculation.deduplicatedTotal > 0 ? ((formData.targetKitCount / audienceCalculation.deduplicatedTotal) * 100).toFixed(2) : '0.00'}%
                        </p>
                        <p className="text-[10px] text-slate-400">of {audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')} Target EPCs</p>
                      </div>

                      <div className="text-right border-l border-slate-700 pl-6">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Total Projected Revenue
                        </span>
                        <p className="text-lg font-black text-indigo-300 mt-0.5">
                          ₹{selectedKitsRevenue.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400">across {formData.selectedKitIds.length} kit models</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* NON-KIT OBJECTIVE: EPC SIGN-UP GOAL */
            <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FaUserPlus className="text-indigo-600" /> Target EPC Contractor Sign-ups Goal *
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target number of verified contractors to acquire in this campaign drive.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                  Contractor Growth
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Target Verified EPC Sign-ups *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetEpcSignups || 150}
                    onChange={(e) => setFormData({ ...formData, targetEpcSignups: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Required Conversion Rate
                  </span>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ~{audienceCalculation.deduplicatedTotal > 0 ? (((formData.targetEpcSignups || 50) / audienceCalculation.deduplicatedTotal) * 100).toFixed(2) : '0.00'}%
                    </p>
                    <p className="text-[10px] text-slate-400">of {audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')} contractors</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Projected First-Order Pipeline
                  </span>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      ₹{(((formData.targetEpcSignups || 150) * 180000)).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400">Est. ₹1.80L / new contractor</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: Schedule & Smart Suppression Guard */}
      {currentStep === 6 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-600" /> 6. Dispatch Schedule & Smart Goal Suppression Guard
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure broadcast timing, recurring schedule, and automatic suppression of converted EPC contractors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Launch Execution Mode
              </label>
              <select
                value={formData.launchMode}
                onChange={(e) => setFormData({ ...formData, launchMode: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="immediate">Immediate Dispatch on Launch</option>
                <option value="scheduled">Scheduled Date & Time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Repeat Frequency
              </label>
              <select
                value={formData.repeatFrequency}
                onChange={(e) => setFormData({ ...formData, repeatFrequency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="once">One-Time Broadcast Only</option>
                <option value="weekly">Weekly Repeat Blast</option>
                <option value="monthly">Monthly Repeat Blast</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Preferred Blast Day & Time
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.repeatDay}
                  onChange={(e) => setFormData({ ...formData, repeatDay: e.target.value })}
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={formData.repeatTime}
                  onChange={(e) => setFormData({ ...formData, repeatTime: e.target.value })}
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Smart Goal Suppression Guard Box (Boss Requirement) */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaShieldAlt className="text-emerald-600 w-5 h-5" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Smart Goal Fulfillment Suppression Guard
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Recommended & Active
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.stopOnGoalAchievement}
                onChange={(e) => setFormData({ ...formData, stopOnGoalAchievement: e.target.checked })}
                className="mt-1 rounded-sm text-emerald-600 cursor-pointer"
              />
              <div className="text-xs text-slate-700 dark:text-slate-200">
                <strong className="text-slate-900 dark:text-white block">
                  Auto-Exclude Converted EPCs (Do not repeat messages once goal fulfilled):
                </strong>
                If an EPC completes the targeted objective (e.g. registers for an EPC account, redeems the coupon code, or places a solar kit order), immediately remove them from future blasts and follow-up reminders. Saves your message wallet quota and prevents spamming.
              </div>
            </label>
          </div>

          {/* Follow-up triggers */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
              Automated Dynamic Follow-up Timing
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">If clicked but cart abandoned, re-trigger after:</span>
              <input
                type="number"
                value={formData.followUpDelayValue}
                onChange={(e) => setFormData({ ...formData, followUpDelayValue: e.target.value })}
                className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
              />
              <select
                value={formData.followUpDelayUnit}
                onChange={(e) => setFormData({ ...formData, followUpDelayUnit: e.target.value })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 7: Comprehensive Review & Launch — All 6 Configuration Steps Audited */}
      {currentStep === 7 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaRocket className="text-indigo-600" /> 7. Final Audit & Launch Activation
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Review all 6 configured campaign modules before activation. Click "Edit" on any section to jump directly back to that step.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              All 6 Steps Audited
            </span>
          </div>

          {/* 6 Comprehensive Summary Audit Cards (One for each previous step) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1: 1. Campaign Identity & Wallet */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <FaBullhorn className="text-indigo-600" /> 1. Identity & Channel
                </span>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formData.campaignName || 'Untitled Campaign'}</p>
              <p className="text-xs text-slate-500">
                Channel: <strong>{formData.channel}</strong> • Owner: {formData.owner || 'Admin'}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">
                Budget: ₹{Number(formData.budget || 0).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Card 2: 2. Territory Area, Segments & Audience Breakdown */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-indigo-600" /> 2. Area, Segments & Audience
                </span>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formData.selectedStates.join(', ')} ({formData.selectedClusterIds.length} Clusters)
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Total Sending Count: <strong>{audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')}</strong>
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                  Target EPCs: {audienceCalculation.epcCount.toLocaleString('en-IN')}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  Segment Leads: {audienceCalculation.segmentCount.toLocaleString('en-IN')}
                </span>
              </div>
              {formData.selectedSegmentIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {formData.selectedSegmentIds.map((segId) => {
                    const segObj = segmentsList.find((s) => s._id === segId);
                    return (
                      <span key={segId} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                        {segObj?.name || segId}
                      </span>
                    );
                  })}
                  {(formData.segmentStateFilter || formData.segmentDistrictFilter) && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Filter: {[formData.segmentStateFilter, formData.segmentDistrictFilter].filter(Boolean).join(' / ')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Card 3: 3. Strategic Purpose, Kits & Coupon Voucher */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <FaGift className="text-amber-500" /> 3. Purpose & Voucher
                </span>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="text-sm font-black text-amber-600">
                {formData.couponCode} (
                {formData.discountType === 'percent'
                  ? `${formData.discountValue}%`
                  : `₹${Number(formData.discountValue).toLocaleString('en-IN')} ${formData.discountType === 'per_kit' ? '/ Kit' : 'Flat'}`}
                )
              </p>
              <p className="text-xs text-slate-500">
                Objective: <strong>{formData.objective}</strong> • Single Use: {formData.singleUsePerEpc ? '1 per GSTIN' : 'No'}
              </p>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Included Kits & Store MOQs:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedKitObjects.map(k => (
                    <span key={k.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
                      {k.name.split(' ')[0]} {k.name.split(' ')[1]}: {formData.kitMoqs?.[k.id] ?? k.moq ?? 25} Kits
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: 4. Creative Studio & Message Templates */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <FaCogs className="text-indigo-600" /> 4. Creative Studio
                </span>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formData.templateMode === 'preset' ? 'Pre-Approved Meta & Standard' : 'Custom Designer'}
              </p>
              <p className="text-xs text-emerald-600 font-semibold truncate">
                WA: {activeWATemplate.name}
              </p>
              <p className="text-xs text-blue-600 font-semibold truncate">
                Email: {activeEmailTemplate.name}
              </p>
            </div>

            {/* Card 5: 5. Territory MIS Sales Targets */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <FaChartLine className="text-indigo-600" /> 5. MIS Sales Targets
                </span>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formData.objective === 'epc_onboarding'
                  ? `Campaign Goal: ${formData.targetEpcSignups || 50} Verified EPC Sign-ups`
                  : `Campaign Goal: ${formData.targetKitCount} Kits to Close`}
              </p>
              <p className="text-xs text-slate-500">
                {formData.objective === 'epc_onboarding'
                  ? `Target Leads: ${formData.targetLeads}`
                  : `Quarterly Target: ${formData.quarterlyKitGoal} Kits • Proj. Revenue: ₹${selectedKitsRevenue.toLocaleString('en-IN')}`}
              </p>
              <p className="text-[11px] text-amber-600 font-semibold">
<<<<<<< HEAD
                Required Conversion: ~{audienceCalculation.deduplicatedTotal > 0 ? (formData.objective === 'epc_onboarding'
                  ? (((formData.targetEpcSignups || 50) / audienceCalculation.deduplicatedTotal) * 100).toFixed(2)
                  : ((formData.targetKitCount / audienceCalculation.deduplicatedTotal) * 100).toFixed(2)) : '0.00'}%
=======
                Required Conversion: ~{audienceCalculation.deduplicatedTotal > 0
                  ? (formData.objective === 'epc_signup'
                      ? (((formData.targetEpcSignups || 150) / audienceCalculation.deduplicatedTotal) * 100).toFixed(2)
                      : ((formData.targetKitCount / audienceCalculation.deduplicatedTotal) * 100).toFixed(2))
                  : '0.00'}%
>>>>>>> 1be01239219aba6043c1ae0b8eb9296b9aa57074
              </p>
            </div>

            {/* Card 6: 6. Dispatch Schedule & Smart Suppression */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <FaCalendarAlt className="text-indigo-600" /> 6. Schedule & Suppression
                </span>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formData.repeatFrequency} ({formData.repeatDay} at {formData.repeatTime})
              </p>
              <p className="text-xs text-emerald-600 font-semibold">
                ✓ Smart Converted EPC Suppression: {formData.stopOnGoalAchievement ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-[11px] text-slate-500">
                Follow-up: {formData.followUpDelayValue} {formData.followUpDelayUnit} delay
              </p>
            </div>

          </div>

          {/* Real Provider Test Send Panel */}
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FaPaperPlane className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Real Provider Test Dispatch (No Simulation)</p>
                  <p className="text-[11px] text-slate-500">
                    Dispatch a live test via your selected SMTP/Resend/SES and Meta WhatsApp sender before blasting {audienceCalculation.deduplicatedTotal.toLocaleString('en-IN')} EPCs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={testSending}
                onClick={handleTestSend}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0"
              >
                <FaPaperPlane /> {testSending ? 'Sending...' : 'Send Live Test'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {(formData.channel === 'EMAIL' || formData.channel === 'BOTH') && (
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Test recipient email (e.g. yourname@domain.com)"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              )}
              {(formData.channel === 'WHATSAPP' || formData.channel === 'BOTH') && (
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Test WhatsApp phone (e.g. +9198XXXXXXXX)"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              )}
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${testResult.success ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-300' : 'bg-rose-100/70 text-rose-900 border border-rose-300'}`}>
                <div>{testResult.message}</div>
                {testResult.results?.email && (
                  <div className="mt-1">
                    Email ({testResult.results.email.provider}): {testResult.results.email.success ? `Sent (ID: ${testResult.results.email.messageId})` : `Failed — ${testResult.results.email.error}`}
                  </div>
                )}
                {testResult.results?.whatsapp && (
                  <div className="mt-1">
                    WhatsApp ({testResult.results.whatsapp.provider}): {testResult.results.whatsapp.success ? `Sent (ID: ${testResult.results.whatsapp.messageId})` : `Failed — ${testResult.results.whatsapp.error}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              disabled={savingCampaign}
              onClick={() => handleLaunchCampaign('draft')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>

            {formData.launchMode === 'scheduled' && (
              <button
                type="button"
                disabled={savingCampaign}
                onClick={() => handleLaunchCampaign('scheduled')}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <FaCalendarAlt /> Save & Schedule Campaign
              </button>
            )}

            <button
<<<<<<< HEAD
              type="button"
              disabled={savingCampaign}
              onClick={() => handleLaunchCampaign('launch')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <FaRocket className="w-4 h-4" /> {savingCampaign ? 'Saving & Queuing...' : 'Launch & Dispatch Immediately'}
=======
              onClick={handleLaunchCampaign}
              disabled={launchingCampaign}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <FaRocket className="w-4 h-4" /> {launchingCampaign ? 'Launching Campaign...' : 'Launch & Activate Campaign Now'}
>>>>>>> 1be01239219aba6043c1ae0b8eb9296b9aa57074
            </button>
          </div>
        </div>
      )}

      {/* Wizard Bottom Controls (Previous / Next) */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
          disabled={currentStep === 1}
          className={`px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition-all ${
            currentStep === 1
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer'
          }`}
        >
          <FaArrowLeft className="w-3 h-3" /> Previous Step
        </button>

        {currentStep < 7 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.min(prev + 1, 7))}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            Next Step <FaArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
<<<<<<< HEAD
            disabled={savingCampaign}
            onClick={() => handleLaunchCampaign('launch')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            {savingCampaign ? 'Dispatching...' : 'Launch Campaign'} <FaCheck className="w-3 h-3" />
=======
            onClick={handleLaunchCampaign}
            disabled={launchingCampaign}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-60"
          >
            <FaCheck className="w-3 h-3" /> {launchingCampaign ? 'Launching...' : 'Launch Campaign'}
>>>>>>> 1be01239219aba6043c1ae0b8eb9296b9aa57074
          </button>
        )}
      </div>
    </div>
  );
}
