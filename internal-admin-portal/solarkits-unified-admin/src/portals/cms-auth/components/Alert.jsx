import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeAlert } from "../features/alert.slice";
import { AnimatePresence, motion } from "framer-motion";
import IconButton from "./IconButton";
import { FaTimes } from "react-icons/fa";

// react-icons
import {
  AiFillCloseCircle,
  AiFillCheckCircle,
  AiFillWarning,
  AiFillInfoCircle,
} from "react-icons/ai";

const ALERT_STYLES = {
  error: {
    gradient:
      "linear-gradient(135deg, var(--color-danger), var(--color-danger-hover))",
    hoverBg: "hover:bg-danger/40!",
    iconColor: "text-danger",
    icon: <AiFillCloseCircle className="w-5 h-5" />,
  },
  success: {
    gradient:
      "linear-gradient(135deg, var(--color-success), var(--color-success-hover))",
    hoverBg: "hover:bg-success/40!",
    iconColor: "text-success",
    icon: <AiFillCheckCircle className="w-5 h-5" />,
  },
  warning: {
    gradient:
      "linear-gradient(135deg, var(--color-warning), var(--color-warning-hover))",
    hoverBg: "hover:bg-warning/40!",
    iconColor: "text-warning",
    icon: <AiFillWarning className="w-5 h-5" />,
  },
  info: {
    gradient: "var(--gradient-primary)",
    hoverBg: "hover:bg-primary/40!",
    iconColor: "text-primary",
    icon: <AiFillInfoCircle className="w-5 h-5" />,
  },
};

export default function Alert() {
  const { alerts } = useSelector((state) => state.alert_slice);
  const dispatch = useDispatch();
  const timers = useRef({});

  useEffect(() => {
    alerts.forEach((alert) => {
      if (!timers.current[alert.id]) {
        timers.current[alert.id] = setTimeout(() => {
          dispatch(removeAlert(alert.id));
          delete timers.current[alert.id];
        }, 5000);
      }
    });

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [alerts, dispatch]);

  if (!alerts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {alerts.slice(0, 3).map((alert) => {
          const style = ALERT_STYLES[alert.type] || ALERT_STYLES.info;

          return (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative w-screen max-w-xs bg-surface rounded-xl shadow-sm"
            >
              <div
                className="absolute inset-0 rounded-xl p-0.5 ps-2"
                style={{ background: style.gradient }}
              >
                <div className="w-full h-full bg-surface rounded-[10px]" />
              </div>

              <div className="relative px-4 py-3 flex items-center gap-3">
                <div className={`${style.iconColor} shrink-0`}>
                  {style.icon}
                </div>

                <span className="text-sm font-medium text-text-primary grow">
                  {alert.message}
                </span>

                <IconButton
                  onClick={() => {
                    clearTimeout(timers.current[alert.id]);
                    delete timers.current[alert.id];
                    dispatch(removeAlert(alert.id));
                  }}
                  variant="ghost"
                  size="sm"
                  className={`ml-auto shrink-0 rounded-full p-2! ${style.hoverBg} cursor-pointer`}
                >
                  <FaTimes className={`w-4 h-4 ${style.iconColor}`} />
                </IconButton>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
