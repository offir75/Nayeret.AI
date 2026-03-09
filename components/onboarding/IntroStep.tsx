import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/context/settings';

interface IntroStepProps {
  onNext: () => void;
}

export const IntroStep = ({ onNext }: IntroStepProps) => {
  const { t, isRtl } = useLanguage();
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        <div className="absolute -inset-16 bg-gradient-radial from-background via-background/95 to-background/70 rounded-full -z-10" />
        <motion.h1 className="text-3xl font-bold text-foreground mb-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          {t('welcomeTo')}
        </motion.h1>
        <motion.p className="text-muted-foreground text-base mb-2 leading-relaxed" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
          {t('welcomeDesc')}
        </motion.p>
        <motion.p className="text-muted-foreground/60 text-sm mb-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}>
          {t('welcomeSubDesc')}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}>
          <Button onClick={onNext} className="h-13 px-10 text-base gap-2 shadow-lg">
            <Arrow className="w-4 h-4" />
            {t('letsStart')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
