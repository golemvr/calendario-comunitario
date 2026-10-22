const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

// Ensure data folder and rooms.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ROOMS_FILE)) {
  fs.writeFileSync(ROOMS_FILE, JSON.stringify({}, null, 2));
}

// Helpers for reading/writing rooms store
function readRooms() {
  try {
    const raw = fs.readFileSync(ROOMS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading rooms.json:', err);
    return {};
  }
}

function writeRooms(data) {
  try {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing rooms.json:', err);
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const [urlPath] = req.url.split('?');

  // ==========================================
  // REST API: PRIVATE ROOMS & ACTIVITIES
  // ==========================================
  if (urlPath.startsWith('/api/rooms')) {
    const parts = urlPath.split('/').filter(Boolean); // ['api', 'rooms', ':code', ...]

    // 1. POST /api/rooms -> Create private room
    if (req.method === 'POST' && parts.length === 2) {
      try {
        const body = await parseJsonBody(req);
        if (!body.code || !body.name) {
          sendJson(res, 400, { error: 'Faltan campos obligatorios' });
          return;
        }
        const rooms = readRooms();
        const code = body.code.toUpperCase().trim();
        
        rooms[code] = {
          id: body.id || 'room_' + Date.now(),
          code: code,
          name: body.name,
          career: body.career || '',
          color: body.color || '#6366f1',
          description: body.description || '',
          creator: body.creator || 'Estudiante',
          createdAt: body.createdAt || new Date().toISOString(),
          activities: body.activities || []
        };

        writeRooms(rooms);
        sendJson(res, 201, rooms[code]);
      } catch (err) {
        sendJson(res, 500, { error: 'Error al crear la sala privada' });
      }
      return;
    }

    // 2. GET /api/rooms/:code -> Get private room by code (ONLY if you know the code!)
    if (req.method === 'GET' && parts.length === 3) {
      const code = parts[2].toUpperCase().trim();
      const rooms = readRooms();
      if (!rooms[code]) {
        sendJson(res, 404, { error: 'Sala privada no encontrada o código inválido' });
        return;
      }
      sendJson(res, 200, rooms[code]);
      return;
    }

    // 3. POST /api/rooms/:code/activities -> Add activity to private room
    if (req.method === 'POST' && parts.length === 4 && parts[3] === 'activities') {
      try {
        const code = parts[2].toUpperCase().trim();
        const rooms = readRooms();
        if (!rooms[code]) {
          sendJson(res, 404, { error: 'Sala no encontrada' });
          return;
        }

        const activity = await parseJsonBody(req);
        if (!activity.title || !activity.date) {
          sendJson(res, 400, { error: 'Título y fecha son requeridos' });
          return;
        }

        if (!activity.id) activity.id = 'act_' + Date.now();
        if (!rooms[code].activities) rooms[code].activities = [];
        
        rooms[code].activities.push(activity);
        writeRooms(rooms);
        sendJson(res, 201, activity);
      } catch (err) {
        sendJson(res, 500, { error: 'Error al agregar actividad' });
      }
      return;
    }

    // 4. PUT /api/rooms/:code/activities/:actId -> Update activity
    if (req.method === 'PUT' && parts.length === 5 && parts[3] === 'activities') {
      try {
        const code = parts[2].toUpperCase().trim();
        const actId = parts[4];
        const rooms = readRooms();
        if (!rooms[code]) {
          sendJson(res, 404, { error: 'Sala no encontrada' });
          return;
        }

        const updateData = await parseJsonBody(req);
        const idx = (rooms[code].activities || []).findIndex(a => a.id === actId);
        if (idx === -1) {
          sendJson(res, 404, { error: 'Actividad no encontrada' });
          return;
        }

        rooms[code].activities[idx] = { ...rooms[code].activities[idx], ...updateData };
        writeRooms(rooms);
        sendJson(res, 200, rooms[code].activities[idx]);
      } catch (err) {
        sendJson(res, 500, { error: 'Error al actualizar actividad' });
      }
      return;
    }

    // 5. DELETE /api/rooms/:code/activities/:actId -> Delete activity
    if (req.method === 'DELETE' && parts.length === 5 && parts[3] === 'activities') {
      const code = parts[2].toUpperCase().trim();
      const actId = parts[4];
      const rooms = readRooms();
      if (!rooms[code]) {
        sendJson(res, 404, { error: 'Sala no encontrada' });
        return;
      }

      rooms[code].activities = (rooms[code].activities || []).filter(a => a.id !== actId);
      writeRooms(rooms);
      sendJson(res, 200, { success: true });
      return;
    }
  }

  // ==========================================
  // STATIC FILES SERVING
  // ==========================================
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback SPA: serve index.html
      const fallbackPath = path.join(__dirname, 'index.html');
      fs.readFile(fallbackPath, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`CampusSync server running on port ${PORT}`);
});
