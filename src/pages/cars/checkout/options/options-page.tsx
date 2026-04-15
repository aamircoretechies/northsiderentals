import { Container } from '@/components/common/container';
import { CarsCheckoutOptionsContent } from './options-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';

export function CarsCheckoutOptionsPage() {
  return (
    <Container>
      <div>
        <CheckoutStepper currentStep={3} />
      </div>
      <CarsCheckoutOptionsContent />
    </Container>
  );
}
