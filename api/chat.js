const MODELS_NO_SYSTEM = new Set(['google/gemma-3-4b-it:free']);

const ALL_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'google/gemma-3-4b-it:free',
];

function mergeSystemIntoUser(messages) {
  const system = messages.find(m => m.role === 'system');
  if (!system) return messages;
  const rest = messages.filter(m => m.role !== 'system');
  const firstUser = rest.findIndex(m => m.role === 'user');
  if (firstUser === -1) return rest;
  const result = [...rest];
  result[firstUser] = { role: 'user', content: `${system.content}\n\n${result[firstUser].content}` };
  return result;
}

async function tryModel(model, messages) {
  const msgs = MODELS_NO_SYSTEM.has(model) ? mergeSystemIntoUser(messages) : messages;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://botlease.nl',
        'X-Title': 'Milo by BotLease'
      },
      body: JSON.stringify({ model, messages: msgs, max_tokens: 250 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (response.ok && content) return content;
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, model: preferredModel } = req.body;
  if (!messages) return res.status(400).json({ error: 'Geen berichten' });

  // Bouw volgorde: gekozen model eerst, daarna de rest als fallback
  const order = preferredModel && ALL_MODELS.includes(preferredModel)
    ? [preferredModel, ...ALL_MODELS.filter(m => m !== preferredModel)]
    : ALL_MODELS;

  for (const model of order) {
    const content = await tryModel(model, messages);
    if (content) return res.status(200).json({ model, choices: [{ message: { role: 'assistant', content } }] });
  }

  return res.status(503).json({ error: 'Tijdelijk niet beschikbaar' });
}
