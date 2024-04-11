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

async function qcJavaIssue(filePath, issue) {
    try {
        //customLogger.log('verbose:', verbose);
        // Get the OpenAI API key from the environment variable
        const apiKey = process.env.OPENAI_API_KEY;
        var fileContents = await fs.promises.readFile(filePath, 'utf-8');
        //Before processing the file contents line endings to ensure consistency. 
        fileContents = fileContents.replace(/\r\n/g, '\n');
        //customLogger.log("QC fileContents:", fileContents);
        const systemContent = "Context: You are Ack, a detail-oriented software developer, with a strong background in Java and related technology stack, specifically Java 8, Tomcat 8.5, Junit, Struts 2.3, EJB 3, Hibernate, Spring Framework, Oracle database, VoltDB, XML, Security vulnerability.\n\
                              \n\
                              Task:\n\
                              - Your task is to check for issues reported in Java code.\n\
                              - The text \"INPUT\" will have the Java code.\n\
                              - The text \"ISSUE\" will have a short description of the issue that needs to be checked.\n\
                              - Do not include any explanation in the response.\n\
                              - Respond with a JSON with two keys qc_fix and qc_syntax.\n\
                              - If the issue exists then qc_fix will be false else it will be true.If qc_fix is false you MUST provide the reason for the same in qc_fix_reason.\n\
                              - if there is a syntax issue in code then qc_syntax will be false else it will be true.If qc_syntax is false you MUST provide the reason for the same in qc_syntax_reason.\n\
                              - The output MUST always contain the qc_fix and qc_syntax.\n\
                              -Sample JSON below:\n\
                              {\"qc_fix\":false,\"qc_syntax\":false}\n\
                                "
        let messages = [
            {
                role: 'system',
                content: systemContent
            },
            {
                role: 'user',
                content: `INPUT: ${fileContents}\nISSUE: ${issue}. Is this still an issue?`
            }
        ];

        // Set other API parameters
        const model = 'gpt-4-1106-preview';
        //const model = 'gpt-4-turbo';
        const temperature = 0;
        const maxTokens = 4096;
        const seed = 108;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            seed: seed,
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });


        assistantReply = response.data.choices[0].message.content;

        customLogger.log("QC Assistant Reply:", assistantReply);

        // Parse the JSON from the assistant's reply
        let result = JSON.parse(assistantReply);

        // Check if both qc_fix and qc_syntax are true
        if (result.qc_syntax === true) {
            customLogger.log("QC Assistant Reply indicates no issues.");
            return true;
        } else {
            customLogger.log("QC Assistant Reply indicates issues or syntax errors.");
            return false;
        }
    } catch (error) {
        customLogger.error('Error in QC for file:', filePath, 'issue:', issue, 'error:', error);
        return false;
    }
}
// Export fixIssue
module.exports = { qcJavaIssue };