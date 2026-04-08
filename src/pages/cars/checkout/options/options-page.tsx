import { Container } from '@/components/common/container';
import { CarsCheckoutOptionsContent } from './options-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';

export function CarsCheckoutOptionsPage() {
  return (
    <Container className="p-0">
      <div className="pt-6">
        <CheckoutStepper currentStep={3} />
      </div>
      <CarsCheckoutOptionsContent />
    </Container>
  );
}
