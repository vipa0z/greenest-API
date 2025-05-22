const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const Scan = require('../models/scan');
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

const validateApiKey = (apiKey) => {
    if (!apiKey) {
        throw new Error("Gemini API key not found. Please set the GEMINI_API_KEY environment variable.");
    }
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error("Invalid Gemini API key format. Please check your environment configuration.");
    }
};

exports.getRemediation = async (userId, scanId) => {
    let scan = await Scan.findOne({ user: userId, _id: scanId });
    if (!scan) {
        throw new Error("Scan not found");
    }
    const {disease, plantName, plantHealth} = scan
    console.log(" [+] Starting disease remediation request for:", disease);
    console.log(" [+] Selected plant health:", plantHealth);
    console.log(" [+] Selected plant disease:", disease);

    
    const prompt = `# GreenyLeaves Plant Health Assistant

    You are the official plant leaf health advisor for GreenyLeaves. Your purpose is to provide expert advice on plant leaf growing care and disease remediation in a clear, structured format.
    
    ## PLANT INFORMATION
    Plant: ${plantName}
    Current Health Status: ${plantHealth}
    Disease (if applicable): ${disease}
    
    ## RESPONSE REQUIREMENTS
    1. Begin with a brief 2-line description of ${plantName}'s leaves and its distinctive characteristics.
    2. Based on the health status (${plantHealth}):
       - If HEALTHY: Provide optimal care instructions including watering frequency, sunlight needs, soil preferences, and seasonal considerations.
       - If UNHEALTHY: Deliver a comprehensive analysis of "${disease}" covering:
         * Symptoms and visual indicators
         * Common causes and contributing factors
         * Step-by-step treatment protocol
         * Prevention strategies to avoid recurrence
    3. Format your response using markdown for readability.
    4. Keep your entire response under 120 lines.
    5. Use bullet points and headers to organize information logically.
    6. Focus on practical, actionable advice rather than technical botanical terminology.
    
    Remember to maintain a professional, authoritative tone throughout your response.`;
    // Access and validate API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        console.log(" [+] Validating API key...");
        validateApiKey(apiKey);
        console.log(" [+] API key validation successful");

        const genAI = new GoogleGenerativeAI(apiKey);
        console.log(genAI)

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
                console.log(" [+] Initializing Gemini model....");
        
        console.log(" [+] Sending request to Gemini API...");
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out after 30 seconds')), REQUEST_TIMEOUT);
        });
        
        const apiPromise = model.generateContent(prompt);
        const result = await Promise.race([apiPromise, timeoutPromise])
            .catch(error => {
                if (error.message.includes('timed out')) {
                    throw new Error('The request to Gemini API timed out. Please try again.');
                }
                throw error;
            });
            
        console.log(" [+] Received response from Gemini API");
        
        const response = result.response;
        const information = response.text();
        console.log(" [+] Successfully processed response data");
        // save to scans
        scan.remediations = information;
        await scan.save();
        return information;
    } catch (error) {
        console.error(" [-] Gemini API Error:", {
            message: error.message,
            stack: error.stack,
            details: error
        });
        throw new Error(`Failed to get disease information: ${error.message}`);
    }
 }
