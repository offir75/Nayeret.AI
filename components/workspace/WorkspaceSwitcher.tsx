import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Lock, Building2, Heart, Plus, Settings2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace, WORKSPACE_TYPE_CONFIG, PERSONAL_WS_ID, type WorkspaceType } from '@/lib/context/workspace';
import { GroupManageDialog } from './GroupManageDialog';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const typeIcons: Record<WorkspaceType, typeof Lock> = {
  personal: Lock,
  family: Heart,
  business: Building2,
};

const newWsTypes: { type: WorkspaceType; emoji: string }[] = [
  { type: 'family', emoji: '👨‍👩‍👧' },
  { type: 'business', emoji: '🏢' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkspaceSwitcherProps {
  /** Pre-rendered avatar element (user's photo or initials) shown for personal workspace */
  avatarNode: ReactNode;
  /** Supabase user display name */
  userName: string;
  /** Supabase user email */
  userEmail: string;
  lang: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceSwitcher({ avatarNode, userName, userEmail, lang }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, activeId, setActiveWorkspaceId, createWorkspace, isPersonal } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WorkspaceType>('family');

  const ActiveIcon = typeIcons[activeWorkspace.type];
  const getTypeLabel = (type: WorkspaceType) =>
    lang === 'en' ? WORKSPACE_TYPE_CONFIG[type].en : WORKSPACE_TYPE_CONFIG[type].he;

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error(lang === 'en' ? 'Enter a group name' : 'הזן שם לקבוצה');
      return;
    }
    const emoji = newWsTypes.find(t => t.type === newType)?.emoji ?? '📁';
    createWorkspace(newName.trim(), newType, emoji);
    toast.success(lang === 'en' ? `Created "${newName.trim()}"` : `"${newName.trim()}" נוצרה`);
    setNewName('');
    setCreateOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group min-w-0 max-w-[200px] sm:max-w-none shrink-0">
            {/* Avatar: user photo/initials for personal, emoji for groups */}
            {isPersonal ? (
              <div className="shrink-0">{avatarNode}</div>
            ) : (
              <span className="text-base shrink-0">{activeWorkspace.emoji}</span>
            )}
            <div className="text-start min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                {isPersonal ? userName : activeWorkspace.name}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ActiveIcon className="w-3 h-3 shrink-0" />
                {getTypeLabel(activeWorkspace.type)}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors ms-1 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64 p-2">
          <AnimatePresence mode="wait">
            <motion.div key="list" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }} className="space-y-1">

              {workspaces.map(ws => {
                const Icon = typeIcons[ws.type];
                const isActive = ws.id === activeId;
                return (
                  <button key={ws.id}
                    onClick={() => { setActiveWorkspaceId(ws.id); setOpen(false); }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-start ${
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-foreground'
                    }`}>
                    {ws.type === 'personal' ? (
                      <div className="w-7 h-7 shrink-0">{avatarNode}</div>
                    ) : (
                      <span className="text-lg shrink-0">{ws.emoji}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ws.type === 'personal' ? userName : ws.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        {getTypeLabel(ws.type)}
                      </p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}

              <div className="h-px bg-border/50 my-1" />

              {/* Manage current group (non-personal only) */}
              {!isPersonal && (
                <button
                  onClick={() => { setOpen(false); setManageOpen(true); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 text-foreground transition-all text-start">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">
                    {lang === 'en' ? 'Manage group' : 'נהל קבוצה'}
                  </span>
                </button>
              )}

              {/* Create new group */}
              <button
                onClick={() => { setOpen(false); setCreateOpen(true); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 text-foreground transition-all text-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  {lang === 'en' ? 'New group' : 'קבוצה חדשה'}
                </span>
              </button>

            </motion.div>
          </AnimatePresence>
        </PopoverContent>
      </Popover>

      {/* Create Workspace Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {lang === 'en' ? 'Create New Group' : 'צור קבוצה חדשה'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{lang === 'en' ? 'Group name' : 'שם הקבוצה'}</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={lang === 'en' ? 'e.g. Ariel Family' : 'לדוגמה: משפחת אריאל'}
              />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'en' ? 'Type' : 'סוג'}</Label>
              <div className="grid grid-cols-2 gap-2">
                {newWsTypes.map(({ type, emoji }) => {
                  const Icon = typeIcons[type];
                  const selected = newType === type;
                  return (
                    <motion.button key={type} whileTap={{ scale: 0.97 }} onClick={() => setNewType(type)}
                      className={`p-3 rounded-xl border-2 transition-all text-center space-y-1 ${
                        selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'
                      }`}>
                      <span className="text-xl">{emoji}</span>
                      <p className={`text-xs font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
                        {getTypeLabel(type)}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              {lang === 'en' ? 'Create Group' : 'צור קבוצה'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Manage Dialog */}
      {!isPersonal && (
        <GroupManageDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          lang={lang}
          currentUserName={userName}
          currentUserEmail={userEmail}
        />
      )}
    </>
  );
}
