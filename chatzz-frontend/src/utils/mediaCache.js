import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { userAPI } from '../services/api';

const CACHE_DIR = `${FileSystem.documentDirectory}media_cache/`;

// Track which URLs have already been deleted from Cloudinary
const deletedUrls = new Set();

const ensureCacheDir = async () => {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

const getLocalPath = (url) => {
  // Create a deterministic filename from the URL
  const hash = url.split('/').pop().split('?')[0];
  return `${CACHE_DIR}${hash}`;
};

// Request server to delete file from Cloudinary after local cache is saved
const requestCloudinaryDelete = async (url) => {
  if (!url || deletedUrls.has(url)) return;
  // Only delete Cloudinary URLs, skip local files
  if (url.startsWith('/uploads/') || url.startsWith('file://')) return;

  deletedUrls.add(url);
  try {
    await userAPI.deleteCloudinary(url);
  } catch (_) {
    // Non-critical — file stays on Cloudinary, no user-facing error
  }
};

export const downloadMedia = async (url) => {
  if (!url) return null;

  await ensureCacheDir();
  const localPath = getLocalPath(url);

  // Check if already cached
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    // Already cached — request Cloudinary deletion if not done yet
    requestCloudinaryDelete(url);
    return localPath;
  }

  // Download
  try {
    const { uri } = await FileSystem.downloadAsync(url, localPath);
    // Successfully cached — tell server to free Cloudinary space
    requestCloudinaryDelete(url);
    return uri;
  } catch (err) {
    console.warn('Media cache download failed:', err.message);
    return url; // Fallback to remote URL
  }
};

export const getCachedOrRemote = async (url) => {
  if (!url) return null;

  await ensureCacheDir();
  const localPath = getLocalPath(url);

  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    requestCloudinaryDelete(url);
    return localPath;
  }

  return url; // Not cached yet, return remote
};

export const isCached = async (url) => {
  if (!url) return false;
  const localPath = getLocalPath(url);
  const info = await FileSystem.getInfoAsync(localPath);
  return info.exists;
};

export const getLocalUri = async (url) => {
  if (!url) return null;
  const localPath = getLocalPath(url);
  const info = await FileSystem.getInfoAsync(localPath);
  return info.exists ? localPath : null;
};

export const preloadAudio = async (url) => {
  if (!url) return { uri: url, isLocal: false };

  await ensureCacheDir();
  const localPath = getLocalPath(url);
  const info = await FileSystem.getInfoAsync(localPath);

  if (!info.exists) {
    try {
      await FileSystem.downloadAsync(url, localPath);
      requestCloudinaryDelete(url);
    } catch (err) {
      console.warn('Audio preload failed:', err.message);
      return { uri: url, isLocal: false };
    }
  } else {
    requestCloudinaryDelete(url);
  }

  return { uri: localPath, isLocal: true };
};

export const clearCache = async () => {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch (_) {}
};

export const getCacheSize = async () => {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) return 0;
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let total = 0;
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
      if (fileInfo.exists) total += fileInfo.size || 0;
    }
    return total;
  } catch (_) {
    return 0;
  }
};
