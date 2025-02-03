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
  