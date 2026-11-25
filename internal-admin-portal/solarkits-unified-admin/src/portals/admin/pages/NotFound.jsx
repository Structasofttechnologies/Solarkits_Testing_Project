import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaArrowLeft, FaExclamationTriangle, FaCompass } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi2";
import Button from "../components/Button";
import useTheme from "../hooks/useTheme";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isDashboard = location.pathname.includes('/dashboard') || location.pathname.includes('/admin-panel');

  return (
    <div className="min-h-screen bg-gradient-bg-subtle auth-pattern flex items-center justify-center p-4 transition-colors duration-300">
      {/* Theme Toggle - Hidden in Dashboard */}
      {!isDashboard && (
        <button
          onClick={toggleTheme}
          className="fixed top-6 right-6 z-50 p-2.5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-border/50 text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-300"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <HiSun className="w-5 h-5" />
          ) : (
            <HiMoon className="w-5 h-5" />
          )}
        </button>
      )}

      <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        
        {/* Left Side - Content */}
        <div className="lg:w-1/2 text-center lg:text-left">
          <div className="relative inline-block mb-6">
            <div className="text-9xl md:text-[12rem] font-black gradient-text-primary opacity-20">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-5xl md:text-7xl font-black gradient-text-primary">
                404
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
              Lost in Space?
            </h1>
            <p className="text-text-secondary text-lg md:text-xl font-medium">
              Looks like you've ventured into unknown territory. The page you're looking for has either been moved or doesn't exist.
            </p>
            
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm mt-6 transition-colors">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <FaCompass className="text-warning w-5 h-5" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-text-primary mb-2">
                    Quick Navigation Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span>Check the URL for typos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span>Use the search function</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span>Browse from the homepage</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Action Cards */}
        <div className="lg:w-1/2 w-full max-w-md">
          <div className="card p-8 shadow-lg rounded-3xl">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <FaExclamationTriangle className="text-white w-12 h-12" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center animate-pulse">
                    <span className="text-text-inverse font-bold">!</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-text-primary mb-3 tracking-tight">
                Page Not Found
              </h2>
              <p className="text-text-secondary font-medium">
                Don't worry! Let's get you back on track
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => navigate(-1)}
                variant="secondary"
                size="lg"
                className="border-2 group w-full"
                leftIcon={<FaArrowLeft className="text-primary group-hover:-translate-x-1 transition-transform" />}
              >
                <span>Go Back to Previous Page</span>
              </Button>

              <Button
                onClick={() => navigate('/admin-panel/home', { replace: true })}
                size="lg"
                className="group w-full"
                leftIcon={<FaHome className="group-hover:scale-110 transition-transform" />}
              >
                Return to Home
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-text-secondary text-sm mb-3 font-medium">
                  Still having trouble?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="link" onClick={() => navigate('/support')}>
                    Contact Support
                  </Button>
                  <span className="hidden sm:block text-text-muted">•</span>
                  <Button variant="link" onClick={() => navigate('/sitemap')}>
                    View Sitemap
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-surface rounded-2xl p-4 border border-border shadow-sm transition-colors">
            <div className="flex items-center justify-between text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">99.9%</div>
                <div className="text-text-muted text-xs font-medium">Uptime</div>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div className="text-center">
                <div className="text-xl font-bold text-success">24/7</div>
                <div className="text-text-muted text-xs font-medium">Support</div>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">20+</div>
                <div className="text-text-muted text-xs font-medium">Pages</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary-soft opacity-40 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-secondary opacity-20 blur-3xl"></div>
      </div>
    </div>
  );
}
