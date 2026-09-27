interface HealthResponse {
  ok: boolean;
  service?: string;
  timestamp?: string;
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

export default function handler(req: HealthRequest, res: HealthResponseWriter): void {
  res.setHeader('Allow', 'GET');

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    ok: true,
    service: 'OceanTrace API',
    timestamp: new Date().toISOString(),
  });
}
