import { useQuery } from '@tanstack/react-query';
import { listWords } from '../api/wordsApi';

export function useWords(query?: string) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['words', query ?? ''],
    queryFn: () => listWords(query),
  });
  return { data, isPending, isError };
}
