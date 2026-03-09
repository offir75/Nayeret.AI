import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Globe, Bell, Mail, Clock, CalendarCheck, FileText, Zap, CalendarIcon, LogOut, Eye, EyeOff, Coins, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from 'next-themes';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage, useSettings } from '@/lib/context/settings';
import { toast } from 'sonner';
import { supabase } from '@/supabase/browser';
import type { User } from '@supabase/supabase-js';

interface AlertPrefs {
  before3: boolean;
  before7: boolean;
  before14: boolean;
  before30: boolean;
  onDue: boolean;
  overdue: boolean;
  newDoc: boolean;
  weeklyDigest: boolean;
  urgentOnly: boolean;
  customDate: string | null;
}

const defaultAlerts: AlertPrefs = {
  before3: true, before7: true, before14: false, before30: false,
  onDue: true, overdue: true, newDoc: true, weeklyDigest: false, urgentOnly: false,
  customDate: null,
};

function loadAlerts(): AlertPrefs {
  try { const s = localStorage.getItem('nayeret_alert_prefs'); return s ? { ...defaultAlerts, ...JSON.parse(s) } : defaultAlerts; }
  catch { return defaultAlerts; }
}

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export function SettingsDrawer({ open, onClose, user, onLogout }: SettingsDrawerProps) {
  const { lang, setLang, t, isRtl } = useLanguage();
  const { privacyMode, setPrivacyMode, currency, setCurrency } = useSettings();
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';
  const setDark = (v: boolean) => setTheme(v ? 'dark' : 'light');
  const [reminders, setReminders] = useState(() => {
    try { return localStorage.getItem('nayeret_reminders') !== 'false'; }
    catch { return true; }
  });
  const [alerts, setAlerts] = useState<AlertPrefs>(loadAlerts);

  useEffect(() => {
    try {
      localStorage.setItem('nayeret_reminders', reminders ? 'true' : 'false');
    } catch {}
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem('nayeret_alert_prefs', JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  const toggleAlert = (key: keyof AlertPrefs) => {
    setAlerts((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast.success(next[key]
        ? (lang === 'en' ? 'Alert enabled' : 'התראה הופעלה')
        : (lang === 'en' ? 'Alert disabled' : 'התראה הושבתה'));
      return next;
    });
  };

  const AlertRow = ({ label, checked, onToggle, icon: Icon }: { label: string; checked: boolean; onToggle: () => void; icon: typeof Clock }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-3.5 h-3.5 ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );

  const userEmail = user?.email ?? user?.user_metadata?.email ?? '';

  const [taxPeriod, setTaxPeriodState] = useState<'yearly' | 'monthly'>(() => {
    try { return (localStorage.getItem('nayeret_tax_period') as 'yearly' | 'monthly') || 'yearly'; }
    catch { return 'yearly'; }
  });
  const setTaxPeriod = (p: 'yearly' | 'monthly') => {
    setTaxPeriodState(p);
    try { localStorage.setItem('nayeret_tax_period', p); } catch {}
  };

  const handleChangePassword = async () => {
    if (!userEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to send reset email' : 'שגיאה בשליחת מייל איפוס');
    } else {
      toast.success(lang === 'en' ? 'Password reset email sent' : 'מייל איפוס סיסמה נשלח');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={isRtl ? 'left' : 'right'} className="w-full sm:w-[400px] bg-card border-border overflow-y-auto p-0">
        <div className="p-6 pe-12 space-y-6">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t('settings')}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{t('settingsSubtitle')}</p>
          </SheetHeader>

          {/* Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Globe className="w-4 h-4 text-primary" />{t('language')}
            </div>
            <div className="flex gap-2">
              {(['he', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    lang === l ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                  }`}>
                  {l === 'he' ? t('hebrew') : t('english')}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Appearance — theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {dark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              {t('appearance')}
            </div>
            <div className="flex items-center justify-between glass-card p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${dark ? 'bg-primary/10' : 'bg-muted/50'}`}>
                  {dark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{dark ? t('darkMode') : t('lightMode')}</p>
                  <p className="text-[11px] text-muted-foreground">{dark ? t('darkModeDesc') : t('lightModeDesc')}</p>
                </div>
              </div>
              <Switch checked={dark} onCheckedChange={setDark} />
            </div>
          </div>

          <Separator />

          {/* Privacy Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Eye className="w-4 h-4 text-primary" />{t('privacy')}
            </div>
            <div
              className="flex items-center justify-between glass-card p-4 rounded-xl cursor-pointer"
              onClick={() => setPrivacyMode(!privacyMode)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${privacyMode ? 'bg-primary/10' : 'bg-muted/50'}`}>
                  {privacyMode
                    ? <EyeOff className="w-4 h-4 text-primary" />
                    : <Eye    className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('privacy')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('privacyDesc')}</p>
                </div>
              </div>
              <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} />
            </div>
          </div>

          <Separator />

          {/* Currency Display */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Coins className="w-4 h-4 text-primary" />{t('currency')}
            </div>
            <div className="flex gap-2">
              {(['ILS', 'USD'] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    currency === c
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                  }`}>
                  {c === 'ILS' ? t('ils') : t('usd')}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{t('currencyDesc')}</p>
          </div>

          <Separator />

          {/* Tax Reporting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Receipt className="w-4 h-4 text-primary" />{t('taxReporting')}
            </div>
            <div className="flex gap-2">
              {(['yearly', 'monthly'] as const).map((period) => (
                <button key={period} onClick={() => setTaxPeriod(period)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    taxPeriod === period
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                  }`}>
                  {period === 'yearly' ? t('taxPeriodYearly') : t('taxPeriodMonthly')}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Account */}
          {userEmail && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Mail className="w-4 h-4 text-primary" />{t('account')}
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('email')}</Label>
                    <Input value={userEmail} readOnly className="bg-muted/30 border-border text-foreground text-sm h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('password')}</Label>
                    <Input type="password" value="••••••••" readOnly className="bg-muted/30 border-border text-foreground text-sm h-10" />
                    <button onClick={handleChangePassword} className="text-xs text-primary hover:underline transition-colors">
                      {t('changePassword')}
                    </button>
                  </div>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-1.5 text-xs text-destructive hover:underline font-medium transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      {lang === 'en' ? 'Sign out' : 'יציאה מהחשבון'}
                    </button>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Smart Reminders Toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bell className="w-4 h-4 text-primary" />{t('notifications')}
            </div>
            <div className="flex items-center justify-between glass-card p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${reminders ? 'bg-primary/10' : 'bg-muted/50'}`}>
                  <Bell className={`w-4 h-4 ${reminders ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('smartReminders')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('smartRemindersDesc')}</p>
                </div>
              </div>
              <Switch checked={reminders} onCheckedChange={setReminders} />
            </div>
          </div>

          {reminders && (
            <>
              <Separator />

              {/* Due Date Alerts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarCheck className="w-4 h-4 text-primary" />{t('dueDateAlerts')}
                </div>
                <div className="glass-card rounded-xl p-4 space-y-1">
                  <AlertRow icon={Clock} label={t('alertBefore3Days')}  checked={alerts.before3}  onToggle={() => toggleAlert('before3')} />
                  <AlertRow icon={Clock} label={t('alertBefore7Days')}  checked={alerts.before7}  onToggle={() => toggleAlert('before7')} />
                  <AlertRow icon={Clock} label={t('alertBefore14Days')} checked={alerts.before14} onToggle={() => toggleAlert('before14')} />
                  <AlertRow icon={Clock} label={t('alertBefore30Days')} checked={alerts.before30} onToggle={() => toggleAlert('before30')} />
                  <Separator className="my-1" />
                  <AlertRow icon={Bell} label={t('alertOnDueDate')} checked={alerts.onDue}     onToggle={() => toggleAlert('onDue')} />
                  <AlertRow icon={Zap}  label={t('alertOverdue')}   checked={alerts.overdue}  onToggle={() => toggleAlert('overdue')} />
                  <Separator className="my-1" />
                  {/* Custom date alert */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5">
                      <CalendarIcon className={`w-3.5 h-3.5 ${alerts.customDate ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm text-foreground">{lang === 'en' ? 'Custom date' : 'תאריך מותאם'}</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5 px-2.5', !alerts.customDate && 'text-muted-foreground')}>
                          <CalendarIcon className="w-3 h-3" />
                          {alerts.customDate ? format(new Date(alerts.customDate), 'dd/MM/yyyy') : (lang === 'en' ? 'Pick date' : 'בחר תאריך')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end" side="top">
                        <Calendar
                          mode="single"
                          selected={alerts.customDate ? new Date(alerts.customDate) : undefined}
                          onSelect={(date) => {
                            setAlerts((prev) => ({ ...prev, customDate: date ? date.toISOString() : null }));
                            toast.success(date
                              ? (lang === 'en' ? `Alert set for ${format(date, 'dd/MM/yyyy')}` : `התראה נקבעה ל-${format(date, 'dd/MM/yyyy')}`)
                              : (lang === 'en' ? 'Custom alert removed' : 'התראה מותאמת הוסרה'));
                          }}
                          disabled={(date) => date < new Date()}
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <Separator />

              {/* General Alerts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="w-4 h-4 text-primary" />{t('generalAlerts')}
                </div>
                <div className="glass-card rounded-xl p-4 space-y-1">
                  <AlertRow icon={FileText} label={t('newDocScanned')}   checked={alerts.newDoc}       onToggle={() => toggleAlert('newDoc')} />
                  <AlertRow icon={Mail}     label={t('weeklyDigest')}     checked={alerts.weeklyDigest} onToggle={() => toggleAlert('weeklyDigest')} />
                  <AlertRow icon={Zap}      label={t('urgentDocsOnly')}   checked={alerts.urgentOnly}   onToggle={() => toggleAlert('urgentOnly')} />
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
