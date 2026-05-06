const DEVICE_ID_KEY = "espoa.device_id";

/**
 * Retorna um identificador único para este dispositivo/browser.
 * Gerado uma vez e persistido em localStorage.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
