import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useUpdateWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success('Зміни збережено');
    },
    onError: () => {
      toast.error('Не вдалося зберегти зміни. Спробуйте ще раз.');
    },
  });
}
