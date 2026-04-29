import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Save, Upload, Trash2, RefreshCw, Plus, Pencil, Check, X, FolderOpen, FilePlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useGameStore } from '../data/GameStore';
import { useAuth } from '../auth/AuthContext';
import { useBackgroundAccent } from '../theme/BackgroundAccentContext';

/**
 * CEF functions required (on window):
 *
 * getSaveSlots(recompName: string): string[]
 *   — Returns an array of save slot folder names from launcher/games/<recompName>/saves/
 *
 * backupSave(recompName: string, saveName: string): boolean
 *   — Copies documents/<recompName>/ → launcher/games/<recompName>/saves/<saveName>/
 *     Returns true on success.
 *
 * restoreSave(recompName: string, saveName: string): boolean
 *   — Copies launcher/games/<recompName>/saves/<saveName>/ → documents/<recompName>/
 *     Returns true on success.
 *
 * deleteSave(recompName: string, saveName: string): boolean
 *   — Deletes the folder launcher/games/<recompName>/saves/<saveName>/
 *     Returns true on success.
 *
 * deleteCurrentSave(recompName: string): boolean
 *   — Deletes the live save data at documents/<recompName>/ so that the next
 *     launch starts from a fresh save. Returns true on success.
 *
 * renameSave(recompName: string, oldName: string, newName: string): boolean
 *   — Renames a save folder. Returns true on success.
 *
 * getSaveSlotCount(recompName: string): number
 *   — Returns the number of folders in launcher/games/<recompName>/saves/
 *
 * getActiveSave(recompName: string): string
 *   — Returns the name of the currently loaded save slot (empty string if none / default).
 */

interface SaveSlot {
  name: string;
}

