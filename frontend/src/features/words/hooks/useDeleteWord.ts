import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useDeleteWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success('Слово видалено');
    },
    onError: () => {
      toast.error('Не вдалося видалити слово. Спробуйте ще раз.');
    },
  });
}
