import { useRef, useEffect, useState } from 'react';
import { Word } from '../api/wordsApi';
import { useUpdateWord } from '../hooks/useUpdateWord';
import { useDeleteWord } from '../hooks/useDeleteWord';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { SelectField } from './SelectField';
import { WordClassBadge } from './WordClassBadge';
import { GenderBadge } from './GenderBadge';

type DrawerMode = 'view' | 'edit' | 'confirm-delete';

interface Props {
  wordId: string | null;
  words: Word[];
  open: boolean;
  onClose: () => void;
}

export function WordDetailDrawer({ wordId, words, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<DrawerMode>('view');
  const updateMutation = useUpdateWord();
  const deleteMutation = useDeleteWord();

  // Form state for edit mode
  const [editHeadword, setEditHeadword] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editGender, setEditGender] = useState<'masculine' | 'feminine' | 'neuter' | ''>('');
  const [editWordClass, setEditWordClass] = useState<'noun' | 'verb' | 'adjective' | 'adverb' | 'other' | ''>('');
  const [editDifficulty, setEditDifficulty] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | ''>('');
  const [editNotes, setEditNotes] = useState('');
  const [editPersonalNote, setEditPersonalNote] = useState('');

  const word = words.find(w => w.id === wordId) ?? null;

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  // Reset mode when drawer opens or word changes
  useEffect(() => {
    if (open) setMode('view');
  }, [open, wordId]);

  // Initialize edit form when word changes
  useEffect(() => {
    if (word) {
      setEditHeadword(word.headword);
      setEditTranslation(word.translation ?? '');
      setEditGender((word.gender ?? '') as any);
      setEditWordClass((word.wordClass ?? '') as any);
      setEditDifficulty((word.difficulty ?? '') as any);
      setEditNotes(word.notes ?? '');
      setEditPersonalNote(word.personalNote ?? '');
    }
  }, [wordId, word]);

  // Close on mutation success
  useEffect(() => {
    if (updateMutation.isSuccess) onClose();
  }, [updateMutation.isSuccess]);

  useEffect(() => {
    if (deleteMutation.isSuccess) onClose();
  }, [deleteMutation.isSuccess]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;
    updateMutation.mutate({
      id: word.id,
      headword: editHeadword,
      translation: editTranslation || undefined,
      gender: editGender || undefined,
      wordClass: editWordClass || undefined,
      notes: editNotes || undefined,
      difficulty: editDifficulty || undefined,
      personalNote: editPersonalNote || undefined,
    });
  };

  const handleDelete = () => {
    if (!word) return;
    deleteMutation.mutate(word.id);
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box max-w-lg w-full mx-auto">
        {!word && open && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md" />
          </div>
        )}

        {word && mode === 'view' && (
          <>
            <h3 className="text-xl font-semibold mb-4">{word.headword}</h3>
            <div className="flex flex-col gap-2">
              {word.translation && <p>{word.translation}</p>}
              <div className="flex gap-2">
                {word.gender && <GenderBadge gender={word.gender} />}
                {word.wordClass && <WordClassBadge wordClass={word.wordClass} />}
              </div>
              {word.difficulty && <p className="text-sm">Рівень: {word.difficulty}</p>}
              {word.notes && <p className="text-sm text-base-content/70">{word.notes}</p>}
              {word.personalNote && <p className="text-sm text-base-content/70">{word.personalNote}</p>}
            </div>
            <div className="modal-action gap-2">
              <Button variant="ghost" type="button" onClick={() => setMode('edit')}>
                Редагувати
              </Button>
              <Button variant="error" type="button" onClick={() => setMode('confirm-delete')}>
                Видалити
              </Button>
            </div>
          </>
        )}

        {word && mode === 'edit' && (
          <>
            <h3 className="text-xl font-semibold mb-4">Редагувати слово</h3>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <Input
                id="edit-headword"
                label="Слово (нюнорськ)"
                value={editHeadword}
                onChange={e => setEditHeadword(e.target.value)}
                required
              />
              <Input
                id="edit-translation"
                label="Переклад"
                value={editTranslation}
                onChange={e => setEditTranslation(e.target.value)}
              />
              <SelectField
                id="edit-wordClass"
                label="Клас слова"
                value={editWordClass}
                onChange={e => setEditWordClass(e.target.value as any)}
              >
                <option value="">Оберіть клас слова</option>
                <option value="noun">іменник</option>
                <option value="verb">дієслово</option>
                <option value="adjective">прикметник</option>
                <option value="adverb">прислівник</option>
                <option value="other">інше</option>
              </SelectField>
              <SelectField
                id="edit-gender"
                label="Рід"
                value={editGender}
                onChange={e => setEditGender(e.target.value as any)}
              >
                <option value="">— (без роду)</option>
                <option value="masculine">чоловічий</option>
                <option value="feminine">жіночий</option>
                <option value="neuter">середній</option>
              </SelectField>
              <SelectField
                id="edit-difficulty"
                label="Рівень"
                value={editDifficulty}
                onChange={e => setEditDifficulty(e.target.value as any)}
              >
                <option value="">— (не вказано)</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </SelectField>
              <div className="form-control w-full">
                <label className="label" htmlFor="edit-notes">
                  <span className="label-text font-semibold">Нотатки</span>
                </label>
                <textarea
                  id="edit-notes"
                  className="textarea textarea-bordered w-full"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-control w-full">
                <label className="label" htmlFor="edit-personalNote">
                  <span className="label-text font-semibold">Особиста нотатка</span>
                </label>
                <textarea
                  id="edit-personalNote"
                  className="textarea textarea-bordered w-full"
                  value={editPersonalNote}
                  onChange={e => setEditPersonalNote(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="modal-action gap-2">
                <Button variant="ghost" type="button" onClick={() => setMode('view')}>
                  Скасувати
                </Button>
                <Button type="submit" loading={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Зберігаю…' : 'Зберегти'}
                </Button>
              </div>
            </form>
          </>
        )}

        {word && mode === 'confirm-delete' && (
          <>
            <p className="text-base font-semibold">Видалити «{word.headword}»?</p>
            <p className="text-sm text-base-content/70">Цю дію не можна скасувати.</p>
            <div className="modal-action gap-2">
              <Button variant="ghost" type="button" onClick={() => setMode('view')}>
                Скасувати
              </Button>
              <Button
                variant="error"
                type="button"
                loading={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? 'Видаляю…' : 'Видалити'}
              </Button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
