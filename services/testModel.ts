
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY_11;
        if (!apiKey) {
            console.log("No GEMINI_API_KEY_11 found in .env");
            return;
        }
        const genAI = new GoogleGenAI({ apiKey });
        // The SDK has a way to list models, but we can also just try some common names.
        // For @google/genai, it's usually via models.listModels() ? No, that's not in the SDK directly often.
        // It's in the underlying API.
        console.log("Checking model IDs...");
        
        // Let's try to just generate a placeholder with veo-3.1-generate-preview
        const model = genAI.models.get({ model: "veo-3.1-generate-preview" });
        console.log("Model veo-3.1-generate-preview found");
    } catch (e: any) {
        console.log("Model veo-3.1-generate-preview NOT found:", e.message);
    }
}

listModels();
