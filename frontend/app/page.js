'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import FilterOptionGroup from './components/gallery/FilterOptionGroup';
import GroupedGallery from './components/gallery/GroupedGallery';
import MediaViewerModal from './components/gallery/MediaViewerModal';
import PhotoGrid from './components/gallery/PhotoGrid';
import { API_BASE, MAX_GRID_ITEMS, MAX_MAP_MARKERS, MAX_TRACK_POINTS, RAW_EXTENSIONS } from './constants/media';

const PhotoMap = dynamic(() => import('./components/PhotoMap'), {
  ssr: false,
  loading: () => <p className="empty">地图加载中...</p>,
});

const FootprintMap = dynamic(() => import('./components/FootprintMap'), {
  ssr: false,
  loading: () => <p className="empty">足迹加载中...</p>,
});

export default function Home() {
  const [rootInput, setRootInput] = useState('');
  const [activeRoot, setActiveRoot] = useState('');
  const [started, setStarted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectingRoot, setSelectingRoot] = useState(false);
  const [activeView, setActiveView] = useState('gallery');

  const [photos, setPhotos] = useState([]);
  const [points, setPoints] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [dates, setDates] = useState([]);
  const [lenses, setLenses] = useState([]);

  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLens, setSelectedLens] = useState('');

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftCamera, setDraftCamera] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftLens, setDraftLens] = useState('');

  const [viewMode, setViewMode] = useState('grid');
  const [viewerItem, setViewerItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const lastRoot = localStorage.getItem('album-root');
    if (lastRoot) {
      setRootInput(lastRoot);
      setActiveRoot(lastRoot);
      setStarted(true);
      loadData(lastRoot).finally(() => setBooting(false));
      return;
    }
    setBooting(false);
  }, []);

  async function loadData(rootValue, camera = '', date = '', lens = '') {
    setError('');
    setLoading(true);

    const params = new URLSearchParams({ root: rootValue });
    if (camera) params.set('camera', camera);
    if (date) params.set('date', date);
    if (lens) params.set('lens', lens);

    try {
      const [photosRes, facetsRes, mapRes] = await Promise.all([
        fetch(`${API_BASE}/api/photos?${params.toString()}`),
        fetch(`${API_BASE}/api/facets?root=${encodeURIComponent(rootValue)}`),
        fetch(`${API_BASE}/api/map-points?root=${encodeURIComponent(rootValue)}`),
      ]);

      const photosData = await photosRes.json();
      const facetsData = await facetsRes.json();
      const mapData = await mapRes.json();

      if (!photosRes.ok) throw new Error(photosData.error || '读取照片失败');
      if (!facetsRes.ok) throw new Error(facetsData.error || '读取筛选信息失败');
      if (!mapRes.ok) throw new Error(mapData.error || '读取地图数据失败');

      setPhotos(photosData.photos || []);
      setPoints(mapData.points || []);
      setCameras(facetsData.cameras || []);
      setDates(facetsData.dates || []);
      setLenses(facetsData.lenses || []);
    } catch (err) {
      setError(err.message || '请求失败');
      setPhotos([]);
      setPoints([]);
      setCameras([]);
      setDates([]);
      setLenses([]);
    } finally {
      setLoading(false);
    }
  }

  async function startScan() {
    const normalized = rootInput.trim();
    if (!normalized) {
      setError('请先输入图片目录路径。');
      return;
    }

    setActiveRoot(normalized);
    setSelectedCamera('');
    setSelectedDate('');
    setSelectedLens('');
    setViewMode('grid');
    setActiveView('gallery');
    setStarted(true);
    setSelectingRoot(false);
    localStorage.setItem('album-root', normalized);
    await loadData(normalized);
  }

  function openFilterModal() {
    setDraftCamera(selectedCamera);
    setDraftDate(selectedDate);
    setDraftLens(selectedLens);
    setFilterModalOpen(true);
  }

  async function applyFilterModal() {
    if (!activeRoot) return;
    setSelectedCamera(draftCamera);
    setSelectedDate(draftDate);
    setSelectedLens(draftLens);
    setFilterModalOpen(false);
    await loadData(activeRoot, draftCamera, draftDate, draftLens);
  }

  async function clearAllFilters() {
    if (!activeRoot) return;
    setSelectedCamera('');
    setSelectedDate('');
    setSelectedLens('');
    setDraftCamera('');
    setDraftDate('');
    setDraftLens('');
    setFilterModalOpen(false);
    await loadData(activeRoot, '', '', '');
  }

  async function removeFilter(filterKey) {
    if (!activeRoot) return;
    const nextCamera = filterKey === 'camera' ? '' : selectedCamera;
    const nextDate = filterKey === 'date' ? '' : selectedDate;
    const nextLens = filterKey === 'lens' ? '' : selectedLens;
    setSelectedCamera(nextCamera);
    setSelectedDate(nextDate);
    setSelectedLens(nextLens);
    setDraftCamera(nextCamera);
    setDraftDate(nextDate);
    setDraftLens(nextLens);
    await loadData(activeRoot, nextCamera, nextDate, nextLens);
  }

  const activeFilterTags = [
    selectedDate ? { key: 'date', label: `日期: ${selectedDate}` } : null,
    selectedCamera ? { key: 'camera', label: `相机: ${selectedCamera}` } : null,
    selectedLens ? { key: 'lens', label: `镜头: ${selectedLens}` } : null,
  ].filter(Boolean);

  if (booting) {
    return (
      <main className="setup-page">
        <section className="setup-card">
          <h1>足迹 Album</h1>
          <p>正在恢复上次目录...</p>
        </section>
        <footer className="site-footer">© 2026 足迹 Album. All rights reserved.</footer>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="setup-page">
        <section className="setup-card">
          <h1>足迹 Album</h1>
          <p>先指定要扫描的目录，完成后进入相册页面。</p>
          <label htmlFor="root-input">图片目录</label>
          <input
            id="root-input"
            value={rootInput}
            onChange={(e) => setRootInput(e.target.value)}
            placeholder="例如：/Users/yang/Pictures"
          />
          <button onClick={startScan} disabled={loading}>{loading ? '扫描中...' : '进入相册'}</button>
          {error && <p className="error">{error}</p>}
        </section>
        <footer className="site-footer">© 2026 足迹 Album. All rights reserved.</footer>
      </main>
    );
  }

  return (
    <main className="shell-page">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-head">
          <h2 className="brand-text">足迹 Album</h2>
          <button
            className="icon-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
            title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
            )}
          </button>
        </div>

        <button className={`nav-btn ${activeView === 'gallery' ? 'active' : ''}`} onClick={() => setActiveView('gallery')} title="相册">
          <span className="nav-icon" aria-hidden="true">📷</span>
          <span className="nav-label">相册</span>
        </button>
        <button className={`nav-btn ${activeView === 'map' ? 'active' : ''}`} onClick={() => setActiveView('map')} title="地图">
          <span className="nav-icon" aria-hidden="true">🧭</span>
          <span className="nav-label">地图</span>
        </button>
        <button className={`nav-btn ${activeView === 'footprint' ? 'active' : ''}`} onClick={() => setActiveView('footprint')} title="足迹">
          <span className="nav-icon" aria-hidden="true">🚶</span>
          <span className="nav-label">足迹</span>
        </button>
        <button className="nav-btn" onClick={() => setSelectingRoot(true)} title="重新选择目录">
          <span className="nav-icon" aria-hidden="true">⚙️</span>
          <span className="nav-label">重新选择目录</span>
        </button>

        {sidebarOpen && <p className="sidebar-path" title={activeRoot}>当前目录: {activeRoot}</p>}
      </aside>

      <section className="content">
        <header className="content-head">
          <h1>{activeView === 'gallery' ? '相册' : activeView === 'map' ? '地图' : '足迹'}</h1>
          {activeView === 'gallery' && <button className="ghost filter-trigger" onClick={openFilterModal} disabled={loading}>筛选</button>}
        </header>

        {error && <p className="error">{error}</p>}

        {activeView === 'gallery' && (
          <>
            {!!activeFilterTags.length && (
              <section className="active-filters">
                {activeFilterTags.map((tag) => (
                  <span key={tag.key} className="filter-tag">
                    {tag.label}
                    <button type="button" onClick={() => removeFilter(tag.key)} aria-label={`移除${tag.label}`}>×</button>
                  </span>
                ))}
              </section>
            )}

            <section className="view-switch">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>全部</button>
              <button className={viewMode === 'date' ? 'active' : ''} onClick={() => setViewMode('date')}>按日期</button>
              <button className={viewMode === 'camera' ? 'active' : ''} onClick={() => setViewMode('camera')}>按相机</button>
              <button className={viewMode === 'lens' ? 'active' : ''} onClick={() => setViewMode('lens')}>按镜头</button>
              <span className="summary">共 {photos.length} 张</span>
            </section>

            {viewMode === 'grid' && <PhotoGrid photos={photos} apiBase={API_BASE} limit={MAX_GRID_ITEMS} onOpen={setViewerItem} />}
            {viewMode === 'date' && <GroupedGallery photos={photos} groupKey="capturedDate" titlePrefix="日期：" apiBase={API_BASE} onOpen={setViewerItem} />}
            {viewMode === 'camera' && <GroupedGallery photos={photos} groupKey="cameraModel" titlePrefix="相机：" apiBase={API_BASE} onOpen={setViewerItem} />}
            {viewMode === 'lens' && <GroupedGallery photos={photos} groupKey="lensModel" titlePrefix="镜头：" apiBase={API_BASE} onOpen={setViewerItem} />}
          </>
        )}

        {activeView === 'map' && <PhotoMap points={points} apiBase={API_BASE} maxMarkers={MAX_MAP_MARKERS} />}
        {activeView === 'footprint' && <FootprintMap points={points} apiBase={API_BASE} maxTrackPoints={MAX_TRACK_POINTS} />}
      </section>

      {filterModalOpen && (
        <div className="modal-backdrop" onClick={() => !loading && setFilterModalOpen(false)}>
          <section className="modal-card filter-modal" onClick={(e) => e.stopPropagation()}>
            <h2>筛选</h2>
            <p>选择你要筛选的条件。</p>
            <FilterOptionGroup label="日期" options={dates} value={draftDate} onChange={setDraftDate} />
            <FilterOptionGroup label="相机" options={cameras} value={draftCamera} onChange={setDraftCamera} />
            <FilterOptionGroup label="镜头" options={lenses} value={draftLens} onChange={setDraftLens} />
            <div className="modal-actions">
              <button className="ghost" onClick={clearAllFilters} disabled={loading}>清空筛选</button>
              <button className="ghost" onClick={() => setFilterModalOpen(false)} disabled={loading}>取消</button>
              <button onClick={applyFilterModal} disabled={loading}>{loading ? '处理中...' : '应用'}</button>
            </div>
          </section>
        </div>
      )}

      {selectingRoot && (
        <div className="modal-backdrop" onClick={() => !loading && setSelectingRoot(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>重新选择目录</h2>
            <p>输入新的图片目录路径并重新扫描。</p>
            <label htmlFor="modal-root-input">目录路径</label>
            <input
              id="modal-root-input"
              value={rootInput}
              onChange={(e) => setRootInput(e.target.value)}
              placeholder="例如：/Users/yang/Pictures"
            />
            <div className="modal-actions">
              <button className="ghost" onClick={() => setSelectingRoot(false)} disabled={loading}>取消</button>
              <button onClick={startScan} disabled={loading}>{loading ? '扫描中...' : '确认并扫描'}</button>
            </div>
          </section>
        </div>
      )}

      <MediaViewerModal item={viewerItem} apiBase={API_BASE} rawExtensions={RAW_EXTENSIONS} onClose={() => setViewerItem(null)} />
      <footer className="site-footer">© 2026 足迹 Album. All rights reserved.</footer>
    </main>
  );
}
