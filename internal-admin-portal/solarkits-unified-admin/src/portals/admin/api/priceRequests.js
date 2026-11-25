import { apiRequest } from "./productTemplates";

// API Call: GET /price-requests - Fetch price requests list
export const getPriceRequests = (moduleUniqueId) =>
  apiRequest("get", "/price-requests", moduleUniqueId, "view");

// API Call: POST /price-requests/:id/approve - Approve price request
export const approvePriceRequest = (id, moduleUniqueId, payload) =>
  apiRequest("post", `/price-requests/${id}/approve`, moduleUniqueId, "edit", { payload });

// API Call: POST /price-requests/:id/reject - Reject price request
export const rejectPriceRequest = (id, moduleUniqueId) =>
  apiRequest("post", `/price-requests/${id}/reject`, moduleUniqueId, "edit");
