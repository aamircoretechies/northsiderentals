import { Check } from 'lucide-react';
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperNav,
} from '@/components/ui/stepper';

export function CheckoutStepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { step: 1, title: 'Choose Date' },
    { step: 2, title: 'Select Vehicle' },
    { step: 3, title: 'Add Extras' },
    { step: 4, title: 'Passenger Details' },
    { step: 5, title: 'Payment' },
  ];

  return (
    <Stepper 
      value={currentStep} 
      orientation="horizontal" 
      className="w-full max-w-5xl mx-auto mb-8 px-4"
    >
      <StepperNav>
        {steps.map((st, index) => (
          <StepperItem key={st.step} step={st.step} className={index === steps.length - 1 ? 'flex-initial' : 'flex-1 relative'}>
            <StepperTrigger className="pointer-events-none data-[state=active]:bg-transparent data-[state=completed]:bg-transparent flex flex-col justify-center relative !gap-0">
              <StepperIndicator className="data-[state=active]:bg-[#0061e0] data-[state=completed]:bg-[#10b981] data-[state=inactive]:bg-gray-200">
                {currentStep > st.step ? <Check className="w-3.5 h-3.5 text-white stroke-[3px]" /> : st.step}
              </StepperIndicator>
              <StepperTitle className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] sm:text-[13px] text-center whitespace-nowrap data-[state=active]:text-[#0061e0] data-[state=completed]:text-[#10b981] data-[state=inactive]:text-gray-400">
                {st.title}
              </StepperTitle>
            </StepperTrigger>
            {index < steps.length - 1 && <StepperSeparator className="data-[state=completed]:bg-[#10b981] mx-2" />}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
