import { Plugin, TFile, MarkdownRenderer, PluginSettingTab, Setting, Modal, MarkdownView, App, MarkdownViewModeType } from 'obsidian';
import { UnifiedFoodEntryModal } from './modals/UnifiedFoodEntryModal';
import { CreateFoodNoteModal } from './modals/CreateFoodNoteModal';
import { FoodTrackerSettings, DEFAULT_SETTINGS } from './types/settings';
import { FoodTrackerSettingTab } from "./settings";
import { debounce } from './utils/debounce';
import { generateFoodTrackerFooter } from './FoodTrackerFooter';
import { generateRecipeFooter } from "./recipeFooter";
import { createDiv, isTruthy } from './utils/dom';
import moment from 'moment';
import { isJotsAssistantAvailable, addJotsToJournal } from './utils/jotsIntegration';

interface DataviewAPI {
    pages: (query: string) => any[];
    page: (path: string) => any;
}

interface ObsidianTasksPlugin {
    getTasks: () => any[];
}

declare module 'obsidian' {
    interface App {
        plugins: {
            plugins: {
                "dataview": { api: DataviewAPI };
                "obsidian-tasks-plugin": ObsidianTasksPlugin;
            };
        };
    }

    interface View {
        mode?: string;
        getMode?(): string;
        sourceMode?: {
            cmEditor: CodeMirror.Editor;
        };
    }
}

interface Task {
    path: string;
    description: string;
    status?: {
        configuration?: {
            symbol: string;
        };
    };
    cal?: number;
    fat?: number;
    carbs?: number;
    protein?: number;
}

interface ModalSubmitData {
    selectedDate: string;
    selectedTime: string;
    selectedMeal: string;
    selectedFood: string;
    selectedServing?: string;
    quantity?: number;
    isManual: boolean;
    calories?: number;
    fat?: number;
    carbs?: number;
    protein?: number;
}

interface CreateFoodNoteData {
    name: string;
    group: string;
    containerGrams?: number;
    servingGrams: number;
    servingDescription: string;
    calories: number;
    nutrientValues: {
        fat?: number;
        saturatedfat?: number;
        transfat?: number;
        cholesterol?: number;
        sodium?: number;
        carbs?: number;
        fiber?: number;
        sugars?: number;
        protein?: number;
        vitamind?: number;
        calcium?: number;
        iron?: number;
        potassium?: number;
    };
}

interface DataviewItem {
    file: {
        name: string;
        path: string;
    };
}

interface ContentGenerator {
    (file: TFile): Promise<HTMLElement | null>;
}

export default class FoodTrackerPlugin extends Plugin {
    settings: FoodTrackerSettings = DEFAULT_SETTINGS;
    contentObserver: MutationObserver | null = null;
    containerObserver: MutationObserver | null = null;
    immediateUpdateFoodTracker: () => Promise<void> = async () => Promise.resolve();

    async onload() {
        // Load settings
        await this.loadSettings();

        // Add settings tab
        this.addSettingTab(new FoodTrackerSettingTab(this.app, this));

        // Inject CSS
        this.injectCSS();
        this.injectCSSFromFile();

        // Command to log a food entry
        this.addCommand({
            id: 'log-food-item',
            name: 'Log Food Item',
            callback: async () => {
                await this.logFoodEntry();
            }
        });

        // Command to create a food note
        this.addCommand({
            id: 'create-food-note',
            name: 'Create Food Note',
            callback: async () => {
                await this.createFoodNote();
            }
        });

        // Create a debounced version of immediateUpdateFoodTracker
        this.immediateUpdateFoodTracker = debounce(async () => {
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf?.view instanceof MarkdownView) {
                try {
                    await this.addFoodTracker(activeLeaf.view);
                    this.adjustFooterPadding();
                } catch (error) {
                    console.error('Error in immediateUpdateFoodTracker:', error);
                }
            }
        }, 500); // Adjust the debounce delay as needed (500ms in this case)

