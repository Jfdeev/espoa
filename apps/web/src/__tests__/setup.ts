// Polyfills IndexedDB globally before any test module is evaluated.
// This ensures Dexie picks up the in-memory fake instead of the real browser API.
import "fake-indexeddb/auto";
