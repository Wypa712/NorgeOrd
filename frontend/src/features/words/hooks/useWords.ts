import { useQuery } from '@tanstack/react-query';
import { listWords } from '../api/wordsApi';

export function useWords() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['words'],
    queryFn: listWords,
  });
  return { data, isPending, isError };
}
