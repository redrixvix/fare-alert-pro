const https = require('https');
const jwt = require('jsonwebtoken');

const SECRET_HEX = '53d93a79c878a21a8676ee5c590f64cb88df2aa6834bcfc0f16548657a25b115';
const secret = Buffer.from(SECRET_HEX, 'hex');
const token = jwt.sign({ userId: 1, email: 'admin@farealertpro.com', plan: 'admin' }, secret, { algorithm: 'HS256', expiresIn: '7d' });

console.log('Testing different Convex API formats...\n');

// Format 1: JSON RPC style
const formats = [
  { name: 'jsonrpc', body: JSON.stringify({ jsonrpc: '2.0', method: 'status:getStatus', params: {}, id: 1 }), path: '/api/jsonrpc' },
  { name: 'query_v1', body: JSON.stringify({ v: 1, n: 'status:getStatus', a: {} }), path: '/api/query' },
  { name: 'query_arr', body: '[{"v":1,"n":"status:getStatus","a":{}}]', path: '/api/query' },
  { name: 'query_simple', body: '{"name":"status:getStatus","args":{}}', path: '/api/query' },
];

function testFormat(fmt) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'fiery-opossum-933.convex.cloud',
      path: fmt.path,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + token, 
        'Convex-Deployment': 'fiery-opossum-933' 
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const result = { name: fmt.name, status: res.statusCode, body: data.slice(0, 150) };
        resolve(result);
      });
    });
    req.on('error', e => resolve({ name: fmt.name, status: -1, body: e.message }));
    req.write(fmt.body);
    req.end();
  });
}

async function run() {
  for (const fmt of formats) {
    const result = await testFormat(fmt);
    console.log(`${result.name}: ${result.status} - ${result.body}`);
  }
}

run();