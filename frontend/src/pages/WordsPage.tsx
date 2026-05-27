import { useState } from 'react';
import AppShell from '../components/AppShell';
import { useWords } from '../features/words/hooks/useWords';
import { WordList } from '../features/words/components/WordList';
import { FAB } from '../features/words/components/FAB';
import { AddWordDrawer } from '../features/words/components/AddWordDrawer';

export default function WordsPage() {
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [_selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const { data: words, isPending, isError } = useWords();

  return (
    <AppShell>
      <WordList
        words={words ?? []}
        isPending={isPending}
        isError={isError}
        onWordClick={setSelectedWordId}
      />
      <FAB onClick={() => setAddDrawerOpen(true)} />
      <AddWordDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
      />
    </AppShell>
  );
}
