export type CharadesLang = 'en' | 'te' | 'hi';
export type CharadesCategory = 'movies' | 'tv' | 'songs' | 'people' | 'places' | 'animals' | 'food' | 'books' | 'actions' | 'funny';
export type CharadesDifficulty = 'easy' | 'medium' | 'hard' | 'veryhard';
export interface CharadesItem { name: string; display?: string; difficulty: CharadesDifficulty; }
export interface CharadesPack { language: CharadesLang; category: CharadesCategory; items: CharadesItem[]; }
