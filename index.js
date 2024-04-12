const { GoogleGenerativeAI } = require('@google/generative-ai')
const sqlite3 = require('sqlite3').verbose(); // Initialize sqlite3
require('dotenv').config()

new GoogleGenerativeAI(process.env.API_KEY)

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

// Connect to SQLite Database
const db = new sqlite3.Database('./arguments.db', (err) => {
    if (err) {
        console.error(err.message)
    }
    console.log('Connected to the arguments database.');
})

// input
db.run(`CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY,
            prompt_text TEXT
        )`)
db.run(`CREATE TABLE IF NOT EXISTS schemes (
            id INTEGER PRIMARY KEY,
            scheme TEXT,
            description TEXT,
            example TEXT
        )`)

// output
db.run(`CREATE TABLE IF NOT EXISTS arguments (
            id INTEGER PRIMARY KEY,
            prompt_id INTEGER,
            argument_text TEXT,
            FOREIGN KEY (prompt_id) REFERENCES prompts(id)
        )`)

async function run() {
    const model = genAI.getGenerativeModel({model: "gemini-pro"})

    const choice = await getUserChoice('Do you want to provide a prompt (p) or a scheme (s)?')

    let selectedPrompt = null;
    let selectedScheme = null;

    if (choice === 'p' || choice === 'b') {
        selectedPrompt = await selectPrompt();
    }

    if (choice === 's' || choice === 'b') {
        selectedScheme = await selectScheme();
    }

    // Ensure at least a prompt or scheme has been provided
    if (!selectedPrompt && !selectedScheme) {
        console.log("You must provide either a prompt or a scheme.");
        return;  // End execution
    }

    const modifiedPrompt = incorporateScheme(selectedPrompt, selectedScheme)

    model.generateContent(modifiedPrompt)
        .then(result => {
            // ... handle response and store the argument
        })
        .catch(console.error)
}

async function selectPrompt() {
    const choice = await getUserChoice('Select a prompt (pdb) or input a new prompt (pin)?');
    if (choice === 'pdb') {
        return await fetchAndGeneratePromptFromDatabase();
    } else if (choice === 'pin') {
        return await generatePromptFromManualInput();
    } // Handle invalid choice
}

async function selectScheme() {
    const choice = await getUserChoice('Select a scheme (sdb) or input a new scheme (sin)?');
    if (choice === 'sdb') {
        return await fetchAndGenerateSchemeFromDatabase();
    } else if (choice === 'sin') {
        return await generateSchemeFromManualInput();
    } // Handle invalid choice
}

async function getUserChoice(promptStr) {
    return new Promise((resolve) => {
        readline.question(promptStr, (choice) => {
            resolve(choice.toLowerCase());
        })
    })
}

function incorporateScheme(prompt, scheme) {
    if (scheme === "Appeal to Expert Opinion") {
        return `Using the scheme 'Appeal to Expert Opinion', argue: ${prompt}`
    } else {
        // Handle other schemes or return the prompt unchanged
        return prompt
    }
}

async function fetchAndGenerateSchemeFromDatabase() {
    db.all("SELECT * FROM schemes", [], (err, rows) => {
        if (err) {
            console.error(err.message)
        } else {
            console.log("Available schemes:")
            rows.forEach(row => console.log(`${row.id}: ${row.scheme}`))

            readline.question("Enter the ID of the scheme you want to use: ", (schemeId) => {
                const selectedScheme = rows.find(row => row.id === parseInt(schemeId))
                if (selectedScheme) {
                    // Here you can either return the selectedScheme for further use
                    // Or directly trigger the argument generation if that's how you want to use it
                    console.log(`You have selected scheme: ${selectedScheme.scheme}`)
                } else {
                    console.log("Invalid scheme ID.")
                }
            })
        }
    })
}

async function generateSchemeFromManualInput() {
    readline.question('Enter your new scheme: ', (scheme) => {
        db.run("INSERT INTO schemes (scheme) VALUES (?)", [scheme], (err) => {
            if (err) {
                console.error(err.message)
            } else {
                console.log("Scheme added to database.")
            }
        })
    })
}

async function fetchAndGeneratePromptFromDatabase() {
    db.all("SELECT * FROM prompts", [], (err, rows) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("Available prompts:");
            rows.forEach(row => console.log(`${row.id}: ${row.prompt_text}`))

            readline.question('Enter the ID of the prompt you want to use: ', (promptId) => {
                const selectedPrompt = rows.find(row => row.id === parseInt(promptId))

                if (selectedPrompt) {
                    // ... use selectedPrompt to call Gemini and generate arguments
                } else {
                    console.log("Invalid prompt ID.");
                }
            })
        }
    })
}

async function generatePromptFromManualInput() {
    readline.question('Enter your prompt: ', (prompt) => {
        db.run("INSERT INTO prompts (prompt_text) VALUES (?)", [prompt], (err) => {
            if (err) {
                console.error(err.message)
            } else {
                console.log("Prompt added to database.")
                // Proceed with argument generation using the prompt
                const model = genAI.getGenerativeModel({ model: "gemini-pro" })
                model.generateContent(prompt)
                    .then(result => {
                        // ... handle response and store the argument
                    })
                    .catch(console.error)
            }
        })
    })
}

/*

async function run2() {
    const model = genAI.getGenerativeModel({model: "gemini-pro"})

    const prompt = "Generate an argument from expert opinion about the dangers of smoking."
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log(text)
}

 */

run()
