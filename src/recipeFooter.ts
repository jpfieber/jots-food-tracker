import { TFile } from "obsidian";

export async function generateRecipeFooter(file: TFile, app: any): Promise<HTMLElement | null> {
    try {
        const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
        if (!tasksPlugin) {
            console.error("Tasks plugin is not enabled or loaded.");
            return null;
        }

        // Get all completed tasks (- [c]) from the recipe file
        const tasks = tasksPlugin.getTasks().filter(task => {
            if (!task || typeof task !== "object" || !task.status) {
                console.warn("Invalid task encountered:", task);
                return false;
            }
            return task.path === file.path && task.status?.configuration?.symbol === "c";
        });

        if (tasks.length === 0) {
            console.log("No completed tasks found in the recipe file.");
            return null;
        }

        // Gather detailed nutritional data for each ingredient
        const ingredientData = await Promise.all(
            tasks.map(async task => {
                const ingredientNameMatch = task.description.match(/\[\[(.+?)\]\]/); // Extract the ingredient note name
                if (!ingredientNameMatch) {
                    console.warn("No ingredient note found in task:", task.description);
                    return null;
                }

                let ingredientName = ingredientNameMatch[1];

                // Handle alias (split by '|')
                if (ingredientName.includes("|")) {
                    ingredientName = ingredientName.split("|")[0].trim(); // Use only the page name
                }

                // Extract `serving` and `qty` inline variables from the task description
                const servingMatch = task.description.match(/serving::\s*([\w\s.\/]+)\b/i);
                const qtyMatch = task.description.match(/qty::\s*([\d.]+)/i);

                const serving = servingMatch ? servingMatch[1].trim().toLowerCase() : null; // Normalize serving
                const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1; // Default quantity is 1

                if (!serving) {
                    console.warn(`No serving size found for ingredient: ${ingredientName}`);
                    return null;
                }

                // Use the metadata cache to find the ingredient file
                const ingredientFile = app.metadataCache.getFirstLinkpathDest(ingredientName, file.path);
                if (!(ingredientFile instanceof TFile)) {
                    console.warn(`Ingredient file not found in index: ${ingredientName}`);
                    return null;
                }

                // Read the ingredient note and extract nutritional information
                const ingredientContent = await app.vault.read(ingredientFile);

                // Parse the frontmatter for the `servings` property
                const fileCache = app.metadataCache.getFileCache(ingredientFile);
                const frontmatter = fileCache?.frontmatter;

                if (!frontmatter || !frontmatter.servings) {
                    console.warn(`No servings data found in ingredient: ${ingredientName}`);
                    return null;
                }

                // Parse the servings options from the frontmatter
                const servingsOptions = Array.isArray(frontmatter.servings)
                    ? frontmatter.servings.map((line: string) => {
                        const [label, grams] = line.split("|").map(s => s.trim());
                        return { label: label.toLowerCase(), grams: parseFloat(grams) }; // Normalize label
                    })
                    : [];

                if (servingsOptions.length === 0) {
                    console.warn(`No valid servings data found in ingredient: ${ingredientName}`);
                    return null;
                }

                // Find the matching serving option
                const matchingServing = servingsOptions.find(option => option.label.includes(serving));
                if (!matchingServing) {
                    console.warn(`No matching serving size "${serving}" found in ingredient: ${ingredientName}`);
                    console.warn(`Available serving sizes: ${servingsOptions.map(option => option.label).join(", ")}`);
                    return null;
                }
                
                // Calculate the multiplier (grams / 100)
                const multiplier = matchingServing.grams / 100;

                // Extract nutrient data from the ingredient content
                const nutrition = parseNutritionFromContent(ingredientContent);

                // Scale the nutrient data by the multiplier and quantity
                const scaledNutrition = Object.keys(nutrition).reduce((acc, key) => {
                    acc[key] = (nutrition[key] || 0) * multiplier * qty;
                    return acc;
                }, {} as Record<string, number>);

                return {
                    name: ingredientName,
                    ...scaledNutrition,
                };
            })
        );

        // Filter out any null results
        const validIngredients = ingredientData.filter(ingredient => ingredient !== null);

        // Create the container for the dropdown and table
        const container = createDiv({ cls: "nutfact-container" });

        // Create the dropdown
        const dropdown = createEl("select", { cls: "nutfact-dropdown" });
        dropdown.appendChild(new Option("1 Serving", "serving", true, true)); // Set "1 Serving" as the default selected option
        dropdown.appendChild(new Option("Total Recipe", "total"));
        container.appendChild(dropdown);

        // Create the table container
        const tableContainer = createDiv({ cls: "nutfact-table-container" });

        // Retrieve the number of servings from the recipe's inline Dataview field
        const fileContent = await app.vault.read(file);
        const servingsMatch = fileContent.match(/servings::\s*(\d+)/i);
        const servings = servingsMatch ? parseInt(servingsMatch[1], 10) : 1; // Default to 1 if 'servings' is not defined

        // Render the table based on the selected option
        const renderTable = (isPerServing: boolean) => {
            // Use the number of servings from the recipe's frontmatter as the divisor for per-serving calculations
            const divisor = isPerServing ? servings : 1;
            const totals = validIngredients.reduce(
                (acc, ingredient) => {
                    acc.calories += ingredient.calories || 0;
                    acc.fat += ingredient.fat || 0;
                    acc.saturatedFat += ingredient.saturatedFat || 0;
                    acc.transFat += ingredient.transFat || 0;
                    acc.cholesterol += ingredient.cholesterol || 0;
                    acc.sodium += ingredient.sodium || 0;
                    acc.carbs += ingredient.carbs || 0;
                    acc.fiber += ingredient.fiber || 0;
                    acc.sugars += ingredient.sugars || 0;
                    acc.protein += ingredient.protein || 0;
                    acc.vitaminD += ingredient.vitaminD || 0;
                    acc.calcium += ingredient.calcium || 0;
                    acc.iron += ingredient.iron || 0;
                    acc.potassium += ingredient.potassium || 0;
                    return acc;
                },
                {
                    calories: 0,
                    fat: 0,
                    saturatedFat: 0,
                    transFat: 0,
                    cholesterol: 0,
                    sodium: 0,
                    carbs: 0,
                    fiber: 0,
                    sugars: 0,
                    protein: 0,
                    vitaminD: 0,
                    calcium: 0,
                    iron: 0,
                    potassium: 0,
                }
            );

            // Calculate per-serving values
            const fat = Math.round(totals.fat / divisor);
            const saturatedFat = Math.round(totals.saturatedFat / divisor);
            const transFat = Math.round(totals.transFat / divisor);
            const cholesterol = Math.round(totals.cholesterol / divisor);
            const sodium = Math.round(totals.sodium / divisor);
            const carbs = Math.round(totals.carbs / divisor);
            const fiber = Math.round(totals.fiber / divisor);
            const sugars = Math.round(totals.sugars / divisor);
            const protein = Math.round(totals.protein / divisor);
            const vitaminD = Math.round(totals.vitaminD / divisor);
            const calcium = Math.round(totals.calcium / divisor);
            const iron = Math.round(totals.iron / divisor);
            const potassium = Math.round(totals.potassium / divisor);
            const calories = Math.round(totals.calories / divisor);

            tableContainer.innerHTML = `
            <table class="outer-table">
                <tr>
                    <td>
                        <table class="nutfact-table">
                            <tr class="nutfact-heading-row"><td colspan="2" class="nutfact-heading"><strong>Nutrition Facts</strong></td></tr>
                            <tr class="nutfact-serving-row"><td class="nutfact-serving-label"><strong>Serving Size</strong></td><td class="nutfact-serving-value">${isPerServing ? `1 Serving` : "Total Recipe"}</td></tr>
                            <tr class="nutfact-amount-row"><td colspan="2" class="amtperserv">Amount per serving</td></tr>
                            <tr class="nutfact-calories-row"><td class="nutfact-calories-label"><strong>Calories</strong></td><td class="nutfact-calories-value">${calories}</td></tr>
                            <tr class="nutfact-daily-values-row"><td colspan="2" class="nutfact-daily-values"><strong>% Daily Values*</strong></td></tr>
                            <tr class="nutfact-total-fat-row"><td><strong>Total Fat</strong> ${fat}g</td><td class="nutfact-right">${Math.round((fat * 100) / 78)}%</td></tr>
                            <tr class="nutfact-saturated-fat-row"><td><strong>Saturated Fat</strong> ${saturatedFat}g</td><td class="nutfact-right">${Math.round((saturatedFat * 100) / 20)}%</td></tr>
                            <tr class="nutfact-trans-fat-row"><td><strong>Trans Fat</strong> ${transFat}g</td><td class="nutfact-right"></td></tr>
                            <tr class="nutfact-cholesterol-row"><td><strong>Cholesterol</strong> ${cholesterol}mg</td><td class="nutfact-right">${Math.round((cholesterol * 100) / 300)}%</td></tr>
                            <tr class="nutfact-sodium-row"><td><strong>Sodium</strong> ${sodium}mg</td><td class="nutfact-right">${Math.round((sodium * 100) / 2300)}%</td></tr>
                            <tr class="nutfact-total-carbohydrate-row"><td><strong>Total Carbohydrate</strong> ${carbs}g</td><td class="nutfact-right">${Math.round((carbs * 100) / 275)}%</td></tr>
                            <tr class="nutfact-fiber-row"><td><strong>Fiber</strong> ${fiber}g</td><td class="nutfact-right">${Math.round((fiber * 100) / 28)}%</td></tr>
                            <tr class="nutfact-sugars-row"><td><strong>Sugars</strong> ${sugars}g</td><td class="nutfact-right"></td></tr>
                            <tr class="nutfact-protein-row"><td><strong>Protein</strong> ${protein}g</td><td class="nutfact-right">${Math.round((protein * 100) / 50)}%</td></tr>
                            <tr class="nutfact-vitamin-d-row"><td><strong>Vitamin D</strong> ${vitaminD}mcg</td><td class="nutfact-right">${Math.round((vitaminD * 100) / 20)}%</td></tr>
                            <tr class="nutfact-calcium-row"><td><strong>Calcium</strong> ${calcium}mg</td><td class="nutfact-right">${Math.round((calcium * 100) / 1300)}%</td></tr>
                            <tr class="nutfact-iron-row"><td><strong>Iron</strong> ${iron}mg</td><td class="nutfact-right">${Math.round((iron * 100) / 18)}%</td></tr>
                            <tr class="nutfact-potassium-row"><td><strong>Potassium</strong> ${potassium}mg</td><td class="nutfact-right">${Math.round((potassium * 100) / 4700)}%</td></tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td class="nutfact-note">*Percent Daily Values are based on a 2,000 calorie diet.</td>
                </tr>
            </table>`;
        };

        // Initial render for "1 Serving"
        renderTable(true); // Set `isPerServing` to `true` for the initial render

        // Add event listener to dropdown
        dropdown.addEventListener("change", () => {
            const isPerServing = dropdown.value === "serving";
            renderTable(isPerServing);
        });

        container.appendChild(tableContainer);
        return container;
    } catch (error) {
        console.error("Error generating recipe footer:", error);
        return null;
    }
}

