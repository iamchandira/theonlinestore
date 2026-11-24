import type { Metadata } from 'next'

import { PolicyPage, policyMetadata } from '@/components/layout/PolicyPage'

export const generateMetadata = (): Promise<Metadata> => policyMetadata('returns', 'Returns & refunds')

export default function ReturnsPage() {
  return <PolicyPage kind="returns" title="Returns & refunds" />
}
