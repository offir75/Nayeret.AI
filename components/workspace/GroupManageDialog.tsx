import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings2, Pencil, Trash2, UserPlus, Users, Shield, Edit3, Eye,
  MoreVertical, UserMinus, Send, AlertTriangle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useWorkspace, WORKSPACE_TYPE_CONFIG, type MemberRole,
} from '@/lib/context/workspace';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = 'members' | 'invite' | 'settings';

const roleIcons: Record<MemberRole, typeof Shield> = { admin: Shield, contributor: Edit3, viewer: Eye };
const roleLabels: Record<MemberRole, { he: string; en: string }> = {
  admin: { he: 'מנהל', en: 'Admin' },
  contributor: { he: 'תורם', en: 'Contributor' },
  viewer: { he: 'צופה', en: 'Viewer' },
};
const roleDescs: Record<MemberRole, { he: string; en: string }> = {
  admin: { he: 'שליטה מלאה', en: 'Full control' },
  contributor: { he: 'העלאה ועריכה', en: 'Upload & edit' },
  viewer: { he: 'צפייה בלבד', en: 'View only' },
};

const avatarColors = [
  'bg-primary/70 text-primary-foreground',
  'bg-yellow-500/70 text-white',
  'bg-purple-500/70 text-white',
  'bg-green-500/70 text-white',
  'bg-red-500/70 text-white',
];

