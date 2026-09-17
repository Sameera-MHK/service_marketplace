export function generateSlug(name = '', category = '', district = '') {
  const parts = [name, category.replace(/_/g, ' '), district]
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join(' ');

  const base = parts
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 72);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
