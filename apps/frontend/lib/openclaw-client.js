/**
 * OpenClaw Gateway WebSocket Client (server-side only)
 *
 * Connects to the OpenClaw gateway via WebSocket, handles the
 * connect.challenge -> connect -> hello-ok handshake, and exposes
 * methods for chat, sessions, and history.
 *
 * Falls back to mock mode when OPENCLAW_GATEWAY_URL is not set.
 */

const WebSocket = require('ws');
const crypto = require('crypto');

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const MOCK_MODE = !GATEWAY_URL;

// Device identity for gateway auth
const DEVICE_PRIVATE_KEY = Buffer.from('QI9Y/9fHIkRKq/QMCCVwjE473adbYAvdgnzv1RvqFVM=', 'base64');
const DEVICE_PUBLIC_KEY = '7l2rKev5BWUaj8N5QnePS4kPZPN2fZEYoThevQT529o=';
const DEVICE_ID = 'a683ed7d0950860eb50d29499fdf050bcf686f3bcfde8555752fadeaa8d3427f';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
function nextId(prefix = 'req') {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

// ---------------------------------------------------------------------------
// Singleton connection manager
// ---------------------------------------------------------------------------

let _ws = null;
let _connected = false;
let _connecting = null; // promise while connecting
let _pendingRequests = new Map(); // id -> {resolve, reject, timer}
let _eventListeners = new Map(); // eventName -> Set<callback>
let _reconnectTimer = null;

function _cleanup() {
  _connected = false;
  _connecting = null;
  // Reject all pending requests
  for (const [id, entry] of _pendingRequests) {
    clearTimeout(entry.timer);
    entry.reject(new Error('WebSocket connection lost'));
  }
  _pendingRequests.clear();
}

function _scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    console.log('[openclaw] Attempting reconnect...');
    getConnection().catch(err => {
      console.error('[openclaw] Reconnect failed:', err.message);
    });
  }, 3000);
}

/**
 * Get (or create) the singleton WebSocket connection.
 * Returns a promise that resolves when the handshake is complete.
 */
