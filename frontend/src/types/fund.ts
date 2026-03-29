/**
 * Fund Types — TypeScript definitions for the W3B prediction fund.
 *
 * Used across stores, API routes, and components.
 */

/* ─── Fund Position ─── */

export interface FundPosition {
    /** User's deposit amount in USDC */
    depositAmount: number;
    /** Current value of position based on share price */
    currentValue: number;
    /** Share price at deposit */
    entrySharePrice: number;
    /** Current share price */
    currentSharePrice: number;
    /** Unrealized P&L (percent) */
    unrealizedPnlPct: number;
    /** ISO timestamp of deposit */
    depositedAt: string;
}

/* ─── Deposit Records ─── */

export type DepositStatus = 'pending' | 'confirmed' | 'failed';
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DepositRecord {
    id: string;
    amount: number;
    status: DepositStatus;
    txHash: string | null;
    createdAt: string;
    confirmedAt: string | null;
}

export interface WithdrawalRecord {
    id: string;
    amount: number;
    status: WithdrawalStatus;
    txHash: string | null;
    createdAt: string;
    completedAt: string | null;
    estimatedCompletion: string | null;
}

/* ─── Performance Metrics ─── */

export interface PerformanceMetrics {
    /** Total return since inception (percent) */
    totalReturn: number;
    /** Annualized return (percent) */
    annualizedReturn: number;
    /** Monthly return (percent) */
    monthlyReturn: number;
    /** Sharpe ratio (risk-adjusted) */
    sharpeRatio: number;
    /** Sortino ratio (downside risk-adjusted) */
    sortinoRatio: number;
    /** Calmar ratio (return / max drawdown) */
    calmarRatio: number;
    /** Maximum drawdown (percent, negative) */
    maxDrawdown: number;
    /** Directional accuracy / win rate (percent) */
    winRate: number;
    /** Profit factor (gross profit / gross loss) */
    profitFactor: number;
    /** Total positions taken */
    totalPositions: number;
    /** Fund age in days */
    fundAgeDays: number;
}

/* ─── Monthly Returns ─── */

export interface MonthlyReturn {
    year: number;
    month: number; // 0-indexed (Jan=0)
    returnPct: number;
    positionCount: number;
}

/* ─── Fee Structure ─── */

export interface FeeStructure {
    depositFee: number;       // 0%
    withdrawalFee: number;    // 0%
    managementFee: number;    // 0%
    performanceFee: number;   // 20%
    highWaterMark: number;    // current HWM share price
}

/* ─── Risk Disclosure Acknowledgment ─── */

export interface RiskAcknowledgment {
    userId: string;
    acknowledged: boolean;
    acknowledgedAt: string | null;
    signedName: string | null;
}
