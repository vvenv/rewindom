/**
 * 品牌前缀。
 *
 * 用于 localStorage key、备份文件名等**面向用户可见**的标识。集中在此的原因：
 * be-water 上游需要中性品牌，而 be-water 需保持现有值——若散落成字面量，
 * 上游化就要改十几处且每次 merge 都冲突；集中后上游只改这一行。
 *
 * **不要改动本值**：`STORAGE_PREFIX` 参与认证 token 的 localStorage key，
 * 改动会让所有已登录用户掉线，并重置其客户端偏好。
 */
export const STORAGE_PREFIX = "be-water";

/** 备份文件名前缀（`<prefix>_backup_<ts>.dump` 等）。 */
export const BACKUP_FILE_PREFIX = STORAGE_PREFIX;

/** 登录页、PWA 等面向用户的应用展示名。fork 后在此修改。 */
export const APP_DISPLAY_NAME = "be-water";

/** 登录页副标题（紧凑布局 Logo 下方）。回答「这是什么」，保持功能性描述。 */
export const APP_TAGLINE = "多租户 SaaS 平台";
