/**
 * 六、自我与内省。
 *
 * 最容易写坏的一类。两条硬规矩：**不诊断**（随机数就说自己是随机数）、
 * **不替你下结论**。把话说到「所以呢？」就停，后面那半句归读者。
 *
 * 清单里的 82 我、96 你确定吗确认器在 `misc.ts`。98 进步榜和 44 是同一个，
 * 在 `work.ts`。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { BOX } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const SELF_EMBEDS: SeedEmbed[] = [
  {
    // 81 影子不跟你走
    title: "影子不跟你走",
    html:
      BOX +
      "<style>.useless-thing .ut-sh{display:block;max-width:100%;height:auto;" +
      "cursor:crosshair}</style>" +
      "<div class='ut'><canvas class='ut-sh' width='320' height='190'></canvas>" +
      "<p class='ut-mono'>你往这边，它往那边。你跟不上它，它早就走了。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      /* 起手就错开：落在正中央的话影子和本人完全重叠，看着像画错了 */
      "var c=R.querySelector('.ut-sh'),x=c.getContext('2d'),mx=108,my=72;" +
      "c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();" +
      "mx=(e.clientX-r.left)*320/r.width;my=(e.clientY-r.top)*190/r.height;});" +
      "function man(px,py,col,sc){x.strokeStyle=col;x.lineWidth=2;x.lineCap='round';" +
      "x.beginPath();x.arc(px,py-16*sc,5*sc,0,7);x.stroke();x.beginPath();" +
      "x.moveTo(px,py-11*sc);x.lineTo(px,py+6*sc);" +
      "x.moveTo(px-8*sc,py-4*sc);x.lineTo(px+8*sc,py-4*sc);" +
      "x.moveTo(px,py+6*sc);x.lineTo(px-7*sc,py+18*sc);" +
      "x.moveTo(px,py+6*sc);x.lineTo(px+7*sc,py+18*sc);x.stroke();}" +
      "function frame(){x.clearRect(0,0,320,190);" +
      "man(mx,my,'rgba(128,134,140,.9)',1);" +
      // 影子按中心点镜像：你越用力靠近，它退得越远
      "man(320-mx,190-my,'rgba(128,134,140,.28)',1);" +
      "requestAnimationFrame(frame);}frame();})();</script>",
  },
  {
    // 83 睡前忏悔
    title: "睡前忏悔",
    html:
      BOX +
      "<style>.useless-thing .ut-conf-i{width:21rem;height:4.5rem;padding:.5rem .7rem;" +
      "font:inherit;font-size:.875rem;line-height:1.7;border:1px solid var(--border,#ccc);" +
      "border-radius:6px;background:transparent;color:inherit;resize:none;" +
      "transition:opacity 1.8s}" +
      ".useless-thing .ut-conf-i.go{opacity:0}" +
      ".useless-thing .ut-conf-q{font-size:1.1rem;color:var(--fg,#333);max-width:20em}" +
      ".useless-thing .ut-conf-n{max-width:24em;min-height:2.6em}</style>" +
      "<div class='ut'><p class='ut-conf-q'>你今天做了什么不值得骄傲的事？</p>" +
      "<textarea class='ut-conf-i'></textarea>" +
      "<button class='ut-btn' type='button'>说完了</button>" +
      "<p class='ut-mono ut-conf-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-conf-i'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-conf-n'),K='useless.confess',k=0;" +
      "try{k=parseInt(localStorage.getItem(K)||'0',10)||0;}catch(e){}" +
      "if(k)n.textContent='你在这台机器上坦白过 '+k+' 次。内容一次也没有留下来。';" +
      "b.addEventListener('click',function(){if(!t.value.trim())return;k++;" +
      "try{localStorage.setItem(K,String(k));}catch(e2){}" +
      "t.className='ut-conf-i go';" +
      // 只记次数，绝不记内容。内容消失了，但它确实发生过——你知道
      "setTimeout(function(){t.value='';t.className='ut-conf-i';},1900);" +
      "n.textContent='没了。没有人看到，这一页也没存。但它发生过，你知道。';});" +
      "})();</script>",
  },
  {
    // 84 理想的我 vs 实际的我
    title: "理想的我和实际的我",
    html:
      BOX +
      "<style>.useless-thing .ut-ideal{display:flex;gap:.8rem;width:100%;" +
      "max-width:26rem;flex-wrap:wrap;justify-content:center}" +
      ".useless-thing .ut-ideal-c{flex:1 1 10rem;display:flex;flex-direction:column;gap:.4rem}" +
      ".useless-thing .ut-ideal-h{font-size:.75rem;opacity:.6}" +
      ".useless-thing .ut-ideal-b{min-height:6rem;padding:.5rem .6rem;font-size:.8125rem;" +
      "line-height:1.8;border:1px solid var(--border,#ccc);border-radius:6px;text-align:left}" +
      ".useless-thing .ut-ideal-t{width:100%;height:6rem;padding:.5rem .6rem;font:inherit;" +
      "font-size:.8125rem;line-height:1.8;border:1px solid var(--border,#ccc);" +
      "border-radius:6px;background:transparent;color:inherit;resize:none}" +
      ".useless-thing .ut-ideal-n{max-width:24em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-ideal'>" +
      "<div class='ut-ideal-c'><span class='ut-ideal-h'>理想的我</span>" +
      "<div class='ut-ideal-b'></div></div>" +
      "<div class='ut-ideal-c'><span class='ut-ideal-h'>实际的我</span>" +
      "<textarea class='ut-ideal-t' placeholder='你自己写'></textarea></div>" +
      "</div><button class='ut-btn' type='button'>写好了</button>" +
      "<p class='ut-mono ut-ideal-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var l=R.querySelector('.ut-ideal-b'),t=R.querySelector('.ut-ideal-t')," +
      "b=R.querySelector('.ut-btn'),n=R.querySelector('.ut-ideal-n');" +
      "l.textContent='早睡早起。看书。不刷手机。定期运动。情绪稳定。存得下钱。';" +
      "b.addEventListener('click',function(){if(!t.value.trim())return;" +
      // 左边那栏认输了：它写不出比你更准的版本
      "l.textContent='同上。';b.disabled=true;t.disabled=true;" +
      "n.textContent='左边那栏原来是抄的。它现在抄你。';});})();</script>",
  },
  {
    // 85 人生 AI 建议
    title: "人生AI建议",
    html:
      BOX +
      "<style>.useless-thing .ut-ai-i{width:21rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-ai-a{font-size:1.05rem;color:var(--fg,#333);max-width:20em;" +
      "line-height:1.9;min-height:3em}" +
      ".useless-thing .ut-ai-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-ai-a'></p>" +
      "<input class='ut-ai-i' type='text' placeholder='问它任何问题，回车' />" +
      "<p class='ut-mono ut-ai-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var i=R.querySelector('.ut-ai-i'),a=R.querySelector('.ut-ai-a')," +
      "n=R.querySelector('.ut-ai-n'),k=0;" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;i.value='';k++;a.textContent='';" +
      "var s='我正在学习。据我目前所知，我也不知道。',j=0;" +
      // 一个字一个字吐出来，看着很像在想。它没有在想
      "var iv=setInterval(function(){a.textContent=s.slice(0,++j);" +
      "if(j>=s.length){clearInterval(iv);" +
      "n.textContent=k>1?('问了 '+k+' 次，它学得不快。'):'它没有联网，也没有在思考。';}},55);});" +
      "})();</script>",
  },
  {
    // 86 未来的你给你发了条消息
    title: "未来的你发来一条消息",
    html:
      BOX +
      "<style>.useless-thing .ut-fut-m{max-width:19em;padding:.6rem .9rem;" +
      "border:1px solid var(--border,rgba(128,128,128,.4));border-radius:12px;" +
      "font-size:.9375rem;line-height:1.9;color:var(--fg,#333);min-height:3em;" +
      "text-align:left}" +
      ".useless-thing .ut-fut-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-fut-m'></div>" +
      "<button class='ut-btn' type='button'>再来一条</button>" +
      "<p class='ut-mono ut-fut-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var m=R.querySelector('.ut-fut-m'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-fut-n'),k=0;" +
      "var S=['你当时纠结的那件事，现在都不重要了。'," +
      "'那个人后来联系过你一次。你没回。','你还是没去成那个地方。'," +
      "'你现在担心的那笔钱，后来不是问题。','有件事你到现在都没跟人说过。'," +
      "'你后来剪了头发。挺好的。','别熬了。这句你也不会听。'];" +
      "function go(){k++;m.textContent=S[(Math.random()*S.length)|0];" +
      // 没法验证。它就是一条来路不明的消息，跟大部分预言一样
      "n.textContent=k>1?'你没法验证任何一条。它们只是句子。':'';}" +
      "go();b.addEventListener('click',go);})();</script>",
  },
  {
    // 87 年度计划（无执行版）
    title: "年度计划",
    html:
      BOX +
      "<style>.useless-thing .ut-plan{width:100%;max-width:22rem;display:flex;" +
      "flex-direction:column;gap:.28rem;font-size:.8125rem;text-align:left}" +
      ".useless-thing .ut-plan-r{display:flex;justify-content:space-between;gap:1rem;" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.16));padding-bottom:.22rem}" +
      ".useless-thing .ut-plan-y{font-size:1.3rem;color:var(--fg,#333)}" +
      ".useless-thing .ut-plan-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><p class='ut-plan-y'></p><div class='ut-plan'></div>" +
      "<button class='ut-btn' type='button'>下一年</button>" +
      "<p class='ut-mono ut-plan-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-plan'),yl=R.querySelector('.ut-plan-y')," +
      "b=R.querySelector('.ut-btn'),n=R.querySelector('.ut-plan-n');" +
      "var now=new Date(),y=now.getFullYear(),left=12-now.getMonth()-1,k=0;" +
      "function draw(){box.textContent='';yl.textContent=y+' 年度计划';" +
      "for(var m=1;m<=12;m++){var r=document.createElement('div');" +
      "r.className='ut-plan-r';var a=document.createElement('span');" +
      "a.textContent=m+' 月';var c=document.createElement('span');" +
      "c.textContent='未执行';r.appendChild(a);r.appendChild(c);box.appendChild(r);}" +
      "n.textContent=k===0?('只剩 '+left+' 个月。你会开始吗？')" +
      ":('往后翻了 '+k+' 年。十二行还是那十二行。');}" +
      "draw();" +
      // 翻到哪一年都一样：这张表不需要更新
      "b.addEventListener('click',function(){y++;k++;draw();});})();</script>",
  },
  {
    // 88 你刚才浪费了 X 秒
    title: "你刚才浪费了多少秒",
    html:
      BOX +
      "<style>.useless-thing .ut-waste{color:var(--fg,#333);line-height:1.3;" +
      "font-variant-numeric:tabular-nums;transition:font-size .8s ease-out}" +
      ".useless-thing .ut-waste-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-waste'>0</p><p>秒。</p>" +
      "<p class='ut-mono ut-waste-n'>关掉之后它归零。下次打开，从头再来。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-waste'),t0=Date.now();e.style.fontSize='2rem';" +
      "setInterval(function(){var s=Math.floor((Date.now()-t0)/1000);" +
      "e.textContent=String(s);" +
      // 每十秒大一号，到 6rem 封顶——再大就要挤到别人身上了
      "e.style.fontSize=Math.min(6,2+Math.floor(s/10)*0.5)+'rem';},250);})();</script>",
  },
  {
    // 89 为什么你不做
    title: "为什么你不做",
    html:
      BOX +
      "<style>.useless-thing .ut-why-q{font-size:1.2rem;color:var(--fg,#333);" +
      "max-width:20em;line-height:1.9}" +
      ".useless-thing .ut-why-o{display:flex;flex-wrap:wrap;gap:.5rem;" +
      "justify-content:center;max-width:24rem}" +
      ".useless-thing .ut-why-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><p class='ut-why-q'>你为什么不做你想做的事？</p>" +
      "<div class='ut-why-o'></div><p class='ut-mono ut-why-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var box=R.querySelector('.ut-why-o'),n=R.querySelector('.ut-why-n'),k=0;" +
      "var O=['没钱','没时间','害怕','不知道怎么做','懒','时机不对'];" +
      "for(var i=0;i<O.length;i++){var b=document.createElement('button');" +
      "b.type='button';b.className='ut-btn';b.textContent=O[i];box.appendChild(b);}" +
      // 每个选项一个答案，六个都一样。这就是这一段的全部
      "box.addEventListener('click',function(e){" +
      "if(e.target.tagName!=='BUTTON')return;k++;" +
      "n.textContent=k<O.length?'这不是原因。这是借口。'" +
      ":'六个你都点过了。它们不是原因。';});})();</script>",
  },
  {
    // 90 我很好日报
    title: "我很好日报",
    html:
      BOX +
      "<style>.useless-thing .ut-daily{width:100%;max-width:23rem;" +
      "border-top:2px solid var(--border,rgba(128,128,128,.5));" +
      "border-bottom:1px solid var(--border,rgba(128,128,128,.3));padding:.8rem 0;" +
      "text-align:left}" +
      ".useless-thing .ut-daily-h{font-size:1.05rem;color:var(--fg,#333);line-height:1.8}" +
      ".useless-thing .ut-daily-b{font-size:.8125rem;line-height:1.9;opacity:.75}" +
      ".useless-thing .ut-daily-n{max-width:23em}</style>" +
      "<div class='ut'><div class='ut-daily'>" +
      "<div class='ut-daily-h'></div><div class='ut-daily-b'></div></div>" +
      "<p class='ut-mono ut-daily-n'>本报没有记者。以上数字全是编的。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var h=R.querySelector('.ut-daily-h'),b=R.querySelector('.ut-daily-b');" +
      "var H=['本地居民今日平均发呆时长上升 10%','本市今日无人提出新的人生规划'," +
      "'调查显示：多数人昨晚又刷到了两点','本地今日共有 0 人开始那件想做很久的事'," +
      "'本区居民今日平均叹气 4.2 次'];" +
      "var n=new Date(),k=(n.getFullYear()*372+n.getMonth()*31+n.getDate())%H.length;" +
      "h.textContent=H[k];" +
      // 结尾那句是这份报纸的全部社论
      "b.textContent='相关部门表示情况正常，无需处理。但大家看起来都还行。';})();</script>",
  },
  {
    // 91 再见，理想
    title: "再见，理想",
    html:
      BOX +
      "<style>.useless-thing .ut-quit-t{font-size:1.2rem;color:var(--fg,#333);" +
      "max-width:20em;line-height:1.9;min-height:2em}" +
      ".useless-thing .ut-quit-l{width:100%;max-width:20rem;display:none;" +
      "flex-direction:column;gap:.3rem;font-size:.8125rem;text-align:left;opacity:.75}" +
      ".useless-thing .ut-quit-l.on{display:flex}" +
      ".useless-thing .ut-quit-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-quit-t'></p>" +
      "<button class='ut-btn' type='button'>查看本周放弃列表</button>" +
      "<div class='ut-quit-l'></div><p class='ut-mono ut-quit-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-quit-t'),b=R.querySelector('.ut-btn')," +
      "l=R.querySelector('.ut-quit-l'),n=R.querySelector('.ut-quit-n');" +
      "var S=['学一门乐器','每天写一点东西','把那门语言学完','早上六点起来跑步'," +
      "'把家里彻底收拾一次','读完那本一直放着的书','去考那个证','自己做饭'];" +
      "var d=new Date(),base=d.getFullYear()*372+d.getMonth()*31+d.getDate();" +
      // 按日期取，不随机：今天放弃的就是今天这一个，明天换一个
      "t.textContent='今天你放弃了：'+S[base%S.length]+'。';" +
      "b.addEventListener('click',function(){b.disabled=true;l.className='ut-quit-l on';" +
      "for(var i=0;i<7;i++){var e=document.createElement('div');" +
      "e.textContent='· '+S[(base-i)%S.length];l.appendChild(e);}" +
      "n.textContent='一周七天，七件。下周还有。';});})();</script>",
  },
  {
    // 92 后悔生成器
    title: "后悔生成器",
    html:
      BOX +
      "<style>.useless-thing .ut-reg-t{font-size:1.15rem;color:var(--fg,#333);" +
      "max-width:20em;line-height:1.9;min-height:2em}" +
      ".useless-thing .ut-reg-n{max-width:23em;min-height:2.2em}</style>" +
      "<div class='ut'><p class='ut-reg-t'></p>" +
      "<button class='ut-btn' type='button'>今天后悔了什么</button>" +
      "<p class='ut-mono ut-reg-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-reg-t'),b=R.querySelector('.ut-btn')," +
      "n=R.querySelector('.ut-reg-n'),k=0;" +
      "var S=['那句话不该说的。','那条消息不该发的。','应该早点走的。'," +
      "'不该答应的。','应该问一句的。','不该看那一眼手机的。'," +
      "'应该多睡两小时的。','那顿饭不该吃的。','应该打那个电话的。'," +
      "'不该刷到这么晚的。'];" +
      "b.addEventListener('click',function(){k++;" +
      "t.textContent=S[(Math.random()*S.length)|0];" +
      // 十次封顶。再往下就不是后悔了，是消遣
      "if(k>=10){b.disabled=true;t.textContent='够了。';" +
      "n.textContent='去睡觉。';return;}" +
      "n.textContent='第 '+k+' 条。还能再点 '+(10-k)+' 次。';});})();</script>",
  },
  {
    // 93 这就是你的墓志铭
    title: "这就是你的墓志铭",
    html:
      BOX +
      "<style>.useless-thing .ut-epi{width:100%;max-width:21rem;padding:1.6rem 1.2rem;" +
      "border:1px solid var(--border,rgba(128,128,128,.4));" +
      "border-radius:10rem 10rem 4px 4px;font-size:.9375rem;line-height:2;" +
      "color:var(--fg,#333);min-height:8rem;display:grid;place-content:center}" +
      ".useless-thing .ut-epi-n{max-width:23em}</style>" +
      "<div class='ut'><div class='ut-epi'></div>" +
      "<button class='ut-btn' type='button'>换一块</button>" +
      "<p class='ut-mono ut-epi-n'>你可以关掉。它会等你下次打开。</p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var e=R.querySelector('.ut-epi'),b=R.querySelector('.ut-btn');" +
      "var S=['这里躺着一个人，他一生中大部分时间在为别人的事焦虑。'," +
      "'这里躺着一个人，他一直打算从下周开始。'," +
      "'这里躺着一个人，他把想说的话留到了最后，然后没说。'," +
      "'这里躺着一个人，他的收藏夹里还有 1274 条待看。'," +
      "'这里躺着一个人，他很忙，忙的事没有一件记得住。'," +
      "'这里躺着一个人，他睡得很晚，起得也不早。'];" +
      "function go(){e.textContent=S[(Math.random()*S.length)|0];}" +
      "go();b.addEventListener('click',go);})();</script>",
  },
  {
    // 94 你的退休生活预报
    title: "退休生活预报",
    html:
      BOX +
      "<style>.useless-thing .ut-ret{display:block;max-width:100%;height:auto}" +
      ".useless-thing .ut-ret-i{width:9rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit;text-align:center}" +
      ".useless-thing .ut-ret-n{max-width:24em;min-height:3em}</style>" +
      "<div class='ut'><canvas class='ut-ret' width='240' height='140'></canvas>" +
      "<input class='ut-ret-i' type='number' min='1900' max='2030' placeholder='出生年份' />" +
      "<p class='ut-mono ut-ret-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var c=R.querySelector('.ut-ret'),x=c.getContext('2d')," +
      "i=R.querySelector('.ut-ret-i'),n=R.querySelector('.ut-ret-n');" +
      // 一座房子，一扇亮着的窗。退休生活的全部图像就这么多
      "function frame(){x.clearRect(0,0,240,140);" +
      "x.strokeStyle='rgba(128,128,128,.5)';x.lineWidth=1;" +
      "x.strokeRect(70,60,100,66);x.beginPath();x.moveTo(60,60);x.lineTo(120,22);" +
      "x.lineTo(180,60);x.closePath();x.stroke();x.strokeRect(104,92,32,34);" +
      "var a=0.35+0.2*Math.sin(Date.now()/1600);" +
      "x.fillStyle='rgba(214,196,140,'+a.toFixed(2)+')';x.fillRect(82,72,16,14);" +
      "requestAnimationFrame(frame);}frame();" +
      "i.addEventListener('input',function(){var y=parseInt(i.value,10);" +
      "if(!(y>1900)){n.textContent='';return;}" +
      "var age=new Date().getFullYear()-y,left=Math.max(0,60-age);" +
      "n.textContent=left>0?('还剩 '+left+' 年要上班，合 '+(left*250)+" +
      "' 个工作日。你能坚持到那一天吗？'):('按 60 岁算你已经到了。房子在这儿，窗户亮着。');});" +
      "})();</script>",
  },
  {
    // 95 孤独光谱
    title: "孤独光谱",
    html:
      BOX +
      "<style>.useless-thing .ut-lone{position:relative;width:100%;max-width:24rem;" +
      "height:14px;border-radius:2px;" +
      "background:linear-gradient(90deg,#7f8e9a,#8b8b93,#9a8b8b,#a08183)}" +
      ".useless-thing .ut-lone-p{position:absolute;top:-6px;width:2px;height:26px;" +
      "background:var(--fg,#333);transition:left 1.4s cubic-bezier(.4,0,.2,1)}" +
      ".useless-thing .ut-lone-d{font-size:1.15rem;color:var(--fg,#333);min-height:1.8em}" +
      ".useless-thing .ut-lone-n{max-width:23em;min-height:2.4em}</style>" +
      "<div class='ut'><div class='ut-lone'><div class='ut-lone-p'></div></div>" +
      "<p class='ut-lone-d'></p>" +
      "<button class='ut-btn' type='button'>我不需要你告诉我</button>" +
      "<p class='ut-mono ut-lone-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-lone-p'),d=R.querySelector('.ut-lone-d')," +
      "b=R.querySelector('.ut-btn'),n=R.querySelector('.ut-lone-n');" +
      "var L=['轻微','中度','中度偏上','偏重','说不好'];" +
      "setTimeout(function(){var v=Math.random();" +
      "p.style.left=(v*100).toFixed(1)+'%';" +
      "d.textContent='今天的孤独程度：'+L[Math.min(L.length-1,(v*L.length)|0)];" +
      // 先诊断，再自己招了：指针是随机落的
      "n.textContent='指针是随机落的。这一页不认识你，也测不出任何东西。';},600);" +
      "b.addEventListener('click',function(){b.disabled=true;" +
      "n.textContent='对。你不需要。';});})();</script>",
  },
  {
    // 97 许愿池
    title: "许愿池",
    html:
      BOX +
      "<style>.useless-thing .ut-wish{position:relative;width:100%;max-width:20rem;" +
      "height:8rem;border-bottom:1px solid var(--border,rgba(128,128,128,.45));" +
      "overflow:hidden}" +
      ".useless-thing .ut-wish-c{position:absolute;width:8px;height:8px;" +
      "border-radius:50%;border:1px solid currentColor}" +
      ".useless-thing .ut-wish-t{font-size:1.1rem;color:var(--fg,#333);max-width:20em;" +
      "line-height:1.9;min-height:2em}" +
      ".useless-thing .ut-wish-n{max-width:23em}</style>" +
      "<div class='ut'><div class='ut-wish'></div>" +
      "<button class='ut-btn' type='button'>投一枚硬币</button>" +
      "<p class='ut-wish-t'></p><p class='ut-mono ut-wish-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var pool=R.querySelector('.ut-wish'),b=R.querySelector('.ut-btn')," +
      "t=R.querySelector('.ut-wish-t'),n=R.querySelector('.ut-wish-n'),k=0;" +
      "b.addEventListener('click',function(){k++;" +
      "var c=document.createElement('div');c.className='ut-wish-c';" +
      "var lx=10+Math.random()*80;c.style.left=lx+'%';c.style.top='-10px';" +
      "pool.appendChild(c);var t0=Date.now();" +
      "(function drop(){var p=(Date.now()-t0)/1100;if(p>=1){c.remove();return;}" +
      "c.style.top=(p*p*130).toFixed(0)+'px';c.style.opacity=(1-p*0.8).toFixed(2);" +
      "requestAnimationFrame(drop);})();" +
      // 投一百次也是这一句。它没有别的愿望可以给你
      "t.textContent='你希望改变，但你不愿意改变。';" +
      "n.textContent='投了 '+k+' 次。'+(k>=5?'愿望没有换过。':'');});})();</script>",
  },
  {
    // 99 匿名善意
    title: "匿名善意",
    html:
      BOX +
      "<style>.useless-thing .ut-kind-t{font-size:1.4rem;color:var(--fg,#333);" +
      "max-width:18em;line-height:2;transition:opacity .7s}" +
      ".useless-thing .ut-kind-t.out{opacity:0}" +
      ".useless-thing .ut-kind-i{width:19rem;padding:.5rem .7rem;font:inherit;" +
      "font-size:.875rem;border:1px solid var(--border,#ccc);border-radius:6px;" +
      "background:transparent;color:inherit}" +
      ".useless-thing .ut-kind-n{max-width:24em;min-height:2.4em}</style>" +
      "<div class='ut'><p class='ut-kind-t'></p>" +
      "<input class='ut-kind-i' type='text' placeholder='留一句没有人称的话，回车' />" +
      "<p class='ut-mono ut-kind-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var p=R.querySelector('.ut-kind-t'),i=R.querySelector('.ut-kind-i')," +
      "n=R.querySelector('.ut-kind-n');" +
      // 全是没有人称的句子：没说是谁，所以谁都可以拿走
      "var S=['有人记得你。','今天有人想起过你。','有人希望你今晚睡得好。'," +
      "'有人替你高兴过。','有人觉得你已经做得够多了。','有人在等你回来。'];" +
      "var k=0;function show(v){p.className='ut-kind-t out';" +
      "setTimeout(function(){p.textContent=v;p.className='ut-kind-t';},720);}" +
      "p.textContent=S[(Math.random()*S.length)|0];" +
      "setInterval(function(){show(S[(Math.random()*S.length)|0]);},6000);" +
      "i.addEventListener('keydown',function(e){" +
      "if(e.key!=='Enter'||!i.value.trim())return;S.push(i.value.trim());k++;" +
      "show(i.value.trim());i.value='';" +
      "n.textContent='加进这一轮了。关掉页面就没了——没有服务器，也没有审核。';});" +
      "})();</script>",
  },
  {
    // 100 但今天结束了
    title: "但今天结束了",
    html:
      BOX +
      "<style>.useless-thing .ut-end-t{font-size:1.5rem;color:var(--fg,#333);" +
      "max-width:18em;line-height:2}" +
      ".useless-thing .ut-end-c{font-variant-numeric:tabular-nums;font-size:1.1rem}" +
      ".useless-thing .ut-end-n{max-width:23em}</style>" +
      "<div class='ut'><p class='ut-end-t'></p><p class='ut-end-c'></p>" +
      "<p class='ut-mono ut-end-n'></p></div>" +
      "<script>(function(){var R=document.currentScript.parentNode;" +
      "var t=R.querySelector('.ut-end-t'),c=R.querySelector('.ut-end-c')," +
      "n=R.querySelector('.ut-end-n');" +
      "function p2(v){return v<10?'0'+v:''+v;}" +
      "setInterval(function(){var d=new Date();" +
      "var end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0,0);" +
      "var s=Math.floor((end-d)/1000);" +
      // 一天真的结束了才说那句话；在那之前只是在数
      "if(d.getHours()>=22){t.textContent='今天结束了。你做了些什么？不重要了。';" +
      "c.textContent=p2(Math.floor(s/3600))+':'+p2(Math.floor(s/60)%60)+':'+p2(s%60);" +
      "n.textContent='明天零点重置。它不会记得今天。';}" +
      "else{t.textContent='今天还没结束。';" +
      "c.textContent='还剩 '+p2(Math.floor(s/3600))+':'+p2(Math.floor(s/60)%60)+':'+p2(s%60);" +
      "n.textContent='晚上十点之后，这一页会换一句话。';}},500);})();</script>",
  },
];
