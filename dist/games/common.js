export const levels = ["入门", "初级", "中级", "高级", "专家挑战"];
export const colors = ["红色", "蓝色", "绿色", "黄色", "紫色"];
export const inks = ["#ce373c", "#2468c6", "#167c48", "#ae7c00", "#8040bb"];
export const figures = ["●", "▲", "■", "◆", "★", "✚"];
export const directions = ["向左", "向右", "向上", "向下"];
export const arrows = ["←", "→", "↑", "↓"];
export const rand = (n) => Math.floor(Math.random() * n);
export function shuffle(values) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const range = (n) => Array.from({ length: n }, (_, i) => i);
export const choose = (a) => a[rand(a.length)];
export const other = (n, value) => (value + 1 + rand(n - 1)) % n;
export const pct = (c, n) => (n ? Math.round((100 * c) / n) : 0);
export const counts = [8, 10, 12, 16, 20];
