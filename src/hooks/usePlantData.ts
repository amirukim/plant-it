import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchGardenSystemData, fetchPotHistory } from "@/data"
import { applyAssignments } from "@/utils/plantAdvisor"
import type { PlantAssignments, PotId, PotMetric, TimeRange } from "@/types/plant"

export function usePlantData(assignments: PlantAssignments = {}) {
  const select = useCallback(
    (data: Awaited<ReturnType<typeof fetchGardenSystemData>>) => applyAssignments(data, assignments),
    [assignments]
  )
  return useQuery({
    queryKey: ["garden-system"],
    queryFn: fetchGardenSystemData,
    select,
    refetchInterval: 5_000,
    staleTime: 4_000,
    retry: 1,
  })
}

export function usePotHistory(potId: PotId, metric: PotMetric, range: TimeRange) {
  return useQuery({
    queryKey: ["pot-history", potId, metric, range],
    queryFn: () => fetchPotHistory(potId, metric, range),
    refetchInterval: 30_000,
    staleTime: 25_000,
    placeholderData: (previous) => previous,
  })
}
