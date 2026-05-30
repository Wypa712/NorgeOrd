import { useRef, useEffect, useState } from 'react';
import type { Difficulty, Gender, Meaning, Word, WordClass, WordForms } from '../api/wordsApi';
import { useUpdateWord } from '../hooks/useUpdateWord';
import { useDeleteWord } from '../hooks/useDeleteWord';
import { useWordChat } from '../hooks/useWordChat';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { SelectField } from './SelectField';
import { WordClassBadge } from './WordClassBadge';
import { GenderBadge } from './GenderBadge';

type DrawerMode = 'view' | 'edit' | 'chat';

interface Props {
  wordId: string | null;
  words: Word[];
  open: boolean;
  onClose: () => void;
}

export function WordDetailDrawer({ wordId, words, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DrawerMode>('view');
  const [chatInput, setChatInput] = useState('');
  const updateMutation = useUpdateWord();
  const deleteMutation = useDeleteWord();
  const { messages: chatMessages, loading: chatLoading, send: sendChat, reset: resetChat } = useWordChat(wordId);

  const [editHeadword, setEditHeadword] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editGender, setEditGender] = useState<Gender | ''>('');
  const [editWordClass, setEditWordClass] = useState<WordClass | ''>('');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty | ''>('');
  const [editForms, setEditForms] = useState<WordForms>({});
  const [editExamples, setEditExamples] = useState<string[]>(['', '', '']);
  const [editNotes, setEditNotes] = useState('');

  const word = words.find(w => w.id === wordId) ?? null;

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setMode('view');
    }
    if (!open) {
      resetChat();
      setChatInput('');
    }
  }, [open, wordId]);

  useEffect(() => {
    if (mode === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, mode]);

  useEffect(() => {
    if (word) {
      setEditHeadword(word.headword);
      setEditTranslation(word.translation ?? '');
      setEditGender(word.gender ?? '');
      setEditWordClass(word.wordClass ?? '');
      setEditDifficulty(word.difficulty ?? '');
      setEditForms(word.forms ?? {});
      setEditExamples(
        word.examples.length > 0
          ? [...word.examples, ...Array(Math.max(0, 3 - word.examples.length)).fill('')]
          : ['', '', ''],
      );
      setEditNotes(word.notes ?? '');
    }
  }, [wordId, word]);

  useEffect(() => {
    if (updateMutation.isSuccess) onClose();
  }, [updateMutation.isSuccess]);

  useEffect(() => {
    if (deleteMutation.isSuccess) onClose();
  }, [deleteMutation.isSuccess]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;
    const cleanForms = Object.fromEntries(
      Object.entries(editForms).filter(([, value]) => value.trim()),
    );
    const cleanExamples = editExamples.map(example => example.trim()).filter(Boolean);
    updateMutation.mutate({
      id: word.id,
      headword: editHeadword,
      translation: editTranslation || undefined,
      gender: editGender || undefined,
      wordClass: editWordClass || undefined,
      difficulty: editDifficulty || undefined,
      forms: Object.keys(cleanForms).length > 0 ? cleanForms : undefined,
      examples: cleanExamples.length > 0 ? cleanExamples : undefined,
      notes: editNotes || undefined,
    });
  };

  const handleDelete = () => {
    if (!word) return;
    deleteMutation.mutate(word.id);
  };

  const addFormField = () => {
    const nextIndex = Object.keys(editForms).length + 1;
    let key = `form_${nextIndex}`;
    while (Object.prototype.hasOwnProperty.call(editForms, key)) {
      key = `form_${Number(key.replace('form_', '')) + 1}`;
    }
    setEditForms(current => ({ ...current, [key]: '' }));
  };

  const formEntries = word?.forms
    ? Object.entries(word.forms).filter(([, value]) => value)
    : [];
  const tagNames = word?.tags?.map(({ tag }) => tag.name) ?? [];

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
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-2xl font-bold">{word.headword}</h3>
              <div className="flex gap-1 flex-wrap justify-end pt-1 shrink-0">
                {word.wordClass && <WordClassBadge wordClass={word.wordClass} />}
                {word.gender && <GenderBadge gender={word.gender} />}
                {word.difficulty && <span className="badge badge-neutral">{word.difficulty}</span>}
              </div>
            </div>
            {word.meanings && word.meanings.length > 1 ? (
              <ol className="list-decimal list-inside space-y-1 mb-4">
                {word.meanings.map((m: Meaning, i) => (
                  <li key={i} className="text-base-content/70">
                    <span className="font-medium">{m.translation}</span>
                    {(m.wordClass || m.gender) && (
                      <span className="inline-flex gap-1 ml-1 align-middle">
                        {m.wordClass && m.wordClass !== word.wordClass && <WordClassBadge wordClass={m.wordClass} />}
                        {m.gender && m.gender !== word.gender && <GenderBadge gender={m.gender} />}
                      </span>
                    )}
                    {m.definition && (
                      <span className="text-sm text-base-content/50 ml-2">— {m.definition}</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              word.translation && (
                <p className="text-lg text-base-content/70 mb-4">{word.translation}</p>
              )
            )}
            {word.examples.length > 0 && (
              <section className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Приклади</h4>
                <ul className="space-y-2 text-sm text-base-content/80">
                  {word.examples.map((example, index) => (
                    <li key={`${example}-${index}`} className="rounded bg-base-200 px-3 py-2">
                      {example}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {formEntries.length > 0 && (
              <section className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Форми</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {formEntries.map(([key, value]) => (
                    <div key={key} className="rounded bg-base-200 px-3 py-2">
                      <div className="text-xs text-base-content/50">{key}</div>
                      <div className="font-medium break-words">{value}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tagNames.length > 0 && (
              <section className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Теги</h4>
                <div className="flex flex-wrap gap-2">
                  {tagNames.map(tag => (
                    <span key={tag} className="badge badge-outline">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {word.notes && (
              <p className="mt-4 text-sm text-base-content/60 italic">{word.notes}</p>
            )}
            <div className="modal-action gap-2 mt-6">
              <Button variant="ghost" type="button" onClick={() => setMode('chat')}>
                Чат
              </Button>
              <Button variant="ghost" type="button" onClick={() => setMode('edit')}>
                Редагувати
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
                label="Ordklasse"
                value={editWordClass}
                onChange={e => setEditWordClass(e.target.value as WordClass | '')}
              >
                <option value="">— (ikkje valt)</option>
                <option value="noun">substantiv</option>
                <option value="verb">verb</option>
                <option value="adjective">adjektiv</option>
                <option value="adverb">adverb</option>
                <option value="pronoun">pronomen</option>
                <option value="sentence">setning</option>
                <option value="other">anna</option>
              </SelectField>
              <SelectField
                id="edit-gender"
                label="Kjønn"
                value={editGender}
                onChange={e => setEditGender(e.target.value as Gender | '')}
              >
                <option value="">— (ikkje valt)</option>
                <option value="masculine">hankjønn</option>
                <option value="feminine">hokjønn</option>
                <option value="neuter">inkjekjønn</option>
              </SelectField>
              <SelectField
                id="edit-difficulty"
                label="Nivå (CEFR)"
                value={editDifficulty}
                onChange={e => setEditDifficulty(e.target.value as Difficulty | '')}
              >
                <option value="">— (ikkje valt)</option>
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
              {editWordClass && editWordClass !== 'sentence' && (
                <div className="form-control w-full">
                  <span className="label-text font-semibold mb-1 block">Форми</span>
                  {Object.entries(editForms).map(([key, value]) => (
                    <div key={key} className="flex gap-2 mb-2">
                      <input className="input input-bordered input-sm flex-1" value={key} readOnly />
                      <input
                        className="input input-bordered input-sm flex-1"
                        value={value}
                        onChange={e => setEditForms(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <Button variant="ghost" type="button" className="btn-sm self-start" onClick={addFormField}>
                    Додати форму
                  </Button>
                </div>
              )}
              <div className="form-control w-full">
                <span className="label-text font-semibold mb-1 block">Приклади</span>
                {editExamples.map((example, index) => (
                  <textarea
                    key={index}
                    className="textarea textarea-bordered w-full mb-2 text-sm"
                    rows={2}
                    value={example}
                    placeholder="Необов'язково"
                    onChange={e => setEditExamples(prev => prev.map((value, i) => (
                      i === index ? e.target.value : value
                    )))}
                  />
                ))}
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
        {word && mode === 'chat' && (
          <div className="flex flex-col h-[70vh]">
            <div className="flex items-center gap-2 mb-3">
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setMode('view')}>
                ←
              </button>
              <span className="font-semibold">{word.headword}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {chatMessages.length === 0 && !chatLoading && (
                <p className="text-center text-base-content/40 text-sm mt-8">
                  Задай питання про це слово — граматика, вживання, приклади…
                </p>
              )}
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                >
                  <div className={`chat-bubble text-sm ${msg.role === 'user' ? 'chat-bubble-primary' : ''}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="chat chat-start">
                  <div className="chat-bubble chat-bubble-ghost text-sm">
                    <span className="loading loading-dots loading-xs" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              className="flex gap-2 mt-3"
              onSubmit={async e => {
                e.preventDefault();
                const val = chatInput;
                setChatInput('');
                await sendChat(val);
              }}
            >
              <input
                className="input input-bordered input-sm flex-1"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Напиши питання..."
                disabled={chatLoading}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={chatLoading || !chatInput.trim()}
              >
                →
              </button>
            </form>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
