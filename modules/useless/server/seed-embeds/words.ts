/**
 * 四、话语与沉默。
 *
 * 这一类都要**真的不留下**：不写 localStorage、不发请求、不在 DOM 里留副本。
 * 「说了但没人接住」是内容本身，偷偷存一份就把它变成了另一个笔记本。
 *
 * 清单里的 58 消失的键盘在 `misc.ts`。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const WORDS_EMBEDS: SeedEmbed[] = [
  {
    // 56 波浪里的字
    title: "波浪里的字",
    html:
      BOX +
      "<style>.useless-thing .ut-wv-w{display:flex;align-items:center;" +
      "justify-content:center;width:100%;flex:1;min-height:14rem;touch-action:none}" +
      ".useless-thing .ut-wv{font-size:1.5rem;color:var(--fg,#333);" +
      "max-width:20em;line-height:2.6}" +
      ".useless-thing .ut-wv span{display:inline-block;will-change:transform}</style>" +
      "<div class='ut'><div class='ut-wv-w'><p class='ut-wv'></p></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var w=R.querySelector('.ut-wv-w'),p=R.querySelector('.ut-wv');" +
      "var s='水面上的字，读完了也不会停下来。',E=[],A=[];" +
      "for(var i=0;i<s.length;i++){var e=document.createElement('span');" +
      "e.textContent=s.charAt(i);p.appendChild(e);E.push(e);A.push(5);}" +
      // 每个字差一点相位，看起来就像有东西从下面推过去
      "function frame(){var t=Date.now()/620;" +
      "for(var i=0;i<E.length;i++){A[i]+=(5-A[i])*0.008;" +
      "E[i].style.transform='translateY('+(Math.sin(t-i*0.42)*A[i]).toFixed(2)+'px)';}" +
      "requestAnimationFrame(frame);}frame();" +
      // 手划过去水面就被搅起来，而且要很久才平回去。字一个也没变
      "w.addEventListener('pointermove',function(ev){" +
      "for(var i=0;i<E.length;i++){var r=E[i].getBoundingClientRect();" +
      "var d=Math.abs(ev.clientX-(r.left+r.width/2))+Math.abs(ev.clientY-(r.top+r.height/2));" +
      "if(d<70)A[i]=Math.min(20,A[i]+(70-d)/70*1.4);}});" +
      "})();</script>",
  },
  {
    // 57 你的话变成了气泡
    title: "你的话变成了气泡",
    html:
      BOX +
      "<style>.useless-thing .ut-bub{position:relative;width:100%;max-width:25rem;" +
      "height:10rem;overflow:hidden}" +
      ".useless-thing .ut-bub-b{position:absolute;bottom:0;left:50%;" +
      "transform:translateX(-50%);padding:.35rem .8rem;border-radius:999px;" +
      "border:1px solid var(--border,rgba(128,128,128,.5));font-size:.8125rem;" +
      "white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis}" +
      ".useless-thing .ut-bub-i{width:19rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-bub-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-bub'></div>" +
      "<input class='ut-bub-i' type='text' />" +
      "<p class='ut-mono ut-bub-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-bub'),i=R.querySelector('.ut-bub-i')," +
      "n=R.querySelector('.ut-bub-n'),k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;k++;" +
      "var b=document.createElement('div');b.className='ut-bub-b';" +
      "b.textContent=i.value.trim();box.appendChild(b);i.value='';" +
      "var t0=Date.now(),dx=(Math.random()-.5)*40;" +
      // 越飘越淡，飘到顶就没了。没有人在上面接着
      "(function fly(){var p=(Date.now()-t0)/4600;" +
      "if(p>=1){b.remove();return;}" +
      "b.style.bottom=(p*150).toFixed(1)+'px';" +
      "b.style.opacity=(1-p).toFixed(3);" +
      "b.style.transform='translateX(calc(-50% + '+(dx*p).toFixed(1)+'px))';" +
      "requestAnimationFrame(fly);})();" +
      "n.textContent='你说了 '+k+' 句。它们都飘走了，没人接住。';});})();</script>",
  },
  {
    // 59 生而为人我很抱歉生成器
    title: "我很抱歉生成器",
    html:
      BOX +
      "<style>.useless-thing .ut-sry-i{width:20rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-sry-a{font-size:1.2rem;color:var(--fg,#333);min-height:2em}" +
      ".useless-thing .ut-sry-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-sry-a'></p>" +
      "<input class='ut-sry-i' type='text' />" +
      "<p class='ut-mono ut-sry-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-sry-i'),a=R.querySelector('.ut-sry-a')," +
      "n=R.querySelector('.ut-sry-n'),k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;i.value='';k++;" +
      // 不安慰、不追问，就一句「知道了」。这已经比大多数回应多了
      "a.textContent='知道了。但世界不在乎。';" +
      "n.textContent='第 '+k+' 条。这一页也不在乎，它只是数了一下。';});})();</script>",
  },
  {
    // 60 每日否定
    title: "每日否定",
    html:
      BOX +
      "<style>.useless-thing .ut-neg{font-size:1.45rem;color:var(--fg,#333);" +
      "max-width:17em;line-height:2;transition:opacity .5s;min-height:2em}" +
      ".useless-thing .ut-neg.out{opacity:.12}" +
      ".useless-thing .ut-neg-b{transition:opacity .5s}" +
      ".useless-thing .ut-neg-b.hide{opacity:0;pointer-events:none}</style>" +
      "<div class='ut'><p class='ut-neg'></p>" +
      "<button class='ut-btn ut-neg-b' type='button'>就这一句</button></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-neg'),b=R.querySelector('.ut-neg-b');" +
      "var A='你今天已经做得够好了。',B='你今天没有做得够好。',on=true,hold=false;" +
      "p.textContent=A;" +
      "setInterval(function(){if(hold)return;p.className='ut-neg out';" +
      "setTimeout(function(){if(hold){p.className='ut-neg';return;}" +
      "on=!on;p.textContent=on?A:B;p.className='ut-neg';},520);},3000);" +
      // 摁住这一句能停五秒。五秒之后它接着换，按钮也回来——你可以再摁一次
      "b.addEventListener('click',function(){if(hold)return;hold=true;" +
      "b.className='ut-btn ut-neg-b hide';" +
      "setTimeout(function(){hold=false;b.className='ut-btn ut-neg-b';},5000);});" +
      "})();</script>",
  },
  {
    // 61 情绪色板
    title: "情绪色板",
    html:
      BOX +
      "<style>.useless-thing .ut-pal{width:100%;max-width:26rem;height:12rem;" +
      "border-radius:2px;transition:background 1.2s linear}</style>" +
      "<div class='ut ut-tap'><div class='ut-pal'></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut'),d=R.querySelector('.ut-pal');" +
      // 没有文字，也没有解释。看着就行
      "function go(){d.style.background='hsl('+((Math.random()*360)|0)+','+" +
      "(14+((Math.random()*30)|0))+'%,'+(34+((Math.random()*30)|0))+'%)';}" +
      "go();box.addEventListener('pointerdown',go);})();</script>",
  },
  {
    // 62 今天我说了
    title: "今天我说了",
    html:
      BOX +
      "<style>.useless-thing .ut-said{font-size:1.5rem;color:var(--fg,#333);" +
      "max-width:19em;line-height:1.9;min-height:2em}" +
      ".useless-thing .ut-said-i{width:20rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-said-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-said'></p>" +
      "<input class='ut-said-i' type='text' />" +
      "<p class='ut-mono ut-said-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-said-i'),p=R.querySelector('.ut-said')," +
      "n=R.querySelector('.ut-said-n');" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;" +
      // 不存、不发、不算数。说过了就是说过了
      "p.textContent=i.value.trim();i.value='';i.disabled=true;" +
      "n.textContent='你说了。没有存在任何地方。刷新之后连你也找不回来。';});})();</script>",
  },
  {
    // 63 废话翻译器
    title: "废话翻译器",
    html:
      BOX +
      "<style>.useless-thing .ut-bs-i{width:21rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-bs-o{max-width:24em;font-size:1rem;line-height:1.9;" +
      "color:var(--fg,#333);min-height:3em}" +
      ".useless-thing .ut-bs-n{max-width:23em}</style>" +
      "<div class='ut'>" +
      "<input class='ut-bs-i' type='text' />" +
      "<p class='ut-bs-o'></p>" +
      "<button class='ut-btn' type='button'>再翻一次</button>" +
      "<p class='ut-mono ut-bs-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-bs-i'),o=R.querySelector('.ut-bs-o')," +
      "b=R.querySelector('.ut-btn'),n=R.querySelector('.ut-bs-n');" +
      "var src='',hi=false,k=0;" +
      "var P=['从底层逻辑上看，','站在更高的维度，','在当前这个时间节点上，'," +
      "'基于闭环思维，'];" +
      "var S=['，这件事本身是可以被打通的。','，最终还是要回到价值本身。'," +
      "'，这是一个需要被抓手撬动的点。','，本质上是认知的对齐问题。'];" +
      "function show(){o.textContent=hi?(P[k%P.length]+src+S[k%S.length]):src;}" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;src=i.value.trim();i.value='';" +
      "hi=true;show();n.textContent='高级版。意思一点没多。';});" +
      // 来回翻，两边都在那儿，多出来的只有字数
      "b.addEventListener('click',function(){if(!src)return;hi=!hi;if(hi)k++;show();" +
      "n.textContent=hi?'高级版。意思一点没多。':'原句。它一直是这个意思。';});})();</script>",
  },
  {
    // 64 输入即消失
    title: "输入即消失",
    html:
      BOX +
      "<style>.useless-thing .ut-van{width:21rem;padding:.6rem .8rem;font:inherit;" +
      "font-size:1rem;border:none;border-bottom:1px solid var(--border,#ccc);" +
      "background:transparent;color:inherit;text-align:center;outline:none}" +
      ".useless-thing .ut-van:focus{border-bottom-color:currentColor}" +
      ".useless-thing .ut-van-n{max-width:22em;min-height:2.4em}</style>" +
      "<div class='ut'><input class='ut-van' type='text' />" +
      "<p class='ut-mono ut-van-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-van'),n=R.querySelector('.ut-van-n'),c=0,k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.length)return;" +
      // 不显示、不留存、不确认。按下回车之后什么都没有发生
      "c+=i.value.length;k++;i.value='';" +
      "n.textContent='它吞掉了 '+c+' 个字，分 '+k+' 次。没有记录，也没有回显。';});" +
      "})();</script>",
  },
  {
    // 65 安静模式
    title: "安静模式",
    html:
      BOX +
      "<style>.useless-thing .ut-quiet{position:relative;width:100%;max-width:26rem;" +
      "min-height:13rem;display:grid;place-content:center}" +
      ".useless-thing .ut-quiet-v{position:absolute;inset:0;" +
      "background:rgba(10,10,10,.92);color:#8b8b8b;display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;" +
      "font-size:.8125rem;letter-spacing:.08em;opacity:0;pointer-events:none;" +
      "transition:opacity 2.4s ease-in}" +
      ".useless-thing .ut-quiet-v.on{opacity:1;pointer-events:auto}" +
      ".useless-thing .ut-quiet-x{font:inherit;letter-spacing:.08em;" +
      "padding:.35rem .9rem;border:1px solid currentColor;background:transparent;" +
      "color:inherit;cursor:pointer;border-radius:0;transition:opacity .6s}" +
      ".useless-thing .ut-quiet-x.gone{opacity:0;pointer-events:none}</style>" +
      "<div class='ut'><div class='ut-quiet'>" +
      "<p class='ut-mono'>什么都不要做。</p>" +
      "<div class='ut-quiet-v'><span>你已进入安静模式</span>" +
      "<button class='ut-quiet-x' type='button'>退出</button></div></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var v=R.querySelector('.ut-quiet-v'),x=R.querySelector('.ut-quiet-x'),k=0;" +
      "setTimeout(function(){v.className='ut-quiet-v on';},1800);" +
      // 退得出去，但三秒后它又回来。退到第四次，连那个「退出」都不给了
      "x.addEventListener('click',function(){k++;v.className='ut-quiet-v';" +
      "if(k>=4)x.className='ut-quiet-x gone';" +
      "setTimeout(function(){v.className='ut-quiet-v on';},3000);});" +
      "})();</script>",
  },
  {
    // 66 聊天记录回顾
    title: "聊天记录回顾",
    html:
      BOX +
      "<style>.useless-thing .ut-ch{width:100%;max-width:22rem;display:flex;" +
      "flex-direction:column;gap:.45rem}" +
      ".useless-thing .ut-ch-m{max-width:76%;padding:.4rem .7rem;font-size:.8125rem;" +
      "line-height:1.6;border:1px solid var(--border,rgba(128,128,128,.35));" +
      "border-radius:10px;filter:blur(3.5px);user-select:none;" +
      "transition:filter .5s}" +
      ".useless-thing .ut-ch-m.me{align-self:flex-end}" +
      ".useless-thing .ut-ch-m.clear{filter:none}</style>" +
      "<div class='ut'><div class='ut-ch'></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-ch');" +
      // 糊着的是当时说的。盯住两秒它就清楚了，清楚下来的却是另一句——
      // 你记得的比说过的短
      "var L=[[0,'那天的事我想了很久','那天的事'],[1,'嗯 我也是','嗯']," +
      "[0,'其实当时我想说的是','……'],[1,'算了 都过去了','算了']," +
      "[0,'那你最近还好吗','还好吗'],[1,'挺好的 你呢','挺好的']];" +
      "for(var i=0;i<L.length;i++){(function(row){" +
      "var m=document.createElement('div');" +
      "var base=row[0]?'ut-ch-m me':'ut-ch-m';" +
      "m.className=base;m.textContent=row[1];box.appendChild(m);" +
      "var tm=null,lock=false;" +
      "m.addEventListener('pointerenter',function(){if(lock)return;" +
      "m.className=base+' clear';" +
      "tm=setTimeout(function(){lock=true;m.textContent=row[2];},2000);});" +
      "m.addEventListener('pointerleave',function(){if(tm)clearTimeout(tm);" +
      "if(lock)return;m.className=base;});" +
      "})(L[i]);}})();</script>",
  },
  {
    // 67 声音回收站
    title: "声音回收站",
    html:
      BOX +
      "<style>.useless-thing .ut-rec-i{width:21rem;height:4.5rem;padding:.5rem .7rem;" +
      "font:inherit;font-size:.875rem;line-height:1.7;border:1px solid var(--border,#ccc);" +
      "border-radius:6px;background:transparent;color:inherit;resize:none}" +
      ".useless-thing .ut-rec-s{font-size:1.3rem;color:var(--fg,#333);min-height:1.6em;" +
      "letter-spacing:.1em}" +
      ".useless-thing .ut-rec-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-rec-s'></p>" +
      "<textarea class='ut-rec-i'></textarea>" +
      "<button class='ut-btn' type='button'>回收</button>" +
      "<p class='ut-mono ut-rec-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-rec-i'),b=R.querySelector('.ut-btn')," +
      "s=R.querySelector('.ut-rec-s'),n=R.querySelector('.ut-rec-n'),k=0;" +
      "b.addEventListener('click',function(){if(!t.value.trim())return;k++;" +
      // 这里能回收，是因为这里本来就没人听见
      "t.value='';s.textContent='已回收';" +
      "n.textContent='第 '+k+' 句。没有记录。说出去的那一句还在外面。';});})();</script>",
  },
  {
    // 68 一段独白
    title: "一段独白",
    html:
      BOX +
      "<style>.useless-thing .ut-solo{position:relative;width:100%;max-width:24rem;" +
      "height:9rem}" +
      ".useless-thing .ut-solo-l{position:absolute;left:0;right:0;top:0;" +
      "font-size:1.05rem;line-height:1.9;color:var(--fg,#333);transition:opacity 1.1s}" +
      ".useless-thing .ut-solo-l.old{opacity:.12}" +
      ".useless-thing .ut-solo-i{width:min(18rem,90%);font:inherit;font-size:.875rem;" +
      "text-align:center;background:transparent;color:inherit;border:0;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.3));" +
      "padding:.45rem 0;outline:none;border-radius:0}</style>" +
      "<div class='ut'><div class='ut-solo'></div>" +
      "<input class='ut-solo-i' type='text' maxlength='18' /></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-solo'),i=R.querySelector('.ut-solo-i');" +
      "var A=['我在想一件事。','想不起来是什么了。','刚才明明还在的。'," +
      "'算了。','再想想。','是不是跟你有关。','也可能不是。','我在想一件事。'];" +
      "var k=0,cur=null,xi=-1,xn=0;" +
      "function next(){if(cur)cur.className='ut-solo-l old';" +
      // 你插的那句和别的没两样：转三圈之后，它也想不起来了
      "if(xi>=0&&k%A.length===xi){xn++;if(xn>3)A[xi]='刚才想说的那句，忘了。';}" +
      "var e=document.createElement('div');e.className='ut-solo-l';" +
      "e.textContent=A[k%A.length];box.appendChild(e);cur=e;k++;" +
      // 只留最近三句的影子，再往前的连影子都没有了
      "while(box.children.length>3)box.removeChild(box.firstChild);}" +
      "next();setInterval(next,3600);" +
      "i.addEventListener('keydown',function(e){if(e.key!=='Enter')return;" +
      "var v=i.value.trim();if(!v)return;i.value='';" +
      "A.push(v);xi=A.length-1;xn=0;});" +
      "})();</script>",
  },
  {
    // 69 沉默的计数器
    title: "沉默的计数器",
    html:
      BOX +
      "<style>.useless-thing .ut-sil{font-size:2.6rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-sil-i{width:min(18rem,90%);font:inherit;font-size:.875rem;" +
      "text-align:center;background:transparent;color:inherit;border:0;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.3));" +
      "padding:.45rem 0;outline:none;border-radius:0}</style>" +
      "<div class='ut'><p class='ut-sil'>—</p><p>人在线。</p>" +
      "<input class='ut-sil-i' type='text' maxlength='30' placeholder='说点什么' /></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-sil'),i=R.querySelector('.ut-sil-i')," +
      "v=3+Math.floor(Math.random()*40);" +
      "e.textContent=String(v);" +
      // 跳，但不落库。没有历史，也没有峰值
      "setInterval(function(){v=Math.max(1,v+Math.floor(Math.random()*7)-3);" +
      "e.textContent=String(v);},1400);" +
      // 你说的话不会出现在任何地方，只会让在线的人少一个。剩到一个就是你
      "i.addEventListener('keydown',function(ev){if(ev.key!=='Enter')return;" +
      "if(!i.value.trim())return;i.value='';v=Math.max(1,v-1);" +
      "e.textContent=String(v);});" +
      "})();</script>",
  },
  {
    // 70 道歉生成器
    title: "道歉生成器",
    html:
      BOX +
      "<style>.useless-thing .ut-apo-i{width:21rem;height:4.5rem;padding:.5rem .7rem;" +
      "font:inherit;font-size:.875rem;line-height:1.7;border:1px solid var(--border,#ccc);" +
      "border-radius:6px;background:transparent;color:inherit;resize:none}" +
      ".useless-thing .ut-apo-o{max-width:22em;font-size:1.05rem;line-height:1.9;" +
      "color:var(--fg,#333);min-height:2em}" +
      ".useless-thing .ut-apo-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-apo-o'></p>" +
      "<textarea class='ut-apo-i'></textarea>" +
      "<button class='ut-btn' type='button'>生成</button>" +
      "<p class='ut-mono ut-apo-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-apo-i'),b=R.querySelector('.ut-btn')," +
      "o=R.querySelector('.ut-apo-o'),n=R.querySelector('.ut-apo-n');" +
      "b.addEventListener('click',function(){if(!t.value.trim())return;" +
      // 它不替你说，只是指出你刚才已经说了
      "t.value='';o.textContent='如果你愿意道歉，你现在已经说了。';" +
      "n.textContent='没有记录，也没有发出去。剩下那一半得你自己去说。';});})();</script>",
  },
];
