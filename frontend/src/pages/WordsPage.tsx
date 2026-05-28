import { useState, useRef, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useAnalyzeWord } from '../features/words/hooks/useAnalyzeWord';
import { useCreateWord } from '../features/words/hooks/useCreateWord';
import { useWords } from '../features/words/hooks/useWords';
import { useAnalysisChat } from '../features/words/hooks/useAnalysisChat';
import { WordList } from '../features/words/components/WordList';
import { WordDetailDrawer } from '../features/words/components/WordDetailDrawer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type {
  CreateWordInput,
  Difficulty,
  Gender,
  WordAnalysis,
  WordClass,
  WordForms,
} from '../features/words/api/wordsApi';
import type { ChatMessage } from '../features/words/api/chatApi';
import { TranslatorPanel } from '../features/translate/components/TranslatorPanel';

type ActiveTab = 'analyze' | 'dictionary' | 'translate';

const difficultyLevels: Difficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function AnalysisReviewCard({
  headword,
  analysis,
  onSaved,
  pendingChatMessages,
}: {
  headword: string;
  analysis: WordAnalysis;
  onSaved: () => void;
  pendingChatMessages: ChatMessage[];
}) {
  const createMutation = useCreateWord();
  const [translation, setTranslation] = useState(analysis.translation ?? '');
  const [gender, setGender] = useState<Gender | ''>(analysis.gender ?? '');
  const [wordClass, setWordClass] = useState<WordClass | ''>(analysis.wordClass ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>(analysis.difficulty ?? '');
  const [forms, setForms] = useState<WordForms>(analysis.forms ?? {});
  const [examples, setExamples] = useState<string[]>(analysis.examples ?? []);
  const [tags, setTags] = useState<string[]>(analysis.tags ?? []);
  const definition = analysis.definition;
  const synonyms = analysis.synonyms ?? [];

  const setFormValue = (key: string, value: string) => {
    setForms(current => ({ ...current, [key]: value }));
  };

  const setExampleValue = (index: number, value: string) => {
    setExamples(current => current.map((example, i) => (i === index ? value : example)));
  };

  const removeTag = (tag: string) => {
    setTags(current => current.filter(t => t !== tag));
  };

  const showsForms = wordClass !== 'sentence';

  const save = () => {
    const cleanForms = Object.fromEntries(
      Object.entries(forms).filter(([, value]) => value.trim()),
    );
    const cleanExamples = examples.map(example => example.trim()).filter(Boolean);
    const cleanTags = tags.map(tag => tag.trim()).filter(Boolean);
    const payload: CreateWordInput = {
      headword: headword.trim(),
      translation: translation || undefined,
      gender: gender || undefined,
      wordClass: wordClass || undefined,
      difficulty: difficulty || undefined,
      forms: showsForms && Object.keys(cleanForms).length ? cleanForms : undefined,
      examples: cleanExamples.length ? cleanExamples : undefined,
      tagNames: cleanTags.length ? cleanTags : undefined,
      notes: definition || undefined,
      pendingChatMessages: pendingChatMessages.length
        ? pendingChatMessages.map(m => ({ role: m.role, content: m.content }))
        : undefined,
    };
    createMutation.mutate(payload, { onSuccess: onSaved });
  };

  const formEntries = Object.entries(forms);

  return (
    <section className="mt-6 rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{headword}</h2>
          <p className="text-sm text-base-content/60">AI розбір можна поправити перед збереженням.</p>
        </div>
        <Button type="button" loading={createMutation.isPending} onClick={save}>
          {createMutation.isPending ? 'Зберігаю...' : 'Зберегти в словник'}
        </Button>
      </div>

      {(definition || synonyms.length > 0) && (
        <div className="mt-4 rounded-md bg-base-200 p-3 space-y-2">
          {definition && (
            <p className="text-sm text-base-content/80 italic">{definition}</p>
          )}
          {synonyms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-base-content/50 mr-1">syn:</span>
              {synonyms.map(s => (
                <span key={s} className="badge badge-ghost badge-sm">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          id="analysis-translation"
          label="Переклад"
          value={translation}
          onChange={event => setTranslation(event.target.value)}
        />
        <label className="form-control w-full">
          <span className="label">
            <span className="label-text font-semibold">Рівень</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={difficulty}
            onChange={event => setDifficulty(event.target.value as Difficulty | '')}
          >
            <option value="">—</option>
            {difficultyLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className="form-control w-full">
          <span className="label">
            <span className="label-text font-semibold">Ordklasse</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={wordClass}
            onChange={event => setWordClass(event.target.value as WordClass | '')}
          >
            <option value="">—</option>
            <option value="noun">substantiv</option>
            <option value="verb">verb</option>
            <option value="adjective">adjektiv</option>
            <option value="adverb">adverb</option>
            <option value="pronoun">pronomen</option>
            <option value="sentence">setning</option>
            <option value="other">anna</option>
          </select>
        </label>
        <label className="form-control w-full">
          <span className="label">
            <span className="label-text font-semibold">Kjønn</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={gender}
            onChange={event => setGender(event.target.value as Gender | '')}
          >
            <option value="">—</option>
            <option value="masculine">hankjønn</option>
            <option value="feminine">hokjønn</option>
            <option value="neuter">inkjekjønn</option>
          </select>
        </label>
      </div>

      {showsForms && formEntries.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold mb-2">Форми</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {formEntries.map(([key, value]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-base-content/60">{key}</span>
                <input
                  className="input input-bordered input-sm w-full"
                  value={value}
                  onChange={event => setFormValue(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {examples.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold mb-2">Приклади</h3>
          <div className="grid gap-2">
            {examples.map((example, index) => (
              <textarea
                key={index}
                className="textarea textarea-bordered w-full"
                value={example}
                rows={2}
                onChange={event => setExampleValue(index, event.target.value)}
              />
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold mb-2">Теги</h3>
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
    </section>
  );
}

export default function WordsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyze');
  const [headword, setHeadword] = useState('');
  const [submittedHeadword, setSubmittedHeadword] = useState('');
  const [headwordError, setHeadwordError] = useState('');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WordAnalysis | null>(null);
  const [analysisKey, setAnalysisKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 350);
  const { data: words, isPending, isError } = useWords(debouncedQuery);
  const analyzeMutation = useAnalyzeWord();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analysisWordContext = analysis && submittedHeadword
    ? {
        headword: submittedHeadword,
        translation: analysis.translation ?? null,
        wordClass: analysis.wordClass ?? null,
        gender: analysis.gender ?? null,
        difficulty: analysis.difficulty ?? null,
        forms: (analysis.forms ?? {}) as Record<string, string>,
        examples: analysis.examples ?? [],
        notes: analysis.definition ?? null,
      }
    : null;

  const { messages: chatMessages, loading: chatLoading, send: sendChat, reset: resetChat } = useAnalysisChat(analysisWordContext);

  useEffect(() => {
    if (chatOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const analyze = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanHeadword = headword.trim();
    if (!cleanHeadword) {
      setHeadwordError("Слово обов'язкове");
      return;
    }
    setHeadwordError('');
    try {
      const result = await analyzeMutation.mutateAsync(cleanHeadword);
      setSubmittedHeadword(cleanHeadword);
      setAnalysis(result);
      setAnalysisKey(current => current + 1);
      resetChat();
    } catch {
      // useAnalyzeWord shows the retryable toast.
    }
  };

  const handleSaved = () => {
    setAnalysis(null);
    setHeadword('');
    setAnalysisKey(current => current + 1);
    resetChat();
    setChatOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl pb-20 sm:pb-0">
      {/* Desktop tabs — hidden on mobile (tabs are fixed-bottom on mobile) */}
      <div role="tablist" className="tabs tabs-boxed hidden sm:flex w-fit">
        <button
          type="button"
          role="tab"
          className={`tab ${activeTab === 'analyze' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          AI пошук
        </button>
        <button
          type="button"
          role="tab"
          className={`tab ${activeTab === 'dictionary' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('dictionary')}
        >
          Словник
        </button>
        <button
          type="button"
          role="tab"
          className={`tab ${activeTab === 'translate' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('translate')}
        >
          Перекладач
        </button>
      </div>

      {/* Mobile fixed bottom tabs */}
      <div
        role="tablist"
        className="fixed bottom-0 left-0 right-0 z-30 flex sm:hidden bg-base-100 border-t border-base-200"
      >
        {(['analyze', 'dictionary', 'translate'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary border-t-2 border-primary -mt-px'
                : 'text-base-content/60'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'analyze' ? 'AI пошук' : tab === 'dictionary' ? 'Словник' : 'Перекладач'}
          </button>
        ))}
      </div>

      {activeTab === 'analyze' && (
        <main className="pt-6">
          <form onSubmit={analyze} className="flex flex-col gap-1">
            <label htmlFor="ai-headword" className="label pb-1">
              <span className="label-text font-semibold">Введи слово Nynorsk</span>
            </label>
            <div className="flex gap-3 items-center">
              <input
                id="ai-headword"
                className={`input input-bordered w-full flex-1 ${headwordError ? 'input-error' : ''}`}
                value={headword}
                onChange={event => setHeadword(event.target.value)}
                placeholder="hus"
                autoComplete="off"
                aria-invalid={!!headwordError}
                aria-describedby={headwordError ? 'ai-headword-error' : undefined}
              />
              <Button
                type="submit"
                loading={analyzeMutation.isPending}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? 'Шукаю...' : 'Розібрати'}
              </Button>
            </div>
            <div className="min-h-[1.25rem] pt-0.5">
              {headwordError && (
                <span id="ai-headword-error" className="text-xs text-error" role="alert">
                  {headwordError}
                </span>
              )}
            </div>
          </form>

          {!analysis && !analyzeMutation.isPending && (
            <div className="mt-8 rounded-lg border border-dashed border-base-300 p-6 text-center text-base-content/60">
              Введи слово, і AI покаже переклад, форми, приклади, теги та рівень.
            </div>
          )}

          {analysis && (
            <AnalysisReviewCard
              key={analysisKey}
              headword={submittedHeadword}
              analysis={analysis}
              onSaved={handleSaved}
              pendingChatMessages={chatMessages}
            />
          )}
        </main>
      )}

      {activeTab === 'dictionary' && (
        <main className="pt-6">
          <div className="mb-4">
            <Input
              id="dict-search"
              label=""
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Пошук у словнику..."
              aria-label="Пошук у словнику"
            />
          </div>
          <WordList
            words={words ?? []}
            isPending={isPending}
            isError={isError}
            onWordClick={setSelectedWordId}
            searchQuery={searchQuery}
          />
          <WordDetailDrawer
            wordId={selectedWordId}
            words={words ?? []}
            open={selectedWordId !== null}
            onClose={() => setSelectedWordId(null)}
          />
        </main>
      )}

      <main className={`pt-6 ${activeTab !== 'translate' ? 'hidden' : ''}`}>
        <TranslatorPanel />
      </main>

      {analysis && activeTab === 'analyze' && !chatOpen && (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 btn btn-primary shadow-lg"
          onClick={() => setChatOpen(true)}
        >
          {chatMessages.length > 0 && (
            <span className="badge badge-sm badge-secondary absolute -top-2 -right-2">
              {chatMessages.length}
            </span>
          )}
          Є питання?
        </button>
      )}

      {analysis && activeTab === 'analyze' && chatOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-40 flex flex-col w-full sm:w-96 h-[480px] bg-base-100 border border-base-300 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary text-primary-content shrink-0">
            <span className="font-semibold truncate">{submittedHeadword}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle text-primary-content hover:bg-primary-focus"
              onClick={() => setChatOpen(false)}
              aria-label="Закрити чат"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 p-3">
            {chatMessages.length === 0 && !chatLoading && (
              <p className="text-center text-base-content/40 text-sm mt-8">
                Граматика, вживання, приклади — питай!
              </p>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
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
            className="flex gap-2 p-3 border-t border-base-300 shrink-0"
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
  );
}
