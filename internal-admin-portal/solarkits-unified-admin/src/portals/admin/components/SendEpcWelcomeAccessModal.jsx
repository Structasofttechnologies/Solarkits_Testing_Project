import { useState, useEffect } from "react";
import { 
  FaWhatsapp, 
  FaEnvelope, 
  FaCopy, 
  FaCheck, 
  FaTimes, 
  FaKey, 
  FaPaperPlane, 
  FaExternalLinkAlt, 
  FaEdit,
  FaBuilding,
  FaUserCheck,
  FaCheckCircle,
  FaShieldAlt,
  FaListUl,
  FaCommentDots,
  FaUndo
} from "react-icons/fa";
import { FiExternalLink, FiCopy, FiCheck, FiSend, FiFileText } from "react-icons/fi";
import Dialog from "@/components/Dialog";

export default function SendEpcWelcomeAccessModal({ isOpen, onClose, epc }) {
  const [activeTab, setActiveTab] = useState("structured"); // 'structured' | 'raw'
  const [customNote, setCustomNote] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sentWhatsapp, setSentWhatsapp] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);

  const companyName = epc?.company_name || epc?.name || "Solar Contractor Partner";
  const contactEmail = epc?.email || "";
  const rawPhone = epc?.whatsapp || epc?.phone_number || epc?.phone || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const bdeName = epc?.assigned_bde_name || "";
  const bdePhone = epc?.assigned_bde_phone || "";
  const storeUrl = "https://store.solarkits.in/login";

  const buildCompiledMessage = (note = customNote) => {
    let msg = `🎉 *Congratulations ${companyName}!*
Aapka SolarKits EPC Contractor Business Account successfully verify & approve ho chuka hai.

Ab aap SolarKits B2B Store par login karke wholesale combo kits, dynamic margins aur direct cluster delivery ka labh le sakte hain.

━━━━━━━━━━━━━━━━━━━━━
🔑 *APKI LOGIN CREDENTIALS & ACCESS DETAILS:*
━━━━━━━━━━━━━━━━━━━━━
🌐 *Store Login Link:* ${storeUrl}
👤 *Registered Login ID:* ${contactEmail || rawPhone}
🔐 *Security PIN Setup Instructions:*
1. Login link par jaayein aur "Quick 4-Digit PIN" choose karein.
2. "First time user? Set PIN" par click karke apna *Unique 4-Digit Security PIN* set karein.
3. Ek baar aapka PIN save ho gaya, to next time aapko email ya password daalne ki zaroorat nahi — sirf apna 4-Digit PIN daalkar 1-click me login karein!

📦 *Platform Par Kya Kar Sakte Hain:*
• 1kW se 50kW+ Preconfigured Solar Combo Kits book karein
• "Know My Margin" calculator se project profit analyze karein
• Real-time warehouse dispatch status track karein`;

    if (bdeName) {
      const cleanBdePhone = bdePhone.replace(/\D/g, '').slice(-10);
      msg += `\n\n👤 *Dedicated BDE / Relationship Manager:*\n${bdeName}${cleanBdePhone ? ` (Mobile: +91 ${cleanBdePhone})` : ''}\nKisi bhi kit booking ya support ke liye aap direct apne BDE se sampark kar sakte hain.`;
    }

    if (note && note.trim()) {
      msg += `\n\n📌 *Special Admin Note:*\n${note.trim()}`;
    }

    msg += `\n\nKoi bhi query ho ya kit customization chahiye to hume yahan WhatsApp par reply karein.

Shubhkaamnayein,
*SolarKits Operations & Partner Support Team*`;

    return msg;
  };

  useEffect(() => {
    if (epc) {
      setCustomNote("");
      setMessage(buildCompiledMessage(""));
      setCopied(false);
      setCopiedLink(false);
      setSentWhatsapp(false);
      setSentEmail(false);
      setActiveTab("structured");
    }
  }, [epc, isOpen]);

  // When custom note changes in structured tab, update the compiled message
  const handleCustomNoteChange = (text) => {
    setCustomNote(text);
    setMessage(buildCompiledMessage(text));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSendWhatsApp = () => {
    if (!cleanPhone) {
      alert("No valid phone number found for this EPC.");
      return;
    }
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setSentWhatsapp(true);
  };

  const handleSendEmail = () => {
    if (!contactEmail) {
      alert("No email address found for this EPC.");
      return;
    }
    const subject = encodeURIComponent(`🎉 Congratulations! Your SolarKits EPC Account is Approved & Ready`);
    const body = encodeURIComponent(message);
    const url = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    window.open(url, "_blank");
    setSentEmail(true);
  };

  const handleResetToDefault = () => {
    setCustomNote("");
    setMessage(buildCompiledMessage(""));
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Send EPC Welcome Access & Credentials"
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Header Card: EPC Profile Info & View Toggle */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                <FaBuilding />
              </div>
              <div>
                <div className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>{companyName}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10.5px] font-bold flex items-center gap-1">
                    <FaCheckCircle className="text-[10px]" /> Approved Partner
                  </span>
                </div>
                <div className="text-xs text-indigo-200/80 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 font-mono">
                  {contactEmail && <span>✉️ {contactEmail}</span>}
                  {rawPhone && <span>📱 +91 {cleanPhone.slice(-10)}</span>}
                </div>
              </div>
            </div>

            {/* Toggle Modes: Structured Sections vs Raw Editor */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("structured")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "structured"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-indigo-200 hover:text-white"
                }`}
              >
                <FaListUl className="text-[11px]" />
                <span>Structured View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "raw"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-indigo-200 hover:text-white"
                }`}
              >
                <FaEdit className="text-[11px]" />
                <span>Raw Message Editor</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── MODE 1: PROFESSIONAL STRUCTURED SECTIONS ── */}
        {activeTab === "structured" && (
          <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1">
            
            {/* Section 1: Greeting & Approval Status */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider mb-1">
                <span className="text-sm">🎉</span>
                <span>Section 1: Greeting & Account Status</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Congratulations <strong>{companyName}</strong>! Aapka SolarKits EPC Contractor Business Account successfully verify & approve ho chuka hai. Ab aap SolarKits B2B Store par login karke wholesale combo kits, dynamic margins aur direct cluster delivery ka labh le sakte hain.
              </p>
            </div>

            {/* Section 2: Login Credentials & Access Portal Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                  <FaKey className="text-sm" />
                  <span>Section 2: Login Credentials & Access Details</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Quick PIN Enabled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Store URL Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Store Login Link
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline truncate"
                    >
                      {storeUrl}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedLink ? <FiCheck className="text-emerald-600" /> : <FiCopy />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Login ID Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Registered Login ID
                  </span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white truncate">
                    {contactEmail || rawPhone || "Contractor Email/Mobile"}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: 4-Digit PIN Setup Instructions */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-xs uppercase tracking-wider mb-2.5">
                <FaShieldAlt className="text-sm text-blue-600" />
                <span>Section 3: First-Time 4-Digit Security PIN Setup Instructions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] inline-flex items-center justify-center mb-1.5">
                    1
                  </span>
                  <p className="font-bold text-slate-800 dark:text-white text-[11px]">Choose Quick PIN</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Login page par jaakar "Quick 4-Digit PIN" choose karein.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] inline-flex items-center justify-center mb-1.5">
                    2
                  </span>
                  <p className="font-bold text-slate-800 dark:text-white text-[11px]">Set Unique PIN</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    "First time user? Set PIN" se apna unique 4-digit PIN chun kar save karein.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center justify-center mb-1.5">
                    3
                  </span>
                  <p className="font-bold text-slate-800 dark:text-white text-[11px]">1-Click Sign In</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Next time se bina email ya password dale sirf PIN se instant login karein!
                  </p>
                </div>
              </div>
            </div>

            {bdeName && (
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block mb-0.5">
                    👤 Dedicated Relationship Manager (BDE)
                  </span>
                  <div className="font-extrabold text-xs text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                    <span>{bdeName}</span>
                    {bdePhone && <span className="font-mono text-slate-500 text-[11px]">📱 +91 {bdePhone.replace(/\D/g, '').slice(-10)}</span>}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-[10px] font-extrabold border border-indigo-200 dark:border-indigo-800">
                  Assigned Manager
                </span>
              </div>
            )}

            {/* Section 4: Editable Custom Admin Note */}
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FaCommentDots className="text-amber-600" />
                  <span>Section 4: Custom Note / Remarks by Admin (Optional - Editable)</span>
                </label>
                {customNote && (
                  <button
                    type="button"
                    onClick={() => handleCustomNoteChange("")}
                    className="text-[10px] text-amber-700 hover:underline font-bold"
                  >
                    Clear Note
                  </button>
                )}
              </div>
              <p className="text-[10.5px] text-amber-800/80 dark:text-amber-400 mb-2">
                Aap is contractor ke liye koi bhi special offer, intro discount, ya BDE contact info yahan likh sakte hain. Ye direct final message me jud jayega.
              </p>
              <textarea
                value={customNote}
                onChange={(e) => handleCustomNoteChange(e.target.value)}
                rows={2}
                placeholder="Example: Aapke pehle 3 orders par additional ₹2,000 intro discount credit kar diya gaya hai..."
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed text-slate-800 dark:text-slate-200"
              />
            </div>

          </div>
        )}

        {/* ── MODE 2: RAW TEXT EDITOR (For complete freedom) ── */}
        {activeTab === "raw" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FaEdit className="text-blue-600" /> Full Raw Message Editor:
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FaUndo className="text-[9px]" /> Reset to Default
                </button>
                <span className="text-[11px] text-slate-400 font-mono">
                  {message.length} chars
                </span>
              </div>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={13}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-slate-800 dark:text-slate-200 resize-y"
              placeholder="Type your message here..."
            />
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? <FaCheck className="text-emerald-600 text-sm" /> : <FaCopy className="text-sm" />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Full Message"}</span>
          </button>

          <div className="flex items-center gap-2">
            {contactEmail && (
              <button
                type="button"
                onClick={handleSendEmail}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <FaEnvelope />
                <span>{sentEmail ? "Sent via Email ✓" : "Send Email"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FaWhatsapp className="text-base" />
              <span>{sentWhatsapp ? "Sent on WhatsApp ✓" : "Send on WhatsApp"}</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
