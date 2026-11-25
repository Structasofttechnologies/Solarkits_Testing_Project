import React from "react";
import ReactCountryFlag from "react-country-flag";
import Button from "@/components/Button";
import { FiChevronLeft, FiClock } from "react-icons/fi";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export const HeaderSection = ({
  title,
  subtitle,
  stats,
  country,
  showBack = true,
  backPath,
  backState,
  onNavigateBack,
  actionButton,
  actionLabel,
  actionVariant = "danger",
  actionLoading = false,
  actionIcon,
  onAction,
  moduleUniqueId = null,
  permission = "edit"
}) => {
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary-end shadow-xl">
      <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
      <div className="relative px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {showBack && (
              <Button
                onClick={() => onNavigateBack(backPath, backState)}
                variant="outline-primary"
                leftIcon={<FiChevronLeft />}
                className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20"
              >
                Back
              </Button>
            )}

            <div className="flex items-center gap-3">
              {country?.iso2 && (
                <ReactCountryFlag
                  countryCode={country.iso2}
                  svg
                  className="text-3xl shadow-sm rounded-sm"
                />
              )}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
                      {subtitle}
                    </span>
                  )}
                </div>
                {stats && (
                  <p className="text-white/90 text-lg max-w-2xl">
                    {stats}
                  </p>
                )}
              </div>
            </div>
          </div>

          {actionButton && (
            <RenderIfPermission 
              requiredUniqueId={moduleUniqueId} 
              permission={permission}
              fallback={null}
            >
              <Button
                onClick={onAction}
                disabled={actionLoading}
                loading={actionLoading}
                variant={actionVariant}
                leftIcon={actionLoading ? null : actionIcon}
                className={actionVariant === "danger" ? "bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20" : ""}
              >
                {actionLabel}
              </Button>
            </RenderIfPermission>
          )}
        </div>

        {/* Optional Stats Grid could be added here as children */}
      </div>
    </div>
  );
};