        // Register for frontmatter changes
        this.registerEvent(
            this.app.metadataCache.on('changed', (file) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.frontmatter) {
                    this.immediateUpdateFoodTracker();
                }
            })
        );

        // Wait for the layout to be ready before registering events
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(
                this.app.workspace.on('layout-change', async () => {
                    this.immediateUpdateFoodTracker();
                })
            );

            this.registerEvent(
                this.app.workspace.on('active-leaf-change', async () => {
                    this.immediateUpdateFoodTracker();
                })
            );

            this.registerEvent(
                this.app.workspace.on('file-open', async () => {
                    this.immediateUpdateFoodTracker();
                })
            );

            this.registerEvent(
                this.app.workspace.on('editor-change', async () => {
                    this.immediateUpdateFoodTracker();
                })
            );

            // Initial update
            this.immediateUpdateFoodTracker();
        });
    }

    onunload() {
        this.removeCSS();

        // Begin Footer Code
        // Clean up observers
        this.disconnectObservers();

        // Remove any existing Simple Foot elements
        document.querySelectorAll('.food-tracker').forEach(el => el.remove());

        // Remove registered events
        this.app.workspace.off('layout-change', this.updateFoodTracker);
        this.app.workspace.off('active-leaf-change', this.updateFoodTracker);
        this.app.workspace.off('file-open', this.updateFoodTracker);
        this.app.workspace.off('editor-change', this.updateFoodTracker);
        // End Footer Code
    }

    async loadSettings() {
        const data = await this.loadData();

        // First, apply default settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

        // Handle migration from old settings format
        if ('journalFolder' in data || 'journalNameFormat' in data) {
            console.info('JOTS Food Tracker: Migrating from old settings format');

            // Convert old settings to new format
            if ('journalFolder' in data) {
                this.settings.journalRootFolder = data.journalFolder;
                delete (data as any).journalFolder;
            }

            if ('journalNameFormat' in data) {
                const oldFormat = data.journalNameFormat;
                // Split the old format into folder and file patterns
                const parts = oldFormat.split('/');
                if (parts.length > 1) {
                    // Last part is the file pattern
                    this.settings.journalFilePattern = parts.pop() || DEFAULT_SETTINGS.journalFilePattern;
                    // Rest is the folder pattern
                    this.settings.journalFolderPattern = parts.join('/');
                } else {
                    // If there were no slashes, assume it's just the file pattern
                    this.settings.journalFilePattern = oldFormat;
                    this.settings.journalFolderPattern = DEFAULT_SETTINGS.journalFolderPattern;
                }
                delete (data as any).journalNameFormat;
            }

            // Save the migrated settings
            await this.saveSettings();
        }

        // Initialize arrays if they don't exist
        this.settings.excludedFolders = this.settings.excludedFolders || [];
        this.settings.foodGroups = this.settings.foodGroups || [];
        this.settings.excludedParentSelectors = this.settings.excludedParentSelectors || [];
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    injectCSSFromFile() {
        // No need to do anything - Obsidian automatically loads styles.css from the plugin directory
    }

    removeCSS() {
        // Remove the dynamically injected CSS
        const dynamicStyle = document.getElementById("FoodTracker-dynamic-css");
        if (dynamicStyle) {
            dynamicStyle.remove();
        }

        // Remove the CSS injected from styles.css
        const fileStyle = document.getElementById("FoodTracker-styles-css");
        if (fileStyle) {
            fileStyle.remove();
        }
    } injectCSS() {
        try {
            const prefix = this.settings.stringPrefixLetter;
            const svg = this.settings.stringSVG;            // Generate meal-specific CSS rules
            const mealRules = this.settings.meals.map(meal => `
                span.dataview.inline-field > span.dataview.inline-field-standalone-value[data-dv-key="meal"] > span {
                    color: #ff5555 !important;
                }
            `).join('\n');

            const css = `
                input[data-task="${prefix}"]:checked,
                li[data-task="${prefix}"]>input:checked,
                li[data-task="${prefix}"]>p>input:checked {
                    --checkbox-marker-color: transparent;
                    border: none;
                    border-radius: 0;
                    background-image: none;
                    background-color: currentColor;
                    pointer-events: none;
                    -webkit-mask-size: var(--checkbox-icon);
                    -webkit-mask-position: 50% 50%;
                    color: black;
                    margin-left: -48px;
                    -webkit-mask-image: url("${svg}");
                }

                body [data-task="${prefix}"]>.dataview.inline-field>.dataview.inline-field-key::after {
                    content: "=";
                    color: black;
                }

                ${mealRules}
            `;

            // Remove any existing style element for dynamic CSS
            const existingStyle = document.getElementById("FoodTracker-dynamic-css");
            if (existingStyle) {
                existingStyle.remove();
            }

            // Create a new style element for dynamic CSS
            const style = document.createElement("style");
            style.id = "FoodTracker-dynamic-css";
            style.textContent = css;

            // Append the style element to the document head
            document.head.appendChild(style);

        } catch (error) {
            console.error("Error injecting dynamic CSS:", error);
        }
    }

    async logFoodEntry() {
        const dv = this.app.plugins.plugins["dataview"]?.api;
        if (!dv) {
            console.error("Dataview plugin is not enabled or loaded.");
            return;
        }

        try {
            const query = `"${this.settings.foodFolder}" or "${this.settings.usdaFolder}" or "${this.settings.recipesFolder}"`;
            const pages = dv.pages(query);
            const meals = this.settings.meals;

            // Handle both array-like and iterable responses from Dataview
            const rawItems = Array.from(pages || []);
            if (!rawItems || rawItems.length === 0) {
                console.error("No items found in the specified folders");
                return;
            }

            const items = rawItems.filter((item): item is DataviewItem => {
                if (!item || typeof item !== 'object') return false;
                if (!('file' in item)) return false;
                const file = item.file;
                if (!file || typeof file !== 'object') return false;
                if (!('name' in file) || typeof file.name !== 'string') return false;
                if (!('path' in file) || typeof file.path !== 'string') return false;
                return true;
            });

            items.sort((a, b) => {
                try {
                    return a.file.name.localeCompare(b.file.name);
                } catch (e) {
                    console.error("Error sorting items:", e);
                    return 0;
                }
            });

            if (items.length === 0) {
                console.error("No valid items found in the specified folders.");
                return;
            }

            new UnifiedFoodEntryModal(this.app, this.settings, items, async (data: ModalSubmitData) => {
                const {
                    selectedDate,
                    selectedTime,
                    selectedMeal,
                    selectedFood,
                    selectedServing,
                    quantity,
                    isManual,
                    calories: manualCalories,
                    fat: manualFat,
                    carbs: manualCarbs,
                    protein: manualProtein
                } = data;

                let calories: number | undefined,
                    fat: number | undefined,
                    carbs: number | undefined,
                    protein: number | undefined;
                let amount = '';
                let multiplier = 1;

                if (isManual) {
                    // Use the manually entered values directly, no multiplier needed
                    calories = manualCalories;
                    fat = manualFat;
                    carbs = manualCarbs;
                    protein = manualProtein;
                } else {
                    // Process automatic mode values
                    const selectedItem = items.find((item: DataviewItem) => item.file.name === selectedFood);
                    if (!selectedItem) {
                        console.error(`Selected food item not found: ${selectedFood}`);
                        return;
                    }

                    const page = dv.page(selectedItem.file.path);
                    if (!page) {
                        console.error(`Dataview page not found for: ${selectedItem.file.path}`);
                        return;
                    }

                    // Handle automatic mode nutrient calculations
                    if (selectedServing?.includes('of Recipe')) {
                        const servings = page.servings || 1;
                        const tasks = page.file.tasks?.values || [];
                        const prefix = this.settings.stringPrefixLetter;
                        const relevantTasks = tasks.filter((t: Task) => t.status === prefix);
                        multiplier = quantity ?? 1 / servings;

                        calories = relevantTasks.reduce((sum: number, t: Task) => sum + (t.cal || 0), 0) / servings;
                        fat = relevantTasks.reduce((sum: number, t: Task) => sum + (t.fat || 0), 0) / servings;
                        carbs = relevantTasks.reduce((sum: number, t: Task) => sum + (t.carbs || 0), 0) / servings;
                        protein = relevantTasks.reduce((sum: number, t: Task) => sum + (t.protein || 0), 0) / servings;
                    } else {
                        // Handle automatic mode for regular food items
                        let pageCalories = 0, pageFat = 0, pageCarbs = 0, pageProtein = 0;

                        // Safely extract values from page with fallbacks
                        if (typeof page === 'object' && page !== null) {
                            pageCalories = typeof page.calories === 'number' ? page.calories : 0;
                            pageFat = typeof page.fat === 'number' ? page.fat : 0;
                            pageCarbs = typeof page.carbohydrates === 'number' ? page.carbohydrates : 0;
                            pageProtein = typeof page.protein === 'number' ? page.protein : 0;
                        }

                        if (selectedServing) {
                            amount = selectedServing.split(" | ")[0];
                            const grams = selectedServing.split(" | ")[1];

                            if (grams === '100g') {
                                multiplier = quantity ?? 1;
                                amount = "100g";
                            } else {
                                const servingOptions = page.servings || [];
                                const selectedServingOption = servingOptions.find((option: string) => option.includes(selectedServing));
                                if (selectedServingOption) {
                                    const servingSize = parseFloat(selectedServingOption.split(" | ")[1]) || 1;
                                    multiplier = ((quantity ?? 1) * servingSize) / 100;
                                }
                            }
                        }

                        // Scale nutrient values using the corrected multiplier
                        calories = Math.round(pageCalories * multiplier);
                        fat = Math.round(pageFat * multiplier * 10) / 10;
                        carbs = Math.round(pageCarbs * multiplier * 10) / 10;
                        protein = Math.round(pageProtein * multiplier * 10) / 10;
                    }
                }

                // Build the task string
                const prefix = this.settings.stringPrefixLetter;

                // Format quantity string only for automatic entries
                const qtyText = !isManual && quantity !== undefined && quantity !== 1 ? ` x(qty:: ${quantity})` : '';
                const servingText = isManual ? 'Manual Entry' : (selectedServing?.split(" | ")[0] ?? '1 serving');

                let string; if (selectedMeal === "Recipe" && !isManual) {
                    // Recipe entries: no callout, no time, no type
                    string = `- [${prefix}] (serving:: ${servingText}${qtyText}) (item:: [[${selectedFood}]]) [cal:: ${calories ?? 0}], [fat:: ${fat ?? 0}], [carbs:: ${carbs ?? 0}], [protein:: ${protein ?? 0}]`;
                } else {
                    // Regular journal entries with proper handling of manual entries
                    const calloutPrefix = this.settings.nestJournalEntries ? '> ' : '';
                    const selectedMealSetting = this.settings.meals.find(m => m.name === selectedMeal);
                    const mealEmoji = selectedMealSetting ? selectedMealSetting.emoji : '🍽️';

                    const itemPart = isManual ? `(item:: ${selectedFood})` : `(item:: [[${selectedFood}]])`;
                    const servingPart = isManual ? '' : ` (${servingText}${qtyText})`;

                    string = `${calloutPrefix}- [${prefix}] (time:: ${selectedTime}) (meal:: ${selectedMeal}) ${itemPart}${servingPart} [cal:: ${calories ?? 0}], [fat:: ${fat ?? 0}], [carbs:: ${carbs ?? 0}], [protein:: ${protein ?? 0}]`;
                }

                if (selectedMeal === "Recipe") {
                    const activeLeaf = this.app.workspace.activeLeaf;
                    if (activeLeaf?.view instanceof MarkdownView && activeLeaf.view.sourceMode?.cmEditor) {
                        const editor = activeLeaf.view.sourceMode.cmEditor;
                        const cursor = editor.getCursor();
                        editor.replaceRange(string + '\n', cursor);
                    } else {
                        console.error("No active markdown editor found.");
                    }
                } else {
                    // Journal entry
                    const journalPath = this.getJournalPath(moment(selectedDate));
                    const journalFile = this.app.vault.getAbstractFileByPath(journalPath);

                    if (journalFile instanceof TFile) {
                        let content = await this.app.vault.read(journalFile);
                        content = content.replace(/\n+$/, ''); // Remove blank lines at the end
                        await this.app.vault.modify(journalFile, content + '\n' + string);
                        // Call JOTS Assistant to add tracking
                        try {
                            if (isJotsAssistantAvailable()) {
                                // Extract just the date part from the path
                                const datePart = moment(selectedDate).format(this.getJournalPathSettings().filePattern);
                                console.debug('JOTS Food Tracker: Adding JOTS to journal:', {
                                    fullPath: journalPath,
                                    datePart: datePart
                                });
                                await window.JotsAssistant!.api.addJotsToJournal(datePart);
                            }
                        } catch (error) {
                            console.warn('Failed to add JOTS to journal:', error);
                        }

                        this.immediateUpdateFoodTracker();
                    } else {
                        console.log('Journal file not found.');
                    }
                }
            }).open();
        } catch (error) {
            console.error("Error in logFoodEntry:", error);
        }
    }

    async createFoodNote() {
        new CreateFoodNoteModal(
            this.app,
            [], // Pass an empty array or the list of existing food items if available
            this.settings.foodGroups, // Pass the foodGroups from the plugin settings
            async (data: CreateFoodNoteData) => {
                const { name, group, containerGrams, servingGrams, servingDescription, calories, nutrientValues } = data;
                const fileName = `${name}.md`;
                const filePath = `${this.settings.foodFolder}/${fileName}`;

                // Construct the YAML frontmatter with dynamic nutrient properties
                let servings = [`Default | 100g`, `${servingDescription} | ${servingGrams}g`];
                if (containerGrams !== undefined && !isNaN(containerGrams) && containerGrams > 0) {
                    servings.push(`Container | ${containerGrams}g`);
                }

                let fileContent = `---
fileClass: Ingredient
aliases: []
created: 
filename: ${name}
name: ${name}
cssclasses: ['nutFact']
foodgroup: ${group}
calories: ${calories}
fat: ${nutrientValues.fat || ''}
saturatedfat: ${nutrientValues.saturatedfat || ''}
transfat: ${nutrientValues.transfat || ''}
cholesterol: ${nutrientValues.cholesterol || ''}
sodium: ${nutrientValues.sodium || ''}
carbohydrates: ${nutrientValues.carbs || ''}
fiber: ${nutrientValues.fiber || ''}
sugars: ${nutrientValues.sugars || ''}
protein: ${nutrientValues.protein || ''}
vitamind: ${nutrientValues.vitamind || ''}
calcium: ${nutrientValues.calcium || ''}
iron: ${nutrientValues.iron || ''}
potassium: ${nutrientValues.potassium || ''}
servings: ${JSON.stringify(servings)}
serv_g: 100
---

# ${name}
`; try {
                    await this.app.vault.create(filePath, fileContent);                    // Call JOTS Assistant to add tracking
                    try {
                        if (isJotsAssistantAvailable()) {
                            await addJotsToJournal(filePath);
                        }
                    } catch (error) {
                        console.warn('Failed to add JOTS to journal:', error);
                    }
                } catch (error) {
                    console.error('Error creating food note:', error);
                }
            }
        ).open();
    } async addFoodTracker(view: MarkdownView) {
        const file = view.file;
        if (!file) return;

        // Check if the current file is in an excluded folder or has excluded parent
        if (this.shouldExcludeFile(file.path)) {
            return;
        }

        let footer: HTMLElement | null = null;

        if (file.path.endsWith('.recipe.md') || file.path.includes(this.settings.recipesFolder)) {
            footer = await generateRecipeFooter(file, this.app);
        } else {
            // Check if this is a journal file
            const pathInfo = this.getJournalPathSettings();
            if (file.path.startsWith(pathInfo.rootFolder)) {
                footer = await generateFoodTrackerFooter(file, this.app);
            }
        }

        if (!footer) return;
    }

    async updateFoodTracker() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf?.view instanceof MarkdownView) {
            await this.addFoodTracker(activeLeaf.view);
        }
    }

    disconnectObservers() {
        // Disconnect any existing observers
        if (this.contentObserver) {
            this.contentObserver.disconnect();
        }
        if (this.containerObserver) {
            this.containerObserver.disconnect();
        }
    }

    observeContainer(container: HTMLElement) {
        if (this.containerObserver) {
            this.containerObserver.disconnect();
        }

        this.containerObserver = new MutationObserver(async (mutations) => {
            const FoodTracker = container.querySelector('.food-tracker');
            if (!FoodTracker) {
                const view = this.app.workspace.activeLeaf?.view;
                if (view instanceof MarkdownView) {
                    try {
                        await this.addFoodTracker(view);
                    } catch (error) {
                        console.error('Error in mutation observer:', error);
                    }
                }
            }
        });

        this.containerObserver.observe(container, { childList: true, subtree: true });
    }

    async createFoodTracker(file: TFile, contentGenerator: (file: TFile) => Promise<HTMLElement | null>) {
        try {
            // Create the footer container
            const FoodTracker = createDiv({ cls: 'food-tracker food-tracker--hidden' });
            // Set the order using CSS
            FoodTracker.style.order = String(this.settings.footerOrder);

            FoodTracker.createDiv({ cls: 'food-tracker--dashed-line' });
            const SFwrapper = FoodTracker.createDiv({ cls: 'food-tracker--wrapper' });

            // Generate dynamic content using the provided content generator
            const generatedContent = await contentGenerator(file);

            if (generatedContent instanceof HTMLElement) {
                const contentDiv = SFwrapper.createDiv({ cls: 'food-tracker--dynamic-content' });
                contentDiv.appendChild(generatedContent); // Append the generated content
            } else {
                SFwrapper.createDiv({
                    cls: 'food-tracker--foot-text',
                    text: `No content available for this footer.`
                });
            }

            // Trigger fade-in after a brief delay to ensure DOM is ready
            setTimeout(() => {
                FoodTracker.removeClass('food-tracker--hidden');
            }, 10);

            return FoodTracker;
        } catch (error) {
            console.error('Error in createFoodTracker:', error);
            return null;
        }
    }

    shouldExcludeFile(filePath: string) {
        // Check excluded folders
        if (this.settings?.excludedFolders?.some(folder => filePath.startsWith(folder))) {
            return true;
        }

        // Check frontmatter exclusion field
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile && this.settings.frontmatterExclusionField) {
            const cache = this.app.metadataCache.getFileCache(file);
            const frontmatterValue = cache?.frontmatter?.[this.settings.frontmatterExclusionField];
            if (this.isTruthy(frontmatterValue)) {
                return true;
            }
        }

        // Check excluded parent selectors
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf?.view?.containerEl) {
            return this.settings?.excludedParentSelectors?.some(selector => {
                try {
                    // Check if any parent element matches the selector
                    let element: HTMLElement | null = this.castToHTMLElement(activeLeaf.view.containerEl);
                    while (element) {
                        if (element.matches?.(selector)) {
                            return true;
                        }
                        // Also check if the current element contains any matching elements
                        if (element.querySelector?.(selector)) {
                            return true;
                        }
                        element = element.parentElement;
                    }
                    return false;
                } catch (e) {
                    console.error(`Invalid selector in Simple Foot settings: ${selector}`);
                    return false;
                }
            });
        }

        return false;
    }

    isEditMode() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return false;
        return (activeView.getMode?.() ?? activeView.mode) === 'source';
    }

    // adjust footer padding
    adjustFooterPadding() {
        setTimeout(() => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) return;

            const readingView = this.castToHTMLElement(activeView.contentEl.querySelector('.markdown-reading-view')!);
            if (!readingView) return;

            const preview = this.castToHTMLElement(readingView.querySelector('.markdown-preview-view')!);
            const previewSizer = this.castToHTMLElement(readingView.querySelector('.markdown-preview-sizer')!);
            const footer = this.castToHTMLElement(readingView.querySelector('.markdown-preview-sizer > .food-tracker')!);

            if (!preview || !previewSizer || !footer) return;

            // Reset any existing padding first
            readingView.style.setProperty('--food-tracker-top-padding', '0px');

            // Get the content height excluding the footer
            const contentHeight = previewSizer.offsetHeight - footer.offsetHeight;

            // Calculate available space
            const availableSpace = preview.offsetHeight - contentHeight - footer.offsetHeight - 85;

            // Only add padding if there's significant space available (more than 20px)
            if (availableSpace > 20) {
                readingView.style.setProperty('--food-tracker-top-padding', `${availableSpace}px`);
                readingView.style.setProperty('--food-tracker-margin-bottom', '0');
            } else {
                readingView.style.setProperty('--food-tracker-top-padding', '10px');
                readingView.style.setProperty('--food-tracker-margin-bottom', '20px');
            }
        }, 100);
    }

    async nutritionFooter(file: TFile): Promise<HTMLElement | null> {
        // Access the Tasks plugin
        const tasksPlugin = this.app.plugins.plugins["obsidian-tasks-plugin"];
        if (!tasksPlugin) {
            console.error("Tasks plugin is not enabled or loaded.");
            return null;
        }

        // Get tasks from the Tasks plugin
        const tasks = tasksPlugin.getTasks().filter((task: Task) => task.path === file.path);
        if (tasks.length > 0) {
            const headers = ["Meal", "Calories", "Fat", "Carbs", "Protein"];
            const meals = this.settings.meals || [];
            let summary: any[] = [];
            let mealTaskCount = 0;

            function highlight(value: string): string {
                return `**${value}**`;
            }

            function getsums(result: any[]) {
                let calsum = 0, fatsum = 0, carbssum = 0, proteinsum = 0;
                result.forEach(v => {
                    calsum += parseFloat(v[1]);
                    fatsum += parseFloat(v[2]);
                    carbssum += parseFloat(v[3]);
                    proteinsum += parseFloat(v[4]);
                });
                summary.push([highlight(result[0][0]), (Math.round(calsum * 10) / 10).toString(), (Math.round(fatsum * 10) / 10).toString(), (Math.round(carbssum * 10) / 10).toString(), (Math.round(proteinsum * 10) / 10).toString()]);
            }

            meals.forEach(mealSetting => {
                const mealName = mealSetting.name; const result = tasks.filter(t => {
                    const mealMatch = t.description.match(/meal::\s*([^\s,\)]+)/i);
                    const taskMeal = mealMatch?.[1]?.trim();
                    const isCompleted = t.status?.configuration?.symbol === "c";
                    if (!taskMeal) return false;

                    // Match either the meal name or its emoji
                    const matchedName = taskMeal.toLowerCase() === mealName.toLowerCase();
                    const matchedEmoji = taskMeal === mealSetting.emoji;
                    const matched = matchedName || matchedEmoji;

                    return isCompleted && matched;
                }).map(e => {
                    const calMatch = e.description.match(/cal::\s*(\d+(\.\d+)?)/);
                    const fatMatch = e.description.match(/fat::\s*(\d+(\.\d+)?)/);
                    const carbsMatch = e.description.match(/carbs::\s*(\d+(\.\d+)?)/);
                    const proteinMatch = e.description.match(/protein::\s*(\d+(\.\d+)?)/);

                    return [
                        mealName,
                        (calMatch ? parseFloat(calMatch[1]) : 0).toString(),
                        (fatMatch ? parseFloat(fatMatch[1]) : 0).toString(),
                        (carbsMatch ? parseFloat(carbsMatch[1]) : 0).toString(),
                        (proteinMatch ? parseFloat(proteinMatch[1]) : 0).toString()
                    ];
                });

                if (result.length > 0) {
                    getsums(result);
                    mealTaskCount += result.length;
                }
            });

            if (mealTaskCount > 0) {
                let calsum = 0, fatsum = 0, carbssum = 0, proteinsum = 0;
                summary.forEach(v => {
                    calsum += parseFloat(v[1]);
                    fatsum += parseFloat(v[2]);
                    carbssum += parseFloat(v[3]);
                    proteinsum += parseFloat(v[4]);
                });
                summary.push([highlight("Total"), highlight((Math.round(calsum * 10) / 10).toString()), highlight((Math.round(fatsum * 10) / 10).toString()), highlight((Math.round(carbssum * 10) / 10).toString()), highlight((Math.round(proteinsum * 10) / 10).toString())]);

                function generateMarkdownTable(headers: string[], rows: any[]): string {
                    const headerRow = `| ${headers.join(" | ")} |`;
                    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
                    const dataRows = rows.map(row => `| ${row.join(" | ")} |`).join("\n");
                    return `${headerRow}\n${separatorRow}\n${dataRows}`;
                }

                // Convert the markdown table to an HTMLElement
                const container = createDiv();
                await MarkdownRenderer.renderMarkdown(generateMarkdownTable(headers, summary), container, file.path, this);
                return container;
            }
        }
        return null;
    }

    private isTruthy(value: any): boolean {
        return isTruthy(value);
    }

    private castToHTMLElement(element: Element): HTMLElement {
        return element as HTMLElement;
    }

    /**
     * Gets the journal path settings either from JOTS Assistant or local settings
     */
    getJournalPathSettings() {
        if (isJotsAssistantAvailable()) {
            const jotsInfo = window.JotsAssistant!.api.getJournalPathInfo();
            return {
                rootFolder: jotsInfo.rootFolder,
                folderPattern: jotsInfo.folderPattern,
                filePattern: jotsInfo.filePattern
            };
        } else {
            return {
                rootFolder: this.settings.journalRootFolder,
                folderPattern: this.settings.journalFolderPattern,
                filePattern: this.settings.journalFilePattern
            };
        }
    }

    /**
     * Gets the full path for a journal entry based on the date
     */
    getJournalPath(date: moment.Moment): string {
        const pathInfo = this.getJournalPathSettings();
        const folderPath = moment(date).format(pathInfo.folderPattern);
        const fileName = moment(date).format(pathInfo.filePattern);
        return `${pathInfo.rootFolder}/${folderPath}/${fileName}.md`;
    }
}