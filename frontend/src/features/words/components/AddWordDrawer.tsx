import { useRef, useEffect, useState } from 'react';
import { useCreateWord } from '../hooks/useCreateWord';
import { useAnalyzeWord } from '../hooks/useAnalyzeWord';
import type { Difficulty, WordForms } from '../api/wordsApi';
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
  const analyzeMutation = useAnalyzeWord();

  const [headword, setHeadword] = useState('');
  const [translation, setTranslation] = useState('');
  const [gender, setGender] = useState<'masculine' | 'feminine' | 'neuter' | ''>('');
  const [wordClass, setWordClass] = useState<'noun' | 'verb' | 'adjective' | 'adverb' | 'other' | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [forms, setForms] = useState<WordForms>({});
  const [examples, setExamples] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
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
    setDifficulty('');
    setForms({});
    setExamples([]);
    setTags([]);
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
    const cleanExamples = examples.map(e => e.trim()).filter(Boolean);
    const cleanTags = tags.map(t => t.trim()).filter(Boolean);
    mutation.mutate({
      headword: headword.trim(),
      translation: translation || undefined,
      gender: gender || undefined,
      wordClass: wordClass || undefined,
      notes: notes || undefined,
      difficulty: difficulty || undefined,
      forms: Object.keys(forms).length ? forms : undefined,
      examples: cleanExamples.length ? cleanExamples : undefined,
      tagNames: cleanTags.length ? cleanTags : undefined,
    });
  };

  const handleAnalyze = async () => {
    if (!headword.trim()) {
      setHeadwordError("Слово обов'язкове");
      return;
    }
    setHeadwordError('');
    const result = await analyzeMutation.mutateAsync(headword.trim());
    setTranslation(result.translation ?? '');
    setGender(result.gender ?? '');
    setWordClass(result.wordClass ?? '');
    setDifficulty(result.difficulty ?? '');
    setForms(result.forms ?? {});
    setExamples(result.examples ?? []);
    setTags(result.tags ?? []);
  };

  const setFormValue = (key: string, value: string) => {
    setForms(current => ({ ...current, [key]: value }));
  };

  const setExampleValue = (index: number, value: string) => {
    setExamples(current => current.map((example, i) => (i === index ? value : example)));
  };

  const removeTag = (tag: string) => {
    setTags(current => current.filter(t => t !== tag));
  };

  const exampleSlots = examples.length
    ? [...examples, ...Array(Math.max(0, 3 - examples.length)).fill('')]
    : ['', '', ''];
  const formEntries = Object.entries(forms);

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
          <Button
            type="button"
            variant="secondary"
            loading={analyzeMutation.isPending}
            disabled={analyzeMutation.isPending || mutation.isPending}
            onClick={handleAnalyze}
          >
            {analyzeMutation.isPending ? 'AI заповнює...' : 'AI заповнити'}
          </Button>
          <Input
            id="translation"
            label="Переклад"
            value={translation}
            onChange={e => setTranslation(e.target.value)}
          />
          <SelectField
            id="wordClass"
            label="Ordklasse"
            value={wordClass}
            onChange={e => setWordClass(e.target.value as any)}
          >
            <option value="">— (ikkje valt)</option>
            <option value="noun">substantiv</option>
            <option value="verb">verb</option>
            <option value="adjective">adjektiv</option>
            <option value="adverb">adverb</option>
            <option value="other">anna</option>
          </SelectField>
          <SelectField
            id="gender"
            label="Kjønn"
            value={gender}
            onChange={e => setGender(e.target.value as any)}
          >
            <option value="">— (ikkje valt)</option>
            <option value="masculine">hankjønn</option>
            <option value="feminine">hokjønn</option>
            <option value="neuter">inkjekjønn</option>
          </SelectField>
          <SelectField
            id="difficulty"
            label="Рівень"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as Difficulty | '')}
          >
            <option value="">— (ikkje valt)</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </SelectField>
          {formEntries.length > 0 && (
            <div className="form-control w-full">
              <span className="label-text font-semibold mb-2">Форми</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formEntries.map(([key, value]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-xs text-base-content/60">{key}</span>
                    <input
                      className="input input-bordered input-sm w-full"
                      value={value}
                      onChange={e => setFormValue(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          {examples.length > 0 && (
            <div className="form-control w-full">
              <span className="label-text font-semibold mb-2">Приклади</span>
              <div className="flex flex-col gap-2">
                {exampleSlots.map((example, index) => (
                  <textarea
                    key={index}
                    className="textarea textarea-bordered w-full"
                    value={example}
                    onChange={e => setExampleValue(index, e.target.value)}
                    rows={2}
                  />
                ))}
              </div>
            </div>
          )}
          {tags.length > 0 && (
            <div className="form-control w-full">
              <span className="label-text font-semibold mb-2">Теги</span>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="badge badge-outline gap-1">
                    {tag}
                    <button
                      type="button"
                      className="text-base-content/60 hover:text-error"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
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
