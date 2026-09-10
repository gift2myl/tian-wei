"""Start the self-contained Qingyu HTML experience on a free local port."""
import functools
import pathlib
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

root = pathlib.Path(__file__).resolve().parent
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root))
with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
    url = f'http://127.0.0.1:{server.server_address[1]}/'
    print(f'清语空间体验：{url}\n保持此窗口打开。按 Ctrl+C 结束。', flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
