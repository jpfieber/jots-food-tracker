import { App, Modal } from 'obsidian';
import moment from 'moment';
import { FoodTrackerSettings } from '../types/settings';

interface DataViewItem {
    file: {
        name: string;
        path: string;
    };
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

export class UnifiedFoodEntryModal extends Modal {
    private settings: FoodTrackerSettings;
    private items: DataViewItem[];
    private onSubmit: (data: ModalSubmitData) => void;
    private isManual: boolean = false;    // Store UI elements that need to be accessed in different methods
    private foodInput?: HTMLInputElement;
    private servingSelect?: HTMLSelectElement;
    private quantityInput?: HTMLInputElement;
    private manualFoodInput?: HTMLInputElement;
    private caloriesInput?: HTMLInputElement;
    private fatInput?: HTMLInputElement;
    private carbsInput?: HTMLInputElement;
    private proteinInput?: HTMLInputElement;

    constructor(
        app: App,
        settings: FoodTrackerSettings,
        items: DataViewItem[],
        onSubmit: (data: ModalSubmitData) => void
    ) {
        super(app);
        this.settings = settings;
        this.items = items;
        this.onSubmit = onSubmit;
    }

    private shouldBeSelectedMeal(meal: { name: string; defaultTime: string; emoji: string }): boolean {
        const currentHour = parseInt(moment().format('HH'));
        const mealHour = parseInt(meal.defaultTime.split(':')[0]);

        // Find the meal with the closest default time to current time
        const nextMealTime = this.settings.meals.reduce((prev, curr) => {
            const currHour = parseInt(curr.defaultTime.split(':')[0]);
            const prevHour = parseInt(prev.defaultTime.split(':')[0]);

            const currDiff = Math.abs(currHour - currentHour);
            const prevDiff = Math.abs(prevHour - currentHour);

            return currDiff < prevDiff ? curr : prev;
        });

        return meal === nextMealTime;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('FoodTracker-modal');
        contentEl.createEl('h2', { text: 'Log Food Entry' });

        // Mode Toggle
        const modeRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const modeContainer = modeRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        const modeToggle = modeContainer.createEl('div', { cls: 'FoodTracker-mode-toggle' });
        const autoButton = modeToggle.createEl('button', { text: 'Automatic', cls: 'active' });
        const manualButton = modeToggle.createEl('button', { text: 'Manual' });

        // Create sections for automatic and manual entry
        const automaticSection = contentEl.createDiv({ cls: 'FoodTracker-section automatic' });
        const manualSection = contentEl.createDiv({ cls: 'FoodTracker-section manual' });
        manualSection.style.display = 'none';

        // Common Section (Date, Time, Meal)
        const commonRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const dateContainer = commonRow.createDiv({ cls: 'FoodTracker-modal-column-vertical' });
        dateContainer.createEl('label', { text: 'Date:' });
        const dateInput = dateContainer.createEl('input', { type: 'date' });
        dateInput.value = moment().format('YYYY-MM-DD');

        const timeContainer = commonRow.createDiv({ cls: 'FoodTracker-modal-column-vertical' });
        timeContainer.createEl('label', { text: 'Time:' });
        const timeInput = timeContainer.createEl('input', { type: 'time' });
        timeInput.value = moment().format('HH:mm');

        const mealContainer = commonRow.createDiv({ cls: 'FoodTracker-modal-column-vertical' });
        mealContainer.createEl('label', { text: 'Meal:' });
        const mealSelect = mealContainer.createEl('select');
        this.settings.meals.forEach(meal => {
            const option = mealSelect.createEl('option', {
                text: `${meal.emoji} ${meal.name}`,
                value: meal.name
            });
            if (this.shouldBeSelectedMeal(meal)) {
                option.selected = true;
                timeInput.value = meal.defaultTime;
            }
        });

        // Update time when meal changes
        mealSelect.addEventListener('change', () => {
            const selectedOption = mealSelect.options[mealSelect.selectedIndex];
            if (selectedOption.dataset.defaultTime) {
                timeInput.value = selectedOption.dataset.defaultTime;
            }
        });        // Automatic Section with vertical layout
        const autoFoodRow = automaticSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const autoFoodContainer = autoFoodRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        autoFoodContainer.createEl('label', { text: 'Food Item:' });
        this.foodInput = autoFoodContainer.createEl('input', {
            type: 'text',
            placeholder: 'Type to search...'
        });

        const autoServingRow = automaticSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const autoServingContainer = autoServingRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        autoServingContainer.createEl('label', { text: 'Serving:' });
        this.servingSelect = autoServingContainer.createEl('select');

        const autoQuantityRow = automaticSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const autoQuantityContainer = autoQuantityRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        autoQuantityContainer.createEl('label', { text: 'Quantity:' });
        this.quantityInput = autoQuantityContainer.createEl('input', {
            type: 'number',
            attr: { min: '0', step: '0.1', value: '1' }
        });

        // Manual Section with vertical layout
        const manualFoodRow = manualSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const manualFoodContainer = manualFoodRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        manualFoodContainer.createEl('label', { text: 'Food Name:' });
        this.manualFoodInput = manualFoodContainer.createEl('input', { type: 'text' });

        const caloriesRow = manualSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const caloriesContainer = caloriesRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        caloriesContainer.createEl('label', { text: 'Calories:' });
        this.caloriesInput = caloriesContainer.createEl('input', {
            type: 'number',
            attr: { min: '0', step: '1' }
        });

        const fatRow = manualSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const fatContainer = fatRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        fatContainer.createEl('label', { text: 'Fat (g):' });
        this.fatInput = fatContainer.createEl('input', {
            type: 'number',
            attr: { min: '0', step: '0.1' }
        });

        const carbsRow = manualSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const carbsContainer = carbsRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        carbsContainer.createEl('label', { text: 'Carbs (g):' });
        this.carbsInput = carbsContainer.createEl('input', {
            type: 'number',
            attr: { min: '0', step: '0.1' }
        });

        const proteinRow = manualSection.createDiv({ cls: 'FoodTracker-modal-row' });
        const proteinContainer = proteinRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        proteinContainer.createEl('label', { text: 'Protein (g):' });
        this.proteinInput = proteinContainer.createEl('input', {
            type: 'number',
            attr: { min: '0', step: '0.1' }
        });

        // Submit button
        const submitRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const submitContainer = submitRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        const submitButton = submitContainer.createEl('button', {
            text: 'Submit',
            cls: 'mod-cta'
        });

        // Mode switching function
        const switchMode = (isManual: boolean) => {
            this.isManual = isManual;
            autoButton.toggleClass('active', !isManual);
            manualButton.toggleClass('active', isManual);
            automaticSection.style.display = isManual ? 'none' : 'block';
            manualSection.style.display = isManual ? 'block' : 'none';
        };

        autoButton.addEventListener('click', () => switchMode(false));
        manualButton.addEventListener('click', () => switchMode(true));

        // Add dropdown functionality
        const foodDropdown = document.createElement('div');
        foodDropdown.classList.add('FoodTracker-dropdown');
        document.body.appendChild(foodDropdown);

        const updateDropdownPosition = () => {
            if (this.foodInput) {
                const rect = this.foodInput.getBoundingClientRect();
                foodDropdown.style.top = `${rect.bottom + window.scrollY}px`;
                foodDropdown.style.left = `${rect.left + window.scrollX}px`;
                foodDropdown.style.width = `${rect.width}px`;
            }
        };

        const updateDropdown = (filter: string) => {
            foodDropdown.innerHTML = '';
            const filteredItems = this.items.filter(item =>
                item.file.name.toLowerCase().includes(filter.toLowerCase())
            );

            filteredItems.forEach(item => {
                const option = document.createElement('div');
                option.textContent = item.file.name;
                option.classList.add('FoodTracker-dropdown-item');
                option.addEventListener('click', () => {
                    if (this.foodInput) {
                        this.foodInput.value = item.file.name;
                        foodDropdown.style.display = 'none';
                        this.updateServings(item.file.name);
                    }
                });
                foodDropdown.appendChild(option);
            });

            foodDropdown.style.display = filteredItems.length > 0 ? 'block' : 'none';
            updateDropdownPosition();
        };

        // Add event listeners
        this.foodInput?.addEventListener('input', () => {
            updateDropdown(this.foodInput?.value || '');
        });

        document.addEventListener('click', (event) => {
            const target = event.target as Node;
            if (this.foodInput && (!this.foodInput.contains(target) && !foodDropdown.contains(target))) {
                foodDropdown.style.display = 'none';
            }
        });

        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition);

