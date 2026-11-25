/**
 * delivery.management.route.js
 * Express router for Delivery Management & Route Consolidation.
 * Prefix: /admin-api/delivery-management
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/delivery.management.handler');

// ─── 1. Vehicle Master Endpoints ─────────────────────────────────────────────
router.get('/vehicles/masters', check_auth, handler.get_vehicle_masters);
router.post('/vehicles/masters', check_auth, handler.create_vehicle_master);
router.put('/vehicles/masters/:id', check_auth, handler.update_vehicle_master);
router.delete('/vehicles/masters/:id', check_auth, handler.delete_vehicle_master);

// ─── 2. Service Provider Endpoints ───────────────────────────────────────────
router.get('/providers', check_auth, handler.get_service_providers);
router.post('/providers', check_auth, handler.create_service_provider);
router.put('/providers/:id', check_auth, handler.update_service_provider);
router.delete('/providers/:id', check_auth, handler.delete_service_provider);

// ─── 3. Physical Fleet Endpoints ─────────────────────────────────────────────
router.get('/fleet/vehicles', check_auth, handler.get_fleet_vehicles);
router.post('/fleet/vehicles', check_auth, handler.create_fleet_vehicle);
router.put('/fleet/vehicles/:id', check_auth, handler.update_fleet_vehicle);

// ─── 4. ComboKit Weight Master & Capacity Chart ──────────────────────────────
router.get('/kits/weights', check_auth, handler.get_combokit_weights);
router.post('/kits/weights/upsert', check_auth, handler.upsert_combokit_weight);
router.get('/kits/weights/capacity-chart', check_auth, handler.get_vehicle_capacity_chart);

// ─── 5. Delivery Cost Settings (Benchmark) ───────────────────────────────────
router.get('/benchmarks', check_auth, handler.get_benchmarks);
router.post('/benchmarks', check_auth, handler.create_benchmark);
router.post('/benchmarks/bulk', check_auth, handler.bulk_create_benchmarks);
router.put('/benchmarks/:id', check_auth, handler.update_benchmark);
router.delete('/benchmarks/:id', check_auth, handler.delete_benchmark);
router.post('/benchmarks/bulk-delete', check_auth, handler.bulk_delete_benchmarks);

// ─── 6. Kit-Wise Delivery Cost Rules ─────────────────────────────────────────
router.get('/kit-rules', check_auth, handler.get_kit_rules);
router.post('/kit-rules', check_auth, handler.create_kit_rule);
router.put('/kit-rules/:id', check_auth, handler.update_kit_rule);
router.delete('/kit-rules/:id', check_auth, handler.delete_kit_rule);
router.post('/kit-rules/bulk-delete', check_auth, handler.bulk_delete_kit_rules);

// ─── 7. Route & Consolidation Settings ───────────────────────────────────────
router.get('/routes', check_auth, handler.get_routes);
router.post('/routes', check_auth, handler.create_route);
router.put('/routes/:id', check_auth, handler.update_route);
router.delete('/routes/:id', check_auth, handler.delete_route);

// ─── 8. Delivery Queue & Franchisee Destinations ─────────────────────────────
router.get('/hierarchy-options', check_auth, handler.get_hierarchy_options);
router.get('/queue', check_auth, handler.get_delivery_queue);
router.post('/queue/:orderId/priority', check_auth, handler.update_order_priority);
router.get('/destinations/franchisees', check_auth, handler.get_franchisee_destinations);

// ─── 9. Fleet Recommendation & Benchmark Validation ─────────────────────────
router.get('/eligible-fleet', check_auth, handler.get_eligible_fleet);
router.post('/validate-benchmark', check_auth, handler.validate_benchmark);

// ─── 10. Create Delivery Order / Master Trip ─────────────────────────────────
router.post('/create', check_auth, handler.create_delivery_order);

// ─── 11. Tracking & POD Confirmation ─────────────────────────────────────────
router.get('/tracking', check_auth, handler.get_tracking_list);
router.get('/tracking/:id', check_auth, handler.get_trip_details);
router.post('/tracking/:id/status', check_auth, handler.update_trip_status);
router.post('/tracking/:id/stops/:stopNumber/pod', check_auth, handler.confirm_stop_pod);

// ─── 12. Sanitized Public/Customer Tracking ───────────────────────────────────
router.get('/public/track/:trackingRef', handler.get_public_tracking);

// ─── 13. Dashboard & KPIs ─────────────────────────────────────────────────────
router.get('/analytics/dashboard', check_auth, handler.get_dashboard_analytics);

// ─── 14. Company Warehouses List ──────────────────────────────────────────────
router.get('/warehouses', check_auth, handler.get_warehouses_list);

// ─── 15. Delivery Cost Approval Queue ─────────────────────────────────────────
router.get('/approval-queue', check_auth, handler.get_delivery_approval_queue);
router.post('/approval-queue/:id/decision', check_auth, handler.submit_delivery_approval_decision);

module.exports = router;