export function SaveManager() {
  const { recompName } = useParams<{ recompName: string }>();
  const { games } = useGameStore();
  const { user } = useAuth();
  const { setAccentColor } = useBackgroundAccent();

  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [activeSave, setActiveSave] = useState<string>('');
  const [newSaveName, setNewSaveName] = useState('');
  const [renamingSlot, setRenamingSlot] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const messageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const game = games.find(g => g.recompName.toLowerCase() === (recompName ?? '').toLowerCase());
  const isInCEF = !!(window as any).getSaveSlots;

  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  const refreshSlots = useCallback(() => {
    if (!recompName || !isInCEF) return;
    const w = window as any;
    const names: string[] = w.getSaveSlots(recompName) ?? [];
    setSlots(names.map(name => ({ name })));
    setActiveSave(w.getActiveSave ? w.getActiveSave(recompName) ?? '' : '');
  }, [recompName, isInCEF]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  // Drive the global theme background's accent color from the current game.
  useEffect(() => {
    setAccentColor(game?.accentColor);
    return () => setAccentColor(undefined);
  }, [game?.accentColor, setAccentColor]);

  const handleBackup = useCallback(() => {
    if (!recompName || !newSaveName.trim()) return;
    setLoading(true);
    try {
      const ok = (window as any).backupSave(recompName, newSaveName.trim());
      if (ok) {
        showMessage(`Saved "${newSaveName.trim()}" successfully`, 'success');
        setNewSaveName('');
        refreshSlots();
      } else {
        showMessage('Backup failed', 'error');
      }
    } catch {
      showMessage('Backup failed', 'error');
    }
    setLoading(false);
  }, [recompName, newSaveName, refreshSlots, showMessage]);

  const handleRestore = useCallback((slotName: string) => {
    if (!recompName) return;
    setLoading(true);
    try {
      const ok = (window as any).restoreSave(recompName, slotName);
      if (ok) {
        showMessage(`Loaded "${slotName}"`, 'success');
        setActiveSave(slotName);
      } else {
        showMessage('Restore failed', 'error');
      }
    } catch {
      showMessage('Restore failed', 'error');
    }
    setLoading(false);
  }, [recompName, showMessage]);

  const handleDelete = useCallback((slotName: string) => {
    if (!recompName) return;
    setLoading(true);
    try {
      const ok = (window as any).deleteSave(recompName, slotName);
      if (ok) {
        showMessage(`Deleted "${slotName}"`, 'success');
        refreshSlots();
      } else {
        showMessage('Delete failed', 'error');
      }
    } catch {
      showMessage('Delete failed', 'error');
    }
    setLoading(false);
  }, [recompName, refreshSlots, showMessage]);

  const handleCreateNewSave = useCallback((backupFirst: boolean) => {
    if (!recompName) return;
    const w = window as any;
    const trimmed = createName.trim();
    if (backupFirst && !trimmed) return;
    setLoading(true);
    try {
      if (backupFirst) {
        const backed = w.backupSave ? w.backupSave(recompName, trimmed) : false;
        if (!backed) {
          showMessage('Backup failed — current save was not deleted', 'error');
          setLoading(false);
          return;
        }
      }
      const deleted = w.deleteCurrentSave ? w.deleteCurrentSave(recompName) : false;
      if (deleted) {
        showMessage(
          backupFirst
            ? `Backed up as "${trimmed}" and cleared current save`
            : 'Current save discarded — a new save will be created on next launch',
          'success',
        );
        setCreateOpen(false);
        setCreateName('');
        refreshSlots();
      } else {
        showMessage('Failed to delete current save', 'error');
      }
    } catch {
      showMessage('Failed to create new save', 'error');
    }
    setLoading(false);
  }, [recompName, createName, refreshSlots, showMessage]);

  const handleRename = useCallback((oldName: string) => {
    if (!recompName || !renameValue.trim() || renameValue.trim() === oldName) {
      setRenamingSlot(null);
      return;
    }
    setLoading(true);
    try {
      const ok = (window as any).renameSave(recompName, oldName, renameValue.trim());
      if (ok) {
        showMessage(`Renamed to "${renameValue.trim()}"`, 'success');
        refreshSlots();
      } else {
        showMessage('Rename failed', 'error');
      }
    } catch {
      showMessage('Rename failed', 'error');
    }
    setRenamingSlot(null);
    setLoading(false);
  }, [recompName, renameValue, refreshSlots, showMessage]);

  return (
    <div className="flex h-screen flex-col relative" style={{ backgroundColor: 'var(--theme-page-bg)' }}>
      {/* Top bar */}
      <div
        className="h-16 border-b flex items-center px-6 gap-4 relative z-20 shrink-0"
        style={{ backgroundColor: 'var(--theme-topbar-bg)', borderColor: 'var(--theme-border)', backdropFilter: 'var(--theme-backdrop-blur)', WebkitBackdropFilter: 'var(--theme-backdrop-blur)' }}
      >
        <Link to={game ? `/library/${game.recompName}` : '/library'}>
          <Button variant="ghost" size="icon" className="shrink-0" style={{ color: 'var(--theme-text-primary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold truncate flex-1 min-w-0" style={{ color: 'var(--theme-text-primary)' }}>
          Save Manager {game ? `— ${game.title}` : ''}
        </h1>
        {isInCEF && recompName && (window as any).openSaveFolder && (
          <Button
            variant="ghost"
            onClick={() => (window as any).openSaveFolder(recompName)}
            className="shrink-0 gap-2"
            style={{ color: 'var(--theme-text-primary)' }}
            title="Open save folder in file explorer"
          >
            <FolderOpen className="w-4 h-4" />
            Open Save Folder
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto p-8 relative z-10">
          {!isInCEF ? (
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--theme-card-bg)', backdropFilter: 'var(--theme-backdrop-blur)', WebkitBackdropFilter: 'var(--theme-backdrop-blur)' }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--theme-text-muted)' }} />
              <p className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Launcher Required</p>
              <p style={{ color: 'var(--theme-text-muted)' }}>Save management is only available in the desktop launcher.</p>
            </div>
          ) : (
            <>
              {/* Status message */}
              {message && (
                <div
                  className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Create new save */}
              <div
                className="p-6 rounded-lg shadow mb-6"
                style={{ backgroundColor: 'var(--theme-card-bg)', backdropFilter: 'var(--theme-backdrop-blur)', WebkitBackdropFilter: 'var(--theme-backdrop-blur)' }}
              >
                <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--theme-text-primary)' }}>
                  <Plus className="w-5 h-5 inline mr-2" />
                  Backup Current Save
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
                  Copies your current save data into a new save slot.
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Save name..."
                    value={newSaveName}
                    onChange={(e) => setNewSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBackup()}
                    className="flex-1"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                    disabled={loading}
                  />
                  <Button
                    onClick={handleBackup}
                    disabled={loading || !newSaveName.trim()}
                    className="bg-[#5c7e10] hover:bg-[#78a00f] text-white px-6"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Backup
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--theme-border)' }}>
                  <p className="text-sm font-semibold min-w-0" style={{ color: 'var(--theme-text-primary)' }}>Start a fresh save</p>
                  <Button
                    onClick={() => { setCreateName(''); setCreateOpen(true); }}
                    disabled={loading}
                    className="shrink-0 gap-2 bg-[#d97706] hover:bg-[#f59e0b] text-white border-0"
                  >
                    <FilePlus className="w-4 h-4" />
                    Create New Save
                  </Button>
                </div>
              </div>

              {/* Create-new-save dialog */}
              <Dialog open={createOpen} onOpenChange={(o) => { if (!loading) setCreateOpen(o); }}>
                <DialogContent
                  className="sm:max-w-md"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                >
                  <DialogHeader>
                    <DialogTitle style={{ color: 'var(--theme-text-primary)' }}>Create New Save</DialogTitle>
                    <DialogDescription style={{ color: 'var(--theme-text-muted)' }}>
                      Name a backup of your current save, or discard it. Either way, the live save
                      will be cleared so the game starts fresh on the next launch.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <Input
                      placeholder="Backup name..."
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && createName.trim()) handleCreateNewSave(true);
                      }}
                      autoFocus
                      style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                      disabled={loading}
                    />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setCreateOpen(false)}
                      disabled={loading}
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmDiscardOpen(true)}
                      disabled={loading}
                      className="gap-2 bg-[#b91c1c] hover:bg-[#dc2626] text-white border-0"
                      title="Delete the current save without backing it up"
                    >
                      <Trash2 className="w-4 h-4" />
                      Discard Save
                    </Button>
                    <Button
                      onClick={() => handleCreateNewSave(true)}
                      disabled={loading || !createName.trim()}
                      className="bg-[#5c7e10] hover:bg-[#78a00f] text-white gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Backup &amp; Reset
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Confirm discard dialog */}
              <Dialog open={confirmDiscardOpen} onOpenChange={(o) => { if (!loading) setConfirmDiscardOpen(o); }}>
                <DialogContent
                  className="sm:max-w-md"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                >
                  <DialogHeader>
                    <DialogTitle style={{ color: 'var(--theme-text-primary)' }}>Discard current save?</DialogTitle>
                    <DialogDescription style={{ color: 'var(--theme-text-muted)' }}>
                      This will permanently delete your current save without creating a backup.
                      Are you sure you want to continue?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDiscardOpen(false)}
                      disabled={loading}
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => { setConfirmDiscardOpen(false); handleCreateNewSave(false); }}
                      disabled={loading}
                      className="gap-2 bg-[#b91c1c] hover:bg-[#dc2626] text-white border-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      Discard Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Save slots list */}
              <div
                className="p-6 rounded-lg shadow"
                style={{ backgroundColor: 'var(--theme-card-bg)', backdropFilter: 'var(--theme-backdrop-blur)', WebkitBackdropFilter: 'var(--theme-backdrop-blur)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                    Save Slots ({slots.length})
                  </h2>
                  <Button variant="ghost" size="icon" onClick={refreshSlots} style={{ color: 'var(--theme-text-muted)' }}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {slots.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>
                    No save slots yet. Create a backup above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {slots.map(slot => (
                      <div
                        key={slot.name}
                        className="flex items-center gap-3 p-4 rounded-lg transition-colors"
                        style={{
                          backgroundColor: activeSave === slot.name ? 'var(--theme-item-selected)' : 'var(--theme-item-default)',
                          borderLeft: activeSave === slot.name ? '3px solid var(--theme-accent)' : '3px solid transparent',
                        }}
                      >
                        {renamingSlot === slot.name ? (
                          /* Rename mode */
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(slot.name);
                                if (e.key === 'Escape') setRenamingSlot(null);
                              }}
                              className="flex-1 h-8"
                              style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" onClick={() => handleRename(slot.name)} className="h-8 w-8 text-green-400 hover:text-green-300">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setRenamingSlot(null)} className="h-8 w-8 text-red-400 hover:text-red-300">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          /* Normal mode */
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{slot.name}</p>
                              {activeSave === slot.name && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-accent)' }}>Currently loaded</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                className="bg-[#1a6bc4] hover:bg-[#2080e0] text-white"
                                onClick={() => handleRestore(slot.name)}
                                disabled={loading}
                                title="Load this save"
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Load
                              </Button>
                              <Button
                                size="sm"
                                className="bg-[#5c7e10] hover:bg-[#78a00f] text-white"
                                onClick={() => {
                                  // Overwrite this slot with current save
                                  const ok = (window as any).backupSave(recompName, slot.name);
                                  if (ok) {
                                    showMessage(`Overwrote "${slot.name}"`, 'success');
                                    refreshSlots();
                                  } else {
                                    showMessage('Overwrite failed', 'error');
                                  }
                                }}
                                disabled={loading}
                                title="Overwrite with current save"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Overwrite
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => { setRenamingSlot(slot.name); setRenameValue(slot.name); }}
                                disabled={loading}
                                className="h-8 w-8"
                                style={{ color: 'var(--theme-text-muted)' }}
                                title="Rename"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(slot.name)}
                                disabled={loading}
                                className="h-8 w-8 text-red-400 hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
