export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    // Return 200 OK for preflight requests with proper CORS headers
    return new Response('ok', { 
      status: 200,
      statusText: 'OK',
      headers: corsHeaders 
    });
  }
  return null;
}

