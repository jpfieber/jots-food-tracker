export const DEFAULT_SETTINGS: FoodTrackerSettings = {
    foodFolder: 'Food',
    usdaFolder: 'USDA',
    recipesFolder: 'Recipes',
    journalFolder: 'Journal', journalNameFormat: 'YYYY-MM-DD',
    meals: [
        { name: 'Breakfast', defaultTime: '07:00', emoji: '🍳' },
        { name: 'Lunch', defaultTime: '12:00', emoji: '🥪' },
        { name: 'Dinner', defaultTime: '18:00', emoji: '🍽️' },
        { name: 'Snack', defaultTime: '15:00', emoji: '🍎' }
    ],
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
    nestJournalEntries: false,
    dateColor: '#888888',
    frontmatterExclusionField: '',
    excludedParentSelectors: [],
    footerOrder: 100
};

export type FoodTrackerSettings = {
    foodFolder: string;
    usdaFolder: string;
    recipesFolder: string;
    journalFolder: string; journalNameFormat: string;
    meals: Array<{
        name: string;
        defaultTime: string;
        emoji: string;
    }>;
    foodGroups: string[];
    stringPrefixLetter: string;
    stringSVG: string;
    excludedFolders: string[];
    updateDelay: number;
    displayFooter: boolean;
    nestJournalEntries: boolean;
    dateColor: string;
    frontmatterExclusionField: string;
    excludedParentSelectors: string[];
    footerOrder: number;
};