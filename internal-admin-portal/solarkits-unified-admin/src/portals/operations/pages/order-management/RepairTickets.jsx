import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTicketAlt, FaTools, FaPlus, FaCheck, FaTimes, FaUser, FaInfoCircle, FaWhatsapp, FaCamera, FaVideo } from "react-icons/fa";

import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import Dropdown from "../../components/Dropdown";

const initialTickets = [
  { id: 'TCK-4001', type: 'Repair', orderId: 'ORD-9843', serial: 'SN-TATA-540-001', brand: 'Tata Solar', fault: 'Inverter hot spot heating', status: 'Open', customer: 'Vijay Sharma', engineer: 'Unassigned' },
  { id: 'TCK-4002', type: 'Inspection', orderId: 'ORD-9845', serial: 'SN-WAA-550-99', brand: 'Waaree', fault: 'Low voltage output inspection', status: 'Assigned', customer: 'Anil Mehta', engineer: 'Praveen Joshi' },
  { id: 'TCK-4003', type: 'Technical Support', orderId: 'ORD-9842', serial: 'SN-SOL-50K-00', brand: 'Solis', fault: 'WiFi monitoring connectivity issue', status: 'Resolved', customer: 'Rajesh Nair', engineer: 'Vikram Seth' },
];

const ticketTypeOptions = [
  { value: 'Repair', text: 'Repair' },
  { value: 'Replacement', text: 'Replacement' },
  { value: 'Inspection', text: 'Inspection' },
  { value: 'Technical Support', text: 'Technical Support' }
];

const brandOptions = [
  { value: 'Tata Solar', text: 'Tata Solar' },
  { value: 'Waaree', text: 'Waaree' },
  { value: 'Solis', text: 'Solis' },
  { value: 'Adani Solar', text: 'Adani Solar' }
];

