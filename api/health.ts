interface HealthResponse {
  ok: boolean;
  service: string;
  copernicus?: 'configuration_missing' | 'authenticated' | 'authentication_failed';
  error?: string;
}

interface HealthRequest {
  method?: string;
}

interface HealthResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: HealthResponse): unknown;
  };
}

export default async function handler(req: HealthRequest, res: HealthResponseWriter): Promise<void> {
  res.setHeader('Allow', 'GET');

  if (req.method !== 'GET') {
    res.status(405).json({
      ok: false,
      service: 'OceanTrace API',
      error: 'Method not allowed',
    });
    return;
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({
      ok: false,
      service: 'OceanTrace API',
      copernicus: 'configuration_missing',
    });
    return;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const tokenResponse = await fetch(
      'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      }
    );

    if (!tokenResponse.ok) {
      res.status(502).json({
        ok: false,
        service: 'OceanTrace API',
        copernicus: 'authentication_failed',
      });
      return;
    }

    const tokenPayload: unknown = await tokenResponse.json();
    const hasAccessToken =
      typeof tokenPayload === 'object' &&
      tokenPayload !== null &&
      'access_token' in tokenPayload &&
      typeof tokenPayload.access_token === 'string' &&
      tokenPayload.access_token.length > 0;

    if (!hasAccessToken) {
      res.status(502).json({
        ok: false,
        service: 'OceanTrace API',
        copernicus: 'authentication_failed',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      service: 'OceanTrace API',
      copernicus: 'authenticated',
    });
  } catch {
    res.status(502).json({
      ok: false,
      service: 'OceanTrace API',
      copernicus: 'authentication_failed',
    });
  } finally {
    clearTimeout(timeout);
  }
}
