import { Container } from '@/components/common/container';
import { CarsCheckoutOptionsContent } from './options-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';
import { useIframeBreakout } from '@/hooks/use-iframe-breakout';

export function CarsCheckoutOptionsPage() {
  useIframeBreakout();
  return (
    <Container>
      <div>
        <CheckoutStepper currentStep={3} />
      </div>
      <CarsCheckoutOptionsContent />
    </Container>
  );
}