        // Updated submit button handler
        submitButton.addEventListener('click', () => {
            const selectedDate = dateInput.value;
            const selectedTime = timeInput.value;
            const selectedMeal = mealSelect.value;

            if (!selectedDate || !selectedTime || !selectedMeal) {
                // Show error to user
                return;
            }

            if (this.isManual) {
                const manualFoodName = this.manualFoodInput?.value;
                const calories = parseFloat(this.caloriesInput?.value || '0');
                const fat = parseFloat(this.fatInput?.value || '0');
                const carbs = parseFloat(this.carbsInput?.value || '0');
                const protein = parseFloat(this.proteinInput?.value || '0');

                if (!manualFoodName || isNaN(calories) || isNaN(fat) || isNaN(carbs) || isNaN(protein)) {
                    // Show error to user
                    return;
                }

                this.onSubmit({
                    selectedDate,
                    selectedTime,
                    selectedMeal,
                    selectedFood: manualFoodName,
                    isManual: true,
                    calories,
                    fat,
                    carbs,
                    protein
                });
            } else {
                const selectedFood = this.foodInput?.value;
                const selectedServing = this.servingSelect?.value;
                const quantity = parseFloat(this.quantityInput?.value || '1');

                if (!selectedFood || !selectedServing || isNaN(quantity)) {
                    // Show error to user
                    return;
                }

                this.onSubmit({
                    selectedDate,
                    selectedTime,
                    selectedMeal,
                    selectedFood,
                    selectedServing,
                    quantity,
                    isManual: false
                });
            }
            this.close();
        });

