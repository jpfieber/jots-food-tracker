import { Plugin, TFile, MarkdownRenderer, PluginSettingTab, Setting, Modal, moment, MarkdownView } from 'obsidian';
import { UnifiedFoodEntryModal } from './modals/UnifiedFoodEntryModal';
import { CreateFoodNoteModal } from './modals/CreateFoodNoteModal';
import { FoodTrackerSettings, DEFAULT_SETTINGS } from './types/settings';
import { FoodTrackerSettingTab } from "./settings";
import { debounce } from './utils/debounce';
import { generateFoodTrackerFooter } from './FoodTrackerFooter';
import { generateRecipeFooter } from "./recipeFooter";

class FoodTrackerSettings {
    constructor() {
        this.excludedFolders = [];
        this.showReleaseNotes = true;
        this.lastVersion = null;
        this.updateDelay = DEFAULT_SETTINGS.updateDelay;
        this.excludedParentSelectors = [];
        this.frontmatterExclusionField = '';
    }
}

export default class FoodTrackerPlugin extends Plugin {
    settings: FoodTrackerSettings;

    async onload() {
        console.log('Food Tracker: Loading plugin');

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
        console.log('Food Tracker: Unloading plugin');
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
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Initialize the displayFooter setting if it doesn't exist
        if (this.settings.displayFooter === undefined) {
            this.settings.displayFooter = true; // Default to true
        }

        // Begin Footer code
        document.documentElement.style.setProperty('--food-tracker-date-color', this.settings.dateColor);

        // Ensure excludedFolders is always an array
        if (!Array.isArray(this.settings.excludedFolders)) {
            this.settings.excludedFolders = [];
        }
        // End Footer code
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.injectCSS();
        this.injectCSSFromFile();
    }

    injectCSSFromFile() {
        try {
            // Dynamically import the styles.css file
            const cssPath = new URL('./styles.css', import.meta.url).href;

            // Fetch the CSS file content
            fetch(cssPath)
                .then((response) => response.text())
                .then((css) => {
                    // Remove any existing style element for styles.css
                    const existingStyle = document.getElementById("FoodTracker-styles-css");
                    if (existingStyle) {
                        existingStyle.remove();
                    }

                    // Create a new style element for styles.css
                    const style = document.createElement("style");
                    style.id = "FoodTracker-styles-css";
                    style.textContent = css;

                    // Append the style element to the document head
                    document.head.appendChild(style);
                })
                .catch((error) => {
                    console.error("Error injecting CSS from file:", error);
                });
        } catch (error) {
            console.error("Error injecting CSS from file:", error);
        }
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
    }

