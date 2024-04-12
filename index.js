const fs = require('fs');
const path = require('path');
const { fixJavaIssue } = require('./java.fixer');
const { qcJavaIssue } = require('./java.qc');
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
        const [filePath, issue, include] = rows[i];
        if (include.toString().toLowerCase() !== 'true') {
          console.log(`[Fix Process] Skipping file due to exclude flag: ${path.basename(filePath)}`);
          continue; // Skip this iteration if exclude is not 'false'
        }
        try {
          console.log('--------------------------------------------------');
          console.log(`[Fix Process] Started for file: ${path.basename(filePath)}`);
          await fixJavaIssue(filePath, issue);
          console.log(`[Fix Process] Completed for file: ${path.basename(filePath)}`);
          console.log('--------------------------------------------------');
          // Check if _fix file exists and content is different
          const fixedFilePath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, path.extname(filePath))}_fix${path.extname(filePath)}`
          );
          if (await fileExistsAndDifferent(filePath, fixedFilePath)) {
            console.log(`<QC Process> Started for file: ${path.basename(fixedFilePath)}`);
            let result = await qcJavaIssue(fixedFilePath, issue); // Pass fixedFilePath to qcIssue
            if (result) {
              console.log(`<QC Process> Completed for file: ${path.basename(fixedFilePath)}`);
            } else {
              console.error(`<QC Process> Failed for file: ${path.basename(fixedFilePath)}`);
            }
            console.log('--------------------------------------------------');
          } else {
            console.error(`<QC Process>No _fix file found. Skipping QC for: ${path.basename(filePath)}`);
            console.log('--------------------------------------------------');
          }
        } catch (error) {
          console.error(`[Error] Processing for file: ${path.basename(filePath)}`);
        }
      }
    } catch (error) {
      console.error(`[Error] Processing Excel file: ${error}`);
      console.log('--------------------------------------------------');
    }
  } else if (args['-filepath'] && args['-issue']) {
    // -filepath and -issue mode: Process a single file 

    const filePath = args['-filepath'];
    const issue = args['-issue'];
    try {
      console.log('--------------------------------------------------');
      console.log(`[Fix Process] Started for file: ${path.basename(filePath)}`);
      await fixJavaIssue(filePath, issue);
      console.log(`[Fix Process] Completed for file: ${path.basename(filePath)}`);
      console.log('--------------------------------------------------');
      // Check if _fix file exists and content is different
      const fixedFilePath = path.join(
        path.dirname(filePath),
        `${path.basename(filePath, path.extname(filePath))}_fix${path.extname(filePath)}`
      );
      if (await fileExistsAndDifferent(filePath, fixedFilePath)) {
        console.log(`<QC Process> Started for file: ${path.basename(fixedFilePath)}`);
        let result = await qcJavaIssue(fixedFilePath, issue); // Pass fixedFilePath to qcIssue
        if (result) {
          console.log(`<QC Process> Completed for file: ${path.basename(fixedFilePath)}`);
        } else {
          console.error(`<QC Process> Failed for file: ${path.basename(fixedFilePath)}`);
        }
        console.log('--------------------------------------------------');
      } else {
        console.error(`<QC Process>No _fix file found. Skipping QC for: ${path.basename(filePath)}`);
        console.log('--------------------------------------------------');
      }
    } catch (error) {
      console.error(`[Error] Processing for file: ${path.basename(filePath)}`);
    }
  } else {
    console.error('[Invalid Arguments] Use either -data for Excel input or -filepath and -issue for single file processing.');
    console.log('--------------------------------------------------');
  }
}

// Utility function to check if _fix file exists and its content is different
async function fileExistsAndDifferent(originalFilePath, fixedFilePath) {
  try {
    const [originalContent, fixedContent] = await Promise.all([
      fs.promises.readFile(originalFilePath, 'utf8'),
      fs.promises.readFile(fixedFilePath, 'utf8')
    ]);

    return originalContent !== fixedContent;
  } catch (error) {
    //console.error(`[Error] Checking file existence/difference: ${error}`);
    return false; // File doesn't exist or other error
  }
}

main().catch(console.error);