function getConnection() {
  if (_connected && _ws && _ws.readyState === WebSocket.OPEN) {
    return Promise.resolve(_ws);
  }
  if (_connecting) return _connecting;

  _connecting = new Promise((resolve, reject) => {
    console.log(`[openclaw] Connecting to ${GATEWAY_URL} ...`);
    const ws = new WebSocket(GATEWAY_URL);
    let handshakeTimeout = setTimeout(() => {
      ws.close();
      reject(new Error('Handshake timeout'));
    }, 15000);

    ws.on('open', () => {
      console.log('[openclaw] WebSocket open, waiting for connect.challenge...');
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // --- Event handling ---
      if (msg.type === 'event') {
        // During handshake: wait for connect.challenge
        if (msg.event === 'connect.challenge' && !_connected) {
          console.log('[openclaw] Got connect.challenge, signing and connecting...');
          const nonce = msg.payload.nonce;
          const signedAt = Date.now();

          // Sign the challenge: v2 payload = v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce
          const scopes = 'operator.read,operator.write,operator.admin';
          const signPayload = `v2|${DEVICE_ID}|gateway-client|backend|operator|${scopes}|${signedAt}|${GATEWAY_TOKEN}|${nonce}`;
          const privateKeyObj = crypto.createPrivateKey({
            key: Buffer.concat([
              // Ed25519 PKCS8 prefix (16 bytes) + 32-byte raw key
              Buffer.from('302e020100300506032b657004220420', 'hex'),
              DEVICE_PRIVATE_KEY,
            ]),
            format: 'der',
            type: 'pkcs8',
          });
          const signature = crypto.sign(null, Buffer.from(signPayload), privateKeyObj).toString('base64');

          const connectReq = {
            type: 'req',
            id: 'connect-1',
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'gateway-client',
                version: '1.0.0',
                platform: 'linux',
                mode: 'backend',
              },
              role: 'operator',
              scopes: ['operator.read', 'operator.write', 'operator.admin'],
              auth: { token: GATEWAY_TOKEN },
              device: {
                id: DEVICE_ID,
                publicKey: DEVICE_PUBLIC_KEY,
                signature: signature,
                signedAt: signedAt,
                nonce: nonce,
              },
            },
          };
          ws.send(JSON.stringify(connectReq));
          return;
        }

        // Log all events for debugging
        console.log('[openclaw] Event:', msg.event, msg.payload?.state || '', msg.payload?.sessionKey ? '(session)' : '');

        // Dispatch to event listeners
        const listeners = _eventListeners.get(msg.event);
        if (listeners) {
          for (const cb of listeners) {
            try { cb(msg.payload, msg); } catch (e) {
              console.error('[openclaw] Event listener error:', e);
            }
          }
        }
        // Also dispatch to wildcard listeners
        const wildcard = _eventListeners.get('*');
        if (wildcard) {
          for (const cb of wildcard) {
            try { cb(msg.payload, msg); } catch (e) {
              console.error('[openclaw] Wildcard listener error:', e);
            }
          }
        }
        return;
      }

      // --- Response handling ---
      if (msg.type === 'res') {
        // Handshake response
        if (msg.id === 'connect-1') {
          clearTimeout(handshakeTimeout);
          if (msg.ok) {
            console.log('[openclaw] Connected! hello-ok received.');
            _ws = ws;
            _connected = true;
            _connecting = null;
            resolve(ws);
          } else {
            const errMsg = msg.error?.message || 'Connect rejected';
            console.error('[openclaw] Connect rejected:', errMsg);
            ws.close();
            _connecting = null;
            reject(new Error(errMsg));
          }
          return;
        }

        // Normal request-response
        console.log('[openclaw] Response:', msg.id, msg.ok ? 'OK' : 'FAIL', msg.error?.message || '');
        const pending = _pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          _pendingRequests.delete(msg.id);
          if (msg.ok) {
            pending.resolve(msg.payload);
          } else {
            pending.reject(new Error(msg.error?.message || 'Request failed'));
          }
        }
      }
    });

    ws.on('close', () => {
      console.log('[openclaw] WebSocket closed.');
      _cleanup();
      _scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('[openclaw] WebSocket error:', err.message);
      clearTimeout(handshakeTimeout);
      _cleanup();
      _connecting = null;
      reject(err);
      _scheduleReconnect();
    });
  });

  return _connecting;
}

/**
 * Send a request to the gateway and wait for the response.
 */
async function sendRequest(method, params, timeoutMs = 30000) {
  const ws = await getConnection();
  const id = nextId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pendingRequests.delete(id);
      reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    _pendingRequests.set(id, { resolve, reject, timer });

    ws.send(JSON.stringify({
      type: 'req',
      id,
      method,
      params,
    }));
  });
}

/**
 * Subscribe to gateway events. Returns an unsubscribe function.
 */
function onEvent(eventName, callback) {
  if (!_eventListeners.has(eventName)) {
    _eventListeners.set(eventName, new Set());
  }
  _eventListeners.get(eventName).add(callback);
  return () => {
    const set = _eventListeners.get(eventName);
    if (set) {
      set.delete(callback);
      if (set.size === 0) _eventListeners.delete(eventName);
    }
  };
}

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

