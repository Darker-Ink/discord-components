export const formatDuration = (seconds: number) => {
  const total = seconds | 0;
  const remainder = total % 60;
  return `${(total - remainder) / 60}:${String(remainder).padStart(2, '0')}`;
};
