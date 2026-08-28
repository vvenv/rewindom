/**
 * 五、技术与媒介。
 *
 * 口径：**不假装联网**。这里没有一个真的在取数——热搜、天气、在线人数全是编的，
 * 而且都在页面上说清楚它是编的。假装有数据是这一类最容易犯、也最没意思的错。
 *
 * 71 无限加载归到 `time.ts`（和 19 是同一个），72 快捷键指南归到 `work.ts`
 * （和 46 是同一个），77 读秒器归到 `time.ts`（和 8、17 是同一个）。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const MACHINE_EMBEDS: SeedEmbed[] = [
  {
    // 73 数字尸体
    title: "数字尸体",
    html:
      BOX +
      "<style>.useless-thing .ut-dead{width:100%;max-width:23rem;display:flex;" +
      "flex-direction:column;gap:.35rem;font-size:.8125rem}" +
      ".useless-thing .ut-dead-r{display:flex;justify-content:space-between;gap:1rem;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.18));padding-bottom:.3rem}" +
      ".useless-thing .ut-dead-a{color:var(--fg,#333)}" +
      ".useless-thing .ut-dead-i{width:15rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-dead-n{max-width:24em;min-height:2.6em}</style>" +
      "<div class='ut'><div class='ut-dead'></div>" +
      "<input class='ut-dead-i' type='text' />" +
      "<p class='ut-mono ut-dead-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-dead'),i=R.querySelector('.ut-dead-i')," +
      "n=R.querySelector('.ut-dead-n'),k=0,y=new Date().getFullYear();" +
      "function add(name){k++;var r=document.createElement('div');r.className='ut-dead-r';" +
      "var a=document.createElement('span');a.className='ut-dead-a';a.textContent=name;" +
      "var reg=y-4-Math.floor(Math.random()*14);" +
      "var b=document.createElement('span');" +
      "b.textContent=reg+' 年注册 · 最后登录 '+(reg+1+Math.floor(Math.random()*4))+' 年';" +
      "r.appendChild(a);r.appendChild(b);box.appendChild(r);" +
      // 年份是编的。账号是真的——它们不会自己消失
      "n.textContent='已经想起 '+k+' 个。年份是编的，账号是真的。'+" +
      "'你不在了之后它们还在。谁去注销？';}" +
      "var S=['一个再也没登录过的论坛','注册过一次的网盘','某个博客','一个买过东西的商城'];" +
      "for(var j=0;j<S.length;j++)add(S[j]);" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;add(i.value.trim());i.value='';});" +
      "})();</script>",
  },
  {
    // 74 所有 APP 都在等你
    title: "所有APP都在等你",
    html:
      BOX +
      "<style>.useless-thing .ut-apps{width:100%;max-width:23rem;display:flex;" +
      "flex-direction:column;gap:.45rem;font-size:.8125rem}" +
      ".useless-thing .ut-apps-r{display:flex;align-items:center;gap:.6rem;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.18));padding-bottom:.35rem}" +
      ".useless-thing .ut-apps-ic{width:18px;height:18px;border-radius:5px;" +
      "background:rgba(128,128,128,.3);flex:0 0 auto}" +
      ".useless-thing .ut-apps-nm{flex:1 1 auto;color:var(--fg,#333);text-align:left}" +
      ".useless-thing .ut-apps-n{max-width:24em}</style>" +
      "<div class='ut'><div class='ut-apps'></div>" +
      "<p class='ut-mono ut-apps-n'>你真的非回去不可吗？</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-apps');" +
      "var A=[['聊天','有消息 0 条'],['购物','有更新 231 条（全部不重要）']," +
      "['短视频','为你准备了 无限 条'],['邮箱','未读 1743 封']," +
      "['新闻','刚刚有 12 条你不需要知道的'],['健身','等你 214 天了']];" +
      "for(var i=0;i<A.length;i++){var r=document.createElement('div');" +
      "r.className='ut-apps-r';var ic=document.createElement('span');" +
      "ic.className='ut-apps-ic';var nm=document.createElement('span');" +
      "nm.className='ut-apps-nm';nm.textContent=A[i][0];" +
      "var c=document.createElement('span');c.textContent=A[i][1];" +
      "r.appendChild(ic);r.appendChild(nm);r.appendChild(c);box.appendChild(r);}" +
      // 数字是编的，但那个「等你」是真的：它们确实一直开着
      "})();</script>",
  },
  {
    // 75 互联网遗址
    title: "互联网遗址",
    html:
      BOX +
      "<style>.useless-thing .ut-y2k{width:100%;max-width:24rem;" +
      "border:2px outset rgba(128,128,128,.45);padding:.9rem;" +
      "font-family:ui-monospace,Menlo,monospace;font-size:.75rem;line-height:1.9;" +
      "text-align:center;background:rgba(128,128,128,.06)}" +
      ".useless-thing .ut-y2k-h{font-size:1.05rem;color:var(--fg,#333);" +
      "letter-spacing:.04em}" +
      ".useless-thing .ut-y2k-uc{display:inline-block;margin-top:.5rem;padding:.2rem .5rem;" +
      "border:1px dashed currentColor;letter-spacing:.1em}" +
      ".useless-thing .ut-y2k-uc.off{opacity:.15}" +
      ".useless-thing .ut-y2k-m{overflow:hidden;white-space:nowrap;margin-top:.5rem}" +
      ".useless-thing .ut-y2k-m span{display:inline-block}" +
      ".useless-thing .ut-y2k-c{margin-top:.6rem;opacity:.6}</style>" +
      "<div class='ut'><div class='ut-y2k'>" +
      "<div class='ut-y2k-h'>欢迎来到我的个人主页</div>" +
      "<div class='ut-y2k-m'><span>本站最佳浏览分辨率 800 x 600 · 请使用 IE5 以上浏览器</span></div>" +
      "<div class='ut-y2k-uc'>UNDER CONSTRUCTION</div>" +
      "<div class='ut-y2k-c'>您是第 000000 位访客</div>" +
      "</div><p class='ut-mono'>这一页永远在施工。作者早就不来了。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var uc=R.querySelector('.ut-y2k-uc'),m=R.querySelector('.ut-y2k-m span')," +
      "c=R.querySelector('.ut-y2k-c'),on=true,x=340;" +
      "setInterval(function(){on=!on;uc.className=on?'ut-y2k-uc':'ut-y2k-uc off';},620);" +
      // 跑马灯自己写一个：<marquee> 那个标签早就没了，跟这一页一样
      "function frame(){x-=0.6;if(x<-320)x=340;" +
      "m.style.transform='translateX('+x.toFixed(0)+'px)';requestAnimationFrame(frame);}" +
      "frame();" +
      "var v=Math.floor(Math.random()*40000);" +
      "setInterval(function(){v++;var s=String(v);" +
      "while(s.length<6)s='0'+s;c.textContent='您是第 '+s+' 位访客';},3000);})();</script>",
  },
  {
    // 76 暗号
    title: "暗号",
    html:
      BOX +
      "<style>.useless-thing .ut-sig{font-size:1.35rem;color:var(--fg,#333);" +
      "max-width:18em;line-height:2;transition:opacity .6s}" +
      ".useless-thing .ut-sig.out{opacity:0}" +
      ".useless-thing .ut-sig-n{max-width:24em}</style>" +
      "<div class='ut'><p class='ut-sig'></p>" +
      "<p class='ut-mono ut-sig-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-sig');" +
      "var S=['天亮了吗','还没有','我在','别关灯','听得见吗','那就好'," +
      "'今天也一样','明天见'];" +
      // 不随机：按整分钟取模，所有人的时钟对得上，暗号就对得上
      "function cur(){return S[Math.floor(Date.now()/20000)%S.length];}" +
      "p.textContent=cur();" +
      "setInterval(function(){var v=cur();if(v===p.textContent)return;" +
      "p.className='ut-sig out';" +
      "setTimeout(function(){p.textContent=v;p.className='ut-sig';},620);},1000);" +
      "})();</script>",
  },
  {
    // 78 今天是……
    title: "今天是",
    html:
      BOX +
      "<style>.useless-thing .ut-tod-d{font-size:1.9rem;color:var(--fg,#333);" +
      "line-height:1.4}" +
      ".useless-thing .ut-tod-s{font-size:1.05rem;max-width:18em;line-height:1.9}</style>" +
      "<div class='ut'><p class='ut-tod-d'></p><p class='ut-tod-s'></p>" +
      "<p class='ut-mono'>明天换一句。也可能不换。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var d=R.querySelector('.ut-tod-d'),s=R.querySelector('.ut-tod-s'),n=new Date();" +
      "var W=['日','一','二','三','四','五','六'];" +
      "d.textContent=(n.getMonth()+1)+' 月 '+n.getDate()+' 日 · 星期'+W[n.getDay()];" +
      "var S=['今天适合发呆。','今天适合把一件事往后放。','今天适合不回消息。'," +
      "'今天适合早点睡。','今天适合走一段不必要的路。','今天适合什么都不做。'," +
      "'今天适合把窗户打开。'];" +
      // 由日期取，不随机：同一天里刷新多少次都是这一句
      "s.textContent=S[(n.getFullYear()*372+n.getMonth()*31+n.getDate())%S.length];" +
      "})();</script>",
  },
  {
    // 79 天气出错
    title: "天气出错",
    html:
      BOX +
      "<style>.useless-thing .ut-wx{font-size:2.2rem;color:var(--fg,#333);line-height:1.4}" +
      ".useless-thing .ut-wx-r{font-family:ui-monospace,Menlo,monospace;font-size:.6875rem;" +
      "opacity:.5;max-width:24em;line-height:1.9;text-align:left}</style>" +
      "<div class='ut'><p class='ut-wx'>今日天气：错误</p>" +
      "<p class='ut-wx-r'></p>" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var r=R.querySelector('.ut-wx-r');" +
      // 一份看起来很像回事的报错。没有数据源，所以也不会有正确的那一天
      "r.textContent='ERR_NO_SOURCE · 温度 --°C · 湿度 --% · 风向 --'+" +
      "' · 数据源：无 · 上次更新：从未';})();</script>",
  },
  {
    // 80 你已阅读
    title: "你已阅读",
    html:
      BOX +
      "<style>.useless-thing .ut-rd{width:100%;max-width:22rem;display:flex;" +
      "flex-direction:column;gap:.4rem;font-size:.9375rem;text-align:left}" +
      ".useless-thing .ut-rd-r{display:flex;justify-content:space-between;gap:1rem}" +
      ".useless-thing .ut-rd-a{color:var(--fg,#333)}" +
      ".useless-thing .ut-rd-n{max-width:23em}</style>" +
      "<div class='ut'><div class='ut-rd'></div>" +
      "<p class='ut-mono ut-rd-n'>今天的阅读量很高。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-rd');" +
      "var T=[['3 篇长文章','已忘'],['5 条热搜','已忘'],['22 个短视频','已忘']," +
      "['1 份合同条款','没看'],['0 本书','没忘，因为没读']];" +
      "for(var i=0;i<T.length;i++){var r=document.createElement('div');" +
      "r.className='ut-rd-r';var a=document.createElement('span');" +
      "a.className='ut-rd-a';a.textContent=T[i][0];" +
      "var b=document.createElement('span');b.textContent=T[i][1];" +
      "r.appendChild(a);r.appendChild(b);box.appendChild(r);}})();</script>",
  },
];
