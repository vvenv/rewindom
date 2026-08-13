/**
 * 品牌常量。
 *
 * `STORAGE_PREFIX` 参与工作台认证 token 的 localStorage key 与会员 HttpOnly cookie 名。
 */
export const STORAGE_PREFIX = "rewindom";

/** 备份文件名前缀（`<prefix>_backup_<ts>.dump` 等）。 */
export const BACKUP_FILE_PREFIX = STORAGE_PREFIX;

/** 登录页、PWA、侧栏等面向用户的应用展示名。 */
export const APP_DISPLAY_NAME = "Rewindom";

/** 登录页副标题（紧凑布局 Logo 下方）。回答「这是什么」，保持功能性描述。 */
export const APP_TAGLINE = "多租户 SaaS 平台";
