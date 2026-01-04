const https = require('https');
const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 4000;

function proxyGet(targetUrl, res, redirectsLeft = 5){
  try{
    const urlObj = new URL(targetUrl);
    const opts = {
      method: 'GET',
      headers: {
        'User-Agent': 'TwoRus-Proxy/1.0'
      }
    };
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(urlObj, opts, upstreamRes => {
      if(upstreamRes.statusCode >= 300 && upstreamRes.statusCode < 400 && upstreamRes.headers.location && redirectsLeft > 0){
        const loc = upstreamRes.headers.location.startsWith('http') ? upstreamRes.headers.location : (urlObj.origin + upstreamRes.headers.location);
        upstreamRes.resume(); // discard
        return proxyGet(loc, res, redirectsLeft - 1);
      }

      const headers = Object.assign({}, upstreamRes.headers);
      headers['access-control-allow-origin'] = '*';
      // Remove headers that may confuse the client
      delete headers['set-cookie'];
      delete headers['content-security-policy'];

      res.writeHead(upstreamRes.statusCode || 200, headers);
      upstreamRes.pipe(res);
    });

    req.on('error', (err) => {
      console.error('Proxy request error', err);
      try{ res.writeHead(502, {'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'}); res.end('Bad Gateway'); }catch(e){}
    });

    req.end();
  }catch(err){
    console.error('Proxy error', err);
    try{ res.writeHead(500, {'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'}); res.end('Proxy internal error'); }catch(e){}
  }
}

const server = http.createServer((req, res) => {
  // Allow CORS preflight
  if(req.method === 'OPTIONS'){
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  if(req.url.startsWith('/image/')){
    const parts = req.url.split('/');
    const id = parts[2];
    if(!id){ res.writeHead(400, {'Content-Type':'text/plain'}); return res.end('Missing id'); }
    // Use the drive download endpoint to reduce preview HTML
    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    console.log('Proxying', driveUrl);
    return proxyGet(driveUrl, res);
  }

  // Simple root page for quick check
  if(req.url === '/' || req.url === '/health'){
    res.writeHead(200, {'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});
    return res.end('TwoRus proxy running');
  }

  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`TwoRus proxy running on http://localhost:${PORT}`);
});
