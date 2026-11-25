// 专注力训练中心的本机启动程序。网页资源位于 runtime 同级的 site 目录。
package main

import (
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const address = "127.0.0.1:8765"
const home = "http://" + address + "/"
const appHeader = "X-Focus-Center"
const appID = "focus-center-local-v1"

func siteHandler(site fs.FS) http.Handler {
	files := http.FileServer(http.FS(site))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "仅支持读取网页资源", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" {
			name = "index.html"
		}
		if !fs.ValidPath(name) || strings.ContainsAny(name, "\\:") {
			http.NotFound(w, r)
			return
		}
		info, err := fs.Stat(site, name)
		if err != nil || !info.Mode().IsRegular() {
			http.NotFound(w, r)
			return
		}
		w.Header().Set(appHeader, appID)
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		// 显式提供模块、样式和清单类型，避免受系统文件关联影响。
		types := map[string]string{
			".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
			".webmanifest": "application/manifest+json; charset=utf-8",
			".html":        "text/html; charset=utf-8", ".png": "image/png",
		}
		if mime, ok := types[filepath.Ext(name)]; ok {
			w.Header().Set("Content-Type", mime)
		}
		files.ServeHTTP(w, r)
	})
}

func existingInstance() bool {
	client := http.Client{
		Timeout:       2 * time.Second,
		Transport:     &http.Transport{DisableKeepAlives: true},
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	response, err := client.Head(home)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	return response.StatusCode == http.StatusOK && response.Header.Get(appHeader) == appID
}

func openBrowser() {
	launcher := filepath.Join(os.Getenv("SystemRoot"), "System32", "rundll32.exe")
	if err := exec.Command(launcher, "url.dll,FileProtocolHandler", home).Run(); err != nil {
		fmt.Println("请在浏览器中打开", home)
	}
}

func run(open bool) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	site := os.DirFS(filepath.Join(filepath.Dir(exe), "..", "site"))
	if info, err := fs.Stat(site, "index.html"); err != nil || !info.Mode().IsRegular() {
		return errors.New("找不到训练首页。请先完整解压，然后双击“启动训练中心.cmd”。")
	}
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		if existingInstance() {
			fmt.Println("训练中心已经在运行。", home)
			if open {
				openBrowser()
			}
			return nil
		}
		return fmt.Errorf("无法监听本机 8765 端口，请检查该端口是否已被其他程序占用。详情：%w", err)
	}
	defer listener.Close()
	fmt.Println("专注力训练中心已启动。")
	fmt.Println("本机地址：", home)
	fmt.Println("训练期间请保留此窗口。完成训练并保存后，关闭此窗口或按 Ctrl+C 可退出服务。")
	if open {
		go openBrowser()
	}
	server := &http.Server{Handler: siteHandler(site), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	return server.Serve(listener)
}

func main() {
	noBrowser := flag.Bool("no-browser", false, "仅启动服务")
	flag.Parse()
	if err := run(!*noBrowser); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
