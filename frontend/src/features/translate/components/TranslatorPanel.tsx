import { useState, useEffect, useRef } from 'react';
import { toast } from '../../../lib/toastStore';
import { useTranslate } from '../hooks/useTranslate';
import { useDebounce } from '../../../hooks/useDebounce';

export function TranslatorPanel() {
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [direction, setDirection] = useState<'uk-nn' | 'nn-uk'>('uk-nn');
  const [fallback, setFallback] = useState(false);
  const [textToTranslate, setTextToTranslate] = useState('');

  const sourceLang = direction === 'uk-nn' ? 'uk' : 'nn';
  const targetLang = direction === 'uk-nn' ? 'nn' : 'uk';
  const sourceLabel = direction === 'uk-nn' ? 'Українська' : 'Nynorsk';
  const targetLabel = direction === 'uk-nn' ? 'Nynorsk' : 'Українська';

  const debouncedSource = useDebounce(sourceText, 600);
  const mutation = useTranslate();
  const isTranslating = mutation.isPending;
  const lastKeyRef = useRef<{ text: string; dir: string }>({ text: '', dir: '' });

  // Debounce path — update textToTranslate after pause
  useEffect(() => {
    setTextToTranslate(debouncedSource);
  }, [debouncedSource]);

  // Translation effect — runs whenever textToTranslate or direction changes
  useEffect(() => {
    const trimmed = textToTranslate.trim();
    const key = `${trimmed}|${direction}`;
    if (!trimmed) {
      setResultText('');
      setFallback(false);
      return;
    }
    if (lastKeyRef.current.text === key) return;

    const bytes = new TextEncoder().encode(trimmed).length;
    if (bytes > 500) {
      toast.error('Текст занадто довгий (макс. ~160 символів кирилицею)');
      return;
    }

    lastKeyRef.current = { text: key, dir: direction };
    mutation.mutateAsync({ text: trimmed, sourceLang, targetLang })
      .then(result => {
        setResultText(result.text);
        setFallback(result.fallback);
      })
      .catch(() => {
        toast.error('Помилка перекладу. Спробуй ще раз.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textToTranslate, direction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ' ' || e.key === 'Tab') {
      if (e.key === 'Tab') e.preventDefault();
      // Trigger immediately with current text (before debounce fires)
      lastKeyRef.current = { text: '', dir: '' };
      setTextToTranslate(sourceText);
    }
  };

  const handleSwap = () => {
    setDirection(prev => (prev === 'uk-nn' ? 'nn-uk' : 'uk-nn'));
    if (resultText) {
      setSourceText(resultText);
      setTextToTranslate(resultText);
      setResultText('');
      setFallback(false);
      lastKeyRef.current = { text: '', dir: '' };
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      toast.success('Скопійовано!');
    } catch {
      toast.error('Не вдалося скопіювати');
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
        <label className="form-control w-full flex-1">
          <span className="label-text font-semibold text-sm mb-1">{sourceLabel}</span>
          <textarea
            className="textarea textarea-bordered w-full resize-none"
            rows={5}
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введи текст для перекладу..."
          />
        </label>

        <button
          type="button"
          className="btn btn-ghost btn-square self-center mx-auto sm:mt-8"
          aria-label="Поміняти мови місцями"
          onClick={handleSwap}
          disabled={isTranslating}
        >
          ⇄
        </button>

        <label className="form-control w-full flex-1">
          <span className="label-text font-semibold text-sm mb-1">
            {targetLabel}
            {isTranslating && (
              <span className="loading loading-dots loading-xs ml-2 opacity-60" />
            )}
          </span>
          <div className="relative">
            <textarea
              className="textarea textarea-bordered w-full resize-none bg-base-200"
              rows={5}
              value={resultText}
              readOnly
              placeholder="Переклад з'явиться тут"
            />
            {resultText && (
              <button
                type="button"
                className="absolute top-2 right-2 btn btn-ghost btn-xs btn-square"
                aria-label="Скопіювати переклад"
                onClick={handleCopy}
              >
                ⎘
              </button>
            )}
          </div>
        </label>
      </div>

      {fallback && (
        <div className="mt-3 text-xs text-warning">Результат може містити Bokmål форми</div>
      )}
    </div>
  );
}