const emojiOptions = ['👨‍👩‍👧', '👨‍👩‍👦‍👦', '👩‍👧‍👦', '🏠', '❤️', '🏢', '💼', '🚀', '⭐', '🎯', '📁', '🔒'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GroupManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  /** The current Supabase user's display name, shown as the first member */
  currentUserName: string;
  currentUserEmail: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GroupManageDialog({ open, onOpenChange, lang, currentUserName, currentUserEmail }: GroupManageDialogProps) {
  const {
    activeWorkspace, members, currentRole,
    updateMemberRole, removeMember, addMember, updateWorkspace, deleteWorkspace,
  } = useWorkspace();

  const [tab, setTab] = useState<Tab>('members');
  const [wsName, setWsName] = useState(activeWorkspace.name);
  const [wsEmoji, setWsEmoji] = useState(activeWorkspace.emoji);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('viewer');
  const [inviteSending, setInviteSending] = useState(false);

  const isAdmin = currentRole === 'admin';
  const isSettingsDirty = wsName !== activeWorkspace.name || wsEmoji !== activeWorkspace.emoji;
  const wsTypeLabel = lang === 'en'
    ? WORKSPACE_TYPE_CONFIG[activeWorkspace.type].en
    : WORKSPACE_TYPE_CONFIG[activeWorkspace.type].he;

  // Build combined member list: current user (always admin owner) + stored members
  const allDisplayMembers = [
    { userId: 'current', displayName: currentUserName, email: currentUserEmail, role: 'admin' as MemberRole },
    ...members.filter(m => m.email !== currentUserEmail),
  ];

  const handleSaveSettings = () => {
    if (!wsName.trim()) return;
    updateWorkspace(activeWorkspace.id, { name: wsName.trim(), emoji: wsEmoji });
    toast.success(lang === 'en' ? 'Group updated' : 'הקבוצה עודכנה');
  };

  const handleDelete = () => {
    deleteWorkspace(activeWorkspace.id);
    onOpenChange(false);
    toast.success(lang === 'en' ? 'Group deleted' : 'הקבוצה נמחקה');
  };

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error(lang === 'en' ? 'Enter a valid email' : 'נא להזין אימייל תקין');
      return;
    }
    setInviteSending(true);
    const trimmed = email.trim();
    const displayName = trimmed.split('@')[0];

    // Save member locally first
    addMember(trimmed, displayName, inviteRole);

    // Send invitation email
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: trimmed,
          inviterName: currentUserName,
          groupName: activeWorkspace.name,
          groupEmoji: activeWorkspace.emoji,
          role: lang === 'en' ? inviteRole : { admin: 'מנהל', contributor: 'תורם', viewer: 'צופה' }[inviteRole],
          lang,
        }),
      });
      const data = await res.json() as { sent?: boolean; reason?: string };
      if (data.sent) {
        toast.success(lang === 'en' ? `Invitation sent to ${trimmed}` : `הזמנה נשלחה ל-${trimmed}`);
      } else {
        // Saved locally but email skipped (e.g. no API key configured)
        toast.success(lang === 'en' ? `${trimmed} added to group` : `${trimmed} נוסף/ה לקבוצה`);
      }
    } catch {
      toast.success(lang === 'en' ? `${trimmed} added to group` : `${trimmed} נוסף/ה לקבוצה`);
    } finally {
      setInviteSending(false);
    }

    setEmail('');
    setInviteRole('viewer');
    setTab('members');
  };

  const tabs: { key: Tab; labelHe: string; labelEn: string; icon: typeof Users }[] = [
    { key: 'members', labelHe: 'חברים', labelEn: 'Members', icon: Users },
    { key: 'invite', labelHe: 'הזמן', labelEn: 'Invite', icon: UserPlus },
    { key: 'settings', labelHe: 'הגדרות', labelEn: 'Settings', icon: Settings2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 w-[95vw] sm:w-auto">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">{activeWorkspace.emoji}</span>
            <div>
              <p className="text-lg font-bold text-foreground">{activeWorkspace.name}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {wsTypeLabel} · {allDisplayMembers.length} {lang === 'en' ? 'members' : 'חברים'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border/50 px-4 sm:px-6 shrink-0 overflow-x-auto">
          {tabs.map(t => {
            if (t.key !== 'members' && !isAdmin) return null;
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px] whitespace-nowrap ${
                  active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {lang === 'en' ? t.labelEn : t.labelHe}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
          <AnimatePresence mode="wait">

            {/* Members tab */}
            {tab === 'members' && (
              <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-1">
                {allDisplayMembers.map((member, i) => {
                  const Icon = roleIcons[member.role];
                  const isMe = member.userId === 'current';
                  const canManage = isAdmin && !isMe;
                  return (
                    <div key={member.userId}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                        {getInitials(member.displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{member.displayName}</span>
                          {isMe && <span className="text-[10px] text-muted-foreground">({lang === 'en' ? 'you' : 'אני'})</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Icon className="w-3 h-3" />
                          {lang === 'en' ? roleLabels[member.role].en : roleLabels[member.role].he}
                          <span className="text-border">·</span>
                          <span dir="ltr">{member.email}</span>
                        </div>
                      </div>
                      {canManage && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48 p-1">
                            {(['admin', 'contributor', 'viewer'] as MemberRole[])
                              .filter(r => r !== member.role)
                              .map(r => {
                                const RIcon = roleIcons[r];
                                return (
                                  <button key={r} onClick={() => {
                                    updateMemberRole(member.userId, r);
                                    toast.success(lang === 'en'
                                      ? `Changed to ${roleLabels[r].en}`
                                      : `שונה ל${roleLabels[r].he}`);
                                  }}
                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors">
                                    <RIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                    {lang === 'en' ? `Make ${roleLabels[r].en}` : `הפוך ל${roleLabels[r].he}`}
                                  </button>
                                );
                              })}
                            <div className="h-px bg-border/50 my-1" />
                            <button onClick={() => {
                              removeMember(member.userId);
                              toast.success(lang === 'en'
                                ? `Removed ${member.displayName}`
                                : `${member.displayName} הוסר/ה`);
                            }}
                              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors">
                              <UserMinus className="w-3.5 h-3.5" />
                              {lang === 'en' ? 'Remove from group' : 'הסר מהקבוצה'}
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  );
                })}
                {isAdmin && (
                  <button onClick={() => setTab('invite')}
                    className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all mt-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {lang === 'en' ? 'Invite new member' : 'הזמן חבר/ה חדש/ה'}
                    </span>
                  </button>
                )}
              </motion.div>
            )}

            {/* Invite tab */}
            {tab === 'invite' && isAdmin && (
              <motion.div key="invite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
                <div className="space-y-2">
                  <Label>{lang === 'en' ? 'Email address' : 'כתובת אימייל'}</Label>
                  <Input type="email" dir="ltr"
                    placeholder={lang === 'en' ? 'colleague@company.com' : 'friend@email.com'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'en' ? 'Role' : 'תפקיד'}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'contributor', 'viewer'] as MemberRole[]).map(key => {
                      const Icon = roleIcons[key];
                      const isSelected = inviteRole === key;
                      return (
                        <motion.button key={key} whileTap={{ scale: 0.97 }} onClick={() => setInviteRole(key)}
                          className={`p-3 rounded-xl border-2 transition-all text-center space-y-1 ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'
                          }`}>
                          <Icon className={`w-5 h-5 mx-auto ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {lang === 'en' ? roleLabels[key].en : roleLabels[key].he}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {lang === 'en' ? roleDescs[key].en : roleDescs[key].he}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={handleInvite} disabled={inviteSending} className="w-full gap-2">
                  {inviteSending ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {inviteSending
                    ? (lang === 'en' ? 'Sending…' : 'שולח…')
                    : (lang === 'en' ? 'Send Invitation' : 'שלח הזמנה')}
                </Button>
              </motion.div>
            )}

            {/* Settings tab */}
            {tab === 'settings' && isAdmin && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{lang === 'en' ? 'Group name' : 'שם הקבוצה'}</Label>
                    <Input value={wsName} onChange={e => setWsName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === 'en' ? 'Icon' : 'אייקון'}</Label>
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <button className="w-14 h-14 rounded-xl border-2 border-border/50 hover:border-primary/30 flex items-center justify-center text-2xl transition-colors">
                          {wsEmoji}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3">
                        <div className="grid grid-cols-6 gap-2">
                          {emojiOptions.map(e => (
                            <button key={e} onClick={() => { setWsEmoji(e); setShowEmojiPicker(false); }}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-muted/50 transition-colors ${
                                e === wsEmoji ? 'bg-primary/10 ring-2 ring-primary/30' : ''
                              }`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={!isSettingsDirty} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    {lang === 'en' ? 'Save Changes' : 'שמור שינויים'}
                  </Button>
                </div>

                {/* Danger zone */}
                <div className="border-t border-border/50 pt-5 space-y-3">
                  <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {lang === 'en' ? 'Danger Zone' : 'אזור מסוכן'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'en'
                      ? "Deleting this group will remove all shared access. Documents will remain in their owners' personal vaults."
                      : 'מחיקת הקבוצה תסיר את הגישה המשותפת. המסמכים יישארו בכספת האישית של הבעלים.'}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2">
                        <Trash2 className="w-4 h-4" />
                        {lang === 'en' ? 'Delete Group' : 'מחק קבוצה'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {lang === 'en' ? `Delete "${activeWorkspace.name}"?` : `למחוק את "${activeWorkspace.name}"?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {lang === 'en'
                            ? 'This action cannot be undone. All members will lose access to shared documents in this group.'
                            : 'פעולה זו אינה ניתנת לביטול. כל החברים יאבדו גישה למסמכים המשותפים בקבוצה זו.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{lang === 'en' ? 'Cancel' : 'ביטול'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {lang === 'en' ? 'Delete' : 'מחק'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
