import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUserData } from "@/features/user.slice";
import Loader from "@/components/Loader";
import { getAuthPortalUrl } from "@/utils/resolveApiUrl";

export default function ProtectedRoutes() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { user, loading, auth } = useSelector((state) => state.user_slice);
  const { paths, status } = useSelector((state) => state.modules_slice);

  const hasFetchedUser = useRef(false);
  const retryInterval = useRef(null);
  const hasRedirected = useRef(false);

  const [serverError, setServerError] = useState(false);
  const [fetchCompleted, setFetchCompleted] = useState(false);

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    let mounted = true;

    const doFetch = async () => {
      try {
        setServerError(false);
        await dispatch(getUserData()).unwrap();
        if (!mounted) return;
        setFetchCompleted(true);
        if (retryInterval.current) {
          clearInterval(retryInterval.current);
          retryInterval.current = null;
        }
      } catch (err) {
        // user.slice returns 'SERVER_DOWN' for network/timeouts
        const isServerDown = err === 'SERVER_DOWN' || err?.message === 'Network Error';
        if (!mounted) return;
        if (isServerDown) {
          setServerError(true);
          // start retry loop if not already started
          if (!retryInterval.current) {
            retryInterval.current = setInterval(async () => {
              try {
                await dispatch(getUserData()).unwrap();
                if (!mounted) return;
                setServerError(false);
                setFetchCompleted(true);
                clearInterval(retryInterval.current);
                retryInterval.current = null;
              } catch (e) {
                // keep retrying
              }
            }, 5000);
          }
        } else {
          // other errors (including unauthorized) -- allow redirect logic to run
          setFetchCompleted(true);
        }
      }
    };

    doFetch();

    return () => {
      mounted = false;
      if (retryInterval.current) {
        clearInterval(retryInterval.current);
        retryInterval.current = null;
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!fetchCompleted || loading || serverError) return;
    if (hasRedirected.current) return;

    // Not authenticated → save intended URL and go to login
    if (!auth || !user) {
      hasRedirected.current = true;
      // Save the full path+query so we can restore after login
      const intendedUrl = location.pathname + location.search;
      if (intendedUrl && intendedUrl !== '/' && intendedUrl !== '/login') {
        sessionStorage.setItem('intended_redirect', intendedUrl);
      }
      window.location.href = getAuthPortalUrl();
      return;
    }

    // Always use the panel base prefix - never derive from sub-product url_prefix
    const roleBasePath = "/admin-panel";

    // Check for a saved intended redirect (e.g. deep-link opened in new tab)
    const intendedRedirect = sessionStorage.getItem('intended_redirect');
    if (intendedRedirect && intendedRedirect.startsWith('/admin-panel')) {
      sessionStorage.removeItem('intended_redirect');
      hasRedirected.current = true;
      navigate(intendedRedirect, { replace: true });
      return;
    }

    // Root → redirect to panel home
    if (location.pathname === "/") {
      hasRedirected.current = true;
      navigate(`${roleBasePath}/home`, { replace: true });
      return;
    }

    // Only redirect if completely outside the panel
    if (!location.pathname.startsWith(roleBasePath)) {
      hasRedirected.current = true;
      navigate(`${roleBasePath}/home`, { replace: true });
    }
  }, [fetchCompleted, auth, user, serverError, loading]);

  if (loading && !fetchCompleted && status === 'idle' && status === 'loading') return <Loader />;

  if (serverError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h2 className="text-xl font-semibold mb-2 text-text-primary">⚠️ Server not reachable</h2>
        <p className="text-text-secondary">Retrying connection every 5 seconds...</p>
      </div>
    );
  }

  return <Outlet />;
}
