const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/generate-questions', async (req, res) => {
    const { inputText } = req.body;

    if (!inputText) {
        return res.status(400).send({ error: 'Input text is required' });
    }

    const systemPrompt = "Act as an examiner. Given the material, generate 5 open-ended questions and 10 questions with A, B, C, D options. There should always be only one correct solution to the question, and the correct answer shall not always be the same lettered option.";
    const clientPrompt = `Text: ${inputText}\n\nGenerate the 15 questions based on the above text:`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: clientPrompt }
    ];

    // Helper function to estimate token count
    function estimateTokenCount(text) {
        // Simple approximation: tokens are roughly the number of words
        return text.split(/\s+/).length;
    }

    const maxTokensPerRequest = 4096 - 150; // Adjust for system prompt, completion, and some buffer

    // Split the input text if it exceeds the max token limit
    function splitText(text, maxLength) {
        const chunks = [];
        let currentChunk = '';
        for (const word of text.split(' ')) {
            if ((currentChunk + ' ' + word).length > maxLength) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += ' ' + word;
        }
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }

    const inputTextChunks = splitText(inputText, maxTokensPerRequest);

    try {
        let questions = [];
        for (const chunk of inputTextChunks) {
            const clientPromptChunk = `Text: ${chunk}\n\nGenerate the 15 questions based on the above text:`;
            const messagesChunk = [
                { role: "system", content: systemPrompt },
                { role: "user", content: clientPromptChunk }
            ];

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-3.5-turbo",
                    messages: messagesChunk,
                    max_tokens: 1000,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                    },
                }
            );

            console.log(response);
            const generatedText = response.data.choices[0].message.content.trim();
            questions = questions.concat(generatedText.split('\n'));
        }
        res.send({ questions });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error generating questions' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
