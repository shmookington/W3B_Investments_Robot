import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/vault',
                    '/performance',
                    '/audit',
                    '/security',
                    '/docs',
                    '/blog',
                    '/legal',
                ],
                disallow: [
                    '/monolith',
                    '/monolith/*',
                    '/dashboard',
                    '/settings',
                    '/api/*',
                    '/login',
                    '/register',
                ],
            },
        ],
    };
}
