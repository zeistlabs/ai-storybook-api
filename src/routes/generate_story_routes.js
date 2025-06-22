const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenAI, Modality } = require('@google/genai');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const StoryPDF = require('../db/stories/stories');

const IMAGE_OUTPUT_DIR = 'images';
const BASE_URL = process.env.BASE_URL;

// ✅ Replace with your own Gemini API keys
const GEMINI_API_KEYS = [
	'AIzaSyBSg9Ox6s0LHLFpzaCc45oLSWsCOwJ1gts',
	'AIzaSyB51tA6CXpE4ue1IbKKaninE2WezxjHPPQ',
	'AIzaSyBSOfMJYOi6Y_LFPPz1LTWpfORbrgMVwPo',
	'AIzaSyAN5iLJ8mVqCbSjMd6704cE4AvzsKfnI-o',
	'AIzaSyD7lng5FQ7z6dKVq9mKDXDRvbNPhHF2J9g',
	'AIzaSyDq3xTOmwh82bQKtz-JqAw6fIpk8Vazt4A',
	'AIzaSyDb6ofnM9Z6YIx-7Bg1iiVPCQsnKjZDfmw',
	'AIzaSyAfXQA2hFsg2QJA80PWFXRDYo_tvt_odn8',
	'AIzaSyB51tA6CXpE4ue1IbKKaninE2WezxjHPPQ',
	'AIzaSyBSOfMJYOi6Y_LFPPz1LTWpfORbrgMVwPo',
	'AIzaSyAN5iLJ8mVqCbSjMd6704cE4AvzsKfnI-o',
	'AIzaSyAfXQA2hFsg2QJA80PWFXRDYo_tvt_odn8'
];

let apiKeyIndex = 0;

const getNextApiKey = () => {
	const key = GEMINI_API_KEYS[apiKeyIndex];
	apiKeyIndex = (apiKeyIndex + 1) % GEMINI_API_KEYS.length;
	return key;
};

let primaryCharacterImage = '';
let generatedCoverImage = '';
let storyTitle = '';

router.post('/primary-image', upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}
		const base64Image = req.file.buffer.toString('base64');
		const mimeType = req.file.mimetype;
		console.log({ mimeType });
		primaryCharacterImage = `data:${mimeType};base64,${base64Image}`;

		res.status(200).json({
			success: 'Image Uploaded'
		});
	} catch (error) {
		console.error('Error processing image:', error);
		res.status(500).send('Error uploading and encoding image');
	}
});

router.post('/story-generator', async (req, res) => {
	try {
		const aiPrompt = getPromptForModel(req.body);
		const genAI = new GoogleGenerativeAI(getNextApiKey());
		const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

		// Step 1: Generate story
		const result = await model.generateContent(aiPrompt);
		const response = await result.response;
		const story = response.text();

		const storyLines = story
			.split('%')
			.map((line) => line.trim())
			.filter(Boolean);
		const storyChunks = [...storyLines];

		const imageMimeType = primaryCharacterImage.split(';')[0].split(':')[1];
		const imageBase64 = primaryCharacterImage.split(',')[1];

		const prim = { mime_type: imageMimeType, data: imageBase64 };

		const coverImage = JSON.stringify({
			contents: {
				parts: [
					{
						text: `Generate a Cover Image for the this story  "${storyChunks[0]}", "${storyChunks[4]}, "${storyChunks[8]}", "${storyChunks[12]}", "${storyChunks[16]}", "${storyChunks[20]}, "${storyChunks[24]}", "${storyChunks[28]}", "${storyChunks[32]}", "${storyChunks[36]}". keeping in view that first image is the primary character and image must be in square dimensions. Also give a story title based on the cover image.`
					},
					{ inline_data: prim }
				]
			},
			generationConfig: { responseModalities: ['Text', 'Image'] }
		});

		const promptx = storyChunks.map((line) =>
			JSON.stringify({
				contents: {
					parts: [
						{
							text: `Generate Image for the this line of story "${line}" keeping in view that first image is the primary character and image must be in square dimensions`
						},
						{ inline_data: prim }
					]
				},
				generationConfig: { responseModalities: ['Text', 'Image'] }
			})
		);

		// Step 3: Generate Cover Imagee from prompts and character image

		generatedCoverImage = await generateImagesFromPrompts(
			JSON.parse(coverImage),
			getNextApiKey(),
			'cvr'
		);

		// Step 4: Generate images from prompts and character image

		const storyImages = await Promise.all(
			promptx?.map(async (promt, index) => {
				const image = await generateImagesFromPrompts(
					JSON.parse(promt),
					getNextApiKey(),
					index
				);
				return image;
			})
		);

		let TitlePrompt = `Generate a Story Title for this story  "${storyChunks[0]}", "${storyChunks[4]}, "${storyChunks[8]}", "${storyChunks[12]}", "${storyChunks[16]}", "${storyChunks[20]}, "${storyChunks[24]}", "${storyChunks[28]}", "${storyChunks[32]}", "${storyChunks[36]}".`;
		const titlePrompt = await model.generateContent(TitlePrompt);
		const respone = await titlePrompt.response;
		storyTitle = respone.text();

		res.status(200).json({
			story: storyChunks,
			coverImage: generatedCoverImage,
			storyImages: storyImages,
			status: 'Success'
		});
	} catch (error) {
		console.error('Error generating story and images:', error);
		res.status(500).send(`Error generating story and images: ${error?.message}`);
	}
});

