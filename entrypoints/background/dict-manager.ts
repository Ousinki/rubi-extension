import {
  JpdictIdb,
  updateWithRetry,
  allMajorDataSeries,
} from '@birchill/jpdict-idb';
import { wordSearch } from './jpdict/word-search';
import { nameSearch } from './jpdict/name-search';
import { getWords as idbGetWords, getNames as idbGetNames } from '@birchill/jpdict-idb';

// Global database instance
export let db: JpdictIdb | undefined;
let isUpdating = false;

export async function initDictionary() {
  if (db) return db;
  
  db = new JpdictIdb();
  
  // Wait for the database to be ready
  try {
    await db.ready;
    console.log('[Rubi] JpdictIdb ready successfully. Current state:', {
      words: db.words.state,
      names: db.names.state,
      kanji: db.kanji.state
    });
  } catch (e) {
    console.error('[Rubi] Failed to open JpdictIdb:', e);
  }

  // Start background update
  updateDictionaries();
  
  return db;
}

async function updateDictionaries() {
  if (!db || isUpdating) return;
  isUpdating = true;
  
  const lang = 'en'; // We use English dictionary for definitions
  
  try {
    for (const series of ['kanji', 'names', 'words'] as const) {
      await new Promise<void>((resolve, reject) => {
        updateWithRetry({
          db: db!,
          series,
          lang,
          onUpdateComplete: () => {
            console.log(`[Rubi] Successfully updated dictionary series: ${series}`);
            resolve();
          },
          onUpdateError: (params) => {
            console.warn(`[Rubi] Error updating ${series}:`, params.error);
            // We ignore errors and continue to next series if it fails permanently,
            // but updateWithRetry will actually retry. We'll resolve on fatal error to not block.
            if (!params.nextRetry) {
              resolve();
            }
          },
        });
      });
    }
  } finally {
    isUpdating = false;
  }
}

export async function searchWords(text: string) {
  if (!db) {
    console.log('[Rubi] searchWords: db is null');
    return null;
  }
  const inputLengths = Array.from({ length: text.length + 1 }, (_, i) => i);
  try {
    const result = await wordSearch({
      input: text,
      inputLengths,
      maxResults: 5,
      getWords: async (params) => idbGetWords(params.input, { matchType: 'exact', limit: params.maxResults })
    });
    console.log(`[Rubi] searchWords: input="${text}", result=`, result);
    return result;
  } catch (e) {
    console.error('[Rubi] searchWords error:', e);
    throw e;
  }
}

export async function searchNames(text: string) {
  if (!db) return [];
  const inputLengths = Array.from({ length: text.length + 1 }, (_, i) => i);
  // Wrap nameSearch for background usage
  const result = await nameSearch({
    input: text,
    inputLengths,
    maxResults: 5
  });
  return result;
}
