import type { Metadata } from 'next'
import { SegmentPage } from '@/components/SegmentPage'
import { segmentBySlug } from '@/content/segments'

const segment = segmentBySlug['manufacturers']

export const metadata: Metadata = {
  title: `${segment.name} — Ahead OS`,
  description: segment.hero.lede,
}

export default function Page() {
  return <SegmentPage segment={segment} />
}
