const MAX_IMAGE_DIMENSION = 1280;
const DEFAULT_MAX_DATA_URL_BYTES = 60 * 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh'));
    image.src = url;
  });
}

/**
 * Nén ảnh phía trình duyệt để payload đăng ký không vượt giới hạn body của API.
 * Backend hiện nhận chuỗi URL, chưa có endpoint upload multipart riêng.
 */
export async function optimizeImageFile(
  file: File,
  maxDataUrlBytes = DEFAULT_MAX_DATA_URL_BYTES,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý hình ảnh');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);

    for (let attempt = 0; attempt < 8 && dataUrl.length > maxDataUrlBytes; attempt += 1) {
      quality *= 0.82;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
