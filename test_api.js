const http = require('http');

const data = JSON.stringify({ email: 'akriticoder10@gmail.com', password: 'password123' });

const req = http.request('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).data.token;
    
    http.request('http://localhost:4000/api/reports/analytics', {
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let b = '';
      res2.on('data', d => b += d);
      res2.on('end', () => console.log('Analytics:', res2.statusCode, b));
    }).end();
  });
});
req.write(data);
req.end();
