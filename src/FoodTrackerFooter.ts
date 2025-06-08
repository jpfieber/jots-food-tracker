import { App, TFile } from 'obsidian';

export async function generateFoodTrackerFooter(file: TFile, app: App): Promise<HTMLElement | null> {
    try {
        const fileCache = app.metadataCache.getFileCache(file);
        const frontmatter = fileCache?.frontmatter;

        if (!frontmatter) {
            console.error(`No frontmatter found for file: ${file.path}`);
            return null;
        }

        // Create the container for the dropdown and table
        const container = createDiv({ cls: 'nutfact-container' });

        // Create the dropdown
        const dropdown = createEl('select', { cls: 'nutfact-dropdown' }); const servings = Array.isArray(frontmatter.servings) ? frontmatter.servings : [];

        // Only proceed if we have valid servings data
        if (servings.length === 0) {
            // Add default 100g serving if no servings are defined
            servings.push('Default | 100g');
        }

        servings.forEach((serving: string) => {
            if (typeof serving === 'string' && serving.includes(' | ')) {
                const [servingText, servingWeight] = serving.split(' | ');
                const option = createEl('option', { text: serving });
                option.value = servingWeight.replace('g', '');
                dropdown.appendChild(option);
            }
        });

        container.appendChild(dropdown);

        // Create the table container
        const tableContainer = createDiv({ cls: 'nutfact-table-container' });

        // Render the initial table
        const renderTable = (servingWeight: number, servingText: string) => {
            const serving = servingWeight / 100; // Calculate serving as servingWeight / 100
            const servingSize = `${servingText} (${servingWeight}g)`; // Use servingWeight directly
            tableContainer.innerHTML = calculateNutritionalValues(serving, servingSize);
        };

        // Update the calculateNutritionalValues function to accept servingSize
        function calculateNutritionalValues(serving: number, servingSize: string): string {            // Type assertion for frontmatter values
            const calories = Number(frontmatter?.calories) || 0;
            const fat = Number(frontmatter?.fat) || 0;
            const saturatedfat = Number(frontmatter?.saturatedfat) || 0;
            const transfat = Number(frontmatter?.transfat) || 0;
            const cholesterol = Number(frontmatter?.cholesterol) || 0;
            const sodium = Number(frontmatter?.sodium) || 0;
            const carbohydrates = Number(frontmatter?.carbohydrates) || 0;
            const fiber = Number(frontmatter?.fiber) || 0;
            const sugars = Number(frontmatter?.sugars) || 0;
            const protein = Number(frontmatter?.protein) || 0;
            const vitamind = Number(frontmatter?.vitamind) || 0;
            const calcium = Number(frontmatter?.calcium) || 0;
            const iron = Number(frontmatter?.iron) || 0;
            const potassium = Number(frontmatter?.potassium) || 0;

            const fatPercent = Math.round((fat * 100) / 78 * serving);
            const saturatedFatPercent = Math.round((saturatedfat * 100) / 20 * serving);
            const cholesterolPercent = Math.round((cholesterol * 100) / 300 * serving);
            const sodiumPercent = Math.round((sodium * 100) / 2300 * serving);
            const carbsPercent = Math.round((carbohydrates * 100) / 275 * serving);
            const fiberPercent = Math.round((fiber * 100) / 28 * serving);
            const proteinPercent = Math.round((protein * 100) / 50 * serving);
            const vitamindPercent = Math.round((vitamind * 100) / 20 * serving);
            const calciumPercent = Math.round((calcium * 100) / 1300 * serving);
            const ironPercent = Math.round((iron * 100) / 18 * serving);
            const potassiumPercent = Math.round((potassium * 100) / 4700 * serving);

            return `
            <table class="outer-table">
                <tr>
                    <td>
                        <table class="nutfact-table">
                            <tr class="nutfact-heading-row"><td colspan="2" class="nutfact-heading"><strong>Nutrition Facts</strong></td></tr>
                            <tr class="nutfact-serving-row"><td class="nutfact-serving-label"><strong>Serving Size</strong></td><td class="nutfact-serving-value">${servingSize}</td></tr>
                            <tr class="nutfact-amount-row"><td colspan="2" class="amtperserv">Amount per serving</td></tr>
                            <tr class="nutfact-calories-row"><td class="nutfact-calories-label"><strong>Calories</strong></td><td class="nutfact-calories-value">${Math.round(calories * serving)}</td></tr>
                            <tr class="nutfact-daily-values-row"><td colspan="2" class="nutfact-daily-values"><strong>% Daily Values*</strong></td></tr>
                            <tr class="nutfact-total-fat-row"><td><strong>Total Fat</strong> ${Math.round(fat * serving)}g</td><td class="nutfact-right">${fatPercent}%</td></tr>
                            <tr class="nutfact-saturated-fat-row"><td><strong>Saturated Fat</strong> ${Math.round(saturatedfat * serving)}g</td><td class="nutfact-right">${saturatedFatPercent}%</td></tr>
                            <tr class="nutfact-trans-fat-row"><td><strong>Trans Fat</strong> ${Math.round(transfat * serving)}g</td><td class="nutfact-right"></td></tr>
                            <tr class="nutfact-cholesterol-row"><td><strong>Cholesterol</strong> ${Math.round(cholesterol * serving)}mg</td><td class="nutfact-right">${cholesterolPercent}%</td></tr>
                            <tr class="nutfact-sodium-row"><td><strong>Sodium</strong> ${Math.round(sodium * serving)}mg</td><td class="nutfact-right">${sodiumPercent}%</td></tr>
                            <tr class="nutfact-total-carbohydrate-row"><td><strong>Total Carbohydrate</strong> ${Math.round(carbohydrates * serving)}g</td><td class="nutfact-right">${carbsPercent}%</td></tr>
                            <tr class="nutfact-fiber-row"><td><strong>Fiber</strong> ${Math.round(fiber * serving)}g</td><td class="nutfact-right">${fiberPercent}%</td></tr>
                            <tr class="nutfact-sugars-row"><td><strong>Sugars</strong> ${Math.round(sugars * serving)}g</td><td class="nutfact-right"></td></tr>
                            <tr class="nutfact-protein-row"><td><strong>Protein</strong> ${Math.round(protein * serving)}g</td><td class="nutfact-right">${proteinPercent}%</td></tr>
                            <tr class="nutfact-vitamin-d-row"><td><strong>Vitamin D</strong> ${Math.round(vitamind * serving)}mcg</td><td class="nutfact-right">${vitamindPercent}%</td></tr>
                            <tr class="nutfact-calcium-row"><td><strong>Calcium</strong> ${Math.round(calcium * serving)}mg</td><td class="nutfact-right">${calciumPercent}%</td></tr>
                            <tr class="nutfact-iron-row"><td><strong>Iron</strong> ${Math.round(iron * serving)}mg</td><td class="nutfact-right">${ironPercent}%</td></tr>
                            <tr class="nutfact-potassium-row"><td><strong>Potassium</strong> ${Math.round(potassium * serving)}mg</td><td class="nutfact-right">${potassiumPercent}%</td></tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td class="nutfact-note">*Percent Daily Values are based on a 2,000 calorie diet.</td>
                </tr>
            </table>`;
        }

        renderTable(
            parseFloat(servings[0].split(' | ')[1].replace('g', '')), // Default servingWeight
            servings[0].split(' | ')[0] // Default servingText
        );

        // Add an event listener to update the table when the dropdown changes
        dropdown.addEventListener('change', () => {
            const selectedOption = dropdown.options[dropdown.selectedIndex];
            const [servingText, servingWeight] = selectedOption.text.split(' | ');
            const servingWeightValue = parseFloat(servingWeight.replace('g', ''));
            if (!isNaN(servingWeightValue)) {
                renderTable(servingWeightValue, servingText);
            }
        });

        container.appendChild(tableContainer);
        return container;
    } catch (error) {
        console.error('Error generating FoodTracker footer:', error);
        return null;
    }
}