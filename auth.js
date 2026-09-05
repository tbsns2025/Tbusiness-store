// هذا الملف يبدأ عملية تسجيل الدخول بحساب GitHub عند الضغط على "Login with GitHub"
export async function onRequestGet(context) {
  const { request, env } = context;
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
