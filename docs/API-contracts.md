# OpenClaw API Contracts

## Base URL
`http://localhost:3001`

---

## POST /functions/invoke
Invoke a registered function.

**Request:**
```json
{
  "functionName": "generatePatchSkeleton",
  "inputs": {
    "urls": ["https://buy.nsw.gov.au/login"],
    "targetDir": "workspace/nsw"
  }
}
```

**Response (200):**
```json
{
  "invocationId": "inv-1",
  "status": "succeeded",
  "outputs": {
    "patch": "--- NSW_buy_nsw_refined.patch ---\n...",
    "notes": "--- NSW_buy_nsw_refined.patch.notes ---\n...",
    "qa": "# NSW_buy_nsw_refined.patch.qa.md\n..."
  }
}
```

---

## GET /functions/list
List all registered functions.

**Response (200):**
```json
{
  "functions": [
    { "name": "generatePatchSkeleton", "description": "Generate a patch skeleton from target URLs" },
    { "name": "runQA", "description": "Run QA checks on a generated patch" },
    { "name": "storeInvocationRecord", "description": "Persist an invocation record to memory" },
    { "name": "summarizeMemory", "description": "Summarize memory entries for a workspace" }
  ]
}
```

---

## GET /invocations/:id
Get a specific invocation record.

**Response (200):**
```json
{
  "id": "inv-1",
  "functionName": "generatePatchSkeleton",
  "inputs": { ... },
  "outputs": { ... },
  "status": "succeeded",
  "timestamp": "2026-03-18T10:00:00.000Z"
}
```

## GET /invocations
List all invocation records (most recent first).

**Response (200):**
```json
{
  "invocations": [ ... ]
}
```

---

## GET /health
Health check.

**Response (200):**
```json
{ "status": "ok", "service": "gbta-openclaw-backend" }
```
