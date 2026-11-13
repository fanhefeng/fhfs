# 素材与来源

本宣传片的网页取景来自 fhf 的个人网站及当前仓库；视频没有使用网站收藏的电影剧照、Apple Hello 字形或商业音乐录音。原项目的 LICENSE 与 docs/CREDITS.md 继续适用。

- 首页、文章索引、软件唱片机、立体杂志：当前仓库的真实网页取景。软件是站点实际收录的项目，片中没有改写其名称或功能。
- 苔藓：`src/components/lab/GroveDemo.tsx` 与 `src/lib/grove` 的实际程序场景。90 张固定帧来自本地公开页面滚动取景，之后由视频时间轴重采样。
- 人物头像：本站 `src/components/chibi/ChibiArt.tsx` 与 `art.ts`，保留原始图形。原有权利不变。
- 砖墙：首页 NeonSplash 的程序化砖墙，来自公开首页截图。
- 霓虹标记：沿用 `src/lib/neon/geometry.ts` 中的改编几何，源自 **Espandero, File:Seb’s.svg**，**CC BY-SA 4.0**。原始来源：[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Seb%27s.svg)，许可：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。本片重新绘制发光描边、调整构图与动画；衍生霓虹图形保留同一许可。片尾和 MP4 元数据也有署名。其余网站内容的原有权利不变。
- 中文：Resource Han Rounded CN 1.910（资源圆体），Cyano Hao，基于 Adobe / Google 思源黑体，SIL OFL 1.1。使用仓库 `public/fonts/rounded/v1/`，许可随该目录保存。
- 拉丁字体：Nunito、Geist Mono；预览页面也加载 Josefin Sans。均来自仓库 `src/app/font-files/`，各自 OFL 文件不变。
- 配乐：本次制作的确定性合成配乐，`score.mjs` 中的音符、包络、混响、打击音及转场沙沙声生成。没有第三方音频采样、没有人声、没有引用现成歌曲旋律。48 kHz 立体声，目标约 -18 LUFS，最终 AAC 编码。

制作日期：2026-11-05（Asia/Shanghai）。
