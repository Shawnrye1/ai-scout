/**
 * Setup Stripe Products and Prices
 *
 * Run with: STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const PRODUCTS = [
  {
    name: 'Starter',
    description: '5 games per month - Perfect for getting started',
    price: 9900, // $99.00 in cents
    features: [
      '5 games per month',
      'AI-powered scouting reports',
      'Player grades & tendencies',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    description: '10 games per month + Player Portal',
    price: 24900, // $249.00 in cents
    features: [
      '10 games per month',
      'Everything in Starter',
      'Player Portal access',
      'Advanced analytics',
      'Priority support',
    ],
  },
  {
    name: 'Team',
    description: '20 games per month - For serious programs',
    price: 49900, // $499.00 in cents
    features: [
      '20 games per month',
      'Everything in Pro',
      'Multiple team members',
      'API access',
      'Dedicated support',
    ],
  },
];

async function main() {
  console.log('Setting up Stripe products...\n');

  const results: { name: string; productId: string; priceId: string }[] = [];

  for (const productDef of PRODUCTS) {
    console.log(`Creating product: ${productDef.name}...`);

    // Create product
    const product = await stripe.products.create({
      name: productDef.name,
      description: productDef.description,
      metadata: {
        features: JSON.stringify(productDef.features),
      },
    });

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: productDef.price,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    });

    // Set as default price
    await stripe.products.update(product.id, {
      default_price: price.id,
    });

    results.push({
      name: productDef.name,
      productId: product.id,
      priceId: price.id,
    });

    console.log(`  ✓ Product: ${product.id}`);
    console.log(`  ✓ Price: ${price.id} ($${productDef.price / 100}/mo)\n`);
  }

  console.log('\n=== Add these to your .env file ===\n');
  console.log(`NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=${results[0].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=${results[1].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID=${results[2].priceId}`);
  console.log('\n');
}

main().catch(console.error);
