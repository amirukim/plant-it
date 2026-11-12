import { fetchGardenSystemData as fetchApi, fetchPotHistory as fetchApiHistory } from "@/data/api"
import {
  fetchGardenSystemData as fetchMock,
  fetchPotHistory as fetchMockHistory,
} from "@/data/mockPlantData"

const useMock = import.meta.env.VITE_USE_MOCK !== "false"

export const fetchGardenSystemData = useMock ? fetchMock : fetchApi
export const fetchPotHistory = useMock ? fetchMockHistory : fetchApiHistory
