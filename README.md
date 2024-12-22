# OCMT
Obsidian Calorie and Macro Tracking

## Introduction
Before I found [Obsidian](https://obsidian.md/), I had been tracking calories and macros in a detailed, advanced Google Sheets template that worked great. As I moved more of my digital life into Obsidian, I wondered if there was a way of also handling calorie and macro tracking from within Obsidian, since it was now where I was spending much of my screen time. Following is what I have developed so far. It's not as feature-full as the Google Sheets template, but handles the basics of what I need. I'm releasing it to the Obsidian community because A) I like to share cool stuff with others that can appreciate it, and B) I'm hoping others will build on it and make it better.

## Overview
Through out the day, as I consume food and beverages, I add these items to my daily journal. Each item I add includes the meal it was a part of, a description/title, quantity, how many calories were consumed, and how much of the macros I care about (Fat/Carbs/Protein) were consumed. To make that process easier, I have a note for each food item that contains it's nutritional information.  Using a template, I simply choose which meal, then choose the food item from a list, choose which quantity measurement I'd like to use (eg. 1 serving, 1 container, 100g, etc), and finally, how many of that measure did I consume.  Through some template magic, a decorated task is then added to my daily journal detailing the item that was consumed. As an example, I had a can of Progresso soup for lunch, here's how it looks in my journal:

![image](https://github.com/user-attachments/assets/0f2ce991-547e-4f98-95b4-e7f964d7e9c7)

To make sense of what I've consumed for the day, I have a dashboard that lists everything I've consumed, and then summarizes it:

![image](https://github.com/user-attachments/assets/f5575766-11b5-48b2-a19d-b3f757ca44ac)

![image](https://github.com/user-attachments/assets/9dd6cca3-c09c-434d-b810-0c7d14c85d26)

## OCMT - USDA Foods
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
