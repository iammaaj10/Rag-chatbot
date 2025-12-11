require('dotenv').config();

// Simple script to test your Gemini API key and find available models

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🔑 API Key found:', API_KEY.substring(0, 10) + '...');
console.log('\n📡 Testing Gemini API...\n');

async function testAPI() {
  try {
    // Step 1: List all available models
    console.log('1️⃣ Fetching available models...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.log('⚠️  No models found. This might be an API key issue.');
      return;
    }
    
    // Filter models that support generateContent
    const validModels = data.models.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log(`✅ Found ${validModels.length} models that support text generation:\n`);
    
    validModels.forEach((model, idx) => {
      const name = model.name.replace('models/', '');
      console.log(`   ${idx + 1}. ${name}`);
      console.log(`      Description: ${model.description || 'N/A'}`);
      console.log(`      Methods: ${model.supportedGenerationMethods.join(', ')}\n`);
    });
    
    // Step 2: Test the first available model
    if (validModels.length > 0) {
      const testModel = validModels[0].name.replace('models/', '');
      console.log(`\n2️⃣ Testing model: ${testModel}...\n`);
      
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({ model: testModel });
      const result = await model.generateContent("Say hello in one sentence.");
      const text = await result.response.text();
      
      console.log('✅ Model response:', text);
      console.log('\n🎉 SUCCESS! Your API key works and the model is responding.\n');
      console.log(`💡 Use this model in your server.js: "${testModel}"\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify your API key at: https://makersuite.google.com/app/apikey');
    console.log('   2. Make sure you have enabled the Gemini API');
    console.log('   3. Check if there are any billing issues');
    console.log('   4. Try generating a new API key\n');
  }
}

testAPI();