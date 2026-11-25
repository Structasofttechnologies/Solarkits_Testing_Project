import React from "react";
import { FaPlus, FaSpinner, FaCheckCircle, FaClock } from "react-icons/fa";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Button from "@/components/Button";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export const ActivationCard = ({
  title,
  description,
  totalCount,
  label,
  options,
  selectedValue,
  onSelect,
  onActivate,
  activating = false,
  placeholder,
  disabled = false,
  icon: Icon = FaPlus,
  activateText = "Activate",
  moduleUniqueId = null,
  permission = "edit"
}) => {
  const hasPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission });
  
  return (
    <RenderIfPermission 
      requiredUniqueId={moduleUniqueId} 
      permission={permission}
      fallback={
        <div className="card p-8 text-center">
          <div className="w-20 h-20 rounded-xl bg-linear-to-br from-primary to-primary-end flex items-center justify-center mx-auto mb-4 opacity-50">
            <Icon className="text-white text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2 opacity-50">{title}</h3>
          <p className="text-text-secondary mb-4 opacity-50">You don't have permission to perform this action.</p>
        </div>
      }
    >
      <div className="card hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-5">
          {/* Last updated badge */}
          <div className="flex justify-end mb-4">
            <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
              <FaClock size={10} />
              {activateText}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary">{title}</h3>
              <p className="text-text-secondary text-sm">{description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {label}
              </label>

              {options?.length > 0 ? (
                <DropdownWithSearchInput
                  value={selectedValue}
                  onChange={onSelect}
                  options={options}
                  className="w-full"
                  disabled={disabled}
                  placeholder={placeholder}
                />
              ) : (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                  All items are already active!
                </div>
              )}
            </div>

            <div>
              {selectedValue && (
                <Button
                  onClick={onActivate}
                  disabled={activating || disabled}
                  className="w-full bg-linear-120 from-primary to-primary-end"
                  leftIcon={activating ? <FaSpinner className="animate-spin mr-2" /> : <FaCheckCircle className="mr-2" />}
                  loading={activating}
                >
                  {activating ? 'Activating...' : activateText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </RenderIfPermission>
  );
};