from __future__ import annotations

from pathlib import Path
from time import time

from photo_processing import VIDEO_EXTENSIONS, build_photo_meta, iter_supported_images

PHOTO_CACHE_TTL_SECONDS = 20
_PHOTO_CACHE: dict[str, tuple[float, list[dict]]] = {}


def normalize_root(root_value: str | None) -> Path:
    if not root_value:
        raise ValueError('Missing query parameter: root')
    root = Path(root_value).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError(f'Invalid root directory: {root}')
    return root


def _meta_to_dict(meta) -> dict:
    return {
        'path': meta.path,
        'filename': meta.filename,
        'stem': meta.stem,
        'extension': meta.extension,
        'mediaType': meta.media_type,
        'capturedAt': meta.captured_at,
        'capturedDate': meta.captured_date,
        'cameraModel': meta.camera_model,
        'lensModel': meta.lens_model,
        'latitude': meta.latitude,
        'longitude': meta.longitude,
    }


def _pick_best_video_candidate(visual: dict, candidates: list[dict], used_video_paths: set[str]) -> dict | None:
    available = [v for v in candidates if v['path'] not in used_video_paths]
    if not available:
        return None

    visual_parent = str(Path(visual['path']).parent)
    same_dir = [v for v in available if str(Path(v['path']).parent) == visual_parent]
    return same_dir[0] if same_dir else available[0]


def _collect_media(root: Path) -> list[dict]:
    cache_key = str(root)
    cached = _PHOTO_CACHE.get(cache_key)
    now = time()
    if cached and now - cached[0] <= PHOTO_CACHE_TTL_SECONDS:
        return cached[1]

    raw_items: list[dict] = []
    for image_path in iter_supported_images(root):
        meta = build_photo_meta(image_path)
        raw_items.append(_meta_to_dict(meta))

    videos_by_stem: dict[str, list[dict]] = {}
    visuals: list[dict] = []
    for item in raw_items:
        stem_key = (item.get('stem') or '').lower()
        if item['extension'] in VIDEO_EXTENSIONS:
            videos_by_stem.setdefault(stem_key, []).append(item)
        else:
            visuals.append(item)

    for video_list in videos_by_stem.values():
        video_list.sort(key=lambda x: (x['capturedAt'] or '', x['filename']))

    items: list[dict] = []
    used_video_paths: set[str] = set()
    for visual in visuals:
        stem_key = (visual.get('stem') or '').lower()
        candidates = videos_by_stem.get(stem_key, [])
        matched = _pick_best_video_candidate(visual, candidates, used_video_paths)

        if matched:
            used_video_paths.add(matched['path'])
            item = dict(visual)
            item['mediaType'] = 'live_photo'
            item['photoPath'] = visual['path']
            item['videoPath'] = matched['path']
            item['videoExtension'] = matched['extension']
            items.append(item)
        else:
            items.append(visual)

    for video_list in videos_by_stem.values():
        for video in video_list:
            if video['path'] in used_video_paths:
                continue
            items.append(video)

    items.sort(key=lambda x: (x['capturedAt'] or '', x['filename']))
    _PHOTO_CACHE[cache_key] = (now, items)
    return items


def list_media(root: Path, camera: str | None = None, date: str | None = None, lens: str | None = None) -> list[dict]:
    items = _collect_media(root)

    if camera:
        items = [p for p in items if p['cameraModel'] == camera]
    if date:
        items = [p for p in items if p['capturedDate'] == date]
    if lens:
        items = [p for p in items if p['lensModel'] == lens]

    return items


def media_facets(root: Path) -> dict:
    items = _collect_media(root)
    return {
        'cameras': sorted({p['cameraModel'] for p in items if p['cameraModel']}),
        'dates': sorted({p['capturedDate'] for p in items if p['capturedDate']}),
        'lenses': sorted({p['lensModel'] for p in items if p['lensModel']}),
    }


def map_points(root: Path) -> list[dict]:
    points: list[dict] = []
    for item in _collect_media(root):
        if item['mediaType'] == 'video':
            continue
        if item['latitude'] is None or item['longitude'] is None:
            continue

        preview_path = item.get('photoPath') or item.get('path')
        points.append(
            {
                'filename': item['filename'],
                'path': preview_path,
                'videoPath': item.get('videoPath'),
                'mediaType': item['mediaType'],
                'latitude': item['latitude'],
                'longitude': item['longitude'],
                'capturedAt': item['capturedAt'],
                'capturedDate': item['capturedDate'],
                'cameraModel': item['cameraModel'],
                'lensModel': item['lensModel'],
            }
        )

    return points
