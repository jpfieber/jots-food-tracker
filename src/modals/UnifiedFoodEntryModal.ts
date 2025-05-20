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
    selectedServing: string;
    quantity: number;
}

export class UnifiedFoodEntryModal extends Modal {
    private settings: FoodTrackerSettings;
    private items: DataViewItem[];
    private onSubmit: (data: ModalSubmitData) => void;

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
        contentEl.addClass('FoodTracker-modal');
        contentEl.createEl('h2', { text: 'Log Food Entry' });

        // First Row: Date, Time and Meal
        const firstRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });        const dateContainer = firstRow.createDiv({ cls: 'FoodTracker-modal-column-vertical' });
        dateContainer.createEl('label', { text: 'Date:' });
        const dateInput = dateContainer.createEl('input', { type: 'date' });
        dateInput.value = moment().format('YYYY-MM-DD'); // Default to today

        const timeContainer = firstRow.createDiv({ cls: 'FoodTracker-modal-column-vertical' });
        timeContainer.createEl('label', { text: 'Time:' });
        const timeInput = timeContainer.createEl('input', { type: 'time' });
        timeInput.value = moment().format('HH:mm'); // Default to current time

        const mealContainer = firstRow.createDiv({ cls: 'FoodTracker-modal-column-vertical' });
        mealContainer.createEl('label', { text: 'Meal:' });
        const mealSelect = mealContainer.createEl('select');
        this.settings.meals.forEach(meal => {
            const option = mealSelect.createEl('option', {
                text: `${meal.emoji} ${meal.name}`,
                value: meal.name
            });
            option.dataset.defaultTime = meal.defaultTime;
            option.dataset.emoji = meal.emoji;
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
        });

        // Second Row: Food Item
        const secondRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const foodContainer = secondRow.createDiv({ cls: 'FoodTracker-modal-column-full' });
        foodContainer.createEl('label', { text: 'Food Item:' });

        // Create an input field for predictive typing
        const foodInput = foodContainer.createEl('input', { type: 'text', placeholder: 'Type to search...' });
        const foodDropdown = document.createElement('div'); // Use document.createElement for fixed positioning
        foodDropdown.classList.add('FoodTracker-dropdown');
        document.body.appendChild(foodDropdown); // Append dropdown to the body for fixed positioning

        // Style the dropdown
        foodDropdown.style.border = '1px solid #ccc';
        foodDropdown.style.maxHeight = '150px';
        foodDropdown.style.overflowY = 'auto';
        foodDropdown.style.display = 'none';
        foodDropdown.style.position = 'fixed'; // Use fixed positioning
        foodDropdown.style.backgroundColor = '#fff';
        foodDropdown.style.zIndex = '1000';

        // Function to update the dropdown's position
        const updateDropdownPosition = () => {
            const rect = foodInput.getBoundingClientRect();
            foodDropdown.style.top = `${rect.bottom + window.scrollY}px`;
            foodDropdown.style.left = `${rect.left + window.scrollX}px`;
            foodDropdown.style.width = `${rect.width}px`;
        };

        // Populate the dropdown with all food items
        const updateDropdown = (filter: string) => {
            foodDropdown.innerHTML = ''; // Clear existing items
            const filteredItems = this.items.filter(item => item.file.name.toLowerCase().includes(filter.toLowerCase()));
            filteredItems.forEach(item => {
                const option = document.createElement('div');
                option.textContent = item.file.name;
                option.classList.add('FoodTracker-dropdown-item');
                option.style.padding = '5px';
                option.style.cursor = 'pointer';

                // Handle selection
                option.addEventListener('click', () => {
                    foodInput.value = item.file.name;
                    foodDropdown.style.display = 'none';

                    // Update the servings dropdown
                    updateServings(item.file.name);
                });

                foodDropdown.appendChild(option);
            });

            // Show or hide the dropdown based on results
            foodDropdown.style.display = filteredItems.length > 0 ? 'block' : 'none';

            // Update dropdown position
            updateDropdownPosition();
        };

        // Add event listener for input changes
        foodInput.addEventListener('input', () => {
            const filter = foodInput.value;
            updateDropdown(filter);
        });

        // Hide the dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!foodContainer.contains(event.target as Node) && !foodDropdown.contains(event.target as Node)) {
                foodDropdown.style.display = 'none';
            }
        });

        // Update dropdown position on window resize or scroll
        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition);

        // Initialize the dropdown with all items
        updateDropdown('');

        // Third Row: Serving and Quantity
        const thirdRow = contentEl.createDiv({ cls: 'FoodTracker-modal-row' });
        const servingContainer = thirdRow.createDiv({ cls: 'FoodTracker-modal-column' });
        servingContainer.createEl('label', { text: 'Serving:' });
        const servingSelect = servingContainer.createEl('select');

        const quantityContainer = thirdRow.createDiv({ cls: 'FoodTracker-modal-column' });
        quantityContainer.createEl('label', { text: 'Quantity:' });
        let quantityInput = quantityContainer.createEl('input', { type: 'number', value: '1', step: '0.1' }); // Declare quantityInput

        // Function to update servings dropdown
        const updateServings = async (selectedFood: string) => {
            const selectedItem = this.items.find(item => item.file.name === selectedFood);
            const file = await this.app.vault.getAbstractFileByPath(selectedItem?.file.path);
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
        };        // Submit Button
        const submitButton = contentEl.createEl('button', { text: 'Submit', cls: 'FoodTracker-modal-submit' });
        submitButton.addEventListener('click', async () => {
            const selectedDate = dateInput.value;
            const selectedTime = timeInput.value;
            const selectedMeal = mealSelect.value;
            const selectedFood = foodInput.value;
            const selectedServing = servingSelect.value;
            const quantity = parseFloat(quantityInput.value);

            if (!selectedDate || !selectedTime || !selectedMeal || !selectedFood || !selectedServing || isNaN(quantity)) {
                console.error('Invalid input');
                return;
            }

            this.onSubmit({
                selectedDate,
                selectedTime,
                selectedMeal,
                selectedFood,
                selectedServing,
                quantity
            });
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}