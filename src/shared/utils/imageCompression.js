import imageCompression from 'browser-image-compression';

const defaultOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
};

export async function compressImage(file, options = {}) {
  if (file.size < 500 * 1024) return file;

  try {
    return await imageCompression(file, {
      ...defaultOptions,
      ...options,
    });
  } catch {
    return file;
  }
}

export async function compressImages(files, options = {}) {
  return Promise.all(
    Array.from(files).map((file) => compressImage(file, options))
  );
}
