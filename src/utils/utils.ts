export const formatBytes = (bytes?: number): string => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) {
      return "0 Bytes";
    }
  
    const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
    let i = 0;
    while (bytes >= 1024 && i < sizes.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${sizes[i]}`;
  };

  export const formatDateWithOffset = (date: Date): string => {
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.abs(offsetMinutes / 60)
      .toString()
      .padStart(2, "0");
    const offsetSign = offsetMinutes > 0 ? "-" : "+";
    return `${date.toISOString().replace("T", " ").slice(0, -5)} ${offsetSign}${offsetHours}00`;
  };