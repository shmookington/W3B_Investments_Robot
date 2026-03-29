import styles from './ExternalLink.module.css';

interface ExternalLinkProps { href: string; children: React.ReactNode; className?: string; }

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${styles.link} ${className || ''}`}>
            {children} <span className={styles.icon}>↗</span>
        </a>
    );
}
