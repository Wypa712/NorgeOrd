import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import { translate } from '../api/translateApi';

interface TranslateInput {
  text: string;
  sourceLang: string;
  targetLang: string;
  signal?: AbortSignal;
}

interface TranslateResult {
  text: string;
  fallback: boolean;
}

export function useTranslate(
  options?: UseMutationOptions<TranslateResult, Error, TranslateInput>,
) {
  return useMutation<TranslateResult, Error, TranslateInput>({
    mutationFn: ({ text, sourceLang, targetLang, signal }) => (
      translate(text, sourceLang, targetLang, signal)
    ),
    ...options,
  });
}
