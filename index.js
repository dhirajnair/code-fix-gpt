const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

async function processFile(filePath, issue) {
  try {
    // Read the contents of the file into a string
    const fileContents = await fs.promises.readFile(filePath, 'utf-8');

    // Get the OpenAI API key from the environment variable
    const apiKey = process.env.OPENAI_API_KEY;

    // Get the system content from the environment variable
    const systemContent = "Context: You are Ack, a detail-oriented software developer, with a strong background in Java and related technology stack, specifically Java 8, Tomcat 8.5, Junit, Struts 2.3, EJB 3, Hibernate, Spring Framework, Oracle database, VoltDB, XML, Security vulnerability.\n\
                          \n\
                          Task:\n\
                          - Your task is to fix issues reported in code.\n\
                          - The text \"INPUT\" will have the code which has the issue.\n\
                          - The text \"ISSUE\" will have a short description of the issue that needs to be fixed.\n\
                          - Do not include any explanation.\n\
                          - Output only plain text.\n\
                          - If there are java comments in the code, please include them in the output.\n\
                          - You need to fix the issue and provide the entire code in tags <fix></fix>.\n\
                          - The response must be a valid java class.It must compile without any errors.\n\
                          - If you are unable to fix the issue provide output as <fix>FAILED</fix>.\n\
                          \n\
                          Sample Output:\n\
                          <fix>\n\
                          FULL code goes here\n\
                          </fix>"

    // Set other API parameters
    const model = 'gpt-4-1106-preview';
    const temperature = 0;
    const maxTokens = 4096;
    //const n = 1;

    // Make a request to the OpenAI Chat Completions API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: `INPUT: ${fileContents}\nISSUE: ${issue}`
        }
      ],
      temperature: temperature,
      presence_penalty: -2.0,
      max_tokens: maxTokens,
      // n: n
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    // Extract the assistant's reply from the API response
    var assistantReply = response.data.choices[0].message.content;
    console.log(assistantReply);


    const promptCheckFullCode = `Given the following assistant's reply, does it include the full code needed for the fix and not a half baked java class? Reply with YES or NO.\n\nAssistant's Reply: "${assistantReply}"`;
    const responseCheck = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: `${promptCheckFullCode}`
        }
      ],
      temperature: temperature,
      //max_tokens: maxTokens,
      // n: n
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const fullCodeIncluded = responseCheck.data.choices[0].message.content;
    console.log(`Full code check: ${fullCodeIncluded}`);

    if (fullCodeIncluded === "NO") {
      const promptRequestFullCode = `The assistant's reply did not include the full code needed for the fix. Please provide the full code with fix.`;
      const responseCheckAgain = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          {
            role: 'user',
            content: `${promptRequestFullCode} \n INPUT: ${fileContents}\nISSUE: ${issue}`
          }
        ],
        temperature: temperature,
        presence_penalty: -2.0,
        //max_tokens: maxTokens,
        // n: n
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });


      assistantReply = responseCheckAgain.data.choices[0].message.content;
      console.log(`Full code: ${assistantReply}`);

    }

    // Check if the <fix> tag contains the string "FAILED"
    if (assistantReply.includes('<fix>FAILED</fix>')) {
      console.log('Failed to fix the issue.');
    } else {
      // Extract the code between the <fix> tags
      const fixedCode = assistantReply.match(/<fix>([\s\S]*?)<\/fix>/i)[1];

      // Generate the output file path
      const outputFilePath = `${path.dirname(filePath)}/${path.basename(filePath, path.extname(filePath))}_fix${path.extname(filePath)}`;

      // Write the fixed code to the output file
      await fs.promises.writeFile(outputFilePath, fixedCode, 'utf-8');

      console.log(`Fixed code written to: ${outputFilePath}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example usage
//processFile('/Users/dhirajnair/Documents/Projects/code/sv/EliteCSM/Applications/netvertex/src/com/elitecore/netvertex/core/groovy/servicehandler/ServiceHandlerGroovyScript.java', 'Repeated logging pattern in several methods');

processFile('/Users/dhirajnair/Documents/Projects/code/sv/EliteCSM/Applications/netvertex/src/com/elitecore/netvertex/pm/rnc/ratecard/RateCardVersion.java', 'Multiple import statements with similar base paths');


//processFile('/Users/dhirajnair/Documents/Projects/code/sv/EliteCSM/Applications/netvertex/src/com/elitecore/netvertex/EliteNetVertexServer.java', 'Static single-threaded startup can hinder scalability if it becomes complex and time-consuming');

