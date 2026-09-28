import React from 'react';
import type { ColorOption } from '../data/types';

export const ColorSwatch: React.FC<{ color: ColorOption; size?: number; selected?: boolean; onClick?: () => void }> = ({ color, size = 18, selected, onClick }) => {
  const dot = <span className="block rounded-full border border-black/10" style={{ width: size, height: size, background: color.hex }} />;
  if (!onClick) return <span role="img" title={color.name} aria-label={color.name}>{dot}</span>;
  return (
    <button type="button" title={color.name} aria-label={color.name} aria-pressed={selected} onClick={onClick}
      className={`rounded-full p-[3px] border transition-colors ${selected ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}>
      {dot}
    </button>
  );
};
