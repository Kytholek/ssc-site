'use strict';

/** Shared SEO constants for build scripts */
const SITE_ORIGIN = 'https://simulationsourcecode.com';

/** Digital goods: instant email delivery, no physical shipping, sales final (see services FAQ). */
const DIGITAL_SHIPPING_DETAILS = {
  '@type': 'OfferShippingDetails',
  shippingRate: {
    '@type': 'MonetaryAmount',
    value: '0',
    currency: 'USD',
  },
  shippingDestination: {
    '@type': 'DefinedRegion',
    addressCountry: 'US',
  },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 0,
      maxValue: 0,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 0,
      maxValue: 0,
      unitCode: 'DAY',
    },
  },
};

const DIGITAL_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'US',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
};

const SERVICE_OFFERS_BASE = [
  { name: 'Guidebook Report', price: '22' },
  { name: 'Time Cycle', price: '17' },
  { name: 'Personal Consultation', price: '55' },
  { name: 'TellTale Tarot Reading', price: '20' },
];

function withMerchantOfferFields(offer) {
  return Object.assign(
    {
      '@type': 'Offer',
      priceCurrency: 'USD',
      availability: 'https://schema.org/OnlineOnly',
      itemCondition: 'https://schema.org/NewCondition',
      url: SITE_ORIGIN + '/services/',
      shippingDetails: DIGITAL_SHIPPING_DETAILS,
      hasMerchantReturnPolicy: DIGITAL_RETURN_POLICY,
    },
    offer
  );
}

function getServiceProductOffers() {
  return SERVICE_OFFERS_BASE.map(function (o) {
    return withMerchantOfferFields({
      name: o.name,
      price: o.price,
    });
  });
}

module.exports = {
  SITE_ORIGIN: SITE_ORIGIN,
  OG_IMAGE: SITE_ORIGIN + '/Images/ssc-og.png',
  SERVICES_OG_IMAGE: SITE_ORIGIN + '/Images/services-og.png',
  OG_IMAGE_WIDTH: '1200',
  OG_IMAGE_HEIGHT: '630',
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
  DIGITAL_SHIPPING_DETAILS: DIGITAL_SHIPPING_DETAILS,
  DIGITAL_RETURN_POLICY: DIGITAL_RETURN_POLICY,
  withMerchantOfferFields: withMerchantOfferFields,
  getServiceProductOffers: getServiceProductOffers,
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
    { path: '/sample-guidebook.html', priority: '0.7', changefreq: 'monthly' },
  ],
  PILLAR_POSTS: [
    { slug: 'how-to-calculate-life-path-number', title: 'How to Calculate Your Life Path Number' },
    { slug: 'pillar-numerology-source-code', title: 'The Pillar: Numerology as Source Code' },
    { slug: 'how-to-read-numerology-blueprint', title: 'How to Read Your Numerology Blueprint' },
  ],
};
