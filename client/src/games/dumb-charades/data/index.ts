export * from './types.ts';
import type { CharadesPack, CharadesCategory, CharadesLang } from './types.ts';
import { pack as moviesEn } from './movies.en.ts';
import { pack as moviesTe } from './movies.te.ts';
import { pack as moviesHi } from './movies.hi.ts';
import { pack as tvEn } from './tv.en.ts';
import { pack as tvTe } from './tv.te.ts';
import { pack as tvHi } from './tv.hi.ts';
import { pack as songsEn } from './songs.en.ts';
import { pack as songsTe } from './songs.te.ts';
import { pack as songsHi } from './songs.hi.ts';
import { pack as people } from './people.ts';
import { pack as animals } from './animals.ts';
import { pack as places } from './places.ts';
import { pack as food } from './food.ts';
import { pack as books } from './books.ts';
import { pack as actions } from './actions.ts';
import { pack as funny } from './funny.ts';

export const PACKS: CharadesPack[] = [
  moviesEn, moviesTe, moviesHi,
  tvEn, tvTe, tvHi,
  songsEn, songsTe, songsHi,
  people, animals, places, food, books, actions, funny,
];

export const CATEGORIES: Array<{ id: CharadesCategory | 'random'; icon: string }> = [
  { id: 'movies', icon: '🎬' }, { id: 'tv', icon: '📺' }, { id: 'songs', icon: '🎵' },
  { id: 'people', icon: '👤' }, { id: 'places', icon: '🌎' }, { id: 'animals', icon: '🐶' },
  { id: 'food', icon: '🍔' }, { id: 'books', icon: '📚' }, { id: 'actions', icon: '🎭' },
  { id: 'funny', icon: '😂' }, { id: 'random', icon: '🎯' },
];

export const LANGUAGES: Array<{ id: CharadesLang; label: string }> = [
  { id: 'en', label: 'English' }, { id: 'te', label: 'తెలుగు' }, { id: 'hi', label: 'हिन्दी' },
];
