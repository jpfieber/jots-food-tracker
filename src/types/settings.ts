export const DEFAULT_SETTINGS: FoodTrackerSettings = {
    foodFolder: 'Food', // Default folder for Food Notes
    usdaFolder: 'USDA', // Default folder for USDA Notes
    recipesFolder: 'Recipes',
    journalFolder: 'Journal',
    journalNameFormat: 'YYYY-MM-DD',
    meals: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    stringPrefixLetter: 'X',
    stringSVG: '',
    excludedFolders: [],
    updateDelay: 3000,
    displayFooter: true
};

export type FoodTrackerSettings = {
    foodFolder: string;
    usdaFolder: string;
    recipesFolder: string;
    journalFolder: string;
    journalNameFormat: string;
    meals: string[];
    stringPrefixLetter: string;
    stringSVG: string;
    excludedFolders: string[];
    updateDelay: number;
    displayFooter: boolean;
};