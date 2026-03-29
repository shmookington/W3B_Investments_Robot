import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getQualityConfig, FpsMonitor, WEB_VITALS, type PerformanceTier } from '@/lib/performance';

describe('getQualityConfig', () => {
    it('ultra tier enables all effects at 60fps', () => {
        const cfg = getQualityConfig('ultra');
        expect(cfg.particles).toBe(true);
        expect(cfg.crtScanlines).toBe(true);
        expect(cfg.shaderBackground).toBe(true);
        expect(cfg.blurEffects).toBe(true);
        expect(cfg.maxFps).toBe(60);
    });

    it('medium tier disables shader background', () => {
        const cfg = getQualityConfig('medium');
        expect(cfg.particles).toBe(true);
        expect(cfg.shaderBackground).toBe(false);
        expect(cfg.maxFps).toBe(30);
    });

    it('low tier disables particles and CRT', () => {
        const cfg = getQualityConfig('low');
        expect(cfg.particles).toBe(false);
        expect(cfg.crtScanlines).toBe(false);
        expect(cfg.blurEffects).toBe(false);
    });

    it('potato tier disables everything', () => {
        const cfg = getQualityConfig('potato');
        expect(cfg.particles).toBe(false);
        expect(cfg.crtScanlines).toBe(false);
        expect(cfg.gridAnimation).toBe(false);
        expect(cfg.shaderBackground).toBe(false);
        expect(cfg.blurEffects).toBe(false);
        expect(cfg.maxFps).toBe(24);
    });
});

describe('WEB_VITALS', () => {
    it('has correct FCP thresholds', () => {
        expect(WEB_VITALS.FCP.good).toBe(1200);
        expect(WEB_VITALS.FCP.poor).toBe(3000);
    });

    it('has correct LCP thresholds', () => {
        expect(WEB_VITALS.LCP.good).toBe(2500);
    });

    it('has correct CLS thresholds', () => {
        expect(WEB_VITALS.CLS.good).toBe(0.1);
    });
});

describe('FpsMonitor', () => {
    it('creates monitor with default 60fps', () => {
        const monitor = new FpsMonitor();
        expect(monitor.getFps()).toBe(60);
    });

    it('accepts onUpdate callback', () => {
        const cb = vi.fn();
        const monitor = new FpsMonitor(cb);
        expect(monitor).toBeDefined();
    });
});
