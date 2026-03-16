import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useConfigLists(listType) {
  const { data = [] } = useQuery({
    queryKey: ["configLists", listType],
    queryFn: () => base44.entities.ConfigLists.filter({ list_type: listType, is_active: true }),
  });
  return data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(item => item.value);
}

export function useAllConfigLists() {
  const { data = [] } = useQuery({
    queryKey: ["configLists"],
    queryFn: () => base44.entities.ConfigLists.list(),
  });
  return data;
}