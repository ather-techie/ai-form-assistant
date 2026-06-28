export const fmt = (ts) => {
  try { return new Date(ts).toLocaleString(); } catch { return '—'; }
};

export const mask = (val) => {
  if (!val || val.length <= 4) return '••••';
  return val.slice(0, 2) + '••••' + val.slice(-2);
};
