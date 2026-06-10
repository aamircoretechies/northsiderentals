import { Container } from '@/components/common/container';
import { CarsSearchResultsGridContent } from './search-results-grid-content';
import { CheckoutStepper } from '@/components/common/checkout-stepper';

export function CarsSearchResultsGridPage() {
  return (
    <Container>
      <CheckoutStepper currentStep={2} />
      <CarsSearchResultsGridContent />
    </Container>
  );
}
