# fhf’s · 留一盏自己的灯

25 秒个人网站宣传片，面向抖音 / 小红书。9:16，1080 × 1920，30 fps，H.264 + AAC，带原创合成配乐，无旁白。

## 成品

- `output/fhfs-promo-vertical.mp4`：完整竖屏视频。
- `output/cover.jpg`：可选封面，使用片中霓虹入口画面。
- `output/storyboard.png`：九张关键帧拼图。
- `output/score.wav`：单独的配乐母带。
- `output/verification.json`：实际导出文件的媒体参数与播放验证。

文案、时长与颜色入口是 `brief.json`；场景画面是 `film.mjs`；音乐是 `score.mjs`。

## 分镜

| 时间 | 画面与信息 | 运动 |
| --- | --- | --- |
| 0–3.7 s | 互联网很大。留一盏自己的灯。 | 网站砖墙、霓虹标记亮起、镜头轻推 |
| 3.7–7.7 s | 写代码，也认真生活。 | 真实首页从下方进入，作者便签落位 |
| 7.7–11.7 s | 写下想法。把灵感做出来。 | 文章与软件页错落进入，展示网站的唱片机 |
| 11.7–17.5 s | 让好奇心，动起来。 | 立体杂志封面，淡化到实际苔藓生长镜头 |
| 17.5–21 s | 把日常，慢慢收藏。 | 纸张、网站头像、音乐 / 游戏 / 电影标签 |
| 21–25 s | 来我的小世界，坐一会儿。 | 霓虹标记、完整网站地址、稳定停留 |

主文案和网址位于约 x=78–902、y=258–1640 的区域，给平台覆盖层留出余量；并非所有平台 UI 的通用保证。没有新增装饰性箭头。沿用网站纸色、夜色、琥珀、霓虹蓝，以及 Nunito、Geist Mono、资源圆体。入场与旅行缓动对应站点 `EASE.default` / `EASE.travel`；网页本身没有改动。

## 重渲染

使用项目已有 Node 24、pnpm 11、`@playwright/test`、`sharp`、`@resvg/resvg-js`、`tsx`，以及本机 Google Chrome、FFmpeg / FFprobe。无新增运行时依赖。

在仓库根目录执行，素材已在当前工作区保存时：

```sh
node promo/score.mjs
node promo/render.mjs proofs
node promo/render.mjs sample
node promo/render.mjs full
node promo/verify.mjs
node promo/server.mjs
```

预览地址为 `http://127.0.0.1:4190`。预览默认不自动播放；播放与进度控制均使用文字与原生控件。渲染器启动同一端口，渲染前先关闭预览服务。

`render.mjs` 使用确定时间计算画面，等待字体和图像就绪，再把 Canvas 的原始 PNG 帧送入 FFmpeg。纹理和音乐使用固定种子 20261105。苔藓镜头是网站实际交互的固定帧素材；重渲染使用同一序列，重新取景时可能受网站更新和 GPU 影响。

## 重新取景

```sh
pnpm dev --port 4173
# 在另一个终端，依次执行：
node promo/capture.mjs http://127.0.0.1:4173
node promo/capture-grove.mjs
node --import tsx promo/prepare-assets.mjs
```

取景仅访问公开页面，不访问后台，不写数据库。初始线上首页已经取到，随后线上服务多次返回 HTTP 503，因此本片其余素材由相同工作区的本地预览读取现有公开内容。公开页面截图在 `assets/sources.json` 记录来源。苔藓取景临时隐藏了导航和原页面的说明层，以便视频字幕使用自己的排版；没有更改场景几何或保存网站状态。

生成的大文件放在 `assets/` 和 `output/`，通过当前文件夹 `.gitignore` 排除，不进入网站构建或部署。代码与制作说明可单独版本管理。字体仍引用仓库原文件，许可与素材来源见 `CREDITS.md`。

## 发布配文建议

给自己做了一个小网站。
写代码，写点东西，也收藏音乐、游戏、电影和生活里的小事。

互联网很大，留一盏自己的灯。
欢迎来坐坐：fhfs.fhfs.workers.dev

#个人网站 #独立开发 #前端开发 #创意编程

## 本次验证结果

- 成片：1080 × 1920，30 fps，750 帧，25.000 秒；H.264 / yuv420p + AAC / 48 kHz / 立体声，9,169,953 字节。
- FFmpeg 全片解码无错误；Chrome 从头播放到结束无媒体错误；同一时间点重复渲染的 PNG 字节一致。
- 实测音频约 -17.94 LUFS；图像和音频时长一致。已从最终 MP4 提取开场、中段、转场后与结尾画面检查。
- `pnpm check` 通过，63 个测试文件、543 个测试通过；后续新增制作验证脚本也通过 Vite+ lint 与格式检查。
- `pnpm build` 通过。
- `node scripts/smoke-magazine.mjs http://127.0.0.1:4174` 在已构建预览上通过。该脚本的 JS 分块失败模拟不适用于开发服务器，第一次在 dev 上运行的结果不用于构建验收。
