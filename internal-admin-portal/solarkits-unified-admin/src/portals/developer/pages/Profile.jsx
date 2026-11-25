import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
    HiUser, HiMail, HiPhone, HiOfficeBuilding, HiGlobeAlt, 
    HiShieldCheck, HiOutlineClipboardCopy, HiLocationMarker, HiEye, HiPlus, HiPencilAlt, HiTrash, HiIdentification,
    HiLightningBolt
} from 'react-icons/hi';
import { MdVerified, MdSecurity, MdContactPage } from "react-icons/md";
import IconButton from "../components/IconButton";
import Loader from "../components/Loader";
import { fetchUserModules } from "../features/modules.slice";

export default function Profile() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.user_slice);
    const { modules, loading: modulesLoading } = useSelector((state) => state.modules_slice);

    useEffect(() => {
        if (!modules || modules.length === 0) {
            dispatch(fetchUserModules());
        }
    }, [dispatch, modules]);

    const flattenModules = (moduleList) => {
        let flat = [];
        moduleList.forEach(m => {
            flat.push(m);
            if (m.children && m.children.length > 0) {
                flat = [...flat, ...flattenModules(m.children)];
            }
        });
        return flat;
    };

    const allPermissions = modules ? flattenModules(modules) : [];

    const getAvatarUrl = (name, size = 160) => {
        return `https://ui-avatars.com/api/?background=263880&color=fff&name=${encodeURIComponent(name || 'User')}&bold=true&size=${size}`;
    };

    const InfoSection = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`bg-surface rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500 ${className}`}>
            <div className="px-6 py-4 border-b border-border bg-linear-120 from-primary/5 to-transparent flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Icon size={20} />
                </div>
                <h3 className="font-black text-text-primary uppercase tracking-[0.1em] text-xs">{title}</h3>
            </div>
            <div className="p-6 space-y-5">
                {children}
            </div>
        </div>
    );

    const DetailItem = ({ label, value, icon: Icon }) => (
        <div className="flex items-start gap-4 group">
            <div className="mt-1 p-2.5 rounded-xl bg-linear-120 from-primary/5 to-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                <Icon size={18} />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text-primary break-all leading-tight">{value || 'Not provided'}</p>
                    {value && (
                        <IconButton 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100" 
                            onClick={() => navigator.clipboard.writeText(value)}
                            title="Copy to clipboard"
                        >
                            <HiOutlineClipboardCopy size={16} />
                        </IconButton>
                    )}
                </div>
            </div>
        </div>
    );

    const PermissionBadge = ({ active, icon: Icon, label }) => (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${
            active 
            ? 'bg-success/5 text-success border-success/20 shadow-sm' 
            : 'bg-text-muted/5 text-text-muted/40 border-border/50'
        }`}>
            <Icon size={12} />
            <span>{label}</span>
        </div>
    );

    return (
        <div className="w-full animate-in fade-in duration-700">
            {/* --- Premium Header Section --- */}
            <div className="relative mb-8 rounded-[2rem] bg-linear-120 from-primary via-primary-end to-[#1a2b6d] overflow-hidden shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
                {/* Background Decorations */}
                <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-linear-120 from-white to-transparent blur-3xl"></div>
                </div>
                <div className="absolute inset-0 bg-grid-white/[0.05] mask-[linear-gradient(0deg,transparent,black)]"></div>

                {/* Avatar */}
                <div className="relative z-10">
                    <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 p-1 backdrop-blur-md">
                        <img
                            src={getAvatarUrl(user?.name, 160)}
                            alt={user?.name}
                            className="w-full h-full object-cover rounded-2xl"
                        />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-success text-white p-2.5 rounded-xl border-4 border-[#22337d] shadow-xl">
                        <MdVerified size={20} />
                    </div>
                </div>

                {/* Identity Info */}
                <div className="flex-1 text-center md:text-left z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold rounded-lg uppercase tracking-[0.2em] border border-white/20">
                            {typeof user?.role === 'object' ? user?.role?.name : (user?.role || 'Developer')}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-success/20 backdrop-blur-md border border-success/30 rounded-lg">
                            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-success">Active Session</span>
                        </div>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-none">
                        {user?.name}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-white/70">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <HiOfficeBuilding className="text-white/40" />
                            <span>{typeof user?.department === 'object' ? user?.department?.name : (user?.department || user?.role?.department?.name || 'Engineering')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <HiLocationMarker className="text-white/40" />
                            <span>{user?.country || 'India'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <HiLightningBolt className="text-warning" />
                            <span>Level {user?.level?.split(' ')[0] || 'Std'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Content Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Sidebar Info */}
                <div className="lg:col-span-4 space-y-6">
                    <InfoSection title="Contact Credentials" icon={MdContactPage}>
                        <DetailItem icon={HiMail} label="Email Address" value={user?.email} />
                        <DetailItem icon={HiPhone} label="Contact Number" value={user?.phone} />
                        <DetailItem icon={HiGlobeAlt} label="Region" value={user?.country} />
                    </InfoSection>

                    <InfoSection title="Organizational Profile" icon={HiIdentification}>
                        <DetailItem icon={HiOfficeBuilding} label="Department" value={typeof user?.department === 'object' ? user?.department?.name : (user?.department || user?.role?.department?.name || 'Engineering')} />
                        <DetailItem icon={HiUser} label="Designation" value={typeof user?.role === 'object' ? user?.role?.name : (user?.role || 'Developer')} />
                        <DetailItem icon={HiShieldCheck} label="Account Tier" value={user?.level || 'Standard Access'} />
                    </InfoSection>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="card overflow-hidden">
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-linear-120 from-primary/5 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <MdSecurity size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-primary uppercase tracking-wider text-sm">System Access Scopes</h3>
                                    <p className="text-xs text-text-secondary mt-0.5">Your granular permissions across operational modules</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {modulesLoading ? (
                                <div className="py-12 flex justify-center">
                                    <Loader text="Syncing permissions..." />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {allPermissions && allPermissions.length > 0 ? (
                                        allPermissions.map((module, index) => (
                                            <div key={module.unique_id || index} className="p-5 rounded-xl border border-border bg-surface-hover/50 hover:border-primary/30 hover:shadow-sm transition-all group relative">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-1 h-5 bg-primary/20 rounded-full group-hover:bg-primary transition-colors"></div>
                                                    <h4 className="font-bold text-text-primary text-xs uppercase tracking-tight">{module.name}</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <PermissionBadge active={module.can_view} icon={HiEye} label="View" />
                                                    <PermissionBadge active={module.can_add} icon={HiPlus} label="Add" />
                                                    <PermissionBadge active={module.can_edit} icon={HiPencilAlt} label="Edit" />
                                                    <PermissionBadge active={module.can_delete} icon={HiTrash} label="Delete" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-12 text-center bg-primary/5 rounded-2xl border border-dashed border-primary/20">
                                            <p className="text-text-muted text-sm italic font-medium">No active module permissions detected in registry.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
