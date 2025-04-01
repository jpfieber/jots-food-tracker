import { Modal } from 'obsidian';

export class CreateFoodNoteModal extends Modal {
    constructor(app, onSubmit) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('nutrition-label');

        const nutrientInputs = {};

        const nameContainer = contentEl.createDiv({ cls: 'food-name-container' });
        nameContainer.createEl('label', { text: 'Food Item Full Name:', cls: 'input-label' });
        const nameInput = nameContainer.createEl('input', { type: 'text', placeholder: 'e.g., Oatmeal', cls: 'input-field' });

        const groupContainer = contentEl.createDiv({ cls: 'group-container' });
        groupContainer.createEl('label', { text: 'Group:', cls: 'input-label' });
        const groupSelect = groupContainer.createEl('select', { cls: 'input-field' });
        const groupOptions = [
            "American Indian", "Baby Foods", "Baked Foods", "Beans and Lentils", "Beverages",
            "Breakfast Cereals", "Dairy and Egg Products", "Fast Foods", "Fats and Oils", "Fish",
            "Fruits", "Grains and Pasta", "Meats", "Nuts and Seeds", "Prepared Meals",
            "Restaurant Foods", "Snacks", "Soups and Sauces", "Spices and Herbs", "Sweets", "Vegetables"
        ];
        groupOptions.forEach(option => {
            groupSelect.createEl('option', { text: option });
        });

        const containerGramsContainer = contentEl.createDiv({ cls: 'container-grams-container' });
        containerGramsContainer.createEl('label', { text: 'Grams for Entire Container:', cls: 'input-label' });
        const containerGramsInput = containerGramsContainer.createEl('input', { type: 'number', step: '0.1', placeholder: 'e.g., 500', cls: 'input-field' });

        const nutritionTitle = contentEl.createEl('h2', { text: 'Nutrition Facts', cls: 'nutrition-title' });

        const servingInfo = contentEl.createDiv({ cls: 'serving-info' });
        servingInfo.createEl('div', { text: 'Serving Size:' });
        const servingDescriptionInput = servingInfo.createEl('input', { type: 'text', placeholder: 'e.g., 1 cup' });

        servingInfo.createEl('div', { text: 'Grams per Serving:' });
        const servingGramsInput = servingInfo.createEl('input', { type: 'number', step: '0.1' });

        servingInfo.createEl('div', { text: 'Calories:' });
        const caloriesInput = servingInfo.createEl('input', { type: 'number', step: '1' });

        const tableContainer = contentEl.createDiv({ cls: 'nutrient-table' });
        const nutrients = [
            { label: 'Total Fat', id: 'fat', conversionFactor: 78 },
            { label: 'Saturated Fat', id: 'saturatedfat', conversionFactor: 20 },
            { label: 'Trans Fat', id: 'transfat', conversionFactor: 1 },
            { label: 'Cholesterol', id: 'cholesterol', conversionFactor: 300 },
            { label: 'Sodium', id: 'sodium', conversionFactor: 2300 },
            { label: 'Total Carbohydrate', id: 'carbs', conversionFactor: 275 },
            { label: 'Fiber', id: 'fiber', conversionFactor: 28 },
            { label: 'Sugars', id: 'sugars', conversionFactor: 200 },
            { label: 'Protein', id: 'protein', conversionFactor: 50 },
            { label: 'Vitamin D', id: 'vitamind', conversionFactor: 20 },
            { label: 'Calcium', id: 'calcium', conversionFactor: 1300 },
            { label: 'Iron', id: 'iron', conversionFactor: 18 },
            { label: 'Potassium', id: 'potassium', conversionFactor: 4700 }
        ];

        nutrients.forEach(nutrient => {
            const row = tableContainer.createDiv({ cls: 'nutrient-row' });
            row.createEl('div', { text: nutrient.label, cls: 'nutrient-label' });
            const input = row.createEl('input', { type: 'text', placeholder: 'e.g., 5%' });
            input.dataset.nutrientId = nutrient.id;
            nutrientInputs[nutrient.id] = input;
        });

        const submitButton = contentEl.createEl('button', { text: 'Submit', cls: 'submit-button' });
        submitButton.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const group = groupSelect.value.trim();
            const containerGrams = parseFloat(containerGramsInput.value);
            const servingGrams = parseFloat(servingGramsInput.value);
            const servingDescription = servingDescriptionInput.value.trim();
            let calories = parseFloat(caloriesInput.value);

            if (!name || !group || isNaN(servingGrams) || !servingDescription || isNaN(calories)) {
                console.error('Invalid input');
                return;
            }

            calories = Math.round((calories * (100 / servingGrams)) * 10) / 10;

            const nutrientValues = {};
            nutrients.forEach(nutrient => {
                let value = nutrientInputs[nutrient.id].value.trim();
                if (value.includes('%')) {
                    value = (parseFloat(value.replace('%', '')) * nutrient.conversionFactor) / 100;
                } else {
                    value = parseFloat(value) || 0;
                }

                nutrientValues[nutrient.id] = Math.round((value * (100 / servingGrams)) * 10) / 10;
            });

            this.onSubmit({ name, group, containerGrams, servingGrams, servingDescription, calories, nutrientValues });
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}