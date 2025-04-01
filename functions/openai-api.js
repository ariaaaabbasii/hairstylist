const axios = require('axios');

// Helper for setting consistent CORS headers
const getCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
};

// Helper for error responses
const errorResponse = (statusCode, message, headers) => {
  return {
    statusCode: statusCode,
    headers: headers || getCorsHeaders(),
    body: JSON.stringify({ error: message })
  };
};

exports.handler = async function(event, context) {
  // Set CORS headers for all responses
  const headers = getCorsHeaders();
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Get OpenAI API key from environment variable
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID || 'asst_kUIXx1BgVyEahtLafgob8u6W';
  
  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    return errorResponse(500, 'Server configuration error', headers);
  }
  
  // Set up common OpenAI API request headers
  const openaiHeaders = {
    'Authorization': `Bearer ${openaiApiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  };
  
  try {
    // Parse the path to determine which operation to perform
    const path = event.path.split('/');
    const operation = path[path.length - 1]; // Last part of the path
    
    // CREATE THREAD
    if (operation === 'create-thread') {
      if (event.httpMethod !== 'POST') {
        return errorResponse(405, 'Method Not Allowed', headers);
      }
      
      const response = await axios.post(
        'https://api.openai.com/v1/threads',
        {}, // No body required for thread creation
        { headers: openaiHeaders }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // ADD MESSAGE TO THREAD
    else if (operation === 'add-message') {
      if (event.httpMethod !== 'POST') {
        return errorResponse(405, 'Method Not Allowed', headers);
      }
      
      const requestBody = JSON.parse(event.body);
      const { threadId, content } = requestBody;
      
      if (!threadId || !content) {
        return errorResponse(400, 'threadId and content are required', headers);
      }
      
      const response = await axios.post(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        { role: 'user', content },
        { headers: openaiHeaders }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // CREATE RUN
    else if (operation === 'create-run') {
      if (event.httpMethod !== 'POST') {
        return errorResponse(405, 'Method Not Allowed', headers);
      }
      
      const requestBody = JSON.parse(event.body);
      const { threadId } = requestBody;
      
      if (!threadId) {
        return errorResponse(400, 'threadId is required', headers);
      }
      
      const response = await axios.post(
        `https://api.openai.com/v1/threads/${threadId}/runs`,
        { assistant_id: assistantId },
        { headers: openaiHeaders }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // CHECK RUN STATUS
    else if (operation === 'check-run-status') {
      if (event.httpMethod !== 'GET') {
        return errorResponse(405, 'Method Not Allowed', headers);
      }
      
      const threadId = event.queryStringParameters?.threadId;
      const runId = event.queryStringParameters?.runId;
      
      if (!threadId || !runId) {
        return errorResponse(400, 'threadId and runId are required', headers);
      }
      
      const response = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: openaiHeaders }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // GET MESSAGES
    else if (operation === 'get-messages') {
      if (event.httpMethod !== 'GET') {
        return errorResponse(405, 'Method Not Allowed', headers);
      }
      
      const threadId = event.queryStringParameters?.threadId;
      
      if (!threadId) {
        return errorResponse(400, 'threadId is required', headers);
      }
      
      const response = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        { headers: openaiHeaders }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }
    
    // UNKNOWN OPERATION
    else {
      return errorResponse(404, 'Unknown operation', headers);
    }
  } catch (error) {
    console.error(`Error in OpenAI API operation:`, error);
    
    // Extract error details
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data?.error || { message: 'Internal Server Error' };
    
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({ error: errorDetails })
    };
  }
};