        // Initial setup
        updateDropdownPosition();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    } private async updateServings(selectedFood: string) {
        const select = this.servingSelect;
        if (!select) return;

        const addDefaultOption = () => {
            select.empty();
            const option = select.createEl('option');
            option.text = '1 serving';
        };

        if (!selectedFood) {
            addDefaultOption();
            return;
        }

        const selectedItem = this.items.find(item => item.file.name === selectedFood);
        if (!selectedItem) {
            addDefaultOption();
            return;
        }

        const file = await this.app.vault.getAbstractFileByPath(selectedItem.file.path);
        if (!file) {
            addDefaultOption();
            return;
        }

        const dv = (this.app.plugins.plugins["dataview"] as any)?.api;
        if (!dv) {
            addDefaultOption();
            return;
        }

        const page = dv.page(file.path);
        if (!page || !page.servings) {
            addDefaultOption();
            return;
        }

        select.empty();
        const servings = page.servings;

        if (typeof servings === 'number' && servings > 0) {
            for (let i = 1; i <= servings; i++) {
                const fraction = `1/${servings}`;
                const option = select.createEl('option');
                option.text = `${fraction} of Recipe`;
            }
        } else if (Array.isArray(servings)) {
            servings.forEach(serving => {
                const option = select.createEl('option');
                option.text = serving.toString();
            });
        } else {
            const option = select.createEl('option');
            option.text = servings.toString();
        }

        if (select.options.length === 0) {
            addDefaultOption();
        }
    }
}