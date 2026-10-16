"""THE DAILY - static website and crawler API (local and Render).

Run locally: python server.py. Online: Render starts this automatically.
Frontend uses plain HTML/CSS/JavaScript; Python handles fetching HTML
from external sites that do not enable cross-origin browser requests.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from urllib.error import URLError
import json
import ipaddress
import logging
import socket
import os
import time
from collections import defaultdict, deque
from threading import BoundedSemaphore, Lock

try:
    import requests
except ImportError:
    raise SystemExit('Thiếu requests: python -m pip install -r requirements.txt')

ROOT = Path(__file__).resolve().parent
MAX_HTML = 8 * 1024 * 1024
# Public demo protection: allow familiar Vietnamese news publishers only.
# Extend with CRAWLER_ALLOWED_DOMAINS=example.com,another-news.com on Render.
ALLOWED_NEWS_DOMAINS = frozenset(filter(None, (
    os.environ.get('CRAWLER_ALLOWED_DOMAINS') or
    'dantri.com.vn,vietnamnet.vn,vtcnews.vn,vnexpress.net,tuoitre.vn,thanhnien.vn,'
    'laodong.vn,baomoi.com,nhandan.vn,tienphong.vn,cafef.vn,24h.com.vn,'
    'kenh14.vn,vtv.vn,vov.vn,znews.vn,danviet.vn,nguoiduatin.vn'
).lower().replace(' ', '').split(',')))
MAX_CONCURRENT_CRAWLS = BoundedSemaphore(3)
LIMIT_LOCK = Lock()
CRAWL_TIMES = defaultdict(deque)
REQUEST_LIMIT = 12
REQUEST_WINDOW = 10 * 60
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')


def check_url(url):
    parts = urlsplit(url)
    host = parts.hostname
    if parts.scheme not in ('http', 'https') or not host or parts.username or parts.password:
        raise ValueError('URL không hợp lệ: cần đường dẫn bài viết bắt đầu bằng http:// hoặc https://.')
    try:
        port = parts.port
    except ValueError:
        raise ValueError('Cổng trong URL không hợp lệ.')
    if port not in (None, 80, 443):
        raise ValueError('Không hỗ trợ URL có cổng không chuẩn.')
    hostname = host.lower().rstrip('.')
    if not any(hostname == d or hostname.endswith('.' + d) for d in ALLOWED_NEWS_DOMAINS):
        raise ValueError('Nguồn tin chưa được cho phép trên máy chủ demo. Hãy thử một báo tin tức hỗ trợ hoặc cấu hình CRAWLER_ALLOWED_DOMAINS.')
    if (host.lower() in ('localhost', 'localhost.localdomain')
            or host.lower().endswith(('.localhost', '.local', '.internal'))):
        raise ValueError('Không hỗ trợ địa chỉ nội bộ.')
    try:
        addresses = socket.getaddrinfo(host, port or (443 if parts.scheme == 'https' else 80),
                                       type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError('Không phân giải được tên miền. Kiểm tra kết nối mạng hoặc URL.') from exc
    except (OSError, TimeoutError) as exc:
        raise ValueError('Không kiểm tra được địa chỉ tên miền. Kiểm tra kết nối mạng.') from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise ValueError('Không hỗ trợ địa chỉ mạng riêng hoặc nội bộ.')
    return url


def is_rate_limited(peer):
    now = time.monotonic()
    with LIMIT_LOCK:
        times = CRAWL_TIMES[peer]
        while times and now - times[0] > REQUEST_WINDOW:
            times.popleft()
        if len(times) >= REQUEST_LIMIT:
            return True
        times.append(now)
    return False


def public_html(url):
    url = check_url(url)
    with requests.Session() as session:
        # Hỗ trợ cấu hình proxy chuẩn của chính máy chạy (nếu có).
        session.headers.update({
            'User-Agent': 'TheDailyStudentProject/1.1 (educational news reader)',
            'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.7',
        })
        for _ in range(6):
            check_url(url)
            try:
                with session.get(url, timeout=(10, 30), stream=True,
                                 allow_redirects=False) as response:
                    if response.status_code in (301, 302, 303, 307, 308):
                        location = response.headers.get('Location')
                        if not location:
                            raise ValueError('Trang chuyển hướng nhưng không có địa chỉ mới.')
                        url = urljoin(url, location)
                        continue
                    if response.status_code in (401, 403):
                        raise ValueError('Website nguồn từ chối truy cập tự động (HTTP %s). Hãy thử bài công khai ở nguồn khác.' % response.status_code)
                    if response.status_code == 404:
                        raise ValueError('Không tìm thấy bài viết (HTTP 404). Hãy kiểm tra URL đầy đủ.')
                    if response.status_code == 429:
                        raise ValueError('Website nguồn đang giới hạn số lần truy cập (HTTP 429). Hãy thử lại sau.')
                    if response.status_code >= 400:
                        raise ValueError('Website nguồn trả về lỗi HTTP %s.' % response.status_code)
                    ctype = response.headers.get('Content-Type', '').lower()
                    if ctype and not any(x in ctype for x in ('text/html', 'application/xhtml+xml')):
                        raise ValueError('URL không trả về HTML bài báo (Content-Type: %s).' % ctype.split(';')[0])
                    blocks, size = [], 0
                    for block in response.iter_content(chunk_size=65536):
                        if not block:
                            continue
                        size += len(block)
                        if size > MAX_HTML:
                            raise ValueError('Nội dung HTML lớn hơn 8 MB nên đã dừng tải.')
                        blocks.append(block)
                    raw = b''.join(blocks)
                    if not raw or len(raw) < 150:
                        raise ValueError('Trang trả về dữ liệu quá ngắn để là một bài viết.')
                    encoding = response.encoding
                    if not encoding or encoding.lower() in ('iso-8859-1', 'latin-1'):
                        encoding = 'utf-8'
                    try:
                        html = raw.decode(encoding, errors='replace')
                    except LookupError:
                        html = raw.decode('utf-8', errors='replace')
                    return html, url
            except requests.exceptions.SSLError as exc:
                raise ValueError('Lỗi chứng chỉ bảo mật HTTPS của website nguồn.') from exc
            except requests.exceptions.Timeout as exc:
                raise ValueError('Kết nối đến website nguồn bị hết thời gian chờ. Hãy thử lại.') from exc
            except requests.exceptions.ConnectionError as exc:
                raise ValueError('Không kết nối được đến website nguồn. Kiểm tra mạng, tên miền hoặc proxy.') from exc
            except requests.exceptions.RequestException as exc:
                raise ValueError('Không tải được bài viết từ website nguồn: %s.' % type(exc).__name__) from exc
    raise ValueError('Website chuyển hướng quá nhiều lần.')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/health':
            self.send_json(200, {'status': 'ok', 'message': 'Crawler online đã sẵn sàng'})
            return
        # No directory listing or accidental exposure of backend/configuration.
        allowed_pages = {'/', '/index.html', '/article.html', '/crawler.html'}
        if path not in allowed_pages and not (
            path.startswith('/assets/') and path.lower().endswith(('.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'))
        ) and path not in ('/data/posts.json', '/data/menu.json'):
            return self.send_error(404, 'Not found')
        super().do_GET()

    def do_POST(self):
        if self.path != '/api/crawl':
            return self.send_json(404, {'error': 'Không tìm thấy API crawler.'})
        if is_rate_limited(self.client_address[0]):
            return self.send_json(429, {'error': 'Bạn đã gửi nhiều yêu cầu. Hãy thử lại sau khoảng 10 phút.'})
        if not MAX_CONCURRENT_CRAWLS.acquire(blocking=False):
            return self.send_json(503, {'error': 'Máy chủ đang xử lý các yêu cầu khác. Vui lòng thử lại sau.'})
        try:
            self.handle_crawl()
        finally:
            MAX_CONCURRENT_CRAWLS.release()

    def handle_crawl(self):
        try:
            try:
                size = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                raise ValueError('Dữ liệu gửi đến máy chủ không hợp lệ.')
            if not 0 < size < 8192:
                raise ValueError('Dữ liệu gửi đến máy chủ quá lớn hoặc rỗng.')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Định dạng yêu cầu không hợp lệ.')
            url = str(data.get('url', '')).strip()
            html, final_url = public_html(url)
            self.send_json(200, {'html': html, 'url': final_url})
        except (ValueError, json.JSONDecodeError) as exc:
            logging.warning('Crawl failed: %s', exc)
            self.send_json(422, {'error': str(exc)})
        except Exception as exc:
            logging.exception('Unexpected crawler error: %s', type(exc).__name__)
            self.send_json(500, {'error': 'Máy chủ gặp lỗi %s. Mở Terminal xem chi tiết.' % type(exc).__name__})

    def send_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5500'))
    host = '0.0.0.0' if os.environ.get('PORT') else '127.0.0.1'
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    print(f'THE DAILY: listening at http://{host}:{port}', flush=True)
    print(f'API health: http://localhost:{port}/api/health', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nĐã dừng server.')
