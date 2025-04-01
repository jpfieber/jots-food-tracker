// This file contains TypeScript type definitions for the plugin, including interfaces and types used throughout the codebase.

export interface FoodEntry {
    date: string;
    meal: string;
    foodItem: string;
    serving: string;
    quantity: number;
}

export interface FoodNote {
    name: string;
    group: string;
    containerGrams: number;
    servingGrams: number;
    servingDescription: string;
    calories: number;
    nutrientValues: Record<string, number>;
}

export interface PluginSettings {
    foodFolder: string;
    usdaFolder: string;
    recipesFolder: string;
    journalFolder: string;
    journalNameFormat: string;
    meals: string[];
    stringPrefixLetter: string;
    stringSVG: string;
}