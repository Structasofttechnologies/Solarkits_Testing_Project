import React from "react";
import { useLocation, Link } from "react-router-dom";
import { FiChevronRight, FiHome } from "react-icons/fi";

const PageHeader = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  actions, 
  stats = [],
  className = "" 
}) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <div className={`relative overflow-hidden rounded-2xl gradient-primary shadow-xl mb-8 ${className}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative px-6 py-8 lg:px-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            {Icon && (
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg shrink-0">
                <Icon className="text-white text-3xl" />
              </div>
            )}
            <div>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-white/70 text-xs font-medium mb-3 uppercase tracking-wider">
                <Link to="/operation-management-panel/home" className="hover:text-white transition-colors flex items-center gap-1">
                  <FiHome size={12} />
                  Home
                </Link>
                {pathnames.slice(1).map((name, index) => {
                  const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
                  const isLast = index === pathnames.slice(1).length - 1;
                  const displayName = name.replace(/-/g, ' ');

                  return (
                    <React.Fragment key={name}>
                      <FiChevronRight size={12} className="text-white/40" />
                      {isLast ? (
                        <span className="text-white font-bold">{displayName}</span>
                      ) : (
                        <Link to={routeTo} className="hover:text-white transition-colors">
                          {displayName}
                        </Link>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>

              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/80 text-lg max-w-2xl font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 min-w-[120px]">
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.description && (
                    <p className="text-white/50 text-[10px] mt-1 font-medium">{stat.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="flex flex-wrap gap-3 items-center">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;