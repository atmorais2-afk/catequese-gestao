const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    // Split URL to remove query parameters
    const [urlPathRaw] = req.url.split('?');
    const urlPath = urlPathRaw === '/' ? 'index.html' : urlPathRaw.startsWith('/') ? urlPathRaw.slice(1) : urlPathRaw;

    let filePath = path.join(BASE_DIR, urlPath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} -> ${filePath}`);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`❌ Erro ao ler arquivo: ${filePath}`, err.message);
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 - Arquivo não encontrado');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Servidor rodando em: http://localhost:${PORT}`);
    console.log(`   Pressione Ctrl+C para parar.`);
});
