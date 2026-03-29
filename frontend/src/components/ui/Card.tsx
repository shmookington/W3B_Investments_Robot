import styles from './Card.module.css';

interface CardProps { children: React.ReactNode; className?: string; hoverable?: boolean; }

export function Card({ children, className, hoverable }: CardProps) {
    return <div className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className || ''}`}>{children}</div>;
}
