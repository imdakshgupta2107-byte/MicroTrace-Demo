// scanner — html5-qrcode wrapper (camera). Loaded lazily so the base
// bundle stays light; start() returns a stop handle.
export interface ScanHandle { stop: () => Promise<void>; }

export async function startScan(
  elementId: string,
  onCode: (text: string) => void,
): Promise<ScanHandle> {
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
  const scanner = new Html5Qrcode(elementId, {
    verbose: false,
    formatsToSupport: [
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.CODE_39,
    ],
  } as never);
  let stopped = false;
  await scanner.start(
    { facingMode: "environment" },
    { fps: 8, qrbox: { width: 220, height: 140 } },
    (decoded) => { if (!stopped) onCode(decoded); },
    () => undefined,
  );
  return {
    stop: async () => {
      stopped = true;
      try { await scanner.stop(); } catch { /* already stopped */ }
      try { scanner.clear(); } catch { /* ignore */ }
    },
  };
}

export const cameraSupported = (): boolean =>
  Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
