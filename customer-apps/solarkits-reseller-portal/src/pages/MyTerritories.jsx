import { useState, useEffect } from "react";
import api from "../services/api";
import {
  FiMapPin,
  FiCheckCircle,
  FiLoader,
  FiFileText,
  FiUser,
  FiPhone,
  FiMail,
  FiCalendar,
  FiDollarSign,
  FiShield,
  FiLayers,
  FiAlertCircle,
  FiClock,
  FiExternalLink
} from "react-icons/fi";

export default function MyTerritories() {
  const [territories, setTerritories] = useState([]);
  const [clusterInfo, setClusterInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/india/v1/franchise-clusters/my-cluster-info'),
      api.get('/india/v1/reseller/territories')
    ]).then(([clusterRes, terrRes]) => {
      if (clusterRes.status === "fulfilled" && clusterRes.value.data?.status === "success") {
        setClusterInfo(clusterRes.value.data.data);
      }
      if (terrRes.status === "fulfilled" && terrRes.value.data?.status === "success") {
        setTerritories(terrRes.value.data.data || []);
      }
    }).finally(() => setLoading(false));
  }, []);

  const cluster = clusterInfo?.cluster;
  const agreement = clusterInfo?.agreement;
  const primaryBde = cluster?.primary_bde_id;
  const supportBdes = cluster?.support_bde_ids || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <FiMapPin className="text-blue-600" size={28} />
          My Franchisee Cluster & Territory
        </h1>
        <p className="text-sm font-medium text-slate-600 mt-1">
          View your district-wise franchisee cluster assignment, agreement validity, fee terms, and dedicated BDE contacts.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 font-bold gap-2">
          <FiLoader className="animate-spin text-blue-600" size={24} /> Loading cluster and territory details...
        </div>
      ) : (
        <>
          {/* Cluster & Agreement Top Highlights */}
          {cluster ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Cluster Identity */}
              <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <FiLayers size={140} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider backdrop-blur-xs">
                      {cluster.cluster_code || "CLUSTER"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                      <FiCheckCircle size={13} /> {cluster.status?.toUpperCase() || "ACTIVE"}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-black">{cluster.cluster_name}</h2>
                    <p className="text-xs text-white/70 font-semibold mt-1">
                      {cluster.state_id?.name || "State"} • {cluster.district_ids?.length || 0} Districts Covered
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-medium text-white/80">
                    <span>Territory Exclusivity:</span>
                    <span className="font-black text-amber-300">
                      {cluster.is_shared_territory_allowed ? "Shared Territory" : "Exclusive Territory"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Agreement Validity */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FiFileText className="text-blue-600" size={14} /> Franchise Agreement
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${agreement?.agreement_status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : agreement?.agreement_status === 'expiring_soon'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                      {agreement?.agreement_status?.replace(/_/g, ' ') || 'Active'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Agreement No:</span>
                      <span className="font-black text-slate-900">{agreement?.agreement_number || "AGR-PENDING"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Start Date:</span>
                      <span className="font-bold text-slate-700">
                        {agreement?.agreement_start_date ? new Date(agreement.agreement_start_date).toLocaleDateString('en-IN') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Expiry Date:</span>
                      <span className="font-bold text-slate-900">
                        {agreement?.agreement_end_date ? new Date(agreement.agreement_end_date).toLocaleDateString('en-IN') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {agreement?.agreement_document_url ? (
                  <a
                    href={agreement.agreement_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    <FiExternalLink size={13} /> View Agreement Document
                  </a>
                ) : (
                  <div className="mt-4 text-[11px] text-slate-400 text-center font-medium bg-slate-50 py-2 rounded-xl">
                    Digital agreement on file with Head Office
                  </div>
                )}
              </div>

              {/* Card 3: Dedicated BDE Contact */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FiUser className="text-blue-600" size={14} /> Assigned BDE Support
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700">
                      Primary Contact
                    </span>
                  </div>

                  {primaryBde ? (
                    <div className="mt-4 space-y-2.5">
                      <h3 className="font-black text-slate-900 text-sm">{primaryBde.name || "Assigned BDE"}</h3>
                      {primaryBde.employee_id && (
                        <p className="text-[11px] text-slate-400 font-semibold">ID: {primaryBde.employee_id}</p>
                      )}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                        {(primaryBde.phone || primaryBde.mobile) && (
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                            <FiPhone className="text-blue-600" size={13} />
                            <span>{primaryBde.phone || primaryBde.mobile}</span>
                          </div>
                        )}
                        {primaryBde.email && (
                          <div className="flex items-center gap-2 font-medium">
                            <FiMail className="text-blue-600" size={13} />
                            <span>{primaryBde.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 font-medium">
                      BDE assignment is being finalized by Admin. Support is available via central ticketing.
                    </div>
                  )}
                </div>

                {supportBdes.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-bold">Additional Support:</span> {supportBdes.map(b => b.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <FiAlertCircle className="text-amber-600 shrink-0" size={24} />
              <div className="text-xs text-amber-800 font-semibold">
                Your account is currently active under default state licensing. Cluster allocation details will appear here once finalized by Central Admin.
              </div>
            </div>
          )}

          {/* Allotted Districts in Cluster */}
          {cluster?.district_ids && cluster.district_ids.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FiMapPin className="text-blue-600" />
                    Allotted Cluster Districts ({cluster.district_ids.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Your franchise commands sales precedence and lead attribution in the following districts
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {cluster.district_ids.map((dist) => (
                  <div
                    key={dist._id || dist.id || dist.name}
                    className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 flex items-center gap-2 shadow-2xs hover:border-blue-300 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{dist.name}</span>
                    {dist.code && <span className="text-[10px] text-slate-400 font-mono">({dist.code})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cluster Setup Fee Breakdown */}
          {cluster?.fee_structure && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
                <FiDollarSign className="text-emerald-600" />
                Cluster Setup Fee Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500">Franchisee Setup Fee</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹{cluster.fee_structure.franchisee_setup_fee?.toLocaleString('en-IN') || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500">Renewal Fee</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹{cluster.fee_structure.renewal_fee?.toLocaleString('en-IN') || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500">Security Deposit</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹{cluster.fee_structure.security_deposit?.toLocaleString('en-IN') || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500">Total Payable</div>
                  <div className="text-base font-black text-blue-600 mt-1">₹{cluster.fee_structure.total_payable?.toLocaleString('en-IN') || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500">Payment Status</div>
                  <div className="text-xs font-black uppercase mt-2">
                    <span className={`px-2 py-0.5 rounded-full ${cluster.fee_structure.payment_status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                      }`}>
                      {cluster.fee_structure.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Geographic Scope Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Detailed Territory Precedence Entries
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Granular geographic authorization mapping registered under your franchisee account
              </p>
            </div>

            {territories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                No custom precedence overrides configured. Standard cluster district coverage applies.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-slate-700 font-extrabold px-6 py-3 uppercase tracking-wider">Scope Level</th>
                      <th className="text-left text-slate-700 font-extrabold px-6 py-3 uppercase tracking-wider">Geographic Entity</th>
                      <th className="text-center text-slate-700 font-extrabold px-6 py-3 uppercase tracking-wider">Precedence Source</th>
                      <th className="text-center text-slate-700 font-extrabold px-6 py-3 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {territories.map((t) => {
                      const scopeLevel = t.scope_level || t.territory_level || 'district';
                      const locationName = t.location_name || (t.district?.name ? (t.state?.name ? `${t.district.name}, ${t.state.name}` : t.district.name) : t.state?.name || t.country?.name || 'All Locations');
                      const precedenceSource = (t.precedence_source || t.source || 'Admin Assigned').replace(/_/g, ' ');

                      return (
                        <tr key={t.id || t._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-900 capitalize">{scopeLevel}</td>
                          <td className="px-6 py-3 font-black text-blue-600">{locationName}</td>
                          <td className="px-6 py-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black capitalize">
                              {precedenceSource}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold">
                              <FiCheckCircle size={11} /> Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
