export interface Env {
  FIREBASE_APP_ORIGIN: string;
  DEPLOY_PATH_PREFIX?: string;
}

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function upstreamUrl(requestUrl: URL, env: Env) {
  const origin = new URL(stripTrailingSlash(env.FIREBASE_APP_ORIGIN));
  const prefix = env.DEPLOY_PATH_PREFIX || "/mywatchlist";
  const upstream = new URL(requestUrl.toString());
  upstream.protocol = origin.protocol;
  upstream.hostname = origin.hostname;
  upstream.port = origin.port;

  if (requestUrl.pathname.startsWith(`${prefix}/_next/`)) {
    upstream.pathname = requestUrl.pathname.slice(prefix.length);
  }

  return upstream;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.FIREBASE_APP_ORIGIN) {
      return new Response("FIREBASE_APP_ORIGIN is not configured.", { status: 500 });
    }

    const incomingUrl = new URL(request.url);
    const upstream = upstreamUrl(incomingUrl, env);
    const upstreamRequest = new Request(upstream, request);
    upstreamRequest.headers.set("X-Forwarded-Host", incomingUrl.host);
    upstreamRequest.headers.set("X-Forwarded-Proto", incomingUrl.protocol.replace(":", ""));

    return fetch(upstreamRequest);
  }
};
