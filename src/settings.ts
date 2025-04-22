import { App, PluginSettingTab, Setting } from "obsidian";
import FoodTrackerPlugin from "./main";

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

        // Food Folder Setting
        new Setting(containerEl)
            .setName('Food Notes Folder')
            .setDesc('Set the location of the folder containing your personal Food Notes.')
            .addText(text =>
                text
                    .setPlaceholder('Enter folder path')
                    .setValue(this.plugin.settings.foodFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.foodFolder = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        // USDA Folder Setting
        new Setting(containerEl)
            .setName('USDA Notes Folder')
            .setDesc('Set the location of the folder containing your USDA Food Notes.')
            .addText(text =>
                text
                    .setPlaceholder('Enter folder path')
                    .setValue(this.plugin.settings.usdaFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.usdaFolder = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        // Recipes Folder Setting
        new Setting(containerEl)
            .setName("Recipes Folder")
            .setDesc("Set the location of the Recipes folder.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter folder name")
                    .setValue(this.plugin.settings.recipesFolder || "FoodTracker/Recipes")
                    .onChange(async (value) => {
                        this.plugin.settings.recipesFolder = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Journal Folder Setting
        new Setting(containerEl)
            .setName("Journal Folder")
            .setDesc("Set the location of the Journal folder.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter folder name")
                    .setValue(this.plugin.settings.journalFolder || "Stacks/Journals")
                    .onChange(async (value) => {
                        this.plugin.settings.journalFolder = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Journal Name Format Setting
        new Setting(containerEl)
            .setName("Journal Name Format")
            .setDesc("Set the format of the Journal name.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter format")
                    .setValue(this.plugin.settings.journalNameFormat || "YYYY/YYYY-MM/YYYY-MM-DD_ddd")
                    .onChange(async (value) => {
                        this.plugin.settings.journalNameFormat = value;
                        await this.plugin.saveSettings();
                    })
            );

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
        const addMealButton = containerEl.createEl("button", { text: "Add Meal" });

        const updateMeals = async () => {
            mealsContainer.empty();
            this.plugin.settings.meals.forEach((meal, index) => {
                const mealSetting = new Setting(mealsContainer)
                    .addText((text) =>
                        text
                            .setValue(meal)
                            .onChange(async (value) => {
                                this.plugin.settings.meals[index] = value;
                                await this.plugin.saveSettings();
                            })
                    )
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
            });
        };

        addMealButton.addEventListener("click", async () => {
            this.plugin.settings.meals.push("New Meal");
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
            target: '_blank',
        });
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