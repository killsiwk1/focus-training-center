"""启动专注力训练中心本机离线版。"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

if __name__ == "__main__":
    directory = Path(__file__).resolve().parent / "dist"
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    try:
        with ThreadingHTTPServer(("127.0.0.1", 8765), handler) as server:
            print("请在浏览器打开 http://127.0.0.1:8765/ ，按 Ctrl+C 退出。", flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    except OSError as error:
        raise SystemExit("本机服务启动失败，请检查端口 8765 是否已被占用。") from error
