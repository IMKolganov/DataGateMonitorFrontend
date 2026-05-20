import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  value: string;
  size?: number;
};

/** Renders otpauth:// URI as a scannable QR (client-side only). */
export function TotpSetupQrCode({ value, size = 200 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <p className="settings-item-description">Generating QR code…</p>;
  }

  return (
    <img
      src={dataUrl}
      alt="Scan with authenticator app"
      width={size}
      height={size}
      decoding="async"
    />
  );
}
