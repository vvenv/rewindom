/**
 * 一、时间与存在。
 *
 * 这一类的共同口径：**只陈述，不安慰**。时间被拿走了就是被拿走了，页面不负责
 * 让你好受一点——一句「但这也没关系」会把整件事变成鸡汤，那就白做了。
 *
 * 清单里的 1 时钟在撒谎、4 呼吸的像素、13 风、14 重力、18 地平线在 `misc.ts`
 * （写在分类之前，不搬）。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const TIME_EMBEDS: SeedEmbed[] = [
  {
    // 2 落下的沙子
    title: "落下的沙子",
    html:
      BOX +
      "<style>.useless-thing .ut-sand{display:block;max-width:100%;height:auto}" +
      ".useless-thing .ut-sand-w{max-width:24em}</style>" +
      "<div class='ut'><canvas class='ut-sand' width='220' height='250'></canvas>" +
      "<p class='ut-mono ut-sand-w'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-sand'),x=c.getContext('2d')," +
      "t=R.querySelector('.ut-sand-w'),W=220,H=250,t0=Date.now(),P=[];" +
      "function frame(){x.clearRect(0,0,W,H);" +
      "x.strokeStyle='rgba(128,128,128,.4)';x.lineWidth=1;x.beginPath();" +
      "x.moveTo(34,18);x.lineTo(186,18);x.lineTo(114,124);x.lineTo(186,232);" +
      "x.lineTo(34,232);x.lineTo(106,124);x.closePath();x.stroke();" +
      // 上半永远是满的：漏了这么久，它一点没少。少的是你的
      "x.fillStyle='#9aa0a6';x.beginPath();x.moveTo(38,24);x.lineTo(182,24);" +
      "x.lineTo(112,122);x.lineTo(108,122);x.closePath();x.fill();" +
      "if(Math.random()<0.75)P.push({x:110+(Math.random()-.5)*4,y:124,v:0.5});" +
      "for(var i=P.length-1;i>=0;i--){var p=P[i];p.y+=p.v;p.v+=0.05;" +
      // 到底就没了，下面一粒也不攒——攒起来就成了「还剩多少」，那是另一回事
      "if(p.y>228){P.splice(i,1);continue;}x.fillRect(p.x,p.y,2,2);}" +
      "t.textContent='你盯着它看了 '+Math.floor((Date.now()-t0)/1000)+" +
      "' 秒。落下去的沙子没有攒在下面，上面也一点没少。';" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 3 倒着走的人生
    title: "倒着走的人生",
    html:
      BOX +
      "<style>.useless-thing .ut-rev-t{font-size:2.4rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2;margin:0}" +
      ".useless-thing .ut-rev-d{font-size:1.05rem;margin:0}" +
      ".useless-thing .ut-rev-in{padding:.4rem .6rem;font:inherit;font-size:.8125rem;" +
      "border:1px solid var(--border,#ccc);border-radius:4px;background:transparent;" +
      "color:inherit}" +
      ".useless-thing .ut-rev-n{max-width:24em}</style>" +
      "<div class='ut'><p class='ut-rev-t'>--:--:--</p><p class='ut-rev-d'></p>" +
      "<input class='ut-rev-in' type='date' aria-label='你出生那天' />" +
      "<p class='ut-mono ut-rev-n'>时间在倒着走。填一个出生日期，日期也跟着往回流。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var ct=R.querySelector('.ut-rev-t'),cd=R.querySelector('.ut-rev-d')," +
      "inp=R.querySelector('.ut-rev-in'),t=R.querySelector('.ut-rev-n');" +
      "var t0=Date.now(),cur=new Date(),iv=null;" +
      "function p2(n){return n<10?'0'+n:''+n;}" +
      // 时钟按真实秒数倒退：你在这里坐了多久，它就往回走多久
      "setInterval(function(){var d=new Date(t0-(Date.now()-t0));" +
      "ct.textContent=p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds());},90);" +
      "function show(){cd.textContent=cur.getFullYear()+' 年 '+(cur.getMonth()+1)+" +
      "' 月 '+cur.getDate()+' 日';}show();" +
      "inp.addEventListener('change',function(){" +
      "if(!inp.value)return;var stop=new Date(inp.value+'T00:00:00');" +
      "if(isNaN(stop.getTime())||stop>cur){t.textContent='那天还没到。';return;}" +
      "inp.disabled=true;if(iv)clearInterval(iv);" +
      "iv=setInterval(function(){if(cur<=stop){clearInterval(iv);" +
      "t.textContent='到了。你出生那天，这块表停在这里。刷新一次，再倒着走一遍。';return;}" +
      "cur=new Date(cur.getTime()-86400000);show();" +
      "t.textContent='还剩 '+Math.round((cur-stop)/86400000)+' 天回到你出生那天。';},55);});" +
      "})();</script>",
  },
  {
    // 5 人生进度条（正确版）
    title: "人生进度条",
    html:
      BOX +
      "<style>.useless-thing .ut-life{width:17rem;height:6px;" +
      "background:var(--border,rgba(128,128,128,.25));overflow:hidden}" +
      ".useless-thing .ut-life-f{height:100%;width:0;background:currentColor;" +
      "transition:width .4s ease-out}" +
      ".useless-thing .ut-life-r{width:17rem;accent-color:currentColor}" +
      ".useless-thing .ut-life-n{max-width:24em;min-height:3em}" +
      ".useless-thing .ut-life-b{font-size:1.6rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums}</style>" +
      "<div class='ut'><p class='ut-life-b'>0%</p>" +
      "<div class='ut-life'><div class='ut-life-f'></div></div>" +
      "<input class='ut-life-r' type='range' min='0' max='16' step='0.5' value='6' " +
      "aria-label='每天在屏幕前的小时数' />" +
      "<p class='ut-mono ut-life-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var r=R.querySelector('.ut-life-r'),f=R.querySelector('.ut-life-f')," +
      "b=R.querySelector('.ut-life-b'),n=R.querySelector('.ut-life-n');" +
      // 这条不是「命还剩多少」——那种进度条到处都是。它算的是屏幕拿走的那部分
      "function go(){var h=parseFloat(r.value),p=h/24*100,y=80*h/24;" +
      "f.style.width=p.toFixed(1)+'%';b.textContent=p.toFixed(1)+'%';" +
      "n.textContent='每天 '+h+' 小时。按活到 80 岁算，其中 '+y.toFixed(1)+" +
      "' 年在屏幕前。这条走完不是你死了，是你抬了下头。';}" +
      "r.addEventListener('input',go);go();})();</script>",
  },
  {
    // 6 你的一生将在这里度过
    title: "你的一生将在这里度过",
    html:
      BOX +
      "<style>.useless-thing .ut-room{display:block;max-width:100%;height:auto}" +
      ".useless-thing .ut-room-r{width:15rem;accent-color:currentColor}" +
      ".useless-thing .ut-room-n{max-width:25em;min-height:3em}</style>" +
      "<div class='ut'><canvas class='ut-room' width='300' height='190'></canvas>" +
      "<input class='ut-room-r' type='range' min='1' max='45' value='20' " +
      "aria-label='已经这样坐了几年' />" +
      "<p class='ut-mono ut-room-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-room'),x=c.getContext('2d')," +
      "r=R.querySelector('.ut-room-r'),n=R.querySelector('.ut-room-n');" +
      "function frame(){x.clearRect(0,0,300,190);" +
      "x.strokeStyle='rgba(128,128,128,.45)';x.lineWidth=1;x.strokeRect(20,16,260,158);" +
      // 俯视图：一张桌子、一把椅子、一块亮着的屏幕。房间里没有别的东西
      "x.strokeRect(112,52,76,44);x.beginPath();x.arc(150,124,15,0,7);x.stroke();" +
      "var a=0.45+0.25*Math.sin(Date.now()/700);" +
      "x.fillStyle='rgba(150,190,210,'+a.toFixed(2)+')';x.fillRect(130,44,40,10);" +
      "requestAnimationFrame(frame);}frame();" +
      "function go(){var y=r.value|0,d=Math.round(y*365*8/24);" +
      "n.textContent='你每天坐 8 小时以上，已经坐了 '+y+' 年，还会再坐 '+y+" +
      "' 年。合起来是 '+d+' 天不吃不睡地坐在这把椅子上。';}" +
      "r.addEventListener('input',go);go();})();</script>",
  },
  {
    // 7 数字沙漏
    title: "数字沙漏",
    html:
      BOX +
      "<style>.useless-thing .ut-cd{font-size:3.4rem;line-height:1.1;" +
      "color:var(--fg,#333);font-variant-numeric:tabular-nums;" +
      "font-family:ui-monospace,Menlo,monospace;transition:opacity .12s}" +
      ".useless-thing .ut-cd.zero{opacity:.15}</style>" +
      "<div class='ut'><p class='ut-cd'>10:00</p>" +
      "<p class='ut-mono'>它归零，然后重新开始。你每次打开它，它都在倒数。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-cd'),T=600000,t0=Date.now();" +
      "function p2(v){return v<10?'0'+v:''+v;}" +
      "setInterval(function(){var left=T-(Date.now()-t0)%T;" +
      "var s=Math.floor(left/1000);" +
      "e.textContent=p2(Math.floor(s/60))+':'+p2(s%60);" +
      // 归零那一下闪一闪，然后什么都没发生——十分钟就这么过去了
      "e.className=left<600?'ut-cd zero':'ut-cd';},100);})();</script>",
  },
  {
    // 8 / 17 / 77 读秒器（清单里出现了三次，是同一个）
    title: "读秒器",
    html:
      BOX +
      "<style>.useless-thing .ut-sec{font-size:3rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.1}</style>" +
      "<div class='ut'><p class='ut-sec'>0</p><p>秒过去了。</p>" +
      "<p class='ut-mono'>不暂停、不归零、不保存，也不计入任何统计。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-sec'),t0=Date.now();" +
      "setInterval(function(){" +
      "e.textContent=String(Math.floor((Date.now()-t0)/1000));},200);})();</script>",
  },
  {
    // 9 昨日理想
    title: "昨日理想",
    html:
      BOX +
      "<style>.useless-thing .ut-ye{font-size:1.35rem;color:var(--fg,#333);" +
      "max-width:20em;line-height:1.8}" +
      ".useless-thing .ut-ye-i{width:17rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-ye-n{max-width:24em;min-height:2.5em}</style>" +
      "<div class='ut'><p class='ut-ye'></p>" +
      "<input class='ut-ye-i' type='text' placeholder='明天你想做的一件事，回车留下' />" +
      "<p class='ut-mono ut-ye-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-ye'),i=R.querySelector('.ut-ye-i')," +
      "n=R.querySelector('.ut-ye-n'),K='useless.yesterday';" +
      "function key(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}" +
      "var today=key(new Date()),old=null;" +
      "try{old=JSON.parse(localStorage.getItem(K)||'null');}catch(e){}" +
      // 存在这台浏览器里，谁也看不到。它只等着某一天原样还给你
      "if(old&&old.d!==today&&old.v){p.textContent=old.v;" +
      "n.textContent='这是你上次留下的。你当时想做的，后来没做。再写一条也一样。';}" +
      "else if(old&&old.d===today&&old.v){p.textContent=old.v;" +
      "n.textContent='今天写的。明天再打开这一页，它还在这儿等你。';}" +
      "else{p.textContent='（这里空着）';" +
      "n.textContent='你还没留下过。留一条，明天它会原样还给你。';}" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;" +
      "try{localStorage.setItem(K,JSON.stringify({d:today,v:i.value.trim()}));}catch(e2){}" +
      "p.textContent=i.value.trim();i.value='';" +
      "n.textContent='记下了。明天见。';});})();</script>",
  },
  {
    // 10 已过去的焦虑
    title: "已过去的焦虑",
    html:
      BOX +
      "<style>.useless-thing .ut-an-d{font-size:1.5rem;color:var(--fg,#333)}" +
      ".useless-thing .ut-an-i{width:18rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;transition:opacity 1.6s}" +
      ".useless-thing .ut-an-i.go{opacity:0}" +
      ".useless-thing .ut-an-n{max-width:23em;min-height:3em}</style>" +
      "<div class='ut'><p class='ut-an-d'></p>" +
      "<input class='ut-an-i' type='text' placeholder='那天你在担心什么？' />" +
      "<p class='ut-mono ut-an-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var d=R.querySelector('.ut-an-d'),i=R.querySelector('.ut-an-i')," +
      "n=R.querySelector('.ut-an-n');" +
      "var day=new Date(Date.now()-(30+Math.floor(Math.random()*8))*86400000);" +
      "d.textContent=day.getFullYear()+' 年 '+(day.getMonth()+1)+' 月 '+day.getDate()+' 日';" +
      "n.textContent='一个月前的某一天。你想不起那天在担心什么了。';" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;i.className='ut-an-i go';" +
      // 写完就抹掉：那件事当时占满了一整天，现在连它自己都不在了
      "setTimeout(function(){i.value='';i.className='ut-an-i';" +
      "i.placeholder='（已经没有了）';},1700);" +
      "n.textContent='那天你担心的事，后来没有发生。发生了的那些，你当时没在担心。';});" +
      "})();</script>",
  },
  {
    // 11 10 年后你会怀念今天
    title: "10年后你会怀念今天",
    html:
      BOX +
      "<style>.useless-thing .ut-miss{font-size:1.35rem;color:var(--fg,#333);" +
      "max-width:18em;line-height:1.9}" +
      ".useless-thing .ut-miss-n{max-width:22em;min-height:2.4em}</style>" +
      "<div class='ut'><p class='ut-miss'>10 年后的你会怀念今天。</p>" +
      "<button class='ut-btn' type='button'>但我现在不快乐</button>" +
      "<p class='ut-mono ut-miss-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-miss'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-miss-n'),k=0;" +
      // 循环回应：珍惜与不珍惜之间没有出口，按多少次都一样
      "var S=['10 年前的你，也不快乐。','那时你也被告知，10 年后会怀念当时。'," +
      "'你怀念的是那时你不知道后来会怎样。','10 年后的你会怀念今天。'];" +
      "b.addEventListener('click',function(){p.textContent=S[k%S.length];k++;" +
      "n.textContent='你按了 '+k+' 次。它绕回原处了。';});})();</script>",
  },
  {
    // 12 无限楼梯
    title: "无限楼梯",
    html:
      BOX +
      "<style>.useless-thing .ut-st{display:block;max-width:100%;height:auto}</style>" +
      "<div class='ut'><canvas class='ut-st' width='300' height='210'></canvas>" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-st'),x=c.getContext('2d'),t=R.querySelector('.ut-mono');" +
      "var W=300,H=210,ph=0,N=52;" +
      "function frame(){x.clearRect(0,0,W,H);ph+=0.011;" +
      "for(var i=N-1;i>=0;i--){" +
      // 每级往上 4px、转 0.32 弧度；整体循环平移，于是永远有下一级
      "var k=(i*4+ph*60)%(N*4),a=i*0.32+ph;" +
      "var cx=150+Math.cos(a)*62,cy=180-k*3.1+Math.sin(a)*22;" +
      "var w=30+Math.sin(a)*9;" +
      "x.strokeStyle='rgba(128,128,128,'+(0.12+0.5*(1-k/(N*4))).toFixed(2)+')';" +
      "x.lineWidth=1;x.beginPath();x.moveTo(cx-w/2,cy);x.lineTo(cx+w/2,cy);" +
      "x.lineTo(cx+w/2-6,cy+7);x.lineTo(cx-w/2-6,cy+7);x.closePath();x.stroke();}" +
      "t.textContent='你已经爬了 '+(ph/(Math.PI*2)).toFixed(1)+" +
      "' 圈。高度没变，你还在原地。';requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 15 脉搏
    title: "脉搏",
    html:
      BOX +
      "<style>.useless-thing .ut-pl{display:block;max-width:100%;height:auto}</style>" +
      "<div class='ut'><canvas class='ut-pl' width='320' height='200'></canvas>" +
      "<p class='ut-mono'>每分钟 72 下。它在这里跳，跟你的没有关系。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-pl'),x=c.getContext('2d'),W=320,H=200,r=[],last=0;" +
      "var CX=160,CY=100,MAX=Math.min(CX,CY)-6;" +
      "function frame(){var now=Date.now();x.clearRect(0,0,W,H);" +
      // 72bpm = 每 833 毫秒一下
      "if(now-last>833){last=now;r.push({t:now});}" +
      "for(var i=r.length-1;i>=0;i--){var age=(now-r[i].t)/1000;" +
      "if(age>3.4){r.splice(i,1);continue;}" +
      "var d=age*46,rad=d<=MAX?d:MAX-(d-MAX),o=Math.max(0,0.5-age*0.15);" +
      // 撞到边界就往回收：反射回来的那一圈更淡，最后什么也不剩
      "if(rad<=0)continue;x.beginPath();x.arc(CX,CY,rad,0,7);" +
      "x.strokeStyle='rgba(198,86,86,'+o.toFixed(3)+')';x.lineWidth=1;x.stroke();}" +
      "var p=Math.max(0,1-(now-last)/260);" +
      "x.beginPath();x.arc(CX,CY,4+p*4,0,7);" +
      "x.fillStyle='rgba(198,86,86,'+(0.45+p*0.5).toFixed(2)+')';x.fill();" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 16 空房间
    title: "空房间",
    html:
      BOX +
      "<style>.useless-thing .ut-emp{display:block;max-width:100%;height:auto;" +
      "image-rendering:pixelated}</style>" +
      "<div class='ut'><canvas class='ut-emp' width='260' height='170'></canvas></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-emp'),x=c.getContext('2d'),D=[];" +
      "for(var i=0;i<26;i++)D.push({x:40+Math.random()*180,y:30+Math.random()*110," +
      "vx:(Math.random()-.5)*.14,vy:(Math.random()-.5)*.1});" +
      "function frame(){x.clearRect(0,0,260,170);" +
      "var a=0.5+0.06*Math.sin(Date.now()/2300);" +
      // 灯下面那圈光。屋里就这些：一张床、一把椅子，没有人
      "x.fillStyle='rgba(190,180,140,'+(a*0.1).toFixed(3)+')';" +
      "x.beginPath();x.arc(130,86,74,0,7);x.fill();" +
      "x.strokeStyle='rgba(128,128,128,.45)';x.lineWidth=1;x.strokeRect(24,16,212,138);" +
      "x.strokeRect(40,32,54,40);x.strokeRect(178,104,40,34);" +
      "x.beginPath();x.arc(130,86,3,0,7);" +
      "x.fillStyle='rgba(220,206,160,'+a.toFixed(2)+')';x.fill();" +
      "x.fillStyle='rgba(160,160,160,.35)';" +
      "for(var i=0;i<D.length;i++){var d=D[i];d.x+=d.vx;d.y+=d.vy;" +
      "if(d.x<30||d.x>230)d.vx*=-1;if(d.y<24||d.y>146)d.vy*=-1;" +
      "x.fillRect(d.x|0,d.y|0,1,1);}" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 19 / 71 无限加载
    title: "无限加载",
    html:
      BOX +
      "<style>.useless-thing .ut-ld{width:16rem;height:3px;" +
      "background:var(--border,rgba(128,128,128,.25));overflow:hidden}" +
      ".useless-thing .ut-ld-f{height:100%;width:0;background:currentColor}" +
      ".useless-thing .ut-ld-t{max-width:22em;min-height:2em;font-size:.9375rem;" +
      "color:var(--fg,#333)}</style>" +
      "<div class='ut'><p class='ut-ld-t'></p>" +
      "<div class='ut-ld'><div class='ut-ld-f'></div></div>" +
      "<p class='ut-mono'>0%</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var f=R.querySelector('.ut-ld-f'),p=R.querySelector('.ut-mono')," +
      "t=R.querySelector('.ut-ld-t'),v=0,k=0;" +
      "var S=['正在加载你的耐心…','正在加载今天剩下的部分…','正在加载一个你不需要的东西…'," +
      "'加载完毕——骗你的。','正在加载上一次没加载完的那个…','正在加载「加载」…'," +
      "'正在确认你还在看…','正在加载一个更好的你…'];" +
      "t.textContent=S[0];" +
      "setInterval(function(){v+=0.7+Math.random()*1.6;" +
      // 到 99 就跳回 0，换一句话接着来。它没有第 100 步
      "if(v>=99){v=0;k=(k+1)%S.length;t.textContent=S[k];}" +
      "f.style.width=v+'%';p.textContent=v.toFixed(0)+'%';},60);})();</script>",
  },
  {
    // 20 颜色心情
    title: "颜色心情",
    html:
      BOX +
      "<style>.useless-thing .ut-mood{width:100%;max-width:26rem;height:11rem;" +
      "border-radius:2px}</style>" +
      "<div class='ut'><div class='ut-mood'></div>" +
      "<p class='ut-mono'>今天的心情是这种颜色。明天换。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var d=R.querySelector('.ut-mood'),n=new Date();" +
      // 由日期算出来，不随机：同一天里刷新多少次都是这一种
      "var s=n.getFullYear()*10000+(n.getMonth()+1)*100+n.getDate();" +
      "function rnd(){s=(s*1103515245+12345)%2147483648;return s/2147483648;}" +
      "rnd();var h=Math.floor(rnd()*360),l=Math.floor(38+rnd()*24);" +
      "d.style.background='hsl('+h+',22%,'+l+'%)';})();</script>",
  },
];
