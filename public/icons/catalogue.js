const root = document.documentElement;
const theme = document.querySelector("#theme");
const query = document.querySelector("#query");
const size = document.querySelector("#size");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const tiles = [...document.querySelectorAll("li[data-name]")];
function setTheme(dark) {
  root.dataset.theme = dark ? "dark" : "light";
  theme.setAttribute("aria-pressed", String(dark));
  theme.textContent = dark ? "浅色预览" : "深色预览";
}
setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
theme.addEventListener("click", () => setTheme(root.dataset.theme !== "dark"));
query.addEventListener("input", () => {
  const needle = query.value.trim().toLowerCase();
  for (const tile of tiles) tile.hidden = !tile.dataset.name.toLowerCase().includes(needle);
  const visible = tiles.filter((tile) => !tile.hidden).length;
  count.textContent = `${visible} 枚`;
  empty.hidden = visible > 0;
});
size.addEventListener("change", () => root.style.setProperty("--icon-size", `${size.value}px`));

const ink = document.querySelector("#ink");
ink.addEventListener("click", () => {
  const duo = ink.getAttribute("aria-pressed") !== "true";
  root.dataset.ink = duo ? "duo" : "mono";
  ink.setAttribute("aria-pressed", String(duo));
  ink.textContent = duo ? "琥珀点缀：开" : "琥珀点缀：关";
});
