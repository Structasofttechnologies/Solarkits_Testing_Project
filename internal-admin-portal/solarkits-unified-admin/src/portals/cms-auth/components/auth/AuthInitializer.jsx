import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { identifyUserPanel } from "../../features/auth.slice";

export default function AuthInitializer() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            const currentPath = window.location.pathname;
            // If already on choose-panel or a deep portal route, don't interfere with AuthInitializer
            if (currentPath === '/choose-panel' || 
                currentPath.startsWith('/admin-panel') || 
                currentPath.startsWith('/account-panel') || 
                currentPath.startsWith('/operation-management-panel') || 
                currentPath.startsWith('/warehouse') || 
                currentPath.startsWith('/developer-panel') || 
                currentPath.startsWith('/boskit-admin')) {
                return;
            }

            try {
                const result = await dispatch(identifyUserPanel());
                if (identifyUserPanel.fulfilled.match(result)) {
                    const allowedPanels = result.payload?.allowed_panels || [];
                    if (allowedPanels.length > 1) {
                        navigate('/choose-panel', { replace: true });
                    } else if (allowedPanels.length === 1 && allowedPanels[0]?.url_prefix) {
                        navigate(`${allowedPanels[0].url_prefix}/`, { replace: true });
                    } else {
                        const panel = result.payload?.url_prefix || null;
                        if (panel) {
                            navigate(`${panel}/`, { replace: true });
                        }
                    }
                }
            } catch (err) {
                console.error('Error during auth initialization:', err);
            }
        })();
    }, [dispatch, navigate]);

    return null;
}
