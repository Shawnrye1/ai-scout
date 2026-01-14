import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/payments/stripe';
import { z } from 'zod';

const checkoutSchema = z.object({
  priceId: z.string().min(1),
});

// POST /api/billing/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId } = checkoutSchema.parse(body);

    // Get user's team
    const teamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: { team: true },
    });

    if (!teamMember?.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    const team = teamMember.team;
    let customerId = team.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          teamId: team.id.toString(),
        },
      });
      customerId = customer.id;

      // Save customer ID to team
      await db
        .update(teams)
        .set({ stripeCustomerId: customerId })
        .where(eq(teams.id, team.id));
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/billing?success=true`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      metadata: {
        teamId: team.id.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
