const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let token = '';
let agentId = '';

async function test() {
  try {
    console.log('1. Registering user...');
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      email: 'demo@example.com',
      password: 'Demo123!@#',
      full_name: 'Demo User'
    });
    token = registerRes.data.token;
    console.log('✓ User registered successfully');

    // Set auth header for all subsequent requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    console.log('\n2. Adding email integration...');
    const integrationRes = await axios.post(`${API_URL}/integrations/email`, {
      email: process.env.EMAIL_ADDRESS,
      password: process.env.EMAIL_PASSWORD,
      name: 'My Gmail'
    });
    console.log('✓ Email integration added');

    console.log('\n3. Creating email agent...');
    // First get the model ID for GPT-3.5
    const modelId = 'YOUR_MODEL_ID'; // You'll need to query this from the database
    
    const agentRes = await axios.post(`${API_URL}/agents`, {
      name: 'Email Assistant',
      description: 'Helps manage my emails',
      type: 'email',
      llm_model_id: modelId,
      custom_prompt: 'You are a helpful email assistant. Be concise and professional.',
      temperature: 0.7
    });
    agentId = agentRes.data.agent.id;
    console.log('✓ Agent created:', agentId);

    console.log('\n4. Testing email agent - Reading emails...');
    const readRes = await axios.post(`${API_URL}/agents/${agentId}/execute`, {
      input: 'Check my unread emails and summarize them'
    });
    console.log('✓ Response:', readRes.data.response);

    console.log('\n5. Testing email agent - Sending email...');
    const sendRes = await axios.post(`${API_URL}/agents/${agentId}/execute`, {
      input: 'Send an email to test@example.com with subject "Test from AI Agent" and say "This is a test email from my AI assistant. The integration is working perfectly!"'
    });
    console.log('✓ Response:', sendRes.data.response);

    console.log('\n6. Creating chat session...');
    const sessionRes = await axios.post(`${API_URL}/chat/sessions`, {
      title: 'Email Management Session',
      agent_id: agentId
    });
    const sessionId = sessionRes.data.session.id;
    console.log('✓ Session created:', sessionId);

    console.log('\n7. Chatting with agent...');
    const chatRes = await axios.post(`${API_URL}/chat/sessions/${sessionId}/messages`, {
      message: 'Can you search for emails from the last week and tell me if there are any important ones?',
      model_id: modelId
    });
    console.log('✓ Chat response:', chatRes.data.response);

    console.log('\n✅ All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
test();

