import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';
import styles from './Layout.module.css';

interface LayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
    return (
        <div className={styles.layout}>
            <Header />
            <div className={styles.body}>
                <main className={styles.main}>
                    {children}
                    <Footer />
                </main>
            </div>
            <MobileNav />
        </div>
    );
}

/* ─── PageContainer ─── */
export function PageContainer({ children }: { children: React.ReactNode }) {
    return <div className={styles.pageContainer}>{children}</div>;
}
