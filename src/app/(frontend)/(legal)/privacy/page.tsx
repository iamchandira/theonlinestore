import type { Metadata } from 'next'

import { PolicyPage, policyMetadata } from '@/components/layout/PolicyPage'

export const generateMetadata = (): Promise<Metadata> => policyMetadata('privacy', 'Privacy policy')

export default function PrivacyPage() {
  return <PolicyPage kind="privacy" title="Privacy" />
}
