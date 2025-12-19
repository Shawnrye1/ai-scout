import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/payments/stripe';

// GET /api/billing/invoices - Get invoice history
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team
    const teamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: { team: true },
    });

    if (!teamMember?.team?.stripeCustomerId) {
      return NextResponse.json({ invoices: [] });
    }

    // Fetch invoices from Stripe
    try {
      const invoices = await stripe.invoices.list({
        customer: teamMember.team.stripeCustomerId,
        limit: 10,
      });

      return NextResponse.json({
        invoices: invoices.data.map((inv) => ({
          id: inv.id,
          date: new Date(inv.created * 1000).toISOString(),
          amount: inv.amount_paid,
          status: inv.status,
          pdfUrl: inv.invoice_pdf,
        })),
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json({ invoices: [] });
    }
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
