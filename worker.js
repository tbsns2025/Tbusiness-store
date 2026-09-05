// هذا الملف هو "الحارس" الذي يوجّه كل طلب: صفحات الموقع تُعرض كما هي،
// وطلبات تسجيل الدخول (/api/auth و /api/callback) تُعالَج هنا مباشرة.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/auth') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/api/callback') {
      return handleCallback(request, env);
    }

    // أي طلب آخر: اعرض الملف المطابق من الموقع نفسه
    return env.ASSETS.fetch(request);
  }
};

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const clientId = env.GITHUB_CLIENT_ID;
  const redirectUri = url.origin + '/api/callback';
  const state = Math.random().toString(36).substring(2, 15);

  const githubAuthUrl =
    'https://github.com/login/oauth/authorize' +
    '?client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=repo,user' +
    '&state=' + encodeURIComponent(state);

  return Response.redirect(githubAuthUrl, 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('لم يتم استلام رمز التفويض من GitHub.', { status: 400 });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code
    })
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return new Response('خطأ أثناء المصادقة: ' + (tokenData.error_description || tokenData.error), { status: 400 });
  }

  const token = tokenData.access_token;
  const payload = JSON.stringify({ token: token, provider: 'github' });

  const html = `<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:success:${payload}',
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
تم تسجيل الدخول، يمكنك إغلاق هذه النافذة إذا لم تُغلق تلقائيًا.
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
