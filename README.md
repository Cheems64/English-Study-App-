# Daylight English

一个轻量的英语学习打卡 PWA，适合手机浏览器添加到主屏幕使用。

## 功能

- 完整模式和最低任务模式
- 每日任务打卡、连续学习天数和进度反馈
- 今天、3 天后、7 天后的单词复习队列
- 完成任务后随机打开一张鼓励卡片
- 本地保存打卡记录
- Service Worker 离线缓存

## GitHub Pages

项目通过 GitHub Actions 自动发布 `outputs/` 目录。推送后，在仓库的 **Settings → Pages** 中确认使用 GitHub Actions 部署。发布完成后，手机打开 Pages 地址，首次联网加载后即可添加到主屏幕。

## 本地预览

在 `outputs/` 目录启动一个静态服务器，然后访问 `index.html`。Service Worker 需要 `http://` 或 `https://` 环境，直接双击本地文件不会启用离线缓存。
