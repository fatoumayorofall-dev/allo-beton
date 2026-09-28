import React from 'react';
import { useInView } from '../utils/hooks';

/** Fait apparaître son contenu en fondu lorsqu'il entre à l'écran. */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' }> = ({ children, className = '', delay = 0, as: Tag = 'div' }) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>} className={`reveal ${inView ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
};
