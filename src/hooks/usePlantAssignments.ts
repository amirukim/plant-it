import { useCallback, useEffect, useState } from "react"
import type { PlantAssignments, PotId } from "@/types/plant"

const STORAGE_KEY = "garden-plant-assignments"

function load(): PlantAssignments {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PlantAssignments) : {}
  } catch {
    return {}
  }
}

export function usePlantAssignments() {
  const [assignments, setAssignments] = useState<PlantAssignments>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
    } catch {
      /* storage unavailable */
    }
  }, [assignments])

  const assign = useCallback((potId: PotId, plantId: string) => {
    setAssignments((prev) => ({ ...prev, [potId]: plantId }))
  }, [])

  const clear = useCallback((potId: PotId) => {
    setAssignments((prev) => {
      const next = { ...prev }
      delete next[potId]
      return next
    })
  }, [])

  return { assignments, assign, clear }
}
