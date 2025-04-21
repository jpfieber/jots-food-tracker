export const DEFAULT_SETTINGS: FoodTrackerSettings = {
    foodFolder: 'Food',
    usdaFolder: 'USDA',
    recipesFolder: 'Recipes',
    journalFolder: 'Journal',
    journalNameFormat: 'YYYY-MM-DD',
    meals: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    foodGroups: [
        "American Indian", "Baby Foods", "Baked Foods", "Beans and Lentils", "Beverages",
        "Breakfast Cereals", "Dairy and Egg Products", "Fast Foods", "Fats and Oils", "Fish",
        "Fruits", "Grains and Pasta", "Meats", "Nuts and Seeds", "Prepared Meals",
        "Restaurant Foods", "Snacks", "Soups and Sauces", "Spices and Herbs", "Sweets", "Vegetables"
    ],
    stringPrefixLetter: 'X',
    stringSVG: '',
    excludedFolders: [],
    updateDelay: 3000,
    displayFooter: true,
    nestJournalEntries: false
};

export type FoodTrackerSettings = {
    foodFolder: string;
    usdaFolder: string;
    recipesFolder: string;
    journalFolder: string;
    journalNameFormat: string;
    meals: string[];
    foodGroups: string[];
    stringPrefixLetter: string;
    stringSVG: string;
    excludedFolders: string[];
    updateDelay: number;
    displayFooter: boolean;
    nestJournalEntries: boolean;
};