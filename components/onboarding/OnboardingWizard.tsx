import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntroStep } from './IntroStep';
import { TryItStep } from './TryItStep';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35 }}
            className="w-full h-full flex items-center justify-center"
          >
            <IntroStep onNext={() => setStep(1)} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div
            key="tryit"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="w-full h-full flex items-center justify-center"
          >
            <TryItStep onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
