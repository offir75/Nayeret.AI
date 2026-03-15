import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const REMINDER_OPTIONS = [
  { value: '0',  labelEn: 'No reminder',    labelHe: 'ללא תזכורת'   },
  { value: '1',  labelEn: '1 day before',   labelHe: 'יום לפני'     },
  { value: '3',  labelEn: '3 days before',  labelHe: '3 ימים לפני'  },
  { value: '7',  labelEn: '1 week before',  labelHe: 'שבוע לפני'    },
  { value: '14', labelEn: '2 weeks before', labelHe: 'שבועיים לפני' },
  { value: '30', labelEn: '1 month before', labelHe: 'חודש לפני'    },
];

const STORAGE_KEY = 'nayeret_doc_reminders';

interface DocReminderControlProps {
  docId: string;
  hasDueDate: boolean;
  lang: string;
}

export function DocReminderControl({ docId, hasDueDate, lang }: DocReminderControlProps) {
  const [value, setValue] = useState(() => {
    try {
      const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, string>;
      return map[docId] ?? '0';
    } catch { return '0'; }
  });

  if (!hasDueDate) return null;
  const active = value !== '0';

  const handleChange = (v: string) => {
    setValue(v);
    try {
      const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, string>;
      map[docId] = v;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
    toast.success(v === '0'
      ? (lang === 'en' ? 'Reminder removed' : 'תזכורת הוסרה')
      : (lang === 'en' ? 'Reminder set'     : 'תזכורת הוגדרה'));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {active ? <Bell className="w-3 h-3 text-primary" /> : <BellOff className="w-3 h-3" />}
        {lang === 'en' ? 'Reminder' : 'תזכורת'}
      </Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className={`bg-muted/50 border-border text-foreground ${active ? 'border-primary/40' : ''}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {REMINDER_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {lang === 'en' ? opt.labelEn : opt.labelHe}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
