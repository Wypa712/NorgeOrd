import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useCreateWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success('Слово збережено');
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        const headword = err.config?.data
          ? JSON.parse(err.config.data).headword
          : '';
        toast.error(`Слово «${headword}» вже є у вашому словнику`);
      } else {
        toast.error('Не вдалося зберегти слово. Спробуйте ще раз.');
      }
    },
  });
}
