const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const { CustomLogger } = require('./utils');

// Load environment variables from .env file
dotenv.config();

const verbose = process.env.VERBOSE || false;

// Initialize the custom logger with the path to cfg.log
const customLogger = new CustomLogger(__dirname + '/cfg.log');

async function fixJavaIssue(filePath, issue) {
    try {
        //customLogger.log('verbose:', verbose);
        // Get the OpenAI API key from the environment variable
        const apiKey = process.env.OPENAI_API_KEY;
        var fileContents = await fs.promises.readFile(filePath, 'utf-8');
        //Before processing the file contents line endings to ensure consistency. 
        fileContents = fileContents.replace(/\r\n/g, '\n');

        const systemContent = "Context: You are Ack, a detail-oriented software developer, with a strong background in Java and related technology stack, specifically Java 8, Tomcat 8.5, Junit, Struts 2.3, EJB 3, Hibernate, Spring Framework, Oracle database, VoltDB, XML, Security vulnerability.\n\
                              \n\
                              Task:\n\
                              - Your task is to fix issues reported in Java code.\n\
                              - The text \"INPUT\" will have the Java code which has the issue.\n\
                              - The text \"ISSUE\" will have a short description of the issue that needs to be fixed.\n\
                              - Do not include any explanation in the response.\n\
                              - Follow best practices of software development and pay attention to code syntax, as the code is in Java.\n\
                              - Write a patch for the issue, based on the provided context.\n\
                              - Return the patch in the format below as numbered updates.Refer \"Sample\".\n\
                              - Between <issue></issue> tags, add the original code snippet from the program.Make sure to include comments, if any. The text between <issue></issue> tags must match exactly with the original code.\n\
                              - Between <fix></fix>tags,add the \"fixed version\" of the original code added between <issue></issue> tags.Be precise when providing a fix between <fix></fix> tags.\n\
                              - Provide multiple numbered updates with size of text between <issue> and <fix> tags of maximum 10 lines each, over one large numbered update.\n\
                              - Sample:\n\
                                ### update 1\n\
                                <issue>(original code here)</issue>\n\
                                <fix>(fixed code here)</fix>\n\
                                ### update 2\n\
                                <issue>(original code here)</issue>\n\
                                <fix>(fixed code here)</fix>\n\
                                ### update 3\n\
                                <issue>(original code here)</issue>\n\
                                <fix>(fixed code here)</fix>\n\
                                ### update 4 (If new method is added)\n\
                                <issue>NA</issue>\n\
                                <fix>(new method here)</fix>\n\
                              - If unable to provide a precise fix,add the word COMPLEX between <issue></issue> tags and provide the reason between <fix></fix> tags.\n\
                              - Each numbered update must have a <issue> and <fix> tags.\n\
                              - There is no limit on the number of updates you can provide.\n\
                              "
// - The text between <issue></issue> will be searched using regex and the text between <fix></fix> will be applied to the original code, if a match is found.\n\
// - So it is important to avoid using generic placeholders in issue and fix tags, as this will cause the regex match to fail.\n\
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
            logit_bias: {1131:-100,2564:-100,48627:-100,316:-100,3847:-100,369:-100,5395:-100,85:-100,488:-100},//blocking tokens such ... , brevity. Pushing model to respond with a complete fix rather than partial fix.
            seed: seed
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });


        assistantReply = response.data.choices[0].message.content;

        customLogger.log("Fix Assistant Reply:", assistantReply);

        await applyPatchesAndWriteFile(filePath, assistantReply);

    } catch (error) {
        customLogger.error('Error in Java fixer for file:', filePath, 'issue:', issue, 'error:', error);
        throw error;
    }
}

async function applyPatchesAndWriteFile(originalFilePath, gptResponse) {
    try {
        customLogger.log('Entering applyPatchesAndWriteFile function');
        let fileContents = await fs.promises.readFile(originalFilePath, 'utf-8');
        //Before processing the file contents, normalize line endings to ensure consistency. 
        fileContents = fileContents.replace(/\r\n/g, '\n');
        //customLogger.log('File contents loaded');
        //const regex = /<issue>([\s\S]*?)<\/issue>\s*<fix>([\s\S]*?)<\/fix>/g;
        const regex = /<issue>((?:\\.|[^\\])*?)<\/issue>\s*<fix>((?:\\.|[^\\])*?)<\/fix>/g;
        let match;
        while ((match = regex.exec(gptResponse)) !== null) {
            let issue = match[1].trim();
            const fix = match[2].trim();

            //handling for complex methods
            if (issue === 'COMPLEX') {
                customLogger.log('Issue is complex');
                return;
            }
            
            if (issue === 'NA') {
                customLogger.log('Handling new method');
                // Find the last closing bracket }
                const lastClosingBracketIndex = fileContents.lastIndexOf('}');
                if (lastClosingBracketIndex !== -1) {
                    // Insert the fix before the last closing bracket
                    fileContents = fileContents.substring(0, lastClosingBracketIndex) +
                        fix + '\n' +
                        fileContents.substring(lastClosingBracketIndex);
                } else {
                    customLogger.log("No closing bracket found in the file.");
                }
            } else {
                customLogger.log('Handling existing code');
                // Create a regex pattern that ignores whitespace variations in the issue string
                const issueRegexPattern = issue.split('').map(char => {
                    if (/\s/.test(char)) {
                        return '\\s*'; // Replace any whitespace character with \s* to match zero or more whitespace
                    } else {
                        return escapeRegExp(char); // Escape special regex characters
                    }
                }).join('');

                const issueRegex = new RegExp(issueRegexPattern, 'gs'); // 'g' for global, 's' for dotAll (matches newline with '.')

                //customLogger.log("Regex pattern:", issueRegex);
                //customLogger.log("Attempting to match:", issue);
                fileContents = fileContents.replace(issueRegex, fix);
            }
        }

        const outputFilePath = path.join(
            path.dirname(originalFilePath),
            `${path.basename(originalFilePath, path.extname(originalFilePath))}_fix${path.extname(originalFilePath)}`
        );

        if (verbose) {
            //customLogger.log('Before writing file:', fileContents);
        }
        await fs.promises.writeFile(outputFilePath, fileContents, 'utf-8');
        // customLogger.log('Updates applied successfully to file:',outputFilePath);
    } catch (error) {
        customLogger.error('Error applying fix for file:', originalFilePath, 'error:', error);
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
module.exports = { fixJavaIssue };