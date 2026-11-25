import { motion } from "framer-motion";
import { FiInbox } from "react-icons/fi";
import Loader from "./Loader";

/**
 * CustomTable Component
 * @param {Object} props
 * @param {Array} props.headers - Array of objects { key, label, align, width }
 * @param {Array} props.data - Array of data objects
 * @param {Boolean} props.loading - Loading state
 * @param {String} props.emptyMessage - Message to show when data is empty
 * @param {Function} props.renderRow - Custom row renderer (optional)
 * @param {String} props.className - Additional class names for the container
 */
const CustomTable = ({
  headers = [],
  data = [],
  loading = false,
  emptyMessage = "No data found",
  renderRow,
  className = "",
  containerClassName = ""
}) => {
  return (
    <div className={`card overflow-hidden transition-all duration-300 ${containerClassName}`}>
      <div className="overflow-x-auto scrollbar-hover">
        <table className={`w-full border-collapse ${className}`}>
          <thead>
            <tr className="bg-linear-to-r from-primary/5 via-primary/[0.02] to-transparent border-b border-border">
              {headers.map((header, index) => (
                <th
                  key={header.key || index}
                  style={{ width: header.width, textAlign: header.align || 'left' }}
                  className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary whitespace-nowrap"
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader size="lg" />
                    <p className="text-text-secondary font-medium animate-pulse tracking-wide">
                      Fetching records...
                    </p>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, index) => (
                <motion.tr
                  key={item.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group hover:bg-primary/[0.02] transition-colors duration-300"
                >
                  {renderRow ? (
                    renderRow(item, index)
                  ) : (
                    headers.map((header) => (
                      <td
                        key={header.key}
                        style={{ textAlign: header.align || 'left' }}
                        className="px-6 py-4 text-sm font-medium text-text-primary group-hover:text-primary transition-colors"
                      >
                        {header.render ? header.render(item[header.key], item) : item[header.key]}
                      </td>
                    ))
                  )}
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center">
                      <FiInbox size={32} className="text-text-muted" />
                    </div>
                    <p className="text-text-secondary font-medium tracking-wide">
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomTable;
