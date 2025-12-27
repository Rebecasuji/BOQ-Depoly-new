const http = require('http');

const tests = [
  { username: 'admin@example.com', password: 'DemoPass123!', name: 'correct' },
  { username: 'admin@example.com', password: 'WrongPass', name: 'wrong-password' },
  { username: 'noone@example.com', password: 'DoesntMatter', name: 'wrong-email' }
];

function runTest(t) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ username: t.username, password: t.password });
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.token) {
            resolve({ name: t.name, status: res.statusCode, token: json.token.substring(0, 20) + '...', user_role: json.user.role });
          } else {
            resolve({ name: t.name, status: res.statusCode, message: json.message });
          }
        } catch (e) {
          resolve({ name: t.name, status: res.statusCode, body });
        }
      });
    });
    req.on('error', (e) => resolve({ name: t.name, error: String(e) }));
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Testing login endpoints...\n');
  for (const t of tests) {
    const r = await runTest(t);
    console.log(`[${r.name}]`, JSON.stringify(r));
  }
})();
