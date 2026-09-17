import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { CATEGORY_GROUPS } from '../lib/categoryGroups';

export function useCategories() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const categories = data || [];

  const groupedCategories = CATEGORY_GROUPS
    .map((group) => ({
      group,
      categories: categories.filter((c) => c.group === group.slug && c.isActive !== false),
    }))
    .filter((g) => g.categories.length > 0);

  return { categories, groupedCategories, isLoading };
}
