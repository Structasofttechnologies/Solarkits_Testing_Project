import React from "react";
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
  headers: headersProp,
  columns,
  data = [],
  loading = false,
  emptyMessage,
  emptyText,
  renderRow,
  className = "",
  containerClassName = ""
}) => {
  const headers = headersProp || columns || [];
  const message = emptyMessage || emptyText || "No data found";

  return (
    <div className={`card overflow-hidden transition-all duration-300 ${containerClassName}`}>
      <div className="overflow-x-auto scrollbar-hover">
        <table className={`w-full border-collapse ${className}`}>
          <thead>
            <tr className="bg-linear-to-r from-primary/5 via-primary/2 to-transparent border-b border-border">
              {headers.map((header, index) => (
                <th
                  key={`th-${index}`}
                  style={{ width: header.width, textAlign: header.align || 'left' }}
                  className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary whitespace-nowrap"
                >
                  {header.label || header.header || header.title || header.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={Math.max(1, headers.length)} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader size="lg" />
                    <p className="text-text-secondary font-medium animate-pulse tracking-wide">
                      Fetching records...
                    </p>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, index) => {
                if (renderRow) {
                  const rendered = renderRow(item, index);
                  if (rendered && (rendered.type === 'tr' || rendered.type === motion.tr || rendered.type?.name === 'motion.tr')) {
                    return rendered;
                  }
                  const isFragment = rendered && (rendered.type === React.Fragment || rendered.type === Symbol.for('react.fragment'));
                  if (isFragment) {
                    const children = React.Children.toArray(rendered.props?.children);
                    const hasTr = children.some(
                      (child) => child && (child.type === 'tr' || child.type === motion.tr || child.type?.name === 'motion.tr')
                    );
                    if (hasTr) {
                      return rendered;
                    }
                  }
                  return (
                    <motion.tr
                      key={item.id || item._id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group hover:bg-primary/2 transition-colors duration-300"
                    >
                      {rendered}
                    </motion.tr>
                  );
                }
                return (
                  <motion.tr
                    key={item.id || item._id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group hover:bg-primary/2 transition-colors duration-300"
                  >
                    {headers.map((header, colIndex) => (
                      <td
                        key={`td-${colIndex}`}
                        style={{ textAlign: header.align || 'left' }}
                        className="px-6 py-4 text-sm font-medium text-text-primary group-hover:text-primary transition-colors"
                      >
                        {header.render ? header.render(item[header.accessor || header.key], item) : item[header.accessor || header.key]}
                      </td>
                    ))}
                  </motion.tr>
                );
              })

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
