from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Iterable

import exifread
import imageio.v2 as iio
import rawpy
from PIL import Image, ImageDraw
from pillow_heif import register_heif_opener

register_heif_opener()


RAW_EXTENSIONS = {
    '.3fr',
    '.arw',
    '.cr2',
    '.cr3',
    '.dng',
    '.erf',
    '.kdc',
    '.mrw',
    '.nef',
    '.nrw',
    '.orf',
    '.pef',
    '.raf',
    '.raw',
    '.rw2',
    '.sr2',
    '.srf',
    '.x3f',
}

VIDEO_EXTENSIONS = {
    '.3gp',
    '.avi',
    '.m4v',
    '.mkv',
    '.mov',
    '.mp4',
    '.mts',
    '.webm',
}


@dataclass
class PhotoMeta:
    path: str
    filename: str
    stem: str
    extension: str
    media_type: str
    captured_at: str | None
    captured_date: str | None
    camera_model: str | None
    lens_model: str | None
    latitude: float | None
    longitude: float | None


class ImageProcessor(ABC):
    """Common interface for all image format processors."""

    @classmethod
    @abstractmethod
    def supports(cls, path: Path) -> bool:
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def load_preview(cls, path: Path, max_size: int = 1600) -> bytes:
        raise NotImplementedError


class RasterProcessor(ImageProcessor, ABC):
    EXTENSIONS: set[str] = set()

    @classmethod
    def supports(cls, path: Path) -> bool:
        return path.suffix.lower() in cls.EXTENSIONS

    @classmethod
    def load_preview(cls, path: Path, max_size: int = 1600) -> bytes:
        with Image.open(path) as img:
            img = img.convert('RGB')
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            output = BytesIO()
            img.save(output, format='JPEG', quality=90)
            return output.getvalue()


class JpegProcessor(RasterProcessor):
    EXTENSIONS = {'.jpg', '.jpeg'}


class PngProcessor(RasterProcessor):
    EXTENSIONS = {'.png'}


class TiffProcessor(RasterProcessor):
    EXTENSIONS = {'.tif', '.tiff'}


class WebpProcessor(RasterProcessor):
    EXTENSIONS = {'.webp'}


class GifProcessor(RasterProcessor):
    EXTENSIONS = {'.gif'}


class HeicProcessor(RasterProcessor):
    EXTENSIONS = {'.heic', '.heif'}


class VideoProcessor(ImageProcessor):
    EXTENSIONS = VIDEO_EXTENSIONS

    @classmethod
    def supports(cls, path: Path) -> bool:
        return path.suffix.lower() in cls.EXTENSIONS

    @classmethod
    def load_preview(cls, path: Path, max_size: int = 1600) -> bytes:
        image = None
        try:
            reader = iio.get_reader(str(path), format='ffmpeg')
            try:
                frame = reader.get_data(0)
                image = Image.fromarray(frame)
            finally:
                reader.close()
        except Exception:
            image = Image.new('RGB', (960, 540), color=(130, 130, 130))
            draw = ImageDraw.Draw(image)
            # Draw a simple play symbol as fallback thumbnail.
            draw.polygon([(420, 220), (420, 320), (520, 270)], fill=(245, 245, 245))

        image = image.convert('RGB')
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format='JPEG', quality=90)
        return output.getvalue()


class RawProcessor(ImageProcessor):
    @classmethod
    def supports(cls, path: Path) -> bool:
        return path.suffix.lower() in RAW_EXTENSIONS

    @classmethod
    def load_preview(cls, path: Path, max_size: int = 1600) -> bytes:
        with rawpy.imread(str(path)) as raw:
            try:
                thumb = raw.extract_thumb()
                if thumb.format == rawpy.ThumbFormat.JPEG:
                    with Image.open(BytesIO(thumb.data)) as img:
                        img = img.convert('RGB')
                        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                        output = BytesIO()
                        img.save(output, format='JPEG', quality=90)
                        return output.getvalue()
                image = Image.fromarray(thumb.data)
            except Exception:
                rgb = raw.postprocess(use_camera_wb=True, no_auto_bright=True, output_bps=8)
                image = Image.fromarray(rgb)

        image = image.convert('RGB')
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format='JPEG', quality=90)
        return output.getvalue()


