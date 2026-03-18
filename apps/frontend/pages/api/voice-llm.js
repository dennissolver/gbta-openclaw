/**
 * POST /api/voice-llm — OpenAI-compatible endpoint for ElevenLabs custom LLM
 *
 * ElevenLabs sends the conversation as OpenAI-format messages.
 * We forward to OpenClaw's /v1/chat/completions and return the response.
 * This bridges ElevenLabs voice I/O with OpenClaw AI processing.
 *
 * ElevenLabs expects standard OpenAI Chat Completions format:
 * Request: { model, messages: [{role, content}], stream? }
 * Response: { choices: [{message: {role, content}}] }
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

function gatewayHttpUrl() {
  if (!GATEWAY_URL) return null;
  return GATEWAY_URL.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const httpUrl = gatewayHttpUrl();
  if (!httpUrl) {
    // Mock mode
    return res.json({
      id: `chatcmpl_mock_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'easyopenclaw',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'EasyOpenClaw gateway is not configured. This is a mock response.' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  }

  const { messages, model, stream } = req.body || {};

  // Add system context if not already present
  const enhancedMessages = [...(messages || [])];
  const hasSystem = enhancedMessages.some(m => m.role === 'system');
  if (!hasSystem) {
    enhancedMessages.unshift({
      role: 'system',
      content: 'You are the EasyOpenClaw AI agent, powered by OpenClaw. Be concise in voice responses — keep answers to 2-3 sentences max since this is a voice conversation. Be helpful, professional, and proactive.',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const gatewayResp = await fetch(`${httpUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: enhancedMessages,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!gatewayResp.ok) {
      const errText = await gatewayResp.text();
      console.error('[voice-llm] Gateway error:', gatewayResp.status, errText);
      return res.status(502).json({
        id: `chatcmpl_err_${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'easyopenclaw',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'I had trouble processing that. Could you try again?' },
          finish_reason: 'stop',
        }],
      });
    }

    const data = await gatewayResp.json();
    // Pass through the OpenAI-format response directly
    return res.json(data);
  } catch (err) {
    console.error('[voice-llm] Error:', err.message);
    return res.status(500).json({
      id: `chatcmpl_err_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'easyopenclaw',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
        finish_reason: 'stop',
      }],
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};
