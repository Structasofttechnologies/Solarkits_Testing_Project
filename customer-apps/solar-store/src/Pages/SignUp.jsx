// pages/SignUp.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import { FiEye, FiEyeOff, FiArrowRight, FiArrowLeft, FiPhone, FiMail, FiPackage, FiTrendingUp, FiShield, FiCheckCircle, FiInfo } from "react-icons/fi";
import Button from "../Components/Button";
import CustomInput from "../Components/CustomInput";
import IconButton from "../Components/IconButton";
import DropdownWithSearchInput from "../Components/DropdownWithSearchInput";
import OTPInput from "../Components/OTPInput";
import { setAlert } from "../features/alert.slice";

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    'Content-Type': 'application/json',
  },
});



// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCustomEpc, setIsCustomEpc] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [useSameWhatsapp, setUseSameWhatsapp] = useState(true); // New state for manual EPC

  // API Loading states
  const [loading, setLoading] = useState({
    sendOtp: false,
    verifyOtp: false,
    createAccount: false,
    resendOtp: false
  });

  // Data states
  const [states, setStates] = useState([]);
  const [epcs, setEpcs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [groupedEpcs, setGroupedEpcs] = useState({});

  // UI states
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingEpcs, setLoadingEpcs] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Timer states
  const [emailTimer, setEmailTimer] = useState(0);
  const [whatsappTimer, setWhatsappTimer] = useState(0);
  const emailTimerRef = useRef(null);
  const whatsappTimerRef = useRef(null);

  // Enhanced flow states
  const [userType, setUserType] = useState(null); //"predefined" or"manual"
  const [selectedEpcData, setSelectedEpcData] = useState(null);
  const [selectedEpcName, setSelectedEpcName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1 - Basic Info
    stateId: "",
    stateName: "",
    epcName: "",
    customEpcName: "",
    epcEmail: "",
    epcId: "",
    whatsappNumber: "",
    registeredNumber: "", // New field for manual EPC
    gstin: "", // Mandatory for manual EPC
    districtId: "",
    districtName: "",

    // Step 2 - OTP Verification
    emailOTP: "",
    whatsappOTP: "",

    // Step 3 - Password
    password: "",
    confirmPassword: "",
    agreeToTerms: [],
  });

  const [errors, setErrors] = useState({});

  // Terms checkbox options
  const termsOptions = [
    { value: "agree", label: "I agree to the Terms of Service and Privacy Policy" }
  ];

  // Custom EPC checkbox options
  const customEpcCheckboxOptions = [
    { value: "custom", label: "My EPC is not in the list" }
  ];

  // WhatsApp same number checkbox options
  const sameWhatsappOptions = [
    { value: "same", label: "Use this number as WhatsApp" }
  ];

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (emailTimerRef.current) clearInterval(emailTimerRef.current);
      if (whatsappTimerRef.current) clearInterval(whatsappTimerRef.current);
    };
  }, []);

  // Fetch states on component mount
  useEffect(() => {
    fetchStates();
  }, []);

  // Auto-fill WhatsApp when checkbox is checked
  useEffect(() => {
    if (useSameWhatsapp && formData.registeredNumber) {
      setFormData(prev => ({
        ...prev,
        whatsappNumber: formData.registeredNumber
      }));
    }
  }, [useSameWhatsapp, formData.registeredNumber]);

  // Fetch states from API (only real states activated in admin panel)
  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const response = await api.get('/india/v1/geo/states');

      if (response.data?.states && Array.isArray(response.data.states) && response.data.states.length > 0) {
        setStates(response.data.states);
      } else {
        // Backup query to active states endpoint
        const backupRes = await api.get('/geolocation/active-states');
        if (backupRes.data?.states && Array.isArray(backupRes.data.states)) {
          setStates(backupRes.data.states);
        } else {
          setStates([]);
        }
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      try {
        const backupRes = await api.get('/geolocation/active-states');
        if (backupRes.data?.states && Array.isArray(backupRes.data.states)) {
          setStates(backupRes.data.states);
        } else {
          setStates([]);
        }
      } catch (backupErr) {
        console.error('Error in backup fetch states:', backupErr);
        setStates([]);
      }
    } finally {
      setLoadingStates(false);
    }
  };

  // Handle state selection
  const handleStateChange = async (selectedStateId) => {
    const selectedState = states.find(s => (s.id || s._id).toString() === selectedStateId.toString());
    const selectedStateName = selectedState?.name || "";

    setFormData(prev => ({
      ...prev,
      stateId: selectedStateId,
      stateName: selectedStateName,
      epcName: "",
      epcEmail: "",
      epcId: "",
      districtId: "",
      districtName: ""
    }));

    setSelectedEpcName("");
    setSelectedEpcData(null);
    setShowEmailDropdown(false);
    setGroupedEpcs({});
    setEpcs([]);
    setDistricts([]);

    if (selectedStateId) {
      await Promise.all([
        fetchEpcsByState(selectedStateId),
        fetchDistrictsByState(selectedStateId, selectedStateName)
      ]);
    }

    if (errors.stateId) {
      setErrors(prev => ({ ...prev, stateId: "" }));
    }
  };

  // Fallback Indian EPC Companies Dataset
  const FALLBACK_EPCS = [
    { id: "epc_1", name: "Tata Power Solar Systems Ltd", email: "contact@tatapowersolar.com" },
    { id: "epc_2", name: "Adani Solar Power Ltd", email: "info@adanisolar.com" },
    { id: "epc_3", name: "Waaree Energies Ltd", email: "support@waaree.com" },
    { id: "epc_4", name: "Vikram Solar Ltd", email: "sales@vikramsolar.com" },
    { id: "epc_5", name: "SolarKits Power Solutions", email: "contact@solarkits.com" },
    { id: "epc_6", name: "SunSource Energy Pvt Ltd", email: "info@sunsource.in" },
    { id: "epc_7", name: "Sterling and Wilson Solar", email: "contact@sterlingwilson.com" },
    { id: "epc_8", name: "Jakson Green Energy", email: "support@jakson.com" },
    { id: "epc_9", name: "Hero Future Energies", email: "contact@herofutureenergies.com" },
    { id: "epc_10", name: "Azure Power India", email: "info@azurepower.com" }
  ];

  // Fetch EPCs by state with fallback
  const fetchEpcsByState = async (stateId) => {
    setLoadingEpcs(true);
    try {
      const response = await api.get(`/india/v1/auth/epcs-by-state?state_id=${stateId}`);

      let epcList = response.data?.epcs;
      if (!epcList || !Array.isArray(epcList) || epcList.length === 0) {
        epcList = FALLBACK_EPCS;
      }

      setEpcs(epcList);

      const grouped = epcList.reduce((acc, epc) => {
        if (!acc[epc.name]) {
          acc[epc.name] = [];
        }
        acc[epc.name].push({
          id: epc.id,
          name: epc.name,
          email: epc.email
        });
        return acc;
      }, {});

      setGroupedEpcs(grouped);
    } catch (error) {
      console.error('Error fetching EPCs:', error);

      setEpcs(FALLBACK_EPCS);

      const grouped = FALLBACK_EPCS.reduce((acc, epc) => {
        if (!acc[epc.name]) {
          acc[epc.name] = [];
        }
        acc[epc.name].push({
          id: epc.id,
          name: epc.name,
          email: epc.email
        });
        return acc;
      }, {});

      setGroupedEpcs(grouped);
    } finally {
      setLoadingEpcs(false);
    }
  };

  // Fetch districts by state (only real districts activated in admin panel)
  const fetchDistrictsByState = async (stateId, stateName = "") => {
    setLoadingDistricts(true);
    try {
      const response = await api.get(`/india/v1/geo/districts?state_id=${stateId}`);

      if (response.data?.districts && Array.isArray(response.data.districts) && response.data.districts.length > 0) {
        setDistricts(response.data.districts);
        setLoadingDistricts(false);
        return;
      }

      // Secondary check against active districts endpoint
      const backupRes = await api.get(`/geolocation/active-districts?state_id=${stateId}`);
      if (backupRes.data?.districts && Array.isArray(backupRes.data.districts) && backupRes.data.districts.length > 0) {
        setDistricts(backupRes.data.districts);
        setLoadingDistricts(false);
        return;
      }
      setDistricts([]);
    } catch (error) {
      console.error('Error fetching districts:', error);
      try {
        const backupRes = await api.get(`/geolocation/active-districts?state_id=${stateId}`);
        if (backupRes.data?.districts && Array.isArray(backupRes.data.districts)) {
          setDistricts(backupRes.data.districts);
        } else {
          setDistricts([]);
        }
      } catch (backupErr) {
        console.error('Error in backup fetch districts:', backupErr);
        setDistricts([]);
      }
    } finally {
      setLoadingDistricts(false);
    }
  };

  // Transform states for dropdown
  const stateOptions = useMemo(() => {
    return states.map(state => ({
      value: (state.id || state._id).toString(),
      text: state.name
    }));
  }, [states]);

  // Transform districts for dropdown
  const districtOptions = useMemo(() => {
    return districts.map(district => ({
      value: (district.id || district._id).toString(),
      text: district.name
    }));
  }, [districts]);

  // Transform EPC names for dropdown
  const epcNameOptions = useMemo(() => {
    return Object.keys(groupedEpcs).map(name => ({
      value: name,
      text: <span className="capitalize">{name}</span>,
    }));
  }, [groupedEpcs]);

  // Transform emails for dropdown based on selected EPC name
  const emailOptions = useMemo(() => {
    if (!selectedEpcName || !groupedEpcs[selectedEpcName]) return [];

    return groupedEpcs[selectedEpcName].map(epc => ({
      value: epc.email,
      text: epc.email,
      data: epc,
      searchable: epc.email.toLowerCase()
    }));
  }, [selectedEpcName, groupedEpcs]);

  // Handle EPC name selection
  const handleEpcNameChange = (selectedValue) => {
    setSelectedEpcName(selectedValue);
    setFormData(prev => ({
      ...prev,
      epcName: selectedValue,
      epcEmail: "",
      epcId: "",
      customEpcName: ""
    }));
    setSelectedEpcData(null);

    if (selectedValue && groupedEpcs[selectedValue]) {
      const emails = groupedEpcs[selectedValue];

      if (emails.length === 1) {
        const epc = emails[0];
        setFormData(prev => ({
          ...prev,
          epcEmail: epc.email,
          epcId: epc.id
        }));
        setSelectedEpcData(epc);
        setUserType('predefined');
        setShowEmailDropdown(false);
      } else {
        setShowEmailDropdown(true);
        setSelectedEpcData(null);
        setUserType(null);
      }
    }

    if (errors.epcName) {
      setErrors(prev => ({ ...prev, epcName: "" }));
    }
  };

  // Handle email selection
  const handleEmailChange = (selectedEmail) => {
    setFormData(prev => ({
      ...prev,
      epcEmail: selectedEmail
    }));

    if (selectedEmail && selectedEpcName && groupedEpcs[selectedEpcName]) {
      const selectedEpc = groupedEpcs[selectedEpcName].find(epc => epc.email === selectedEmail);
      if (selectedEpc) {
        setSelectedEpcData(selectedEpc);
        setFormData(prev => ({
          ...prev,
          epcId: selectedEpc.id
        }));
        setUserType('predefined');
      }
    }

    if (errors.epcEmail) {
      setErrors(prev => ({ ...prev, epcEmail: "" }));
    }
  };

  // Handle district selection
  const handleDistrictChange = (selectedDistrictId) => {
    const selectedDistrict = districts.find(d => (d.id || d._id).toString() === selectedDistrictId.toString());

    setFormData(prev => ({
      ...prev,
      districtId: selectedDistrictId,
      districtName: selectedDistrict?.name || ""
    }));

    if (errors.districtId) {
      setErrors(prev => ({ ...prev, districtId: "" }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        [name]: checked ? [value] : []
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCustomEpcNameChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      customEpcName: value,
      epcName: value,
      epcEmail: "",
      epcId: ""
    }));

    if (errors.epcName) {
      setErrors(prev => ({ ...prev, epcName: "" }));
    }
  };

  const handleEmailOTPChange = (otp) => {
    setFormData(prev => ({ ...prev, emailOTP: otp }));
    if (errors.emailOTP) {
      setErrors(prev => ({ ...prev, emailOTP: "" }));
    }
    if (isVerified) {
      setIsVerified(false);
    }
    setVerificationAttempted(false);
  };

  const handleWhatsappOTPChange = (otp) => {
    setFormData(prev => ({ ...prev, whatsappOTP: otp }));
    if (errors.whatsappOTP) {
      setErrors(prev => ({ ...prev, whatsappOTP: "" }));
    }
    if (isVerified) {
      setIsVerified(false);
    }
    setVerificationAttempted(false);
  };

  const toggleCustomEpc = (e) => {
    const isChecked = e.target.checked;

    setIsCustomEpc(isChecked);

    if (isChecked) {
      setUserType('manual');
      setSelectedEpcName("");
      setSelectedEpcData(null);
      setShowEmailDropdown(false);
      setUseSameWhatsapp(true); // Reset to default
      setFormData(prev => ({
        ...prev,
        epcName: "",
        epcEmail: "",
        epcId: "",
        customEpcName: "",
        registeredNumber: "",
        whatsappNumber: ""
      }));
    } else {
      setUserType(null);
      setFormData(prev => ({
        ...prev,
        epcName: "",
        epcEmail: "",
        epcId: "",
        customEpcName: "",
        registeredNumber: "",
        whatsappNumber: ""
      }));
    }
  };

  const handleSameWhatsappToggle = (e) => {
    const isChecked = e.target.checked;
    setUseSameWhatsapp(isChecked);

    if (isChecked && formData.registeredNumber) {
      setFormData(prev => ({
        ...prev,
        whatsappNumber: formData.registeredNumber
      }));
    } else if (!isChecked) {
      setFormData(prev => ({
        ...prev,
        whatsappNumber: ""
      }));
    }
  };

  // Start email timer
  const startEmailTimer = () => {
    setEmailTimer(30);
    if (emailTimerRef.current) clearInterval(emailTimerRef.current);

    emailTimerRef.current = setInterval(() => {
      setEmailTimer(prev => {
        if (prev <= 1) {
          clearInterval(emailTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start whatsapp timer
  const startWhatsappTimer = () => {
    setWhatsappTimer(30);
    if (whatsappTimerRef.current) clearInterval(whatsappTimerRef.current);

    whatsappTimerRef.current = setInterval(() => {
      setWhatsappTimer(prev => {
        if (prev <= 1) {
          clearInterval(whatsappTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Send OTP API call
  const sendOTPs = async () => {
    setLoading(prev => ({ ...prev, sendOtp: true }));

    try {
      const payload = {
        email: formData.epcEmail,
        user_type: userType,
        use_same_whatsapp: useSameWhatsapp
      };

      if (userType === "predefined") {
        payload.whatsapp = formData.whatsappNumber;
      }

      if (userType === "manual") {
        payload.registered_number = formData.registeredNumber;

        if (useSameWhatsapp) {
          payload.whatsapp = formData.registeredNumber;
        } else {
          payload.whatsapp = formData.whatsappNumber;
        }
      }

      const response = await api.post('/india/v1/auth/send-otp', payload);

      setOtpSent(true);
      startEmailTimer();
      startWhatsappTimer();

      const whatsappNumber = payload.whatsapp;
      dispatch(setAlert({
        type: "success",
        message: `Verification codes sent to ${formData.epcEmail} and ${whatsappNumber}`
      }));

      setCurrentStep(2);

    } catch (error) {
      console.error('Error sending OTPs:', error);

      let errorMessage = "Failed to send verification codes";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(setAlert({
        type: "error",
        message: errorMessage
      }));
    } finally {
      setLoading(prev => ({ ...prev, sendOtp: false }));
    }
  };

  // Verify BOTH OTPs together in a single API call
  const verifyBothOTPs = async () => {
    if (!formData.emailOTP || !formData.whatsappOTP) {
      dispatch(setAlert({
        type: "error",
        message: "Please enter both Email and WhatsApp OTPs"
      }));
      return;
    }

    if (!/^[0-9]{6}$/.test(formData.emailOTP) || !/^[0-9]{6}$/.test(formData.whatsappOTP)) {
      dispatch(setAlert({
        type: "error",
        message: "Please enter valid 6-digit OTPs"
      }));
      return;
    }

    setLoading(prev => ({ ...prev, verifyOtp: true }));
    setVerificationAttempted(true);

    try {
      const response = await api.post('/india/v1/auth/verify-otp', {
        email: formData.epcEmail,
        emailOtp: formData.emailOTP,
        whatsapp: formData.whatsappNumber,
        whatsappOtp: formData.whatsappOTP
      });

      setIsVerified(true);

      dispatch(setAlert({
        type: "success",
        message: "Both verifications completed successfully!"
      }));

      setCurrentStep(3);

      if (emailTimerRef.current) clearInterval(emailTimerRef.current);
      if (whatsappTimerRef.current) clearInterval(whatsappTimerRef.current);

    } catch (error) {
      console.error('Error verifying OTPs:', error);

      let errorMessage = "OTP verification failed";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(setAlert({
        type: "error",
        message: errorMessage
      }));
    } finally {
      setLoading(prev => ({ ...prev, verifyOtp: false }));
    }
  };

  // Resend OTP API call
  const resendOTP = async (type) => {
    setLoading(prev => ({ ...prev, resendOtp: true }));

    try {
      const response = await api.post('/india/v1/auth/resend-otp', {
        email: formData.epcEmail,
        whatsapp: formData.whatsappNumber
      });

      if (type === 'email') {
        startEmailTimer();
        dispatch(setAlert({
          type: "info",
          message: `New verification code sent to ${formData.epcEmail}`
        }));
      } else {
        startWhatsappTimer();
        dispatch(setAlert({
          type: "info",
          message: `New verification code sent to ${formData.whatsappNumber}`
        }));
      }

      if (type === 'email') {
        setFormData(prev => ({ ...prev, emailOTP: "" }));
      } else {
        setFormData(prev => ({ ...prev, whatsappOTP: "" }));
      }

      setIsVerified(false);
      setVerificationAttempted(false);

    } catch (error) {
      console.error('Error resending OTP:', error);

      let errorMessage = "Failed to resend OTP";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(setAlert({
        type: "error",
        message: errorMessage
      }));
    } finally {
      setLoading(prev => ({ ...prev, resendOtp: false }));
    }
  };

  // Create account API call
  const createAccount = async () => {
    setLoading(prev => ({ ...prev, createAccount: true }));

    try {
      const payload = {
        name: formData.epcName,
        email: formData.epcEmail,
        password: formData.password,
        user_type: userType,
        use_same_whatsapp: useSameWhatsapp,
        state: formData.stateId,
        district: formData.districtId,
        company_id: formData.epcId || null,
        company_name: isCustomEpc ? formData.customEpcName : null,
        gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : null
      };

      if (userType === "predefined") {
        payload.whatsapp = formData.whatsappNumber;
      }

      if (userType === "manual") {
        payload.registered_number = formData.registeredNumber;
        payload.whatsapp = useSameWhatsapp
          ? formData.registeredNumber
          : formData.whatsappNumber;
      }

      const response = await api.post('/india/v1/auth/create-account', payload);

      dispatch(setAlert({
        type: "success",
        message: response.data.message || "Account created successfully! Please login."
      }));

      navigate("/auth/login");

    } catch (error) {
      console.error('Error creating account:', error);

      let errorMessage = "Failed to create account";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(setAlert({
        type: "error",
        message: errorMessage
      }));
    } finally {
      setLoading(prev => ({ ...prev, createAccount: false }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.stateId) {
      newErrors.stateId = "Please select a state";
      isValid = false;
    }

    if (isCustomEpc) {
      // Manual mode validation
      if (!formData.customEpcName.trim()) {
        newErrors.epcName = "EPC name is required";
        isValid = false;
      }
      if (!formData.epcEmail?.trim()) {
        newErrors.epcEmail = "Email is required for manual entry";
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.epcEmail)) {
        newErrors.epcEmail = "Please enter a valid email address";
        isValid = false;
      }

      // Manual EPC specific validations
      // GSTIN Validation (Mandatory for New / Custom EPC)
      if (!formData.gstin?.trim()) {
        newErrors.gstin = "GSTIN is mandatory for new EPC registration";
        isValid = false;
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.gstin.trim())) {
        newErrors.gstin = "Please enter a valid 15-character GSTIN (e.g. 24AAAAA0000A1Z5)";
        isValid = false;
      }

      if (!formData.registeredNumber?.trim()) {
        newErrors.registeredNumber = "Registered number is required";
        isValid = false;
      } else if (!/^[0-9]{10}$/.test(formData.registeredNumber)) {
        newErrors.registeredNumber = "Please enter a valid 10-digit number";
        isValid = false;
      }

      if (!useSameWhatsapp && !formData.whatsappNumber?.trim()) {
        newErrors.whatsappNumber = "WhatsApp number is required";
        isValid = false;
      } else if (!useSameWhatsapp && !/^[0-9]{10}$/.test(formData.whatsappNumber)) {
        newErrors.whatsappNumber = "Please enter a valid 10-digit WhatsApp number";
        isValid = false;
      }
    } else {
      // Predefined mode validation
      if (!selectedEpcName) {
        newErrors.epcName = "Please select an EPC name";
        isValid = false;
      }

      if (!formData.epcEmail) {
        newErrors.epcEmail = showEmailDropdown
          ? "Please select an email for this EPC"
          : "Email is required";
        isValid = false;
      }

      // Predefined EPC validation
      if (!formData.whatsappNumber?.trim()) {
        newErrors.whatsappNumber = "WhatsApp number is required";
        isValid = false;
      } else if (!/^[0-9]{10}$/.test(formData.whatsappNumber)) {
        newErrors.whatsappNumber = "Please enter a valid 10-digit WhatsApp number";
        isValid = false;
      }
    }

    if (!formData.districtId) {
      newErrors.districtId = "Please select a district";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstError = Object.values(newErrors)[0];
      dispatch(setAlert({ type: "error", message: firstError }));
    }

    return isValid;
  };

  const validateStep2 = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.emailOTP) {
      newErrors.emailOTP = "Email OTP is required";
      isValid = false;
    } else if (!/^[0-9]{6}$/.test(formData.emailOTP)) {
      newErrors.emailOTP = "Please enter a valid 6-digit OTP";
      isValid = false;
    }

    if (!formData.whatsappOTP) {
      newErrors.whatsappOTP = "WhatsApp OTP is required";
      isValid = false;
    } else if (!/^[0-9]{6}$/.test(formData.whatsappOTP)) {
      newErrors.whatsappOTP = "Please enter a valid 6-digit OTP";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstError = Object.values(newErrors)[0];
      dispatch(setAlert({ type: "error", message: firstError }));
    }

    return isValid;
  };

  const validateStep3 = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.password) {
      newErrors.password = "4-digit Security PIN is required";
      isValid = false;
    } else if (!/^\d{4}$/.test(formData.password.trim())) {
      newErrors.password = "PIN must be exactly 4 numeric digits (e.g. 1234)";
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "PINs do not match";
      isValid = false;
    }

    if (!formData.agreeToTerms || formData.agreeToTerms.length === 0) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstError = Object.values(newErrors)[0];
      dispatch(setAlert({ type: "error", message: firstError }));
    }

    return isValid;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setIsVerified(false);
    setOtpSent(false);

    await sendOTPs();
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    await verifyBothOTPs();
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    if (!isVerified) {
      dispatch(setAlert({
        type: "error",
        message: "Please complete OTP verification first"
      }));
      setCurrentStep(2);
      return;
    }

    await createAccount();
  };

  const handleResendEmailOTP = () => {
    if (emailTimer > 0) {
      dispatch(setAlert({
        type: "warning",
        message: `Please wait ${emailTimer} seconds before resending`
      }));
      return;
    }

    resendOTP('email');
  };

  const handleResendWhatsappOTP = () => {
    if (whatsappTimer > 0) {
      dispatch(setAlert({
        type: "warning",
        message: `Please wait ${whatsappTimer} seconds before resending`
      }));
      return;
    }

    resendOTP('whatsapp');
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setErrors({});
    } else {
      navigate("/auth/login");
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Create Your Account";
      case 2: return "Verify Your Contact Information";
      case 3: return "Set Up Password";
      default: return "Sign Up";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Tell us about your company and contact details";
      case 2: return "Please verify both your email and WhatsApp number together";
      case 3: return "Create a strong password for your account";
      default: return "";
    }
  };

  const getEpcPlaceholder = () => {
    if (!formData.stateId) {
      return "Select a state first";
    }
    if (loadingEpcs) {
      return "Loading EPCs...";
    }
    return "Select or search EPC name";
  };

  const bothOTPsEntered = formData.emailOTP && formData.whatsappOTP &&
    formData.emailOTP.length === 6 && formData.whatsappOTP.length === 6;

  const getWhatsAppDisplayNumber = () => {
    if (userType === "predefined") {
      return formData.whatsappNumber;
    }
    if (userType === "manual") {
      return useSameWhatsapp ? formData.registeredNumber : formData.whatsappNumber;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-bg-subtle">
      <div className="bg-gradient-to-r from-primary to-primary-end rounded-b-3xl shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              {getStepTitle()}
            </h1>
            <p className="text-white/90 text-lg">
              {getStepDescription()}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3">
            <div className="bg-surface rounded-2xl shadow-lg border border-border p-6 sticky top-4">
              <h2 className="text-xl font-bold text-text-primary dark:text-info mb-4">
                Join SolarMarket
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep >= 1
                    ? "bg-gradient-to-r from-primary to-primary-end text-white"
                    : "bg-gray-200 text-text-secondary"
                    }`}>
                    {currentStep > 1 ? "✓" : "1"}
                  </div>
                  <div>
                    <p className={`font-medium ${currentStep >= 1 ? "text-text-primary dark:text-info" : "text-text-secondary"}`}>
                      Basic Information
                    </p>
                    <p className="text-xs text-text-secondary">State, EPC & contacts</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep >= 2
                    ? "bg-gradient-to-r from-primary to-primary-end text-white"
                    : "bg-gray-200 text-text-secondary"
                    }`}>
                    {currentStep > 2 ? "✓" : "2"}
                  </div>
                  <div>
                    <p className={`font-medium ${currentStep >= 2 ? "text-text-primary dark:text-info" : "text-text-secondary"}`}>
                      Dual Verification
                    </p>
                    <p className="text-xs text-text-secondary">Email & WhatsApp OTP</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep >= 3
                    ? "bg-gradient-to-r from-primary to-primary-end text-white"
                    : "bg-gray-200 text-text-secondary"
                    }`}>
                    3
                  </div>
                  <div>
                    <p className={`font-medium ${currentStep >= 3 ? "text-text-primary dark:text-info" : "text-text-secondary"}`}>
                      Security
                    </p>
                    <p className="text-xs text-text-secondary">Set 4-Digit PIN</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-surface-hover rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-secondary">Step {currentStep} of 3</span>
                  <span className="text-xs font-medium text-primary dark:text-info">
                    {currentStep === 1 && "Information"}
                    {currentStep === 2 && "Verification"}
                    {currentStep === 3 && "Security"}
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FiPackage className="text-primary dark:text-info" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Pre-configured Solar Kits</h3>
                    <p className="text-sm text-text-secondary">Access our curated selection of solar solutions</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FiTrendingUp className="text-success" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Best Price Guarantee</h3>
                    <p className="text-sm text-text-secondary">Competitive pricing on all solar equipment</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <FiShield className="text-warning" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Dual Verification</h3>
                    <p className="text-sm text-text-secondary">Enhanced security with email & WhatsApp</p>
                  </div>
                </div>
              </div>

              {/* <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-xs text-text-secondary">
                  Need help? Contact us at{""}
                  <a href="mailto:support@solarmarket.com" className="text-primary dark:text-info hover:underline">
                    support@solarmarket.com
                  </a>
                </p>
              </div> */}
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="bg-surface rounded-2xl shadow-lg border border-border">
              <div className="bg-gradient-bg-subtle px-6 py-4 border-b border-border flex items-center gap-3">
                <IconButton
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-surface-hover"
                >
                  <FiArrowLeft size={18} />
                </IconButton>
                <div>
                  <h2 className="text-xl font-bold text-text-primary dark:text-info">{getStepTitle()}</h2>
                  <p className="text-sm text-text-secondary">{getStepDescription()}</p>
                </div>
              </div>

              <form onSubmit={
                currentStep === 1 ? handleStep1Submit :
                  currentStep === 2 ? handleStep2Submit :
                    handleStep3Submit
              } className="p-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <DropdownWithSearchInput
                        label="State"
                        name="stateId"
                        value={formData.stateId}
                        onChange={handleStateChange}
                        options={stateOptions}
                        placeholder="Select your state"
                        searchPlaceholder="Search states..."
                        className={errors.stateId ? "border-danger" : ""}
                        disabled={loadingStates}
                      />
                      {loadingStates && (
                        <p className="text-xs text-text-secondary mt-1">Loading states...</p>
                      )}
                    </div>

                    {formData.stateId && (
                      <div>
                        <DropdownWithSearchInput
                          label="EPC Name"
                          name="epcName"
                          value={selectedEpcName}
                          onChange={handleEpcNameChange}
                          options={epcNameOptions}
                          placeholder={getEpcPlaceholder()}
                          searchPlaceholder="Search EPC names..."
                          className={errors.epcName ? "border-danger" : ""}
                          disabled={isCustomEpc || loadingEpcs || !formData.stateId}
                        />

                        {loadingEpcs && (
                          <p className="text-xs text-text-secondary mt-1">Loading EPCs...</p>
                        )}

                        {showEmailDropdown && !isCustomEpc && (
                          <div className="mt-3">
                            <DropdownWithSearchInput
                              label="Select Email"
                              name="epcEmail"
                              value={formData.epcEmail}
                              onChange={handleEmailChange}
                              options={emailOptions}
                              placeholder="Select email for this EPC"
                              searchPlaceholder="Search emails..."
                              className={errors.epcEmail ? "border-danger" : ""}
                            />
                          </div>
                        )}

                        {selectedEpcData && !isCustomEpc && (
                            <div className={`mt-2 mb-2 p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                              selectedEpcData.has_gstin ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                              <span className="font-semibold">
                                {selectedEpcData.has_gstin
                                  ? `✓ Pre-verified Database GST: ${selectedEpcData.gst_number || 'On file'}`
                                  : 'ℹ️ GSTIN is optional during signup. You will be prompted at checkout.'}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/80 border">
                                {selectedEpcData.has_gstin ? 'Verified' : 'Checkout Prompt'}
                              </span>
                            </div>
                          )}

                          {selectedEpcData && !showEmailDropdown && !isCustomEpc && (
                          <div className="mt-3">
                            <CustomInput
                              label="Email"
                              name="epcEmail"
                              value={selectedEpcData.email}
                              disabled={true}
                              type="email"
                            />
                          </div>
                        )}

                        <div className="mt-3">
                          <CustomInput
                            name="customEpcToggle"
                            type="checkbox"
                            options={customEpcCheckboxOptions}
                            value={isCustomEpc ? "custom" : ""}
                            checked={isCustomEpc ? ["custom"] : []}
                            onChange={toggleCustomEpc}
                            customCheckbox={true}
                          />
                        </div>

                        {isCustomEpc && (
                          <div className="mt-3 space-y-3">
                            <CustomInput
                              label="EPC Name"
                              name="customEpcName"
                              placeholder="Enter your EPC name"
                              value={formData.customEpcName}
                              onChange={handleCustomEpcNameChange}
                              type="text"
                            />
                            <CustomInput
                              label="Email Address (PM Surya Ghar)"
                              name="epcEmail"
                              placeholder="Enter your email address"
                              value={formData.epcEmail}
                              onChange={handleInputChange}
                              type="email"
                              className={errors.epcEmail ? "border-danger" : ""}
                            />

                            {/* Manual EPC Specific Fields */}
                            <CustomInput
                              label="Registered Number (PM Surya Ghar)"
                              name="registeredNumber"
                              placeholder="Enter registered 10-digit number"
                              value={formData.registeredNumber}
                              onChange={handleInputChange}
                              type="tel"
                              maxLength={10}
                              className={errors.registeredNumber ? "border-danger" : ""}
                            />

                            <div className="mt-2">
                              <CustomInput
                                type="checkbox"
                                name="useSameWhatsapp"
                                options={sameWhatsappOptions}
                                value={useSameWhatsapp ? "same" : ""}
                                checked={useSameWhatsapp ? ["same"] : []}
                                onChange={handleSameWhatsappToggle}
                                customCheckbox={true}
                              />
                            </div>

                            {!useSameWhatsapp && (
                              <CustomInput
                                label="WhatsApp Number"
                                name="whatsappNumber"
                                placeholder="Enter WhatsApp number"
                                value={formData.whatsappNumber}
                                onChange={handleInputChange}
                                type="tel"
                                maxLength={10}
                                className={errors.whatsappNumber ? "border-danger" : ""}
                              />
                            )}

                            {useSameWhatsapp && formData.registeredNumber && (
                              <div className="text-sm text-text-secondary mt-1">
                                <FiInfo className="inline mr-1" size={14} />
                                OTP will be sent to {formData.registeredNumber}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Predefined EPC WhatsApp Field */}
                    {!isCustomEpc && formData.stateId && userType === 'predefined' && (
                      <div>
                        <CustomInput
                          label="WhatsApp Number"
                          name="whatsappNumber"
                          placeholder="Enter 10-digit WhatsApp number"
                          value={formData.whatsappNumber}
                          onChange={handleInputChange}
                          type="tel"
                          maxLength={10}
                          className={errors.whatsappNumber ? "border-danger" : ""}
                        />
                      </div>
                    )}

                    <div>
                      <DropdownWithSearchInput
                        label="District"
                        name="districtId"
                        value={formData.districtId}
                        onChange={handleDistrictChange}
                        options={districtOptions}
                        placeholder={
                          !formData.stateId
                            ? "Select a state first"
                            : loadingDistricts
                              ? "Loading districts..."
                              : districts.length === 0
                                ? "No active districts available"
                                : "Select your district"
                        }
                        searchPlaceholder="Search districts..."
                        disabled={!formData.stateId || loadingDistricts}
                        className={errors.districtId ? "border-danger" : ""}
                      />
                      {loadingDistricts && (
                        <p className="text-xs text-text-secondary mt-1">Loading districts...</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={loading.sendOtp || loadingStates || loadingEpcs}
                        fullWidth
                        rightIcon={<FiArrowRight size={18} />}
                        disabled={!formData.stateId || loading.sendOtp}
                      >
                        Send Verification Codes
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                      <FiInfo className="text-primary dark:text-info flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-medium text-text-primary dark:text-info">Verify Both Channels Together</p>
                        <p className="text-xs text-text-secondary mt-1">
                          Enter the 6-digit codes sent to {formData.epcEmail} and {getWhatsAppDisplayNumber()}.
                          Both OTPs must be verified together in a single step.
                        </p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 transition-all ${isVerified
                      ? "border-success bg-success/5"
                      : verificationAttempted && !isVerified
                        ? "border-danger/30 bg-danger/5"
                        : "border-border"
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FiMail className="text-primary dark:text-info" size={18} />
                          <span className="font-medium text-text-primary dark:text-info">Email Verification</span>
                          {isVerified && (
                            <span className="text-success text-sm flex items-center gap-1">
                              <FiCheckCircle size={14} /> Verified
                            </span>
                          )}
                        </div>
                        {otpSent && (
                          <span className="text-xs text-text-secondary">
                            Code sent to {formData.epcEmail}
                          </span>
                        )}
                      </div>

                      <OTPInput
                        length={6}
                        value={formData.emailOTP}
                        onChange={handleEmailOTPChange}
                        disabled={loading.verifyOtp || isVerified}
                      />

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-text-secondary">
                          Didn't receive code?
                        </p>
                        {emailTimer === 0 ? (
                          <Button
                            type="button"
                            onClick={handleResendEmailOTP}
                            variant="link"
                            size="sm"
                            className="text-primary dark:text-info font-medium"
                            disabled={loading.resendOtp || isVerified}
                          >
                            {loading.resendOtp ? "Resending..." : "Resend OTP"}
                          </Button>
                        ) : (
                          <span className="text-sm text-text-secondary">
                            Resend in {emailTimer}s
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 transition-all ${isVerified
                      ? "border-success bg-success/5"
                      : verificationAttempted && !isVerified
                        ? "border-danger/30 bg-danger/5"
                        : "border-border"
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FiPhone className="text-primary dark:text-info" size={18} />
                          <span className="font-medium text-text-primary dark:text-info">WhatsApp Verification</span>
                          {isVerified && (
                            <span className="text-success text-sm flex items-center gap-1">
                              <FiCheckCircle size={14} /> Verified
                            </span>
                          )}
                        </div>
                        {otpSent && (
                          <span className="text-xs text-text-secondary">
                            Code sent to {getWhatsAppDisplayNumber()}
                          </span>
                        )}
                      </div>

                      <OTPInput
                        length={6}
                        value={formData.whatsappOTP}
                        onChange={handleWhatsappOTPChange}
                        disabled={loading.verifyOtp || isVerified}
                      />

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-text-secondary">
                          Didn't receive code?
                        </p>
                        {whatsappTimer === 0 ? (
                          <Button
                            type="button"
                            onClick={handleResendWhatsappOTP}
                            variant="link"
                            size="sm"
                            className="text-primary dark:text-info font-medium"
                            disabled={loading.resendOtp || isVerified}
                          >
                            {loading.resendOtp ? "Resending..." : "Resend OTP"}
                          </Button>
                        ) : (
                          <span className="text-sm text-text-secondary">
                            Resend in {whatsappTimer}s
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={loading.verifyOtp}
                        fullWidth
                        rightIcon={<FiArrowRight size={18} />}
                        disabled={!bothOTPsEntered || loading.verifyOtp || isVerified}
                      >
                        {isVerified
                          ? "Verified Successfully"
                          : bothOTPsEntered
                            ? "Verify Both OTPs"
                            : "Enter both OTPs to continue"}
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-start gap-3">
                      <FiCheckCircle className="text-success flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-medium text-text-primary dark:text-info">Verification Complete!</p>
                        <p className="text-xs text-text-secondary">
                          Your email and WhatsApp have been verified. Now set up your password.
                        </p>
                      </div>
                    </div>

                    {userType === 'manual' && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
                        <FiInfo className="text-warning flex-shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm font-medium text-warning">Manual Verification Required</p>
                          <p className="text-xs text-text-secondary">
                            Your account will be pending verification. Our team will contact you at {formData.epcEmail} or {getWhatsAppDisplayNumber()}.
                          </p>
                        </div>
                      </div>
                    )}

                    {userType === 'predefined' && (
                      <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-start gap-2">
                        <FiCheckCircle className="text-success flex-shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm font-medium text-success">Pre-approved EPC</p>
                          <p className="text-xs text-text-secondary">
                            Your account will be activated immediately after signup.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <CustomInput
                        name="password"
                        label="Set 4-Digit Security PIN"
                        placeholder="Enter 4-digit PIN (e.g. 1234)"
                        value={formData.password}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          handleInputChange({ target: { name: 'password', value: val } });
                        }}
                        type={showPassword ? "text" : "password"}
                        maxLength={4}
                        inputMode="numeric"
                        className={errors.password ? "border-danger" : ""}
                      />
                      <IconButton
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-9"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </IconButton>
                    </div>

                    <div className="relative">
                      <CustomInput
                        name="confirmPassword"
                        label="Confirm 4-Digit PIN"
                        placeholder="Re-enter 4-digit PIN"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          handleInputChange({ target: { name: 'confirmPassword', value: val } });
                        }}
                        type={showConfirmPassword ? "text" : "password"}
                        maxLength={4}
                        inputMode="numeric"
                        className={errors.confirmPassword ? "border-danger" : ""}
                      />
                      <IconButton
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-9"
                      >
                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </IconButton>
                    </div>

                    <div className="bg-surface-hover p-3 rounded-lg border border-border">
                      <p className="text-xs text-text-secondary mb-2">Security PIN Rules:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${/^\d{4}$/.test(formData.password) ? "bg-success" : "bg-gray-300"}`}></div>
                          <span className="text-xs text-text-secondary">Exactly 4 numeric digits</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${formData.password && formData.password === formData.confirmPassword ? "bg-success" : "bg-gray-300"}`}></div>
                          <span className="text-xs text-text-secondary">Both PINs match</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <CustomInput
                        name="agreeToTerms"
                        type="checkbox"
                        options={termsOptions}
                        value={formData.agreeToTerms[0]}
                        checked={formData.agreeToTerms}
                        onChange={handleInputChange}
                        className={errors.agreeToTerms ? "border-danger" : ""}
                        customCheckbox={true}
                      />
                    </div>

                    <div className="mt-6">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={loading.createAccount}
                        fullWidth
                        rightIcon={<FiArrowRight size={18} />}
                        disabled={loading.createAccount}
                      >
                        {userType === 'predefined' ? 'Create Account' : 'Submit for Verification'}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="mt-6 text-center text-sm text-text-secondary">
                  Already have an account?{""}
                  <Link to="/auth/login" className="text-primary dark:text-info hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}