export default function RepairTickets() {
  const [tickets, setTickets] = useState(initialTickets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [whatsappLogs, setWhatsappLogs] = useState([]);

  // Form states
  const [type, setType] = useState('Repair');
  const [customer, setCustomer] = useState('');
  const [orderId, setOrderId] = useState('');
  const [serial, setSerial] = useState('');
  const [brand, setBrand] = useState('Tata Solar');
  const [fault, setFault] = useState('');
  const [hasImage, setHasImage] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customer.trim() || !orderId.trim() || !serial.trim()) return;

    const tckId = `TCK-${Math.floor(4004 + Math.random() * 900)}`;
    const newTck = {
      id: tckId,
      type,
      customer,
      orderId,
      serial,
      brand,
      fault,
      status: 'Open',
      engineer: 'Unassigned'
    };

    setTickets([newTck, ...tickets]);
    setIsModalOpen(false);
    
    // WhatsApp trigger log
    setWhatsappLogs(prev => [
      ...prev,
      `[WhatsApp to ${customer}]: Ticket ${tckId} created successfully for ${brand} ${type}. We will assign an engineer shortly.`
    ]);

    setCustomer('');
    setOrderId('');
    setSerial('');
    setFault('');
    setHasImage(false);
  };

  const handleUpdateStatus = (tck, newStatus) => {
    let eng = tck.engineer;
    if (newStatus === 'Assigned' && tck.engineer === 'Unassigned') {
      eng = 'Praveen Joshi'; // Assign mock engineer
    }

    setTickets(tickets.map(t => {
      if (t.id === tck.id) {
        return { ...t, status: newStatus, engineer: eng };
      }
      return t;
    }));

    // WhatsApp trigger log
    setWhatsappLogs(prev => [
      ...prev,
      `[WhatsApp to ${tck.customer}]: Ticket ${tck.id} status updated to "${newStatus}". Assigned Engineer: ${eng}.`
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Repair Ticket Management</h1>
          <p className="text-text-secondary">Process repair/inspection requests, schedule field engineers, and track WhatsApp ticket notifications</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          leftIcon={<FaPlus />}
        >
          New Repair Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="card md:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-border bg-bg/50">
              <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <FaTicketAlt className="text-primary" />
                Active Support & Maintenance Tickets
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                    <th className="p-4">Ticket ID</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Brand / Specs</th>
                    <th className="p-4">Issue Description</th>
                    <th className="p-4">Engineer</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Workflows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-primary/5 transition-all">
                      <td className="p-4 font-bold text-primary">{t.id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-text-primary">{t.customer}</div>
                        <div className="text-xs text-text-secondary">{t.orderId}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-text-primary">{t.brand}</div>
                        <div className="text-[10px] font-mono text-text-muted">{t.serial}</div>
                      </td>
                      <td className="p-4 text-text-secondary font-medium max-w-[150px] truncate" title={t.fault}>
                        {t.fault}
                      </td>
                      <td className="p-4 text-text-primary font-semibold">{t.engineer}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          t.status === 'Resolved' || t.status === 'Closed' ? 'bg-success/10 text-success border-success/20' :
                          t.status === 'Open' ? 'bg-danger/10 text-danger border-danger/20' :
                          'bg-warning/10 text-warning border-warning/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {t.status === 'Open' && (
                            <Button
                              onClick={() => handleUpdateStatus(t, 'Assigned')}
                              variant="primary"
                              size="sm"
                            >
                              Assign Engineer
                            </Button>
                          )}
                          {t.status === 'Assigned' && (
                            <Button
                              onClick={() => handleUpdateStatus(t, 'Engineer Visiting')}
                              variant="warning"
                              size="sm"
                            >
                              Start Visit
                            </Button>
                          )}
                          {t.status === 'Engineer Visiting' && (
                            <Button
                              onClick={() => handleUpdateStatus(t, 'In Progress')}
                              variant="primary"
                              size="sm"
                            >
                              In Progress
                            </Button>
                          )}
                          {t.status === 'In Progress' && (
                            <Button
                              onClick={() => handleUpdateStatus(t, 'Resolved')}
                              variant="success"
                              size="sm"
                            >
                              Resolve Ticket
                            </Button>
                          )}
                          {t.status === 'Resolved' && (
                            <Button
                              onClick={() => handleUpdateStatus(t, 'Closed')}
                              variant="secondary"
                              size="sm"
                            >
                              Close
                            </Button>
                          )}
                          {t.status === 'Closed' && (
                            <span className="text-xs text-text-muted">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* WhatsApp Tracker Simulator log */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
              <FaWhatsapp className="text-success text-xl" />
              WhatsApp Ticket Tracker
            </h3>
            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {whatsappLogs.map((log, idx) => (
                <div key={idx} className="p-2 bg-success/5 border border-success/15 text-[10px] text-text-secondary rounded-lg font-mono leading-relaxed">
                  {log}
                </div>
              ))}
              {whatsappLogs.length === 0 && (
                <div className="text-xs text-text-muted italic flex items-center gap-1">
                  <FaInfoCircle /> Trigger status updates to simulate real-time WhatsApp logs to customers
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FaTicketAlt className="text-primary" />
                  Create Support Ticket
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Dropdown
                    label="Ticket Type"
                    value={type}
                    onChange={(val) => setType(val)}
                    options={ticketTypeOptions}
                    className="w-full"
                  />
                  <Dropdown
                    label="Brand"
                    value={brand}
                    onChange={(val) => setBrand(val)}
                    options={brandOptions}
                    className="w-full"
                  />
                </div>

                <CustomInput
                  label="Customer Name"
                  placeholder="e.g. Vijay Sharma"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <CustomInput
                    label="Order ID"
                    placeholder="e.g. ORD-9843"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                  />
                  <CustomInput
                    label="Product Serial No"
                    placeholder="e.g. SN-TATA-540-001"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                  />
                </div>

                <CustomInput
                  label="Fault Description"
                  type="textarea"
                  placeholder="Describe the issue or inspection requirements..."
                  value={fault}
                  onChange={(e) => setFault(e.target.value)}
                />

                {/* Upload attachment Simulator */}
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Attachments (Photos/Videos)</label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setHasImage(!hasImage)}
                      variant={hasImage ? 'success' : 'secondary'}
                      size="sm"
                      fullWidth
                      leftIcon={<FaCamera />}
                    >
                      {hasImage ? 'Photo Uploaded' : 'Upload photo'}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                leftIcon={<FaTools />}
              >
                Open Repair Ticket
              </Button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