const generateImagesFromPrompts = async (prompts, apiKey, index) => {
	try {
		const response = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
			prompts,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		// const ai = new GoogleGenAI({ apiKey });

		// const response = await ai.models.generateContent({
		// 	model: 'gemini-2.0-flash-preview-image-generation',
		// 	contents: prompts,
		// 	config: {
		// 		responseModalities: [Modality.IMAGE]
		// 	}
		// });

		const base64Img = response?.data?.candidates[0]?.content?.parts[1]?.inlineData?.data;

		console.log({ base64Img: base64Img.length });

		// Convert base64 string to a buffer
		const buffer = Buffer.from(base64Img, 'base64');
		// Define the filename for the image
		const filename = `image_${index}.png`;
		// Define the output directory and complete file path
		const filepath = path.join(__dirname, '../..', IMAGE_OUTPUT_DIR, filename);
		// Ensure the directory exists
		fs.mkdirSync(path.dirname(filepath), { recursive: true });
		// Write the buffer to a file
		fs.writeFileSync(filepath, buffer);
		// Return the URL for the image
		return `${BASE_URL}/images/${filename}`;
	} catch (err) {
		console.error('Error generating image for prompt:', err.response?.data || err.message);
	}
};

const getPromptForModel = (data) => {
	return `
  Story Generation Prompt
  
  Please create a fun, imaginative, and age-appropriate children's story consisting of **36 sentences**, separated by the '%' character.
  
  Here are the key details to base the story on:
  
  - **Child's Name:** ${data?.child}
  - **Child's Age:** ${data?.age} years old
  - **Physical Characteristics:** ${data?.physicalCharacteristics}
  - **Special Role or Identity:** ${data?.specialRole}
  - **Main Theme or Adventure:** ${data?.mainTheme}
  - **Primary Setting or Location:** ${data?.location}
  - **Story Objective or Purpose:** ${data?.objectives}
  - **Secondary Character(s):** ${data?.secondaryCharacters}
  - **Antagonist or Conflict Source:** ${data?.antagonist}
  - **Desired Tone or Mood:** ${data?.tone}
  - **Ending Style:** ${data?.ending}
  - **Other Notes or Details:** ${data?.otherInfo}
  
  Make sure the story is easy to understand for children under 15, full of imagination and wonder, and includes positive messages or lessons. Keep the language simple, engaging, and adventurous.`;
};

