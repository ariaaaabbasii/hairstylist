// netlify/functions/openai-api.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // API routes for OpenAI interaction
  const API_ROUTES = {
    CREATE_THREAD: '/api/openai-api/create-thread',
    ADD_MESSAGE: '/api/openai-api/add-message',
    CREATE_RUN: '/api/openai-api/create-run',
    CHECK_RUN_STATUS: '/api/openai-api/check-run-status',
    GET_MESSAGES: '/api/openai-api/get-messages'
  };
  
  const API_KEY = process.env.OPENAI_API_KEY;
  const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
  
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI API key is not configured" })
    };
  }
  
  if (!ASSISTANT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI Assistant ID is not configured" })
    };
  }
  
  const path = event.path;
  const httpMethod = event.httpMethod;
  
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Create new thread endpoint
    if (path.includes(API_ROUTES.CREATE_THREAD) && httpMethod === 'POST') {
      const response = await axios.post('https://api.openai.com/v1/threads', {}, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // Add message to thread endpoint
    if (path.includes(API_ROUTES.ADD_MESSAGE) && httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body);
      const { threadId, content } = requestBody;
      
      if (!threadId || !content) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Thread ID and content are required" })
        };
      }
      
      const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        role: 'user',
        content: content
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // Create run endpoint
    if (path.includes(API_ROUTES.CREATE_RUN) && httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body);
      const { threadId } = requestBody;
      
      if (!threadId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Thread ID is required" })
        };
      }
      
      const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        assistant_id: ASSISTANT_ID
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // Check run status endpoint
    if (path.includes(API_ROUTES.CHECK_RUN_STATUS) && httpMethod === 'GET') {
      const queryParams = event.queryStringParameters;
      const { threadId, runId } = queryParams;
      
      if (!threadId || !runId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Thread ID and Run ID are required" })
        };
      }
      
      const response = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // Get messages endpoint
    if (path.includes(API_ROUTES.GET_MESSAGES) && httpMethod === 'GET') {
      const queryParams = event.queryStringParameters;
      const { threadId } = queryParams;
      
      if (!threadId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Thread ID is required" })
        };
      }
      
      const response = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages?limit=10`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // If no route matches
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" })
    };
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    
    return {
      statusCode: error.response ? error.response.status : 500,
      headers,
      body: JSON.stringify({
        error: error.response ? error.response.data : error.message
      })
    };
  }
};
