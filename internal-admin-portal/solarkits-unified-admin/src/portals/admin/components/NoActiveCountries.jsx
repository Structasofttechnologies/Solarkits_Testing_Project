import { FaGlobe, FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

export default function NoActiveCountries({ productName }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl w-24 h-24 mx-auto animate-pulse"></div>
        <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mx-auto">
          <FaGlobe className="text-primary text-3xl animate-bounce" />
        </div>
      </div>
      
      <h3 className="text-2xl font-black text-text-primary tracking-tight mb-2">
        No Active Markets Found
      </h3>
      
      <p className="text-text-secondary max-w-md mb-8 text-sm leading-relaxed">
        The SaaS product <strong className="text-primary">{productName}</strong> is not currently activated in any countries. 
        Please activate at least one market country in the configuration panel to enable this dashboard.
      </p>

      <Button
        variant="primary"
        size="md"
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 font-bold"
        onClick={() => navigate("/admin-panel/operations/company-warehouses")}
      >
        Go to Configurations
        <FaChevronRight size={12} />
      </Button>
    </div>
  );
}
