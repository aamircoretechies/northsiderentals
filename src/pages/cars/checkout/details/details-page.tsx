import { Container } from '@/components/common/container';
import { CarsCheckoutDetailsContent } from './details-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';

export function CarsCheckoutDetailsPage() {
  return (
    <Container className="p-0">
      <div className="pt-6">
        <CheckoutStepper currentStep={4} />
      </div>
      <CarsCheckoutDetailsContent />
    </Container>
  );
}
