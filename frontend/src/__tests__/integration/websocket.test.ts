import { describe, it, expect, vi } from 'vitest';
import { WebSocketManager } from '@/lib/websocket';

describe('WebSocketManager', () => {
    it('defaults to disconnected', () => {
        const ws = new WebSocketManager({ url: 'ws://localhost:8765/ws' });
        expect(ws.connected).toBe(false);
    });

    it('queues messages when disconnected', () => {
        const ws = new WebSocketManager({ url: 'ws://localhost:8765/ws' });
        // Should not throw when sending while disconnected
        expect(() => ws.send('{"type":"test"}')).not.toThrow();
    });

    it('subscribe returns unsubscribe function', () => {
        const ws = new WebSocketManager({ url: 'ws://localhost:8765/ws' });
        const handler = vi.fn();
        const unsub = ws.subscribe('test_channel', handler);
        expect(typeof unsub).toBe('function');
    });

    it('disconnect sets connected to false', () => {
        const ws = new WebSocketManager({ url: 'ws://localhost:8765/ws' });
        ws.disconnect();
        expect(ws.connected).toBe(false);
    });
});
