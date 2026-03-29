/**
 * Backtest API — Runs the MONOLITH Python backtesting engine
 *
 * POST /api/backtest/run
 * Body: { strategy, sport, days, simulations }
 * Returns: Monte Carlo simulation results from the real Python engine
 */
import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

const VALID_STRATEGIES = ['elo_edge', 'clv_momentum', 'injury_fade', 'line_movement', 'model_consensus', 'regime_adaptive', 'kelly_optimal'];
const VALID_SPORTS = ['soccer', 'nba', 'cfb', 'nfl'];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            strategy = 'elo_edge',
            sport = 'nba',
            days = 90,
            simulations = 100,
        } = body;

        // Validate inputs
        if (!VALID_STRATEGIES.includes(strategy)) {
            return NextResponse.json(
                { success: false, error: `Invalid strategy. Use: ${VALID_STRATEGIES.join(', ')}` },
                { status: 400 }
            );
        }
        if (!VALID_SPORTS.includes(sport)) {
            return NextResponse.json(
                { success: false, error: `Invalid sport. Use: ${VALID_SPORTS.join(', ')}` },
                { status: 400 }
            );
        }

        const clampedDays = Math.max(30, Math.min(365, days));
        const clampedSims = Math.max(50, Math.min(1000, simulations));

        // Run the Python backtester
        const monolithDir = path.resolve(process.cwd(), '..', 'monolith');
        const pythonScript = `
import json, sys
sys.path.insert(0, '${monolithDir}')
from integration.backtest_runner import fetch_historical_events, run_monte_carlo
from dataclasses import asdict

try:
    df = fetch_historical_events(sport='${sport}', days=${clampedDays})
    df.attrs['sport'] = '${sport}'
    summary = run_monte_carlo(df, '${strategy}', ${clampedSims})
    result = asdict(summary)
    print(json.dumps(result, default=str))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`;

        // Find Python (try venv first)
        const venvPython = path.join(monolithDir, '.venv', 'bin', 'python');
        let pythonBin = venvPython;
        try {
            await execFileAsync(venvPython, ['--version']);
        } catch {
            pythonBin = 'python3';
        }

        const { stdout, stderr } = await execFileAsync(pythonBin, ['-c', pythonScript], {
            cwd: monolithDir,
            timeout: 120_000, // 2 min timeout for large backtests
            maxBuffer: 10 * 1024 * 1024,
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });

        if (stderr && !stderr.includes('INFO') && !stderr.includes('WARNING')) {
            console.error('Backtest stderr:', stderr.substring(0, 500));
        }

        // Parse result
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);

        if (result.error) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result,
            meta: {
                source: 'monolith-backtest-engine',
                strategy,
                sport,
                days: clampedDays,
                simulations: clampedSims,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Backtest API error:', msg);
        return NextResponse.json(
            { success: false, error: `Backtest failed: ${msg}` },
            { status: 500 }
        );
    }
}
