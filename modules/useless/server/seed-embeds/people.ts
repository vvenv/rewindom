/**
 * 二、关系与孤独。
 *
 * 这一类最容易滑进两个坑，一律不许：一是**假装认识你**（读通讯录、定位、摄像头
 * ——一个都不碰，要么让你自己填，要么明说数字是编的）；二是**替你和解**。它们
 * 只把已经发生的事摆出来，摆完就完了。
 *
 * 清单里的 28 你在看着我吗、31 消息已读模拟器在 `misc.ts`。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const PEOPLE_EMBEDS: SeedEmbed[] = [
  {
    // 21 朋友
    title: "朋友",
    html:
      BOX +
      "<style>.useless-thing .ut-fr{width:100%;max-width:22rem;display:flex;" +
      "flex-direction:column;gap:.55rem}" +
      ".useless-thing .ut-fr-r{display:flex;justify-content:space-between;gap:1rem;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.2));padding-bottom:.4rem;" +
      "font-size:.875rem}" +
      ".useless-thing .ut-fr-w{color:var(--fg,#333)}" +
      ".useless-thing .ut-fr-n{max-width:23em}</style>" +
      "<div class='ut'><div class='ut-fr'></div>" +
      "<p class='ut-mono ut-fr-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-fr'),n=R.querySelector('.ut-fr-n');" +
      // 不读通讯录。给的是关系，不是名字——名字要你自己想起来
      "var L=['高中同桌','大学室友','第一份工作带你的人','一起旅行过的那个'," +
      "'以前每天一起吃午饭的','搬走前住你隔壁的','介绍你现在这份工作的人'];" +
      "for(var i=0;i<L.length;i++){var d=30+Math.floor(Math.random()*900);" +
      "var r=document.createElement('div');r.className='ut-fr-r';" +
      "var a=document.createElement('span');a.className='ut-fr-w';a.textContent=L[i];" +
      "var b=document.createElement('span');b.textContent='上次联系：'+d+' 天前';" +
      "r.appendChild(a);r.appendChild(b);box.appendChild(r);}" +
      "n.textContent='天数是随机编的，这一页不认识你。但你刚才为每一行想到了具体的人。';" +
      "})();</script>",
  },
  {
    // 22 爸爸
    title: "爸爸",
    html:
      BOX +
      "<style>.useless-thing .ut-pa-b{font-size:2.6rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-pa-f{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}" +
      ".useless-thing .ut-pa-i{width:7rem;padding:.45rem .6rem;font:inherit;" +
      "font-size:.8125rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-pa-n{max-width:24em;min-height:3em}</style>" +
      "<div class='ut'><p class='ut-pa-b'>—</p>" +
      "<div class='ut-pa-f'>" +
      "<input class='ut-pa-i ut-pa-age' type='number' min='30' max='110' placeholder='他多大了' />" +
      "<input class='ut-pa-i ut-pa-day' type='number' min='0' max='9999' placeholder='上次通话几天前' />" +
      "</div><p class='ut-mono ut-pa-n'>填两个数。剩下的是算术。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var big=R.querySelector('.ut-pa-b'),age=R.querySelector('.ut-pa-age')," +
      "day=R.querySelector('.ut-pa-day'),n=R.querySelector('.ut-pa-n');" +
      "function go(){var a=parseInt(age.value,10),d=parseInt(day.value,10);" +
      "if(!(a>0)){big.textContent='—';return;}" +
      // 80 是个平均数，不是预言。这里不预测任何人的死期，只把算术摆出来
      "var left=Math.max(0,80-a);big.textContent=String(left);" +
      "n.textContent='按平均寿命 80 岁粗算，还剩 '+left+' 个生日可以一起过'+" +
      "(d>=0?('，你上一次打给他是 '+d+' 天前'):'')+" +
      "'。你关掉这一页之后，会马上打给他吗？';}" +
      "age.addEventListener('input',go);day.addEventListener('input',go);})();</script>",
  },
  {
    // 23 邻居
    title: "邻居",
    html:
      BOX +
      "<style>.useless-thing .ut-nb{display:block;max-width:100%;height:auto}" +
      ".useless-thing .ut-nb-i{width:14rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-nb-n{max-width:24em;min-height:2.6em}</style>" +
      "<div class='ut'><canvas class='ut-nb' width='260' height='120'></canvas>" +
      "<input class='ut-nb-i' type='text' placeholder='隔壁那家姓什么？' />" +
      "<p class='ut-mono ut-nb-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-nb'),x=c.getContext('2d')," +
      "i=R.querySelector('.ut-nb-i'),n=R.querySelector('.ut-nb-n');" +
      // 不定位、不问你住哪。两个格子加一堵墙，够了
      "x.strokeStyle='rgba(128,128,128,.5)';x.lineWidth=1;" +
      "x.strokeRect(20,20,105,80);x.strokeRect(135,20,105,80);" +
      "x.beginPath();x.moveTo(130,14);x.lineTo(130,106);x.lineWidth=2;x.stroke();" +
      "x.fillStyle='rgba(150,190,210,.5)';x.fillRect(58,52,28,18);" +
      "x.fillStyle='rgba(150,150,150,.28)';x.fillRect(173,52,28,18);" +
      "n.textContent='你在墙的这一侧住了很多年。你见过他们，在电梯里点过头。';" +
      "i.addEventListener('keydown',function(e){if(e.key!=='Enter')return;" +
      "n.textContent=i.value.trim()?'那你知道。这一页不知道，也不会记下来。'" +
      ":'空着也是一个答案。';i.value='';});})();</script>",
  },
  {
    // 24 告别练习
    title: "告别练习",
    html:
      BOX +
      "<style>.useless-thing .ut-bye{width:11rem;height:13rem;" +
      "border:1px solid var(--border,rgba(128,128,128,.4));" +
      "display:grid;place-content:center;font-size:.75rem;opacity:.65}" +
      ".useless-thing .ut-bye-i{width:17rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;transition:opacity 1.8s}" +
      ".useless-thing .ut-bye-i.go{opacity:0}" +
      ".useless-thing .ut-bye-n{max-width:23em;min-height:2.6em}</style>" +
      "<div class='ut'><div class='ut-bye'>（空的）</div>" +
      "<input class='ut-bye-i' type='text' placeholder='你今天有没有想过跟谁告别？' />" +
      "<p class='ut-mono ut-bye-n'>写下来。它不会保存，也不会发出去。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-bye-i'),n=R.querySelector('.ut-bye-n'),k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;k++;i.className='ut-bye-i go';" +
      // 打完就淡掉。大部分告别就是这样发生的：没说出口，人已经走了
      "setTimeout(function(){i.value='';i.className='ut-bye-i';},1900);" +
      "n.textContent=k===1?'你已经练习过一次了。你没有说出口。'" +
      ":'第 '+k+' 次。你早就学会了告别而不说再见。';});})();</script>",
  },
  {
    // 25 匿名拥抱
    title: "匿名拥抱",
    html:
      BOX +
      "<style>.useless-thing .ut-hug{display:block;max-width:100%;height:auto;" +
      "image-rendering:pixelated}</style>" +
      "<div class='ut'><canvas class='ut-hug' width='200' height='150'></canvas>" +
      "<p class='ut-mono'>给此刻正在看这个页面的人。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-hug'),x=c.getContext('2d');" +
      "function body(cx,dir,col,arm){x.fillStyle=col;" +
      "x.fillRect(cx-7,42,14,14);x.fillRect(cx-10,58,20,40);" +
      "x.fillRect(cx-6,98,5,24);x.fillRect(cx+1,98,5,24);" +
      "if(arm>0)x.fillRect(dir>0?cx+6:cx-6-arm,66,arm,5);}" +
      /* 靠到最近时手臂才伸出去绕到对方背后；不然两个人只是站得近而已 */
      "function frame(){var p=(Date.now()/4200)%1,e=(1-Math.cos(p*Math.PI*2))/2;" +
      "var gap=Math.round(30-e*19);x.clearRect(0,0,200,150);" +
      "var arm=Math.round(e*(gap+8));" +
      "body(100-gap,1,'#8d949a',arm);body(100+gap,-1,'#a89a92',arm);" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 26 隔空对望
    title: "隔空对望",
    html:
      BOX +
      "<style>.useless-thing .ut-sq{display:block;max-width:100%;height:auto;cursor:crosshair}" +
      ".useless-thing .ut-sq-n{max-width:24em;min-height:2.6em}</style>" +
      "<div class='ut'><canvas class='ut-sq' width='320' height='180'></canvas>" +
      "<p class='ut-mono ut-sq-n'>把鼠标放到广场上，看着长椅上那个人。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-sq'),x=c.getContext('2d'),n=R.querySelector('.ut-sq-n');" +
      "var on=false,sec=0,best=0;" +
      "c.addEventListener('pointerenter',function(){on=true;});" +
      "c.addEventListener('pointerleave',function(){on=false;sec=0;});" +
      "function frame(){x.clearRect(0,0,320,180);" +
      "x.strokeStyle='rgba(128,128,128,.3)';x.lineWidth=1;" +
      "for(var i=0;i<7;i++){x.beginPath();x.moveTo(0,60+i*20);x.lineTo(320,60+i*20);x.stroke();}" +
      "x.strokeRect(118,122,84,5);" +
      "x.beginPath();x.moveTo(124,127);x.lineTo(124,139);x.moveTo(196,127);x.lineTo(196,139);x.stroke();" +
      // 长椅上坐着一个人，很小，看不清脸。一直在那儿
      "x.fillStyle='rgba(120,120,120,.85)';x.fillRect(155,105,7,17);" +
      "x.fillRect(155,127,3,11);x.fillRect(159,127,3,11);" +
      "x.beginPath();x.arc(158.5,100,4.5,0,7);x.fill();" +
      "requestAnimationFrame(frame);}frame();" +
      "setInterval(function(){if(!on)return;sec++;if(sec>best)best=sec;" +
      "n.textContent=sec<30?('你已经看了 '+sec+' 秒。')" +
      ":('你盯着一个陌生人看了 '+sec+' 秒。这可能是你今天最长的一次对视。');},1000);" +
      "})();</script>",
  },
  {
    // 27 镜子里的你晚了 1 秒
    title: "镜子里的你晚了1秒",
    html:
      BOX +
      "<style>.useless-thing .ut-mir{display:block;max-width:100%;height:auto;" +
      "cursor:crosshair}</style>" +
      "<div class='ut'><canvas class='ut-mir' width='300' height='190'></canvas>" +
      "<p class='ut-mono'>它跟着你，晚一秒。你看不到此刻的自己。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-mir'),x=c.getContext('2d'),B=[],px=150,py=95;" +
      "c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();" +
      "B.push({t:Date.now(),x:(e.clientX-r.left)*300/r.width," +
      "y:(e.clientY-r.top)*190/r.height});});" +
      "function frame(){var cut=Date.now()-1000;" +
      // 一秒前的位置才画出来：镜子里的那个人永远是刚才的你
      "while(B.length>1&&B[1].t<=cut)B.shift();" +
      "if(B.length&&B[0].t<=cut){px=B[0].x;py=B[0].y;}" +
      "x.clearRect(0,0,300,190);x.strokeStyle='rgba(128,128,128,.75)';x.lineWidth=1.5;" +
      "x.beginPath();x.ellipse(px,py,26,33,0,0,7);x.stroke();" +
      "x.beginPath();x.arc(px-9,py-6,2.4,0,7);x.arc(px+9,py-6,2.4,0,7);" +
      "x.fillStyle='rgba(128,128,128,.75)';x.fill();" +
      "x.beginPath();x.moveTo(px-8,py+14);x.lineTo(px+8,py+14);x.stroke();" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 29 共鸣计数器
    title: "共鸣计数器",
    html:
      BOX +
      "<style>.useless-thing .ut-res{font-size:2.8rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-res-n{max-width:23em;min-height:2.6em}</style>" +
      "<div class='ut'><p class='ut-res'>0</p><p>个人和你有同样的感受。</p>" +
      "<p class='ut-mono ut-res-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-res'),n=R.querySelector('.ut-res-n')," +
      "v=1200+Math.floor(Math.random()*6000),k=0;" +
      "setInterval(function(){v+=Math.floor(Math.random()*11)-4;" +
      "e.textContent=String(v);k++;" +
      // 数字是随机跳的。归属感是真的，这就是它荒唐的地方
      "if(k===14)n.textContent='这个数字是随机跳的，没有统计任何人。';" +
      "if(k===34)n.textContent='你因为一群不认识的人产生了归属感。他们不关心你。';},700);" +
      "})();</script>",
  },
  {
    // 30 好友在线
    title: "好友在线",
    html:
      BOX +
      "<style>.useless-thing .ut-on{font-size:3.2rem;color:var(--fg,#333);line-height:1.1}" +
      ".useless-thing .ut-on-d{width:7px;height:7px;border-radius:50%;" +
      "background:currentColor;opacity:.25}</style>" +
      "<div class='ut'><div class='ut-on-d'></div><p class='ut-on'>0</p>" +
      "<p>位好友在线。</p><p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-mono'),n=0;" +
      // 它永远是 0。刷新也是 0
      "setInterval(function(){n++;" +
      "if(n===6)t.textContent='还在找。';" +
      "if(n===13)t.textContent='他们都在忙。你也是。';},1000);})();</script>",
  },
  {
    // 32 未读消息
    title: "未读消息",
    html:
      BOX +
      "<style>.useless-thing .ut-un{font-size:2.6rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-un-l{width:100%;max-width:21rem;display:flex;" +
      "flex-direction:column;gap:.4rem}" +
      ".useless-thing .ut-un-r{display:flex;justify-content:space-between;gap:1rem;" +
      "font-size:.8125rem;opacity:.75}" +
      ".useless-thing .ut-un-n{max-width:23em;min-height:2.6em}</style>" +
      "<div class='ut'><p class='ut-un'></p><p>条未读消息。</p>" +
      "<button class='ut-btn' type='button'>点进去</button>" +
      "<div class='ut-un-l'></div><p class='ut-mono ut-un-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-un'),b=R.querySelector('.ut-btn')," +
      "l=R.querySelector('.ut-un-l'),n=R.querySelector('.ut-un-n');" +
      "var N=17+Math.floor(Math.random()*40);e.textContent=String(N);" +
      "var S=['群里在聊一件跟你无关的事','一条你三天前就看过的','需要你回一个「好」'," +
      "'一个你想不起来是谁的人','转发的链接','问你在不在','没有内容，只有一个表情'];" +
      "b.addEventListener('click',function(){b.disabled=true;e.textContent='0';" +
      "for(var i=0;i<S.length;i++){var r=document.createElement('div');" +
      "r.className='ut-un-r';var a=document.createElement('span');a.textContent=S[i];" +
      "var c=document.createElement('span');c.textContent='已读';" +
      "r.appendChild(a);r.appendChild(c);l.appendChild(r);}" +
      // 未读变成已读，一条也没回。清零的不是消息，是那个红点
      "n.textContent='你看了，但你没有回复。大部分你永远不会回。';});})();</script>",
  },
  {
    // 33 社交货币汇率
    title: "社交货币汇率",
    html:
      BOX +
      "<style>.useless-thing .ut-fx{width:100%;max-width:24rem;display:flex;" +
      "flex-direction:column;gap:.5rem}" +
      ".useless-thing .ut-fx-r{display:flex;justify-content:space-between;gap:1rem;" +
      "font-size:.8125rem;border-bottom:1px solid var(--border,rgba(128,128,128,.2));" +
      "padding-bottom:.35rem}" +
      ".useless-thing .ut-fx-a{color:var(--fg,#333)}" +
      ".useless-thing .ut-fx-n{max-width:24em}</style>" +
      "<div class='ut'><div class='ut-fx'></div>" +
      "<p class='ut-mono ut-fx-n'>今日汇率，随时波动，不接受兑换。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-fx');" +
      "var T=[['1 条朋友圈','0.3 个真实的关心'],['1 条短视频','0.1 个真实的连接']," +
      "['100 个赞','1 次有人记得你的生日'],['1 小时刷手机','0 分钟被人想起']," +
      "['全部已发布的内容','一杯拿铁的价格']];" +
      "for(var i=0;i<T.length;i++){var r=document.createElement('div');" +
      "r.className='ut-fx-r';var a=document.createElement('span');" +
      "a.className='ut-fx-a';a.textContent=T[i][0];" +
      "var b=document.createElement('span');b.textContent='≈ '+T[i][1];" +
      "r.appendChild(a);r.appendChild(b);box.appendChild(r);}" +
      // 最后一行才是重点：拿铁至少你喝到了
      "var last=document.createElement('div');last.className='ut-fx-r';" +
      "var s=document.createElement('span');s.textContent='但拿铁更实在。';" +
      "last.appendChild(s);box.appendChild(last);})();</script>",
  },
  {
    // 34 别人都比你过得好
    title: "别人都比你过得好",
    html:
      BOX +
      "<style>.useless-thing .ut-news{width:100%;max-width:23rem;height:8.5rem;" +
      "overflow:hidden;position:relative}" +
      ".useless-thing .ut-news-i{position:absolute;left:0;right:0;font-size:.875rem;" +
      "line-height:1.9;text-align:center}" +
      ".useless-thing .ut-news-n{max-width:24em;min-height:2.6em}</style>" +
      "<div class='ut'><div class='ut-news'></div>" +
      "<button class='ut-btn' type='button'>关掉这一页</button>" +
      "<p class='ut-mono ut-news-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-news'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-news-n');" +
      "var S=['同学升职了','前同事发了新项目','表妹副业月入三万','邻居家孩子拿了奖'," +
      "'室友买房了','认识的人去了想去的国家','有人晒了体检全绿','有人今年读完了 52 本书'," +
      "'谁谁谁瘦了 20 斤','某个群里在恭喜某人'];" +
      "var E=[],off=0;" +
      "for(var i=0;i<S.length;i++){var e=document.createElement('div');" +
      "e.className='ut-news-i';e.textContent=S[i];box.appendChild(e);E.push(e);}" +
      "function frame(){off+=0.4;" +
      "for(var i=0;i<E.length;i++){var y=(i*34+136-off%(E.length*34));" +
      "E[i].style.top=(y%(E.length*34))+'px';" +
      "E[i].style.opacity=String(0.25+0.55*Math.sin(Math.PI*((y%(E.length*34))/(E.length*34))));}" +
      "requestAnimationFrame(frame);}frame();" +
      // 唯一能按的按钮，按了什么都不会变好——但它确实是你唯一能按的
      "b.addEventListener('click',function(){b.disabled=true;" +
      "n.textContent='关掉这一页你也不会过得更好。但你可以关掉。';});})();</script>",
  },
  {
    // 35 匿名涂鸦板
    title: "匿名涂鸦板",
    html:
      BOX +
      "<style>.useless-thing .ut-dr{display:block;max-width:100%;height:auto;" +
      "border:1px solid var(--border,rgba(128,128,128,.3));cursor:crosshair;" +
      "touch-action:none}</style>" +
      "<div class='ut'><canvas class='ut-dr' width='340' height='190'></canvas>" +
      "<p class='ut-mono'>画吧。它会自己淡掉，谁也看不到，包括这台服务器。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-dr'),x=c.getContext('2d'),S=[],cur=null;" +
      "function pt(e){var r=c.getBoundingClientRect();" +
      "return{x:(e.clientX-r.left)*340/r.width,y:(e.clientY-r.top)*190/r.height};}" +
      "c.addEventListener('pointerdown',function(e){cur={t:Date.now(),p:[pt(e)]};" +
      "S.push(cur);});" +
      "c.addEventListener('pointermove',function(e){if(cur)cur.p.push(pt(e));});" +
      "c.addEventListener('pointerup',function(){cur=null;});" +
      "c.addEventListener('pointerleave',function(){cur=null;});" +
      "function frame(){x.clearRect(0,0,340,190);var now=Date.now();" +
      // 每一笔画完就开始淡，六秒后彻底没有。不存盘、不上传
      "for(var i=S.length-1;i>=0;i--){var s=S[i],age=(now-s.t)/6000;" +
      "if(age>1&&s!==cur){S.splice(i,1);continue;}" +
      "x.strokeStyle='rgba(130,136,142,'+Math.max(0,1-age).toFixed(3)+')';" +
      "x.lineWidth=2;x.lineJoin='round';x.lineCap='round';x.beginPath();" +
      "for(var j=0;j<s.p.length;j++){if(j===0)x.moveTo(s.p[j].x,s.p[j].y);" +
      "else x.lineTo(s.p[j].x,s.p[j].y);}x.stroke();}" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 36 给陌生人的一句话
    title: "给陌生人的一句话",
    html:
      BOX +
      "<style>.useless-thing .ut-btl{position:relative;width:100%;max-width:24rem;" +
      "height:8rem;overflow:hidden}" +
      ".useless-thing .ut-btl-m{position:absolute;left:50%;bottom:0;" +
      "transform:translateX(-50%);font-size:.9375rem;color:var(--fg,#333);" +
      "white-space:nowrap}" +
      ".useless-thing .ut-btl-i{width:19rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-btl-n{max-width:24em;min-height:2.6em}</style>" +
      "<div class='ut'><div class='ut-btl'></div>" +
      "<input class='ut-btl-i' type='text' placeholder='给下一个人留一句话，回车放走' />" +
      "<p class='ut-mono ut-btl-n'>它不会发给任何人。这一页没有服务器，也没有下一个人。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-btl'),i=R.querySelector('.ut-btl-i')," +
      "n=R.querySelector('.ut-btl-n'),k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;k++;" +
      "var m=document.createElement('div');m.className='ut-btl-m';" +
      "m.textContent=i.value.trim();box.appendChild(m);i.value='';" +
      // 飘上去，淡掉，没了。它去的地方就是没有地方
      "var t0=Date.now();(function fly(){var p=(Date.now()-t0)/5200;" +
      "if(p>=1){m.remove();return;}" +
      "m.style.bottom=(p*118).toFixed(1)+'px';" +
      "m.style.opacity=(1-p).toFixed(3);requestAnimationFrame(fly);})();" +
      "n.textContent='第 '+k+' 句。它飘走了，没有到任何人手上。你还是说出来了。';});" +
      "})();</script>",
  },
  {
    // 37 点赞回收站
    title: "点赞回收站",
    html:
      BOX +
      "<style>.useless-thing .ut-lk-b{font-size:2.4rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-lk-i{width:9rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;text-align:center}" +
      ".useless-thing .ut-lk-n{max-width:24em;min-height:3em}</style>" +
      "<div class='ut'><p class='ut-lk-b'>—</p>" +
      "<input class='ut-lk-i' type='number' min='0' max='9999' placeholder='今天点了几个赞' />" +
      "<p class='ut-mono ut-lk-n'>把它们回收一下。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-lk-b'),i=R.querySelector('.ut-lk-i')," +
      "n=R.querySelector('.ut-lk-n');" +
      "i.addEventListener('input',function(){var v=parseInt(i.value,10);" +
      "if(!(v>=0)){b.textContent='—';return;}b.textContent=String(v);" +
      // 点赞是最省力的关心。省力不等于假的
      "n.textContent='你今天关心了 '+v+' 个人，每次花掉约 0.4 秒，合计 '+" +
      "(v*0.4).toFixed(1)+' 秒。他们大概率没有察觉。';});})();</script>",
  },
  {
    // 38 投影
    title: "投影",
    html:
      BOX +
      "<style>.useless-thing .ut-sil{position:relative;width:100%;max-width:26rem;" +
      "height:13rem;overflow:hidden}" +
      ".useless-thing .ut-sil-f{position:absolute;bottom:0;width:54px;height:96px;" +
      "background:rgba(120,120,120,.42);" +
      "border-radius:26px 26px 4px 4px;transition:transform .5s cubic-bezier(.4,0,.2,1)}" +
      ".useless-thing .ut-sil-h{position:absolute;bottom:88px;left:11px;width:32px;" +
      "height:32px;border-radius:50%;background:rgba(120,120,120,.42)}</style>" +
      "<div class='ut'><div class='ut-sil'>" +
      "<div class='ut-sil-f'><div class='ut-sil-h'></div></div></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-sil'),f=R.querySelector('.ut-sil-f');" +
      // 没有故事，也没有问候。镜头外的那个人只是在那儿站着
      "function put(p){f.style.transform='translateX('+p.toFixed(0)+'px)';}" +
      "var r0=box.getBoundingClientRect();put(r0.width/2-27);" +
      "box.addEventListener('pointermove',function(e){" +
      "var r=box.getBoundingClientRect();" +
      "put(Math.max(0,Math.min(r.width-54,e.clientX-r.left-27)));});})();</script>",
  },
  {
    // 39 离线
    title: "离线",
    html:
      BOX +
      "<style>.useless-thing .ut-off{font-size:2.6rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-off-n{max-width:24em;min-height:3em}</style>" +
      "<div class='ut'><p class='ut-off'>00:00</p>" +
      "<p class='ut-mono ut-off-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-off'),n=R.querySelector('.ut-off-n'),t0=Date.now();" +
      "function p2(v){return v<10?'0'+v:''+v;}" +
      "setInterval(function(){var s=Math.floor((Date.now()-t0)/1000);" +
      "e.textContent=p2(Math.floor(s/60))+':'+p2(s%60);" +
      // 它数的是「你离开网络的时间」，而你正在网上看它。这就是全部
      "n.textContent=s<12?'离线计时开始。'" +
      ":'你并没有离线。这个计时器只是在数，数的是你盯着一个离线计时器的时间。';},500);" +
      "})();</script>",
  },
  {
    // 40 删除好友的提示
    title: "删除好友的提示",
    html:
      BOX +
      "<style>.useless-thing .ut-del-r{display:flex;gap:2.6rem;justify-content:center}" +
      ".useless-thing .ut-del-v{font-size:2rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-del-c{font-size:.75rem;opacity:.6}" +
      ".useless-thing .ut-del-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-del-r'>" +
      "<div><p class='ut-del-v ut-del-a'>0</p><p class='ut-del-c'>实际删除</p></div>" +
      "<div><p class='ut-del-v ut-del-b'>0</p><p class='ut-del-c'>心里删掉</p></div>" +
      "</div><button class='ut-btn' type='button'>又想起一个</button>" +
      "<p class='ut-mono ut-del-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-del-b'),btn=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-del-n'),k=0;" +
      // 左边那个数永远是 0：名单从来没动过，动的是别的地方
      "btn.addEventListener('click',function(){k++;b.textContent=String(k);" +
      "n.textContent=k<5?'左边那个数不会变。你没删过任何人。'" +
      ":'你删掉了 '+k+' 个，他们都还在你的列表里。';});})();</script>",
  },
];
