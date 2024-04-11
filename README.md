# code-fix-gpt

## Configuration

Before running the application locally, you need to set up your environment variables. Create a `.env` file in the root directory of the project and include the following variable:

OPENAI_API_KEY=your_openai_api_key_here

Replace `your_openai_api_key_here` with your actual OpenAI API key.

## Running the Application

To run the application, you need to have Node.js installed on your system. After setting up the environment variables, you can run the application by executing the following command in the terminal:


node index.js -data <path_to_excel_file>


or


node index.js -filepath <path_to_file> -issue <issue_to_fix>


- Use `-data` followed by the path to an Excel file to process multiple files listed in the Excel sheet.
- Use `-filepath` followed by the path to a single file and `-issue` followed by the issue to fix to process a single file.

Ensure you replace `<path_to_excel_file>`, `<path_to_file>`, and `<issue_to_fix>` with the actual file paths and issue description.