import React from "react";
import { Link } from "react-router-dom";
import {
  FiTruck,
  FiShield,
  FiFileText,
  FiPhoneCall,
  FiMail,
  FiMapPin,
  FiSun,
  FiZap,
  FiLock,
  FiCheckCircle
} from "react-icons/fi";
import logo from "@/assets/images/logo.png";

export default function StoreFooter() {
  return (
    <footer className="bg-white text-slate-600 border-t border-slate-200 transition-colors">
      
      {/* Value Proposition Strip */}
      <div className="border-b border-slate-200/80 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-secondary-soft text-secondary flex items-center justify-center shrink-0 shadow-xs border border-secondary/20">
                <FiTruck size={22} className="text-secondary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Pan-India Delivery</h4>
                <p className="text-xs text-slate-500 mt-0.5">Direct from certified regional solar warehouses to your site</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/20">
                <FiShield size={22} className="text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">25-Year Panel Warranty</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tier-1 certified modules with manufacturer performance backing</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs border border-emerald-500/20">
                <FiFileText size={22} className="text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">GST Invoiced & Turnkey</h4>
                <p className="text-xs text-slate-500 mt-0.5">Complete kits with panels, inverter, mounting rails & safety boxes</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 shadow-xs border border-amber-500/20">
                <FiLock size={22} className="text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">100% Secure Payments</h4>
                <p className="text-xs text-slate-500 mt-0.5">Protected with encrypted Razorpay UPI, Cards & NetBanking</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img
                src={logo}
                alt="SOLARKITS - A Solar Marketplace"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              SOLARKITS is India's dedicated online marketplace for complete solar power kits. We engineer, bundle, and deliver turnkey on-grid, off-grid, and hybrid solar packages for homes and commercial businesses.
            </p>
            <div className="pt-2 text-xs text-slate-700 space-y-2">
              <p className="flex items-center gap-2">
                <FiPhoneCall className="text-secondary" />
                <span>Solar Consultation: <strong>1800-SOLAR-KIT</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <FiMail className="text-primary" />
                <span>Email: <strong>support@solarkits.in</strong></span>
              </p>
            </div>
          </div>

          {/* Column 1: Complete Solar Kits */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3.5">
              Complete Solar Kits
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/shop" className="hover:text-primary transition-colors font-medium">
                  Shop All Solar Kits
                </Link>
              </li>
              <li>
                <Link to="/shop?type=on-grid" className="hover:text-primary transition-colors font-medium">
                  On-Grid Solar Kits
                </Link>
              </li>
              <li>
                <Link to="/shop?type=off-grid" className="hover:text-primary transition-colors font-medium">
                  Off-Grid Solar Kits
                </Link>
              </li>
              <li>
                <Link to="/shop?type=hybrid" className="hover:text-primary transition-colors font-medium">
                  Hybrid Solar Systems
                </Link>
              </li>
              <li>
                <Link to="/shop?application=residential" className="hover:text-primary transition-colors font-medium">
                  Residential Rooftop Kits
                </Link>
              </li>
              <li>
                <Link to="/shop?application=commercial" className="hover:text-primary transition-colors font-medium">
                  Commercial 10kW+ Kits
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Customer Assistance */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3.5">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/store-locator" className="hover:text-primary transition-colors font-bold text-primary flex items-center gap-1">
                  <span>📍 Find Nearby Store</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Policies */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3.5">
              Compliance & Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/privacy-policy" className="hover:text-primary transition-colors font-medium">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-primary transition-colors font-medium">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-primary transition-colors font-medium">
                  GST Invoicing Terms
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-primary transition-colors font-medium">
                  Warranty Claim Support
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SOLARKITS India. All rights reserved. A Solar Marketplace.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <FiCheckCircle className="text-emerald-600" size={14} />
              <span>Certified Complete Solar Power Kits</span>
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
}
