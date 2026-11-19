# WebMCP

fhfs 的公开页面通过浏览器原生 `document.modelContext` 提供以下工具。

| 工具 | 参数 | 行为 |
| --- | --- | --- |
| `fhfs_search` | `query`；可选 `locale`、`kind`、`limit`（1–20，默认 10） | 复用站内搜索索引、匹配和排序，返回标题、摘要、类型和本地化路径。 |
| `fhfs_list_sections` | 可选 `locale` | 列出当前公开导航中的栏目及路径。 |
| `fhfs_read_article` | `path` | 读取 `/{locale}/blog/{slug}` 的已发布文章。返回 HTML 正文、标题、摘要、日期、标签、实际语言及规范链接。 |
| `fhfs_open_page` | `path` | 在当前标签页打开 `fhfs_search` 或 `fhfs_list_sections` 返回的公开页面。 |

`locale` 为 `zh` 或 `en`，默认使用当前页面语言。`kind` 与搜索面板一致：`page`、`post`、`secret`、`app`、`lab`、`film`、`idol`、`moment`。`secret` 是现有公开索引中的已发布内容类型，不代表管理后台的私有内容。

工具只在公开页面挂载。语言切换和组件卸载时通过 `AbortSignal` 注销，并取消尚在读取的请求。搜索和栏目读取使用匿名 GET 请求访问 `/{locale}/search.json`。文章正文请求按需访问 `/{locale}/blog/{slug}/article.json`，沿用公开文章页面的已发布版本和语言回退规则。导航只接受公开索引内的本地化地址。

在支持网站工具的 ChatGPT 或 Codex 桌面应用中，用内置浏览器打开站点后，可以对助手说「用网站工具搜索 TypeScript 文章并读取正文」。普通浏览器仍可使用页面和站内搜索。 [OpenAI 的网站工具说明](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)

## 本地验证

1. 使用项目要求的 Node 24 / pnpm 11，运行 `pnpm dev`。
2. 使用支持 WebMCP 的浏览器。Chrome 本地测试可在 `chrome://flags/#enable-webmcp-testing` 开启实验功能并重启；页面须为 HTTPS 或 localhost 安全上下文。
3. 打开 `/zh`，在 DevTools 的 WebMCP 面板或 Model Context Tool Inspector 中确认四个 `fhfs_` 工具。
4. 调用 `fhfs_list_sections({})`；再调用 `fhfs_search({"query":"React","kind":"post"})`，确认结果来自公开内容。
5. 将文章的 `path` 传给 `fhfs_read_article`，检查返回的正文、实际语言和规范链接。将同一路径传给 `fhfs_open_page`，确认浏览器完成导航。搜索时使用 `locale: "en"` 可获取英文路径。
6. 将 `/admin` 或站外地址传给正文工具，确认返回 `INVALID_INPUT`；格式正确但未发布的文章路径返回 `NOT_FOUND`。公开接口暂不可用时返回 `UNAVAILABLE`。取消中的操作返回 `CANCELLED`。
7. 切换语言后确认只注册一组工具。进入 `/admin/login` 或草稿预览时，公开工具应解除注册。关闭实验功能后检查普通页面与搜索仍可使用。

浏览器中也可使用原生 API 检查（Chrome 155+ 接收对象参数）：

```js
const tools = await document.modelContext.getTools();
const sections = tools.find((tool) => tool.name === "fhfs_list_sections");
JSON.parse(await document.modelContext.executeTool(sections, {}));
```

完整检查使用 `pnpm check`、`pnpm build` 和本地公开页面 smoke。测试不向生产数据库写入。

## 参考

- [Chrome WebMCP](https://developer.chrome.com/docs/ai/webmcp)
- [Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [WebMCP 草案](https://webmachinelearning.github.io/webmcp/)
