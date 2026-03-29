import Link from 'next/link';
import styles from './not-found.module.css';

/**
 * 404 — Lost in Space
 * Floating astronaut, parallax stars, "Return to Base" CTA.
 */
export default function NotFound() {
    return (
        <div className={styles.space}>
            {/* Starfield */}
            <div className={styles.stars} />
            <div className={styles.stars2} />

            <div className={styles.content}>
                {/* Astronaut */}
                <div className={styles.astronaut}>👨‍🚀</div>

                <h1 className={styles.heading}>SIGNAL LOST</h1>
                <p className={styles.code}>ERROR 404</p>
                <p className={styles.message}>The page you&apos;re looking for has drifted beyond our reach.</p>

                <Link href="/" className={styles.returnBtn}>
                    RETURN TO BASE
                </Link>
            </div>
        </div>
    );
}
