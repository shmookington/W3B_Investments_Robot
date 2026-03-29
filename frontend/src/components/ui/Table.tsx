import styles from './Table.module.css';

interface Column<T> { key: keyof T & string; label: string; render?: (val: T[keyof T], row: T) => React.ReactNode; }
interface TableProps<T> { columns: Column<T>[]; data: T[]; loading?: boolean; }

export function Table<T extends Record<string, unknown>>({ columns, data, loading }: TableProps<T>) {
    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>{columns.map((col) => <th key={col.key} className={styles.th}>{col.label}</th>)}</tr>
                </thead>
                <tbody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => <td key={col.key} className={styles.td}><span className={styles.skeletonCell} /></td>)}
                            </tr>
                        ))
                    ) : (
                        data.map((row, i) => (
                            <tr key={i} className={styles.row}>
                                {columns.map((col) => (
                                    <td key={col.key} className={styles.td}>
                                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
