/**
 * 最早那批无用之物 —— 写在分类之前，不属于后来那六类里的任何一类。
 *
 * 其中有几个恰好也在后来那份清单上（时钟在撒谎、呼吸的像素、风、重力、地平线、
 * 你在看着我吗、消息已读模拟器、努力显示仪、待办清单、消失的键盘、我、
 * 你确定吗确认器）。它们**留在这里不搬**：seed 靠标题查重，搬来搬去只会让
 * 已经上过站的东西平白多一次 diff。分类文件里那几号因此是空的。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const MISC_EMBEDS: SeedEmbed[] = [
  {
    title: "奇怪颜色生成器",
    html:
      BOX +
      "<style>.useless-thing .ut-sw{width:14rem;height:9rem;border-radius:2px}" +
      ".useless-thing .ut-name{font-size:1.25rem;color:var(--fg,#333)}</style>" +
      "<div class='ut ut-tap'><div class='ut-sw'></div>" +
      "<p class='ut-name'></p><p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut'),sw=R.querySelector('.ut-sw')," +
      "nm=R.querySelector('.ut-name'),hx=R.querySelector('.ut-mono');" +
      "var A=['焦虑的','过期的','没睡醒的','刚哭过的','装作没事的','被遗忘的','有点潮的'," +
      "'昨天的','假装高级的','略微发馊的','懒得解释的','不太新鲜的','没洗干净的','将就着的'];" +
      "var B=['米色','酸奶白','医院绿','打印纸','隔夜茶','水泥灰','创可贴','地铁座椅'," +
      "'会议室蓝','牙膏白','塑料袋','旧毛巾','充电线','食堂餐盘','退烧药'];" +
      "function h(v){var s=v.toString(16);return s.length<2?'0'+s:s}" +
      "function go(){var r=(Math.random()*160+60)|0,g=(Math.random()*160+60)|0," +
      "b=(Math.random()*160+60)|0,c='#'+h(r)+h(g)+h(b);" +
      "sw.style.background=c;" +
      "nm.textContent=A[(Math.random()*A.length)|0]+B[(Math.random()*B.length)|0];" +
      "hx.textContent=c+' · 点一下换一个';}" +
      "go();box.addEventListener('pointerdown',go);})();</script>",
  },
  {
    title: "永远差一点的加载",
    html:
      BOX +
      "<style>.useless-thing .ut-bar{width:14rem;height:3px;" +
      "background:var(--border,rgba(128,128,128,.25));overflow:hidden}" +
      ".useless-thing .ut-fill{height:100%;width:0;background:currentColor}</style>" +
      "<div class='ut'><div class='ut-bar'><div class='ut-fill'></div></div>" +
      "<p class='ut-mono'>0%</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut'),f=R.querySelector('.ut-fill')," +
      "t=R.querySelector('.ut-mono'),v=0,k=0.02;" +
      "setInterval(function(){v+=(99.4-v)*k;f.style.width=v+'%';" +
      "t.textContent=v.toFixed(4)+'%';k+=(0.02-k)*0.05;},80);" +
      // 只听自己这一块的鼠标移动，不往 document 上绑
      "box.addEventListener('pointermove',function(){k=Math.min(k+0.004,0.3)});})();</script>",
  },
  {
    title: "你刚才按了",
    html:
      BOX +
      "<style>.useless-thing .ut-out{max-width:28em;font-size:.75rem;line-height:1.5;" +
      "opacity:.55;word-break:break-all;max-height:9rem;overflow:hidden}</style>" +
      "<div class='ut'><button class='ut-btn' type='button'>按我</button>" +
      "<div class='ut-out'></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-btn'),o=R.querySelector('.ut-out'),n=0;" +
      // 不真让它崩：烧满 CPU 会拖住访客整个标签页，而这一页现在没有 iframe 隔离
      "b.addEventListener('click',function(){n++;" +
      "if(n>9){o.textContent='……算了。它不会崩的，我舍不得你的电池。';b.disabled=true;return;}" +
      "var s='';for(var i=0;i<Math.pow(2,n);i++)s+='你刚才按了。';o.textContent=s;});})();</script>",
  },
  {
    title: "按住才长的按钮",
    html:
      BOX +
      "<style>.useless-thing .ut-grow{transition:none;will-change:font-size}</style>" +
      "<div class='ut'><button class='ut-btn ut-grow' type='button'>按住</button>" +
      "<p class='ut-mono'>16px</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-grow'),t=R.querySelector('.ut-mono'),s=16,on=false;" +
      // 长得快、缩得慢：所以你永远留不住它
      "function loop(){s=on?Math.min(s+0.7,220):Math.max(16,s-0.12);" +
      "b.style.fontSize=s.toFixed(1)+'px';t.textContent=s.toFixed(1)+'px';" +
      "requestAnimationFrame(loop);}loop();" +
      "b.addEventListener('pointerdown',function(){on=true});" +
      "b.addEventListener('pointerup',function(){on=false});" +
      "b.addEventListener('pointerleave',function(){on=false});" +
      "b.addEventListener('pointercancel',function(){on=false});})();</script>",
  },
  {
    title: "躲开你的按钮",
    html:
      BOX +
      "<style>.useless-thing .ut-dodge{transition:transform .18s ease-out}</style>" +
      "<div class='ut'><button class='ut-btn ut-dodge' type='button'>点我</button>" +
      "<p class='ut-mono'>躲开 0 次</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut'),b=R.querySelector('.ut-dodge')," +
      "t=R.querySelector('.ut-mono'),n=0;" +
      "box.addEventListener('pointermove',function(ev){" +
      "var r=b.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;" +
      "if(Math.hypot(ev.clientX-cx,ev.clientY-cy)>80)return;" +
      "var o=box.getBoundingClientRect();" +
      "var mx=Math.max(0,(o.width-r.width)/2-8),my=Math.max(0,(o.height-r.height)/2-8);" +
      "b.style.transform='translate('+((Math.random()*2-1)*mx).toFixed(0)+'px,'+" +
      "((Math.random()*2-1)*my).toFixed(0)+'px)';" +
      "n++;t.textContent='躲开 '+n+' 次';});" +
      // 万一真被点到，也什么都不发生
      "b.addEventListener('click',function(){t.textContent='……被你点到了。然后呢？'});})();</script>",
  },
  {
    title: "只能后退的进度条",
    html:
      BOX +
      "<style>.useless-thing .ut-bar2{width:14rem;height:3px;" +
      "background:var(--border,rgba(128,128,128,.25));overflow:hidden}" +
      ".useless-thing .ut-fill2{height:100%;width:100%;background:currentColor;" +
      "transition:width .5s cubic-bezier(.4,0,.2,1)}</style>" +
      "<div class='ut'><div class='ut-bar2'><div class='ut-fill2'></div></div>" +
      "<p class='ut-mono'>100%</p>" +
      "<button class='ut-btn' type='button'>前进</button></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var f=R.querySelector('.ut-fill2'),t=R.querySelector('.ut-mono')," +
      "b=R.querySelector('.ut-btn'),v=100;" +
      "b.addEventListener('click',function(){" +
      "if(v<=0){v=100;t.textContent='100% · 又回到起点了';f.style.width='100%';" +
      "b.textContent='前进';return;}" +
      "v=Math.max(0,v-7);f.style.width=v+'%';" +
      "t.textContent=v+'%';if(v===0){t.textContent='0% · 到底了';b.textContent='再前进';}});" +
      "})();</script>",
  },
  {
    title: "会累的按钮",
    html:
      BOX +
      "<div class='ut'><button class='ut-btn' type='button'>再按一次</button>" +
      "<p class='ut-mono'>它还很精神。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-btn'),t=R.querySelector('.ut-mono'),n=0;" +
      // 每按一次都更慢一点，最后干脆不干了
      "b.addEventListener('click',function(){n++;" +
      "if(n>7){b.disabled=true;t.textContent='……我累了。';return;}" +
      "var d=n*n*60;b.disabled=true;t.textContent='……';" +
      "setTimeout(function(){b.disabled=false;" +
      "t.textContent='想了 '+d+' 毫秒，还是没什么想说的。';},d);});})();</script>",
  },
  {
    title: "读到哪，消失到哪",
    html:
      BOX +
      "<style>.useless-thing .ut-fade{max-width:22em;font-size:1rem}" +
      ".useless-thing .ut-fade span{transition:opacity 1.4s linear}</style>" +
      "<div class='ut'><p class='ut-fade'></p>" +
      "<p class='ut-mono'>把鼠标放上来，它们会回来</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut'),p=R.querySelector('.ut-fade');" +
      "var s='这句话会在你读它的时候一个字一个字地消失。',i=0;" +
      "for(var k=0;k<s.length;k++){var e=document.createElement('span');" +
      "e.textContent=s[k];p.appendChild(e);}" +
      "setInterval(function(){if(i<p.children.length)p.children[i++].style.opacity='0';},420);" +
      "box.addEventListener('pointerenter',function(){i=0;" +
      "for(var k=0;k<p.children.length;k++)p.children[k].style.opacity='1';});})();</script>",
  },
  {
    title: "互联网的尽头",
    html:
      BOX +
      "<style>.useless-thing .ut-end{font-size:1rem;line-height:2.2}" +
      ".useless-thing .ut-back{color:inherit;text-decoration:none;" +
      "border-bottom:1px solid currentColor;cursor:pointer}</style>" +
      "<div class='ut'><p class='ut-end'>您已到达互联网尽头。</p>" +
      "<a class='ut-back' href='#' role='button'>返回</a>" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var a=R.querySelector('.ut-back'),t=R.querySelector('.ut-mono'),n=0;" +
      // 「返回」回到的还是这里——这是个闭环笑话，不是死链
      "a.addEventListener('click',function(ev){ev.preventDefault();n++;" +
      "t.textContent=n===1?'你还是在这里。':'你已经返回 '+n+' 次了。';});})();</script>",
  },
  {
    title: "你在这一页上花掉的心跳",
    html:
      BOX +
      "<style>.useless-thing .ut-beat{font-size:2.6rem;line-height:1.3;" +
      "color:var(--fg,#333);font-variant-numeric:tabular-nums}" +
      ".useless-thing .ut-beat.on{opacity:.55}</style>" +
      "<div class='ut'><p class='ut-beat'>0</p>" +
      "<p>下心跳。</p><p class='ut-mono'>按每分钟 70 下估算</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var n=R.querySelector('.ut-beat'),t0=Date.now(),c=0;" +
      // 不问你是谁、不存任何东西——它只是替你数，数完就算了
      "setInterval(function(){var k=Math.floor((Date.now()-t0)/1000*70/60);" +
      "if(k===c)return;c=k;n.textContent=String(c);" +
      "n.className='ut-beat on';setTimeout(function(){n.className='ut-beat'},90);},80);" +
      "})();</script>",
  },
  {
    title: "整理不完的熵",
    html:
      BOX +
      "<style>.useless-thing .ut-ent{display:block;max-width:100%;height:auto}</style>" +
      "<div class='ut'><canvas class='ut-ent' width='420' height='220'></canvas>" +
      "<button class='ut-btn' type='button'>整理</button>" +
      "<p class='ut-mono'>整理 0 次</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-ent'),x=c.getContext('2d')," +
      "b=R.querySelector('.ut-btn'),t=R.querySelector('.ut-mono'),n=0;" +
      "var W=420,H=220,CO=26,RO=14,G=[];" +
      "for(var j=0;j<RO;j++)for(var i=0;i<CO;i++)G.push({hx:14+i*15.5,hy:14+j*14.5,x:14+i*15.5,y:14+j*14.5});" +
      "function draw(){x.clearRect(0,0,W,H);x.fillStyle='#8a9196';" +
      "for(var i=0;i<G.length;i++)x.fillRect(G[i].x,G[i].y,3,3);}" +
      "function jitter(p,d){p.x+=(Math.random()-.5)*d;p.y+=(Math.random()-.5)*d;}" +
      // 自己一直在乱；你整理 6 个，它顺手打乱 40 个
      "setInterval(function(){for(var i=0;i<9;i++)jitter(G[(Math.random()*G.length)|0],3);draw();},260);" +
      "b.addEventListener('click',function(){n++;" +
      "for(var i=0;i<6;i++){var p=G[(Math.random()*G.length)|0];p.x=p.hx;p.y=p.hy;}" +
      "for(var k=0;k<40;k++)jitter(G[(Math.random()*G.length)|0],6);draw();" +
      "t.textContent='整理 '+n+' 次';});draw();})();</script>",
  },
  {
    title: "你看到的都是旧的",
    html:
      BOX +
      "<style>.useless-thing .ut-far{font-size:1.35rem;color:var(--fg,#333)}" +
      ".useless-thing .ut-ago{font-size:1rem}" +
      ".useless-thing .ut-rng{width:16rem;accent-color:currentColor}" +
      ".useless-thing .ut-note{min-height:2em;max-width:22em}</style>" +
      "<div class='ut'><p class='ut-far'></p><p class='ut-ago'></p>" +
      "<input class='ut-rng' type='range' min='0' max='7' value='0' step='1' " +
      "aria-label='距离' /><p class='ut-mono ut-note'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var far=R.querySelector('.ut-far'),ago=R.querySelector('.ut-ago')," +
      "rng=R.querySelector('.ut-rng'),note=R.querySelector('.ut-note');" +
      "var S=[['你的手','1 纳秒前',''],['月亮','1.3 秒前','']," +
      "['太阳','8 分 20 秒前','你抬头时它已经可以不在了，你要过八分钟才知道']," +
      "['木星','43 分钟前',''],['海王星','4 小时前','']," +
      "['比邻星','4.2 年前','那是离我们最近的一颗']," +
      "['银河系中心','26000 年前','那时人还在洞里画画']," +
      "['仙女座星系','250 万年前','那时地球上还没有智人']];" +
      "function go(){var s=S[rng.value|0];far.textContent=s[0];" +
      "ago.textContent=s[1]+'的样子。';note.textContent=s[2];}" +
      "rng.addEventListener('input',go);go();})();</script>",
  },
  {
    title: "按下去就撤不回来的按钮",
    html:
      BOX +
      "<style>.useless-thing .ut-word{color:var(--fg,#333);font-size:1.1rem}" +
      ".useless-thing .ut-word.done{color:var(--muted-fg,#999);text-decoration:line-through}</style>" +
      "<div class='ut'><p>这个词是 <span class='ut-word'>完整的</span>。</p>" +
      "<button class='ut-btn' type='button'>按下去</button>" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var w=R.querySelector('.ut-word'),b=R.querySelector('.ut-btn')," +
      "t=R.querySelector('.ut-mono'),K='useless.irreversible';" +
      // 存在这台浏览器里，没有重置按钮。什么要紧的事都没发生，但确实回不去了
      "function seal(first){w.className='ut-word done';b.disabled=true;" +
      "b.textContent='已经按过了';" +
      "t.textContent=first?'没有取消。也没有重置。':'你上次按过了。它一直是这样。';}" +
      "try{if(localStorage.getItem(K))seal(false);}catch(e){}" +
      "b.addEventListener('click',function(){try{localStorage.setItem(K,'1')}catch(e){}" +
      "seal(true);});})();</script>",
  },
  {
    title: "你来了之后的世界",
    html:
      BOX +
      "<style>.useless-thing .ut-row{display:flex;gap:2.4rem;justify-content:center}" +
      ".useless-thing .ut-num{font-size:2rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-cap{font-size:.75rem;opacity:.6}</style>" +
      "<div class='ut'><div class='ut-row'>" +
      "<div><p class='ut-num ut-in'>0</p><p class='ut-cap'>个人来了</p></div>" +
      "<div><p class='ut-num ut-out'>0</p><p class='ut-cap'>个人走了</p></div>" +
      "</div><p class='ut-mono'>按全球平均速率估算，不是实时数据</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var a=R.querySelector('.ut-in'),b=R.querySelector('.ut-out'),t0=Date.now();" +
      // 4.2 / 2.0 是公开的全球出生与死亡年均速率，换算成每秒
      "setInterval(function(){var s=(Date.now()-t0)/1000;" +
      "a.textContent=String(Math.floor(s*4.2));" +
      "b.textContent=String(Math.floor(s*2.0));},120);})();</script>",
  },
  {
    title: "时钟在撒谎",
    html:
      BOX +
      "<style>.useless-thing .ut-cl{display:block;margin:0 auto}</style>" +
      "<div class='ut'><canvas class='ut-cl' width='200' height='200'></canvas>" +
      "<p class='ut-lie'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-cl'),x=c.getContext('2d'),p=R.querySelector('.ut-lie');" +
      // 一进来就定好撒多少谎，之后一直保持——一块时快时慢的表只是坏了，不是在撒谎
      "var lie=2+Math.floor(Math.random()*14);" +
      "function hand(a,len,w,col){x.beginPath();x.lineWidth=w;x.strokeStyle=col;" +
      "x.moveTo(100,100);x.lineTo(100+Math.sin(a)*len,100-Math.cos(a)*len);x.stroke();}" +
      "function tick(){var d=new Date();x.clearRect(0,0,200,200);" +
      "x.strokeStyle='rgba(128,128,128,.35)';x.lineWidth=1;" +
      "x.beginPath();x.arc(100,100,88,0,7);x.stroke();" +
      "for(var i=0;i<12;i++){var a=i*Math.PI/6;x.beginPath();" +
      "x.moveTo(100+Math.sin(a)*80,100-Math.cos(a)*80);" +
      "x.lineTo(100+Math.sin(a)*86,100-Math.cos(a)*86);x.stroke();}" +
      "var m=d.getMinutes()+lie+d.getSeconds()/60,h=d.getHours()%12+m/60;" +
      "hand(h*Math.PI/6,48,3,'#555');hand(m*Math.PI/30,74,1.5,'#555');" +
      "p.textContent='它快了 '+lie+' 分钟。你多过了 '+lie+' 分钟，那些不存在。';" +
      "requestAnimationFrame(tick);}tick();})();</script>",
  },
  {
    title: "重力",
    html:
      BOX +
      "<style>.useless-thing .ut-field{position:relative;width:100%;max-width:26rem;" +
      "height:13rem;overflow:hidden}" +
      ".useless-thing .ut-ball{position:absolute;width:12px;height:12px;border-radius:50%;" +
      "background:currentColor}</style>" +
      "<div class='ut'><div class='ut-field'><div class='ut-ball'></div></div>" +
      "<p class='ut-say'>它朝你滚。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var f=R.querySelector('.ut-field'),b=R.querySelector('.ut-ball')," +
      "say=R.querySelector('.ut-say'),W=0,H=0,px=0,py=0,tx=null,ty=null,idle=0,gone=false;" +
      "function size(){var r=f.getBoundingClientRect();W=r.width;H=r.height;}" +
      "size();px=W/2;py=H/2;" +
      "f.addEventListener('pointermove',function(e){var r=f.getBoundingClientRect();" +
      "tx=e.clientX-r.left;ty=e.clientY-r.top;idle=0;" +
      "if(gone){gone=false;px=W/2;py=H/2;say.textContent='它又回来了。';}});" +
      "setInterval(function(){size();idle++;" +
      "if(gone)return;" +
      // 你不动够久，它就朝边缘走，然后不回来
      "if(idle>60){px+=(px<W/2?-1:1)*1.6;py+=(py<H/2?-1:1)*0.8;" +
      "say.textContent='它在往边上走。';" +
      "if(px<-20||px>W+20||py<-20||py>H+20){gone=true;" +
      "say.textContent='它走了，因为你没动。';}}" +
      "else if(tx!==null){px+=(tx-px)*0.06;py+=(ty-py)*0.06;}" +
      "b.style.transform='translate('+px+'px,'+py+'px)';},33);})();</script>",
  },
  {
    title: "风",
    html:
      BOX +
      "<style>.useless-thing .ut-wind{display:block;max-width:100%;height:auto}</style>" +
      "<div class='ut'><canvas class='ut-wind' width='420' height='220'></canvas>" +
      "<p class='ut-mono'>动一下鼠标</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-wind'),x=c.getContext('2d'),W=420,H=220,P=[];" +
      "for(var i=0;i<260;i++)P.push({x:Math.random()*W,y:Math.random()*H," +
      "vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2});" +
      "c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();" +
      "var mx=(e.clientX-r.left)*W/r.width,my=(e.clientY-r.top)*H/r.height;" +
      "for(var i=0;i<P.length;i++){var p=P[i],dx=p.x-mx,dy=p.y-my;" +
      "var d=Math.hypot(dx,dy);if(d<70&&d>0.1){p.vx+=dx/d*1.6;p.vy+=dy/d*1.6;}}});" +
      "function tick(){x.clearRect(0,0,W,H);x.fillStyle='#8a9196';" +
      "for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;" +
      "p.vx*=0.94;p.vy*=0.94;" +
      // 吹散之后不归位，只是慢慢重新乱走——原来的位置没有了
      "if(p.x<0)p.x+=W;if(p.x>W)p.x-=W;if(p.y<0)p.y+=H;if(p.y>H)p.y-=H;" +
      "x.fillRect(p.x|0,p.y|0,2,2);}requestAnimationFrame(tick);}tick();})();</script>",
  },
  {
    title: "呼吸的像素",
    html:
      BOX +
      "<style>.useless-thing .ut-br{width:9rem;height:9rem;border-radius:3px;" +
      "transition:background 2.6s linear}</style>" +
      "<div class='ut'><div class='ut-br'></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var d=R.querySelector('.ut-br'),t0=Date.now();" +
      "var C=['#8fa6a0','#a08f9e','#9aa08f','#8f96a0','#a09b8f','#96a08f'],i=0;" +
      "d.style.background=C[0];" +
      "setInterval(function(){i=(i+1)%C.length;d.style.background=C[i];},30000);" +
      // 4 秒吸、4 秒呼——比一般人自然呼吸慢一点，跟着它会不自觉地慢下来
      "function tick(){var p=(Date.now()-t0)/8000%1;" +
      "var s=0.72+0.28*(1-Math.cos(p*Math.PI*2))/2;" +
      "d.style.transform='scale('+s.toFixed(3)+')';requestAnimationFrame(tick);}tick();" +
      "})();</script>",
  },
  {
    title: "地平线",
    html:
      BOX +
      "<style>.useless-thing .ut-hz{position:relative;width:100%;max-width:28rem;height:9rem}" +
      ".useless-thing .ut-hzl{position:absolute;top:50%;height:1px;width:34%;" +
      "background:currentColor;opacity:.55}</style>" +
      "<div class='ut'><div class='ut-hz'><div class='ut-hzl'></div></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-hz'),l=R.querySelector('.ut-hzl'),t0=Date.now();" +
      // 一条线从左走到右，走完再来。没有别的。
      "function tick(){var p=(Date.now()-t0)/26000%1;" +
      "l.style.left=(p*134-34).toFixed(2)+'%';requestAnimationFrame(tick);}tick();})();</script>",
  },
  {
    title: "消息已读模拟器",
    html:
      BOX +
      "<style>.useless-thing .ut-chat{width:100%;max-width:24rem;display:flex;" +
      "flex-direction:column;gap:.5rem}" +
      ".useless-thing .ut-log{display:flex;flex-direction:column;gap:.45rem;" +
      "max-height:11rem;overflow-y:auto}" +
      ".useless-thing .ut-msg{align-self:flex-end;max-width:80%;text-align:right;" +
      "padding:.4rem .7rem;border:1px solid var(--border,#ccc);border-radius:10px;" +
      "font-size:.8125rem;line-height:1.5}" +
      ".useless-thing .ut-read{align-self:flex-end;font-size:.6875rem;opacity:.5}" +
      ".useless-thing .ut-in{width:100%;padding:.5rem .7rem;font:inherit;font-size:.875rem;" +
      "border:1px solid var(--border,#ccc);border-radius:6px;background:transparent;" +
      "color:inherit}</style>" +
      "<div class='ut'><div class='ut-chat'><div class='ut-log'></div>" +
      "<input class='ut-in' type='text' placeholder='说点什么，回车发送' /></div>" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var inp=R.querySelector('.ut-in'),log=R.querySelector('.ut-log')," +
      "t=R.querySelector('.ut-mono'),n=0;" +
      "inp.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!inp.value.trim())return;" +
      "var m=document.createElement('div');m.className='ut-msg';m.textContent=inp.value;" +
      "log.appendChild(m);inp.value='';n++;" +
      "var r=document.createElement('div');r.className='ut-read';r.textContent='已读';" +
      "log.appendChild(r);log.scrollTop=log.scrollHeight;" +
      // 秒读，永不回。剩下的话不用说了
      "t.textContent='已读 '+n+' 条。';});})();</script>",
  },
  {
    title: "你在看着我吗",
    html:
      BOX +
      "<style>.useless-thing .ut-eyes{display:flex;gap:1.6rem}" +
      ".useless-thing .ut-eye{width:3.4rem;height:3.4rem;border:2px solid currentColor;" +
      "border-radius:50%;position:relative}" +
      ".useless-thing .ut-pu{position:absolute;width:1.1rem;height:1.1rem;border-radius:50%;" +
      "background:currentColor;left:50%;top:50%;margin:-.55rem 0 0 -.55rem}</style>" +
      "<div class='ut'><div class='ut-eyes'>" +
      "<div class='ut-eye'><div class='ut-pu'></div></div>" +
      "<div class='ut-eye'><div class='ut-pu'></div></div></div>" +
      "<p class='ut-mono'>它不收集任何东西。只是看着你。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut'),ps=R.querySelectorAll('.ut-pu')," +
      "es=R.querySelectorAll('.ut-eye'),last=Date.now(),spin=0;" +
      "box.addEventListener('pointermove',function(e){last=Date.now();" +
      "for(var i=0;i<ps.length;i++){var r=es[i].getBoundingClientRect();" +
      "var a=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));" +
      "ps[i].style.transform='translate('+(Math.cos(a)*14).toFixed(1)+'px,'+" +
      "(Math.sin(a)*14).toFixed(1)+'px)';}});" +
      // 你十秒不动，它自己转一圈——被看的人也会看回来
      "setInterval(function(){if(Date.now()-last<10000)return;last=Date.now();" +
      "spin+=720;for(var i=0;i<ps.length;i++)" +
      "ps[i].style.transform='rotate('+spin+'deg) translate(14px,0)';},1000);})();</script>",
  },
  {
    title: "待办清单（无完成版）",
    html:
      BOX +
      "<style>.useless-thing .ut-todo{width:100%;max-width:22rem;display:flex;" +
      "flex-direction:column;gap:.6rem}" +
      ".useless-thing .ut-ti{width:100%;padding:.5rem .7rem;font:inherit;font-size:.875rem;" +
      "border:1px solid var(--border,#ccc);border-radius:6px;background:transparent;color:inherit}" +
      ".useless-thing .ut-done{text-decoration:line-through;opacity:.5;font-size:.9375rem}</style>" +
      "<div class='ut'><div class='ut-todo'>" +
      "<input class='ut-ti' type='text' placeholder='今天要做的一件事，回车添加' />" +
      "<p class='ut-done'></p></div><p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-ti'),d=R.querySelector('.ut-done'),t=R.querySelector('.ut-mono');" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;" +
      // 加进来就自动划掉，而且只能加一条——第二条你也不会做
      "d.textContent=i.value;i.value='';i.disabled=true;" +
      "i.placeholder='';t.textContent='已假装做了。加不了第二条。';});})();</script>",
  },
  {
    title: "努力显示仪",
    html:
      BOX +
      "<style>.useless-thing .ut-eff{width:16rem;accent-color:currentColor}" +
      ".useless-thing .ut-big{font-size:2.2rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums}</style>" +
      "<div class='ut'><p class='ut-big'>0%</p>" +
      "<input class='ut-eff' type='range' min='0' max='100' value='0' aria-label='努力值' />" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var r=R.querySelector('.ut-eff'),b=R.querySelector('.ut-big'),t=R.querySelector('.ut-mono');" +
      "function go(){b.textContent=r.value+'%';" +
      "t.textContent='你选的努力值是 '+r.value+'%。现实中的对应值：0%。';}" +
      "r.addEventListener('input',go);go();})();</script>",
  },
  {
    title: "消失的键盘",
    html:
      BOX +
      "<style>.useless-thing .ut-kb{display:flex;flex-wrap:wrap;gap:3px;" +
      "justify-content:center;max-width:24rem}" +
      ".useless-thing .ut-key{width:1.55rem;height:1.55rem;display:grid;place-content:center;" +
      "border:1px solid var(--border,#ccc);border-radius:3px;font-size:.6875rem;" +
      "font-family:ui-monospace,Menlo,monospace;transition:opacity .5s}" +
      ".useless-thing .ut-key.gone{opacity:0}" +
      ".useless-thing .ut-space{width:11rem}" +
      ".useless-thing .ut-ki{position:absolute;opacity:0;pointer-events:none}</style>" +
      "<div class='ut'><div class='ut-kb'></div>" +
      "<input class='ut-ki' aria-hidden='true' />" +
      "<p class='ut-mono'>点这里，然后随便打字</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var kb=R.querySelector('.ut-kb'),inp=R.querySelector('.ut-ki')," +
      "box=R.querySelector('.ut'),t=R.querySelector('.ut-mono'),n=0,left=26;" +
      "var L='QWERTYUIOPASDFGHJKLZXCVBNM'.split('');" +
      "var map={};" +
      "for(var i=0;i<L.length;i++){var e=document.createElement('div');" +
      "e.className='ut-key';e.textContent=L[i];kb.appendChild(e);map[L[i]]=e;}" +
      "var sp=document.createElement('div');sp.className='ut-key ut-space';" +
      "sp.textContent='space';kb.appendChild(sp);" +
      "box.addEventListener('pointerdown',function(){inp.focus();});" +
      "inp.addEventListener('keydown',function(e){" +
      "var k=(e.key||'').toUpperCase();n++;" +
      // 空格永远留着——最后你只剩下停顿
      "if(map[k]&&!map[k].classList.contains('gone')){map[k].classList.add('gone');left--;}" +
      "t.textContent=left>0?('你按了 '+n+' 次。还剩 '+left+' 个键。')" +
      ":('你按了 '+n+' 次。只剩空格了。你想填什么？');});})();</script>",
  },
  {
    title: "我",
    html:
      BOX +
      "<style>.useless-thing .ut-me{position:relative;width:100%;max-width:26rem;" +
      "height:13rem;overflow:hidden;cursor:pointer}" +
      ".useless-thing .ut-wo{position:absolute;color:var(--fg,#222);line-height:1;" +
      "transition:opacity .4s}</style>" +
      "<div class='ut'><div class='ut-me'><span class='ut-wo'>我</span></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var f=R.querySelector('.ut-me'),w=R.querySelector('.ut-wo'),s=28,gone=false;" +
      "function put(x,y){w.style.fontSize=s+'px';" +
      "w.style.left=(x-s/2)+'px';w.style.top=(y-s/2)+'px';}" +
      "var r0=f.getBoundingClientRect();put(r0.width/2,r0.height/2);" +
      "f.addEventListener('pointermove',function(e){if(gone)return;" +
      "var r=f.getBoundingClientRect();put(e.clientX-r.left,e.clientY-r.top);});" +
      // 越点越大，大到装不下就没了；三秒后它自己回来，小小的
      "f.addEventListener('pointerdown',function(){if(gone)return;s=Math.round(s*1.6);" +
      "var r=f.getBoundingClientRect();put(r.width/2,r.height/2);" +
      "if(s>Math.max(r.width,r.height)*1.4){gone=true;w.style.opacity='0';" +
      "setTimeout(function(){s=28;w.style.opacity='1';" +
      "var q=f.getBoundingClientRect();put(q.width/2,q.height/2);gone=false;},3000);}});" +
      "})();</script>",
  },
  {
    title: "你确定吗确认器",
    html:
      BOX +
      "<div class='ut'><p class='ut-ask'>你确定吗？</p>" +
      "<button class='ut-btn' type='button'>我确定</button>" +
      "<p class='ut-mono'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-btn'),a=R.querySelector('.ut-ask')," +
      "t=R.querySelector('.ut-mono'),n=0;" +
      // 它永远再问一次。你点了很多次「确定」，但什么都没确定
      "b.addEventListener('click',function(){n++;" +
      "a.textContent='你确定吗？'+(n>3?'（真的？）':'');" +
      "t.textContent='你点了 '+n+' 次确定，但你什么都没确定。';});})();</script>",
  },
];
