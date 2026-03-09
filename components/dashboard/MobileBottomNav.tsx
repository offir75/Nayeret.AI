import { useRouter } from 'next/router';
import { ScanLine, LayoutDashboard, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/context/settings';

interface MobileBottomNavProps {
  onSettingsOpen: () => void;
  hasDocuments: boolean;
  canUpload: boolean;
}

export function MobileBottomNav({ onSettingsOpen, canUpload }: MobileBottomNavProps) {
  const router = useRouter();
  const { lang } = useLanguage();

  const isHome = router.pathname === '/';
  const isCapture = router.pathname === '/capture';

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {/* Home */}
        <button
          onClick={() => router.push('/')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
            isHome && !isCapture ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">{lang === 'en' ? 'Home' : 'בית'}</span>
        </button>

        {/* Scan — hero button */}
        {canUpload && (
          <button
            onClick={() => router.push('/capture')}
            className="relative -mt-5"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-primary text-primary-foreground">
              <ScanLine className="w-6 h-6" />
            </div>
            <span className={`block text-[10px] font-semibold mt-0.5 text-center ${
              isCapture ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {lang === 'en' ? 'Scan' : 'סרוק'}
            </span>
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onSettingsOpen}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-muted-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">{lang === 'en' ? 'Settings' : 'הגדרות'}</span>
        </button>
      </div>
    </motion.nav>
  );
}
