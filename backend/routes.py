from __future__ import annotations

from io import BytesIO
import mimetypes
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file

from media_library import list_media, map_points, media_facets, normalize_root
from photo_processing import get_processor

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.get('/health')
def health_check():
    return jsonify({'status': 'ok'})


@api_bp.get('/photos')
def photos():
    root = normalize_root(request.args.get('root'))
    camera = request.args.get('camera')
    date = request.args.get('date')
    lens = request.args.get('lens')

    items = list_media(root, camera=camera, date=date, lens=lens)
    return jsonify({'root': str(root), 'count': len(items), 'photos': items})


@api_bp.get('/facets')
def facets():
    root = normalize_root(request.args.get('root'))
    data = media_facets(root)
    return jsonify({'root': str(root), **data})


@api_bp.get('/map-points')
def points():
    root = normalize_root(request.args.get('root'))
    data = map_points(root)
    return jsonify({'root': str(root), 'count': len(data), 'points': data})


@api_bp.get('/preview')
def preview():
    image_path_value = request.args.get('path')
    if not image_path_value:
        return jsonify({'error': 'Missing query parameter: path'}), 400

    image_path = Path(image_path_value).expanduser().resolve()
    if not image_path.exists() or not image_path.is_file():
        return jsonify({'error': f'File does not exist: {image_path}'}), 404

    processor = get_processor(image_path)
    if not processor:
        return jsonify({'error': f'Unsupported image format: {image_path.suffix}'}), 400

    preview_bytes = processor.load_preview(image_path)
    download = request.args.get('download') == '1'
    return send_file(
        BytesIO(preview_bytes),
        mimetype='image/jpeg',
        download_name=f'{image_path.stem}.jpg',
        as_attachment=download,
    )


@api_bp.get('/media')
def media_stream():
    media_path_value = request.args.get('path')
    if not media_path_value:
        return jsonify({'error': 'Missing query parameter: path'}), 400

    media_path = Path(media_path_value).expanduser().resolve()
    if not media_path.exists() or not media_path.is_file():
        return jsonify({'error': f'File does not exist: {media_path}'}), 404

    guessed_mime = mimetypes.guess_type(str(media_path))[0] or 'application/octet-stream'
    return send_file(media_path, mimetype=guessed_mime, conditional=True)


@api_bp.get('/download')
def download_file():
    file_path_value = request.args.get('path')
    if not file_path_value:
        return jsonify({'error': 'Missing query parameter: path'}), 400

    file_path = Path(file_path_value).expanduser().resolve()
    if not file_path.exists() or not file_path.is_file():
        return jsonify({'error': f'File does not exist: {file_path}'}), 404

    guessed_mime = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
    return send_file(
        file_path,
        mimetype=guessed_mime,
        as_attachment=True,
        download_name=file_path.name,
        conditional=True,
    )
