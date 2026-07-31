import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";

import auditEn from "./locales/en/audit.json";
import backgroundJobEn from "./locales/en/background-job.json";
import billingEn from "./locales/en/billing.json";
import commonEn from "./locales/en/common.json";
import marketingEn from "./locales/en/marketing.json";
import dashboardEn from "./locales/en/dashboard.json";
import errorLogEn from "./locales/en/error-log.json";
import notesEn from "./locales/en/notes.json";
import notificationEn from "./locales/en/notification.json";
import platformEn from "./locales/en/platform.json";
import rbacEn from "./locales/en/rbac.json";
import shellEn from "./locales/en/shell.json";
import slowQueryEn from "./locales/en/slow-query.json";
import todosEn from "./locales/en/todos.json";
import userEn from "./locales/en/user.json";
import auditZh from "./locales/zh-CN/audit.json";
import backgroundJobZh from "./locales/zh-CN/background-job.json";
import billingZh from "./locales/zh-CN/billing.json";
import commonZh from "./locales/zh-CN/common.json";
import marketingZh from "./locales/zh-CN/marketing.json";
import dashboardZh from "./locales/zh-CN/dashboard.json";
import errorLogZh from "./locales/zh-CN/error-log.json";
import notesZh from "./locales/zh-CN/notes.json";
import notificationZh from "./locales/zh-CN/notification.json";
import platformZh from "./locales/zh-CN/platform.json";
import rbacZh from "./locales/zh-CN/rbac.json";
import shellZh from "./locales/zh-CN/shell.json";
import slowQueryZh from "./locales/zh-CN/slow-query.json";
import todosZh from "./locales/zh-CN/todos.json";
import userZh from "./locales/zh-CN/user.json";

export const I18N_NAMESPACES = [
  "common",
  "shell",
  "todos",
  "notes",
  "user",
  "billing",
  "rbac",
  "dashboard",
  "notification",
  "audit",
  "background-job",
  "error-log",
  "slow-query",
  "platform",
  "marketing",
] as const;

const resources = {
  "zh-CN": {
    common: commonZh,
    shell: shellZh,
    todos: todosZh,
    notes: notesZh,
    user: userZh,
    billing: billingZh,
    rbac: rbacZh,
    dashboard: dashboardZh,
    notification: notificationZh,
    audit: auditZh,
    "background-job": backgroundJobZh,
    "error-log": errorLogZh,
    "slow-query": slowQueryZh,
    platform: platformZh,
    marketing: marketingZh,
  },
  en: {
    common: commonEn,
    shell: shellEn,
    todos: todosEn,
    notes: notesEn,
    user: userEn,
    billing: billingEn,
    rbac: rbacEn,
    dashboard: dashboardEn,
    notification: notificationEn,
    audit: auditEn,
    "background-job": backgroundJobEn,
    "error-log": errorLogEn,
    "slow-query": slowQueryEn,
    platform: platformEn,
    marketing: marketingEn,
  },
} as const;

let initialized = false;

/** 幂等初始化；可在测试里重复调用。 */
export function setupI18n(locale: AppLocale = DEFAULT_LOCALE): typeof i18n {
  if (!initialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: normalizeLocale(locale),
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: "common",
      ns: [...I18N_NAMESPACES],
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    initialized = true;
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(normalizeLocale(locale));
  }
  return i18n;
}

export function getI18n(): typeof i18n {
  return setupI18n();
}

export async function changeAppLanguage(locale: AppLocale): Promise<void> {
  const next = normalizeLocale(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  await setupI18n().changeLanguage(next);
}

export { i18n };
