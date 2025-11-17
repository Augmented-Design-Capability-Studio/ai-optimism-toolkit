#!/usr/bin/env node

// Test script to verify Google Gemini API key
// Usage: node test-api-key.mjs YOUR_API_KEY

const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node test-api-key.mjs YOUR_API_KEY');
  process.exit(1);
}

console.log('Testing Google Gemini API key...');
console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const body = {
  contents: [{
    parts: [{
      text: 'Say hello in one word'
    }]
  }]
};

try {
  const response = await fetch(`${url}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  const data = await response.json();
  
  if (response.ok) {
    console.log('\n✅ API key is VALID!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('\n❌ API key is INVALID or there was an error');
    console.log('Error:', JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('\n❌ Network error:', error.message);
}
