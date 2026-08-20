const MAX_IMAGE_DIMENSION = 640;
const DEFAULT_MAX_DATA_URL_BYTES = 25 * 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh'));
    image.src = url;
  });
}

/**
 * Nén ảnh phía trình duyệt để payload đăng ký không vượt giới hạn body 100KB của Express Backend.
 */
export async function optimizeImageFile(
  file: File,
  maxDataUrlBytes = DEFAULT_MAX_DATA_URL_BYTES,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    
    let currentWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    let currentHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý hình ảnh');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, currentWidth, currentHeight);
    context.drawImage(image, 0, 0, currentWidth, currentHeight);

    let quality = 0.8;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);

    for (let attempt = 0; attempt < 8 && dataUrl.length > maxDataUrlBytes; attempt += 1) {
      if (attempt >= 2) {
        // Downscale canvas dimensions if lowering quality is not enough
        currentWidth = Math.max(100, Math.round(currentWidth * 0.75));
        currentHeight = Math.max(100, Math.round(currentHeight * 0.75));
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, currentWidth, currentHeight);
        context.drawImage(image, 0, 0, currentWidth, currentHeight);
      }
      quality = Math.max(0.3, quality * 0.8);
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
