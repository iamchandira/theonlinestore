/**
 * Production build: there is no test gateway. Card and instalment payments only go through the real
 * gateways configured in Admin › Settings › Payments.
 */
export function simulatorPermitted(_mode: 'test' | 'live', _setting: boolean) {
  return false
}
