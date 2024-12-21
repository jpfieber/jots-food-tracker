# OCMT
Obsidian Calorie and Macro Tracking

Though you can get raw nutritional data from the [USDA](https://fdc.nal.usda.gov/download-datasets), it's a bit confusing. I found a more convenient, already processed spreadsheet available through the [My Food Data](https://tools.myfooddata.com/nutrition-facts-database-spreadsheet.php) website. I downloaded the Excel version, and converted it to a CSV file containing the nutritional information for 14,164 food items. I then created a PowerShell script that generates a Markdown file for each line item in the CSV, organized by their 'Food Group'. 

The script does the following:
- Replace the header row with shorter descriptions that will work as YAML/Frontmatter property names
- Sanitize the name so it can be used as a valid file name
- Create a YAML property for each nutritional value that isn't blank or 'NULL'
- Create a 'fileClass' property that equals "Ingredient"
- Create a 'created' property equal to the time/date the file was created
- Create a 'cssclasses' property equal to "nutfact" so a CSS snippet can be applied for proper display of Nutritional Facts Label
- Create a list of serving sizes that includes a default "100g"
- Add a dataviewjs block to the end of the file that calls a shared script used to display the Nutritional Facts Label, and any other desired content

Note that 128 items in the spreadsheet have 'NULL' as their 'Food Group'. I left them in a folder called 'NULL'. You can move them to a more appropriate location, delete them, or leave them there.
