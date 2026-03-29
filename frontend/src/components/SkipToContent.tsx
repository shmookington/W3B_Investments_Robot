'use client';

import styles from './SkipToContent.module.css';

/**
 * SkipToContent — accessibility skip link.
 * Hidden until focused via Tab. Jumps to #main-content.
 */
export function SkipToContent() {
    return (
        <a href="#main-content" className={styles.skip}>
            Skip to content
        </a>
    );
}
