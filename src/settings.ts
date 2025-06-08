import { App, PluginSettingTab, Setting, TextComponent } from "obsidian";
import FoodTrackerPlugin from "./main";
import { isJotsAssistantAvailable } from "./utils/jotsIntegration";
import { FolderSuggest } from "./utils/FolderSuggest";

export class FoodTrackerSettingTab extends PluginSettingTab {
    plugin: FoodTrackerPlugin;

    constructor(app: App, plugin: FoodTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Obsidian Calorie and Macro Tracker Settings" });

        // Footer Display Setting
        new Setting(containerEl)
            .setName("Display Footer on Journal Pages")
            .setDesc("Enable or disable the footer on journal pages.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.displayFooter || false)
                    .onChange(async (value) => {
                        this.plugin.settings.displayFooter = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Footer Order Setting
        new Setting(containerEl)
            .setName("Footer Order")
            .setDesc("Set the order of this footer relative to other footers (lower numbers appear first)")
            .addText(text =>
                text
                    .setValue(String(this.plugin.settings.footerOrder))
                    .onChange(async (value) => {
                        const numValue = Number(value);
                        if (!isNaN(numValue)) {
                            this.plugin.settings.footerOrder = numValue;
                            await this.plugin.saveSettings();
                        }
                    })
            );        // Food Folder Setting
        new Setting(containerEl)
            .setName('Food Notes Folder')
            .setDesc('Set the location of the folder containing your personal Food Notes.')
            .addText(text => {
                const textComponent = text
                    .setPlaceholder('Enter folder path')
                    .setValue(this.plugin.settings.foodFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.foodFolder = value.trim();
                        await this.plugin.saveSettings();
                    });
                new FolderSuggest(this.app, textComponent.inputEl);
                return textComponent;
            });

        // USDA Folder Setting
        new Setting(containerEl)
            .setName('USDA Notes Folder')
            .setDesc('Set the location of the folder containing your USDA Food Notes.')
            .addText(text => {
                const textComponent = text
                    .setPlaceholder('Enter folder path')
                    .setValue(this.plugin.settings.usdaFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.usdaFolder = value.trim();
                        await this.plugin.saveSettings();
                    });
                new FolderSuggest(this.app, textComponent.inputEl);
                return textComponent;
            });

        // Recipes Folder Setting
        new Setting(containerEl)
            .setName("Recipes Folder")
            .setDesc("Set the location of the Recipes folder.")
            .addText(text => {
                const textComponent = text
                    .setPlaceholder("Enter folder name")
                    .setValue(this.plugin.settings.recipesFolder || "FoodTracker/Recipes")
                    .onChange(async (value) => {
                        this.plugin.settings.recipesFolder = value;
                        await this.plugin.saveSettings();
                    });
                new FolderSuggest(this.app, textComponent.inputEl);
                return textComponent;
            });

        // Journal Path Settings
        containerEl.createEl("h3", { text: "Journal Path Settings" });

        const journalSettingsContainer = containerEl.createDiv();
        journalSettingsContainer.style.paddingLeft = "20px";

        if (isJotsAssistantAvailable()) {
            const jotsInfo = window.JotsAssistant?.api.getJournalPathInfo();

            const descEl = journalSettingsContainer.createEl('p', {
                text: "Journal settings are being managed by JOTS Assistant:"
            });
            descEl.style.marginBottom = "1em";

            // Create a list to display the settings
            const list = journalSettingsContainer.createEl('div');
            list.style.marginLeft = "20px";
            list.style.marginBottom = "1em";

            // Root Folder
            const rootFolderDiv = list.createEl('div');
            rootFolderDiv.style.marginBottom = "0.5em";
            rootFolderDiv.createEl('strong', { text: 'Root Folder: ' });
            rootFolderDiv.createSpan({ text: jotsInfo?.rootFolder || "" });

            // Folder Pattern
            const folderPatternDiv = list.createEl('div');
            folderPatternDiv.style.marginBottom = "0.5em";
            folderPatternDiv.createEl('strong', { text: 'Folder Pattern: ' });
            folderPatternDiv.createSpan({ text: jotsInfo?.folderPattern || "" });

            // File Pattern
            const filePatternDiv = list.createEl('div');
            filePatternDiv.style.marginBottom = "0.5em";
            filePatternDiv.createEl('strong', { text: 'File Pattern: ' });
            filePatternDiv.createSpan({ text: jotsInfo?.filePattern || "" });
        } else {
            new Setting(journalSettingsContainer)
            .setName("Journal Root Folder")
            .setDesc("The root folder where your journals are stored (e.g., 'Chronological/Journals')")
            .addText(text => {
                const textComponent = text
                    .setValue(this.plugin.settings.journalRootFolder)
                    .setPlaceholder("Journals")
                    .onChange(async (value) => {
                        this.plugin.settings.journalRootFolder = value;
                        await this.plugin.saveSettings();
                    });
                textComponent.inputEl.style.width = "100%";
                new FolderSuggest(this.app, textComponent.inputEl);
                return textComponent;
            });

            new Setting(journalSettingsContainer)
                .setName("Journal Folder Pattern")
                .setDesc("Pattern for organizing journal folders (e.g., 'YYYY/YYYY-MM')")
                .addText(text => {
                    text.setValue(this.plugin.settings.journalFolderPattern)
                        .setPlaceholder("YYYY/YYYY-MM")
                        .onChange(async (value) => {
                            this.plugin.settings.journalFolderPattern = value;
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.style.width = "100%";
                });

            new Setting(journalSettingsContainer)
                .setName("Journal File Pattern")
                .setDesc("Pattern for journal filenames (e.g., 'YYYY-MM-DD_ddd')")
                .addText(text => {
                    text.setValue(this.plugin.settings.journalFilePattern)
                        .setPlaceholder("YYYY-MM-DD_ddd")
                        .onChange(async (value) => {
                            this.plugin.settings.journalFilePattern = value;
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.style.width = "100%";
                });
        }

        // String Prefix Letter Setting
        new Setting(containerEl)
            .setName("String Prefix Letter")
            .setDesc("Set the letter to prefix the string.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter letter")
                    .setValue(this.plugin.settings.stringPrefixLetter || "c")
                    .onChange(async (value) => {
                        this.plugin.settings.stringPrefixLetter = value;
                        await this.plugin.saveSettings();
                        this.plugin.injectCSS();
                    })
            );

        // Decorated Task Symbol Setting
        new Setting(containerEl)
            .setName("Decorated Task Symbol")
            .setDesc("Set the Data URI for the SVG icon to use before the inserted food item string.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter Data URI")
                    .setValue(this.plugin.settings.stringSVG || "")
                    .onChange(async (value) => {
                        this.plugin.settings.stringSVG = value;
                        await this.plugin.saveSettings();
                        this.plugin.injectCSS();
                    })
            );

        // Nest Journal Entries Setting
        new Setting(containerEl)
            .setName("Nest Journal Entries in Callout")
            .setDesc("When enabled, food entries in journals will be nested in a callout block.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.nestJournalEntries || false)
                    .onChange(async (value) => {
                        this.plugin.settings.nestJournalEntries = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Meals Section
        containerEl.createEl("h3", { text: "Meals" });

        const mealsContainer = containerEl.createDiv();
        const addMealButton = containerEl.createEl("button", { text: "Add Meal" }); const updateMeals = async () => {
            mealsContainer.empty();
            this.plugin.settings.meals.forEach((meal, index) => {
                const mealSetting = new Setting(mealsContainer)
                    .addText(text => {
                        const t = text
                            .setValue(meal.name)
                            .setPlaceholder("Meal name")
                            .onChange(async (value) => {
                                this.plugin.settings.meals[index].name = value;
                                await this.plugin.saveSettings();
                            });
                        t.inputEl.style.width = '150px';
                        return t;
                    })
                    .addText(text => {
                        const t = text
                            .setValue(meal.defaultTime)
                            .setPlaceholder("HH:mm")
                            .onChange(async (value) => {
                                this.plugin.settings.meals[index].defaultTime = value;
                                await this.plugin.saveSettings();
                            });
                        t.inputEl.style.width = '100px';
                        t.inputEl.type = 'time';
                        return t;
                    })
                    .addText(text => {
                        const t = text
                            .setValue(meal.emoji)
                            .setPlaceholder("🍽️")
                            .onChange(async (value) => {
                                this.plugin.settings.meals[index].emoji = value;
                                await this.plugin.saveSettings();
                            });
                        t.inputEl.style.width = '60px';
                        return t;
                    })
                    .addButton((button) =>
                        button
                            .setIcon("arrow-up")
                            .setTooltip("Move Up")
                            .onClick(async () => {
                                if (index > 0) {
                                    const temp = this.plugin.settings.meals[index - 1];
                                    this.plugin.settings.meals[index - 1] = this.plugin.settings.meals[index];
                                    this.plugin.settings.meals[index] = temp;
                                    await this.plugin.saveSettings();
                                    updateMeals();
                                }
                            })
                    )
                    .addButton((button) =>
                        button
                            .setIcon("arrow-down")
                            .setTooltip("Move Down")
                            .onClick(async () => {
                                if (index < this.plugin.settings.meals.length - 1) {
                                    const temp = this.plugin.settings.meals[index + 1];
                                    this.plugin.settings.meals[index + 1] = this.plugin.settings.meals[index];
                                    this.plugin.settings.meals[index] = temp;
                                    await this.plugin.saveSettings();
                                    updateMeals();
                                }
                            })
                    )
                    .addButton((button) =>
                        button
                            .setIcon("trash")
                            .setTooltip("Delete")
                            .onClick(async () => {
                                this.plugin.settings.meals.splice(index, 1);
                                await this.plugin.saveSettings();
                                updateMeals();
                            })
                    );

                // Style the container
                mealSetting.settingEl.addClass('meal-setting');
            });
        }; addMealButton.addEventListener("click", async () => {
            this.plugin.settings.meals.push({
                name: "New Meal",
                defaultTime: "12:00",
                emoji: "🍽️"
            });
            await this.plugin.saveSettings();
            updateMeals();
        });

        updateMeals();

        // Food Groups Section
        containerEl.createEl("h3", { text: "Food Groups" });

        const foodGroupsContainer = containerEl.createDiv();
        const addFoodGroupButton = containerEl.createEl("button", { text: "Add Food Group" });

        const updateFoodGroups = async () => {
            foodGroupsContainer.empty();
            this.plugin.settings.foodGroups.forEach((group, index) => {
                const groupSetting = new Setting(foodGroupsContainer)
                    .addText((text) =>
                        text
                            .setValue(group)
                            .onChange(async (value) => {
                                this.plugin.settings.foodGroups[index] = value;
                                await this.plugin.saveSettings();
                            })
                    )
                    .addButton((button) =>
                        button
                            .setIcon("arrow-up")
                            .setTooltip("Move Up")
                            .onClick(async () => {
                                if (index > 0) {
                                    const temp = this.plugin.settings.foodGroups[index - 1];
                                    this.plugin.settings.foodGroups[index - 1] = this.plugin.settings.foodGroups[index];
                                    this.plugin.settings.foodGroups[index] = temp;
                                    await this.plugin.saveSettings();
                                    updateFoodGroups();
                                }
                            })
                    )
                    .addButton((button) =>
                        button
                            .setIcon("arrow-down")
                            .setTooltip("Move Down")
                            .onClick(async () => {
                                if (index < this.plugin.settings.foodGroups.length - 1) {
                                    const temp = this.plugin.settings.foodGroups[index + 1];
                                    this.plugin.settings.foodGroups[index + 1] = this.plugin.settings.foodGroups[index];
                                    this.plugin.settings.foodGroups[index] = temp;
                                    await this.plugin.saveSettings();
                                    updateFoodGroups();
                                }
                            })
                    )
                    .addButton((button) =>
                        button
                            .setIcon("trash")
                            .setTooltip("Delete")
                            .onClick(async () => {
                                this.plugin.settings.foodGroups.splice(index, 1);
                                await this.plugin.saveSettings();
                                updateFoodGroups();
                            })
                    );
            });
        };

        addFoodGroupButton.addEventListener("click", async () => {
            this.plugin.settings.foodGroups.push("New Group");
            await this.plugin.saveSettings();
            updateFoodGroups();
        });

        updateFoodGroups();

        this.addWebsiteSection(containerEl);
        this.addCoffeeSection(containerEl);
    }

    private addWebsiteSection(containerEl: HTMLElement) {
        const websiteDiv = containerEl.createEl('div', { cls: 'website-section' });
        websiteDiv.style.display = 'flex';
        websiteDiv.style.alignItems = 'center';
        websiteDiv.style.marginTop = '20px';
        websiteDiv.style.marginBottom = '20px';
        websiteDiv.style.padding = '0.5rem';
        websiteDiv.style.opacity = '0.75';

        const logoLink = websiteDiv.createEl('a', {
            href: 'https://jots.life',
        });
        logoLink.target = '_blank';
        const logoImg = logoLink.createEl('img', {
            attr: {
                src: 'https://jots.life/jots-logo-512/',
                alt: 'JOTS Logo',
            },
        });
        logoImg.style.width = '64px';
        logoImg.style.height = '64px';
        logoImg.style.marginRight = '15px';

        websiteDiv.appendChild(logoLink);

        const descriptionDiv = websiteDiv.createEl('div', { cls: 'website-description' });
        descriptionDiv.innerHTML = `
            While this plugin works on its own, it is part of a system called 
            <a href="https://jots.life" target="_blank">JOTS</a> that helps capture, organize, 
            and visualize your life's details.
        `;
        descriptionDiv.style.fontSize = '14px';
        descriptionDiv.style.lineHeight = '1.5';
        descriptionDiv.style.color = '#555';

        websiteDiv.appendChild(descriptionDiv);
        containerEl.appendChild(websiteDiv);
    }

    private addCoffeeSection(containerEl: HTMLElement) {
        const coffeeDiv = containerEl.createEl('div', { cls: 'buy-me-a-coffee' });
        coffeeDiv.style.marginTop = '20px';
        coffeeDiv.style.textAlign = 'center';

        coffeeDiv.innerHTML = `
            <a href="https://www.buymeacoffee.com/jpfieber" target="_blank">
                <img 
                    src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
                    alt="Buy Me A Coffee" 
                    style="height: 60px; width: 217px;"
                />
            </a>
        `;

        containerEl.appendChild(coffeeDiv);
    }
}