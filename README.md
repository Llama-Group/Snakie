# Snakie

Snakie 现在同时包含两个版本：

1. 经典 C++ 终端版（原始项目）
2. 网页增强版（`web/`）

## Web 版入口

- 页面文件：`web/index.html`
- 直接用浏览器打开该文件即可游玩
- 或本地起服务后访问：

```bash
cd /Users/sunbelife/Code/LLMGRoup/Snakie
python3 -m http.server 8080
# open http://localhost:8080/web/
```

## Web 版增强功能

- 三种模式：经典 / 穿墙 / 挑战
- 动态速度与等级成长
- 连击加分机制
- 金色食物（高分奖励）
- 挑战模式障碍物
- 本地最高分存档（localStorage）
- 键盘 + 移动端方向键支持

## Web 版测试

当前环境 Node 不在默认 PATH，可这样执行：

```bash
cd /Users/sunbelife/Code/LLMGRoup/Snakie
PATH=/opt/homebrew/opt/node/bin:$PATH node ./web/tests/gameEngine.test.js
```

## C++ 版

原始 C++ 源码保留在仓库根目录，可继续通过 CMake 构建。
