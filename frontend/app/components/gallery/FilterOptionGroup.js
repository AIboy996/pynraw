'use client';

export default function FilterOptionGroup({ label, options, value, onChange }) {
  return (
    <div className="filter-group">
      <h3>{label}</h3>
      <div className="option-chip-list">
        <button
          className={`option-chip ${value === '' ? 'active' : ''}`}
          onClick={() => onChange('')}
          type="button"
        >
          全部
        </button>
        {options.map((item) => (
          <button
            key={item}
            className={`option-chip ${value === item ? 'active' : ''}`}
            onClick={() => onChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
