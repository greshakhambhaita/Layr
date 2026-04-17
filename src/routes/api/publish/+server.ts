import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const adjectives = [
  "misty", "copper", "frozen", "silent", "golden", "crimson", "azure", "emerald", "velvet", "gentle",
  "rapid", "bold", "bright", "cosmic", "dusty", "lunar", "solar", "wild", "calm", "fierce",
  "steady", "nimble", "hardy", "lush", "sleek", "sharp", "soft", "warm", "cool", "dark",
  "light", "magic", "secret", "hidden", "quiet", "loud", "small", "large", "tiny", "giant",
  "brave", "smart", "lucky", "happy", "proud", "sweet", "bitter", "spicy", "salty", "fresh"
];

const nouns = [
  "falcon", "tide", "peak", "river", "forest", "desert", "canyon", "ocean", "glade", "meadow",
  "cloud", "storm", "thunder", "flame", "spark", "stone", "pebble", "leaf", "petal", "root",
  "branch", "owl", "wolf", "bear", "deer", "hawk", "eagle", "fox", "lynx", "otter",
  "seal", "whale", "dolphin", "reef", "island", "star", "moon", "sun", "comet", "nebula",
  "galaxy", "planet", "orbit", "vortex", "breeze", "gale", "mist", "dew", "frost", "snow"
];

function generateNickname() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}`;
}

export async function POST({ request }) {
  try {
    const config = await request.json();
    const nickname = generateNickname();
    
    config.nickname = nickname;
    config.createdAt = new Date().toISOString();

    // Insert row into Supabase 'grids' table
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/grids`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nickname: nickname,
        config: config
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase Error:', errorText);
        return json({ error: 'Failed to save configuration' }, { status: 500 });
    }

    return json({ nickname });
  } catch (error) {
    console.error('Publish API Error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
