import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Hedef ASLA production olmasın. Varsayılan localhost.
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.API_TOKEN || '';

const loginTrend = new Trend('login_duration');
const bizErrors = new Rate('business_errors');

// SCENARIO=load|stress|spike|soak ile seçilir
const SCENARIOS = {
  smoke: { executor: 'constant-vus', vus: 2, duration: '1m' },

  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },  // ramp-up
      { duration: '5m', target: 100 },  // plato
      { duration: '2m', target: 0 },    // ramp-down
    ],
  },

  stress: {
    executor: 'ramping-arrival-rate',
    startRate: 20, timeUnit: '1s',
    preAllocatedVUs: 100, maxVUs: 2000,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '2m', target: 300 },
      { duration: '2m', target: 600 },  // kırılma noktasını ara
      { duration: '2m', target: 1000 },
    ],
  },

  spike: {
    executor: 'ramping-vus',
    stages: [
      { duration: '10s', target: 20 },
      { duration: '20s', target: 800 },  // ani sıçrama
      { duration: '1m',  target: 800 },
      { duration: '20s', target: 20 },   // toparlanıyor mu?
      { duration: '2m',  target: 20 },
    ],
  },

  soak: { executor: 'constant-vus', vus: 60, duration: '2h' }, // memory leak avı
};

const selected = __ENV.SCENARIO || 'load';

export const options = {
  scenarios: { [selected]: SCENARIOS[selected] },

  // Eşiksiz yük testi yapma. Bunlar başlangıç değerleri — kendi SLO'nla değiştir.
  thresholds: {
    http_req_failed:   ['rate<0.01'],                    // hata oranı < %1
    http_req_duration: ['p(95)<500', 'p(99)<1200'],      // ms
    'http_req_duration{endpoint:list}': ['p(95)<300'],
    business_errors:   ['rate<0.005'],
    checks:            ['rate>0.99'],
  },
};

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export default function () {
  group('katalog gezinme', () => {
    const res = http.get(`${BASE}/api/products?page=1&limit=20`, {
      headers, tags: { endpoint: 'list' },
    });
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'ürün döndü': (r) => {
        try { return JSON.parse(r.body).items.length > 0; } catch { return false; }
      },
    });
    bizErrors.add(!ok);
  });

  sleep(Math.random() * 2 + 1); // gerçekçi düşünme süresi

  group('sipariş oluşturma', () => {
    const res = http.post(
      `${BASE}/api/orders`,
      JSON.stringify({ items: [{ sku: 'SKU-1001', qty: 1 }] }),
      { headers, tags: { endpoint: 'create_order' } },
    );
    loginTrend.add(res.timings.duration);
    check(res, { 'sipariş 201': (r) => r.status === 201 });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'reports/k6/summary.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify(
      {
        senaryo: selected,
        p95: data.metrics.http_req_duration?.values['p(95)'],
        p99: data.metrics.http_req_duration?.values['p(99)'],
        hata_orani: data.metrics.http_req_failed?.values.rate,
        rps: data.metrics.http_reqs?.values.rate,
      },
      null, 2,
    ),
  };
}
