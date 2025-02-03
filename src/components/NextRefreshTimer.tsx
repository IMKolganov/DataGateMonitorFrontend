import { useEffect, useState } from "react";

type Props = {
  nextRefreshTime: number;
  onReset: () => void;
};

export default function NextRefreshTimer({ nextRefreshTime, onReset }: Props) {
  const [timeLeft, setTimeLeft] = useState<number>(nextRefreshTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(nextRefreshTime - Date.now());

      if (nextRefreshTime - Date.now() <= 0) {
        onReset();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRefreshTime, onReset]);

  const formatTime = (ms: number) => {
    const seconds = Math.max(0, Math.floor((ms / 1000) % 60));
    const minutes = Math.max(0, Math.floor((ms / 1000) / 60));
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return <p><strong>Next Refresh:</strong> {formatTime(timeLeft)}</p>;
}