function parseNutritionFromContent(content: string): {
    calories: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    carbs: number;
    fiber: number;
    sugars: number;
    protein: number;
    vitaminD: number;
    calcium: number;
    iron: number;
    potassium: number;
} {
    const calMatch = content.match(/calories:\s*(\d+(\.\d+)?)/i);
    const fatMatch = content.match(/fat:\s*(\d+(\.\d+)?)/i);
    const saturatedFatMatch = content.match(/saturatedfat:\s*(\d+(\.\d+)?)/i);
    const transFatMatch = content.match(/transfat:\s*(\d+(\.\d+)?)/i);
    const cholesterolMatch = content.match(/cholesterol:\s*(\d+(\.\d+)?)/i);
    const sodiumMatch = content.match(/sodium:\s*(\d+(\.\d+)?)/i);
    const carbsMatch = content.match(/carbohydrates:\s*(\d+(\.\d+)?)/i);
    const fiberMatch = content.match(/fiber:\s*(\d+(\.\d+)?)/i);
    const sugarsMatch = content.match(/sugars:\s*(\d+(\.\d+)?)/i);
    const proteinMatch = content.match(/protein:\s*(\d+(\.\d+)?)/i);
    const vitaminDMatch = content.match(/vitamind:\s*(\d+(\.\d+)?)/i);
    const calciumMatch = content.match(/calcium:\s*(\d+(\.\d+)?)/i);
    const ironMatch = content.match(/iron:\s*(\d+(\.\d+)?)/i);
    const potassiumMatch = content.match(/potassium:\s*(\d+(\.\d+)?)/i);

    return {
        calories: calMatch ? parseFloat(calMatch[1]) : 0,
        fat: fatMatch ? parseFloat(fatMatch[1]) : 0,
        saturatedFat: saturatedFatMatch ? parseFloat(saturatedFatMatch[1]) : 0,
        transFat: transFatMatch ? parseFloat(transFatMatch[1]) : 0,
        cholesterol: cholesterolMatch ? parseFloat(cholesterolMatch[1]) : 0,
        sodium: sodiumMatch ? parseFloat(sodiumMatch[1]) : 0,
        carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
        fiber: fiberMatch ? parseFloat(fiberMatch[1]) : 0,
        sugars: sugarsMatch ? parseFloat(sugarsMatch[1]) : 0,
        protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
        vitaminD: vitaminDMatch ? parseFloat(vitaminDMatch[1]) : 0,
        calcium: calciumMatch ? parseFloat(calciumMatch[1]) : 0,
        iron: ironMatch ? parseFloat(ironMatch[1]) : 0,
        potassium: potassiumMatch ? parseFloat(potassiumMatch[1]) : 0,
    };
}