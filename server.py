import os
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get('PORT', 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
ROOMS_FILE = os.path.join(DATA_DIR, 'rooms.json')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(ROOMS_FILE):
    with open(ROOMS_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f)

def read_rooms():
    try:
        with open(ROOMS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def write_rooms(data):
    try:
        with open(ROOMS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("Error saving rooms:", e)

class PrivateCalendarHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def send_json_response(self, code, data):
        response_data = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_data)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response_data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path.strip('/')
        segments = path.split('/')

        # GET /api/rooms/:code
        if len(segments) == 3 and segments[0] == 'api' and segments[1] == 'rooms':
            code = urllib.parse.unquote(segments[2]).upper().strip()
            rooms = read_rooms()
            if code in rooms:
                self.send_json_response(200, rooms[code])
            else:
                self.send_json_response(404, {"error": "Sala privada no encontrada"})
            return

        # Static files fallback
        super().do_GET()

    def do_POST(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path.strip('/')
        segments = path.split('/')
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8')) if body else {}

        # POST /api/rooms -> Create private room
        if len(segments) == 2 and segments[0] == 'api' and segments[1] == 'rooms':
            code = data.get('code', '').upper().strip()
            if not code or not data.get('name'):
                self.send_json_response(400, {"error": "Datos incompletos"})
                return
            rooms = read_rooms()
            rooms[code] = data
            write_rooms(rooms)
            self.send_json_response(201, data)
            return

        # POST /api/rooms/:code/activities
        if len(segments) == 4 and segments[0] == 'api' and segments[1] == 'rooms' and segments[3] == 'activities':
            code = urllib.parse.unquote(segments[2]).upper().strip()
            rooms = read_rooms()
            if code not in rooms:
                self.send_json_response(404, {"error": "Sala no encontrada"})
                return
            if 'activities' not in rooms[code]:
                rooms[code]['activities'] = []
            rooms[code]['activities'].append(data)
            write_rooms(rooms)
            self.send_json_response(201, data)
            return

        self.send_json_response(404, {"error": "Ruta no encontrada"})

    def do_PUT(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path.strip('/')
        segments = path.split('/')
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8')) if body else {}

        # PUT /api/rooms/:code/activities/:actId
        if len(segments) == 5 and segments[0] == 'api' and segments[1] == 'rooms' and segments[3] == 'activities':
            code = urllib.parse.unquote(segments[2]).upper().strip()
            act_id = segments[4]
            rooms = read_rooms()
            if code not in rooms:
                self.send_json_response(404, {"error": "Sala no encontrada"})
                return
            activities = rooms[code].get('activities', [])
            for idx, act in enumerate(activities):
                if act.get('id') == act_id:
                    activities[idx] = {**act, **data}
                    write_rooms(rooms)
                    self.send_json_response(200, activities[idx])
                    return
            self.send_json_response(404, {"error": "Actividad no encontrada"})
            return

        self.send_json_response(404, {"error": "Ruta no encontrada"})

    def do_DELETE(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path.strip('/')
        segments = path.split('/')

        # DELETE /api/rooms/:code -> Delete entire private room
        if len(segments) == 3 and segments[0] == 'api' and segments[1] == 'rooms':
            code = urllib.parse.unquote(segments[2]).upper().strip()
            rooms = read_rooms()
            if code in rooms:
                del rooms[code]
                write_rooms(rooms)
            self.send_json_response(200, {"success": True})
            return

        # DELETE /api/rooms/:code/activities/:actId
        if len(segments) == 5 and segments[0] == 'api' and segments[1] == 'rooms' and segments[3] == 'activities':
            code = urllib.parse.unquote(segments[2]).upper().strip()
            act_id = segments[4]
            rooms = read_rooms()
            if code not in rooms:
                self.send_json_response(404, {"error": "Sala no encontrada"})
                return
            activities = rooms[code].get('activities', [])
            rooms[code]['activities'] = [a for a in activities if a.get('id') != act_id]
            write_rooms(rooms)
            self.send_json_response(200, {"success": True})
            return

        self.send_json_response(404, {"error": "Ruta no encontrada"})

if __name__ == '__main__':
    print(f"Servidor CampusSync corriendo en http://localhost:{PORT}")
    server = HTTPServer(('0.0.0.0', PORT), PrivateCalendarHandler)
    server.serve_forever()
