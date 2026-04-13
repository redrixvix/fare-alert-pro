'use client';

export default function SortControls({
  currentSort,
  onSort,
}: {
  currentSort: string;
  onSort: (s: string) => void;
}) {
  const sorts = [
    { key: 'discount', label: 'Biggest Discount' },
    { key: 'price', label: 'Lowest Price' },
    { key: 'route', label: 'Route A–Z' },
  ];

  return (
    <div className="deals-sort-btns">
      {sorts.map((s) => (
        <button
          key={s.key}
          className={`sort-btn${currentSort === s.key ? ' active' : ''}`}
          onClick={() => onSort(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
