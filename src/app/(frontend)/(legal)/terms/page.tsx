import type { Metadata } from 'next'

import { PolicyPage, policyMetadata } from '@/components/layout/PolicyPage'

export const generateMetadata = (): Promise<Metadata> => policyMetadata('terms', 'Terms & conditions')

export default function TermsPage() {
  return <PolicyPage kind="terms" title="Terms & conditions" />
}
