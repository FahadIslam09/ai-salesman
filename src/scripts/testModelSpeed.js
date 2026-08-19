const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const key = process.env.OPENROUTER_API_KEY;

async function testModel(model) {
  const start = Date.now();
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: 'Output strict JSON: {"status":"ok"}' }],
        max_tokens: 30,
        response_format: { type: 'json_object' }
      },
      {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 10000,
      }
    );
    console.log(model, '-> SUCCESS in', Date.now() - start, 'ms:', res.data.choices[0]?.message?.content);
  } catch (err) {
    console.log(model, '-> FAIL in', Date.now() - start, 'ms:', err.response?.data?.error?.message || err.message);
  }
}

(async () => {
  await testModel('google/gemini-2.5-flash-lite');
  await testModel('deepseek/deepseek-chat');
})();
