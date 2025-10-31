/**
 * Vercel Serverless Function: GitHub OAuth Proxy
 * ---------------------------------------------
 * 这个文件的作用：
 *   浏览器端无法直接用 GitHub OAuth code 换取 access_token（因为要保密 client_secret）
 *   所以由这个 API 来代替浏览器与 GitHub 通信。
 *
 * 部署路径：
 *   /api/auth.js   （部署后可访问 https://你的vercel项目.vercel.app/api/auth）
 */

export default async function handler(req, res) {
  // ===== [1] 允许跨域访问 (CORS) =====
  // 说明：
  //   - 你的博客站点 sun1105.github.io 在另一个域名下
  //   - 若不允许跨域，fetch() 请求会被浏览器拦截
  //   - 生产环境中建议改为具体域名，例如：https://sun1105.github.io
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 请求是 CORS 预检（浏览器自动发的）
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // ===== [2] 获取 GitHub OAuth 返回的 code =====
  const code = req.query.code;
  if (!code) {
    // 若没带 code 参数，说明请求不合法
    return res.status(400).json({ error: 'missing code' });
  }

  // ===== [3] 读取环境变量（在 Vercel Dashboard 里配置） =====
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    // 如果这里返回这个错误，说明你在 Vercel 没配置环境变量
    return res.status(500).json({ error: 'server not configured (missing GITHUB_CLIENT_ID/SECRET)' });
  }

  // ===== [4] 向 GitHub 官方接口换取 access_token =====
  // 目标 URL: https://github.com/login/oauth/access_token
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json', // GitHub 返回 JSON 格式
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code
      })
    });

    const data = await response.json();

    // ===== [5] 检查是否返回错误 =====
    if (data.error) {
      // GitHub 返回的错误格式例如：
      // { error: "bad_verification_code", error_description: "The code passed is incorrect..." }
      return res.status(400).json({
        error: data.error_description || data.error
      });
    }

    // ===== [6] 成功，返回 access_token =====
    // ⚠️ 这里不返回 client_secret，以保证安全
    res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type || 'bearer'
    });

  } catch (err) {
    // ===== [7] 捕获网络或程序错误 =====
    console.error('OAuth Proxy Error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
}
