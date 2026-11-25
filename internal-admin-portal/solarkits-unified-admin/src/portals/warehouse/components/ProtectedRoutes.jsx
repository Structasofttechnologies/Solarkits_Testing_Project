import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUserData } from "@/features/user.slice";
import Loader from "@/components/Loader";

export default function ProtectedRoutes() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { user, loading, auth } = useSelector((state) => state.user_slice);
  const { paths, status } = useSelector((state) => state.modules_slice);

  const retryInterval = useRef(null);

  const [serverError, setServerError] = useState(false);
  const [fetchCompleted, setFetchCompleted] = useState(false);

  useEffect(() => {
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

    // Prevent redundant fetches if already completed
    if (!fetchCompleted) {
        doFetch();
    }

    return () => {
      mounted = false;
      if (retryInterval.current) {
        clearInterval(retryInterval.current);
        retryInterval.current = null;
      }
    };
  }, [dispatch, fetchCompleted]);

  useEffect(() => {
    if (!fetchCompleted || loading || serverError) return;
    const publicPaths = ["/login", "/verify", "/forgot-password", "/set-passcode"];
    if (publicPaths.includes(location.pathname)) return;

    // Not authenticated → go to login
    if (!auth || !user) {
      navigate('/login', { replace: true });
      return;
    }

    const onboardingPath = "/warehouse-profile";

    if (user.is_warehouse_user) {
      if (user.role !== 'manager') {
        if (location.pathname !== '/unauthorized') {
          navigate('/unauthorized', { replace: true });
          return;
        }
        return;
      }

      const status = user.warehouse_status;
      if (status === 1 && location.pathname !== '/pending-validation') {
        navigate('/pending-validation', { replace: true });
        return;
      }

      // If user is validated (status 4) or under review (status 3) and trying to access restricted status pages, redirect home
      if ((status === 4 || status === 3) && ['/pending-validation', '/in-review', '/rejected', '/unauthorized'].includes(location.pathname)) {
        navigate("/home", { replace: true });
        return;
      }
    }

    // Root or public auth page → redirect to home
    if (location.pathname === "/" || publicPaths.includes(location.pathname)) {
      navigate("/home", { replace: true });
      return;
    }
  }, [fetchCompleted, auth, user, serverError, loading, location.pathname, navigate]);

  if (!fetchCompleted || loading) return <Loader />;

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
