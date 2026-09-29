// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPhotoSize, MAX_UPLOAD_BYTES, PhotoProcessingError, preparePhotoForUpload, validateSourcePhoto } from "./photo-processing";

class TestImage {
  decoding = "auto";
  naturalWidth = 4000;
  naturalHeight = 3000;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  vi.stubGlobal("Image", TestImage);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:source-photo");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
    callback(new Blob([new Uint8Array(1200)], { type: type ?? "image/jpeg" }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("photo processing", () => {
  it("rejects unsupported or unreasonably large source files", () => {
    expect(() => validateSourcePhoto(new File(["pdf"], "menu.pdf", { type: "application/pdf" }))).toThrow(PhotoProcessingError);
    const large = new File(["image"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(large, "size", { value: 20 * 1024 * 1024 + 1 });
    expect(() => validateSourcePhoto(large)).toThrow("supera los 20 MB");
  });

  it("scales a mobile photo to 1600px and returns an in-memory JPEG below the upload limit", async () => {
    const result = await preparePhotoForUpload(new File(["camera bytes"], "comida.heic", { type: "image/heic" }));
    const canvas = vi.mocked(HTMLCanvasElement.prototype.getContext).mock.instances[0] as HTMLCanvasElement;

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe("comida.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:source-photo");
  });

  it("formats the prepared size for the UI", () => {
    expect(formatPhotoSize(800)).toBe("1 KB");
    expect(formatPhotoSize(1536)).toBe("2 KB");
    expect(formatPhotoSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
