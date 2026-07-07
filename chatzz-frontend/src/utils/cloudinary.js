import { API_URL } from '../services/api';

/**
 * Upload a file directly to Cloudinary from the client,
 * bypassing the Render proxy entirely.
 *
 * @param {string} uri - local file URI from Expo
 * @param {string} folder - Cloudinary folder ('chatzz/statuses', 'chatzz/messages', 'chatzz/profiles')
 * @param {string} token - JWT auth token
 * @param {function} onProgress - optional progress callback (0-100)
 * @returns {Promise<string>} Cloudinary URL of the uploaded file
 */
export const uploadToCloudinary = async (uri, folder, token, onProgress) => {
  // 1. Get signed upload params from backend (small JSON request — won't timeout)
  const signRes = await fetch(`${API_URL}/upload/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ folder }),
  });

  if (!signRes.ok) {
    const err = await signRes.json();
    throw new Error(err.message || 'Failed to get upload signature');
  }

  const { signature, timestamp, cloudName, apiKey } = await signRes.json();

  // 2. Upload file directly to Cloudinary (no Render proxy)
  const formData = new FormData();
  const filename = uri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  let mimeType = 'image/jpeg';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
    mimeType = 'video/mp4';
  } else if (ext === 'png') {
    mimeType = 'image/png';
  } else if (ext === 'aac' || ext === 'm4a' || ext === 'wav' || ext === 'ogg') {
    mimeType = 'audio/aac';
  }
  formData.append('file', { uri, name: filename, type: mimeType });
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error('Cloudinary upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};
