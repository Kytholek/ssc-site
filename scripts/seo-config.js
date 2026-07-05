'use strict';

/** Shared SEO constants for build scripts */
module.exports = {
  SITE_ORIGIN: 'https://simulationsourcecode.com',
  OG_IMAGE: 'https://simulationsourcecode.com/Images/ssc-og.png',
  FACEBOOK_REVIEWS_URL: 'https://www.facebook.com/kytholek/reviews',
  FACEBOOK_RATING_VALUE: '5',
  FACEBOOK_RATING_COUNT: '5',
  SOCIAL_PROFILES: [
    'https://www.instagram.com/kytholek',
    'https://www.youtube.com/@kytholek',
    'https://substack.com/@kyelthomas',
    'https://www.tiktok.com/@kytholek',
    'https://www.facebook.com/kytholek/reviews',
  ],
  FACEBOOK_REVIEWS: [
    {
      author: 'Ivett G.',
      text: 'I wholeheartedly recommend Kytholek for his numerology expertise. He can help you see life\u2019s bigger picture and your own unique path. You won\u2019t be disappointed.',
    },
    {
      author: 'Paige S.',
      text: 'I loved the numerology report I had done. It really helped me understand myself a bit better and opened my mind to things I had been ignoring and shutting out.',
    },
    {
      author: 'Salud y Vida',
      text: 'Many thanks for doing my numerology \u2014 it was really very accurate and helped me strengthen myself as a person and improve aspects for the better.',
    },
  ],
  CORE_ROUTES: [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/calculator/', priority: '0.9', changefreq: 'monthly' },
    { path: '/blueprint/', priority: '0.9', changefreq: 'monthly' },
    { path: '/services/', priority: '0.8', changefreq: 'monthly' },
    { path: '/codex/', priority: '0.9', changefreq: 'monthly' },
    { path: '/blog/', priority: '0.8', changefreq: 'weekly' },
    { path: '/books/', priority: '0.7', changefreq: 'monthly' },
    { path: '/about/', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacy/', priority: '0.5', changefreq: 'monthly' },
    { path: '/consultation/', priority: '0.8', changefreq: 'monthly' },
    { path: '/4-phase-alchemy/', priority: '0.8', changefreq: 'monthly' },
    { path: '/sourcecode-life/', priority: '0.8', changefreq: 'monthly' },
  ],
  PILLAR_POSTS: [
    { slug: 'how-to-calculate-life-path-number', title: 'How to Calculate Your Life Path Number' },
    { slug: 'pillar-numerology-source-code', title: 'The Pillar: Numerology as Source Code' },
    { slug: 'how-to-read-numerology-blueprint', title: 'How to Read Your Numerology Blueprint' },
  ],
};
