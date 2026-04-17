# NRAW Album (Flask + Next.js)

一个本地相册网站：扫描给定目录中的图片（含 RAW），提取 EXIF 元数据，并在前端按多种方式展示。

## 功能

- 多格式扫描：JPEG/PNG/TIFF/WebP/GIF + RAW（NEF/CR2/ARW/DNG 等）
- 面向对象处理：每种格式处理器继承同一接口 `ImageProcessor`
- 元数据抽取：拍摄日期、相机型号、GPS 经纬度
- 多视图展示：网格、按日期分组、按相机分组
- 地图页：展示照片地理分布点位（基于 GPS）

## 后端结构

- `backend/photo_processing.py`
  - `ImageProcessor`：统一接口
  - `JpegProcessor` / `PngProcessor` / `TiffProcessor` / `WebpProcessor` / `GifProcessor`
  - `RawProcessor`：使用 `rawpy` 读取 RAW 缩略图或解码预览
- `backend/app.py`
  - `GET /api/photos?root=...&camera=...&date=...`
  - `GET /api/facets?root=...`
  - `GET /api/map-points?root=...`
  - `GET /api/preview?path=...`

## 启动

### 1) 启动后端

```bash
uv sync
uv run python backend/app.py
```

默认：`http://127.0.0.1:5001`

### 2) 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认：`http://127.0.0.1:3000`

如果后端不是 `127.0.0.1:5001`，请修改 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_BASE`。

## 使用

1. 打开前端页面，输入你要扫描的图片目录绝对路径。
2. 点击“扫描目录”。
3. 在相册页中切换“网格 / 按日期 / 按相机”。
4. 在地图页查看带 GPS 的照片分布。

## 说明

- RAW 预览优先读取内嵌缩略图，失败时回退到 `rawpy` 解码。
- 元数据来自 EXIF；如果原图没有拍摄时间或 GPS，对应字段会为空。
