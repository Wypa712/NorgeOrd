import { useMutation } from '@tanstack/react-query';
import { analyzeWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useAnalyzeWord() {
  return useMutation({
    mutationFn: analyzeWord,
    onError: () => {
      toast.error('Не вдалося заповнити слово через AI. Спробуйте ще раз.');
    },
  });
}