PROCESSORS: tuple[type[ImageProcessor], ...] = (
    RawProcessor,
    HeicProcessor,
    VideoProcessor,
    JpegProcessor,
    PngProcessor,
    TiffProcessor,
    WebpProcessor,
    GifProcessor,
)


def get_processor(path: Path) -> type[ImageProcessor] | None:
    for processor in PROCESSORS:
        if processor.supports(path):
            return processor
    return None


def iter_supported_images(root: Path) -> Iterable[Path]:
    for file_path in root.rglob('*'):
        if file_path.is_file() and get_processor(file_path):
            yield file_path


def parse_datetime(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None

    value = value.strip()
    candidates = [
        '%Y:%m:%d %H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%Y:%m:%d %H:%M:%S%z',
        '%Y-%m-%d %H:%M:%S%z',
    ]

    for fmt in candidates:
        try:
            dt = datetime.strptime(value, fmt)
            return dt.isoformat(), dt.date().isoformat()
        except ValueError:
            continue

    return None, None


def _ratio_to_float(ratio) -> float:
    if hasattr(ratio, 'num') and hasattr(ratio, 'den'):
        den = ratio.den or 1
        return float(ratio.num) / float(den)
    return float(ratio)


def _dms_to_decimal(values, ref: str | None) -> float | None:
    try:
        if len(values) < 3:
            return None
        deg = _ratio_to_float(values[0])
        minutes = _ratio_to_float(values[1])
        sec = _ratio_to_float(values[2])
        decimal = deg + minutes / 60.0 + sec / 3600.0
        if ref and ref.upper() in {'S', 'W'}:
            decimal = -decimal
        return decimal
    except Exception:
        return None


def extract_exif(path: Path) -> tuple[str | None, str | None, str | None, str | None, float | None, float | None]:
    captured_raw = None
    camera_model = None
    lens_model = None
    latitude = None
    longitude = None

    try:
        with path.open('rb') as f:
            tags = exifread.process_file(f, details=False)

        captured_raw = str(
            tags.get('EXIF DateTimeOriginal')
            or tags.get('EXIF DateTimeDigitized')
            or tags.get('Image DateTime')
            or ''
        ) or None

        camera_model = str(tags.get('Image Model') or '') or None
        lens_model = str(tags.get('EXIF LensModel') or tags.get('Image LensModel') or '') or None

        lat_values = getattr(tags.get('GPS GPSLatitude'), 'values', None)
        lat_ref = str(tags.get('GPS GPSLatitudeRef') or '') or None
        lon_values = getattr(tags.get('GPS GPSLongitude'), 'values', None)
        lon_ref = str(tags.get('GPS GPSLongitudeRef') or '') or None

        if lat_values and lon_values:
            latitude = _dms_to_decimal(lat_values, lat_ref)
            longitude = _dms_to_decimal(lon_values, lon_ref)
    except Exception:
        pass

    captured_at, captured_date = parse_datetime(captured_raw)
    return captured_at, captured_date, camera_model, lens_model, latitude, longitude


def build_photo_meta(path: Path) -> PhotoMeta:
    captured_at, captured_date, camera_model, lens_model, latitude, longitude = extract_exif(path)
    return PhotoMeta(
        path=str(path),
        filename=path.name,
        stem=path.stem,
        extension=path.suffix.lower(),
        media_type='video' if path.suffix.lower() in VIDEO_EXTENSIONS else ('raw' if path.suffix.lower() in RAW_EXTENSIONS else 'raster'),
        captured_at=captured_at,
        captured_date=captured_date,
        camera_model=camera_model,
        lens_model=lens_model,
        latitude=latitude,
        longitude=longitude,
    )
