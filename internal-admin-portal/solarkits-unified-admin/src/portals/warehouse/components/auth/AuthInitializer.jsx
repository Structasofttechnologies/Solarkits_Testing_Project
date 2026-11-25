import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ensureValidAccessToken } from "../../features/auth.slice";
import { ms_conversion } from "../../utils/msConversion.jsx";

export default function AuthInitializer() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const publicPaths = ["/login", "/verify", "/forgot-password", "/set-passcode"];
        
        const initAuth = async () => {
            try {
                await dispatch(ensureValidAccessToken()).unwrap();
                if (publicPaths.includes(window.location.pathname) || window.location.pathname === "/") {
                    navigate('/home', { replace: true });
                }
            } catch (err) {
                console.error('Error during auth initialization:', err);
                if (!publicPaths.includes(window.location.pathname)) {
                    navigate('/login', { replace: true });
                }
            }
        };

        initAuth();

        const timeout = import.meta.env.VITE_AUTH_TIMEOUT || '14m';
        const intervalId = setInterval(() => {
            dispatch(ensureValidAccessToken());
        }, ms_conversion(timeout));

        return () => clearInterval(intervalId);
    }, [dispatch, navigate]);

    return null;
}