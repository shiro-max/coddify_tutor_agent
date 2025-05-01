import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

// --- Configuration ---
// Replace with your actual Google Cloud project ID
const projectId = 'YOUR_GOOGLE_CLOUD_PROJECT_ID';
// Specify the US region
const location = 'us-central1';
// Replace with your actual API Key if using API Key authentication
// Note: For Vertex AI, service account authentication is more common and recommended for server-side applications.
// If using a service account, ensure your environment is configured correctly (e.g., GOOGLE_APPLICATION_CREDENTIALS).
// The library will automatically pick up credentials. If you *must* use an API key,
// you might need a different library or approach, as VertexAI library primarily uses ADC (Application Default Credentials).
// For demonstration assuming ADC or environment setup:
// const apiKey = 'YOUR_GEMINI_API_KEY'; // Usually not passed directly here with VertexAI library

// --- Initialization ---
const vertexAI = new VertexAI({ project: projectId, location: location });

// Instantiate the model
const generativeModel = vertexAI.getGenerativeModel({
  // Note: As of recent updates, model names might not need the version prefix for Vertex AI.
  // Check the latest documentation if 'gemini-2.0-flash' causes issues. 'gemini-1.5-flash-001' or similar might be needed.
  // Using the requested model name for now:
  model: 'gemini-2.0-flash',
  // Safety settings and generation config can be added here if needed
  // safetySettings: [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }],
  // generationConfig: { maxOutputTokens: 256 },
});

// --- Function to call the API ---
async function callGemini(prompt: string) {
  console.log(`Sending prompt to Gemini (${location}): "${prompt}"`);

  try {
    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    console.log('Generating content...');
    const result = await generativeModel.generateContent(request);

    console.log('Received response:');
    // Using optional chaining for safety, in case response or candidates are missing
    const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (responseText) {
      console.log('--- Response Text ---');
      console.log(responseText);
      console.log('---------------------');
    } else {
      console.log('No text content received in the response.');
      console.log('Full response object:', JSON.stringify(result.response, null, 2));
    }

    return result.response;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Log the detailed error structure if available
    if (error instanceof Error && 'details' in error) {
        console.error('Error Details:', (error as any).details);
    }
    return null;
  }
}

// --- Example Usage ---
async function main() {
  // Ensure Project ID is set
  if (projectId === 'YOUR_GOOGLE_CLOUD_PROJECT_ID') {
    console.error("Please replace 'YOUR_GOOGLE_CLOUD_PROJECT_ID' in src/gemini-client.ts with your actual Google Cloud Project ID.");
    return;
  }

  // Example prompt
  const examplePrompt = "Explain the difference between a CDN and a load balancer in simple terms.";

  await callGemini(examplePrompt);
}

// Execute the main function
main().catch(console.error);