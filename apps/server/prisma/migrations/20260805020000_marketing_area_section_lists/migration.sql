-- 页头 / 页脚从「各一个 section」改成「各一串 section」。
--
-- 这样公告条、备案号之类的东西就是往区域里加一段普通 section，不用为每种花样
-- 在 header/footer 的 schema 上再长一个字段。允许放什么由 registry 的 `placements`
-- 声明，读写两侧共用。
--
-- 读路径不再认单对象形态（没有兼容层），所以这里把存量的单对象包成单元素数组。
-- 已经是数组的、以及空值，都原样留给 `safeAreaSections` 兜底。

UPDATE "MarketingSite"
SET nav_json = jsonb_build_array(nav_json)
WHERE jsonb_typeof(nav_json) = 'object';

UPDATE "MarketingSite"
SET footer_json = jsonb_build_array(footer_json)
WHERE jsonb_typeof(footer_json) = 'object';
