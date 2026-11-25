/**
 * IndustryMediaShowcase.jsx
 *
 * Master Visual Media Showcase Orchestrator.
 * Shared across SolarKits Reseller Portal and BOS Kits Distributor Portal.
 *
 * Visual Priority Order:
 * 1. Compact Industry Selector
 * 2. Featured Media Hero Banner (21:9 cinematic banner with muted autoplay & 4K fullscreen trigger)
 * 3. Media-Type Filter Bar (All / Videos / Photos / Posters & Sort)
 * 4. Editorial Visual Gallery Grid (3-column responsive)
 * 5. Optional "More From This Industry" Carousel (Product Kits & Specs)
 * 6. Immersive Full-Screen Lightbox / Video Player
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import IndustrySelector from './IndustrySelector';
import FeaturedMediaHero from './FeaturedMediaHero';
import MediaFilterBar from './MediaFilterBar';
import MediaGalleryGrid from './MediaGalleryGrid';
import MoreFromIndustryCarousel from './MoreFromIndustryCarousel';
import MediaLightbox from './MediaLightbox';
import IndustryShowcaseSkeleton, {
  HeroBannerSkeleton,
  MediaGridSkeleton,
  FilterBarSkeleton,
} from './IndustryContentSkeleton';
import ContentEmptyState from './ContentEmptyState';
import {
  getMyIndustries,
  getDashboardContent,
  getIndustryTheme,
  getRelatedProducts,
  trackContentEvent,
} from '../../services/industryContent';

export default function IndustryMediaShowcase({
  role = 'RESELLER',
  user = null,
  storageKey = 'solarkits_selected_industry_id',
  onCtaClick = null,
  customIndustryService = null,
  customContentService = null,
  customThemeService = null,
  customProductService = null,
}) {
  // Service resolvers (supports dependency injection for Reseller vs Distributor)
  const fetchIndustriesApi = customIndustryService || getMyIndustries;
  const fetchContentApi = customContentService || getDashboardContent;
  const fetchThemeApi = customThemeService || getIndustryTheme;
  const fetchProductsApi = customProductService || getRelatedProducts;

  const userId = user?.id || user?._id || null;

  // Industries State
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [loadingIndustries, setLoadingIndustries] = useState(true);

  // Content State
  const [contents, setContents] = useState([]);
  const [theme, setTheme] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Sort State
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeSort, setActiveSort] = useState('FEATURED');

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // In-memory cache by industry ID
  const cacheRef = useRef({});

  // 1. Fetch Approved/Active Industries
  useEffect(() => {
    let isMounted = true;
    setLoadingIndustries(true);

    fetchIndustriesApi()
      .then((res) => {
        if (!isMounted) return;
        const list = (res.data?.status === 'success' || res.data?.success)
          ? (res.data.data || [])
          : (res.data || []);

        setIndustries(list);

        const savedId = localStorage.getItem(storageKey);
        const found = list.find((i) => (i.id || i._id) === savedId);

        if (found) {
          setSelectedIndustry(found);
        } else if (list.length > 0) {
          setSelectedIndustry(list[0]);
          localStorage.setItem(storageKey, list[0].id || list[0]._id);
        }
      })
      .catch((err) => {
        console.error('[IndustryMediaShowcase] Failed to load industries:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingIndustries(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchIndustriesApi, storageKey]);

  // 2. Load Content for Selected Industry
  const selectedIndustryId = selectedIndustry?.id || selectedIndustry?._id || null;

  const loadIndustryData = useCallback(
    (industryId, forceRefresh = false) => {
      if (!industryId) return;

      if (!forceRefresh && cacheRef.current[industryId]) {
        const cached = cacheRef.current[industryId];
        setContents(cached.contents || []);
        setTheme(cached.theme || null);
        setProducts(cached.products || []);
        return;
      }

      setLoadingContent(true);
      if (forceRefresh) setRefreshing(true);

      Promise.allSettled([
        fetchContentApi(industryId),
        fetchThemeApi(industryId),
        fetchProductsApi(industryId, 1, 10),
      ])
        .then(([contentRes, themeRes, productRes]) => {
          const items =
            contentRes.status === 'fulfilled' && (contentRes.value.data?.status === 'success' || contentRes.value.data?.success)
              ? contentRes.value.data.data || []
              : [];

          const themeData =
            themeRes.status === 'fulfilled' && (themeRes.value.data?.status === 'success' || themeRes.value.data?.success)
              ? themeRes.value.data.data || null
              : null;

          const productItems =
            productRes.status === 'fulfilled' && (productRes.value.data?.status === 'success' || productRes.value.data?.success)
              ? productRes.value.data.data || []
              : [];

          cacheRef.current[industryId] = {
            contents: items,
            theme: themeData,
            products: productItems,
          };

          setContents(items);
          setTheme(themeData);
          setProducts(productItems);

          // Track impressions
          if (userId && items.length > 0) {
            items.forEach((item) => {
              trackContentEvent({
                content_id: item.id || item._id,
                industry_type_id: industryId,
                event_type: 'IMPRESSION',
                placement: item.placement,
                user_type: role,
                user_id: userId,
              });
            });
          }
        })
        .finally(() => {
          setLoadingContent(false);
          setRefreshing(false);
        });
    },
    [fetchContentApi, fetchThemeApi, fetchProductsApi, role, userId]
  );

  useEffect(() => {
    if (selectedIndustryId) {
      loadIndustryData(selectedIndustryId);
    }
  }, [selectedIndustryId, loadIndustryData]);

  const handleSelectIndustry = (industry) => {
    if ((industry.id || industry._id) === selectedIndustryId) return;
    setSelectedIndustry(industry);
    const id = industry.id || industry._id;
    localStorage.setItem(storageKey, id);
    setActiveFilter('ALL');
  };

  // 3. Featured Hero Item Resolution
  const heroItem = useMemo(() => {
    if (!contents || contents.length === 0) return null;
    return (
      contents.find((c) => c.is_featured && (c.placement === 'HERO' || c.placement === 'DASHBOARD_TOP')) ||
      contents.find((c) => c.placement === 'HERO' || c.content_type === 'HERO_BANNER') ||
      contents.find((c) => c.content_type === 'VIDEO' || c.content_type === 'EXPLAINER_VIDEO') ||
      contents[0] ||
      null
    );
  }, [contents]);

  // 4. Remaining Gallery Items Resolution (Excludes Hero if distinct items exist)
  const galleryItems = useMemo(() => {
    if (!contents || contents.length === 0) return [];
    const heroId = heroItem?.id || heroItem?._id;
    const remaining = contents.filter((c) => (c.id || c._id) !== heroId);
    return remaining.length > 0 ? remaining : contents;
  }, [contents, heroItem]);

  // 5. Filter & Sort Processing
  const filteredAndSortedGallery = useMemo(() => {
    let list = [...galleryItems];

    // Media Filter
    if (activeFilter === 'VIDEO') {
      list = list.filter(
        (c) =>
          c.content_type === 'VIDEO' ||
          c.content_type === 'EXPLAINER_VIDEO' ||
          c.content_type === 'VIDEO_SLIDER' ||
          c.media?.some((m) => m.media_type === 'VIDEO')
      );
    } else if (activeFilter === 'PHOTO') {
      list = list.filter(
        (c) =>
          c.content_type === 'PHOTO' ||
          c.content_type === 'GALLERY' ||
          c.content_type === 'IMAGE_SLIDER' ||
          c.media?.some((m) => m.media_type === 'IMAGE' || m.media_type === 'PHOTO')
      );
    } else if (activeFilter === 'POSTER') {
      list = list.filter(
        (c) =>
          c.content_type === 'POSTER' ||
          c.media?.some((m) => m.media_type === 'POSTER' || m.media_type === 'THUMBNAIL')
      );
    }

    // Sort
    if (activeSort === 'NEWEST') {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (activeSort === 'POPULAR') {
      list.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else {
      // FEATURED first, then priority, then display_order
      list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || (b.priority || 0) - (a.priority || 0) || (a.display_order || 0) - (b.display_order || 0));
    }

    return list;
  }, [galleryItems, activeFilter, activeSort]);

  // Counts for Filter Pills
  const filterCounts = useMemo(() => {
    const counts = { ALL: galleryItems.length, VIDEO: 0, PHOTO: 0, POSTER: 0 };
    galleryItems.forEach((c) => {
      const isVid = c.content_type === 'VIDEO' || c.content_type === 'EXPLAINER_VIDEO' || c.content_type === 'VIDEO_SLIDER' || c.media?.some((m) => m.media_type === 'VIDEO');
      const isPic = c.content_type === 'PHOTO' || c.content_type === 'GALLERY' || c.content_type === 'IMAGE_SLIDER' || c.media?.some((m) => m.media_type === 'IMAGE' || m.media_type === 'PHOTO');
      const isPost = c.content_type === 'POSTER' || c.media?.some((m) => m.media_type === 'POSTER' || m.media_type === 'THUMBNAIL');

      if (isVid) counts.VIDEO += 1;
      if (isPic) counts.PHOTO += 1;
      if (isPost) counts.POSTER += 1;
    });
    return counts;
  }, [galleryItems]);

  // Lightbox Triggers
  const openLightboxForItem = (item) => {
    const idx = filteredAndSortedGallery.findIndex((c) => (c.id || c._id) === (item.id || item._id));
    if (idx !== -1) {
      setLightboxIndex(idx);
    } else {
      // If hero or external item
      setLightboxIndex(0);
    }
    setIsLightboxOpen(true);

    if (userId) {
      trackContentEvent({
        content_id: item.id || item._id,
        industry_type_id: selectedIndustryId,
        event_type: 'VIEW',
        placement: item.placement,
        user_type: role,
        user_id: userId,
      });
    }
  };

  const openLightboxForHero = (hero) => {
    const heroList = [hero, ...filteredAndSortedGallery.filter((c) => (c.id || c._id) !== (hero.id || hero._id))];
    setLightboxIndex(0);
    setIsLightboxOpen(true);
  };

  const handleCta = (content) => {
    if (onCtaClick) onCtaClick(content);
    if (userId) {
      trackContentEvent({
        content_id: content.id || content._id,
        industry_type_id: selectedIndustryId,
        event_type: 'CTA_CLICK',
        placement: content.placement,
        user_type: role,
        user_id: userId,
      });
    }
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* ── 1. Compact Industry Segment Selector ───────────────────────────── */}
      <IndustrySelector
        industries={industries}
        selected={selectedIndustry}
        onSelect={handleSelectIndustry}
        loading={loadingIndustries}
        onRefresh={() => loadIndustryData(selectedIndustryId, true)}
        refreshing={refreshing}
      />

      {/* ── 2. Featured Media Hero Banner (Directly below selector) ────────── */}
      {loadingContent && contents.length === 0 ? (
        <HeroBannerSkeleton />
      ) : heroItem ? (
        <FeaturedMediaHero
          content={heroItem}
          role={role}
          onCtaClick={handleCta}
          onOpenFullscreen={openLightboxForHero}
        />
      ) : (
        <ContentEmptyState message="No featured media assets published for this industry." />
      )}

      {/* ── 3. Media-Type Filter Bar & Sort Controls ────────────────────────── */}
      {galleryItems.length > 0 && (
        <MediaFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          activeSort={activeSort}
          onSortChange={setActiveSort}
          counts={filterCounts}
        />
      )}

      {/* ── 4. Editorial Visual Gallery Grid ───────────────────────────────── */}
      {loadingContent && contents.length === 0 ? (
        <MediaGridSkeleton count={6} />
      ) : (
        <MediaGalleryGrid
          items={filteredAndSortedGallery}
          role={role}
          onCardClick={openLightboxForItem}
          onDownload={(item) => {
            if (userId) {
              trackContentEvent({
                content_id: item.id || item._id,
                industry_type_id: selectedIndustryId,
                event_type: 'DOWNLOAD',
                user_type: role,
                user_id: userId,
              });
            }
          }}
          onShare={(item) => {
            if (userId) {
              trackContentEvent({
                content_id: item.id || item._id,
                industry_type_id: selectedIndustryId,
                event_type: 'SHARE',
                user_type: role,
                user_id: userId,
              });
            }
          }}
          emptyMessage={`No ${activeFilter.toLowerCase()} media found in ${selectedIndustry?.name || 'this industry'}.`}
        />
      )}

      {/* ── 5. Optional "More From This Industry" Carousel ─────────────────── */}
      {products.length > 0 && (
        <MoreFromIndustryCarousel
          products={products}
          industryName={selectedIndustry?.name || 'Industry'}
          role={role}
        />
      )}

      {/* ── 6. Full-Screen Cinematic Lightbox & Video Player ───────────────── */}
      <MediaLightbox
        isOpen={isLightboxOpen}
        items={
          heroItem && !filteredAndSortedGallery.some((c) => (c.id || c._id) === (heroItem.id || heroItem._id))
            ? [heroItem, ...filteredAndSortedGallery]
            : filteredAndSortedGallery
        }
        currentIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
        role={role}
      />
    </div>
  );
}
