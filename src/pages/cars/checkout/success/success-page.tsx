import { Container } from '@/components/common/container';
import { CarsCheckoutSuccessContent } from './success-content';
import { useIframeBreakout } from '@/hooks/use-iframe-breakout';

export function CarsCheckoutSuccessPage() {
  useIframeBreakout();
  return (
    <Container className="p-0">
      <CarsCheckoutSuccessContent />
    </Container>
  );
}
