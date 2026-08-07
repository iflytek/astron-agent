export const convertToKBMB = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + 'KB';
  } else {
    return bytes + 'B';
  }
};
