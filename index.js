const fs = require('fs');
const path = require('path');
const { fixIssue } = require('./java.fixer');
const { qcIssue } = require('./java.qc');
const readXlsxFile = require('read-excel-file/node');

// Function to parse command-line arguments
function parseArguments(args) {
  const parsedArgs = {};
  for (let i = 0; i < args.length; i += 2) {
    parsedArgs[args[i]] = args[i + 1];
  }
  return parsedArgs;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));

  if (args['-data']) {
    // -data mode: Read Excel file and process each row
    const filePath = args['-data'];
    try {
      const rows = await readXlsxFile(filePath);
      // Assuming the first row contains headers: FILEPATH, ISSUE
      for (let i = 1; i < rows.length; i++) {
        const [filePath, issue] = rows[i];
        console.error('Fix Process started for file:', filePath);
        await fixIssue(filePath, issue);
        console.error('Fix Process completed for file:', filePath);

        // Check if _fix file exists and content is different
        const fixedFilePath = path.join(
          path.dirname(filePath),
          `${path.basename(filePath, path.extname(filePath))}_fix${path.extname(filePath)}`
        );
        if (await fileExistsAndDifferent(filePath, fixedFilePath)) {
          console.error('Proceeding with QC for file:', fixedFilePath);
          let result = await qcIssue(fixedFilePath, issue); // Pass fixedFilePath to qcIssue
          if (result) {
            console.error('QC Process completed for file:', fixedFilePath);
          } else {
            console.error('QC Process failed for file:', fixedFilePath);
          }
        } else {
          console.error('No _fix file found or content is the same, skipping QC for:', filePath);
        }
      }
    } catch (error) {
      console.error('Error processing Excel file:', error);
    }
  } else if (args['-filepath'] && args['-issue']) {
    // -filepath and -issue mode: Process a single file
    const filePath = args['-filepath'];
    const issue = args['-issue'];
    console.error('Fix Process started for file:', filePath);
    await fixIssue(filePath, issue);
    console.error('Fix Process completed for file:', filePath);

    // Check if _fix file exists and content is different
    const fixedFilePath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath, path.extname(filePath))}_fix${path.extname(filePath)}`
    );
    if (await fileExistsAndDifferent(filePath, fixedFilePath)) {
      console.error('Proceeding with QC for file:', fixedFilePath);
      let result = await qcIssue(fixedFilePath, issue); // Pass fixedFilePath to qcIssue
      if (result) {
        console.error('QC Process completed for file:', fixedFilePath);
      } else {
        console.error('QC Process failed for file:', fixedFilePath);
      }
    } else {
      console.error('No _fix file found or content is the same, skipping QC for:', filePath);
    }
  } else {
    console.error('Invalid arguments. Use either -data for Excel input or -filepath and -issue for single file processing.');
  }
}

// Utility function to check if _fix file exists and its content is different
async function fileExistsAndDifferent(originalFilePath, fixedFilePath) {
  try {
    //console.log('originalFilePath:', originalFilePath);
    //console.log('fixedFilePath:', fixedFilePath);
    const [originalContent, fixedContent] = await Promise.all([
      fs.promises.readFile(originalFilePath, 'utf8'),
      fs.promises.readFile(fixedFilePath, 'utf8')
    ]);
   
    //console.error('diff:', originalContent !== fixedContent);
    return originalContent !== fixedContent;
  } catch (error) {
    console.error('error:', error);
    return false; // File doesn't exist or other error
  }
}

main().catch(console.error);