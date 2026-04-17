'use client';

import PhotoCard from './PhotoCard';

export default function PhotoGrid({ photos, apiBase, limit = null, onOpen }) {
  if (!photos.length) {
    return <p className="empty">没有符合条件的照片。</p>;
  }

  const visiblePhotos = typeof limit === 'number' ? photos.slice(0, limit) : photos;

  return (
    <>
      {typeof limit === 'number' && photos.length > limit && (
        <p className="grid-note">网格已展示 {visiblePhotos.length} / 共 {photos.length}</p>
      )}
      <div className="photo-grid">
        {visiblePhotos.map((photo) => (
          <PhotoCard key={photo.path} photo={photo} apiBase={apiBase} onOpen={onOpen} />
        ))}
      </div>
    </>
  );
}
