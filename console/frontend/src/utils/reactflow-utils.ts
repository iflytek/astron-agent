export const capitalizeFirstLetter = (string: string): string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};