    injectCSS() {
        try {
            const prefix = this.settings.stringPrefixLetter;
            const svg = this.settings.stringSVG;
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
    
        const items = dv.pages(`"${this.settings.foodFolder}" or "${this.settings.usdaFolder}" or "${this.settings.recipesFolder}"`).sort(n => n.file.name);
        if (!items || items.length === 0) {
            console.error("No items found in the specified folders.");
            return;
        }
    
        new UnifiedFoodEntryModal(this.app, this.settings, items, async ({ selectedDate, selectedMeal, selectedFood, selectedServing, quantity }) => {
            const selectedItem = items.find(item => item.file.name === selectedFood);
            if (!selectedItem) {
                console.error(`Selected food item not found: ${selectedFood}`);
                return;
            }
    
            const page = dv.page(selectedItem.file.path);
            if (!page) {
                console.error(`Dataview page not found for: ${selectedItem.file.path}`);
                return;
            }
    
            let { calories = 0, fat = 0, carbohydrates: carbs = 0, protein = 0 } = page;
            let multiplier = 1;
            let amount = selectedServing.split(" | ")[0];
            const grams = selectedServing.split(" | ")[1];
    
            if (grams === '100g') {
                multiplier = quantity;
                amount = `100g`;
            } else if (selectedServing.includes('of Recipe')) {
                const servings = page.servings || 1;
                const tasks = page.file.tasks?.values || [];
                multiplier = quantity / servings;
    
                calories = tasks.reduce((sum, t) => sum + (t.cal || 0), 0) / servings;
                fat = tasks.reduce((sum, t) => sum + (t.fat || 0), 0) / servings;
                carbs = tasks.reduce((sum, t) => sum + (t.carbs || 0), 0) / servings;
                protein = tasks.reduce((sum, t) => sum + (t.protein || 0), 0) / servings;
            } else {
                const servingOptions = page.servings || [];
                const selectedServingOption = servingOptions.find(option => option.includes(selectedServing));
                if (selectedServingOption) {
                    const servingSize = parseFloat(selectedServingOption.split(" | ")[1]) || 1;
                    multiplier = (quantity * servingSize) / 100;
                }
            }
    
            // Scale nutrient values
            calories = Math.round(calories * multiplier);
            fat = Math.round(fat * multiplier * 10) / 10;
            carbs = Math.round(carbs * multiplier * 10) / 10;
            protein = Math.round(protein * multiplier * 10) / 10;
    
            const prefix = this.settings.stringPrefixLetter;

            // Add the quantity conditionally
            const quantityString = quantity !== 1 ? ` x (qty:: ${quantity})` : '';

            let string = `- [${prefix}] (serving:: ${selectedServing.split(" | ")[0]}${quantityString}) (item:: [[${selectedFood}]]) [cal:: ${calories}], [fat:: ${fat}], [carbs:: ${carbs}], [protein:: ${protein}]`;

            if (selectedMeal !== "Recipe") {
                string = `- [${prefix}] (meal:: ${selectedMeal}) - (item:: [[${selectedFood}]]) (${amount}${quantityString}) [cal:: ${calories}], [fat:: ${fat}], [carbs:: ${carbs}], [protein:: ${protein}]`;
            }    
            if (selectedMeal === "Recipe") {
                const activeLeaf = this.app.workspace.activeLeaf;
                if (activeLeaf?.view.getViewType() === "markdown") {
                    const editor = activeLeaf.view.sourceMode.cmEditor;
                    const cursor = editor.getCursor();
                    editor.replaceRange(string + '\n', cursor);
                } else {
                    console.error("No active markdown editor found.");
                }
            } else {
                const formattedDate = moment(selectedDate).format(this.settings.journalNameFormat);
                const journalPath = `${this.settings.journalFolder}/${formattedDate}.md`;
                const journalFile = await this.app.vault.getAbstractFileByPath(journalPath);
    
                if (journalFile instanceof TFile) {
                    let content = await this.app.vault.read(journalFile);
                    content = content.replace(/\n+$/, ''); // Remove blank lines at the end
                    await this.app.vault.modify(journalFile, content + '\n' + string);
                    this.immediateUpdateFoodTracker();
                } else {
                    console.log('Journal file not found.');
                }
            }
        }).open();
    }

    async createFoodNote() {
        new CreateFoodNoteModal(
            this.app,
            [], // Pass an empty array or the list of existing food items if available
            this.settings.foodGroups, // Pass the foodGroups from the plugin settings
            async ({ name, group, containerGrams, servingGrams, servingDescription, calories, nutrientValues }) => {
                const fileName = `${name}.md`;
                const filePath = `${this.settings.foodFolder}/${fileName}`;
    
                // Construct the YAML frontmatter with dynamic nutrient properties
                let servings = [`Default | 100g`, `${servingDescription} | ${servingGrams}g`];
                if (!isNaN(containerGrams) && containerGrams > 0) {
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

            `;
    
                try {
                    await this.app.vault.create(filePath, fileContent);
                    console.log(`Food note created at: ${filePath}`);
                } catch (error) {
                    console.error('Error creating food note:', error);
                }
            }
        ).open();
    }
        async addFoodTracker(view: MarkdownView) {
        try {
            // Remove any existing footers
            const existingFooters = view.contentEl.querySelectorAll('.food-tracker');
            existingFooters.forEach(el => el.remove());

            // Check if the footer display is disabled
            if (!this.settings.displayFooter) {
                console.log("Footer display is disabled. Removing existing footers.");
                return; // Exit early if the footer is disabled
            }

            const file = view.file;
            if (!file || !file.path) {
                console.error('No file or file path found.');
                return;
            }

            // Disconnect any existing observers
            this.disconnectObservers();

            // Determine the content generator based on the file path
            let contentGenerator: (file: TFile) => Promise<HTMLElement | null> | undefined;
            if (file.path.includes(`${this.settings.recipesFolder}`)) {
                // Use the new recipe footer generator
                contentGenerator = (file) => generateRecipeFooter(file, this.app);
            } else if (file.path.includes(`${this.settings.foodFolder}`)) {
                contentGenerator = (file) => generateFoodTrackerFooter(file, this.app);
            } else if (file.path.includes(`${this.settings.journalFolder}`)) {
                contentGenerator = this.nutritionFooter.bind(this);
            }

            // Skip processing if no content generator is defined
            if (!contentGenerator) {
                console.log(`No content generator defined for file: ${file.path}`);
                return;
            }

            // Check if the current file is in an excluded folder or has excluded parent
            if (this.shouldExcludeFile(file.path)) {
                console.log(`File excluded: ${file.path}`);
                return;
            }

            const content = view.contentEl;
            let container;

            // Determine the container based on the view mode
            if ((view.getMode?.() ?? view.mode) === 'preview') {
                const previewSections = content.querySelectorAll('.markdown-preview-section');
                for (const section of previewSections) {
                    if (!section.closest('.internal-embed')) {
                        container = section;
                        break;
                    }
                }
            } else if ((view.getMode?.() ?? view.mode) === 'source' || (view.getMode?.() ?? view.mode) === 'live') {
                container = content.querySelector('.cm-sizer');
            }

            if (!container) {
                console.error('No valid container found for the footer.');
                return;
            }

            // Generate and append the footer
            const footer = await this.createFoodTracker(file, contentGenerator);
            if (footer) {
                container.appendChild(footer);
            }

            // Observe the container for changes
            this.observeContainer(container);
        } catch (error) {
            console.error('Error in addFoodTracker:', error);
        }
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

    observeContainer(container) {
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

    shouldExcludeFile(filePath) {
        // Check excluded folders
        if (this.settings?.excludedFolders?.some(folder => filePath.startsWith(folder))) {
            return true;
        }

        // Check frontmatter exclusion field
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file && this.settings.frontmatterExclusionField) {
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
                    let element = activeLeaf.view.containerEl;
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

            const readingView = activeView.contentEl.querySelector('.markdown-reading-view');
            if (!readingView) return;

            const preview = readingView.querySelector('.markdown-preview-view');
            const previewSizer = readingView.querySelector('.markdown-preview-sizer');
            const footer = readingView.querySelector('.markdown-preview-sizer > .food-tracker');

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
        const tasks = tasksPlugin.getTasks().filter(task => task.path === file.path);

        if (tasks.length > 0) {
            const headers = ["Meal", "Calories", "Fat", "Carbs", "Protein"];
            const meals = ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"];
            let summary = [];
            let mealTaskCount = 0;

            function highlight(value: string): string {
                return `**${value}**`;
            }

            function getsums(result: any[]) {
                let calsum = 0, fatsum = 0, carbssum = 0, proteinsum = 0;
                result.forEach(v => {
                    calsum += v[1];
                    fatsum += v[2];
                    carbssum += v[3];
                    proteinsum += v[4];
                });
                summary.push([highlight(result[0][0]), Math.round(calsum * 10) / 10, Math.round(fatsum * 10) / 10, Math.round(carbssum * 10) / 10, Math.round(proteinsum * 10) / 10]);
            }

            meals.forEach(meal => {
                const result = tasks
                    .filter(t => {
                        const mealMatch = t.description.match(/meal::\s*([\w\s]+)/);
                        const taskMeal = mealMatch ? mealMatch[1].trim() : undefined;
                        const isCompleted = t.status?.configuration?.symbol === "c"; // Ensure task status is checked correctly
                        return isCompleted && taskMeal === meal;
                    })
                    .map(e => {
                        const calMatch = e.description.match(/cal::\s*(\d+(\.\d+)?)/);
                        const fatMatch = e.description.match(/fat::\s*(\d+(\.\d+)?)/);
                        const carbsMatch = e.description.match(/carbs::\s*(\d+(\.\d+)?)/);
                        const proteinMatch = e.description.match(/protein::\s*(\d+(\.\d+)?)/);

                        return [
                            meal,
                            calMatch ? parseFloat(calMatch[1]) : 0,
                            fatMatch ? parseFloat(fatMatch[1]) : 0,
                            carbsMatch ? parseFloat(carbsMatch[1]) : 0,
                            proteinMatch ? parseFloat(proteinMatch[1]) : 0
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
                    calsum += v[1];
                    fatsum += v[2];
                    carbssum += v[3];
                    proteinsum += v[4];
                });
                summary.push([highlight("Total"), highlight(Math.round(calsum * 10) / 10), highlight(Math.round(fatsum * 10) / 10), highlight(Math.round(carbssum * 10) / 10), highlight(Math.round(proteinsum * 10) / 10)]);

                function generateMarkdownTable(headers: string[], rows: any[]): string {
                    const headerRow = `| ${headers.join(" | ")} |`;
                    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
                    const dataRows = rows.map(row => `| ${row.join(" | ")} |`).join("\n");
                    return `${headerRow}\n${separatorRow}\n${dataRows}`;
                }

                // Generate the markdown table
                const markdownTable = generateMarkdownTable(headers, summary);

                // Convert the markdown table to an HTMLElement
                const container = createDiv();
                await MarkdownRenderer.renderMarkdown(markdownTable, container, file.path, this);

                return container;
            }
        }

        return null;
    }
}