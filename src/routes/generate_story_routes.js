const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Replace with your own Gemini API keys
const GEMINI_API_KEYS = [
    "AIzaSyBSg9Ox6s0LHLFpzaCc45oLSWsCOwJ1gts",
    "AIzaSyBSOfMJYOi6Y_LFPPz1LTWpfORbrgMVwPo",
    "AIzaSyAN5iLJ8mVqCbSjMd6704cE4AvzsKfnI-o",
    "AIzaSyD7lng5FQ7z6dKVq9mKDXDRvbNPhHF2J9g",
    "AIzaSyDq3xTOmwh82bQKtz-JqAw6fIpk8Vazt4A",
    "AIzaSyDb6ofnM9Z6YIx-7Bg1iiVPCQsnKjZDfmw",
    "AIzaSyAfXQA2hFsg2QJA80PWFXRDYo_tvt_odn8",
    "AIzaSyB51tA6CXpE4ue1IbKKaninE2WezxjHPPQ",
];

let apiKeyIndex = 0;

const getNextApiKey = () => {
    const key = GEMINI_API_KEYS[apiKeyIndex];
    apiKeyIndex = (apiKeyIndex + 1) % GEMINI_API_KEYS.length;
    return key;
};

let primaryCharacterImage = '';

router.post("/primary-image", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const base64Image = req.file.buffer.toString("base64");
        const mimeType = req.file.mimetype;
        primaryCharacterImage = `data:${mimeType};base64,${base64Image}`;

        res.status(200).json({
            success: "Image Uploaded",
        });
    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).send("Error uploading and encoding image");
    }
});

// router.post("/story-generator", async (req, res) => {
//     try {
//         const aiPrompt = getPromptForModel(req.body);
//         const genAI = new GoogleGenerativeAI(getNextApiKey());
//         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

//         const result = await model.generateContent(aiPrompt);
//         const response = await result.response;
//         const story = response.text();
        
//         const promptForImages = generatePromtForImages(story);
//         const imgresult = await model.generateContent(promptForImages);
//         const imgresponse = await imgresult.response;
//         const imgPromts = imgresponse.text(); // ai promt to use for images generation
        

//         // // Split story into 36 sentences using % as delimiter
//         // const storyLines = story.split('%').map(line => line.trim()).filter(Boolean);
//         // const storyChunks = [];

//         // for (let i = 0; i < storyLines.length; i += 3) {
//         //     storyChunks.push(storyLines.slice(i, i + 3).join(" "));
//         // }

//         // const storyImages = [];
//         // for (const chunk of storyChunks) {
//         //     const imageModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//         //     const imageResult = await imageModel.generateContent([
//         //         { text: `Generate a square Image for this scene in png: ${chunk}` },
//         //         {
//         //             inlineData: {
//         //                 mimeType: primaryCharacterImage.split(';')[0].split(':')[1],
//         //                 data: primaryCharacterImage.split(',')[1],
//         //             },
//         //         },
//         //     ]);
//         //     const imageResponse = await imageResult.response;
//         //     storyImages.push(imageResponse.text());
//         // }

//         res.status(200).json({
//             story: story,
//             coverImage: primaryCharacterImage,
//             storyImages: storyImages
//         });
//     } catch (error) {
//         console.error("Error generating story:", error);
//         res.status(500).send("Error generating story");
//     }
// });

router.post("/story-generator", async (req, res) => {
    try {
        const aiPrompt = getPromptForModel(req.body);
        const genAI = new GoogleGenerativeAI(getNextApiKey());
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Step 1: Generate story
        const result = await model.generateContent(aiPrompt);
        const response = await result.response;
        const story = response.text();

        // Step 2: Generate prompts for images
        const promptForImages = generatePromtForImages(story);
        const imgresult = await model.generateContent(promptForImages);
        const imgresponse = await imgresult.response;
        const imgPromptsText = imgresponse.text();

        // Split image prompts by newlines or some delimiter (assuming \n for now)
        const imagePrompts = imgPromptsText.split('\n').map(p => p.trim()).filter(p => p.length > 0);

        // Step 3: Generate images from prompts and character image
        const storyImages = await generateImagesFromPrompts(imagePrompts, primaryCharacterImage);

        res.status(200).json({
            story: story,
            imagePrompts: primaryCharacterImage,
            storyImages: storyImages
        });
    } catch (error) {
        console.error("Error generating story and images:", error);
        res.status(500).send("Error generating story and images");
    }
});


const generateImagesFromPrompts = async (prompts, primaryCharacterImage) => {
    const genAI = new GoogleGenerativeAI(getNextApiKey());
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const imageMimeType = primaryCharacterImage.split(';')[0].split(':')[1];
    const imageBase64 = primaryCharacterImage.split(',')[1];

    const generatedImages = [];

    for (const prompt of prompts) {
        const result = await model.generateContent([
            { text: `Generate png image for promt: ${prompt}` },
            {
                inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64
                }
            }
        ]);
        const response = await result.response;
        const image = response.text(); // Adjust this if your response contains image binary instead
        generatedImages.push(image);
    }

    return generatedImages;
};;

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

Keep in view that the first image is the primary character and the image must be in square dimensions.

Cover image generation
Generate cover photo of the story book with the story, keeping in view that the first image is the primary character and the image must be in square dimensions.
`;
};

const generatePromtForImages = (story) => {
    return `
    Generate 12 detailed image generation prompts based on the following 36-line story. Each prompt should describe one scene from the story, focusing on:
- The setting and environment of story.
- The main characters and secondary characters.
- The mood, lighting story tone.
- Any key objects or elements that should be in the scene.
- I Already have a main character image which will give to AI Image model to generate images as per my character

Here is the story below:

${story}

Please ensure that the prompts are visually descriptive and include enough detail to guide an AI image generation model. Each prompt should be concise yet vivid, around 2-3 sentences long.`
}

module.exports = router;