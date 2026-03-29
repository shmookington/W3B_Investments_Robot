import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://w3b.fund';

export default function sitemap(): MetadataRoute.Sitemap {
    const publicRoutes = [
        '',
        '/vault',
        '/performance',
        '/audit',
        '/security',
        '/docs',
        '/blog',
        '/legal/terms',
        '/legal/privacy',
        '/legal/risk',
        '/legal/compliance',
    ];

    return publicRoutes.map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1 : route === '/vault' ? 0.9 : 0.7,
    }));
}
