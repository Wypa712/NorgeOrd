import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useAnalyzeWord } from '../features/words/hooks/useAnalyzeWord';
import { useCreateWord } from '../features/words/hooks/useCreateWord';
import { useWords } from '../features/words/hooks/useWords';
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

type ActiveTab = 'analyze' | 'dictionary';

const difficultyLevels: Difficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function AnalysisReviewCard({
  headword,
  analysis,
  onSaved,
}: {
  headword: string;
  analysis: WordAnalysis;
  onSaved: () => void;
}) {
  const createMutation = useCreateWord();
  const [translation, setTranslation] = useState(analysis.translation ?? '');
  const [gender, setGender] = useState<Gender | ''>(analysis.gender ?? '');
  const [wordClass, setWordClass] = useState<WordClass | ''>(analysis.wordClass ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>(analysis.difficulty ?? '');
  const [forms, setForms] = useState<WordForms>(analysis.forms ?? {});
  const [examples, setExamples] = useState<string[]>(analysis.examples ?? []);
  const [tags, setTags] = useState<string[]>(analysis.tags ?? []);

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
    } catch {
      // useAnalyzeWord shows the retryable toast.
    }
  };

  const handleSaved = () => {
    setAnalysis(null);
    setHeadword('');
    setAnalysisKey(current => current + 1);
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div role="tablist" className="tabs tabs-boxed w-full sm:w-fit">
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
      </div>

      {activeTab === 'analyze' && (
        <main className="pt-6">
          <form onSubmit={analyze} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              id="ai-headword"
              label="Введи слово Nynorsk"
              value={headword}
              onChange={event => setHeadword(event.target.value)}
              error={headwordError}
              placeholder="hus"
              autoComplete="off"
            />
            <Button
              type="submit"
              loading={analyzeMutation.isPending}
              disabled={analyzeMutation.isPending}
              className="sm:mb-0"
            >
              {analyzeMutation.isPending ? 'Шукаю...' : 'Розібрати'}
            </Button>
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
    </div>
  );
}
