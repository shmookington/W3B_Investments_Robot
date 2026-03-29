import { describe, it, expect } from 'vitest';
import { parseError, type UserError } from '@/lib/errors';

describe('parseError', () => {
    it('detects user rejection', () => {
        const err = new Error('user rejected transaction');
        const result = parseError(err);
        expect(result.type).toBe('TX_REJECTED');
        expect(result.severity).toBe('info');
    });

    it('detects user denied variant', () => {
        const result = parseError(new Error('MetaMask: user denied the request'));
        expect(result.type).toBe('TX_REJECTED');
    });

    it('detects execution revert with reason', () => {
        const result = parseError(new Error("execution reverted with reason string 'insufficient collateral'"));
        expect(result.type).toBe('TX_FAILED');
        expect(result.message).toContain('insufficient collateral');
        expect(result.cta?.action).toBe('retry');
    });

    it('detects wallet not connected', () => {
        const result = parseError(new Error('no provider found'));
        expect(result.type).toBe('WALLET_NOT_CONNECTED');
        expect(result.cta?.action).toBe('connect');
    });

    it('detects insufficient balance with context', () => {
        const result = parseError(new Error('insufficient funds'), { balance: '100 USDC', needed: '500 USDC' });
        expect(result.type).toBe('INSUFFICIENT_BALANCE');
        expect(result.message).toContain('100 USDC');
        expect(result.message).toContain('500 USDC');
    });

    it('detects approval needed', () => {
        const result = parseError(new Error('ERC20: insufficient allowance'));
        expect(result.type).toBe('APPROVAL_NEEDED');
        expect(result.cta?.action).toBe('approve');
    });

    it('detects wrong network', () => {
        const result = parseError(new Error('wrong chain id'));
        expect(result.type).toBe('WRONG_NETWORK');
        expect(result.cta?.action).toBe('switchNetwork');
    });

    it('detects stale oracle', () => {
        const result = parseError(new Error('oracle price stale'), { lastOracle: '5 min ago' });
        expect(result.type).toBe('ORACLE_STALE');
        expect(result.message).toContain('5 min ago');
    });

    it('detects low health factor', () => {
        const result = parseError(new Error('health factor below threshold'), { healthFactor: 1.05 });
        expect(result.type).toBe('HEALTH_FACTOR_LOW');
        expect(result.severity).toBe('critical');
        expect(result.message).toContain('1.05');
    });

    it('detects gas estimation failure', () => {
        const result = parseError(new Error('gas estimation failed'));
        expect(result.type).toBe('GAS_ESTIMATION_FAILED');
    });

    it('detects RPC error', () => {
        const result = parseError(new Error('rpc timeout'));
        expect(result.type).toBe('RPC_ERROR');
    });

    it('falls back to UNKNOWN for unrecognized errors', () => {
        const result = parseError(new Error('something completely unexpected'));
        expect(result.type).toBe('UNKNOWN');
        expect(result.message).toBe('something completely unexpected');
    });

    it('handles non-Error input', () => {
        const result = parseError('raw string error');
        expect(result.type).toBe('UNKNOWN');
    });
});
