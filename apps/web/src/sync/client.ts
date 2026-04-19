import axios from "axios";
import type { SyncRequestBody, SyncResponseBody } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001",
  timeout: 10000,
});

export async function syncRequest(body: SyncRequestBody) {
  const response = await api.post<SyncResponseBody>("/sync", body);
  return response.data;
}
