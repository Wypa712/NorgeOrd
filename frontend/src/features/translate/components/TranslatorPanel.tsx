import { useState, useEffect, useRef } from 'react';
import { toast } from '../../../lib/toastStore';
import { useTranslate } from '../hooks/useTranslate';
import { useDebounce } from '../../../hooks/useDebounce';

export function TranslatorPanel() {
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [direction, setDirection] = useState<'uk-nn' | 'nn-uk'>('uk-nn');
  const [textToTranslate, setTextToTranslate] = useState('');

  const sourceLang = direction === 'uk-nn' ? 'uk' : 'nn';
  const targetLang = direction === 'uk-nn' ? 'nn' : 'uk';
  const sourceLabel = direction === 'uk-nn' ? 'Українська' : 'Nynorsk';
  const targetLabel = direction === 'uk-nn' ? 'Nynorsk' : 'Українська';

  const debouncedSource = useDebounce(sourceText, 600);
  const mutation = useTranslate();
  const showLoading = mutation.isPending && sourceText.trim().length > 0;
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  // Debounce path — update textToTranslate after pause
  useEffect(() => {
    setTextToTranslate(debouncedSource);
  }, [debouncedSource]);

  // Translation effect — runs whenever textToTranslate or direction changes
  useEffect(() => {
    const trimmed = textToTranslate.trim();
    const key = `${trimmed}|${direction}`;
    if (!trimmed) {
      abortRef.current?.abort();
      setResultText('');
      return;
    }
    if (lastKeyRef.current === key) return;

    const bytes = new TextEncoder().encode(trimmed).length;
    if (bytes > 500) {
      toast.error('Текст занадто довгий (макс. ~160 символів кирилицею)');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastKeyRef.current = key;
    mutation.mutateAsync({ text: trimmed, sourceLang, targetLang, signal: controller.signal })
      .then(result => {
        setResultText(result.text);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          toast.error('Помилка перекладу. Спробуй ще раз.');
        }
      });

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textToTranslate, direction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ' ' || e.key === 'Tab') {
      if (e.key === 'Tab') e.preventDefault();
      // Trigger immediately with current text (before debounce fires)
      lastKeyRef.current = '';
      setTextToTranslate(sourceText);
    }
  };

  const handleSwap = () => {
    setDirection(prev => (prev === 'uk-nn' ? 'nn-uk' : 'uk-nn'));
    if (resultText) {
      setSourceText(resultText);
      setTextToTranslate(resultText);
      setResultText('');
      lastKeyRef.current = '';
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
        <div className="form-control w-full flex-1">
          <span className="label-text font-semibold text-sm mb-1">{sourceLabel}</span>
          <div className="relative">
            <textarea
              className="textarea textarea-bordered w-full resize-none"
              rows={5}
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введи текст для перекладу..."
            />
            {sourceText && (
              <button
                type="button"
                className="absolute top-2 right-2 btn btn-ghost btn-xs btn-square opacity-60 hover:opacity-100"
                aria-label="Очистити"
                onClick={() => {
                  setSourceText('');
                  setResultText('');
                  setTextToTranslate('');
                  lastKeyRef.current = '';
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div className={`text-xs mt-1 text-right ${sourceText.length > 400 ? 'text-error' : 'text-base-content/40'}`}>
            {sourceText.length} / ~500
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-square self-center mx-auto sm:mt-6 sm:mb-6"
          aria-label="Поміняти мови місцями"
          onClick={handleSwap}
          disabled={showLoading}
        >
          ⇄
        </button>

        <label className="form-control w-full flex-1">
          <span className="label-text font-semibold text-sm mb-1">
            {targetLabel}
            {showLoading && (
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

    </div>
  );
}
