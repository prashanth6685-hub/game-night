import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className }: CardProps) {
  return (
    <section className={`ui-card${className ? ` ${className}` : ''}`}>
      {title ? <h2 className="ui-card-title">{title}</h2> : null}
      {children}
    </section>
  );
}
