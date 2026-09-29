const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_DIMENSION = 1600;

export const supportedPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class PhotoProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoProcessingError";
  }
}

function loadPhoto(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(source);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new PhotoProcessingError("No pudimos leer esta foto."));
    };
    image.src = source;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new PhotoProcessingError("No pudimos preparar esta foto."));
    }, "image/jpeg", quality);
  });
}

function jpegName(name: string) {
  const stem = name.replace(/\.[^.]+$/, "").trim() || "comida";
  return `${stem}.jpg`;
}

export function validateSourcePhoto(file: File) {
  if (!supportedPhotoTypes.has(file.type)) {
    throw new PhotoProcessingError("Elegí una foto JPG, PNG, WebP, HEIC o HEIF.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoProcessingError("La foto supera los 20 MB. Elegí una imagen más liviana.");
  }
}

/** Reduces mobile photos before they reach Vercel. The returned File only lives in memory. */
export async function preparePhotoForUpload(file: File): Promise<File> {
  validateSourcePhoto(file);

  let image: HTMLImageElement;
  try {
    image = await loadPhoto(file);
  } catch (error) {
    // Current Safari can upload small HEIC/HEIF files even when a browser cannot draw them.
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw error;
  }

  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const initialScale = Math.min(1, MAX_DIMENSION / Math.max(longestSide, 1));
  const attempts = [
    { scale: initialScale, quality: 0.82 },
    { scale: Math.min(initialScale, 1280 / Math.max(longestSide, 1)), quality: 0.74 },
    { scale: Math.min(initialScale, 1024 / Math.max(longestSide, 1)), quality: 0.66 },
  ];

  let lastBlob: Blob | null = null;
  for (const attempt of attempts) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * attempt.scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * attempt.scale));
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoProcessingError("Este navegador no pudo preparar la foto.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    lastBlob = await canvasBlob(canvas, attempt.quality);
    if (lastBlob.size <= MAX_UPLOAD_BYTES) {
      return new File([lastBlob], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() });
    }
  }

  throw new PhotoProcessingError(
    lastBlob
      ? "La foto sigue siendo demasiado pesada después de reducirla. Elegí otra imagen."
      : "No pudimos preparar esta foto.",
  );
}

export function formatPhotoSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
