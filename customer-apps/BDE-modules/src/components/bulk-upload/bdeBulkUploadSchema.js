const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const BDE_EPC_LEADS_FIELD_OPTIONS = [
  {
    key: 'company_name',
    label: 'Company / Firm Name',
    desc: 'Contractor legal business name',
    required: true,
    tag: 'Required',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sample: 'Apex Solar Tech Pvt Ltd',
    aliases: ['company', 'companyname', 'firm', 'firmname', 'epc', 'epcname', 'business', 'businessname', 'name'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'Company Name is required';
      if (val && val.length < 2) return 'Too short';
      return null;
    },
  },
  {
    key: 'mobile_number',
    label: 'Mobile Number',
    desc: '10-digit Indian contact number',
    required: true,
    tag: 'Required',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sample: '9876543210',
    aliases: ['mobile', 'mobilenumber', 'phone', 'phonenumber', 'contactno', 'contactnumber', 'whatsapp', 'cell'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'Mobile Number is required';
      if (val && !/^[6-9]\d{9}$/.test(val)) return 'Invalid 10-digit Indian mobile (starts 6-9)';
      return null;
    },
  },
  {
    key: 'gst_number',
    label: 'GSTIN / GST Number',
    desc: '15-char Tax ID (Extract & Validate)',
    required: false,
    tag: 'Tax / GST',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    sample: '24ABCDE1234F1Z5',
    aliases: ['gst', 'gstin', 'gstno', 'gstnumber', 'taxid'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'GSTIN is required';
      if (val && !GST_RX.test(val)) return 'Invalid 15-char GSTIN format';
      return null;
    },
  },
  {
    key: 'email',
    label: 'Email Address',
    desc: 'Contractor email (optional check)',
    required: false,
    tag: 'Optional',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
    sample: 'contact@apexsolar.in',
    aliases: ['email', 'emailid', 'emailaddress', 'mail'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'Email is required';
      if (val && !EMAIL_RX.test(val)) return 'Invalid email format';
      return null;
    },
  },
  {
    key: 'contact_person',
    label: 'Contact Person',
    desc: 'Proprietor name (or firm name fallback)',
    required: false,
    tag: 'Contact',
    tagColor: 'bg-slate-100 text-slate-700 border-slate-200',
    sample: 'Rajesh Sharma',
    aliases: ['contactperson', 'contactname', 'owner', 'ownername', 'proprietor', 'person', 'fullname'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'Contact Person is required';
      return null;
    },
  },
  {
    key: 'district_name',
    label: 'District / City',
    desc: 'Contractor district (auto-maps Cluster & State)',
    required: false,
    alwaysValidate: true,
    defaultKey: 'default_district',
    tag: 'Territory',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    sample: 'Pune',
    aliases: ['district', 'districtname', 'city', 'town', 'taluka', 'zilla'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'District is required';
      return null;
    },
  },
  {
    key: 'state_name',
    label: 'State',
    desc: 'Contractor state (inferred from District if omitted)',
    required: false,
    alwaysValidate: true,
    defaultKey: 'default_state',
    tag: 'Territory',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    sample: 'Maharashtra',
    aliases: ['state', 'statename', 'province', 'pradesh'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'State is required';
      return null;
    },
  },
  {
    key: 'cluster_name',
    label: 'Franchisee Cluster',
    desc: 'Auto-matched from District & State',
    required: false,
    defaultKey: 'default_cluster',
    tag: 'Territory',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    sample: 'Pune Region',
    aliases: ['cluster', 'clustername', 'clustercode', 'region', 'zone'],
  },
  {
    key: 'pincode',
    label: 'Pincode / Postal',
    desc: '6-digit area postal code',
    required: false,
    tag: 'Location',
    tagColor: 'bg-slate-100 text-slate-700 border-slate-200',
    sample: '411001',
    aliases: ['pincode', 'pin', 'zip', 'zipcode', 'postalcode', 'postal'],
    validate: (val, _row, _defaults, fieldMeta) => {
      if (fieldMeta?.required && !val) return 'Pincode is required';
      if (val && !/^\d{6}$/.test(val)) return 'Must be 6 digits';
      return null;
    },
  },
  {
    key: 'address_line',
    label: 'Office / Shop Address',
    desc: 'Premises street or landmark',
    required: false,
    tag: 'Location',
    tagColor: 'bg-slate-100 text-slate-700 border-slate-200',
    sample: '101 Titanium City Centre',
    aliases: ['address', 'addressline', 'street', 'location', 'shopaddress', 'officeaddress'],
  },
  {
    key: 'epc_type',
    label: 'Classification / Category',
    desc: 'Auto-detected (Buyer / Verified / Registered) if empty',
    required: false,
    defaultKey: 'default_epc_type',
    tag: 'Classification',
    tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
    sample: '',
    aliases: ['epctype', 'classification', 'type', 'category', 'tier'],
  },
  {
    key: 'lead_source',
    label: 'Lead Source',
    desc: 'e.g. direct_visit, referral (or default)',
    required: false,
    defaultKey: 'default_lead_source',
    tag: 'Source',
    tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
    sample: 'direct_visit',
    aliases: ['leadsource', 'source', 'channel'],
  },
  {
    key: 'interested_products',
    label: 'Products of Interest',
    desc: 'Solar products (or default)',
    required: false,
    defaultKey: 'default_products',
    tag: 'Products',
    tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    sample: 'Residential On-Grid, Commercial On-Grid',
    aliases: ['interestedproducts', 'products', 'product', 'category'],
  },
  {
    key: 'follow_up_date',
    label: 'Follow-up Date',
    desc: 'Next call date YYYY-MM-DD (or default)',
    required: false,
    defaultKey: 'default_follow_up_date',
    tag: 'Schedule',
    tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
    sample: '2026-12-15',
    aliases: ['followupdate', 'followup', 'nextcall'],
  },
  {
    key: 'remarks',
    label: 'Campaign Note / Remarks',
    desc: 'Custom note (or default)',
    required: false,
    defaultKey: 'default_remarks',
    tag: 'Notes',
    tagColor: 'bg-slate-100 text-slate-700 border-slate-200',
    sample: 'Interested in 50kW solar inverters',
    aliases: ['remarks', 'remark', 'notes', 'note', 'comment', 'requirement'],
  },
];

