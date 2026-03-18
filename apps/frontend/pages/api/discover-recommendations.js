export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing transcript' });
  }

  try {
    // Use the existing chat API to analyze the transcript and produce recommendations.
    // We send the transcript to the OpenClaw agent with a system-level instruction.
    const analysisPrompt = `You are an automation consultant. Analyze the following discovery session transcript between a user and an AI coach. Extract automation opportunities and return a JSON array of project recommendations.

Each recommendation should have:
- name: short project name (2-4 words)
- description: one sentence describing what this project automates
- icon: a single emoji that represents the project
- instructions: system prompt for the AI agent working on this project (2-3 sentences)
- functions: array of 2-4 function name strings the agent would use

Return ONLY a valid JSON object like: {"recommendations": [...]}

Transcript:
${transcript}`;

    // Try to call the chat endpoint internally, or fall back to a simple heuristic
    const internalResp = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: analysisPrompt,
          sessionKey: 'system:discovery-analysis',
        }),
      }
    );

    if (internalResp.ok) {
      // Read SSE stream to get the response
      const text = await internalResp.text();
      // Parse SSE data lines looking for the final message
      const lines = text.split('\n');
      let finalText = '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.state === 'final' && event.message) {
            finalText = event.message;
          }
        } catch {
          // ignore parse errors
        }
      }

      if (finalText) {
        // Try to extract JSON from the response
        const jsonMatch = finalText.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        }
      }
    }

    // Fallback: generate recommendations from keyword analysis
    const recommendations = generateFallbackRecommendations(transcript);
    return res.status(200).json({ recommendations });
  } catch (err) {
    console.error('Discovery recommendations error:', err);

    // Fallback
    const recommendations = generateFallbackRecommendations(transcript);
    return res.status(200).json({ recommendations });
  }
}

function generateFallbackRecommendations(transcript) {
  const lower = transcript.toLowerCase();
  const recs = [];

  if (lower.includes('email') || lower.includes('inbox')) {
    recs.push({
      name: 'Email Management',
      description: 'Automatically process, categorize, and draft replies for your email inbox.',
      icon: '\ud83d\udce7',
      instructions:
        'You are an email management assistant. Help process, categorize, and respond to emails. Prioritize urgent items and organize by importance.',
      functions: ['processInbox', 'draftReply', 'categorizeEmails'],
    });
  }

  if (lower.includes('report') || lower.includes('summary') || lower.includes('briefing')) {
    recs.push({
      name: 'Daily Briefings',
      description: 'Generate personalized daily and weekly reports automatically.',
      icon: '\ud83d\udcca',
      instructions:
        'You are a reporting assistant. Generate daily briefings, weekly status reports, and summaries. Track KPIs and highlight important changes.',
      functions: ['dailyBriefing', 'weeklyReport', 'summarizeData'],
    });
  }

  if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('meeting')) {
    recs.push({
      name: 'Smart Scheduling',
      description: 'Manage your calendar, schedule meetings, and set up reminders.',
      icon: '\ud83d\udcc5',
      instructions:
        'You are a scheduling assistant in the AEST timezone. Help manage calendar events, schedule meetings, and set reminders. Be proactive about conflicts.',
      functions: ['scheduleTask', 'setReminder', 'checkCalendar'],
    });
  }

  if (
    lower.includes('code') ||
    lower.includes('github') ||
    lower.includes('deploy') ||
    lower.includes('dev')
  ) {
    recs.push({
      name: 'Code & DevOps',
      description: 'Review code, manage deployments, and automate development workflows.',
      icon: '\ud83d\udcbb',
      instructions:
        'You are a senior developer assistant. Help with code reviews, CI/CD pipelines, deployment monitoring, and technical problem-solving.',
      functions: ['reviewPR', 'checkDeploy', 'runTests', 'analyzeErrors'],
    });
  }

  if (
    lower.includes('slack') ||
    lower.includes('teams') ||
    lower.includes('whatsapp') ||
    lower.includes('messaging')
  ) {
    recs.push({
      name: 'Messaging Hub',
      description: 'Centralize and automate responses across your messaging platforms.',
      icon: '\ud83d\udcac',
      instructions:
        'You are a messaging automation assistant. Help manage communications across Slack, Teams, and other platforms. Summarize threads and draft responses.',
      functions: ['readMessages', 'draftResponse', 'summarizeThread'],
    });
  }

  if (
    lower.includes('client') ||
    lower.includes('customer') ||
    lower.includes('invoice')
  ) {
    recs.push({
      name: 'Business Operations',
      description: 'Manage clients, generate invoices, and streamline business workflows.',
      icon: '\ud83d\udcbc',
      instructions:
        'You are a business operations assistant for an Australian company. Help with invoicing, client management, and workflow automation. Use AUD and Australian conventions.',
      functions: ['generateInvoice', 'clientLookup', 'weeklyReport'],
    });
  }

  if (
    lower.includes('content') ||
    lower.includes('social') ||
    lower.includes('post') ||
    lower.includes('marketing')
  ) {
    recs.push({
      name: 'Content & Marketing',
      description: 'Create, schedule, and manage content across platforms.',
      icon: '\ud83d\udcdd',
      instructions:
        'You are a content marketing specialist. Help draft posts, create content calendars, analyze engagement, and manage publishing.',
      functions: ['draftPost', 'contentCalendar', 'analyzeEngagement'],
    });
  }

  if (lower.includes('research') || lower.includes('analysis') || lower.includes('data')) {
    recs.push({
      name: 'Research & Analysis',
      description: 'Deep research, document analysis, and competitive intelligence.',
      icon: '\ud83d\udd0d',
      instructions:
        'You are a research analyst. Help find information, analyze documents, and track competitive intelligence. Always cite sources.',
      functions: ['webSearch', 'summarizeDocument', 'compareData'],
    });
  }

  // Always include at least one recommendation
  if (recs.length === 0) {
    recs.push({
      name: 'Daily Assistant',
      description: 'A personal AI assistant for briefings, scheduling, and task management.',
      icon: '\u2600\ufe0f',
      instructions:
        'You are a personal daily assistant in the AEST timezone. Help with scheduling, reminders, daily briefings, and task management.',
      functions: ['dailyBriefing', 'scheduleTask', 'setReminder'],
    });
  }

  return recs;
}
