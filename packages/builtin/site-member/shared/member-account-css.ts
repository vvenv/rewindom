/**
 * 「我的账户」面板的样式 = 认证卡那一套 + 这一页多出来的东西。
 *
 * 直接把 `MEMBER_AUTH_CSS` 拼在前面，而不是让账户页去「蹭」登录页注册的那份：SSR
 * 只发本页用到的段的 CSS（`loadMarketingSiteCssFor`），而账户页上没有登录表单段——
 * 蹭来的样式在那一页根本不会被发出去，卡就裸了。
 *
 * 版式上这一页与登录卡是两件事，差别都写在下面的注释里：登录卡是一道**关口**，
 * 居中、单列、一个落点；账户页是一份**资料**，左对齐、有身份条、有轻重之分。
 */

import { MEMBER_AUTH_CSS } from "./member-auth-css.js";

export const MEMBER_ACCOUNT_CSS = `${MEMBER_AUTH_CSS}
/* 账户页比登录卡略宽：身份条上要并排放头像、名字和退出 */
.member-auth-card.member-account-card {
  max-width: 34rem;
}
/*
 * 抬头改成左对齐。居中的抬头压在左对齐的身份条上面，一张卡里两条左边缘——正是
 * member-auth-css.ts 里说的那种「最显廉价的地方」。
 */
.member-account-card .member-auth-head {
  margin-bottom: 1.25rem;
  text-align: left;
}
/* 提示坐在卡里（不像登录页那样在表单的 grid 里），得自己撑开与下面的距离 */
.member-auth-card > .member-auth-error,
.member-auth-card > .member-auth-notice {
  margin: 0 0 1.25rem;
}
/* 成功提示用主题色；错误仍是 .member-auth-error 那身红——两者不该长得一样 */
.member-auth-notice {
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--fg);
  font-size: .875rem;
  padding: .5rem .75rem;
  margin: 0;
}

/*
 * 身份条：整页唯一的视觉落点，先回答「你是谁」再谈「改什么」。
 * 窄屏时 wrap，退出按钮掉到第二行，头像和名字不会被挤扁。
 */
.member-account-identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .875rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.25rem;
}
.member-account-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  /* 这一页仅此一处上主题色：给素净的表单页一个焦点，多了就成了花的 */
  background: color-mix(in srgb, var(--accent) 12%, var(--muted-bg));
  color: var(--accent);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1;
}
.member-account-who {
  flex: 1 1 8rem;
  min-width: 0;
}
.member-account-who-name {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-account-who-email {
  margin: .125rem 0 0;
  font-size: .8125rem;
  color: var(--muted-fg);
  /* 长邮箱没有可断行的空格，不给它 anywhere 就会把卡撑破 */
  overflow-wrap: anywhere;
}
/*
 * 退出是「离开」，不是这一页的第三个主操作。放身份条右端、退成幽灵按钮之后，
 * 卡里同时只剩一枚实心按钮（保存），主次一眼看得出。
 */
.member-account-logout {
  flex: none;
  margin-left: auto;
}
.member-account-logout button {
  padding: .375rem .625rem;
  font-size: .8125rem;
  color: var(--muted-fg);
}
.member-account-logout button:hover {
  background: var(--muted-bg);
  color: var(--fg);
}

/*
 * 注册时间 / 上次登录：两栏只读的事实，摆在身份条底下。
 * 以前它夹在昵称和「保存」中间，读起来像是这张表单的一部分——其实一个字也改不了。
 * 仍是 <dl>：成对的名值，读屏软件按对念出来才对得上。
 *
 * 不给底色，只靠字号与留白分组：dark 主题下 --muted-bg 与卡面 --surface 同色，
 * 加了也看不见，只会让明暗两套长得不一样。
 */
.member-account-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .5rem 1rem;
  margin: 0 0 1.5rem;
}
.member-account-meta > div {
  min-width: 0;
}
.member-account-meta dt {
  font-size: .75rem;
  line-height: 1.4;
  color: var(--muted-fg);
}
.member-account-meta dd {
  margin: .1875rem 0 0;
  font-size: .875rem;
  font-weight: 500;
  line-height: 1.4;
}

/* 资料 / 改密码各自一块——内补白交给块里的零件，抽屉的 summary 才能整条可点 */
.member-account-block {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + .125rem);
  background: color-mix(in srgb, var(--muted-bg) 55%, var(--surface));
}
.member-account-block + .member-account-block {
  margin-top: .75rem;
}
.member-auth-card.member-account-card.is-plain .member-account-block {
  background: var(--muted-bg);
}
.member-account-block > form {
  padding: 0 1.375rem 1.25rem;
}
.member-account-block-head {
  padding: 1.125rem 1.375rem .875rem;
}
/* 标题在资料块里是 h3、在抽屉里是 summary 中的 span，两处共用这一份字号 */
.member-account-block-title {
  display: block;
  margin: 0;
  font-size: .9375rem;
  font-weight: 600;
  line-height: 1.35;
}
.member-account-block-desc {
  display: block;
  margin: .25rem 0 0;
  font-size: .8125rem;
  line-height: 1.45;
  color: var(--muted-fg);
}

/*
 * 改密码是一块**抽屉**（<details>）。
 *
 * 平时收着：多数人来这一页是改个昵称，没必要先跨过三个密码框。用 details 而不是
 * 一个 JS 弹层，是因为这一页的前提就是「没有 bundle 也能用」——原生开合不需要脚本。
 */
.member-account-summary {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: 1.125rem 1.375rem;
  cursor: pointer;
  list-style: none;
}
.member-account-summary::-webkit-details-marker {
  display: none;
}
.member-account-summary:hover .member-account-block-title {
  color: var(--accent);
}
.member-account-summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: calc(var(--radius) + .125rem);
}
.member-account-summary-text {
  flex: 1 1 auto;
  min-width: 0;
}
/* 展开后 summary 与表单挨得近一些，读作「这一块的标题」而不是又一块 */
.member-account-disclosure[open] .member-account-summary {
  padding-bottom: .875rem;
}
/* 折角箭头用边框画，省掉两端各存一份 SVG（两份迟早会长歪） */
.member-account-summary-mark {
  position: relative;
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--muted-fg);
}
.member-account-summary-mark::before {
  content: "";
  position: absolute;
  left: .3125rem;
  top: .3125rem;
  width: .5rem;
  height: .5rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform .15s ease;
}
.member-account-disclosure[open] .member-account-summary-mark::before {
  top: .5rem;
  transform: rotate(-135deg);
}
@media (prefers-reduced-motion: reduce) {
  .member-account-summary-mark::before {
    transition: none;
  }
}

/*
 * 提交键靠右，不再整宽。
 *
 * 整宽的按钮在登录页是对的——那一页只有一个动作，铺满就是「往下走」。账户页有两个
 * 表单，三条整宽色带竖着摞起来，反而看不出哪个是主操作。窄屏例外：一行放不下时
 * 铺满比缩在角落好按。
 */
.member-account-actions {
  display: flex;
  justify-content: flex-end;
  gap: .5rem;
  margin-top: .25rem;
}
@media (max-width: 480px) {
  .member-account-actions .btn {
    width: 100%;
  }
}
`;
