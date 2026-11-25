import { useState } from "react";
import { useSelector } from "react-redux";
import { 
    HiUser, HiLockClosed, HiBell, HiColorSwatch, HiChevronRight, 
    HiOutlineMail, HiOutlinePhone, HiOutlineUserCircle, HiShieldCheck 
} from 'react-icons/hi';
import { MdOutlineSecurity, MdOutlineDisplaySettings } from "react-icons/md";
import Button from "../components/Button";
import CustomInput from "../components/CustomInput";
import PageHeader from "../components/PageHeader";


export default function AccountSettings() {
    const { user } = useSelector((state) => state.user_slice);
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', name: 'Profile', icon: HiUser },
        { id: 'security', name: 'Security', icon: HiLockClosed },
        { id: 'notifications', name: 'Notifications', icon: HiBell },
        { id: 'appearance', name: 'Appearance', icon: HiColorSwatch },
    ];

    return (
        <div className="w-full animate-in fade-in duration-700">
            <PageHeader
                title="Account Settings"
                subtitle="Manage your administrative identity and workspace preferences."
                icon={HiUser}
            />

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-300 group ${
                                    isActive 
                                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                                    : 'bg-surface hover:bg-primary/5 text-text-secondary border border-border/50'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <span className="font-bold text-sm">{tab.name}</span>
                                </div>
                                <HiChevronRight className={`transition-transform duration-300 ${isActive ? 'translate-x-1' : 'opacity-0'}`} />
                            </button>
                        );
                    })}
                </div>

                <div className="lg:col-span-9">
                    <div className="card overflow-hidden min-h-[600px]">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="flex flex-col md:flex-row items-center gap-8 border-b border-border pb-8">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-linear-120 from-primary/10 to-primary/5 p-1">
                                            <img 
                                                src={`https://ui-avatars.com/api/?background=263880&color=fff&name=${encodeURIComponent(user?.name || 'User')}&bold=true&size=128`} 
                                                alt="Avatar" 
                                                className="w-full h-full object-cover rounded-[1.75rem]"
                                            />
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl border-4 border-surface shadow-xl hover:scale-110 transition-transform">
                                            <HiOutlineUserCircle size={20} />
                                        </button>
                                    </div>
                                    <div className="text-center md:text-left space-y-2">
                                        <h3 className="text-2xl font-black text-text-primary tracking-tight">Public Profile</h3>
                                        <p className="text-text-muted text-sm font-medium">Update your administrative photo and personal details.</p>
                                        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                                            <Button size="sm" className="rounded-xl">Upload New Photo</Button>
                                            <Button variant="ghost" size="sm" className="rounded-xl">Remove</Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <CustomInput label="Full Name" value={user?.name} icon={<HiUser />} disabled />
                                    <CustomInput label="Administrative Email" value={user?.email} icon={<HiOutlineMail />} disabled />
                                    <CustomInput label="Contact Number" value={user?.phone || '+91 00000 00000'} icon={<HiOutlinePhone />} />
                                    <CustomInput label="Department" value={user?.department || 'Operations'} icon={<HiShieldCheck />} disabled />
                                </div>

                                <div className="flex justify-end pt-6 border-t border-border">
                                    <Button className="px-10 rounded-2xl font-bold shadow-xl shadow-primary/20">Save Profile Changes</Button>
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-text-primary tracking-tight">Security & Privacy</h3>
                                    <p className="text-text-muted text-sm font-medium">Manage your administrative password and account security protocols.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl bg-linear-120 from-primary/5 to-transparent border border-primary/10 flex items-center justify-between group hover:border-primary/30 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                                <HiLockClosed size={28} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-primary">Two-Factor Authentication</h4>
                                                <p className="text-xs text-text-secondary mt-1">Add an extra layer of security to your admin account.</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="rounded-xl border border-border">Enable</Button>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-linear-120 from-warning/5 to-transparent border border-warning/10 flex items-center justify-between group hover:border-warning/30 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-warning/10 rounded-2xl text-warning group-hover:scale-110 transition-transform">
                                                <MdOutlineSecurity size={28} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-primary">Change Password</h4>
                                                <p className="text-xs text-text-secondary mt-1">Last changed 3 months ago.</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="rounded-xl border border-border">Update</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Placeholder for other tabs */}
                        {['notifications', 'appearance'].includes(activeTab) && (
                            <div className="flex flex-col items-center justify-center h-full p-20 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10">
                                    <MdOutlineDisplaySettings size={48} className="text-primary/40" />
                                </div>
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-wider">Coming Soon</h3>
                                <p className="text-text-secondary mt-2 max-w-xs mx-auto">We are currently perfecting these settings to provide you with the best customization experience.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
