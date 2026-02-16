
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApi() {
  const productId = '43dabf84-d7db-4bf6-ac94-fc025de559be';
  const url = `http://localhost:5000/api/step11-products/${productId}`;
  
  console.log(`Testing API: ${url}`);
  
  try {
    const response = await axios.get(url, {
      validateStatus: false
    });
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    };
    
    fs.writeFileSync(path.join(__dirname, '..', 'api_test_res.json'), JSON.stringify(result, null, 2));
    console.log("API test result written to api_test_res.json");
    
  } catch (err) {
    console.error("API test failed:", err.message);
    fs.writeFileSync(path.join(__dirname, '..', 'api_test_res.json'), JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
  }
}

testApi();
