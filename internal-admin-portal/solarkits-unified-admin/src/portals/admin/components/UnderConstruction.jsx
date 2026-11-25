import { motion } from "framer-motion";
import { FaHardHat, FaTools, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

export default function UnderConstruction({
    title = "Section Under Construction",
    description = "We are currently designing and coding this area of the workspace. Please check back later.",
    progress = 70,
    showBackButton = false,
    backPath = "/admin-panel/home"
}) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[70vh] w-full animate-in fade-in duration-500">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-surface rounded-3xl border-2 border-border p-8 lg:p-12 text-center max-w-xl w-full shadow-lg relative overflow-hidden flex flex-col items-center"
            >
                {/* Decorative background vectors */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <FaTools size={180} />
                </div>

                {/* Construction Animation Hub */}
                <div className="relative mb-8 flex items-center justify-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="w-24 h-24 rounded-full border-4 border-dashed border-amber-500/30 border-t-amber-500"
                    />
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute text-amber-500"
                    >
                        <FaHardHat size={36} />
                    </motion.div>
                </div>

                {/* Content */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Development in Progress
                </span>

                <h2 className="text-2xl lg:text-3xl font-black text-text-primary tracking-tight mb-3">
                    {title}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed font-medium mb-8">
                    {description}
                </p>

                {/* Progress Tracker */}
                <div className="w-full max-w-sm bg-surface-hover border border-border p-5 rounded-2xl mb-8">
                    <div className="flex justify-between text-xs font-bold text-text-secondary mb-2">
                        <span>Development Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-amber-500 rounded-full"
                        />
                    </div>
                </div>

                {/* Optional Back Button */}
                {showBackButton && (
                    <Button
                        variant="secondary"
                        onClick={() => navigate(backPath)}
                        className="rounded-xl flex items-center gap-2 px-6"
                    >
                        <FaArrowLeft size={12} /> Back to Dashboard
                    </Button>
                )}
            </motion.div>
        </div>
    );
}
