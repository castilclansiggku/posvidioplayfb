const UPSTASH_URL = Netlify.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_TOKEN = Netlify.env.get("UPSTASH_REDIS_REST_TOKEN");

export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ========== GET → Ambil dari Redis ==========
    if (request.method === "GET") {
      const url = new URL(request.url);
      const noteId = url.searchParams.get("id");

      if (!noteId) {
        return new Response(JSON.stringify({ error: "noteId diperlukan" }), {
          status: 400,
          headers,
        });
      }

      const response = await fetch(`${UPSTASH_URL}/get/note:${noteId}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
      });

      const data = await response.json();

      if (data.result) {
        return new Response(
          JSON.stringify({
            found: true,
            originalUrl: data.result,
          }),
          { status: 200, headers }
        );
      }

      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers }
      );
    }

    // ========== POST → Simpan ke Redis ==========
    if (request.method === "POST") {
      const body = await request.json();
      const { shortId, originalUrl } = body; // shortId = noteId, originalUrl = content

      if (!shortId || !originalUrl) {
        return new Response(
          JSON.stringify({ error: "data tidak lengkap" }),
          { status: 400, headers }
        );
      }

      // Simpan dengan prefix "note:" dan expired 1 hari
      await fetch(
        `${UPSTASH_URL}/set/note:${shortId}/${encodeURIComponent(originalUrl)}?EX=86400`,
        {
          headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
          },
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method tidak diizinkan" }),
      { status: 405, headers }
    );
  } catch (error) {
    console.error("Redis Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: "Terjadi kesalahan server",
        detail: error.message,
      }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/redis-link",
};
