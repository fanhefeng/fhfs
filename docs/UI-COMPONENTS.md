# 断环印记 · 共用 UI

用户于 2026-11-11 确认组件与图标预览。前台阅读界面与后台操作界面共用控件，首页、霓虹招牌、唱机和三维场景保留原有表达。

| 角色 | 字号 / 行高 | 用途 |
| --- | --- | --- |
| 页面标题 | 后台 28–32px / 1.3；前台保留 display 阶梯 | 每页主标题 |
| 分组标题 | 20px / 1.35 | 栏目、表单分组、目录标题 |
| 正文与输入 | 16px / 1.65–1.7 | UI 正文、表单；手机技术字段同样至少 16px |
| 长文 | 17px / 1.7，68ch | 文章阅读 |
| 控件与标签 | 14px / 1.5 | 按钮、选择器、导航、字段名称 |
| 辅助说明与反馈 | 13px / 1.65 | 字段说明、保存与失败反馈 |
| 元信息 | 12px / 1.5 | 日期、版本、计数；代码与数值继续使用 Geist Mono |

中文统一资源圆体，拉丁正文与控件使用 Nunito。Josefin Sans 仍用于原有点缀，技术字段保留等宽字。

共用源码位于 `src/components/ui/`，样式集中于 `controls.css`。后台 `styles.ts` 和 `ui/Segmented.tsx` 是兼容入口，不拥有第二套控件样式，也不依赖服务端模块。

| 接口 | 使用方式 |
| --- | --- |
| `Button` | 原生 button 属性；`tone` 为 primary / secondary / quiet / danger / choice，`size` 为 default / small / icon；默认 type=button。`busy` 显示 Spinner 并禁用，文案由调用方提供。 |
| `buttonStyles` | 为真正的导航链接或兼容原生按钮提供同一套视觉，保留链接语义。 |
| `Input` / `Textarea` | 透传原生属性与 React 19 ref；由调用方关联 label、说明和验证。 |
| `Segmented` / `Toggle` | 原生 radio / checkbox，保留键盘选择、FormData 与 reset 语义。 |
| `SegmentedFilter` | URL 筛选适配器；保留当前状态、键盘与既有 Flip 动画，使用同一套底板和文字角色。 |
| `Badge` | neutral / draft / success / error；文字说明状态，颜色与圆点辅助识别。 |
| `Feedback` | info / success / error；默认使用 status / alert，可显式覆盖 role。用实际结果驱动，不假装保存或上传完成。 |
| `Spinner` | 与可见加载文字配合；减少运动时保持静态圆环。 |
| `Icon` | `name`、可选独立 `label`、`monochrome`。已命名控件中的图形对读屏隐藏。 |

控件圆角 10px、面板 16px。字段聚焦使用 2px 内侧墨色描边，错误字段保留错误色。按钮使用暖纸表面、轻微顶光与接触阴影；hover 改变底色和边线，按下使用内影；独立键盘焦点与至少 44px 点按区域。玻璃只留给现有悬浮层，不放进普通表单。

控件的默认 `display` 放在 `components` 层，保留 `print:hidden` 与响应式显隐工具类的优先级；焦点与材质规则保持显式。简历打印时不输出打印按钮，搜索关闭控件按桌面和手机布局显示。

保存由 `useSaveAction` 与 `SaveFields` 配合：提交先取 FormData，再用 disabled fieldset 与 inert 锁定编辑区；SaveControls 放在锁定区外显示进度，取消和同页独立删除同步禁用。保存中阻止重复提交及外部 reset；成功刷新后重置，失败保留内容并解锁。新编辑器应沿用这组契约，避免慢请求覆盖后续输入。

保存成功后说明前台最多 30 秒更新，继续输入会清除上一轮成功提示；失败保留内容，删除未确认时给出查看列表的恢复说明。Select 需要独立的 label 或 aria-labelledby，长文案换行，并按当前可见视口选择展开方向。搜索结果与恢复区独立滚动，短屏仍能关闭。上传按真实阶段反馈，继续使用原生文件选择器和原有租约协议。

`src/components/icons/paths.ts` 是原创几何的唯一来源：24px 网格、1.65px 圆头笔画、右上断口和少量琥珀收笔。纸页、眼镜、唱片与电影卷盘对应站点真实栏目；删除、播放和关闭保持识别性。`pnpm icons:export` 导出 52 枚 SVG、Sprite、预览和 `/icons/` 图录，支持尺寸、单色/双色、主题、检索与下载。

默认不添加装饰性箭头，覆盖默认、hover、focus 和伪元素。只有分享、回顶和必要媒体/方向操作保留功能符号。霓虹音符、站标原画、动画菜单、主题与音乐行为保持独立，原有字体和图形许可证见 `CREDITS.md`。
