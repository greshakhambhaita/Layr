import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ params }) {
  const { nickname } = params;

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/grids?nickname=eq.${nickname}&select=config`, {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data || data.length === 0) {
      return json({ error: 'Configuration not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // data is an array [{ config: { ... } }]
    const config = data[0].config;

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Registry API Error:', error);
    return json({ error: 'Internal Server Error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
