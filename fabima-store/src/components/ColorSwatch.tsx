import React from 'react';
import type { ColorOption } from '../data/types';

export const ColorSwatch: React.FC<{ color: ColorOption; size?: number; selected?: boolean; onClick?: () => void }> = ({ color, size = 18, selected, onClick }) => (
  <button
    type="button"
    title={color.name}
    aria-label={color.name}
    aria-pressed={selected}
    onClick={onClick}
    disabled={!onClick}
    className={`rounded-full border border-black/15 transition-all shrink-0 ${selected ? 'ring-2 ring-offset-2 ring-ink' : ''} ${onClick ? 'hover:scale-110' : 'cursor-default'}`}
    style={{ width: size, height: size, background: color.hex }}
  />
);
