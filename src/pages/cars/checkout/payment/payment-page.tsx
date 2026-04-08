import { Container } from '@/components/common/container';
import { CarsCheckoutPaymentContent } from './payment-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';

export function CarsCheckoutPaymentPage() {
  return (
    <Container className="p-0">
      <div className="pt-6">
        <CheckoutStepper currentStep={5} />
      </div>
      <CarsCheckoutPaymentContent />
    </Container>
  );
}
