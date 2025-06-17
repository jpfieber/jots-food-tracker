export interface MealSetting {
    name: string;
    defaultTime: string;
    emoji: string;
}

export type MealsType = MealSetting[];

export interface FoodTrackerSettings {
    usdaFolder: string;
    foodFolder: string;
    recipesFolder: string;
    // Journal path settings
    journalRootFolder: string;     // Replaces journalFolder
    journalFolderPattern: string;  // New setting for folder pattern
    journalFilePattern: string;    // Replaces journalNameFormat
    // Other settings
    meals: MealsType;
    displayFooter: boolean;
    footerOrder?: number;
    frontmatterExclusionField?: string;
    excludedParentSelectors?: string[];
    stringPrefixLetter: string;
    stringSVG: string;
    excludedFolders: string[];
    foodGroups: string[];
    nestJournalEntries: boolean; useJotsAssistant: boolean;    // Whether to use JOTS Assistant integration
}

export const DEFAULT_SETTINGS: FoodTrackerSettings = {
    foodFolder: "FoodTracker/Food",
    usdaFolder: "FoodTracker/USDA",
    recipesFolder: "FoodTracker/Recipes",
    journalRootFolder: "Chronological/Journals",
    journalFolderPattern: "YYYY/YYYY-MM",
    journalFilePattern: "YYYY-MM-DD_ddd",
    meals: [
        { name: "Breakfast", defaultTime: "07:00", emoji: "🕖" },
        { name: "Morning Snack", defaultTime: "09:30", emoji: "🕤" },
        { name: "Lunch", defaultTime: "12:00", emoji: "🕛" },
        { name: "Afternoon Snack", defaultTime: "14:30", emoji: "🕝" },
        { name: "Dinner", defaultTime: "17:30", emoji: "🕠" },
        { name: "Evening Snack", defaultTime: "20:00", emoji: "🕗" },
        { name: "Recipe", defaultTime: "", emoji: "" }
    ],
    displayFooter: true,
    footerOrder: 1000,
    frontmatterExclusionField: "excludeFromFooter", excludedParentSelectors: [],
    stringPrefixLetter: "c",
    stringSVG: "",
    excludedFolders: [],
    foodGroups: [], nestJournalEntries: false,
    useJotsAssistant: true
};