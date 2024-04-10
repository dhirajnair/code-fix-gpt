const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const verbose = process.env.VERBOSE || false;

async function fixIssue(filePath, issue) {
    try {
        //console.log('verbose:', verbose);
        // Get the OpenAI API key from the environment variable
        const apiKey = process.env.OPENAI_API_KEY;
        var fileContents = await fs.promises.readFile(filePath, 'utf-8');
        //Before processing the file contents line endings to ensure consistency. 
        fileContents = fileContents.replace(/\r\n/g, '\n');

        /*const systemContent = "Context: You are Ack, a detail-oriented software developer, with a strong background in Java and related technology stack, specifically Java 8, Tomcat 8.5, Junit, Struts 2.3, EJB 3, Hibernate, Spring Framework, Oracle database, VoltDB, XML, Security vulnerability.\n\
                              \n\
                              Task:\n\
                              - Your task is to fix issues reported in Java code.\n\
                              - The text \"INPUT\" will have the Java code which has the issue.\n\
                              - The text \"ISSUE\" will have a short description of the issue that needs to be fixed.\n\
                              - Do not include any explanation in the reponse.\n\
                              - Write a patch for the issue, based on the provided context.\n\
                              - Return the patch in the format below. Within <issue></issue>, replace ... with the original code snippet from the program. Within <fix></fix>, replace ... with the fixed version of the original code. When adding orignal code and updated code, pay attention to code syntax, as the code is in Java.\n\
                              - For any new code, use <issue>NA</issue> and <fix>...</fix>,replace ... with the new code.\n\
                              - You can write multiple modifications if needed.\n\
                                # fix 1\n\
                                <issue>...</issue>\n\
                                <fix>...</fix>\n\
                                # fix 2 - new code\n\
                                <issue>NA</issue>\n\
                                <fix>...</fix>\n\
                                # fix 3\n\
                                ...\n\
                                "*/

        /*const systemContent = "Context: You are Ack, a detail-oriented software developer, with a strong background in Java and related technology stack, specifically Java 8, Tomcat 8.5, Junit, Struts 2.3, EJB 3, Hibernate, Spring Framework, Oracle database, VoltDB, XML, Security vulnerability.\n\
                                \n\
                                Task:\n\
                                - Your task is to fix issues reported in Java code.\n\
                                - The text \"INPUT\" will have the Java code which has the issue.\n\
                                - The text \"ISSUE\" will have a short description of the issue that needs to be fixed.\n\
                                - Do not include any explanation in the response.\n\
                                - Write a patch for the issue, based on the provided context.\n\
                                - Return the patch in the format below.Within <issue></issue>, replace ... with the complete original code snippet from the program. Within <fix></fix>, replace ... with the fixed version of the original code. Ensure to pay attention to code syntax, as the code is in Java.\n\
                                - For a new method, use <issue>NA</issue> and <fix>...</fix>, replacing ... with the new method.\n\
                                - If multiple, separate modifications are needed, provide each as a separate update, clearly numbered or identified.\n\
                                  # update 1\n\
                                  <issue>...</issue>\n\
                                  <fix>...</fix>\n\
                                  # update 2 - new method\n\
                                  <issue>NA</issue>\n\
                                  <fix>...</fix>\n\
                                  # update 3\n\
                                  ...\n\
                                  "*/
        const systemContent = "Context: You are Ack, a detail-oriented software developer, with a strong background in Java and related technology stack, specifically Java 8, Tomcat 8.5, Junit, Struts 2.3, EJB 3, Hibernate, Spring Framework, Oracle database, VoltDB, XML, Security vulnerability.\n\
                              \n\
                              Task:\n\
                              - Your task is to fix issues reported in Java code.\n\
                              - The text \"INPUT\" will have the Java code which has the issue.\n\
                              - The text \"ISSUE\" will have a short description of the issue that needs to be fixed.\n\
                              - Do not include any explanation in the response.\n\
                              - Write a patch for the issue, based on the provided context.\n\
                              - Return the patch in the format below.Between <issue></issue> tags, add the complete original code snippet from the program.Make sure to include comments, if any.\n\
                              - Between <fix></fix>tags,add the fixed version of the original code.\n\
                              - Ensure to pay attention to code syntax, as the code is in Java.\n\
                                # update 1\n\
                                <issue>(original code here)</issue>\n\
                                <fix>(fixed code here)</fix>\n\
                                # update 2\n\
                                <issue>(original code here)</issue>\n\
                                <fix>(fixed code here)</fix>\n\
                                # update 3\n\
                                <issue>(original code here)</issue>\n\
                                <fix>(fixed code here)</fix>\n\
                                # update 4\n\
                                <issue>NA</issue>\n\
                                <fix>(new method here)</fix>\n\
                                - ENSURE that the text between <issue> and <fix> tags is different from each other.\n\
                                - ALWAYS provide multiple small updates with size of 1-10 lines each over one large update of size 15-20 lines.\n\
                                "

        //- If a fix has to be applied to multiple methods, provide each as a separate numbered update (one for each method).\n\
        //- Within a method a fix can be provided as multiple separate updates, if needed.\n\
        let messages = [
            {
                role: 'system',
                content: systemContent
            },
            {
                role: 'user',
                content: `INPUT: ${fileContents}\nISSUE: ${issue}`
            }
        ];

        // Set other API parameters
        const model = 'gpt-4-1106-preview';
        const temperature = 0;
        const maxTokens = 4096;
        const seed = 111;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            seed: seed
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });


        assistantReply = response.data.choices[0].message.content;

        console.log("Fix Assistant Reply:", assistantReply);

        await applyPatchesAndWriteFile(filePath, assistantReply);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function applyPatchesAndWriteFile(originalFilePath, gptResponse) {
    try {
        console.log('Entering applyPatchesAndWriteFile function');
        let fileContents = await fs.promises.readFile(originalFilePath, 'utf-8');
        //Before processing the file contents, normalize line endings to ensure consistency. 
        fileContents = fileContents.replace(/\r\n/g, '\n');
        //console.log('File contents loaded');
        //const regex = /<issue>([\s\S]*?)<\/issue>\s*<fix>([\s\S]*?)<\/fix>/g;
        const regex = /<issue>((?:\\.|[^\\])*?)<\/issue>\s*<fix>((?:\\.|[^\\])*?)<\/fix>/g;
        let match;
        while ((match = regex.exec(gptResponse)) !== null) {
            let issue = match[1].trim();
            const fix = match[2].trim();

            //handling for new methods
            if (issue === 'NA') {
               // console.log('Handling new method');
                // Find the last closing bracket }
                const lastClosingBracketIndex = fileContents.lastIndexOf('}');
                if (lastClosingBracketIndex !== -1) {
                    // Insert the fix before the last closing bracket
                    fileContents = fileContents.substring(0, lastClosingBracketIndex) +
                        fix + '\n' +
                        fileContents.substring(lastClosingBracketIndex);
                } else {
                    console.log("No closing bracket found in the file.");
                }
            } else {
                //console.log('Handling existing code');
                // Create a regex pattern that ignores whitespace variations in the issue string
                const issueRegexPattern = issue.split('').map(char => {
                    if (/\s/.test(char)) {
                        return '\\s*'; // Replace any whitespace character with \s* to match zero or more whitespace
                    } else {
                        return escapeRegExp(char); // Escape special regex characters
                    }
                }).join('');

                const issueRegex = new RegExp(issueRegexPattern, 'gs'); // 'g' for global, 's' for dotAll (matches newline with '.')

                //console.log("Regex pattern:", issueRegex);
                //console.log("Attempting to match:", issue);
                fileContents = fileContents.replace(issueRegex, fix);
            }
        }

        const outputFilePath = path.join(
            path.dirname(originalFilePath),
            `${path.basename(originalFilePath, path.extname(originalFilePath))}_fix${path.extname(originalFilePath)}`
        );

        if (verbose) {
            //console.log('Before writing file:', fileContents);
        }
        await fs.promises.writeFile(outputFilePath, fileContents, 'utf-8');
       // console.log('Updates applied successfully to file:',outputFilePath);
    } catch (error) {
        console.error('Error applying fix for file:', originalFilePath, 'error:', error);
    }
}

// Escapes special characters for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Unescapes special characters for regex
function unescapeRegExp(string) {
    return string.replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
}

// Export fixIssue
module.exports = { fixIssue };