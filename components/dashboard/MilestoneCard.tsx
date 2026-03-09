import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, CheckCircle2, Sparkles, Shield, TrendingUp, FileText } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/lib/context/settings';
import type { TranslationKey } from '@/lib/vault/translations';
import { toast } from 'sonner';

interface MilestoneCardProps {
  documents: RichDoc[];
}

interface Milestone {
  id: string;
  count: number;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: React.ElementType;
  rewardKey: TranslationKey;
}

const milestonesDef: Milestone[] = [
  { id: 'first',     count: 1,  labelKey: 'milestoneFirst',     descKey: 'milestoneFirstDesc',     icon: FileText,   rewardKey: 'milestoneFirstReward'     },
  { id: 'starter',   count: 3,  labelKey: 'milestoneStarter',   descKey: 'milestoneStarterDesc',   icon: TrendingUp, rewardKey: 'milestoneStarterReward'   },
  { id: 'explorer',  count: 5,  labelKey: 'milestoneExplorer',  descKey: 'milestoneExplorerDesc',  icon: Sparkles,   rewardKey: 'milestoneExplorerReward'  },
  { id: 'protected', count: 8,  labelKey: 'milestoneProtected', descKey: 'milestoneProtectedDesc', icon: Shield,     rewardKey: 'milestoneProtectedReward' },
  { id: 'master',    count: 12, labelKey: 'milestoneMaster',    descKey: 'milestoneMasterDesc',    icon: Trophy,     rewardKey: 'milestoneMasterReward'    },
];

function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', '#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = (Math.random() - 0.5) * 300;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ backgroundColor: color, left: '50%', top: '40%' }}
      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{ opacity: 0, x, y: -120 + Math.random() * 240, rotate: rotation, scale: 0 }}
      transition={{ duration: 1.2 + Math.random() * 0.5, delay, ease: 'easeOut' }}
    />
  );
}

export function MilestoneCard({ documents }: MilestoneCardProps) {
  const { t, lang } = useLanguage();
  const docCount = documents.length;
  const prevCountRef = useRef(docCount);
  const [showConfetti, setShowConfetti] = useState(false);
  const [justAchieved, setJustAchieved] = useState<Milestone | null>(null);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = docCount;
    const newlyAchieved = milestonesDef.find((m) => prev < m.count && docCount >= m.count);
    if (newlyAchieved) {
      setJustAchieved(newlyAchieved);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setTimeout(() => setJustAchieved(null), 3500);

      if (newlyAchieved.id === 'master') {
        setTimeout(() => {
          toast.success(lang === 'en' ? '🏆 Achievement Unlocked!' : '🏆 הישג נפתח!', {
            description: lang === 'en' ? "All features unlocked — you're a document master!" : 'כל הפיצ׳רים נפתחו — אתה מאסטר מסמכים!',
            duration: 5000,
          });
        }, 3000);
      }
    }
  }, [docCount, lang]);

  const currentMilestoneIdx = milestonesDef.findIndex((m) => docCount < m.count);
  const currentMilestone = currentMilestoneIdx >= 0 ? milestonesDef[currentMilestoneIdx] : null;
  const allComplete = !currentMilestone;
  const prevMilestoneCount = currentMilestoneIdx > 0 ? milestonesDef[currentMilestoneIdx - 1].count : 0;
  const progressInRange = currentMilestone
    ? ((docCount - prevMilestoneCount) / (currentMilestone.count - prevMilestoneCount)) * 100
    : 100;

  if (allComplete && !justAchieved && !showConfetti) return null;

  return (
    <motion.div
      className="glass-card p-5 space-y-4 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle key={i} delay={i * 0.03} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {justAchieved && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="text-center space-y-2"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Trophy className="w-10 h-10 text-primary mx-auto" />
              </motion.div>
              <p className="text-lg font-bold text-foreground">{t(justAchieved.labelKey)}!</p>
              <p className="text-sm text-muted-foreground">🎁 {lang === 'he' ? 'נפתח:' : 'Unlocked:'} {t(justAchieved.rewardKey)}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t('yourJourney')}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{docCount} {t('documents')}</span>
      </div>

      <div className="flex items-center gap-1">
        {milestonesDef.map((m, i) => {
          const achieved = docCount >= m.count;
          const isCurrent = currentMilestoneIdx === i;
          const Icon = m.icon;
          return (
            <div key={m.id} className="flex items-center flex-1">
              <motion.div
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl border-2 transition-colors ${
                  achieved
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : isCurrent
                    ? 'bg-muted/50 border-primary/30 text-primary/60'
                    : 'bg-muted/30 border-border/50 text-muted-foreground/40'
                }`}
                initial={false}
                animate={achieved ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.4 }}
                title={`${t(m.labelKey)}: ${t(m.descKey)}`}
              >
                {achieved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span className={`absolute -bottom-1 -right-1 text-[9px] font-bold font-mono rounded-full w-4 h-4 flex items-center justify-center ${
                  achieved ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {m.count}
                </span>
              </motion.div>
              {i < milestonesDef.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors duration-500 ${
                  docCount >= milestonesDef[i + 1].count
                    ? 'bg-primary/40'
                    : docCount >= m.count
                    ? 'bg-primary/20'
                    : 'bg-border/40'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {currentMilestone ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('next')}: <span className="text-foreground font-medium">{t(currentMilestone.labelKey)}</span>
            </span>
            <span className="text-muted-foreground font-mono">
              {docCount}/{currentMilestone.count}
            </span>
          </div>
          <Progress value={progressInRange} className="h-1.5" />
          <p className="text-xs text-muted-foreground/80">
            🎁 {t('reward')}: <span className="text-primary font-medium">{t(currentMilestone.rewardKey)}</span>
          </p>
        </div>
      ) : (
        <motion.div
          className="flex items-center gap-2 text-sm py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">{t('allFeaturesUnlocked')}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
