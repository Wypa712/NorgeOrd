import { useQuery } from '@tanstack/react-query';
import { getWord } from '../api/wordsApi';

export function useWord(id: string | null) {
  return useQuery({
    queryKey: ['words', id],
    queryFn: () => getWord(id!),
    enabled: !!id,
  });
}
