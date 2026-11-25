import { useState, useEffect, useCallback } from 'react';
import { fetchPipelineStatus, fetchSidebarCounts } from '../api/pipelineApi';

export default function usePipelineStatus() {
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [sidebarCounts, setSidebarCounts] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const country = localStorage.getItem('selected_country_admin') || 'india';
      const [pipeData, countsData] = await Promise.all([
        fetchPipelineStatus(country).catch(() => null),
        fetchSidebarCounts(country).catch(() => null),
      ]);

      if (pipeData) {
        setPipelineStatus(pipeData);
      }
      if (countsData) {
        setSidebarCounts(countsData);
        // If pipeData was not available or partial, sync company_margin and kit_activations from countsData
        if (!pipeData && (countsData.company_margin || countsData.kit_activations)) {
          setPipelineStatus({
            company_margin: countsData.company_margin,
            kit_activations: countsData.kit_activations,
            has_pending_any: countsData.company_margin?.has_pending || countsData.kit_activations?.has_pending,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load pipeline status and sidebar counts:', err);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Re-check when window regains focus or when custom event fires
    const handleRefreshEvent = () => refresh();
    window.addEventListener('focus', handleRefreshEvent);
    window.addEventListener('pipeline-status-refresh', handleRefreshEvent);
    window.addEventListener('sidebar-counts-refresh', handleRefreshEvent);
    window.addEventListener('solarshop-movement-update', handleRefreshEvent);

    // Polling every 35s to capture any external movements
    const timer = setInterval(refresh, 35000);

    return () => {
      window.removeEventListener('focus', handleRefreshEvent);
      window.removeEventListener('pipeline-status-refresh', handleRefreshEvent);
      window.removeEventListener('sidebar-counts-refresh', handleRefreshEvent);
      window.removeEventListener('solarshop-movement-update', handleRefreshEvent);
      clearInterval(timer);
    };
  }, [refresh]);

  return {
    pipelineStatus,
    sidebarCounts,
    loading,
    refreshPipelineStatus: refresh,
    refreshSidebarCounts: refresh,
  };
}

