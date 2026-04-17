'use client';

export default function PhotoCard({ photo, apiBase, onOpen }) {
  const previewPath = photo.photoPath || photo.path;
  const preview = previewPath ? `${apiBase}/api/preview?path=${encodeURIComponent(previewPath)}` : '';
  const isLivePhoto = photo.mediaType === 'live_photo';
  const isVideo = photo.mediaType === 'video';

  return (
    <article
      className="photo-card"
      onClick={() => onOpen(photo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(photo);
        }
      }}
    >
      <div className="media-stage">
        {preview && <img src={preview} alt={photo.filename} loading="lazy" className="media-photo show" />}
        {(isLivePhoto || isVideo) && <span className="media-tag">{isLivePhoto ? 'LIVE' : 'VIDEO'}</span>}
      </div>
      <div className="photo-meta">
        <div className="photo-name" title={photo.filename}>{photo.filename}</div>
        <div>{photo.cameraModel || 'Unknown camera'}</div>
        <div>{photo.lensModel || 'Unknown lens'}</div>
        <div>{photo.capturedDate || 'Unknown date'} · {photo.extension}</div>
      </div>
    </article>
  );
}
