/**
 * POST /api/voice-llm — OpenAI-compatible endpoint for ElevenLabs custom LLM
 *
 * ElevenLabs sends stream:true and expects SSE streaming back.
 * We call OpenClaw (non-streaming), then emit the response as SSE chunks.
 *
 * Request: { messages, model, stream, tools?, elevenlabs_extra_body? }
 * Response: SSE stream of chat.completion.chunk events
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

  const { messages, stream } = req.body || {};
  const httpUrl = gatewayHttpUrl();

  // Add system prompt for voice context
  const enhancedMessages = [...(messages || [])];
  const hasSystem = enhancedMessages.some(m => m.role === 'system');
  if (!hasSystem) {
    enhancedMessages.unshift({
      role: 'system',
      content: 'You are the EasyOpenClaw AI agent, powered by OpenClaw. Keep voice responses to 2-3 sentences since this is spoken aloud. Be helpful, professional, and concise. Use Australian English.',
    });
  }

  // Get response from OpenClaw
  let content = '';
  try {
    if (!httpUrl) {
      content = 'EasyOpenClaw gateway is not configured. This is a mock response.';
    } else {
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

      if (gatewayResp.ok) {
        const data = await gatewayResp.json();
        content = data.choices?.[0]?.message?.content || 'I had trouble processing that.';
      } else {
        console.error('[voice-llm] Gateway error:', gatewayResp.status);
        content = 'I had trouble processing that. Could you try again?';
      }
    }
  } catch (err) {
    console.error('[voice-llm] Error:', err.message);
    content = 'Sorry, I encountered an error. Please try again.';
  }

  // If ElevenLabs wants streaming (they always do), return SSE
  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const id = `chatcmpl_${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    // Split content into small chunks for natural speech pacing
    const words = content.split(' ');
    const chunkSize = 3;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
      res.write(`data: ${JSON.stringify({
        id,
        object: 'chat.completion.chunk',
        created,
        model: 'easyopenclaw',
        choices: [{
          delta: { content: chunk },
          index: 0,
          finish_reason: null,
        }],
      })}\n\n`);
    }

    // Final chunk with finish_reason
    res.write(`data: ${JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model: 'easyopenclaw',
      choices: [{
        delta: {},
        index: 0,
        finish_reason: 'stop',
      }],
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Non-streaming fallback
  return res.json({
    id: `chatcmpl_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'easyopenclaw',
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};
