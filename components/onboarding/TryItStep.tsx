import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Banknote, Calendar, Zap, CheckCircle2, Upload, Camera, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/lib/context/settings';
import { CurrencyAmount } from '@/components/ui/currency-amount';

interface TryItStepProps { onComplete: () => void; }
type Phase = 'idle' | 'scanning' | 'done' | 'uploading' | 'uploaded';

const fadeVariants = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };
const fadeTrans = { duration: 0.35, ease: 'easeInOut' as const };

export const TryItStep = ({ onComplete }: TryItStepProps) => {
  const { t, isRtl } = useLanguage();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const handleScan = () => { setPhase('scanning'); setTimeout(() => setPhase('done'), 2200); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    setFileName(file.name); setPhase('uploading'); setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => { progress += 2; setUploadProgress(Math.min(progress, 100)); if (progress >= 100) { clearInterval(interval); setTimeout(() => setPhase('uploaded'), 300); } }, 50);
  };

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-md w-full">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
      <motion.p className="text-muted-foreground text-sm mb-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>{t('seeHowItWorks')}</motion.p>
      <AnimatePresence mode="wait">
        {(phase === 'idle' || phase === 'scanning') && <motion.p key="s1" className="text-muted-foreground/60 text-xs mb-6" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>{t('scanSampleOrUpload')}</motion.p>}
        {phase === 'done' && <motion.p key="s2" className="text-muted-foreground/60 text-xs mb-6" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>{t('nowYourTurn')}</motion.p>}
        {phase === 'uploading' && <motion.p key="s3" className="text-muted-foreground/60 text-xs mb-6" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>{t('processingYourDoc')}</motion.p>}
        {phase === 'uploaded' && <motion.p key="s4" className="text-muted-foreground/60 text-xs mb-6" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>{t('allReadyOnboarding')}</motion.p>}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" className="flex flex-col items-center w-full" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>
            <FakeDocCard />
            <div className="flex flex-col gap-3 w-full mt-6">
              <Button onClick={handleScan} className="h-12 text-base gap-2 w-full"><ScanLine className="w-4 h-4" />{t('scanSample')}</Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-11 text-sm gap-2 w-full"><Upload className="w-4 h-4" />{t('orUploadReal')}</Button>
            </div>
          </motion.div>
        )}
        {phase === 'scanning' && (
          <motion.div key="scanning" className="flex flex-col items-center w-full" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>
            <div className="relative w-72 rounded-2xl border-2 border-border bg-card overflow-hidden">
              <FakeDocContent />
              <motion.div className="absolute inset-0 bg-primary/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.div className="absolute inset-x-0 h-[3px] bg-gradient-to-l from-transparent via-primary to-transparent shadow-[0_0_16px_3px_hsl(var(--primary)/0.4)]"
                  animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 1.6, repeat: 1, ease: 'easeInOut' }} />
              </motion.div>
            </div>
            <p className="text-sm text-muted-foreground animate-pulse mt-6">{t('scanning')}</p>
          </motion.div>
        )}
        {phase === 'done' && (
          <motion.div key="done" className="flex flex-col items-center w-full" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>
            <motion.div className="flex items-center justify-center gap-2 mb-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}>
              <CheckCircle2 className="w-5 h-5 text-primary" /><span className="text-sm font-semibold text-primary">{t('identifiedBill')}</span>
            </motion.div>
            <div className="flex gap-3 justify-center mb-6">
              <motion.div className="glass-card px-4 py-3 flex items-center gap-2" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}>
                <Banknote className="w-4 h-4 text-primary" /><CurrencyAmount value="487.30" currency="ILS" className="font-bold text-foreground text-sm" />
              </motion.div>
              <motion.div className="glass-card px-4 py-3 flex items-center gap-2" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.35 }}>
                <Calendar className="w-4 h-4 text-primary" /><span className="font-mono text-foreground text-sm">15/03/2026</span>
              </motion.div>
            </div>
            <motion.div className="flex flex-col gap-3 w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.35 }}>
              <Button onClick={() => void router.push('/capture')} className="h-12 text-base gap-2 w-full"><Camera className="w-4 h-4" />{t('captureOrUpload')}</Button>
              <Button onClick={onComplete} variant="ghost" className="h-10 text-sm text-muted-foreground w-full">{t('maybeLater')}</Button>
            </motion.div>
          </motion.div>
        )}
        {phase === 'uploading' && (
          <motion.div key="uploading" className="flex flex-col items-center w-full" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>
            <motion.div className="relative w-32 h-40 mb-6">
              <div className="absolute inset-0 rounded-xl border-2 border-primary/30 bg-card/40" />
              <motion.div className="absolute inset-x-0 h-[2px] rounded-full shadow-[0_0_12px_2px_hsl(var(--primary)/0.5)] bg-gradient-to-l from-transparent via-primary to-transparent"
                animate={{ top: ['8%', '92%', '8%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
              <div className="absolute inset-0 flex items-center justify-center"><ScanLine className="w-8 h-8 text-primary/60" /></div>
            </motion.div>
            <p className="text-sm font-medium text-foreground mb-1 truncate max-w-[250px]">{fileName}</p>
            <div className="w-full max-w-xs mt-3"><Progress value={uploadProgress} className="h-1.5" /></div>
            <p className="text-xs text-muted-foreground mt-2">{uploadProgress}%</p>
          </motion.div>
        )}
        {phase === 'uploaded' && (
          <motion.div key="uploaded" className="flex flex-col items-center w-full" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTrans}>
            <motion.div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </motion.div>
            <p className="text-lg font-bold text-foreground mb-1">{t('docCaptured')}</p>
            <p className="text-sm text-muted-foreground mb-6">{t('findItInDashboard')}</p>
            <Button onClick={onComplete} className="h-12 px-8 text-base gap-2"><Arrow className="w-4 h-4" />{t('toMyDashboard')}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FakeDocContent = () => {
  const { t } = useLanguage();
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="w-4 h-4 text-primary" /></div>
        <p className="text-xs font-semibold text-muted-foreground">{t('electricCompany')}</p>
      </div>
      <div className="h-px bg-border" />
      <div className="space-y-2">
        <div className="flex justify-between"><span className="text-xs text-muted-foreground/60">{t('billDate')}</span><span className="text-xs text-foreground">01/02/2026</span></div>
        <div className="flex justify-between"><span className="text-xs text-muted-foreground/60">{t('amountToPay')}</span><CurrencyAmount value="487.30" currency="ILS" className="text-sm font-bold text-foreground" /></div>
        <div className="flex justify-between"><span className="text-xs text-muted-foreground/60">{t('lastPayDate')}</span><span className="text-xs text-foreground">15/03/2026</span></div>
      </div>
      <div className="space-y-1.5 pt-2"><div className="h-2 rounded bg-muted w-full" /><div className="h-2 rounded bg-muted w-4/5" /><div className="h-2 rounded bg-muted w-3/5" /></div>
    </div>
  );
};

const FakeDocCard = () => (<div className="relative w-72 rounded-2xl border-2 border-border bg-card overflow-hidden"><FakeDocContent /></div>);
