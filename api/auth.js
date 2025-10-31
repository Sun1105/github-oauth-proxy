// api/auth.js
// Vercel serverless function: exchange GitHub `code` for access_token
// 返回 JSON，并允许跨域请求（Access-Control-Allow-Origin: *）

export default async function handler(req, res) {
  try {
    // 允许简单的 CORS 预检与请求（若你想更严格可把 * 换成你的域名）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      // 预检请求
      res.status(204).end();
      return;
    }

    const code = req.query.code;
    if (!code) {
      res.status(400).json({ error: 'missing code' });
      return;
    }

    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    if (!client_id || !client_secret) {
      res.status(500).json({ error: 'server not configured (missing CLIENT_ID/CLIENT_SECRET)' });
      return;
    }

    // 向 GitHub 申请 access_token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        client_secret,
        code
      })
    });

    const tokenData = await tokenResp.json();
    // tokenData: { access_token, token_type, scope } 或 { error, error_description }
    res.status(200).json(tokenData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
}
