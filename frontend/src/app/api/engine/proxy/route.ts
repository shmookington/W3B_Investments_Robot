/**
 * MONOLITH Engine Proxy — bridges the frontend to the Python backend on port 8000
 *
 * GET /api/engine/proxy?endpoint=health
 * GET /api/engine/proxy?endpoint=risk/snapshot
 * GET /api/engine/proxy?endpoint=alpha/signals
 * GET /api/engine/proxy?endpoint=regime/current
 * GET /api/engine/proxy?endpoint=execution/trades
 * GET /api/engine/proxy?endpoint=portfolio/current
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

const ALLOWED_ENDPOINTS = [
    'health',
    // ── Signals (BETTING RECOMMENDATIONS) ──
    'api/signals/today',
    'api/signals/active',
    'api/signals/history',
    'api/signals/nba',
    'api/signals/soccer',
    'api/signals/cfb',
    'api/signals/nfl',
    'api/signals/hot',
    'api/signals/upcoming',
    // ── Lines ──
    'api/lines/movers',
    // ── Positions ──
    'api/positions/active',
    'api/positions/open',
    'api/positions/settled',
    'api/positions/history',
    'api/positions/fill-rate',
    'api/positions/kill',
    'api/positions/place',
    // ── Risk + Capital ──
    'api/risk/capital',
    'api/risk/breakers',
    'api/risk/exposure',
    'api/risk/kelly',
    'api/risk/metrics',
    'api/risk/stress',
    'api/risk/kill',
    // ── Account + P&L Tracker (Kalshi) ──
    'api/account/balance',
    'api/account/positions',
    'api/account/settlements',
    'api/account/fills',
    'api/account/pnl',
    'api/account/orders',
    'api/pnl/summary',
    'api/pnl/today',
    'api/pnl/by-sport',
    'api/pnl/by-month',
    'api/pnl/history',
    'api/bet/log',
    // ── Capital Management ──
    'api/capital/current',
    'api/capital/history',
    'api/capital/mode',
    'api/capital/reserve',
    'api/capital/set',
    'api/capital/splits',
    'api/capital/pnl/summary',
    'api/capital/pnl/today',
    'api/capital/pnl/positions',
    // ── Portfolio ──
    'api/portfolio/summary',
    'api/portfolio/by-sport',
    'api/portfolio/by-league',
    'api/portfolio/by-type',
    'api/portfolio/by-month',
    'api/portfolio/equity-curve',
    'api/portfolio/best-worst',
    'api/portfolio/streaks',
    // ── Models ──
    'api/models/status',
    'api/models/calibration',
    // ── Data ──
    'api/data/events',
    'api/data/schedule',
    'api/data/status',
    'api/data/results',
    // ── Control ──
    'api/control/status',
    'api/control/kill',
    'api/control/resume',
    'api/control/capital',
    'api/control/reserve',
    'api/control/splits',
    'api/control/config',
    'api/control/force-refresh',
    'api/control/notifications/config',
    'api/control/kelly/fraction',
    // ── Modular routes ──
    'risk/snapshot',
    'risk/breakers',
    'risk/drawdown',
    'alpha/signals',
    'alpha/performance',
    'regime/current',
    'execution/trades',
    'execution/status',
    'portfolio/current',
    'portfolio/construction',
    'data/status',
    'control/kill',
    'control/mode',
    // ── Live fallback routes ──
    'live/positions',
    'live/trades',
    'live/risk',
    'live/signals',
    'live/regime',
    'live/sentiment',
    'live/whales',
    'live/funding',
    'live/summary',
    'live/close',
    'live/schedule',
    // ── Admin ──
    'admin/status',
    'admin/pnl',
    'admin/kill',
    'admin/resume',
    'admin/fees',
    'admin/rebalance',
    'admin/users',
];

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
        return NextResponse.json({
            error: 'Missing endpoint',
            allowed: ALLOWED_ENDPOINTS,
        }, { status: 400 });
    }

    const isAllowed = ALLOWED_ENDPOINTS.includes(endpoint) || endpoint.startsWith('api/lines/movement/');

    if (!isAllowed) {
        return NextResponse.json({
            error: 'Invalid endpoint',
            allowed: ALLOWED_ENDPOINTS,
        }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const PUBLIC_KEY = process.env.NEXT_PUBLIC_MONOLITH_API_KEY || 'monolith-public-key';
        const ADMIN_KEY = process.env.MONOLITH_ADMIN_API_KEY || 'monolith-admin-key';
        const apiKey = endpoint.startsWith('admin/') ? ADMIN_KEY : PUBLIC_KEY;

        // Forward extra query parameters dynamically
        const forwardParams = new URLSearchParams(searchParams.toString());
        forwardParams.delete('endpoint');
        let backendUrl = `${ENGINE_URL}/${endpoint}`;
        if (forwardParams.toString()) {
            backendUrl += `?${forwardParams.toString()}`;
        }

        const res = await fetch(backendUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'x-api-key': apiKey,
            },
            cache: 'no-store',
        });

        clearTimeout(timeout);

        let data = await res.json();

        // ── Enrich NBA signals with real ESPN/DK odds ──
        if (endpoint === 'api/signals/nba' && data?.signals?.length > 0) {
            try {
                data = await enrichSignalsWithRealOdds(data);
            } catch (oddsErr) {
                console.error('ESPN odds enrichment failed, using raw signals:', oddsErr);
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({
            error: msg,
            engine_offline: true,
        }, { status: 502 });
    }
}

// ── ESPN Odds Enrichment ─────────────────────────────────────────
// Fetches real DraftKings / FanDuel moneyline odds from ESPN NBA scoreboard
// and replaces the dummy 50¢ market_price_cents with real implied probability.

interface ESPNOdds {
    homeTeam: string;
    awayTeam: string;
    homeProb: number;
    awayProb: number;
    homeAmerican: number;
    awayAmerican: number;
}

function americanToProbability(american: number): number {
    if (american < 0) return Math.abs(american) / (Math.abs(american) + 100);
    if (american > 0) return 100 / (american + 100);
    return 0.5;
}

async function fetchESPNNbaOdds(): Promise<ESPNOdds[]> {
    const res = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
        { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results: ESPNOdds[] = [];

    for (const event of data?.events ?? []) {
        const comps = event?.competitions ?? [];
        for (const comp of comps) {
            const oddsList = comp?.odds ?? [];
            if (oddsList.length === 0) continue;
            const odds = oddsList[0]; // Primary provider (usually DraftKings)

            const homeTeam = comp?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName ?? '';
            const awayTeam = comp?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName ?? '';

            // Try moneyline odds first
            const homeML = odds?.homeTeamOdds?.moneyLine;
            const awayML = odds?.awayTeamOdds?.moneyLine;
            
            if (homeML != null && awayML != null) {
                results.push({
                    homeTeam, awayTeam,
                    homeProb: americanToProbability(homeML),
                    awayProb: americanToProbability(awayML),
                    homeAmerican: homeML, awayAmerican: awayML,
                });
                continue;
            }

            // Fallback: convert spread to implied probability
            // ESPN format: spread is from home team perspective, negative = home favored
            const spread = parseFloat(odds?.spread);
            const homeFavorite = odds?.homeTeamOdds?.favorite === true;
            const awayFavorite = odds?.awayTeamOdds?.favorite === true;

            if (!isNaN(spread) || homeFavorite || awayFavorite) {
                // Determine effective spread from home team's perspective
                // In ESPN data: details like "ATL -3.5" means home is -3.5
                // spread field is the raw number, favorite flag tells direction
                let homeSpread = 0;
                if (!isNaN(spread)) {
                    // If home is favorite, they have the negative spread
                    homeSpread = homeFavorite ? -Math.abs(spread) : Math.abs(spread);
                }

                // Convert NBA spread to win probability using logistic model
                // Each point of spread ≈ 3% win probability shift from 50%
                // More precisely: P(win) = 1 / (1 + 10^(spread / 12))
                // This is calibrated for NBA where a 7-point favorite wins ~73% of the time
                const homeProb = 1 / (1 + Math.pow(10, homeSpread / 12));
                const awayProb = 1 - homeProb;

                results.push({
                    homeTeam, awayTeam,
                    homeProb: Math.max(0.05, Math.min(0.95, homeProb)),
                    awayProb: Math.max(0.05, Math.min(0.95, awayProb)),
                    homeAmerican: 0, awayAmerican: 0,
                });
            }
        }
    }
    return results;
}

function teamMatchScore(signalTitle: string, teamName: string): boolean {
    const s = signalTitle.toLowerCase();
    const t = teamName.toLowerCase();
    // Check if team name or last word (e.g., "Lakers", "Celtics") appears
    if (s.includes(t)) return true;
    const parts = t.split(' ');
    const lastName = parts[parts.length - 1];
    return s.includes(lastName);
}

async function enrichSignalsWithRealOdds(data: any): Promise<any> {
    const espnOdds = await fetchESPNNbaOdds();
    if (espnOdds.length === 0) return data;

    const enrichedSignals = data.signals.map((signal: any) => {
        const eventTitle = signal.event_title || '';
        const marketTitle = signal.market_title || '';

        // Find matching ESPN game
        const match = espnOdds.find(o =>
            teamMatchScore(eventTitle, o.homeTeam) && teamMatchScore(eventTitle, o.awayTeam)
        );

        if (!match) return signal; // No match — keep original

        // Determine which team the signal is recommending
        const isHome = teamMatchScore(marketTitle, match.homeTeam);
        const isAway = teamMatchScore(marketTitle, match.awayTeam);

        let marketProb = 0.5;
        if (isHome) marketProb = match.homeProb;
        else if (isAway) marketProb = match.awayProb;

        const modelProb = signal.model_probability || 0.5;
        const realEdge = modelProb - marketProb;

        // Recalculate confidence based on real edge
        let confidence = 'NO_EDGE';
        if (realEdge >= 0.10) confidence = 'EXTREME';
        else if (realEdge >= 0.05) confidence = 'HIGH';
        else if (realEdge >= 0.02) confidence = 'MEDIUM';
        else if (realEdge > 0) confidence = 'LOW';

        return {
            ...signal,
            market_price_cents: Math.round(marketProb * 1000) / 10, // e.g., 65.2
            market_probability: marketProb,
            edge: Math.round(realEdge * 10000) / 10000,
            edge_pct: Math.round(realEdge * 10000) / 100,
            confidence,
            odds_source: 'espn_draftkings',
        };
    });

    return { ...data, signals: enrichedSignals, odds_enriched: true };
}

export async function POST(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
        return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const isAllowed = ALLOWED_ENDPOINTS.includes(endpoint) || endpoint.startsWith('api/lines/movement/');

    if (!isAllowed) {
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const PUBLIC_KEY = process.env.NEXT_PUBLIC_MONOLITH_API_KEY || 'monolith-public-key';
        const ADMIN_KEY = process.env.MONOLITH_ADMIN_API_KEY || 'monolith-admin-key';
        const apiKey = endpoint.startsWith('admin/') ? ADMIN_KEY : PUBLIC_KEY;

        // Forward extra query parameters dynamically
        const forwardParams = new URLSearchParams(searchParams.toString());
        forwardParams.delete('endpoint');
        let backendUrl = `${ENGINE_URL}/${endpoint}`;
        if (forwardParams.toString()) {
            backendUrl += `?${forwardParams.toString()}`;
        }

        const res = await fetch(backendUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(body),
            cache: 'no-store',
        });

        clearTimeout(timeout);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({ error: msg, engine_offline: true }, { status: 502 });
    }
}
