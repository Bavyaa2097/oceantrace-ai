interface HealthRequest {
  method?: string;
}

interface HealthResponse {
  ok: boolean;
  service: string;
  gfw: 'configuration_missing' | 'authenticated' | 'authentication_failed' | 'access_denied' | 'upstream_error';
  upstreamStatus?: number;
  error?: string;
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: HealthResponse): unknown;
  };
}

const SERVICE = 'OceanTrace AIS API';
const GFW_URL = 'https://gateway.api.globalfishingwatch.org/v3/vessels/search';

export default async function handler(req: HealthRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({
      ok: false,
      service: SERVICE,
      gfw: 'upstream_error',
      error: 'Method not allowed',
    });
    return;
  }

  const token = process.env.GFW_API_TOKEN;
  if (!token) {
    res.status(500).json({
      ok: false,
      service: SERVICE,
      gfw: 'configuration_missing',
    });
    return;
  }

  const url = new URL(GFW_URL);
  url.searchParams.set('query', '7831410');
  url.searchParams.set('datasets[0]', 'public-global-vessel-identity:latest');
  url.searchParams.set('limit', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (upstream.status === 200) {
      res.status(200).json({
        ok: true,
        service: SERVICE,
        gfw: 'authenticated',
        upstreamStatus: 200,
      });
      return;
    }

    if (upstream.status === 401) {
      res.status(502).json({
        ok: false,
        service: SERVICE,
        gfw: 'authentication_failed',
        upstreamStatus: 401,
      });
      return;
    }

    if (upstream.status === 403) {
      res.status(502).json({
        ok: false,
        service: SERVICE,
        gfw: 'access_denied',
        upstreamStatus: 403,
      });
      return;
    }

    res.status(502).json({
      ok: false,
      service: SERVICE,
      gfw: 'upstream_error',
      upstreamStatus: upstream.status,
      error: 'GFW connectivity check failed',
    });
  } catch {
    res.status(502).json({
      ok: false,
      service: SERVICE,
      gfw: 'upstream_error',
      error: 'GFW connectivity check failed',
    });
  } finally {
    clearTimeout(timeout);
  }
}
