import { AdminChrome } from "../AdminChrome";
import { RecordList } from "../ui/RecordList";
import { deleteApp, saveApp } from "../actions/apps";
import type { Field, RecordData } from "../ui/RecordForm";
import { Note } from "../ui/Note";

const FIELDS: Field[] = [
  { name: "key", label: "key", kind: "text", readOnly: true },
  { name: "name", label: "名字", kind: "text" },
  {
    name: "category",
    label: "分类",
    kind: "select",
    options: [
      { value: "desktop", label: "desktop · 桌面应用", hint: "装在电脑上的那种" },
      { value: "tool", label: "tool · 小工具", hint: "解决一件小事的东西" },
      { value: "game", label: "game · 游戏", hint: "拿来玩的" },
      { value: "website", label: "website · 网站", hint: "打开浏览器就能用" },
    ],
  },
  { name: "tagline", label: "一句话", kind: "localized" },
  { name: "description", label: "描述", kind: "localizedArea" },
  { name: "website", label: "网址", kind: "text", group: "去处" },
  {
    name: "repo",
    label: "GitHub 仓库（owner/name）",
    kind: "text",
    placeholder: "fanhefeng/fhfs",
    hint: "同步公开仓库的 Star / Fork、主要语言、代码更新时间、版本和下载文件。留空时自动识别上面的 GitHub 网址；其他网址需填写 owner/name。公开读取最多缓存 30 秒。",
    group: "去处",
  },
  { name: "platforms", label: "平台（逗号分隔）", kind: "text", group: "样子与排序" },
  {
    name: "accent",
    label: "主色（hex，暂未生效）",
    kind: "text",
    placeholder: "#b45309",
    hint: "前台的封套和唱片标签只认下面的色相，这一栏填了也不会改变页面。",
    group: "样子与排序",
  },
  { name: "hue", label: "封套色相（0–360）", kind: "number", group: "样子与排序" },
  { name: "sort", label: "排序", kind: "number", group: "样子与排序" },
];
export default function AppsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { rows } = data;

  const blank: RecordData = {
    key: "",
    name: "",
    tagline: { zh: "", en: "" },
    description: { zh: "", en: "" },
    category: "desktop",
    website: "",
    repo: "",
    platforms: "",
    accent: "",
    hue: "",
    sort: (rows.at(-1)?.sort ?? -1) + 1,
  };
  return (
    <AdminChrome title="软件" section="/admin/apps">
      <Note>key 存下来就不能改——它是这款软件在库里的身份。</Note>
      <RecordList
        action={saveApp}
        deleteAction={deleteApp}
        fields={FIELDS}
        unit="款"
        rows={rows.map((row) => ({
          id: row.key,
          label: row.name,
          meta: row.category,
          data: { ...row, platforms: row.platforms.join(", ") },
        }))}
        blank={blank}
        blankLabel="新软件"
      />
    </AdminChrome>
  );
}
