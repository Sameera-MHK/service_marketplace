const bandColors = {
  elite: 'bg-purple-100 text-purple-800',
  trusted: 'bg-green-100 text-green-800',
  rising: 'bg-blue-100 text-blue-800',
  probation: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
};

export default function ScoreBadge({ band }) {
  if (!band) return null;
  return (
    <span className={`badge ${bandColors[band] || 'bg-stone-100 text-stone-700'}`}>
      {band.charAt(0).toUpperCase() + band.slice(1)}
    </span>
  );
}
