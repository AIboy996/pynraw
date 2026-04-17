'use client';

export default function MediaViewerModal({ item, apiBase, rawExtensions, onClose }) {
  if (!item) return null;

  const previewPath = item.photoPath || (item.mediaType !== 'video' ? item.path : '');
  const previewUrl = previewPath ? `${apiBase}/api/preview?path=${encodeURIComponent(previewPath)}` : '';
  const videoPath = item.videoPath || (item.mediaType === 'video' ? item.path : '');
  const videoUrl = videoPath ? `${apiBase}/api/media?path=${encodeURIComponent(videoPath)}` : '';
  const originalPath = item.photoPath || item.path;
  const originalDownloadUrl = `${apiBase}/api/download?path=${encodeURIComponent(originalPath)}`;
  const videoDownloadUrl = item.videoPath ? `${apiBase}/api/download?path=${encodeURIComponent(item.videoPath)}` : '';
  const isRaw = rawExtensions.has((item.extension || '').toLowerCase());
  const hasVideo = Boolean(videoUrl);
  const isLivePhoto = item.mediaType === 'live_photo';

  return (
    <div className="modal-backdrop media-backdrop" onClick={onClose}>
      <section className="modal-card media-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{item.filename}</h2>
        <div className="media-modal-stage">
          {hasVideo ? (
            <video src={videoUrl} controls autoPlay loop playsInline />
          ) : (
            previewUrl && <img src={previewUrl} alt={item.filename} />
          )}
        </div>
        <div className="media-modal-actions">
          {!isLivePhoto && <a className="ghost modal-link-btn" href={originalDownloadUrl}>下载原文件</a>}
          {isLivePhoto && (
            <>
              <a className="ghost modal-link-btn" href={originalDownloadUrl}>下载图片</a>
              {videoDownloadUrl && <a className="ghost modal-link-btn" href={videoDownloadUrl}>下载视频</a>}
            </>
          )}
          {isRaw && <span className="modal-hint">RAW 原图下载</span>}
          {!isRaw && !isLivePhoto && <span className="modal-hint">原图下载</span>}
          {isLivePhoto && <span className="modal-hint">Live Photo 可下载图片与视频</span>}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
  );
}
