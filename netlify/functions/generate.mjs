export const handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { topic, numPlayers } = JSON.parse(event.body);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'system',
          content: 'You are a game engine helper. Your job is to generate specific examples for a given category. Never return sub-categories. Always return specific instances.'
        }, {
          role: 'user',
          content: `Generate exactly ${numPlayers} specific items for the topic "${topic}".
          
          RULES:
          1. Return specific instances, NOT categories.
          2. If the topic is "Animals", return specific animals like "Lion", "Elephant", "Penguin". Do NOT return "Wild Animals" or "Zoo Animals".
          3. If the topic is "Food", return specific foods like "Pizza", "Burger", "Sushi". Do NOT return "Fast Food" or "Dinner".
          4. The items should be distinct but related enough for a game of Imposter.
          5. Return ONLY valid JSON.
          
          Format: {"topic":"${topic}","items":["item1","item2","item3"]}`
        }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message
      })
    };
  }
};
