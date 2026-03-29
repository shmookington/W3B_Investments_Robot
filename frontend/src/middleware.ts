/**
 * Next.js Edge Middleware — Geo-Fencing
 *
 * Runs on every request. Blocks access from OFAC-sanctioned countries
 * using CDN-provided geo headers.
 *
 * Returns HTTP 451 (Unavailable for Legal Reasons) for blocked requests.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkGeoCompliance } from '@/lib/compliance/geoFence';

/**
 * Paths excluded from geo-fencing (always accessible).
 */
const EXCLUDED_PATHS = [
    '/_next',
    '/favicon.ico',
    '/api/health',
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Skip excluded paths
    if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Skip static assets
    if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return NextResponse.next();
    }

    // Run geo-fence check
    const geoResult = checkGeoCompliance(req);

    if (!geoResult.allowed) {
        // Log blocked attempt
        console.warn(`[GeoFence] Blocked request from ${geoResult.country}: ${pathname}`);

        // Return 451 — Unavailable For Legal Reasons
        return new NextResponse(
            JSON.stringify({
                error: 'Service unavailable in your region',
                message: geoResult.reason || 'Access denied due to regulatory restrictions.',
                code: 'GEO_BLOCKED',
            }),
            {
                status: 451,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Blocked-Reason': 'geo-restriction',
                },
            }
        );
    }

    // Add geo metadata to response headers for downstream use
    const response = NextResponse.next();
    if (geoResult.country) {
        response.headers.set('x-user-country', geoResult.country);
    }
    if (geoResult.reason === 'elevated_risk') {
        response.headers.set('x-risk-level', 'elevated');
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