router.post('/generate-pdf', async (req, res) => {
	const { html } = req.body;

	if (typeof html !== 'string' || html.trim().length === 0) {
		return res.status(400).send('Invalid HTML content.');
	}

	const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { margin: 0; font-family: sans-serif; }
            img { max-width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

	let browser;

	try {
		// Launch Puppeteer
		browser = await puppeteer.launch({
			headless: 'new',
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});

		const page = await browser.newPage();
		await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

		// Ensure all images are loaded
		await page.evaluateHandle('document.fonts.ready');
		await page.evaluate(() =>
			Promise.all(
				Array.from(document.images).map((img) => {
					if (img.complete) return;
					return new Promise((resolve) => {
						img.onload = img.onerror = resolve;
					});
				})
			)
		);

		// Generate PDF
		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
		});

		const pdfId = uuidv4();
		const pdfPath = path.join(__dirname, '..', 'tmp', `${pdfId}.pdf`);

		// Save to disk
		await fs.ensureDir(path.dirname(pdfPath));
		await fs.writeFile(pdfPath, pdfBuffer);

		// Save to MongoDB
		await StoryPDF.create({
			pdfId,
			filePath: pdfPath,
			createdAt: new Date()
		});

		// Respond with pdfId (to use later at checkout)
		console.log('pdfId ->', pdfId);
		res.json({ pdfId });
	} catch (err) {
		console.error('PDF generation error:', err);
		res.status(500).send('PDF generation failed.');
	} finally {
		if (browser) await browser.close();
	}
});

router.post('/send-to-lulu', async (req, res) => {
	const { pdfId, userData } = req.body;

	try {
		const luluToken = await getLuluAccessToken();

		if (!pdfId) return res.status(400).send('PDF ID is required');

		const pdf = await StoryPDF.findOne({ pdfId });
		if (!pdf) return res.status(404).json({ error: 'PDF not found' });

		// Build full public URL to the file
		const publicUrl = `${BASE_URL}/public-pdfs/${pdf.filePath.split('uploads/')[1]}`;

		const luluResponse = await submitLuluPrintJob(luluToken, publicUrl, userData);
		res.json({ success: true, luluResponse });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: `Failed to send to Lulu: ${err?.message}` });
	}
});

const getLuluAccessToken = async () => {
	const client_id = process.env.LULU_CLIENT_ID;
	const client_secret = process.env.LULU_CLIENT_SECRET;

	console.log({ client_id, client_secret });

	const auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

	try {
		console.log('Requesting Lulu access token using correct endpoint...');

		const params = new URLSearchParams();
		params.set('grant_type', 'client_credentials');

		const response = await axios.post(
			'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token',
			params,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${auth}`
				}
			}
		);

		console.log('Access token received.', response.data.access_token);
		return response.data.access_token;
	} catch (error) {
		console.error('Failed to get Lulu access token.');

		if (error.response) {
			console.error('Status:', error.response.status);
			console.error('Data:', error.response.data);
		} else {
			console.error('Error:', error.message);
		}

		throw new Error('Lulu token request failed');
	}
};

const submitLuluPrintJob = async (accessToken, publicUrl, userDetails) => {
	try {
		const response = await axios.post(
			'https://api.lulu.com/print-jobs/',
			{
				contact_email: process.env.EMAIL_USER,
				external_id: userDetails?.external_id,
				line_items: [
					{
						external_id: userDetails?.external_id,
						printable_normalization: {
							cover: {
								source_url: generatedCoverImage
							},
							interior: {
								source_url: publicUrl
							},
							pod_package_id: '0600X0900FCSTDPB060UW444MXX'
						},
						quantity: 1,
						title: storyTitle
					}
				],
				production_delay: 120,
				shipping_address: {
					city: userDetails?.city,
					country_code: userDetails?.country_code,
					name: userDetails?.name,
					phone_number: userDetails?.phone_number,
					postcode: userDetails?.postcode,
					state_code: userDetails?.postcode ?? '',
					street1: userDetails?.street1
				},
				shipping_level: 'MAIL'
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache'
				}
			}
		);

		console.log('✅ Print job submitted:', response.data);
		return response.data;
	} catch (error) {
		console.error('❌ Failed to submit print job.');

		if (error.response) {
			console.error('Status:', error.response.status);
			console.error('Data:', error.response.data);
		} else {
			console.error('Error:', error.message);
		}

		throw new Error('Print job submission failed');
	}
};

module.exports = router;