const mockResponses = {
  async sendMessage(_sessionKey, message) {
    // Simulate streaming by returning a single final chunk
    return {
      runId: `mock-run-${Date.now()}`,
      state: 'final',
      message: `[Mock] I received your message: "${message}". The OpenClaw gateway is not configured. Set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN environment variables to connect to a real gateway.`,
    };
  },
  async getHistory(_sessionKey) {
    return { messages: [] };
  },
  async listSessions() {
    return { sessions: [] };
  },
  async resetSession(sessionKey) {
    return { sessionKey, status: 'reset' };
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a chat message and stream responses via callback.
 * callback(event) is called for each chat event (delta, final, error, aborted).
 * Returns a promise that resolves when the stream ends (final/error/aborted).
 */
async function sendMessageStream(sessionKey, message, callback) {
  if (MOCK_MODE) {
    const mock = await mockResponses.sendMessage(sessionKey, message);
    // Simulate delta then final
    callback({ ...mock, state: 'delta', message: mock.message });
    callback({ ...mock, state: 'final', message: mock.message });
    return mock;
  }

  await getConnection();

  const idempotencyKey = nextId('idem');

  return new Promise((resolve, reject) => {
    let result = null;
    let timeout = setTimeout(() => {
      unsub();
      reject(new Error('Chat response timed out after 120s'));
    }, 120000);

    const unsub = onEvent('chat.event', (payload) => {
      // Only handle events for our session
      if (payload.sessionKey !== sessionKey) return;

      callback(payload);

      if (payload.state === 'final' || payload.state === 'error' || payload.state === 'aborted') {
        clearTimeout(timeout);
        unsub();
        if (payload.state === 'error') {
          reject(new Error(payload.errorMessage || 'Chat error'));
        } else {
          resolve(payload);
        }
      }
    });

    // Send the chat.send request (fire-and-forget; responses come as events)
    sendRequest('chat.send', {
      sessionKey,
      message,
      idempotencyKey,
    }).catch((err) => {
      clearTimeout(timeout);
      unsub();
      reject(err);
    });
  });
}

/**
 * Send a chat message and collect all chunks into a single response.
 */
async function sendMessage(sessionKey, message) {
  if (MOCK_MODE) {
    return mockResponses.sendMessage(sessionKey, message);
  }

  const chunks = [];
  await sendMessageStream(sessionKey, message, (event) => {
    chunks.push(event);
  });

  // Combine deltas into final text
  const finalEvent = chunks.find(c => c.state === 'final');
  const deltaText = chunks
    .filter(c => c.state === 'delta' && c.message)
    .map(c => c.message)
    .join('');

  return {
    runId: finalEvent?.runId || chunks[0]?.runId,
    state: 'final',
    message: finalEvent?.message || deltaText,
  };
}

/**
 * Get chat history for a session.
 */
async function getHistory(sessionKey, limit = 50) {
  if (MOCK_MODE) return mockResponses.getHistory(sessionKey);
  return sendRequest('chat.history', { sessionKey, limit });
}

/**
 * List all sessions.
 */
async function listSessions(limit = 50) {
  if (MOCK_MODE) return mockResponses.listSessions();
  return sendRequest('sessions.list', {
    limit,
    includeDerivedTitles: true,
    includeLastMessage: true,
  });
}

/**
 * Reset (or create) a session.
 */
async function resetSession(sessionKey, reason = 'new') {
  if (MOCK_MODE) return mockResponses.resetSession(sessionKey);
  return sendRequest('sessions.reset', { key: sessionKey, reason });
}

/**
 * Build the session key for a given user.
 * @param {string} userId
 * @param {string} [agentId] — OpenClaw agent ID (e.g. "user-abc123"). Defaults to "main".
 */
function sessionKeyForUser(userId, agentId) {
  const agent = agentId || 'main';
  return `agent:${agent}:web:${userId}`;
}

/**
 * Check if we are in mock mode (no gateway configured).
 */
function isMockMode() {
  return MOCK_MODE;
}

/**
 * Ensure connection is established (call on server startup if desired).
 */
async function ensureConnected() {
  if (MOCK_MODE) return;
  return getConnection();
}

module.exports = {
  sendMessageStream,
  sendMessage,
  getHistory,
  listSessions,
  resetSession,
  sessionKeyForUser,
  isMockMode,
  ensureConnected,
  onEvent,
};
