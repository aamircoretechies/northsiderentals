import { Container } from '@/components/common/container';
import { CarsCheckoutDetailsContent } from './details-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';
import { useIframeBreakout } from '@/hooks/use-iframe-breakout';

export function CarsCheckoutDetailsPage() {
  useIframeBreakout();
  return (
    <Container>
      <div className="pt-2">
        <CheckoutStepper currentStep={4} />
      </div>
      <CarsCheckoutDetailsContent />
    </Container>
  );
}
