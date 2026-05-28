import { useState } from 'react';
import { Button } from '../../../components/Button';
import { toast } from '../../../lib/toastStore';
import { useTranslate } from '../hooks/useTranslate';

export function TranslatorPanel() {
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [direction, setDirection] = useState<'uk-nn' | 'nn-uk'>('uk-nn');
  const [fallback, setFallback] = useState(false);

  const sourceLang = direction === 'uk-nn' ? 'uk' : 'nn';
  const targetLang = direction === 'uk-nn' ? 'nn' : 'uk';
  const sourceLabel = direction === 'uk-nn' ? 'Українська' : 'Nynorsk';
  const targetLabel = direction === 'uk-nn' ? 'Nynorsk' : 'Українська';

  const mutation = useTranslate();
  const isTranslating = mutation.isPending;

  const handleTranslate = async () => {
    const bytes = new TextEncoder().encode(sourceText).length;
    if (bytes > 500) {
      toast.error('Текст занадто довгий (макс. ~160 символів кирилицею)');
      return;
    }
    try {
      const result = await mutation.mutateAsync({ text: sourceText, sourceLang, targetLang });
      setResultText(result.text);
      setFallback(result.fallback);
    } catch {
      toast.error('Помилка перекладу. Спробуй ще раз.');
    }
  };

  const handleSwap = () => {
    setDirection(prev => (prev === 'uk-nn' ? 'nn-uk' : 'uk-nn'));
    if (resultText) {
      setSourceText(resultText);
      setResultText('');
      setFallback(false);
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
            placeholder="Введи текст для перекладу..."
            disabled={isTranslating}
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
          <span className="label-text font-semibold text-sm mb-1">{targetLabel}</span>
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

      <div className="mt-4">
        {fallback && (
          <div className="text-xs text-warning mb-2">Результат може містити Bokmål форми</div>
        )}
        <Button
          loading={isTranslating}
          disabled={isTranslating || !sourceText.trim()}
          onClick={handleTranslate}
        >
          {isTranslating ? 'Перекладаю...' : 'Перекласти'}
        </Button>
      </div>
    </div>
  );
}
