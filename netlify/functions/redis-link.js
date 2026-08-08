const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    // ========== GET → Ambil dari Redis ==========
    if (event.httpMethod === "GET") {
      const noteId = event.queryStringParameters?.id;

      if (!noteId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "noteId diperlukan" }),
        };
      }

      const response = await fetch(`${UPSTASH_URL}/get/note:${noteId}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
      });

      const data = await response.json();

      if (data.result) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            found: true,
            originalUrl: data.result, // kita pakai field ini untuk content
          }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ found: false }),
      };
    }

    // ========== POST → Simpan ke Redis ==========
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { shortId, originalUrl } = body; // shortId = noteId, originalUrl = content

      if (!shortId || !originalUrl) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "data tidak lengkap" }),
        };
      }

      // Simpan dengan prefix "note:" dan expired 7 hari
      await fetch(
        `${UPSTASH_URL}/set/note:${shortId}/${encodeURIComponent(originalUrl)}?EX=604800`,
        {
          headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
          },
        }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method tidak diizinkan" }),
    };
  } catch (error) {
    console.error("Redis Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Terjadi kesalahan server",
        detail: error.message,
      }),
    };
  }
};
