/**
 * 八、有第二层的。
 *
 * 前面七类的毛病是**一眼看完**：读一句旁白，梗落地或者没落地，三秒结束。这一类
 * 立三条硬标准，不满足就别往这个文件里放：
 *
 *   1. **机制自己说话**——不写点题的旁白。`.ut-mono` 只用来放事实（秒数、次数、
 *      天数），不用来解释这东西想说什么。解释一句，梗就死一次。
 *   2. **有第二层**——玩下去规则会变：它自己松手、它又盖一层、它开始漏、
 *      它换个单位接着数。第一层结束的地方才是这一类的起点。
 *   3. **跨访问记忆**——用 `MEM`。关掉浏览器明天回来，它记得你干过什么。
 *      前面 110 个一个都没有，所以「明天回来」在这个站上一直是空的。
 *
 * 记忆是给「徒劳」用的，不是给「进度」用的：装满了会漏光，保存下来的每回来一次
 * 掉一个字，删掉的字不会回来。存住的是代价，不是成果。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部；`@keyframes` 一律不用（那组测试会把
 * `from` / `to` 当成越界的选择器）。
 */
import { BOX, MEM } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const DEEP_EMBEDS: SeedEmbed[] = [
  {
    title: "只有你知道的数字",
    html:
      BOX +
      "<style>.useless-thing .ut-cnt-w{display:flex;align-items:center;" +
      "justify-content:center;width:100%;flex:1;min-height:14rem;cursor:pointer}" +
      ".useless-thing .ut-cnt{color:var(--fg,#222);line-height:1;" +
      "font-variant-numeric:tabular-nums;transition:font-size .6s}</style>" +
      "<div class='ut'><div class='ut-cnt-w'><span class='ut-cnt'>0</span></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var w=R.querySelector('.ut-cnt-w'),c=R.querySelector('.ut-cnt');" +
      "var n=M.num('count',0);" +
      // 第二层：按得越多它在页上占的地方越小。数字长一位，字号掉一截
      "function draw(){c.textContent=String(n);" +
      "var s=Math.max(0.95,7-Math.log(n+1)/Math.LN10*1.6);" +
      "c.style.fontSize=s.toFixed(2)+'rem';}" +
      "draw();" +
      "w.addEventListener('pointerdown',function(){n++;M.set('count',n);draw();});" +
      "})();</script>",
  },
  {
    title: "擦",
    html:
      BOX +
      "<style>.useless-thing .ut-er{position:relative;width:100%;flex:1;" +
      "min-height:14rem;touch-action:none}" +
      ".useless-thing .ut-er canvas{position:absolute;inset:0;width:100%;height:100%;" +
      "display:block;cursor:crosshair}" +
      ".useless-thing .ut-er-n{position:absolute;left:.9rem;bottom:.6rem;" +
      "font-family:ui-monospace,Menlo,monospace;font-size:.6875rem;opacity:.3}</style>" +
      "<div class='ut'><div class='ut-er'><canvas width='960' height='640'></canvas>" +
      "<span class='ut-er-n'></span></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var box=R.querySelector('.ut-er'),cv=R.querySelector('canvas')," +
      "lab=R.querySelector('.ut-er-n'),g=cv.getContext('2d');" +
      "var layer=M.num('erase',0),down=false,px=0,py=0,moves=0;" +
      // 第二层：擦开七成它就再盖一层。层数越高这层越接近底色，越擦越看不出擦过
      "function paint(){var a=Math.max(0.1,0.6-layer*0.07);" +
      "g.globalCompositeOperation='source-over';" +
      "g.fillStyle='rgba(128,128,128,'+a.toFixed(3)+')';g.fillRect(0,0,960,640);" +
      "lab.textContent=layer>0?String(layer):'';}" +
      "paint();" +
      "function at(e){var r=box.getBoundingClientRect();" +
      "return[(e.clientX-r.left)/r.width*960,(e.clientY-r.top)/r.height*640];}" +
      "function cut(x,y){g.globalCompositeOperation='destination-out';" +
      "g.lineWidth=48;g.lineCap='round';g.lineJoin='round';" +
      "g.beginPath();g.moveTo(px,py);g.lineTo(x,y);g.stroke();px=x;py=y;}" +
      // 每 24 个点采一次样就够了：整张 getImageData 跟着 pointermove 跑会卡
      "function bare(){var d=g.getImageData(0,0,960,640).data,hit=0,all=0;" +
      "for(var i=3;i<d.length;i+=4*37){all++;if(d[i]<30)hit++;}return hit/all;}" +
      "box.addEventListener('pointerdown',function(e){down=true;" +
      "box.setPointerCapture(e.pointerId);var p=at(e);px=p[0];py=p[1];cut(p[0],p[1]);});" +
      "box.addEventListener('pointermove',function(e){if(!down)return;" +
      "var p=at(e);cut(p[0],p[1]);if(++moves%24)return;if(bare()<0.7)return;" +
      "layer++;M.set('erase',layer);setTimeout(paint,300);});" +
      "box.addEventListener('pointerup',function(){down=false;});" +
      "box.addEventListener('pointercancel',function(){down=false;});" +
      "})();</script>",
  },
  {
    title: "按住",
    html:
      BOX +
      "<style>.useless-thing .ut-hd{width:9rem;height:9rem;border-radius:50%;" +
      "border:1px solid currentColor;display:flex;align-items:center;" +
      "justify-content:center;cursor:pointer;touch-action:none;" +
      "font-size:1.5rem;color:var(--fg,#222);font-variant-numeric:tabular-nums;" +
      "transition:opacity 1.2s,transform 1.2s}" +
      ".useless-thing .ut-hd.gone{opacity:0;transform:scale(.94)}" +
      ".useless-thing .ut-hd-b{min-height:1.2em}</style>" +
      "<div class='ut'><div class='ut-hd'>0.0</div>" +
      "<p class='ut-mono ut-hd-b'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var b=R.querySelector('.ut-hd'),n=R.querySelector('.ut-hd-b');" +
      "var best=M.num('hold',0),t0=0,raf=0,over=false;" +
      "function say(){n.textContent=best>0?'最久 '+best.toFixed(1)+' 秒':'';}" +
      "say();" +
      "function tick(){var s=(Date.now()-t0)/1000;b.textContent=s.toFixed(1);" +
      "if(s>=60){stop(true);return;}raf=requestAnimationFrame(tick);}" +
      "function stop(self){cancelAnimationFrame(raf);raf=0;" +
      "var s=t0?(Date.now()-t0)/1000:0;t0=0;" +
      "if(s>best){best=Math.round(s*10)/10;M.set('hold',best);}" +
      // 第二层：撑到一分钟它自己松开，然后消失。松开之后不再有任何事
      "if(self){over=true;b.className='ut-hd gone';}else{b.textContent='0.0';}say();}" +
      "b.addEventListener('pointerdown',function(e){if(over||t0)return;" +
      "b.setPointerCapture(e.pointerId);t0=Date.now();tick();});" +
      "b.addEventListener('pointerup',function(){if(t0)stop(false);});" +
      "b.addEventListener('pointercancel',function(){if(t0)stop(false);});" +
      "})();</script>",
  },
  {
    title: "保存",
    html:
      BOX +
      "<style>.useless-thing .ut-sv{display:flex;flex-direction:column;" +
      "align-items:center;gap:1.25rem;width:min(26rem,100%)}" +
      ".useless-thing .ut-sv textarea{width:100%;min-height:7rem;font:inherit;" +
      "font-size:.9375rem;line-height:2;color:var(--fg,#222);background:transparent;" +
      "border:0;border-bottom:1px solid var(--border,rgba(128,128,128,.3));" +
      "padding:.5rem 0;resize:none;outline:none}</style>" +
      "<div class='ut'><div class='ut-sv'><textarea rows='4'></textarea>" +
      "<button class='ut-btn' type='button'>保存</button></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var ta=R.querySelector('textarea'),btn=R.querySelector('.ut-btn');" +
      "var s=M.get('save','');" +
      // 第二层：确实存住了，但你每回来看它一次，它就少一个字。不问是哪一个
      "if(s){var i=(Math.random()*s.length)|0;s=s.slice(0,i)+s.slice(i+1);M.set('save',s);}" +
      "ta.value=s;" +
      "btn.addEventListener('click',function(){M.set('save',ta.value);" +
      "btn.textContent='已保存';" +
      "setTimeout(function(){btn.textContent='保存';},1600);});" +
      "})();</script>",
  },
  {
    title: "走过的路",
    html:
      BOX +
      "<style>.useless-thing .ut-tr{position:relative;width:100%;flex:1;" +
      "min-height:14rem;touch-action:none}" +
      ".useless-thing .ut-tr canvas{position:absolute;inset:0;width:100%;height:100%;" +
      "display:block}" +
      ".useless-thing .ut-tr-n{position:absolute;left:.9rem;bottom:.6rem;" +
      "font-family:ui-monospace,Menlo,monospace;font-size:.6875rem;opacity:.3}</style>" +
      "<div class='ut'><div class='ut-tr'><canvas width='1000' height='700'></canvas>" +
      "<span class='ut-tr-n'></span></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var box=R.querySelector('.ut-tr'),cv=R.querySelector('canvas')," +
      "lab=R.querySelector('.ut-tr-n'),g=cv.getContext('2d');" +
      "var raw=M.get('trail',''),old=raw?raw.split(','):[];" +
      "var today=new Date().toDateString(),last=M.get('trailday','');" +
      "var days=M.num('traildays',0);" +
      "if(last!==today){days++;M.set('traildays',days);M.set('trailday',today);}" +
      "lab.textContent=days>1?days+' 天':'';" +
      "function seg(a,b,c,d,al){g.strokeStyle='rgba(128,128,128,'+al+')';" +
      "g.lineWidth=1;g.lineCap='round';g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke();}" +
      // 第二层：以前走过的还在，只是淡。这一趟画完就变成以前的，明天回来更淡
      "for(var i=2;i+1<old.length;i+=2)seg(+old[i-2],+old[i-1],+old[i],+old[i+1],0.14);" +
      "var prev=null,pts=old.slice(0),k=0;" +
      "function at(e){var r=box.getBoundingClientRect();" +
      "return[Math.round((e.clientX-r.left)/r.width*1000)," +
      "Math.round((e.clientY-r.top)/r.height*700)];}" +
      "box.addEventListener('pointermove',function(e){var p=at(e);" +
      "if(prev)seg(prev[0],prev[1],p[0],p[1],0.5);prev=p;" +
      // 写盘限流，且只留最近 1200 个点：这串要跟着每次访问一起读回来
      "if(++k%12)return;pts.push(p[0],p[1]);" +
      "if(pts.length>2400)pts=pts.slice(pts.length-2400);M.set('trail',pts.join(','));});" +
      "box.addEventListener('pointerleave',function(){prev=null;});" +
      "})();</script>",
  },
  {
    title: "排队",
    html:
      BOX +
      "<style>.useless-thing .ut-q{font-size:1.25rem;color:var(--muted-fg,#777);" +
      "line-height:2}" +
      ".useless-thing .ut-q-n{font-size:3.75rem;line-height:1.2;color:var(--fg,#222);" +
      "font-variant-numeric:tabular-nums}" +
      ".useless-thing .ut-q-t{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-q'>您前面还有</p><p class='ut-q-n'>12</p>" +
      "<p class='ut-mono ut-q-t'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var n=R.querySelector('.ut-q-n'),t=R.querySelector('.ut-q-t');" +
      "var cur=12,cap=12,was=M.num('queue',0),t0=Date.now(),over=false;" +
      "setInterval(function(){var w=was+(Date.now()-t0)/1000;M.set('queue',Math.round(w));" +
      "if(!over)t.textContent='已等 '+Math.round(w)+' 秒';},1000);" +
      "setInterval(function(){if(over)return;" +
      "if(was+(Date.now()-t0)/1000>=180){over=true;n.textContent='0';" +
      // 第二层：熬满三分钟真的排到了。排到之后再等九秒，才知道排的是什么
      "setTimeout(function(){t.textContent='（没有窗口。）';},9000);return;}" +
      // 数到 1 就再添一个人：每一轮的队都比上一轮长
      "if(cur>1){cur--;}else{cap++;cur=cap;}n.textContent=String(cur);},3200);" +
      "})();</script>",
  },
  {
    title: "你今天来过",
    html:
      BOX +
      "<style>.useless-thing .ut-vs{color:var(--fg,#222);line-height:1.2;" +
      "font-variant-numeric:tabular-nums;transition:font-size .8s}" +
      ".useless-thing .ut-vs-u{font-size:1rem;color:var(--muted-fg,#777)}" +
      ".useless-thing .ut-vs-d{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-vs'>1</p><p class='ut-vs-u'>次</p>" +
      "<p class='ut-mono ut-vs-d'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var big=R.querySelector('.ut-vs'),d=R.querySelector('.ut-vs-d');" +
      "var today=new Date().toDateString()," +
      "y=new Date(Date.now()-86400000).toDateString();" +
      "var day=M.get('visitday',''),c=M.num('visits',0),run=M.num('visitrun',0);" +
      "if(day!==today){c=0;run=(day===y)?run+1:1;" +
      "M.set('visitrun',run);M.set('visitday',today);}" +
      "c++;M.set('visits',c);big.textContent=String(c);" +
      // 第二层：这一页一个字都没变，变大的是你今天回来的次数
      "big.style.fontSize=Math.min(9,3.5+c*0.7).toFixed(2)+'rem';" +
      "if(run>1)d.textContent='连续 '+run+' 天';" +
      "})();</script>",
  },
  {
    title: "装满",
    html:
      BOX +
      "<style>.useless-thing .ut-fl{position:relative;width:9rem;height:12rem;" +
      "border:1px solid currentColor;border-top:0;cursor:pointer;overflow:hidden}" +
      ".useless-thing .ut-fl-w{position:absolute;left:0;right:0;bottom:0;height:0;" +
      "background:currentColor;opacity:.3;transition:height .3s}" +
      ".useless-thing .ut-fl-n{min-height:1.2em}</style>" +
      "<div class='ut'><div class='ut-fl'><div class='ut-fl-w'></div></div>" +
      "<p class='ut-mono ut-fl-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var box=R.querySelector('.ut-fl'),w=R.querySelector('.ut-fl-w')," +
      "lab=R.querySelector('.ut-fl-n');" +
      "var CAP=200,v=M.num('fill',0),full=M.num('fills',0)," +
      "ts=M.num('fillts',Date.now()),busy=false;" +
      // 第二层之一：你不在的时候它一直在漏，一分钟一滴。走开一晚回来就是空的
      "var leak=Math.floor((Date.now()-ts)/60000);if(leak>0)v=Math.max(0,v-leak);" +
      "ts=Date.now();M.set('fillts',ts);M.set('fill',v);" +
      "function draw(){w.style.height=(v/CAP*100).toFixed(1)+'%';" +
      "lab.textContent=full>0?'满过 '+full+' 次':'';}" +
      "draw();" +
      "setInterval(function(){if(busy||v<=0)return;v-=1;" +
      "M.set('fill',v);M.set('fillts',Date.now());draw();},60000);" +
      "box.addEventListener('pointerdown',function(){if(busy)return;" +
      "v++;M.set('fill',v);M.set('fillts',Date.now());draw();if(v<CAP)return;" +
      // 第二层之二：真装满了，底就裂开。次数记着，水一滴不剩
      "busy=true;full++;M.set('fills',full);" +
      "setTimeout(function(){w.style.transition='height 2.4s';v=0;" +
      "M.set('fill',0);M.set('fillts',Date.now());draw();" +
      "setTimeout(function(){w.style.transition='height .3s';busy=false;},2600);},600);});" +
      "})();</script>",
  },
  {
    title: "拖",
    html:
      BOX +
      "<style>.useless-thing .ut-dg{position:relative;width:100%;flex:1;" +
      "min-height:14rem;overflow:hidden}" +
      ".useless-thing .ut-dg-b{position:absolute;left:50%;top:50%;" +
      "width:3.5rem;height:3.5rem;margin:-1.75rem 0 0 -1.75rem;" +
      "border:1px solid currentColor;cursor:grab;touch-action:none}" +
      ".useless-thing .ut-dg-b.hold{cursor:grabbing}</style>" +
      "<div class='ut'><div class='ut-dg'><div class='ut-dg-b'></div></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-dg'),b=R.querySelector('.ut-dg-b');" +
      "var x=0,y=0,sx=0,sy=0,ox=0,oy=0,down=false,raf=0;" +
      "function put(){b.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';}" +
      // 第二层之一：拖得越远，回原位越慢
      "function back(){cancelAnimationFrame(raf);" +
      "var k=Math.max(0.004,0.06-Math.hypot(x,y)/9000);" +
      "function step(){x+=-x*k;y+=-y*k;put();" +
      "if(Math.abs(x)+Math.abs(y)>0.4){raf=requestAnimationFrame(step);}" +
      "else{x=0;y=0;put();}}step();}" +
      "b.addEventListener('pointerdown',function(e){down=true;b.className='ut-dg-b hold';" +
      "b.setPointerCapture(e.pointerId);cancelAnimationFrame(raf);" +
      "sx=e.clientX;sy=e.clientY;ox=x;oy=y;});" +
      "b.addEventListener('pointermove',function(e){if(!down)return;" +
      "x=ox+e.clientX-sx;y=oy+e.clientY-sy;put();});" +
      // 第二层之二：扔出台子外面它就不回来了。空四秒，然后自己爬回来
      "function up(){if(!down)return;down=false;b.className='ut-dg-b';" +
      "var r=box.getBoundingClientRect();" +
      "if(Math.abs(x)>r.width/2||Math.abs(y)>r.height/2){setTimeout(back,4000);}else{back();}}" +
      "b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);" +
      "})();</script>",
  },
  {
    title: "删",
    html:
      BOX +
      "<style>.useless-thing .ut-dl{max-width:19em;font-size:1.3125rem;line-height:2.2;" +
      "color:var(--fg,#222)}" +
      ".useless-thing .ut-dl span{cursor:pointer;transition:opacity .4s}" +
      ".useless-thing .ut-dl span.off{opacity:0;cursor:default}" +
      ".useless-thing .ut-dl-n{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-dl'></p><p class='ut-mono ut-dl-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var p=R.querySelector('.ut-dl'),lab=R.querySelector('.ut-dl-n');" +
      // 这句话自己就是机制：点掉的字，下次回来还是空的
      "var S='说过的话，绝大部分没有留下任何记录。';" +
      "var mark=M.get('del',''),gone={},cnt=0;" +
      "for(var i=0;i<S.length;i++)if(mark.charAt(i)==='1'){gone[i]=1;cnt++;}" +
      "for(var k=0;k<S.length;k++){var e=document.createElement('span');" +
      "e.textContent=S.charAt(k);e.setAttribute('data-i',String(k));" +
      "if(gone[k])e.className='off';p.appendChild(e);}" +
      "function say(){lab.textContent=cnt>0?'已删 '+cnt+' 个':'';}" +
      "say();" +
      "p.addEventListener('click',function(ev){var t=ev.target;if(t===p)return;" +
      "var i=+t.getAttribute('data-i');if(!(i>=0)||gone[i])return;" +
      "gone[i]=1;cnt++;t.className='off';" +
      "var out='';for(var j=0;j<S.length;j++)out+=gone[j]?'1':'0';" +
      "M.set('del',out);say();});" +
      "})();</script>",
  },
  {
    title: "秒表",
    html:
      BOX +
      "<style>.useless-thing .ut-wt{font-size:3.25rem;color:var(--fg,#222);" +
      "line-height:1.2;font-variant-numeric:tabular-nums;min-height:1.2em}" +
      ".useless-thing .ut-wt-u{font-size:.9375rem;color:var(--muted-fg,#777);" +
      "min-height:1.4em}</style>" +
      "<div class='ut'><p class='ut-wt'>0.0</p><p class='ut-wt-u'>秒</p>" +
      "<button class='ut-btn' type='button'>开始</button></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      MEM +
      "var big=R.querySelector('.ut-wt'),u=R.querySelector('.ut-wt-u')," +
      "btn=R.querySelector('.ut-btn');" +
      "var t0=M.num('watch',0);" +
      // 第二层：数大了就换个单位接着数。没有停止键，关掉浏览器它也一直在数
      "function draw(){var ms=Date.now()-t0;" +
      "if(ms<60000){big.textContent=(ms/1000).toFixed(1);u.textContent='秒';}" +
      "else if(ms<3600000){big.textContent=(ms/60000).toFixed(1);u.textContent='分';}" +
      "else if(ms<86400000){big.textContent=(ms/3600000).toFixed(2);u.textContent='小时';}" +
      "else{big.textContent=String(Math.floor(ms/86400000));u.textContent='天';}" +
      "requestAnimationFrame(draw);}" +
      "if(t0>0){btn.parentNode.removeChild(btn);draw();}" +
      "else{btn.addEventListener('click',function(){t0=Date.now();M.set('watch',t0);" +
      "btn.parentNode.removeChild(btn);draw();});}" +
      "})();</script>",
  },
  {
    title: "对折",
    html:
      BOX +
      "<style>.useless-thing .ut-fd-w{display:flex;align-items:center;" +
      "justify-content:center;width:100%;flex:1;min-height:14rem}" +
      ".useless-thing .ut-fd{width:16rem;height:20rem;border:1px solid currentColor;" +
      "cursor:pointer;transition:width .45s cubic-bezier(.2,.8,.2,1)," +
      "height .45s cubic-bezier(.2,.8,.2,1),transform .1s}" +
      ".useless-thing .ut-fd.no{transform:translateX(4px)}" +
      ".useless-thing .ut-fd-n{min-height:1.2em}</style>" +
      "<div class='ut'><div class='ut-fd-w'><div class='ut-fd'></div></div>" +
      "<p class='ut-mono ut-fd-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var el=R.querySelector('.ut-fd'),lab=R.querySelector('.ut-fd-n');" +
      "var w=256,h=320,k=0;" +
      "el.addEventListener('click',function(){" +
      // 第二层：一张纸对折不过七次。第八下它只是抖一下，之后一直是这么大
      "if(k>=7){el.className='ut-fd no';" +
      "setTimeout(function(){el.className='ut-fd';},110);return;}" +
      "k++;if(k%2){h=h/2;}else{w=w/2;}" +
      "el.style.width=w.toFixed(2)+'px';el.style.height=h.toFixed(2)+'px';" +
      "lab.textContent=String(k);});" +
      "})();</script>",
  },
];
