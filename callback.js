// هذا الملف يستقبل رد GitHub بعد موافقة المستخدم، ويسلّم مفتاح الدخول للوحة التحكم
export async function onRequestGet(context) {
  const { request, env } = context;
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
