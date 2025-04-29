const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Replace with your own Gemini API keys
const GEMINI_API_KEYS = [
    "AIzaSyDq3xTOmwh82bQKtz-JqAw6fIpk8Vazt4A",
    "AIzaSyDb6ofnM9Z6YIx-7Bg1iiVPCQsnKjZDfmw",
    "AIzaSyAfXQA2hFsg2QJA80PWFXRDYo_tvt_odn8",
    "AIzaSyBSg9Ox6s0LHLFpzaCc45oLSWsCOwJ1gts",
    "AIzaSyBSOfMJYOi6Y_LFPPz1LTWpfORbrgMVwPo",
    "AIzaSyAN5iLJ8mVqCbSjMd6704cE4AvzsKfnI-o",
    "AIzaSyD7lng5FQ7z6dKVq9mKDXDRvbNPhHF2J9g",
    "AIzaSyB51tA6CXpE4ue1IbKKaninE2WezxjHPPQ"
];

let apiKeyIndex = 0;

const getNextApiKey = () => {
    const key = GEMINI_API_KEYS[apiKeyIndex];
    apiKeyIndex = (apiKeyIndex + 1) % GEMINI_API_KEYS.length;
    return key;
};

router.post("/story-generator", async (req, res) => {
    try {

        const aiPrompt = getPromptForModel(req.body);
        const genAI = new GoogleGenerativeAI(getNextApiKey());

        // Use Gemini 2.0 Flash (experimental)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Generate story content
        const result = await model.generateContent(aiPrompt);
        const response = await result.response;
        const story = response.text();

        // Placeholder for image generation (will be implemented separately)
        const imageGenerationStatus = "Image generation is pending or handled in separate call.";

        res.status(200).json({
            story: story,
            coverImage: imageGenerationStatus,
        });
    } catch (error) {
        console.error("Error generating story:", error);
        res.status(500).send("Error generating story");
    }
});

const getPromptForModel = (data) => {
    return `
Story generation
Generate a story of 36 sentences, each separated by % and the details about the story are given as follows:
Child Name is ${data?.child} and Child age is ${data?.age} years.
Physical characteristics of child include ${data?.physicalCharacteristics} and child has a special role of ${data?.specialRole}.
The main theme of the story is ${data?.mainTheme} and the location to focus is ${data?.location}.
The objective of the story is ${data?.objectives}.
The secondary character of the story is ${data?.secondaryCharacters}.
The antagonist is ${data?.antagonist}.
The tone of the story should be ${data?.tone} and the ending must be ${data?.ending}.
Other details about the story are ${data?.otherInfo}.

Images generation
Generate an Image for complete story line also to image all line with images.
Where the primary character Image is ${data?.characterImage}.
Keep in view that the first image is the primary character and the image must be in square dimensions.

Cover image generation
Generate cover photo of the story book with the story, keeping in view that the first image is the primary character and the image must be in square dimensions.
`;
};

module.exports = router;
