import type { Segment, SegmentSlug } from '@/content/types'
import { healthPlans } from '@/content/segments/health-plans'
import { employers } from '@/content/segments/employers'
import { manufacturers } from '@/content/segments/manufacturers'
import { foundations } from '@/content/segments/foundations'

/**
 * The order here is the order everywhere: the nav dropdown, the segment grid and
 * the mobile menu all read this list. A fifth segment is a new module added here
 * and a new route folder — never a new page component.
 */
export const segments: Segment[] = [healthPlans, employers, manufacturers, foundations]

export const segmentBySlug: Record<SegmentSlug, Segment> = {
  'health-plans': healthPlans,
  employers,
  manufacturers,
  foundations,
}

export function hrefFor(slug: SegmentSlug): string {
  return `/${slug}`
}
