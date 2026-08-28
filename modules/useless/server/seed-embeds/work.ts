/**
 * 三、劳动与成就。
 *
 * 口径：**把那套话术照原样播一遍，然后停住**。不反驳、不劝退、不给替代方案——
 * 反驳会变成另一碗鸡汤，而这一类东西的全部力气都花在「原样播出来」上。
 *
 * 清单里的 41 努力显示仪、53 待办清单（无完成版）在 `misc.ts`。
 * 44 和 98 是同一个（进步榜），46 和 72 是同一个（快捷键指南），各只做一份。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const WORK_EMBEDS: SeedEmbed[] = [
  {
    // 42 假装努力模拟器
    title: "假装努力模拟器",
    html:
      BOX +
      "<style>.useless-thing .ut-xl{width:100%;max-width:26rem;" +
      "border:1px solid var(--border,rgba(128,128,128,.35));" +
      "font-family:ui-monospace,Menlo,monospace;font-size:.6875rem}" +
      ".useless-thing .ut-xl-h{display:flex;background:rgba(128,128,128,.12)}" +
      ".useless-thing .ut-xl-b{display:flex;flex-wrap:wrap}" +
      ".useless-thing .ut-xl-c{flex:1 0 20%;padding:.3rem .35rem;" +
      "border-right:1px solid var(--border,rgba(128,128,128,.2));" +
      "border-top:1px solid var(--border,rgba(128,128,128,.2));" +
      "text-align:right;min-height:1.5em;overflow:hidden}" +
      ".useless-thing .ut-xl-n{max-width:24em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-xl'><div class='ut-xl-h'></div>" +
      "<div class='ut-xl-b'></div></div>" +
      "<p class='ut-mono ut-xl-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var head=R.querySelector('.ut-xl-h'),body=R.querySelector('.ut-xl-b')," +
      "grid=R.querySelector('.ut-xl'),n=R.querySelector('.ut-xl-n'),C=[],moved=0,t0=Date.now();" +
      "var H=['A','B','C','D','E'];" +
      "for(var i=0;i<H.length;i++){var h=document.createElement('div');" +
      "h.className='ut-xl-c';h.textContent=H[i];head.appendChild(h);}" +
      "for(var j=0;j<40;j++){var c=document.createElement('div');" +
      "c.className='ut-xl-c';body.appendChild(c);C.push(c);}" +
      // 鼠标一动就自己填数。表格越满，你越像在干活
      "grid.addEventListener('pointermove',function(){moved++;" +
      "if(moved%3)return;var c=C[(Math.random()*C.length)|0];" +
      "c.textContent=(Math.random()*10000).toFixed(2);});" +
      "setInterval(function(){var s=(Date.now()-t0)/1000;" +
      "n.textContent='虚假生产力指数：'+(moved/Math.max(1,s)*7).toFixed(1)+" +
      "'。已维持 '+Math.floor(s)+' 秒。这张表没有人会看。';},500);})();</script>",
  },
  {
    // 43 今日热搜（但你不需要知道）
    title: "今日热搜",
    html:
      BOX +
      "<style>.useless-thing .ut-hot{width:100%;max-width:23rem;display:flex;" +
      "flex-direction:column;gap:.35rem}" +
      ".useless-thing .ut-hot-r{display:flex;gap:.6rem;font-size:.875rem;" +
      "cursor:pointer;padding:.25rem 0;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.18))}" +
      ".useless-thing .ut-hot-i{opacity:.5;width:1.2em}" +
      ".useless-thing .ut-hot-t{color:var(--fg,#333)}" +
      ".useless-thing .ut-hot-r.read .ut-hot-t{opacity:.4;text-decoration:line-through}" +
      ".useless-thing .ut-hot-n{max-width:24em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-hot'></div>" +
      "<p class='ut-mono ut-hot-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-hot'),n=R.querySelector('.ut-hot-n'),k=0;" +
      // 全是占位，不指向任何真事——热搜的形状本来就比内容重要
      "var S=['某明星 某事','某地 某新规 引热议','某公司 回应了','某视频 冲上第一'," +
      "'某词条 被辟谣','某专家 建议','某榜单 更新','某事件 后续'];" +
      "for(var i=0;i<S.length;i++){(function(idx){" +
      "var r=document.createElement('div');r.className='ut-hot-r';" +
      "var a=document.createElement('span');a.className='ut-hot-i';" +
      "a.textContent=String(idx+1);" +
      "var b=document.createElement('span');b.className='ut-hot-t';b.textContent=S[idx];" +
      "r.appendChild(a);r.appendChild(b);box.appendChild(r);" +
      "r.addEventListener('click',function(){" +
      "if(r.className.indexOf('read')<0){r.className='ut-hot-r read';k++;}" +
      "n.textContent='这条不影响你今天吃任何一顿饭。你已经点开 '+k+' 条了。';});})(i);}" +
      "})();</script>",
  },
  {
    // 44 / 98 进步榜
    title: "进步榜",
    html:
      BOX +
      "<style>.useless-thing .ut-rk{width:100%;max-width:20rem;display:flex;" +
      "flex-direction:column;gap:.4rem}" +
      ".useless-thing .ut-rk-r{display:flex;justify-content:space-between;gap:1rem;" +
      "font-size:.875rem;opacity:.7}" +
      ".useless-thing .ut-rk-r.me{opacity:1;color:var(--fg,#333)}" +
      ".useless-thing .ut-rk-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-rk'></div>" +
      "<button class='ut-btn' type='button'>刷新排名</button>" +
      "<p class='ut-mono ut-rk-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-rk'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-rk-n'),k=0,t0=Date.now();" +
      "var L=['你','同事','同龄人','一个陌生人','另一个陌生人'];" +
      "function go(){box.textContent='';" +
      "var a=L.slice();for(var i=a.length-1;i>0;i--){" +
      "var j=(Math.random()*(i+1))|0,t=a[i];a[i]=a[j];a[j]=t;}" +
      "for(var m=0;m<a.length;m++){var r=document.createElement('div');" +
      "r.className=a[m]==='你'?'ut-rk-r me':'ut-rk-r';" +
      "var p=document.createElement('span');p.textContent=(m+1)+'. '+a[m];" +
      "var s=document.createElement('span');s.textContent=(99-m*7-((Math.random()*5)|0))+' 分';" +
      "r.appendChild(p);r.appendChild(s);box.appendChild(r);}}" +
      "go();b.addEventListener('click',function(){k++;go();" +
      // 排名是随机洗的。紧张那三秒是真的
      "n.textContent='刷了 '+k+' 次。名次是随机洗的，你刚才为它紧张了 '+" +
      "Math.max(3,Math.floor((Date.now()-t0)/1000))+' 秒。';});})();</script>",
  },
  {
    // 45 成功学回音壁
    title: "成功学回音壁",
    html:
      BOX +
      "<style>.useless-thing .ut-ec-i{width:19rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-ec-o{max-width:26em;max-height:10rem;overflow-y:auto;" +
      "font-size:.8125rem;line-height:1.9;text-align:left}" +
      ".useless-thing .ut-ec-n{max-width:24em;min-height:2.4em}</style>" +
      "<div class='ut'>" +
      "<input class='ut-ec-i' type='text' />" +
      "<div class='ut-ec-o'></div><p class='ut-mono ut-ec-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-ec-i'),o=R.querySelector('.ut-ec-o')," +
      "n=R.querySelector('.ut-ec-n');" +
      "var T=['要','就一定要','必须','从今天起','别再犹豫，'];" +
      "var E=['。','！','，没有任何借口。','，这是唯一的路。','，剩下的交给时间。'];" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;var g=i.value.trim();i.value='';" +
      // 把你的目标原样重复二十遍就是全部内容。它没有别的东西可给你
      "var s='';for(var k=0;k<20;k++)s+=T[k%T.length]+g+E[k%E.length];" +
      "o.textContent=s;o.scrollTop=0;" +
      "n.textContent='你被激励了大约 0.5 秒。明天早上你会忘了它。';});})();</script>",
  },
  {
    // 46 / 72 快捷键指南
    title: "快捷键指南",
    html:
      BOX +
      "<style>.useless-thing .ut-ks-w{display:flex;flex-direction:column;" +
      "align-items:center;gap:1rem;width:100%;max-width:22rem;padding:.5rem;" +
      "outline:none;cursor:pointer}" +
      ".useless-thing .ut-ks-w:focus-visible{outline:1px solid currentColor;" +
      "outline-offset:6px}" +
      ".useless-thing .ut-ks{width:100%;display:flex;flex-direction:column;" +
      "gap:.4rem;font-size:.8125rem}" +
      ".useless-thing .ut-ks-r{display:flex;justify-content:space-between;gap:1rem;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.18));padding-bottom:.3rem;" +
      "transition:opacity .4s}" +
      ".useless-thing .ut-ks-r.done{opacity:.22;text-decoration:line-through}" +
      ".useless-thing .ut-ks-k{font-family:ui-monospace,Menlo,monospace;" +
      "color:var(--fg,#333)}" +
      ".useless-thing .ut-ks-h{color:var(--fg,#333);font-size:.9375rem}</style>" +
      "<div class='ut'><div class='ut-ks-w' tabindex='0'>" +
      "<p class='ut-ks-h'>你不需要这个。</p><div class='ut-ks'></div>" +
      "<p class='ut-mono'>点这里，然后按。</p></div></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var w=R.querySelector('.ut-ks-w'),box=R.querySelector('.ut-ks');" +
      "var T=[['Ctrl / Cmd + C','复制','c'],['Ctrl / Cmd + V','粘贴','v']," +
      "['Ctrl / Cmd + Z','撤销','z'],['Ctrl / Cmd + S','保存','s']," +
      "['Ctrl / Cmd + F','查找','f'],['Ctrl / Cmd + A','全选','a']," +
      // 最后这条抓不到：换一件事做是系统的事，不归这一页管，所以它划不掉
      "['Alt / Cmd + Tab','换一件事做','']];" +
      "var rows=[];" +
      "for(var i=0;i<T.length;i++){var r=document.createElement('div');" +
      "r.className='ut-ks-r';var k=document.createElement('span');" +
      "k.className='ut-ks-k';k.textContent=T[i][0];" +
      "var d=document.createElement('span');d.textContent=T[i][1];" +
      "r.appendChild(k);r.appendChild(d);box.appendChild(r);rows.push(r);}" +
      "w.addEventListener('pointerdown',function(){w.focus();});" +
      "w.addEventListener('keydown',function(e){" +
      "if(!(e.ctrlKey||e.metaKey))return;var key=(e.key||'').toLowerCase();" +
      "for(var j=0;j<T.length;j++){if(T[j][2]&&T[j][2]===key){" +
      "e.preventDefault();rows[j].className='ut-ks-r done';return;}}});" +
      "})();</script>",
  },
  {
    // 47 年度总结提前看
    title: "年度总结提前看",
    html:
      BOX +
      "<style>.useless-thing .ut-yr-t{font-size:1.15rem;color:var(--fg,#333);" +
      "max-width:22em;line-height:2;min-height:4em;transition:opacity .35s}" +
      ".useless-thing .ut-yr-t.out{opacity:0}" +
      ".useless-thing .ut-yr-n{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-yr-t'></p>" +
      "<button class='ut-btn' type='button'>就这样吧</button>" +
      "<p class='ut-mono ut-yr-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-yr-t'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-yr-n');" +
      "var y=new Date().getFullYear(),k=0;" +
      // 提前发，省得到年底再写一遍。按一下就再往后发一年，内容一个字不用改
      "function draw(){t.textContent=k>=5?(y+' 年。跟前面几年差不多。')" +
      ":(y+' 年，你大部分时间在刷手机。偶尔焦虑。年底发现跟去年差不多。');" +
      "n.textContent=k>0?'已经提前发到 '+y+' 年':'';}" +
      "draw();" +
      "b.addEventListener('click',function(){k++;y++;t.className='ut-yr-t out';" +
      "setTimeout(function(){draw();t.className='ut-yr-t';},380);});" +
      "})();</script>",
  },
  {
    // 48 人生顾问
    title: "人生顾问",
    html:
      BOX +
      "<style>.useless-thing .ut-adv-i{width:20rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-adv-a{font-size:1.2rem;color:var(--fg,#333);max-width:18em;" +
      "line-height:1.9;min-height:2em}" +
      ".useless-thing .ut-adv-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-adv-a'></p>" +
      "<input class='ut-adv-i' type='text' />" +
      "<p class='ut-mono ut-adv-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-adv-i'),a=R.querySelector('.ut-adv-a')," +
      "n=R.querySelector('.ut-adv-n'),k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;i.value='';k++;" +
      "a.textContent='……';" +
      // 想多久都一样。它只有这一句，而这一句恰好是对的
      "setTimeout(function(){a.textContent='你心里已经有答案了。';" +
      "n.textContent=k>1?('问了 '+k+' 次，回答没变过。'):'';},700);});})();</script>",
  },
  {
    // 49 成功人生的标准答案
    title: "成功人生的标准答案",
    html:
      BOX +
      "<style>.useless-thing .ut-std-i{width:8rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;text-align:center}" +
      ".useless-thing .ut-std-l{width:100%;max-width:20rem;display:flex;" +
      "flex-direction:column;gap:.35rem;font-size:.875rem;text-align:left}" +
      ".useless-thing .ut-std-n{max-width:23em;min-height:2.2em}</style>" +
      "<div class='ut'>" +
      "<input class='ut-std-i' type='number' min='1' max='120' placeholder='你多大了' />" +
      "<div class='ut-std-l'></div><p class='ut-mono ut-std-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-std-i'),l=R.querySelector('.ut-std-l')," +
      "n=R.querySelector('.ut-std-n');" +
      "i.addEventListener('input',function(){var a=parseInt(i.value,10);" +
      "l.textContent='';n.textContent='';if(!(a>0))return;" +
      "var T=['一份别人一听就懂的工作','一套写着你名字的房子','一段稳定的关系'," +
      "'一笔够撑半年的存款','一个说得出口的头衔','一副没什么毛病的身体'," +
      "'一份到 '+a+' 岁该有的从容'];" +
      "for(var k=0;k<T.length;k++){var r=document.createElement('div');" +
      "r.textContent='· '+T[k];l.appendChild(r);}" +
      // 清单是现成的，谁都背得出。最后一句才是这一段的全部
      "n.textContent='这是 '+a+' 岁该有的。但你没有。所以呢？';});})();</script>",
  },
  {
    // 50 努力的我 vs 假装努力的我
    title: "努力的我和假装努力的我",
    html:
      BOX +
      "<style>.useless-thing .ut-vs{display:flex;gap:.8rem;width:100%;max-width:26rem;" +
      "flex-wrap:wrap;justify-content:center}" +
      ".useless-thing .ut-vs-c{flex:1 1 10rem;display:flex;flex-direction:column;gap:.4rem}" +
      ".useless-thing .ut-vs-h{font-size:.75rem;opacity:.6}" +
      ".useless-thing .ut-vs-t{width:100%;height:5.5rem;padding:.5rem .6rem;font:inherit;" +
      "font-size:.8125rem;line-height:1.7;border:1px solid var(--border,#ccc);" +
      "border-radius:6px;background:transparent;color:inherit;resize:none}" +
      ".useless-thing .ut-vs-n{max-width:24em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-vs'>" +
      "<div class='ut-vs-c'><span class='ut-vs-h'>努力的我</span>" +
      "<textarea class='ut-vs-t ut-vs-a' placeholder='今天真的做了什么'></textarea></div>" +
      "<div class='ut-vs-c'><span class='ut-vs-h'>假装努力的我</span>" +
      "<textarea class='ut-vs-t ut-vs-b' placeholder='今天看起来做了什么'></textarea></div>" +
      "</div><button class='ut-btn' type='button'>对比</button>" +
      "<p class='ut-mono ut-vs-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var a=R.querySelector('.ut-vs-a'),b=R.querySelector('.ut-vs-b')," +
      "btn=R.querySelector('.ut-btn'),n=R.querySelector('.ut-vs-n');" +
      "btn.addEventListener('click',function(){" +
      "if(!a.value.trim()&&!b.value.trim()){n.textContent='两边都空着。这也是一种对比。';return;}" +
      // 对比的结果是没有对比：两栏归成一栏，你自己看
      "var s=(a.value.trim()+'\\n'+b.value.trim()).trim();" +
      "a.value=s;b.value=s;a.disabled=true;b.disabled=true;btn.disabled=true;" +
      "n.textContent='对比完了：归成一类。从外面看，它们是同一件事。';});})();</script>",
  },
  {
    // 51 赞美文字雨
    title: "赞美文字雨",
    html:
      BOX +
      "<style>.useless-thing .ut-pr{position:relative;width:100%;max-width:26rem;" +
      "height:13rem;overflow:hidden}" +
      ".useless-thing .ut-pr-w{position:absolute;white-space:nowrap;font-size:.875rem;" +
      "color:var(--fg,#333);cursor:pointer;transition:opacity .5s}" +
      ".useless-thing .ut-pr-n{min-height:1.2em}</style>" +
      "<div class='ut'><div class='ut-pr'></div>" +
      "<p class='ut-mono ut-pr-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-pr'),lab=R.querySelector('.ut-pr-n'),W=[];" +
      "var G=[['你真棒','厉害','了不起','优秀','太强了']," +
      "['……你真棒','嗯，厉害','行吧，了不起','好的，优秀']," +
      "['你真棒。','厉害。','了不起。','优秀。'],['你真棒？','厉害？','了不起？']];" +
      "var g=0,got=0,stop=false;" +
      "setInterval(function(){if(!stop&&g<3)g=(g+1)%G.length;},3000);" +
      "setInterval(function(){if(stop||W.length>26)return;" +
      "var e=document.createElement('div');e.className='ut-pr-w';" +
      "var L=G[g];e.textContent=L[(Math.random()*L.length)|0];" +
      "e.style.left=(Math.random()*78)+'%';e.style.top='-1.4rem';" +
      "e.style.opacity=(0.25+Math.random()*0.6).toFixed(2);" +
      // 接得住。接满十句雨就停了，五秒后重来，来的全是带问号的那一组
      "e.addEventListener('click',function(){if(e.dataset.got)return;" +
      "e.dataset.got='1';e.style.opacity='0';got++;lab.textContent='接住 '+got+' 句';" +
      "if(got<10)return;stop=true;g=3;" +
      "setTimeout(function(){for(var i=W.length-1;i>=0;i--)" +
      "{if(W[i].e.parentNode)W[i].e.parentNode.removeChild(W[i].e);}W.length=0;" +
      "setTimeout(function(){stop=false;got=0;lab.textContent='';},5000);},600);});" +
      "box.appendChild(e);W.push({e:e,y:-22,v:0.5+Math.random()*1.1});},260);" +
      "function frame(){var h=box.getBoundingClientRect().height||208;" +
      "for(var i=W.length-1;i>=0;i--){var w=W[i];w.y+=w.v;" +
      "if(w.y>h){if(w.e.parentNode)w.e.parentNode.removeChild(w.e);W.splice(i,1);continue;}" +
      "w.e.style.top=w.y.toFixed(0)+'px';}" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 52 你觉得你值多少钱
    title: "你觉得你值多少钱",
    html:
      BOX +
      "<style>.useless-thing .ut-worth-b{font-size:2.4rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-worth-i{width:11rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;text-align:center}" +
      ".useless-thing .ut-worth-n{max-width:23em;min-height:3em}</style>" +
      "<div class='ut'><p class='ut-worth-b'>—</p>" +
      "<input class='ut-worth-i' type='number' min='0' />" +
      "<p class='ut-mono ut-worth-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-worth-b'),i=R.querySelector('.ut-worth-i')," +
      "n=R.querySelector('.ut-worth-n');" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter')return;var v=parseFloat(i.value);if(!(v>=0))return;" +
      "b.textContent=String(v);n.textContent='它只是数字。';" +
      // 换一个数，什么都没变。这就是它想说的
      "setTimeout(function(){var o=Math.round(v*(0.4+Math.random()*1.8));" +
      "b.textContent=String(o);" +
      "n.textContent='它也可以是这个数字。你还是你，一样都没变。';},1600);});})();</script>",
  },
  {
    // 54 加薪模拟器
    title: "加薪模拟器",
    html:
      BOX +
      "<style>.useless-thing .ut-rz-i{width:11rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;text-align:center;display:none}" +
      ".useless-thing .ut-rz-i.on{display:block}" +
      ".useless-thing .ut-rz-n{max-width:23em;min-height:2.6em;font-size:.9375rem;" +
      "color:var(--fg,#333)}</style>" +
      "<div class='ut'><button class='ut-btn' type='button'>要求加薪</button>" +
      "<input class='ut-rz-i' type='number' min='0' />" +
      "<p class='ut-mono ut-rz-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var b=R.querySelector('.ut-btn'),i=R.querySelector('.ut-rz-i')," +
      "n=R.querySelector('.ut-rz-n');" +
      "b.addEventListener('click',function(){b.disabled=true;i.className='ut-rz-i on';" +
      "i.focus();n.textContent='填一个数。';});" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value)return;var v=i.value;i.disabled=true;" +
      // 系统批了。批完那句才是重点
      "n.textContent='系统已批准：'+v+'。';" +
      "setTimeout(function(){n.textContent='系统已批准：'+v+'。但你不会提。';},1500);});" +
      "})();</script>",
  },
  {
    // 55 会议倒计时
    title: "会议倒计时",
    html:
      BOX +
      "<style>.useless-thing .ut-mt{font-size:3rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.1;" +
      "font-family:ui-monospace,Menlo,monospace}" +
      ".useless-thing .ut-mt-n{min-height:1.2em}</style>" +
      "<div class='ut'><p class='ut-mt'>--:--</p>" +
      "<button class='ut-btn' type='button'>延长 15 分钟</button>" +
      "<p class='ut-mono ut-mt-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-mt'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-mt-n');" +
      // 时长是开页那一刻随机定的，跟任何一场真实会议无关
      "var T=(25+Math.floor(Math.random()*70))*60000,t0=Date.now(),k=0;" +
      "var P=['延长 15 分钟','再延长 15 分钟','还要延长 15 分钟','继续延长 15 分钟'];" +
      "function p2(v){return v<10?'0'+v:''+v;}" +
      "function say(){n.textContent=k>0?'已延长 '+k+' 次':'';}" +
      "setInterval(function(){var left=T-(Date.now()-t0);" +
      // 归零也不散会：它自己往后再续五分钟
      "if(left<=0){T+=300000;k++;say();left=T-(Date.now()-t0);}" +
      "var s=Math.floor(left/1000);" +
      "e.textContent=p2(Math.floor(s/60))+':'+p2(s%60);},250);" +
      "b.addEventListener('click',function(){T+=900000;k++;say();" +
      "b.textContent=P[Math.min(k,P.length-1)];});" +
      "})();</script>",
  },
  {
    title: "砍一刀",
    html:
      BOX +
      "<style>.useless-thing .ut-cut-n{font-size:2.2rem;color:var(--fg,#333);" +
      "font-variant-numeric:tabular-nums;line-height:1.2}" +
      ".useless-thing .ut-cut-bar{width:14rem;height:3px;" +
      "background:var(--border,rgba(128,128,128,.25));overflow:hidden}" +
      ".useless-thing .ut-cut-f{height:100%;width:0;background:currentColor;" +
      "transition:width .35s cubic-bezier(.4,0,.2,1)}</style>" +
      "<div class='ut'><p class='ut-cut-n'>99.00</p><p>元。</p>" +
      "<div class='ut-cut-bar'><div class='ut-cut-f'></div></div>" +
      "<button class='ut-btn ut-cut-b' type='button'>砍一刀</button>" +
      "<p class='ut-mono ut-cut-t'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var f=R.querySelector('.ut-cut-f'),n=R.querySelector('.ut-cut-n')," +
      "t=R.querySelector('.ut-cut-t'),b=R.querySelector('.ut-cut-b')," +
      "remain=99,k=0,bumped=false;" +
      "var SAY=['就差一点点了','仅差最后一刀','仅差最后一刀'," +
      "'再邀请 1 位好友即可领取','该好友已参与过','请邀请从未注册过的用户'," +
      "'今日新用户名额已满','仅差最后一刀'];" +
      "function fmt(v){if(v>=0.01)return v.toFixed(2);" +
      "if(v>=0.0001)return v.toFixed(4);return v.toFixed(6);}" +
      "function draw(){n.textContent=fmt(remain);" +
      "f.style.width=((1-remain/99)*100).toFixed(3)+'%';}" +
      "b.addEventListener('click',function(){" +
      "if(b.disabled)return;k++;" +
      // 每一刀都是还没砍掉的那截的一个比例，越砍越小，永远不到零
      "remain-=remain*Math.min(0.85,0.9/Math.pow(k,0.5));" +
      // 快到底时加一截回去——话术叫加码，进度条会倒退一格
      "if(!bumped&&remain<0.28){remain+=0.91;bumped=true;t.textContent='活动加码';}" +
      "else t.textContent=SAY[Math.min(k-1,SAY.length-1)];" +
      "draw();b.disabled=true;" +
      "setTimeout(function(){b.disabled=false;},380);});})();</script>",
  },
];
