'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PhotoGrid from './PhotoGrid';

function groupBy(items, keyName) {
  return items.reduce((acc, item) => {
    const key = item[keyName] || 'Unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

export default function GroupedGallery({ photos, groupKey, titlePrefix, apiBase, onOpen }) {
  const grouped = useMemo(() => groupBy(photos, groupKey), [photos, groupKey]);
  const keys = Object.keys(grouped).sort();
  const groupRefs = useRef([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!keys.length) {
    return <p className="empty">没有符合条件的照片。</p>;
  }

  useEffect(() => {
    setCurrentIndex(0);
    groupRefs.current = groupRefs.current.slice(0, keys.length);
  }, [keys.length]);

  useEffect(() => {
    function syncCurrentIndexByScroll() {
      if (!groupRefs.current.length) return;
      let nextIndex = 0;
      const anchorY = 150;
      for (let i = 0; i < groupRefs.current.length; i += 1) {
        const el = groupRefs.current[i];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= anchorY) {
          nextIndex = i;
        } else {
          break;
        }
      }
      setCurrentIndex(nextIndex);
    }

    syncCurrentIndexByScroll();
    window.addEventListener('scroll', syncCurrentIndexByScroll, { passive: true });
    return () => window.removeEventListener('scroll', syncCurrentIndexByScroll);
  }, [keys.length]);

  function jumpToGroup(index) {
    const target = groupRefs.current[index];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrentIndex(index);
  }

  return (
    <section className="group-list">
      <div className="group-rail" aria-label="分类快速定位滑轨">
        <div className="group-rail-track">
          <span>速查🔍</span>
        </div>
        <div className="group-rail-panel">
          <div className="group-rail-title">分类轴</div>
          <div className="group-rail-list">
            {keys.map((key, idx) => (
              <button
                key={`axis-${key}`}
                type="button"
                className={`group-rail-item ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => jumpToGroup(idx)}
                title={key}
              >
                <span className="group-rail-dot" />
                <span className="group-rail-text">{key}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {keys.map((key, idx) => (
        <div
          key={key}
          className="group-block"
          ref={(el) => {
            groupRefs.current[idx] = el;
          }}
        >
          <h3>{titlePrefix}{key}</h3>
          <PhotoGrid photos={grouped[key]} apiBase={apiBase} onOpen={onOpen} />
        </div>
      ))}
    </section>
  );
}
