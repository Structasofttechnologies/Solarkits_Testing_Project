const express = require('express');
const router = express.Router();

const clusterHandler = require('../controller/franchisee.cluster.handler');
const mapHandler = require('../controller/franchisee.map.handler');
const agreementHandler = require('../controller/franchisee.agreement.handler');
const goalsHandler = require('../controller/franchisee.goals.handler');
const performanceHandler = require('../controller/franchisee.performance.handler');
const bdeClusterHandler = require('../controller/bde.cluster.handler');
const ticketHandler = require('../controller/franchisee.tickets.handler');

// ── 1. Interactive India Territory Map Dashboard ─────────────────────────────
router.get('/map/territory-overview', mapHandler.get_india_territory_map_data);
router.get('/map/district-popup/:district_id', mapHandler.get_district_popup_details);

// ── 2. Franchisee Cluster Management ─────────────────────────────────────────
router.get('/states', clusterHandler.get_states_list);
router.get('/bdes', clusterHandler.get_bdes_list);
router.get('/resellers', clusterHandler.get_resellers_list);
router.get('/my-cluster-info', clusterHandler.get_my_cluster_info);
router.get('/available-districts/:state_id', clusterHandler.get_state_districts_availability);
router.get('/list', clusterHandler.get_clusters);
router.get('/:id', clusterHandler.get_cluster_by_id);
router.post('/create', clusterHandler.create_cluster);
router.put('/:id', clusterHandler.update_cluster);
router.put('/:id/fees', clusterHandler.update_cluster_fees);
router.delete('/:id', clusterHandler.delete_cluster);

// ── 3. Franchisee Agreement Management ───────────────────────────────────────
router.get('/agreements/list', agreementHandler.list_agreements);
router.get('/agreements/:id', agreementHandler.get_agreement_detail);
router.post('/agreements/create', agreementHandler.create_agreement);
router.post('/agreements/:id/renew', agreementHandler.renew_agreement);
router.post('/agreements/:id/terminate', agreementHandler.terminate_agreement);

// ── 4. Franchisee Goal Settings ──────────────────────────────────────────────
router.get('/goals/list', goalsHandler.get_goals_list);
router.get('/goals/cluster/:cluster_id', goalsHandler.get_goal_by_cluster);
router.post('/goals/set', goalsHandler.set_cluster_goals);

// ── 5. Franchisee Performance Dashboard ──────────────────────────────────────
router.get('/performance/dashboard', performanceHandler.get_performance_dashboard);

// ── 6. BDE Management & Cluster Assignment ───────────────────────────────────
router.get('/bde/mappings', bdeClusterHandler.get_bde_mappings);
router.post('/bde/assign-cluster', bdeClusterHandler.assign_bde_to_cluster);
router.get('/bde/my-cluster-dashboard', bdeClusterHandler.get_bde_cluster_dashboard);

// ── 7. Centralized Support & Replacement Tickets ─────────────────────────────
router.get('/tickets/list', ticketHandler.list_tickets);
router.post('/tickets/create', ticketHandler.create_ticket);
router.put('/tickets/:id', ticketHandler.update_ticket);

module.exports = router;
