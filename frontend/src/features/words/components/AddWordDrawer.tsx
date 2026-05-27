import { useRef, useEffect, useState } from 'react';
import { useCreateWord } from '../hooks/useCreateWord';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { SelectField } from './SelectField';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddWordDrawer({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mutation = useCreateWord();

  const [headword, setHeadword] = useState('');
  const [translation, setTranslation] = useState('');
  const [gender, setGender] = useState<'masculine' | 'feminine' | 'neuter' | ''>('');
  const [wordClass, setWordClass] = useState<'noun' | 'verb' | 'adjective' | 'adverb' | 'other' | ''>('');
  const [notes, setNotes] = useState('');
  const [headwordError, setHeadwordError] = useState('');

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  useEffect(() => {
    if (mutation.isSuccess) onClose();
  }, [mutation.isSuccess]);

  const resetForm = () => {
    setHeadword('');
    setTranslation('');
    setGender('');
    setWordClass('');
    setNotes('');
    setHeadwordError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headword.trim()) {
      setHeadwordError("Слово обов'язкове");
      return;
    }
    setHeadwordError('');
    mutation.mutate({
      headword: headword.trim(),
      translation: translation || undefined,
      gender: gender || undefined,
      wordClass: wordClass || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" onClose={handleClose}>
      <div className="modal-box max-w-lg w-full mx-auto">
        <h3 className="text-xl font-semibold mb-4">Нове слово</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="headword"
            label="Слово (нюнорськ)"
            value={headword}
            onChange={e => setHeadword(e.target.value)}
            error={headwordError}
            required
          />
          <Input
            id="translation"
            label="Переклад"
            value={translation}
            onChange={e => setTranslation(e.target.value)}
          />
          <SelectField
            id="wordClass"
            label="Клас слова"
            value={wordClass}
            onChange={e => setWordClass(e.target.value as any)}
          >
            <option value="">Оберіть клас слова</option>
            <option value="noun">іменник</option>
            <option value="verb">дієслово</option>
            <option value="adjective">прикметник</option>
            <option value="adverb">прислівник</option>
            <option value="other">інше</option>
          </SelectField>
          <SelectField
            id="gender"
            label="Рід"
            value={gender}
            onChange={e => setGender(e.target.value as any)}
          >
            <option value="">— (без роду)</option>
            <option value="masculine">чоловічий</option>
            <option value="feminine">жіночий</option>
            <option value="neuter">середній</option>
          </SelectField>
          <div className="form-control w-full">
            <label className="label" htmlFor="notes">
              <span className="label-text font-semibold">Нотатки</span>
            </label>
            <textarea
              id="notes"
              className="textarea textarea-bordered w-full"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-action gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Скасувати
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {mutation.isPending ? 'Зберігаю…' : 'Зберегти'}
            </Button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
