import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function NotesPanel() {
  const [notes, setNotes] = useState(() => localStorage.getItem('exora-dashboard-notes') || '');
  const [isSaved, setIsSaved] = useState(false);

  // Debounced auto-save
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (notes !== localStorage.getItem('exora-dashboard-notes')) {
        localStorage.setItem('exora-dashboard-notes', notes);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [notes]);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all notes?')) {
      setNotes('');
      localStorage.removeItem('exora-dashboard-notes');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/40">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Meeting Notes</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-500 hover:text-red-500 dark:hover:text-red-400"
          onClick={handleClear}
          title="Clear notes"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 -mr-2 pr-2">
        <textarea
          className="w-full h-[60vh] resize-none bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none p-1"
          placeholder="Add notes about your meetings, follow-ups, or anything else here. Auto-saved."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </ScrollArea>
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 shrink-0 h-6">
        <AnimatePresence>
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-emerald-500 font-medium"
            >
              Saved
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-[10px] text-slate-400 ml-auto">{notes.length} chars</span>
      </div>
    </div>
  );
}