export const BDE_BULK_PRESETS = [
  {
    key: 'with_gst',
    label: 'With GST (Commercial)',
    fields: ['company_name', 'mobile_number', 'gst_number', 'email', 'contact_person', 'district_name', 'state_name'],
  },
  {
    key: 'no_gst',
    label: 'Basic (No GST)',
    fields: ['company_name', 'mobile_number', 'contact_person', 'district_name', 'state_name'],
  },
  {
    key: 'minimal',
    label: 'Name + Mobile',
    fields: ['company_name', 'mobile_number', 'district_name'],
  },
  {
    key: 'all',
    label: 'All Fields',
    fields: BDE_EPC_LEADS_FIELD_OPTIONS.map((f) => f.key),
    primary: true,
  },
];

export const BDE_SAMPLE_ROWS = [
  {
    company_name: 'Apex Solar Tech Pvt Ltd',
    mobile_number: '9876543210',
    gst_number: '27ABCDE1234F1Z5',
    email: 'contact@apexsolar.in',
    contact_person: 'Rajesh Sharma',
    district_name: 'Pune',
    state_name: 'Maharashtra',
    cluster_name: 'Pune Region',
    pincode: '411001',
    address_line: '101 Solar Park, Shivajinagar',
    lead_source: 'direct_visit',
    interested_products: 'Residential On-Grid, Commercial On-Grid',
    remarks: 'Met at Solar Expo',
  },
  {
    company_name: 'Surat Power Solutions',
    mobile_number: '9825001122',
    gst_number: '',
    email: 'info@suratpower.com',
    contact_person: 'Pravin Patel',
    district_name: 'Surat',
    state_name: 'Gujarat',
    cluster_name: '',
    pincode: '395001',
    address_line: 'Ring Road Industrial Area',
    lead_source: 'referral',
    interested_products: 'Commercial On-Grid',
    remarks: 'Interested in 50kW kits',
  },
];
