import { Modal } from 'obsidian';
import moment from 'moment';

export class UnifiedFoodEntryModal extends Modal {
    constructor(app, settings, items, onSubmit) {
        super(app);
        this.settings = settings;
        this.items = items;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('FoodTracker-modal');
        contentEl.createEl('h2', { text: 'Log Food Entry' });

        // First Row: Date and Meal
        const firstRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const dateContainer = firstRow.createDiv({ cls: 'FoodTracker-modal-column' });
        dateContainer.createEl('label', { text: 'Date:' });
        const dateInput = dateContainer.createEl('input', { type: 'date' });
        dateInput.value = moment().format('YYYY-MM-DD'); // Default to today

        const mealContainer = firstRow.createDiv({ cls: 'FoodTracker-modal-column' });
        mealContainer.createEl('label', { text: 'Meal:' });
        const mealSelect = mealContainer.createEl('select');
        this.settings.meals.forEach(meal => {
            mealSelect.createEl('option', { text: meal });
        });

        // Second Row: Food Item
        const secondRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const foodContainer = secondRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        foodContainer.createEl('label', { text: 'Food Item:' });
        const foodSelect = foodContainer.createEl('select');
        this.items.forEach(item => {
            foodSelect.createEl('option', { text: item.file.name });
        });

        // Third Row: Serving and Quantity
        const thirdRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const servingContainer = thirdRow.createDiv({ cls: 'FoodTracker-modal-column' });
        servingContainer.createEl('label', { text: 'Serving:' });
        const servingSelect = servingContainer.createEl('select');

        const quantityContainer = thirdRow.createDiv({ cls: 'FoodTracker-modal-column' });
        quantityContainer.createEl('label', { text: 'Quantity:' });
        const quantityInput = quantityContainer.createEl('input', { type: 'number', value: '1', step: '0.1' });

        // Update servings when a food item is selected
        foodSelect.addEventListener('change', async () => {
            const selectedItem = this.items.find(item => item.file.name === foodSelect.value);
            const file = await this.app.vault.getAbstractFileByPath(selectedItem.file.path);
            const dv = this.app.plugins.plugins["dataview"].api;

            servingSelect.empty();

            if (file) {
                // Use Dataview API to get inline fields
                const page = dv.page(file.path);
                if (page && page.servings) {
                    const servings = page.servings;

                    if (typeof servings === 'number' && servings > 0) {
                        // If servings is a number, generate fractional options
                        for (let i = 1; i <= servings; i++) {
                            const fraction = `1/${servings}`;
                            servingSelect.createEl('option', { text: `${fraction} of Recipe` });
                        }
                    } else if (Array.isArray(servings)) {
                        // If servings is an array, populate the dropdown with its values
                        servings.forEach(serving => {
                            servingSelect.createEl('option', { text: serving });
                        });
                    } else {
                        // If servings is a single value, add it as the only option
                        servingSelect.createEl('option', { text: servings });
                    }
                } else {
                    // Default option if no servings are found
                    servingSelect.createEl('option', { text: '1 serving' });
                }
            } else {
                // Default option if the file is not found
                servingSelect.createEl('option', { text: '1 serving' });
            }
        });

        // Submit Button
        const submitButton = contentEl.createEl('button', { text: 'Submit', cls: 'FoodTracker-modal-submit' });
        submitButton.addEventListener('click', async () => {
            const selectedDate = dateInput.value;
            const selectedMeal = mealSelect.value;
            const selectedFood = foodSelect.value;
            const selectedServing = servingSelect.value;
            const quantity = parseFloat(quantityInput.value);

            if (!selectedDate || !selectedMeal || !selectedFood || !selectedServing || isNaN(quantity)) {
                console.error('Invalid input');
                return;
            }

            this.onSubmit({ selectedDate, selectedMeal, selectedFood, selectedServing, quantity });
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}