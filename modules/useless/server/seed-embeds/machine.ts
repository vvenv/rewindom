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
import { BOX, MEM } from "./shell.js";

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
      "<style>.useless-thing .ut-apps{width:100%;max-width:24rem;display:flex;" +
      "flex-direction:column;gap:.5rem;font-size:.8125rem}" +
      ".useless-thing .ut-apps-r{display:flex;align-items:center;gap:.6rem;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.18));padding-bottom:.4rem}" +
      ".useless-thing .ut-apps-ic{width:18px;height:18px;border-radius:5px;" +
      "background:rgba(128,128,128,.3);flex:0 0 auto}" +
      ".useless-thing .ut-apps-nm{flex:1 1 auto;color:var(--fg,#333);text-align:left}" +
      ".useless-thing .ut-apps-c{font-variant-numeric:tabular-nums;min-width:5em;" +
      "text-align:right;transition:opacity .3s}" +
      ".useless-thing .ut-apps-b{font:inherit;font-size:.75rem;padding:.15rem .55rem;" +
      "border:1px solid currentColor;background:transparent;color:inherit;" +
      "border-radius:0;cursor:pointer;flex:0 0 auto}" +
      ".useless-thing .ut-apps-b:disabled{opacity:.25;cursor:default}</style>" +
      "<div class='ut'><div class='ut-apps'></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-apps');" +
      "var A=[['聊天',12],['购物',231],['短视频',884],['邮箱',1743]," +
      "['新闻',36],['健身',214]];" +
      "for(var i=0;i<A.length;i++){(function(name,n0){" +
      "var r=document.createElement('div');r.className='ut-apps-r';" +
      "var ic=document.createElement('span');ic.className='ut-apps-ic';" +
      "var nm=document.createElement('span');nm.className='ut-apps-nm';nm.textContent=name;" +
      "var c=document.createElement('span');c.className='ut-apps-c';" +
      "var b=document.createElement('button');b.type='button';" +
      "b.className='ut-apps-b';b.textContent='已读';var n=n0;" +
      "function draw(){c.textContent=n+' 条';b.disabled=n<=0;}" +
      "draw();" +
      // 清完它就自己长回来，而且比清之前多。「已读」这个按钮是净负的
      "b.addEventListener('click',function(){var was=n;n=0;draw();" +
      "c.style.opacity='.3';" +
      "setTimeout(function(){n=Math.ceil(was*1.4)+1;c.style.opacity='1';draw();},2800);});" +
      "r.appendChild(ic);r.appendChild(nm);r.appendChild(c);r.appendChild(b);" +
      "box.appendChild(r);})(A[i][0],A[i][1]);}" +
      "})();</script>",
  },
  {
    // 75 互联网遗址
    title: "互联网遗址",
    html:
      BOX +
      "<style>.useless-thing .ut-y2k{width:100%;max-width:25rem;" +
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
      ".useless-thing .ut-y2k-gb{margin-top:.7rem;text-align:left;" +
      "display:flex;flex-direction:column;gap:.25rem}" +
      ".useless-thing .ut-y2k-gb div{border-top:1px dotted rgba(128,128,128,.4);" +
      "padding-top:.25rem}" +
      ".useless-thing .ut-y2k-gb b{font-weight:400;color:var(--fg,#333)}" +
      ".useless-thing .ut-y2k-i{width:100%;margin-top:.6rem;font:inherit;" +
      "font-size:.75rem;padding:.3rem .4rem;background:rgba(255,255,255,.5);" +
      "border:2px inset rgba(128,128,128,.4);color:inherit;outline:none;" +
      "border-radius:0;text-align:left}" +
      ".useless-thing .ut-y2k-c{margin-top:.6rem;opacity:.6}</style>" +
      "<div class='ut'><div class='ut-y2k'>" +
      "<div class='ut-y2k-h'>欢迎来到我的个人主页</div>" +
      "<div class='ut-y2k-m'><span>本站最佳浏览分辨率 800 x 600 · 请使用 IE5 以上浏览器</span></div>" +
      "<div class='ut-y2k-uc'>UNDER CONSTRUCTION</div>" +
      "<div class='ut-y2k-gb'></div>" +
      "<input class='ut-y2k-i' type='text' maxlength='40' placeholder='在留言簿上签个名' />" +
      "<div class='ut-y2k-c'>您是第 000000 位访客</div>" +
      "</div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var uc=R.querySelector('.ut-y2k-uc'),m=R.querySelector('.ut-y2k-m span')," +
      "c=R.querySelector('.ut-y2k-c'),gb=R.querySelector('.ut-y2k-gb')," +
      "i=R.querySelector('.ut-y2k-i'),on=true,x=340;" +
      "setInterval(function(){on=!on;uc.className=on?'ut-y2k-uc':'ut-y2k-uc off';},620);" +
      // 跑马灯自己写一个：<marquee> 那个标签早就没了，跟这一页一样
      "function frame(){x-=0.6;if(x<-320)x=340;" +
      "m.style.transform='translateX('+x.toFixed(0)+'px)';requestAnimationFrame(frame);}" +
      "frame();" +
      "var v=Math.floor(Math.random()*40000);" +
      "setInterval(function(){v++;var s=String(v);" +
      "while(s.length<6)s='0'+s;c.textContent='您是第 '+s+' 位访客';},3000);" +
      // 留言真的留得下（下次回来还在），但日期永远是 2003 年：
      // 你签的名不会让这一页活过来，只会变成遗址的一部分
      "var log=M.get('y2k','');" +
      "function draw(){gb.textContent='';var L=log?log.split('\\n'):[];" +
      "for(var k=0;k<L.length&&k<5;k++){var p=L[k].split('|');" +
      "var d=document.createElement('div');var b=document.createElement('b');" +
      "b.textContent=p[1]||'';d.appendChild(b);" +
      "var t=document.createElement('span');" +
      "t.textContent=' —— 匿名 · 2003 年 '+p[0]+' 月';d.appendChild(t);" +
      "gb.appendChild(d);}}" +
      "draw();" +
      "i.addEventListener('keydown',function(e){if(e.key!=='Enter')return;" +
      "var t=i.value.trim();if(!t)return;i.value='';" +
      "var mo=1+Math.floor(Math.random()*12);" +
      "log=mo+'|'+t.replace(/[|\\n]/g,' ')+(log?'\\n'+log:'');" +
      "log=log.split('\\n').slice(0,5).join('\\n');M.set('y2k',log);draw();});" +
      "})();</script>",
  },
  {
    // 76 暗号
    title: "暗号",
    html:
      BOX +
      "<style>.useless-thing .ut-sig{font-size:1.35rem;color:var(--fg,#333);" +
      "max-width:18em;line-height:2;transition:opacity .6s}" +
      ".useless-thing .ut-sig.out{opacity:0}" +
      ".useless-thing .ut-sig-i{width:min(16rem,80%);font:inherit;font-size:.9375rem;" +
      "text-align:center;background:transparent;color:inherit;border:0;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.3));" +
      "padding:.4rem 0;outline:none;border-radius:0}" +
      ".useless-thing .ut-sig-i:focus{border-bottom-color:currentColor}</style>" +
      "<div class='ut'><p class='ut-sig'></p>" +
      "<input class='ut-sig-i' type='text' maxlength='12' />" +
      "<p class='ut-mono ut-sig-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-sig'),i=R.querySelector('.ut-sig-i')," +
      "n=R.querySelector('.ut-sig-n');" +
      "var S=['天亮了吗','还没有','我在','别关灯','听得见吗','那就好'," +
      "'今天也一样','明天见'];" +
      // 不随机：按二十秒一格取模，所有人的时钟对得上，暗号就对得上
      "var mine=null,slot=-1,shown='';" +
      "function box(){return Math.floor(Date.now()/20000);}" +
      "function cur(){return mine!==null?mine:S[box()%S.length];}" +
      "function show(v){p.className='ut-sig out';" +
      "setTimeout(function(){p.textContent=v;shown=v;p.className='ut-sig';},620);}" +
      "p.textContent=cur();shown=p.textContent;" +
      // 你说的话也只占一格。下一格到了就被冲掉，跟别人的那几句一样
      "i.addEventListener('keydown',function(e){if(e.key!=='Enter')return;" +
      "var v=i.value.trim();if(!v)return;i.value='';mine=v;slot=box();show(v);});" +
      "setInterval(function(){" +
      "if(mine!==null&&box()!==slot)mine=null;" +
      "var v=cur();if(v!==shown&&p.className!=='ut-sig out')show(v);" +
      "n.textContent=String(20-Math.floor(Date.now()/1000)%20);},250);" +
      "})();</script>",
  },
  {
    // 78 今天是……
    title: "今天是",
    html:
      BOX +
      "<style>.useless-thing .ut-tod-d{font-size:1.9rem;color:var(--fg,#333);" +
      "line-height:1.4}" +
      ".useless-thing .ut-tod-s{font-size:1.05rem;max-width:18em;line-height:1.9;" +
      "cursor:pointer;transition:opacity .35s}" +
      ".useless-thing .ut-tod-s.out{opacity:0}" +
      ".useless-thing .ut-tod-n{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-tod-d'></p><p class='ut-tod-s'></p>" +
      "<p class='ut-mono ut-tod-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var d=R.querySelector('.ut-tod-d'),s=R.querySelector('.ut-tod-s')," +
      "lab=R.querySelector('.ut-tod-n'),now=new Date();" +
      "var W=['日','一','二','三','四','五','六'];" +
      "d.textContent=(now.getMonth()+1)+' 月 '+now.getDate()+' 日 · 星期'+W[now.getDay()];" +
      "var S=['今天适合发呆。','今天适合把一件事往后放。','今天适合不回消息。'," +
      "'今天适合早点睡。','今天适合走一段不必要的路。','今天适合把窗户开着。'," +
      "'今天适合把没用的东西留着。','今天适合什么都不做。'];" +
      // 由日期起头，不随机：同一天里刷新多少次都是这一句
      "var base=(now.getFullYear()*372+now.getMonth()*31+now.getDate())%S.length;" +
      "var key=now.toDateString(),k=(M.get('todday','')===key)?M.num('todk',0):0;" +
      "M.set('todday',key);M.set('todk',k);" +
      "function draw(){s.textContent=S[(base+k)%S.length];" +
      "lab.textContent=k>0?'今天换过 '+k+' 次':'';}" +
      "draw();" +
      // 换是有限的：一天只有这么多句，换完就停在最后那句上。明天归零
      "s.addEventListener('click',function(){if(k>=S.length-1)return;" +
      "k++;M.set('todk',k);s.className='ut-tod-s out';" +
      "setTimeout(function(){draw();s.className='ut-tod-s';},360);});" +
      "})();</script>",
  },
  {
    // 79 天气出错
    title: "天气出错",
    html:
      BOX +
      "<style>.useless-thing .ut-wx{font-size:2.2rem;color:var(--fg,#333);line-height:1.4}" +
      ".useless-thing .ut-wx-r{font-family:ui-monospace,Menlo,monospace;font-size:.6875rem;" +
      "opacity:.5;max-width:26em;line-height:1.9;text-align:left;min-height:3.6em}" +
      ".useless-thing .ut-wx-n{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-wx'>今日天气：错误</p>" +
      "<p class='ut-wx-r'></p><button class='ut-btn' type='button'>重试</button>" +
      "<p class='ut-mono ut-wx-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var r=R.querySelector('.ut-wx-r'),b=R.querySelector('.ut-btn')," +
      "lab=R.querySelector('.ut-wx-n');" +
      "var n=M.num('wx',0),busy=false;" +
      // 重试次数攒着。没有数据源，所以试到哪一次都不会有正确的那一天，
      // 只有错误码会跟着越来越长
      "function code(){if(n>=30)return 'ERR_NO_SOURCE_AND_NO_PLAN_TO_ADD_ONE';" +
      "if(n>=20)return 'ERR_STILL_NO_SOURCE_STOP_ASKING';" +
      "if(n>=10)return 'ERR_STILL_NO_SOURCE';return 'ERR_NO_SOURCE';}" +
      "function draw(){r.textContent=code()+' · 温度 --°C · 湿度 --% · 风向 --'+" +
      "' · 数据源：无 · 上次更新：从未';" +
      "lab.textContent=n>0?'已重试 '+n+' 次':'';}" +
      "draw();" +
      "b.addEventListener('click',function(){if(busy)return;busy=true;" +
      "b.disabled=true;r.textContent='正在连接数据源……';" +
      "setTimeout(function(){n++;M.set('wx',n);draw();b.disabled=false;busy=false;},1200);});" +
      "})();</script>",
  },
  {
    // 80 你已阅读
    title: "你已阅读",
    html:
      BOX +
      "<style>.useless-thing .ut-rd{width:100%;max-width:22rem;display:flex;" +
      "flex-direction:column;gap:.5rem;font-size:.9375rem;text-align:left}" +
      ".useless-thing .ut-rd-r{display:flex;justify-content:space-between;gap:1rem;" +
      "cursor:pointer}" +
      ".useless-thing .ut-rd-r.keep{cursor:default}" +
      ".useless-thing .ut-rd-a{color:var(--fg,#333)}" +
      ".useless-thing .ut-rd-a span{transition:opacity .5s}" +
      ".useless-thing .ut-rd-n{min-height:1.2em}</style>" +
      "<div class='ut'><div class='ut-rd'></div>" +
      "<p class='ut-mono ut-rd-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-rd'),lab=R.querySelector('.ut-rd-n'),done=0;" +
      "var T=[['3 篇长文章','已忘',1],['5 条热搜','已忘',1],['22 个短视频','已忘',1]," +
      "['1 份合同条款','没看',1],['0 本书','没忘，因为没读',0]];" +
      "for(var i=0;i<T.length;i++){(function(row){" +
      "var r=document.createElement('div');" +
      "r.className=row[2]?'ut-rd-r':'ut-rd-r keep';" +
      "var a=document.createElement('span');a.className='ut-rd-a';" +
      "for(var k=0;k<row[0].length;k++){var s=document.createElement('span');" +
      "s.textContent=row[0].charAt(k);a.appendChild(s);}" +
      "var b=document.createElement('span');b.textContent=row[1];" +
      "r.appendChild(a);r.appendChild(b);box.appendChild(r);" +
      // 点一行，那行读过的东西就真的一个字一个字忘掉。
      // 最后一行点不动——没读过的东西忘不掉
      "if(!row[2])return;var gone=false;" +
      "r.addEventListener('click',function(){if(gone)return;gone=true;done++;" +
      "lab.textContent='已忘掉 '+done+' 行';" +
      "for(var j=0;j<a.children.length;j++){(function(el,d){" +
      "setTimeout(function(){el.style.opacity='0';},d*90);})(a.children[j],j);}});" +
      "})(T[i]);}" +
      "})();</script>",
  },
];
