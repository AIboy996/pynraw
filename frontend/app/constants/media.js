export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001';

export const MAX_GRID_ITEMS = 120;
export const MAX_MAP_MARKERS = 1200;
export const MAX_TRACK_POINTS = 600;

export const RAW_EXTENSIONS = new Set([
  '.nef',
  '.cr2',
  '.cr3',
  '.arw',
  '.dng',
  '.orf',
  '.rw2',
  '.raf',
  '.raw',
  '.nrw',
  '.pef',
  '.sr2',
  '.srf',
  '.3fr',
  '.erf',
  '.kdc',
  '.mrw',
  '.x3f',
]);
