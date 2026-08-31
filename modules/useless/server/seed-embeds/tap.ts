/**
 * 一、要你动手的。
 *
 * 这一类的门槛：**上手就有反应，而且值得多待一会**。一句话的笑话（点五次它消失）
 * 不留——那种懂了就完了。留下的每一条要么是身体性的（按住、拽、甩），要么是
 * 跨访问累积的（照过的地方一天天揭出来）。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { FIT, MEM, play, stageBody, stageCss } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const TAP_EMBEDS: SeedEmbed[] = [
  {
    title: "一口气",
    html: play(
      ".useless-thing .ut-br-w{display:flex;align-items:center;justify-content:center;" +
        "width:100%;flex:1;min-height:14rem;touch-action:none;cursor:pointer}" +
        ".useless-thing .ut-br{width:9rem;height:9rem;transition:background 2.6s linear}",
      "<div class='ut'><div class='ut-br-w'><div class='ut-br'></div></div></div>",
      "var w=R.querySelector('.ut-br-w'),d=R.querySelector('.ut-br');" +
        "function hue(){return (Math.random()*360)|0;}" +
        "d.style.background='hsl('+hue()+',22%,46%)';" +
        "setInterval(function(){d.style.background='hsl('+hue()+',22%,46%)';},30000);" +
        // 松着不管它就自己四秒一吸。按住是你自己吸——憋过八秒就吸不动了，
        // 而且要用两倍的时间才呼得完
        "var mode='auto',lvl=0,last=Date.now(),held=0,slow=1,t0=Date.now();" +
        "function tick(){var now=Date.now(),dt=now-last;last=now;" +
        "if(mode==='auto'){var t=((now-t0)%10000)/10000;lvl=t<0.4?t/0.4:1-(t-0.4)/0.6;}" +
        "else if(mode==='in'){held+=dt;lvl=Math.min(1,lvl+dt/4000);}" +
        "else{lvl=Math.max(0,lvl-dt/(4000*slow));if(lvl<=0){mode='auto';t0=now;}}" +
        "d.style.transform='scale('+(0.72+0.28*lvl).toFixed(3)+')';" +
        "requestAnimationFrame(tick);}tick();" +
        "w.addEventListener('pointerdown',function(e){w.setPointerCapture(e.pointerId);" +
        "mode='in';held=0;});" +
        "function up(){if(mode!=='in')return;slow=held>8000?2:1;mode='out';}" +
        "w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "洞穴",
    html: play(
      stageCss("ut-dark", ";cursor:none"),
      stageBody("ut-dark"),
      MEM +
        FIT +
        // 底下藏着一整张，种子由日期定，所以今天这张一整天都是同一张。
        // 你的光只照得亮一小圈——但**照过的地方会永远留一点微光**，
        // 而且跨天记着。想看全，得一天一天把它揭出来
        "var n=new Date(),sd=(n.getFullYear()*372+n.getMonth()*31+n.getDate()+7)>>>0;" +
        "function rnd(){sd=(sd*1664525+1013904223)>>>0;return sd/4294967296;}" +
        "var S=[];for(var i=0;i<620;i++)S.push({x:rnd(),y:rnd()," +
        "r:0.4+rnd()*2.6,a:0.22+rnd()*0.78});" +
        "var MC=52,MR=32,MASK=new Uint8Array(MC*MR),raw=M.get('cave',''),dirty=false;" +
        "for(var j=0;j<MASK.length&&j<raw.length;j++)if(raw.charAt(j)==='1')MASK[j]=1;" +
        "setInterval(function(){if(!dirty)return;dirty=false;var s='';" +
        "for(var k=0;k<MASK.length;k++)s=s+(MASK[k]?'1':'0');M.set('cave',s);},2000);" +
        "var mx=-999,my=-999,Rr=0,idle=0,t=0;" +
        // 没人碰的时候光自己在飘，所以一进来就看得见有东西在那儿；
        // 你一动手它立刻交给你，手停久了它又自己走
        "function tick(){t++;idle++;" +
        "if(idle>150){var k=t*0.0016;" +
        "mx=W*(0.5+0.33*Math.sin(k)*Math.cos(k*0.41));" +
        "my=H*(0.5+0.31*Math.cos(k*0.77));reveal(mx,my);}" +
        "G.clearRect(0,0,W,H);" +
        "Rr=Math.min(W,H)*0.19;" +
        "for(var i=0;i<S.length;i++){var s=S[i],x=s.x*W,y=s.y*H;" +
        "var seen=MASK[((y/H*MR)|0)*MC+((x/W*MC)|0)]?0.17:0;" +
        "var d=Math.hypot(x-mx,y-my),near=d<Rr?(1-d/Rr):0;" +
        "var a=s.a*(seen+near*near*0.95);if(a<0.012)continue;" +
        "G.beginPath();G.arc(x,y,s.r*(1+near*0.9),0,7);" +
        "G.fillStyle='rgba(198,214,255,'+a.toFixed(3)+')';G.fill();}" +
        "if(mx>-500){var gr=G.createRadialGradient(mx,my,0,mx,my,Rr);" +
        "gr.addColorStop(0,'rgba(150,180,255,0.09)');" +
        "gr.addColorStop(1,'rgba(150,180,255,0)');" +
        "G.fillStyle=gr;G.fillRect(mx-Rr,my-Rr,Rr*2,Rr*2);}" +
        "requestAnimationFrame(tick);}tick();" +
        "function reveal(ax,ay){var cx=(ax/W*MC)|0,cy=(ay/H*MR)|0;" +
        "for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++){" +
        "if(dx*dx+dy*dy>5)continue;var x=cx+dx,y=cy+dy;" +
        "if(x<0||y<0||x>=MC||y>=MR)continue;" +
        "if(!MASK[y*MC+x]){MASK[y*MC+x]=1;dirty=true;}}}" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "mx=p[0];my=p[1];idle=0;reveal(mx,my);});",
    ),
  },
  {
    title: "最后一个键",
    html: play(
      ".useless-thing .ut-kb{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;" +
        "max-width:24rem;outline:none}" +
        ".useless-thing .ut-key{width:1.55rem;height:1.55rem;border:1px solid var(--border,#ccc);" +
        "transition:opacity .7s,background .15s}" +
        ".useless-thing .ut-key.on{background:currentColor;opacity:.45}" +
        ".useless-thing .ut-key.gone{opacity:0}" +
        ".useless-thing .ut-space{width:11rem}",
      "<div class='ut' tabindex='0'><div class='ut-kb'></div></div>",
      "var box=R.querySelector('.ut'),kb=R.querySelector('.ut-kb');box.focus();" +
        "var L='QWERTYUIOPASDFGHJKLZXCVBNM'.split(''),map={};" +
        "for(var i=0;i<L.length;i++){var e=document.createElement('div');e.className='ut-key';" +
        "kb.appendChild(e);map[L[i]]=e;}" +
        "var sp=document.createElement('div');sp.className='ut-key ut-space';kb.appendChild(sp);" +
        "box.addEventListener('pointerdown',function(){box.focus();});" +
        "box.addEventListener('keydown',function(e){var k=(e.key||'').toUpperCase();" +
        "if(k===' '){sp.classList.add('on');setTimeout(function(){sp.classList.remove('on');},180);return;}" +
        "var el=map[k];if(!el||el.classList.contains('gone'))return;" +
        "el.classList.add('on');setTimeout(function(){el.classList.add('gone');el.classList.remove('on');},220);});",
    ),
  },
  {
    title: "烟",
    html: play(
      stageCss("ut-blow", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-blow"),
      FIT +
        // 真解一遍不可压缩流：平流把颗粒和速度一起带走，压力投影把速度场压回
        // 无散度。烟会自己卷、自己撕、自己在涡边上拉出丝——这些都不是画出来的，
        // 是解出来的。用正弦流场假装的那种没有这个
        "var NX=160,NY=90,W2=NX+2,SZ=W2*(NY+2);" +
        "function A(){return new Float32Array(SZ);}" +
        "var u=A(),v=A(),u0=A(),v0=A(),pp=A(),dv=A();" +
        "var dr=A(),dg=A(),db=A(),er=A(),eg=A(),eb=A();" +
        // 边界：法向速度反号（贴着墙走），别的量原样抄过去
        "function bnd(b,x){var i,j;" +
        "for(i=1;i<=NX;i++){x[i]=b===2?-x[i+W2]:x[i+W2];" +
        "x[i+W2*(NY+1)]=b===2?-x[i+W2*NY]:x[i+W2*NY];}" +
        "for(j=1;j<=NY;j++){x[W2*j]=b===1?-x[1+W2*j]:x[1+W2*j];" +
        "x[NX+1+W2*j]=b===1?-x[NX+W2*j]:x[NX+W2*j];}}" +
        "function advect(b,d,d0,dt){var i,j,x,y,i0,i1,j0,j1,s0,s1,t0,t1,q,dt0=dt*NX;" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "x=i-dt0*u[q];y=j-dt0*v[q];" +
        "if(x<0.5)x=0.5;else if(x>NX+0.5)x=NX+0.5;i0=x|0;i1=i0+1;" +
        "if(y<0.5)y=0.5;else if(y>NY+0.5)y=NY+0.5;j0=y|0;j1=j0+1;" +
        "s1=x-i0;s0=1-s1;t1=y-j0;t0=1-t1;" +
        "d[q]=s0*(t0*d0[i0+W2*j0]+t1*d0[i0+W2*j1])+" +
        "s1*(t0*d0[i1+W2*j0]+t1*d0[i1+W2*j1]);}bnd(b,d);}" +
        // 投影：算散度、雅可比迭代解泊松、再把梯度减掉。没有这一步烟不会卷
        "function project(){var i,j,k,q;" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "dv[q]=-0.5*(u[q+1]-u[q-1]+v[q+W2]-v[q-W2])/NX;pp[q]=0;}" +
        "bnd(0,dv);bnd(0,pp);" +
        "for(k=0;k<12;k++){for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "pp[q]=(dv[q]+pp[q-1]+pp[q+1]+pp[q-W2]+pp[q+W2])*0.25;}bnd(0,pp);}" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "u[q]-=0.5*NX*(pp[q+1]-pp[q-1]);v[q]-=0.5*NX*(pp[q+W2]-pp[q-W2]);}" +
        "bnd(1,u);bnd(2,v);}" +
        "function step(dt){var t;" +
        "project();" +
        "t=u0;u0=u;u=t;t=v0;v0=v;v=t;" +
        "advect(1,u,u0,dt);advect(2,v,v0,dt);project();" +
        "t=er;er=dr;dr=t;t=eg;eg=dg;dg=t;t=eb;eb=db;db=t;" +
        "advect(0,dr,er,dt);advect(0,dg,eg,dt);advect(0,db,eb,dt);" +
        // 慢慢淡，不然攒久了整片糊死
        "for(var q=0;q<SZ;q++){dr[q]*=0.9955;dg[q]*=0.9955;db[q]*=0.9955;" +
        "u[q]*=0.999;v[q]*=0.999;}}" +
        "function hue2(h){h=((h%360)+360)%360;var c=1,x2=1-Math.abs((h/60)%2-1);" +
        "if(h<60)return[c,x2,0];if(h<120)return[x2,c,0];if(h<180)return[0,c,x2];" +
        "if(h<240)return[0,x2,c];if(h<300)return[x2,0,c];return[c,0,x2];}" +
        // fx/fy 的单位是**格/单位时间**，不是像素：平流里 x-=dt*NX*u，喂像素速度会
        // 每帧回溯几百格，全撞到边界钳死，墨一注就被抹平
        "function inject(px,py,fx,fy,h){" +
        "var i=Math.round(px/W*NX),j=Math.round(py/H*NY),c=hue2(h);" +
        "if(i<5)i=5;else if(i>NX-4)i=NX-4;if(j<5)j=5;else if(j>NY-4)j=NY-4;" +
        "for(var b=-4;b<=4;b++)for(var a=-4;a<=4;a++){" +
        "var w=1-Math.sqrt(a*a+b*b)/4.7;if(w<=0)continue;w=w*w;var q=i+a+W2*(j+b);" +
        "u[q]+=fx*w;v[q]+=fy*w;" +
        "dr[q]+=c[0]*w*3.2;dg[q]+=c[1]*w*3.2;db[q]+=c[2]*w*3.2;}}" +
        "var off=document.createElement('canvas');off.width=NX;off.height=NY;" +
        "var og=off.getContext('2d'),im=og.createImageData(NX,NY);" +
        "function draw(){var d=im.data,i,j,q,o,r,g2,b2,m,k2;" +
        "for(j=0;j<NY;j++)for(i=0;i<NX;i++){q=i+1+W2*(j+1);o=(i+j*NX)*4;" +
        "r=dr[q];g2=dg[q];b2=db[q];m=r>g2?(r>b2?r:b2):(g2>b2?g2:b2);" +
        "if(m<0.004){d[o+3]=0;continue;}" +
        // 颜色按最亮的通道归一化，饱和度保住；亮暗全交给 alpha。
        // 直接拿浓度当 RGB 的话，淡的地方是浑的，几种颜色叠起来一路混成褐色
        "k2=255/m;d[o]=r*k2;d[o+1]=g2*k2;d[o+2]=b2*k2;" +
        "d[o+3]=(1-Math.exp(-m*2.6))*255;}" +
        "og.putImageData(im,0,0);G.clearRect(0,0,W,H);" +
        "G.imageSmoothingEnabled=true;G.drawImage(off,0,0,W,H);}" +
        // 没人碰的时候有一股自己在游的细流，所以一进来就有东西在动
        "var mx=null,my=null,lx=0,ly=0,idle=0,t=0,hue=0,fed=0;" +
        // 墨水是有数的：自动注满 3400 次就不再给了。之后粘性和耗散接着做它们的事，
        // 卷须一层层摊开、变淡，最后稀到什么都看不见——不是混成一片灰，
        // 是散进整缸水里没有了。这缸水没有变脏，只是再也没有形状。
        // 原先这里是无限供墨，所以它永远漂亮下去——那是我在拦着它结束。
        // （你自己划还能加，但每划一笔也在花额度）
        "function tick(){t++;idle++;hue+=0.7;" +
        "if(idle>90&&fed<3400){fed++;var k=t*0.011;" +
        "var ax=W*(0.5+0.32*Math.sin(k*0.61)),ay=H*(0.5+0.3*Math.cos(k*0.43));" +
        "inject(ax,ay,Math.cos(k)*0.14,Math.sin(k*1.7)*0.14,hue);}" +
        // 全混匀了就换一缸新的。这个 1500 是量出来的，不是拍的：停供之后
        // 卷须约 1400 帧散尽，再往后画布上一个亮点都没有。原先写 3200，
        // 等于每两分钟给读者看二十五到四十秒的纯黑——落在那一段的人
        // 会以为这条东西坏了，缩略图也可能正好截在那儿。
        // **跑到尽头**和**跑完之后干晾着**是两回事，只有前一件是这条东西要说的
        "if(fed>=3400){fed++;if(fed>3400+1500){fed=0;" +
        "for(var z=0;z<SZ;z++){dr[z]=0;dg[z]=0;db[z]=0;u[z]=0;v[z]=0;}}}" +
        "step(0.14);draw();requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "if(mx!==null){var fx=(p[0]-lx)/W*4.5,fy=(p[1]-ly)/H*4.5;" +
        "var sp=Math.sqrt(fx*fx+fy*fy);if(sp>0.6){fx*=0.6/sp;fy*=0.6/sp;}" +
        "if(fed<3400){fed++;inject(p[0],p[1],fx,fy,hue);}}" +
        "mx=p[0];my=p[1];lx=p[0];ly=p[1];idle=0;});" +
        "CV.addEventListener('pointerleave',function(){mx=null;});",
    ),
  },
  {
    title: "双摆",
    html: play(
      stageCss("ut-teth", ";touch-action:none;cursor:grab"),
      stageBody("ut-teth"),
      FIT +
        // 双摆。它对初值极敏感，所以你每甩一次拖出来的曲线都不重样，
        // 但它也有摩擦：不去动它，它会慢慢停下来，垂在那儿。
        // 停住之后"对初值极敏感"这句话就失效了——所有起手最后都落在同一处。
        // 混沌是能量的一种花法，能量花完就没有了。
        // 也没有哪一次能被复现——抓住末端甩出去，剩下的它自己走，不会停
        "var a1=2.4,a2=1.1,v1=0,v2=0,L1=1,L2=1,cx=0,cy=0,grab=false,T=[];" +
        "function geo(){var k=Math.min(W,H);L1=k*0.21;L2=k*0.19;cx=W/2;cy=H*0.40;}" +
        "onfit=function(){geo();T.length=0;};geo();" +
        "function tip(){var x1=cx+Math.sin(a1)*L1,y1=cy+Math.cos(a1)*L1;" +
        "return[x1,y1,x1+Math.sin(a2)*L2,y1+Math.cos(a2)*L2];}" +
        // 方程用无量纲的杆长算，画的时候才换成像素。直接拿像素长度（一百多）
        // 配 g=1，角加速度只有千分之几——那样它看上去就是不动的
        "var l1=1,l2=0.9,m1=1.2,m2=1,gg=9.8;" +
        "function phys(dt){" +
        "var s=Math.sin(a1-a2),c=Math.cos(a1-a2),c2=Math.cos(2*(a1-a2));" +
        "var den=2*m1+m2-m2*c2;if(Math.abs(den)<1e-6)return;" +
        "var ac1=(-gg*(2*m1+m2)*Math.sin(a1)-m2*gg*Math.sin(a1-2*a2)-" +
        "2*s*m2*(v2*v2*l2+v1*v1*l1*c))/(l1*den);" +
        "var ac2=(2*s*(v1*v1*l1*(m1+m2)+gg*(m1+m2)*Math.cos(a1)+" +
        "v2*v2*l2*m2*c))/(l2*den);" +
        // 有摩擦。真实的双摆会停，停下来之后它对初值就一点都不敏感了：
        // 所有轨迹都收到同一个位置。原先这里没有阻尼，所以它永远混沌下去
        "v1*=0.99988;v2*=0.99988;" +
        "v1+=ac1*dt;v2+=ac2*dt;a1+=v1*dt;a2+=v2*dt;}" +
        "function tick(){if(!grab){for(var k2=0;k2<6;k2++)phys(0.006);}" +
        "var P=tip();T.push({x:P[2],y:P[3],v:Math.min(1,Math.abs(v2)*0.075)});" +
        "if(T.length>820)T.shift();" +
        "G.clearRect(0,0,W,H);G.lineCap='round';G.lineJoin='round';" +
        // 轨迹按当时的角速度上色：甩得狠的那几段是暖的，荡下来就凉回去
        "for(var i=1;i<T.length;i++){var p0=T[i-1],p1=T[i],k=i/T.length;" +
        "G.strokeStyle='hsla('+(205-p1.v*175).toFixed(0)+',74%,62%,'+" +
        "(0.05+k*k*0.62).toFixed(3)+')';G.lineWidth=0.8+k*2.4;" +
        "G.beginPath();G.moveTo(p0.x,p0.y);G.lineTo(p1.x,p1.y);G.stroke();}" +
        "G.strokeStyle=INK(0.5);G.lineWidth=2;" +
        "G.beginPath();G.moveTo(cx,cy);G.lineTo(P[0],P[1]);G.lineTo(P[2],P[3]);G.stroke();" +
        "G.fillStyle=INK(0.72);" +
        "G.beginPath();G.arc(cx,cy,3.5,0,7);G.fill();" +
        "G.beginPath();G.arc(P[0],P[1],5,0,7);G.fill();" +
        "G.beginPath();G.arc(P[2],P[3],7.5,0,7);G.fill();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){var p=at(e),P=tip();" +
        "if(Math.hypot(p[0]-P[2],p[1]-P[3])>Math.max(64,L2*0.55))return;" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}grab=true;v1=0;v2=0;T.length=0;});" +
        "CV.addEventListener('pointermove',function(e){if(!grab)return;var p=at(e);" +
        "var want=Math.atan2(p[0]-cx,p[1]-cy),prev=a1;" +
        // 松手那一下把你甩的角速度带进去，但别带成飞出去
        "a1=want;a2=want;v1=Math.max(-16,Math.min(16,(a1-prev)*26));v2=v1;});" +
        "function up(){grab=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "热",
    html: play(
      stageCss("ut-heat", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-heat"),
      FIT +
        // 热会往四周散，也一直在凉。走过的只留一道暗红，停久了才烧到白。
        // 于是画面上留下的不是你去过哪儿，是你在哪儿待住了
        "var CELL=7,GW=1,GH=1,F,T2,SCAR,off,og,im;" +
        "function alloc(){GW=Math.max(16,Math.ceil(W/CELL));" +
        "GH=Math.max(16,Math.ceil(H/CELL));" +
        "F=new Float32Array(GW*GH);T2=new Float32Array(GW*GH);" +
        "SCAR=new Float32Array(GW*GH);" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);}" +
        "onfit=alloc;alloc();" +
        // 黑 → 深紫 → 红 → 橙 → 白。热成像的那条阶梯，冷端压得很低才显得深
        "function ramp(v,d,o){var r,g2,b,k;" +
        "if(v<0.25){k=v/0.25;r=k*72;g2=k*6;b=16+k*106;}" +
        "else if(v<0.5){k=(v-0.25)/0.25;r=66+k*152;g2=k*24;b=104-k*46;}" +
        "else if(v<0.75){k=(v-0.5)/0.25;r=218+k*37;g2=24+k*132;b=58-k*44;}" +
        "else{k=(v-0.75)/0.25;r=255;g2=156+k*99;b=14+k*230;}" +
        "d[o]=r|0;d[o+1]=g2|0;d[o+2]=b|0;d[o+3]=255;}" +
        "var mx=-1,my=-1;" +
        "function tick(){var i,x,y;" +
        "if(mx>=0){var cx=(mx/CELL)|0,cy=(my/CELL)|0;" +
        "for(y=-3;y<=3;y++)for(x=-3;x<=3;x++){" +
        "var gx=cx+x,gy=cy+y;if(gx<0||gy<0||gx>=GW||gy>=GH)continue;" +
        "var w=1-Math.hypot(x,y)/4.2;if(w<=0)continue;" +
        "i=gy*GW+gx;F[i]=Math.min(1,F[i]+w*0.11*(1-SCAR[i]));}}" +
        // 扩散要弱、冷却要慢，热才攒得住。整条 5 点拉普拉斯每帧全权重下去，
        // 等于每帧都把画面抹平一次，停多久都烧不起来。
        //
        // 烧过头的地方会留疤：既不导热，**也再吃不进热**。
        // 你在同一处反复烤，那块就越来越烧不起来——手上的动作一模一样，
        // 板子不给你了。疤不会好，换个地方也只是换个地方烧坏。
        // 一开始"想让哪儿亮就让哪儿亮"，用久了这块板上没剩几处还听你的
        "for(y=1;y<GH-1;y++)for(x=1;x<GW-1;x++){i=y*GW+x;" +
        "if(F[i]>0.62)SCAR[i]=Math.min(0.97,SCAR[i]+(F[i]-0.62)*0.0075);" +
        "T2[i]=(F[i]+0.10*(1-SCAR[i])*((F[i-1]+F[i+1]+F[i-GW]+F[i+GW])*0.25-F[i]))*0.9955;}" +
        "var sw=F;F=T2;T2=sw;" +
        "for(x=0;x<GW;x++){F[x]=0;F[(GH-1)*GW+x]=0;}" +
        "for(y=0;y<GH;y++){F[y*GW]=0;F[y*GW+GW-1]=0;}" +
        "var d=im.data;for(i=0;i<F.length;i++)ramp(F[i],d,i*4);" +
        "og.putImageData(im,0,0);" +
        "G.imageSmoothingEnabled=true;G.drawImage(off,0,0,W,H);" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);mx=p[0];my=p[1];});" +
        "CV.addEventListener('pointerleave',function(){mx=-1;my=-1;});",
    ),
  },
  {
    title: "沙",
    html: play(
      stageCss("ut-sand", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-sand"),
      FIT +
        // 每一粒只认一条规矩：脚下空就掉，脚下满就往斜下方挤。
        // 堆角、塌方、从墙沿淌下去的那一股，都没人写过——是挤出来的
        "var CS=4,GW=1,GH=1,C,SH,off,og,im;" +
        "function alloc(){GW=Math.ceil(W/CS);GH=Math.ceil(H/CS);" +
        "C=new Uint8Array(GW*GH);SH=new Uint8Array(GW*GH);" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var i=0;i<GW*GH;i++)d[i*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var flip=0;" +
        "function fall(){var x,y,q,b,dir;flip^=1;" +
        // 自下而上扫，不然一粒会在同一帧里连掉好几格。左右交替扫，
        // 不交替的话沙堆会整体往一边偏
        "for(y=GH-2;y>=0;y--){for(var k=0;k<GW;k++){" +
        "x=flip?k:GW-1-k;q=y*GW+x;if(C[q]!==1)continue;" +
        "b=q+GW;if(C[b]===0){C[b]=1;SH[b]=SH[q];C[q]=0;continue;}" +
        "dir=Math.random()<0.5?-1:1;" +
        "if(x+dir>=0&&x+dir<GW&&C[b+dir]===0){C[b+dir]=1;SH[b+dir]=SH[q];C[q]=0;continue;}" +
        "if(x-dir>=0&&x-dir<GW&&C[b-dir]===0){C[b-dir]=1;SH[b-dir]=SH[q];C[q]=0;}}}}" +
        "function pour(){var cx=(GW*0.5)|0;" +
        "for(var i=0;i<7;i++){var x=cx+((Math.random()*22)|0)-11;" +
        "if(x<1||x>=GW-1)continue;var q=1*GW+x;" +
        "if(C[q]===0){C[q]=1;SH[q]=(Math.random()*255)|0;}}}" +
        "function draw(){var d=im.data,i,t,o;" +
        "for(i=0;i<C.length;i++){o=i*4;t=C[i];" +
        "if(t===0){d[o]=10;d[o+1]=10;d[o+2]=13;}" +
        "else if(t===2){d[o]=96;d[o+1]=100;d[o+2]=112;}" +
        // 每粒自带一点色差，堆起来才有沙的颗粒感，不然是一块橙色的板
        "else{var v=SH[i]/255;d[o]=196+v*52;d[o+1]=150+v*62;d[o+2]=96+v*54;}}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var grains=0,rest2=0;" +
        // 沙有数。倒完 5200 粒就没有了，剩下的自己塌到休止角，然后一动不动——
        // 沙堆的结局本来就是"再也塌不动"。原先这里是无限倒沙，
        // 所以它永远在流；那不是沙，那是水龙头
        "function tick(){if(grains<5200){grains++;pour();}" +
        "else{rest2++;if(rest2>2600){grains=0;rest2=0;" +
        "for(var z=0;z<C.length;z++)if(C[z]===1)C[z]=0;}}" +
        "fall();fall();draw();requestAnimationFrame(tick);}tick();" +
        // 你画的是墙。沙会在墙上堆起来、堆到临界角就从两边淌下去
        "var down=false;" +
        "function wall(e){var p=at(e),cx=(p[0]/CS)|0,cy=(p[1]/CS)|0;" +
        "for(var b=-2;b<=2;b++)for(var a=-2;a<=2;a++){" +
        "if(a*a+b*b>6)continue;var x=cx+a,y=cy+b;" +
        "if(x<0||y<0||x>=GW||y>=GH)continue;C[y*GW+x]=2;}}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}down=true;wall(e);});" +
        "CV.addEventListener('pointermove',function(e){if(down)wall(e);});" +
        "CV.addEventListener('pointerup',function(){down=false;});" +
        "CV.addEventListener('pointercancel',function(){down=false;});",
    ),
  },
  {
    title: "群",
    html: play(
      stageCss("ut-boid", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-boid"),
      FIT +
        // 每只鸟只看身边那几只，做三件事：别撞上、跟上大家的朝向、往中间靠。
        // 没有领队，没有队形表——那团忽聚忽散的东西是这三条自己算出来的
        "var N=1400,P=new Float32Array(N*4),R2=34,gw=1,gh=1,head,nxt,pol=0,done2=0,conf=0.05,era2=0;" +
        "function alloc(){for(var i=0;i<N;i++){P[i*4]=Math.random()*W;" +
        "P[i*4+1]=Math.random()*H;var a=Math.random()*6.2832;" +
        "P[i*4+2]=Math.cos(a)*2;P[i*4+3]=Math.sin(a)*2;}" +
        "gw=Math.max(1,Math.ceil(W/R2));gh=Math.max(1,Math.ceil(H/R2));" +
        "head=new Int32Array(gw*gh);nxt=new Int32Array(N);}" +
        "onfit=alloc;alloc();" +
        "var px=-999,py=-999;" +
        "function tick(){var i,j,c,cx,cy,gx,gy,ox,oy;" +
        // 每帧重建一次网格索引：不分格的话 1400 只两两比较是两百万次，跑不动
        "head.fill(-1);" +
        "for(i=0;i<N;i++){gx=(P[i*4]/R2)|0;gy=(P[i*4+1]/R2)|0;" +
        "if(gx<0)gx=0;else if(gx>=gw)gx=gw-1;" +
        "if(gy<0)gy=0;else if(gy>=gh)gy=gh-1;" +
        "c=gy*gw+gx;nxt[i]=head[c];head[c]=i;}" +
        "for(i=0;i<N;i++){var x=P[i*4],y=P[i*4+1],vx=P[i*4+2],vy=P[i*4+3];" +
        "var sx=0,sy=0,ax=0,ay=0,mx2=0,my2=0,n=0;" +
        "gx=(x/R2)|0;gy=(y/R2)|0;" +
        "for(oy=-1;oy<=1;oy++)for(ox=-1;ox<=1;ox++){" +
        "cx=gx+ox;cy=gy+oy;if(cx<0||cy<0||cx>=gw||cy>=gh)continue;" +
        "for(j=head[cy*gw+cx];j>=0;j=nxt[j]){if(j===i)continue;" +
        "var dx=P[j*4]-x,dy=P[j*4+1]-y,d2=dx*dx+dy*dy;" +
        "if(d2>R2*R2||d2<0.01)continue;n++;" +
        "ax+=P[j*4+2];ay+=P[j*4+3];mx2+=P[j*4];my2+=P[j*4+1];" +
        "if(d2<170){sx-=dx/d2*9;sy-=dy/d2*9;}}}" +
        "if(n>0){vx+=(ax/n-vx)*conf;vy+=(ay/n-vy)*conf;" +
        "vx+=(mx2/n-x)*0.0016;vy+=(my2/n-y)*0.0016;}" +
        "vx+=sx*0.06;vy+=sy*0.06;" +
        // 指针是鹰：靠近就炸开，散开之后又慢慢聚回去
        "var hx=x-px,hy=y-py,hd=hx*hx+hy*hy;" +
        "if(hd<19000&&hd>1){var f=42/Math.sqrt(hd);vx+=hx*f*0.05;vy+=hy*f*0.05;}" +
        "var sp=Math.sqrt(vx*vx+vy*vy);if(sp>0.01){var t=2.4/sp;" +
        "if(sp>3.4){vx*=3.4/sp;vy*=3.4/sp;}else if(sp<1.4){vx*=t*0.6;vy*=t*0.6;}}" +
        "x+=vx;y+=vy;" +
        "if(x<0)x+=W;else if(x>=W)x-=W;if(y<0)y+=H;else if(y>=H)y-=H;" +
        "P[i*4]=x;P[i*4+1]=y;P[i*4+2]=vx;P[i*4+3]=vy;}" +
        // 全体朝向的合矢量长度。跟着邻居走的那一项（conf）在一路调大：
        // 从"看一眼身边"调到"必须跟上"。这个数就一路逼近 1，
        // 群还在飞，形状却越来越像一块板——彼此不再需要调整，也就不再有花样。
        //
        // 原来这一项是常数 0.05，所以它永远在谈、永远好看。实测过：
        // 那套参数下群占的格子在 250 上下浮动，一万四千帧都没收敛过。
        // 涌现不是自己会停的，是**从众的力度**决定它停不停
        "var sx=0,sy=0;" +
        "for(i=0;i<N;i++){var m2=Math.sqrt(P[i*4+2]*P[i*4+2]+P[i*4+3]*P[i*4+3])||1;" +
        "sx+=P[i*4+2]/m2;sy+=P[i*4+3]/m2;}" +
        "pol=Math.sqrt(sx*sx+sy*sy)/N;" +
        "era2++;" +
        "conf=era2<1800?0.05:(era2<7200?0.05+(era2-1800)*0.00011:0.65);" +
        "if(pol>0.985||era2>9800){done2++;" +
        "if(done2>760){done2=0;era2=0;conf=0.05;alloc();}}else done2=0;" +
        "G.save();G.globalCompositeOperation='destination-out';G.fillStyle='rgba(0,0,0,0.32)';G.fillRect(0,0,W,H);G.restore();" +
        "G.fillStyle='rgba(214,226,246,0.72)';" +
        "for(i=0;i<N;i++){var bx=P[i*4],by=P[i*4+1];" +
        "var bvx=P[i*4+2],bvy=P[i*4+3];" +
        "G.fillRect(bx,by,1.6,1.6);G.fillRect(bx-bvx*0.9,by-bvy*0.9,1.1,1.1);}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);px=p[0];py=p[1];});" +
        "CV.addEventListener('pointerleave',function(){px=-999;py=-999;});",
    ),
  },
  {
    title: "涟漪槽",
    html: play(
      stageCss("ut-tank", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-tank"),
      FIT +
        // 真的解波动方程：u'' = c²∇²u。两个固定波源各按各的周期打，
        // 交叠处的明暗条纹是干涉，不是画的花纹——你敲一下也进同一套方程
        "var CS=3,GW=1,GH=1,A,B2,off,og,im;" +
        "function alloc(){GW=Math.ceil(W/CS);GH=Math.ceil(H/CS);" +
        "A=new Float32Array(GW*GH);B2=new Float32Array(GW*GH);" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var i=0;i<GW*GH;i++)d[i*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var t=0;" +
        "function step(){var x,y,q,lap;" +
        "for(y=1;y<GH-1;y++)for(x=1;x<GW-1;x++){q=y*GW+x;" +
        "lap=A[q-1]+A[q+1]+A[q-GW]+A[q+GW]-4*A[q];" +
        "B2[q]=(2*A[q]-B2[q]+lap*0.32)*0.9985;}" +
        "var s=A;A=B2;B2=s;}" +
        "function draw(){var d=im.data,i,v,g2,r2,gg,bb;" +
        "for(i=0;i<A.length;i++){v=A[i];" +
        // 用横向斜率上色，不是用高度：那是水面反光的样子，看得出波在走
        "g2=(i%GW>0?A[i]-A[i-1]:0)*90;" +
        "r2=18+v*70+g2*40;gg=44+v*96+g2*54;bb=78+v*120+g2*46;" +
        "var o=i*4;" +
        "d[o]=r2<0?0:(r2>255?255:r2);" +
        "d[o+1]=gg<0?0:(gg>255?255:gg);" +
        "d[o+2]=bb<0?0:(bb>255?255:bb);}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var fuel=0;" +
        // 波源不是永动机。打满 5200 拍就没劲了，之后阻尼把整槽水抹平，
        // 干涉条纹一层层散掉——那张网全靠有人一直在打
        "function tick(){t++;fuel++;" +
        "var y0=(GH*0.5)|0,x1=(GW*0.33)|0,x2=(GW*0.67)|0;" +
        "var amp2=fuel<5200?0.42:(fuel<5600?0.42*(1-(fuel-5200)/400):0);" +
        "if(fuel>9200){fuel=0;for(var z=0;z<A.length;z++){A[z]=0;B2[z]=0;}}" +
        "A[y0*GW+x1]+=Math.sin(t*0.29)*amp2;" +
        "A[y0*GW+x2]+=Math.sin(t*0.29)*amp2;" +
        "step();step();draw();requestAnimationFrame(tick);}tick();" +
        "function drop(e){var p=at(e),cx=(p[0]/CS)|0,cy=(p[1]/CS)|0;" +
        "for(var b=-3;b<=3;b++)for(var a=-3;a<=3;a++){" +
        "var dd=a*a+b*b;if(dd>9)continue;var x=cx+a,y=cy+b;" +
        "if(x<1||y<1||x>=GW-1||y>=GH-1)continue;" +
        "A[y*GW+x]+=2.6*(1-Math.sqrt(dd)/3.4);}}" +
        "CV.addEventListener('pointerdown',drop);" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)drop(e);});",
    ),
  },
  {
    title: "影",
    html: play(
      stageCss("ut-shadow", ";touch-action:none;cursor:none"),
      stageBody("ut-shadow"),
      FIT +
        // 光是一条条射线真投出去的：往每个墙角打两条擦边的，按角度排好连成
        // 一圈可见多边形。所以影子的边是准的，墙一挪影子立刻跟着改。
        //
        // 灯是有油的。油少了照得就近，远处的墙一堵堵从画面里退出去，
        // 这间屋子看着越来越小——**可什么都没动过**，退掉的墙一直在原地。
        // 烧到灭，黑一会儿，换个地方点一盏新的。看不见不等于不在
        "var SEG=[],LX=0,LY=0,auto=0,oil=0,reach=1;" +
        "function build(){SEG=[];var i,k;" +
        "function box(x,y,w2,h2,rot){var c=Math.cos(rot),s=Math.sin(rot);" +
        "var pt=[[-w2,-h2],[w2,-h2],[w2,h2],[-w2,h2]].map(function(p){" +
        "return[x+p[0]*c-p[1]*s,y+p[0]*s+p[1]*c];});" +
        "for(k=0;k<4;k++)SEG.push([pt[k][0],pt[k][1],pt[(k+1)%4][0],pt[(k+1)%4][1]]);}" +
        "for(i=0;i<7;i++)box(W*(0.14+Math.random()*0.72),H*(0.14+Math.random()*0.72)," +
        "W*(0.02+Math.random()*0.05),H*(0.03+Math.random()*0.10),Math.random()*3.14);" +
        "SEG.push([0,0,W,0],[W,0,W,H],[W,H,0,H],[0,H,0,0]);" +
        "LX=W/2;LY=H/2;oil=0;reach=1;}" +
        "onfit=build;build();" +
        "function cast(ang){var dx=Math.cos(ang),dy=Math.sin(ang),best=1e9,i,s;" +
        "for(i=0;i<SEG.length;i++){s=SEG[i];" +
        "var sx=s[2]-s[0],sy=s[3]-s[1];var den=sx*dy-sy*dx;" +
        "if(Math.abs(den)<1e-9)continue;" +
        "var tt=((LX-s[0])*dy-(LY-s[1])*dx)/den;" +
        "if(tt<0||tt>1)continue;" +
        "var u=Math.abs(dx)>Math.abs(dy)?(s[0]+sx*tt-LX)/dx:(s[1]+sy*tt-LY)/dy;" +
        "if(u>0.01&&u<best)best=u;}" +
        "return best;}" +
        "function tick(){auto++;oil++;" +
        // 一轮四分多钟：亮着、慢慢暗、灭掉、再点一盏
        "reach=oil<4200?1:(oil<9600?1-(oil-4200)/5400:0);" +
        "if(oil>11400)build();" +
        // 没人碰的时候光自己在走，所以一进来影子就在动
        "if(auto>110){var k2=auto*0.006;" +
        "LX=W*(0.5+0.30*Math.sin(k2));LY=H*(0.5+0.28*Math.cos(k2*0.73));}" +
        "var A2=[],i,s;" +
        "for(i=0;i<SEG.length;i++){s=SEG[i];" +
        "A2.push(Math.atan2(s[1]-LY,s[0]-LX),Math.atan2(s[3]-LY,s[2]-LX));}" +
        "var pts=[];" +
        "for(i=0;i<A2.length;i++){var a=A2[i];" +
        "pts.push([a-0.0002,cast(a-0.0002)],[a+0.0002,cast(a+0.0002)]);}" +
        "pts.sort(function(p,q){return p[0]-q[0];});" +
        "G.clearRect(0,0,W,H);" +
        "var gr=G.createRadialGradient(LX,LY,0,LX,LY," +
        "Math.max(2,Math.max(W,H)*0.62*reach));" +
        "gr.addColorStop(0,'rgba(255,238,196,0.92)');" +
        "gr.addColorStop(0.35,'rgba(226,180,110,0.34)');" +
        "gr.addColorStop(1,'rgba(180,130,80,0)');" +
        "G.save();G.beginPath();" +
        "for(i=0;i<pts.length;i++){var r=pts[i][1];if(r>1e8)r=Math.max(W,H)*2;" +
        "var x=LX+Math.cos(pts[i][0])*r,y=LY+Math.sin(pts[i][0])*r;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}" +
        "G.closePath();G.clip();G.fillStyle=gr;G.fillRect(0,0,W,H);G.restore();" +
        "G.strokeStyle='rgba(150,160,185,0.5)';G.lineWidth=1.5;G.beginPath();" +
        "for(i=0;i<SEG.length-4;i++){s=SEG[i];G.moveTo(s[0],s[1]);G.lineTo(s[2],s[3]);}" +
        "G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "LX=p[0];LY=p[1];auto=0;});",
    ),
  },
  {
    title: "涡街",
    html: play(
      stageCss("ut-kar", ";touch-action:none;cursor:grab"),
      stageBody("ut-kar"),
      FIT +
        // 稳定的水流撞上一个圆柱，后面不会安分地合拢，而是左一个右一个地甩涡
        // ——卡门涡街。这不是编的动画，是同一套不可压缩流解出来的；
        // 把柱子拖到别处，尾迹立刻跟着重排。
        //
        // 但水是会磨的：柱子一直在被它自己造出来的这道流冲小。
        // 越小甩得越细，细到某个尺寸涡街就散了，再小就只剩一片平顺的水——
        // 整幅画面全靠那颗障碍物，而它正在被画面本身磨掉
        "var NX=200,NY=112,W2=NX+2,SZ=W2*(NY+2),U0=0.088;" +
        "function A(){return new Float32Array(SZ);}" +
        "var u=A(),v=A(),u0=A(),v0=A(),pp=A(),dvg=A(),dn=A(),dn0=A();" +
        "var SOL=new Uint8Array(SZ),ox=0.26,oy=0.47,rad=NY*0.085;" +
        "function solids(){SOL.fill(0);var cx=ox*NX,cy=oy*NY,r=rad;" +
        "for(var j=1;j<=NY;j++)for(var i=1;i<=NX;i++){" +
        "var dx=i-cx,dy=j-cy;if(dx*dx+dy*dy<r*r)SOL[i+W2*j]=1;}}" +
        "solids();" +
        "function bnd(b,x){var i,j;" +
        "for(i=1;i<=NX;i++){x[i]=b===2?-x[i+W2]:x[i+W2];" +
        "x[i+W2*(NY+1)]=b===2?-x[i+W2*NY]:x[i+W2*NY];}" +
        "for(j=1;j<=NY;j++){x[W2*j]=b===1?x[1+W2*j]:x[1+W2*j];" +
        "x[NX+1+W2*j]=x[NX+W2*j];}}" +
        "function advect(b,d,d0,dt){var i,j,x,y,i0,i1,j0,j1,s0,s1,t0,t1,q,dt0=dt*NX;" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "x=i-dt0*u[q];y=j-dt0*v[q];" +
        "if(x<0.5)x=0.5;else if(x>NX+0.5)x=NX+0.5;i0=x|0;i1=i0+1;" +
        "if(y<0.5)y=0.5;else if(y>NY+0.5)y=NY+0.5;j0=y|0;j1=j0+1;" +
        "s1=x-i0;s0=1-s1;t1=y-j0;t0=1-t1;" +
        "d[q]=s0*(t0*d0[i0+W2*j0]+t1*d0[i0+W2*j1])+" +
        "s1*(t0*d0[i1+W2*j0]+t1*d0[i1+W2*j1]);}bnd(b,d);}" +
        "function project(){var i,j,k,q;" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "dvg[q]=-0.5*(u[q+1]-u[q-1]+v[q+W2]-v[q-W2])/NX;pp[q]=0;}" +
        "bnd(0,dvg);bnd(0,pp);" +
        "for(k=0;k<14;k++){for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "pp[q]=(dvg[q]+pp[q-1]+pp[q+1]+pp[q-W2]+pp[q+W2])*0.25;}bnd(0,pp);}" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "u[q]-=0.5*NX*(pp[q+1]-pp[q-1]);v[q]-=0.5*NX*(pp[q+W2]-pp[q-W2]);}" +
        "bnd(1,u);bnd(2,v);}" +
        // 柱子里的速度每步都按回零：投影会把它推开一点，不按住就漏
        "function hold(){var q;for(q=0;q<SZ;q++)if(SOL[q]){u[q]=0;v[q]=0;dn[q]=0;}" +
        "for(var j=1;j<=NY;j++){var p=1+W2*j;u[p]=U0;v[p]=0;u[p+1]=U0;" +
        "dn[p]=(((j/7)|0)%2)?0.95:0.06;}}" +
        "function kick(){var cx=ox*NX,cy=oy*NY,r=NY*0.085;" +
        "for(var j=1;j<=NY;j++)for(var i=Math.max(1,(cx+r)|0);i<Math.min(NX,(cx+r*2.4)|0);i++){" +
        "var q=i+W2*j;if(SOL[q])continue;v[q]+=(Math.random()-0.5)*0.0032;}}" +
        // 一阶半拉格朗日平流的数值黏性极大，涡旋刚生出来就被抹平，尾迹只会是稳的。
        // 涡量约束：算出每处的涡量、朝"涡量更强的方向"施一个力，把被抹掉的那部分
        // 补回去。这是让这台解算器真的甩得起涡的关键一步
        "var crl=A();" +
        "function confine(eps){var i,j,q,gx,gy,len,c;" +
        "for(j=1;j<=NY;j++)for(i=1;i<=NX;i++){q=i+W2*j;" +
        "crl[q]=(v[q+1]-v[q-1]-u[q+W2]+u[q-W2])*0.5;}" +
        "for(j=2;j<NY;j++)for(i=2;i<NX;i++){q=i+W2*j;if(SOL[q])continue;" +
        "gx=Math.abs(crl[q+1])-Math.abs(crl[q-1]);" +
        "gy=Math.abs(crl[q+W2])-Math.abs(crl[q-W2]);" +
        "len=Math.sqrt(gx*gx+gy*gy);if(len<1e-9)continue;" +
        "c=crl[q];" +
        "u[q]+=eps*(gy/len)*c;v[q]-=eps*(gx/len)*c;}}" +
        "function step(dt){var t;hold();kick();confine(0.55);project();hold();" +
        "t=u0;u0=u;u=t;t=v0;v0=v;v=t;" +
        "advect(1,u,u0,dt);advect(2,v,v0,dt);hold();project();" +
        "t=dn0;dn0=dn;dn=t;advect(0,dn,dn0,dt);hold();}" +
        "var off=document.createElement('canvas');off.width=NX;off.height=NY;" +
        "var og=off.getContext('2d'),im=og.createImageData(NX,NY);" +
        "var dd=im.data;for(var z=0;z<NX*NY;z++)dd[z*4+3]=255;" +
        "function draw(){var d=im.data,i,j,q,o,c,t2;" +
        "for(j=0;j<NY;j++)for(i=0;i<NX;i++){q=i+1+W2*(j+1);o=(i+j*NX)*4;" +
        "if(SOL[q]){d[o]=150;d[o+1]=156;d[o+2]=170;continue;}" +
        "c=dn[q];t2=c>1?1:c;" +
        "d[o]=10+t2*44;d[o+1]=16+t2*168;d[o+2]=32+t2*212;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var wear=0;" +
        "function tick(){wear++;" +
        // 水一直在磨它。磨到不足一格就没有障碍物了，水面从此平顺
        "if(wear%14===0&&rad>0.4){rad-=0.008;solids();}" +
        "if(rad<=0.4){wear++;if(wear>3600){rad=NY*0.085;solids();wear=0;}}" +
        "step(0.14);draw();requestAnimationFrame(tick);}tick();" +
        "var grab=false;" +
        "function put(e){var p=at(e);" +
        "ox=Math.max(0.10,Math.min(0.62,p[0]/W));" +
        "oy=Math.max(0.16,Math.min(0.84,p[1]/H));solids();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}grab=true;put(e);});" +
        "CV.addEventListener('pointermove',function(e){if(grab)put(e);});" +
        "CV.addEventListener('pointerup',function(){grab=false;});" +
        "CV.addEventListener('pointercancel',function(){grab=false;});",
    ),
  },
  {
    title: "布",
    html: play(
      stageCss("ut-cloth", ";touch-action:none;cursor:grab"),
      stageBody("ut-cloth"),
      FIT +
        // Verlet：不存速度，只存"上一帧在哪"，位置差本身就是速度。约束反复拉几遍。
        //
        // 每一根线都有疲劳：被拉过头一次不会断，但会**永久**弱一点，
        // 而且不会自己长回来。你越是拽它玩，它越经不起下一次寻常的拉扯。
        // 拽够了它就一根根开线，最后是一堆互不相干的点。
        // 这块布不会坏在某一次用力上，它坏在你一直在用它
        // 就成了布。抓住一角甩，褶皱是自己出来的；拉过头线会断，断了不会长回来
        "var CW=38,CH=26,N=CW*CH,X,Y,PX,PY,PIN,ST,FAT,rest;" +
        "function alloc(){X=new Float32Array(N);Y=new Float32Array(N);" +
        "PX=new Float32Array(N);PY=new Float32Array(N);PIN=new Uint8Array(N);" +
        "var w=Math.min(W*0.72,H*1.25),gap=w/(CW-1);rest=gap;" +
        "var x0=(W-w)/2,y0=H*0.10;" +
        "for(var j=0;j<CH;j++)for(var i=0;i<CW;i++){var q=j*CW+i;" +
        "X[q]=PX[q]=x0+i*gap;Y[q]=PY[q]=y0+j*gap;}" +
        "for(var i2=0;i2<CW;i2+=6)PIN[i2]=1;PIN[CW-1]=1;" +
        "ST=[];" +
        "for(var j2=0;j2<CH;j2++)for(var i3=0;i3<CW;i3++){var q2=j2*CW+i3;" +
        "if(i3<CW-1)ST.push(q2,q2+1,1);" +
        "if(j2<CH-1)ST.push(q2,q2+CW,1);}" +
        "FAT=new Float32Array(ST.length/3);}" +
        "onfit=alloc;alloc();" +
        "var gx=-1,gy=-1,held=-1;" +
        "function tick(){var i,q,a,b,dx,dy,d,diff,k;" +
        "for(q=0;q<N;q++){if(PIN[q])continue;" +
        "var vx=(X[q]-PX[q])*0.992,vy=(Y[q]-PY[q])*0.992;" +
        "PX[q]=X[q];PY[q]=Y[q];X[q]+=vx;Y[q]+=vy+0.42;}" +
        "if(held>=0){X[held]=gx;Y[held]=gy;PX[held]=gx;PY[held]=gy;}" +
        // 约束多解几遍才挺括；解一遍的布是软面条
        "for(k=0;k<7;k++){for(i=0;i<ST.length;i+=3){if(!ST[i+2])continue;" +
        "a=ST[i];b=ST[i+1];dx=X[b]-X[a];dy=Y[b]-Y[a];" +
        "d=Math.sqrt(dx*dx+dy*dy);if(d<0.0001)continue;" +
        // 拉过头一次不会断，但会**永久**弱一点。弱到一定程度，
        // 下一次很平常的拉扯就够把它扯开了。疲劳不会自己好
        "if(k===6&&d>rest*1.4){FAT[i/3]+=(d/rest-1.4)*0.010;}" +
        "if(d>rest*(3.1-(FAT[i/3]<1?FAT[i/3]:1)*1.15)||FAT[i/3]>1.9){ST[i+2]=0;continue;}" +
        "diff=(d-rest)/d*0.5;" +
        "if(!PIN[a]){X[a]+=dx*diff;Y[a]+=dy*diff;}" +
        "if(!PIN[b]){X[b]-=dx*diff;Y[b]-=dy*diff;}}}" +
        "G.clearRect(0,0,W,H);G.lineWidth=1;" +
        "G.strokeStyle='rgba(176,196,228,0.5)';G.beginPath();" +
        "for(i=0;i<ST.length;i+=3){if(!ST[i+2])continue;" +
        "a=ST[i];b=ST[i+1];G.moveTo(X[a],Y[a]);G.lineTo(X[b],Y[b]);}" +
        "G.stroke();" +
        "G.fillStyle='rgba(210,226,248,0.8)';" +
        "for(q=0;q<CW;q++)if(PIN[q])G.fillRect(X[q]-2,Y[q]-2,4,4);" +
        "requestAnimationFrame(tick);}tick();" +
        "function near(px,py){var best=-1,bd=1e9;" +
        "for(var q=0;q<N;q++){var dx=X[q]-px,dy=Y[q]-py,d=dx*dx+dy*dy;" +
        "if(d<bd){bd=d;best=q;}}return bd<3600?best:-1;}" +
        "CV.addEventListener('pointerdown',function(e){var p=at(e);" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}gx=p[0];gy=p[1];held=near(gx,gy);});" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);gx=p[0];gy=p[1];});" +
        "function up(){held=-1;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "河",
    html: play(
      stageCss("ut-ero", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-ero"),
      FIT +
        // 水力侵蚀：一滴水顺着坡往下跑，跑得快就带走泥沙，慢下来就卸掉。
        // 几十万滴之后河网自己刻出来了，支流、峡谷、冲积扇都没人画过。
        //
        // 但别在半路上停。这个过程的终点是**准平原**——山被刻平，河没了落差，
        // 连河也没了，剩一张什么都没有的灰板。刻得最卖力的那把刀，
        // 削掉的是它自己赖以存在的地形。夷平之后重新抬升一块，再来一遍
        "var GW=1,GH=1,Hm,off,og,im;" +
        "function noise(x,y,sd){var v=0,a=1,f=1;" +
        "for(var o=0;o<6;o++){" +
        "v+=a*Math.sin(x*f*2.7+sd*1.7+o*2.1)*Math.cos(y*f*3.1-sd*1.1+o*1.3);" +
        "a*=0.5;f*=2.03;}return v;}" +
        "function alloc(){GW=Math.max(160,Math.min(340,Math.round(W/4.2)));" +
        "GH=Math.max(90,Math.round(GW*H/W));" +
        "Hm=new Float32Array(GW*GH);" +
        "var sd=Math.random()*100;" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++)" +
        "Hm[y*GW+x]=0.5+0.22*noise(x/GW,y/GH,sd);" +
        "rel0=relief();" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;}" +
        "var rel0=1;" +
        // 起伏度：抽样取极差。掉到当初的两成就是夷平了
        "function relief(){var mn=9,mx=-9;" +
        "for(var i=0;i<Hm.length;i+=11){var v=Hm[i];if(v<mn)mn=v;if(v>mx)mx=v;}" +
        "return mx-mn;}" +
        "onfit=alloc;alloc();" +
        "function hAt(x,y){var x0=x|0,y0=y|0;" +
        "if(x0<0||y0<0||x0>=GW-1||y0>=GH-1)return 1e9;" +
        "var fx=x-x0,fy=y-y0,i=y0*GW+x0;" +
        "return Hm[i]*(1-fx)*(1-fy)+Hm[i+1]*fx*(1-fy)+" +
        "Hm[i+GW]*(1-fx)*fy+Hm[i+GW+1]*fx*fy;}" +
        // 点侵蚀会戳出针状毛刺，得用一个小刷子把这一滴的作用摊到周围几格
        "function dep(x,y,amt){var x0=x|0,y0=y|0;" +
        "if(x0<1||y0<1||x0>=GW-2||y0>=GH-2)return;" +
        "var fx=x-x0,fy=y-y0,i=y0*GW+x0;" +
        "Hm[i]+=amt*(1-fx)*(1-fy);Hm[i+1]+=amt*fx*(1-fy);" +
        "Hm[i+GW]+=amt*(1-fx)*fy;Hm[i+GW+1]+=amt*fx*fy;}" +
        "function drop(sx,sy){" +
        "var x=sx,y=sy,dx=0,dy=0,sp=1,wat=1,sed=0;" +
        "for(var s=0;s<58;s++){" +
        "var x0=x|0,y0=y|0;if(x0<1||y0<1||x0>=GW-2||y0>=GH-2)return;" +
        "var i=y0*GW+x0,fx=x-x0,fy=y-y0;" +
        "var gx=(Hm[i+1]-Hm[i])*(1-fy)+(Hm[i+GW+1]-Hm[i+GW])*fy;" +
        "var gy=(Hm[i+GW]-Hm[i])*(1-fx)+(Hm[i+GW+1]-Hm[i+1])*fx;" +
        // 惯性：水不会瞬间改向，所以才会切出弯道而不是笔直往下
        "dx=dx*0.55-gx*0.45;dy=dy*0.55-gy*0.45;" +
        "var len=Math.sqrt(dx*dx+dy*dy);if(len<1e-6)return;" +
        "dx/=len;dy/=len;" +
        "var nx=x+dx,ny=y+dy,hOld=hAt(x,y),hNew=hAt(nx,ny);" +
        "if(hNew>1e8)return;" +
        "var dh=hNew-hOld;" +
        "var cap=Math.max(-dh*sp*wat*5.2,0.0006);" +
        "if(sed>cap||dh>0){" +
        "var give=dh>0?Math.min(dh,sed):(sed-cap)*0.28;" +
        "sed-=give;dep(x,y,give);}" +
        "else{var take=Math.min((cap-sed)*0.28,-dh);" +
        "sed+=take;dep(x,y,-take);}" +
        "sp=Math.sqrt(Math.max(0,sp*sp-dh*3.4));" +
        "wat*=0.985;x=nx;y=ny;}}" +
        "function draw(){var d=im.data,x,y,i,o,hh,sx,sy,sh,t2;" +
        "for(y=1;y<GH-1;y++)for(x=1;x<GW-1;x++){i=y*GW+x;o=i*4;" +
        "hh=Hm[i];" +
        // 山体阴影：法线跟一束斜光的夹角。没有这层，高度图就是一块糊斑
        "sx=(Hm[i+1]-Hm[i-1])*GW*0.5;sy=(Hm[i+GW]-Hm[i-GW])*GW*0.5;" +
        "sh=(-sx*0.55-sy*0.62+1.1)/Math.sqrt(sx*sx+sy*sy+1);" +
        "if(sh<0)sh=0;else if(sh>1.6)sh=1.6;" +
        "t2=(hh-0.28)*1.9;if(t2<0)t2=0;else if(t2>1)t2=1;" +
        "d[o]=(26+t2*158)*sh;d[o+1]=(38+t2*150)*sh;d[o+2]=(52+t2*128)*sh;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var rx=-1,ry=-1,chk=0;" +
        "function tick(){" +
        "for(var k=0;k<900;k++){" +
        // 指针是一场局部的雨：你把水浇在哪儿，哪儿就先被刻开
        "if(rx>=0&&k%3===0)drop(rx+(Math.random()-0.5)*14,ry+(Math.random()-0.5)*14);" +
        "else drop(Math.random()*GW,Math.random()*GH);}" +
        "draw();" +
        "if(++chk>60){chk=0;if(relief()<rel0*0.20)alloc();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "rx=p[0]/W*GW;ry=p[1]/H*GH;});" +
        "CV.addEventListener('pointerleave',function(){rx=-1;ry=-1;});",
    ),
  },
  {
    title: "档案",
    html: play(
      stageCss("ut-dos", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-dos"),
      MEM +
        FIT +
        // 它认真地、持续地记录你：划过多少像素、待了多少秒、点了几下、来过几天、
        // 换过多少次方向、最久一次一动不动多长。精确到小数点后一位，跨天累计，
        // 一格都不漏——采集的姿势做得一丝不苟。
        //
        // 最后那一格是「送出去过多少」。它永远是 0，而且不会有变成别的数字的一天。
        // 这些数字不上传、不能导出、换台设备就归零，谁也换不成钱。
        // 做足了全套监控，什么都没拿走——这就是它想说的那件事
        "var K=['px','sec','tap','vis','day','turn','still'];" +
        "var V=[],SPK=[];" +
        "for(var i=0;i<K.length;i++){V.push(M.num('dos_'+K[i],0));SPK.push([]);}" +
        "var today=new Date().toDateString();" +
        "if(M.get('dos_last','')!==today){V[4]+=1;M.set('dos_last',today);}" +
        "V[3]+=1;" +
        "function save(){for(var i=0;i<K.length;i++)M.set('dos_'+K[i],V[i]);}" +
        "save();" +
        "var lx=null,ly=null,ldx=0,ldy=0,lastMove=Date.now();" +
        "var prev=V.slice(0);" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "if(lx!==null){var dx=p[0]-lx,dy=p[1]-ly,d=Math.sqrt(dx*dx+dy*dy);" +
        "V[0]+=d;" +
        // 方向变化：点积转负就是拐了个大于九十度的弯
        "if(d>1.5){if(ldx*dx+ldy*dy<0)V[5]+=1;ldx=dx;ldy=dy;}}" +
        "lx=p[0];ly=p[1];lastMove=Date.now();});" +
        "CV.addEventListener('pointerdown',function(){V[2]+=1;});" +
        "setInterval(function(){V[1]+=1;" +
        "var idle=(Date.now()-lastMove)/1000;if(idle>V[6])V[6]=idle;" +
        "for(var i=0;i<K.length;i++){SPK[i].push(V[i]-prev[i]);prev[i]=V[i];" +
        "if(SPK[i].length>46)SPK[i].shift();}" +
        "save();},1000);" +
        "function fmt(v,dec){var s=v.toFixed(dec);return s;}" +
        "function tick(){" +
        "G.clearRect(0,0,W,H);" +
        "var cols=4,rows=2,pad=Math.min(W,H)*0.05;" +
        "var cw=(W-pad*2)/cols,ch=(H-pad*2)/rows;" +
        "for(var i=0;i<8;i++){" +
        "var cx=pad+(i%cols)*cw,cy=pad+((i/cols)|0)*ch;" +
        "G.strokeStyle='rgba(120,140,170,0.14)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(cx,cy+ch*0.86);G.lineTo(cx+cw*0.88,cy+ch*0.86);G.stroke();" +
        // 第八格是「送出去过多少」。写死 0，不接任何输入
        "var dead=i===7;" +
        "var val=dead?'0':fmt(V[i],i===0||i===6?1:0);" +
        "G.fillStyle=dead?'rgba(120,140,170,0.30)':'rgba(214,230,250,0.92)';" +
        "G.font='600 '+Math.min(cw*0.20,ch*0.30).toFixed(0)+'px ui-monospace,Menlo,monospace';" +
        "G.textBaseline='alphabetic';" +
        "G.fillText(val,cx,cy+ch*0.66);" +
        "if(dead)continue;" +
        "var sp=SPK[i],n=sp.length;if(n<2)continue;" +
        "var mxv=0.0001;for(var k=0;k<n;k++)if(sp[k]>mxv)mxv=sp[k];" +
        "G.strokeStyle='rgba(150,200,255,0.34)';G.beginPath();" +
        "for(var k2=0;k2<n;k2++){" +
        "var px=cx+k2/(n-1)*cw*0.88,py=cy+ch*0.86-(sp[k2]/mxv)*ch*0.14;" +
        "if(k2===0)G.moveTo(px,py);else G.lineTo(px,py);}" +
        "G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "一次",
    html: play(
      stageCss("ut-once", ";touch-action:none;cursor:pointer"),
      stageBody("ut-once"),
      FIT +
        // 按住它才长，按得越久长得越繁。松手的那一瞬间整片立刻消失——不是淡出，
        // 是没了。种子取自按下的那一刻，所以同一株永远不会有第二次。
        //
        // 你可以长出很好看的东西，但它只属于你按着的那段时间：给不了别人看，
        // 自己也看不到第二遍。反的是「留得下来才算数」
        "var T=[],SEG=0,on=false,rng=1;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "function start(px,py){" +
        "rng=(Date.now()>>>0)^((px*7919)|0)^((py*104729)|0);if(!rng)rng=1;" +
        "T=[];SEG=0;" +
        "G.clearRect(0,0,W,H);" +
        "var n=3+((rnd()*3)|0);" +
        "for(var i=0;i<n;i++)T.push({x:px,y:py,a:rnd()*6.2832,w:3.2,life:0});}" +
        "function grow(){if(!on||SEG>26000)return;" +
        "var add=[],i,t;" +
        "for(i=0;i<T.length;i++){t=T[i];" +
        "var ox=t.x,oy=t.y;" +
        "t.a+=(rnd()-0.5)*0.42;" +
        "var sp=1.6+t.w*0.5;" +
        "t.x+=Math.cos(t.a)*sp;t.y+=Math.sin(t.a)*sp;" +
        "t.life++;t.w*=0.994;" +
        "var h=(t.life*0.9+SEG*0.004)%360;" +
        "G.strokeStyle='hsla('+h.toFixed(0)+',72%,'+(58+t.w*3).toFixed(0)+'%,0.72)';" +
        "G.lineWidth=Math.max(0.4,t.w);G.lineCap='round';" +
        "G.beginPath();G.moveTo(ox,oy);G.lineTo(t.x,t.y);G.stroke();SEG++;" +
        // 越长越密：分叉概率随时间涨，所以按得久了会突然繁茂起来
        "if(t.w>0.55&&rnd()<0.018+t.life*0.00016&&T.length+add.length<420){" +
        "add.push({x:t.x,y:t.y,a:t.a+(rnd()-0.5)*1.5,w:t.w*0.78,life:t.life});}" +
        "if(t.x<-30||t.x>W+30||t.y<-30||t.y>H+30||t.w<0.34){" +
        "t.x=-999;t.w=0;}}" +
        "for(i=T.length-1;i>=0;i--)if(T[i].w<=0)T.splice(i,1);" +
        "for(i=0;i<add.length;i++)T.push(add[i]);}" +
        "function tick(){grow();requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}var p=at(e);on=true;start(p[0],p[1]);});" +
        // 松手就是没了。不留、不存、不淡出
        "function off(){if(!on)return;on=false;T=[];G.clearRect(0,0,W,H);}" +
        "CV.addEventListener('pointerup',off);" +
        "CV.addEventListener('pointercancel',off);" +
        "CV.addEventListener('pointerleave',off);",
    ),
  },
  {
    title: "效率",
    html: play(
      stageCss("ut-eff", ";touch-action:none;cursor:ew-resize"),
      stageBody("ut-eff"),
      MEM +
        FIT +
        // 往右拖就是提高效率：绕路被拉直、冗余的跑腿被裁掉、节点被合并、速度拉满。
        // 每一步都确实更"优"，而每一步之后可看的东西就少一点。
        //
        // 推到头是一条直线、一个点、瞬间到达，然后屏幕上什么都没有。
        // 而且它记得你把它优化到哪儿了——你昨天调过的，今天进来就是空的。
        // 想再看见点什么，你得亲手把它调回低效
        "var e=M.num('eff',0.12),NODE=[],AG=[],drag=false,lastx=0;" +
        "function build(){" +
        "var nn=Math.max(2,Math.round(3+(1-e)*15));" +
        "NODE=[];for(var i=0;i<nn;i++){var a=i/nn*6.2832+0.4;" +
        "NODE.push(W/2+Math.cos(a)*W*0.31,H/2+Math.sin(a)*H*0.33);}" +
        "var na=Math.max(1,Math.round(1+(1-e)*640));" +
        "AG=[];for(var k=0;k<na;k++){var f=(Math.random()*nn)|0,t=(Math.random()*nn)|0;" +
        "if(t===f)t=(f+1)%nn;" +
        "AG.push({f:f,t:t,p:Math.random(),o:(Math.random()-0.5),h:Math.random()*40+186});}}" +
        "onfit=build;build();" +
        "function tick(){" +
        "G.save();G.globalCompositeOperation='destination-out';G.fillStyle='rgba(0,0,0,0.11)';G.fillRect(0,0,W,H);G.restore();" +
        "var nn=NODE.length/2;" +
        "G.strokeStyle='rgba(140,170,210,0.22)';G.lineWidth=1;" +
        "for(var i=0;i<nn;i++){G.beginPath();" +
        "G.arc(NODE[i*2],NODE[i*2+1],5,0,7);G.stroke();}" +
        "var sp=0.0026+e*0.055,wob=(1-e)*(1-e)*160;" +
        "for(var k=0;k<AG.length;k++){var g=AG[k];" +
        "var ax=NODE[g.f*2],ay=NODE[g.f*2+1],bx=NODE[g.t*2],by=NODE[g.t*2+1];" +
        "g.p+=sp;" +
        "if(g.p>=1){g.p=0;g.f=g.t;g.t=(g.t+1+((Math.random()*(nn-1))|0))%nn;" +
        "g.o=(Math.random()-0.5);}" +
        // 绕路：垂直于直线方向的一条正弦鼓包，幅度随效率平方衰减到零
        "var dx=bx-ax,dy=by-ay,L=Math.sqrt(dx*dx+dy*dy)||1;" +
        "var bow=Math.sin(g.p*3.14159)*g.o*wob;" +
        "var x=ax+dx*g.p-dy/L*bow,y=ay+dy*g.p+dx/L*bow;" +
        "G.fillStyle='hsla('+g.h.toFixed(0)+',62%,68%,0.8)';" +
        "G.fillRect(x-1,y-1,2.8,2.8);}" +
        // 效率本身也画出来：底下一条线，你把它推到哪儿它就停在哪儿
        "G.strokeStyle='rgba(150,180,220,0.18)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(W*0.1,H-24);G.lineTo(W*0.9,H-24);G.stroke();" +
        "G.strokeStyle='rgba(210,232,255,0.7)';" +
        "G.beginPath();G.moveTo(W*0.1,H-24);G.lineTo(W*0.1+W*0.8*e,H-24);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "function setE(nx){var d=(nx-lastx)/W*1.6;lastx=nx;" +
        "var ne=Math.max(0,Math.min(1,e+d));" +
        "if(Math.abs(ne-e)<0.004)return;e=ne;M.set('eff',e.toFixed(4));build();}" +
        "CV.addEventListener('pointerdown',function(ev){" +
        "CV.setPointerCapture(ev.pointerId);drag=true;lastx=at(ev)[0];});" +
        "CV.addEventListener('pointermove',function(ev){if(drag)setE(at(ev)[0]);});" +
        "function up(){drag=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "背着你",
    html: play(
      stageCss("ut-away", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-away"),
      MEM +
        FIT +
        // 它只在没人盯着的时候长。指针一动，生长立刻停；停手三秒才重新开始。
        // 真正长得多的是你**离开这一页的那段时间**——关掉标签页去睡一觉，
        // 明天回来它大了一圈。
        //
        // 反的是「参与度」：你越投入，它越不长。想看它长大，唯一的办法是走开
        "var g=M.num('away_g',1600),last=M.num('away_t',Date.now());" +
        "var gone=(Date.now()-last)/1000;" +
        // 离开期间照长，但封顶：走开一年不该一次性长满
        "if(gone>0)g=Math.min(26000,g+Math.min(gone*12,5200));" +
        "M.set('away_g',g);M.set('away_t',Date.now());" +
        "setInterval(function(){M.set('away_g',g);M.set('away_t',Date.now());},2000);" +
        "var lastMove=Date.now(),shown=-1;" +
        "CV.addEventListener('pointermove',function(){lastMove=Date.now();});" +
        "CV.addEventListener('pointerleave',function(){lastMove=0;});" +
        // 叶序排列：黄金角 + 半径按平方根。同一个数目画出来永远是同一株，
        // 所以你每次回来看到的是它长大了，不是换了一个
        "function draw(){var n=g|0,i,a,r,x,y,t2,rr,gg,bb;" +
        "var S=Math.min(W,H)*0.0092;" +
        "G.clearRect(0,0,W,H);" +
        "for(i=0;i<n;i++){a=i*2.39996;r=S*Math.sqrt(i);" +
        "x=W/2+Math.cos(a)*r;y=H/2+Math.sin(a)*r;" +
        "if(x<-4||x>W+4||y<-4||y>H+4)continue;" +
        "t2=i/(n||1);" +
        "if(t2<0.5){var u=t2/0.5;rr=62+u*0;gg=88+u*70;bb=124+u*74;}" +
        "else{var w2=(t2-0.5)/0.5;rr=56+w2*192;gg=158+w2*82;bb=198+w2*40;}" +
        "G.fillStyle='rgba('+(rr|0)+','+(gg|0)+','+(bb|0)+',0.85)';" +
        "G.fillRect(x-1,y-1,2.2,2.2);}}" +
        "onfit=function(){shown=-1;};" +
        "function tick(){" +
        "if(Date.now()-lastMove>3000)g=Math.min(26000,g+4/60);" +
        "if((g|0)!==shown){shown=g|0;draw();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "两扇门",
    html: play(
      stageCss("ut-door", ";touch-action:none;cursor:pointer"),
      stageBody("ut-door"),
      MEM +
        FIT +
        // 两扇门，一模一样。你挑一扇推开——只开那一扇。
        // 里面的图案只跟「第几轮」有关，跟你选哪边无关。
        //
        // 每一轮里面的图案都不同，所以你会想再试一次、想找出差别。差别不存在。
        // 反的是那种到处都是的选择权——它只负责让你觉得是你选的
        "var n=M.num('door_n',0),st=0,t0=0,pick=-1,rng=1;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "function boxes(){var bw=Math.min(W*0.30,H*0.62),bh=bw*1.35;" +
        "var gap=bw*0.22,y=(H-bh)/2;" +
        "return[[W/2-gap/2-bw,y,bw,bh],[W/2+gap/2,y,bw,bh]];}" +
        // 图案只由轮次定种子。你点左还是点右，压根没进这个函数
        "function figure(cx,cy,rad,k){rng=(k*2654435761)>>>0;if(!rng)rng=7;" +
        "var arms=5+((rnd()*7)|0),lay=3+((rnd()*4)|0),i,j;" +
        "G.lineWidth=1.2;G.lineCap='round';" +
        "for(j=1;j<=lay;j++){var rr=rad*(j/lay),ph=rnd()*6.2832;" +
        "var hue=(rnd()*360)|0;" +
        "G.strokeStyle='hsla('+hue+',66%,'+(52+j*6)+'%,'+(0.85-j*0.09).toFixed(2)+')';" +
        "G.beginPath();" +
        "for(i=0;i<=arms*24;i++){var t2=i/(arms*24),a=ph+t2*6.2832;" +
        "var m=rr*(0.55+0.45*Math.cos(a*arms));" +
        "var x=cx+Math.cos(a)*m,y=cy+Math.sin(a)*m;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}" +
        "G.stroke();}}" +
        "function tick(){G.clearRect(0,0,W,H);" +
        "var B=boxes(),i,open=0;" +
        "if(st===1){open=Math.min(1,(Date.now()-t0)/620);}" +
        "else if(st===2){open=1;}" +
        "else if(st===3){open=Math.max(0,1-(Date.now()-t0)/620);}" +
        "for(i=0;i<2;i++){var b=B[i],o=(i===pick)?open:0;" +
        "if(o>0.02){" +
        "G.save();G.beginPath();G.rect(b[0],b[1],b[2],b[3]);G.clip();" +
        "G.globalAlpha=o;" +
        "figure(b[0]+b[2]/2,b[1]+b[3]/2,b[2]*0.40,n);" +
        "G.globalAlpha=1;G.restore();}" +
        // 门板：开的时候往两边分。只有点中的那一扇动
        "G.strokeStyle='rgba(168,182,206,0.55)';G.lineWidth=1.5;" +
        "G.strokeRect(b[0],b[1],b[2],b[3]);" +
        "G.fillStyle='rgba(20,22,28,0.96)';" +
        "var hw=b[2]/2*(1-o);" +
        "if(hw>0.5){G.fillRect(b[0],b[1],hw,b[3]);" +
        "G.fillRect(b[0]+b[2]-hw,b[1],hw,b[3]);" +
        "G.strokeRect(b[0],b[1],hw,b[3]);" +
        "G.strokeRect(b[0]+b[2]-hw,b[1],hw,b[3]);}}" +
        "if(st===1&&open>=1){st=2;t0=Date.now();}" +
        "else if(st===2&&Date.now()-t0>3400){st=3;t0=Date.now();}" +
        "else if(st===3&&open<=0){st=0;pick=-1;n++;M.set('door_n',n);}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(st!==0)return;var p=at(e),B=boxes(),i;" +
        "for(i=0;i<2;i++){var b=B[i];" +
        "if(p[0]>=b[0]&&p[0]<=b[0]+b[2]&&p[1]>=b[1]&&p[1]<=b[1]+b[3]){" +
        "pick=i;st=1;t0=Date.now();return;}}});",
    ),
  },
  {
    title: "看不清",
    html: play(
      stageCss("ut-blur", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-blur"),
      FIT +
        // 一整片有纹理的东西。你的指针停在哪儿，哪儿的纹路就开始乱——
        // 盯得越久越乱，挪开才慢慢长回来。
        //
        // 所以你永远看不清正在看的那一块，只看得清没在看的地方。
        // 反的是「看清楚了才算数」：注意力本身就是破坏性的
        "var CS=13,GW=1,GH=1,BA,AT;" +
        "function alloc(){GW=Math.ceil(W/CS);GH=Math.ceil(H/CS);" +
        "BA=new Float32Array(GW*GH);AT=new Float32Array(GW*GH);" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        // 平滑的角度场，画出来是一片有走向的纹理（像指纹或等高线）
        "BA[y*GW+x]=Math.sin(x*0.085)*1.9+Math.cos(y*0.104)*1.9" +
        "+Math.sin((x+y)*0.049)*1.3;}}" +
        "onfit=alloc;alloc();" +
        "var mx=-999,my=-999;" +
        "function tick(){var x,y,i,a,al,L=CS*0.62;" +
        "for(i=0;i<AT.length;i++)AT[i]*=0.988;" +
        "if(mx>-500){var cx=(mx/CS)|0,cy=(my/CS)|0;" +
        "for(y=-4;y<=4;y++)for(x=-4;x<=4;x++){" +
        "var gx=cx+x,gy=cy+y;if(gx<0||gy<0||gx>=GW||gy>=GH)continue;" +
        "var w=1-Math.sqrt(x*x+y*y)/4.6;if(w<=0)continue;" +
        "i=gy*GW+gx;AT[i]=Math.min(1,AT[i]+w*0.035);}}" +
        "G.clearRect(0,0,W,H);" +
        "G.lineCap='round';" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;" +
        "var at2=AT[i];" +
        // 注意力越高，角度越随机、笔画越淡：纹路在你眼皮底下散掉
        "a=BA[i]+(Math.random()-0.5)*at2*3.4;" +
        "al=0.62*(1-at2*0.86);if(al<0.02)continue;" +
        "G.strokeStyle='rgba(186,206,238,'+al.toFixed(3)+')';" +
        "G.lineWidth=1.1;" +
        "var px=x*CS+CS/2,py=y*CS+CS/2;" +
        "G.beginPath();" +
        "G.moveTo(px-Math.cos(a)*L/2,py-Math.sin(a)*L/2);" +
        "G.lineTo(px+Math.cos(a)*L/2,py+Math.sin(a)*L/2);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);mx=p[0];my=p[1];});" +
        "CV.addEventListener('pointerleave',function(){mx=-999;my=-999;});",
    ),
  },
  {
    title: "借来的",
    html: play(
      stageCss("ut-lend", ";touch-action:none;cursor:pointer"),
      stageBody("ut-lend"),
      FIT +
        // 按住才涨，松手就以**一模一样的速度**退回去。不是慢慢褪，是原样收回：
        // 你能看着它一层一层被拿走，顺序跟长上来时完全相反。
        //
        // 涨到过的最高处会留一道线，但那道线自己也在往下掉。什么都不存，
        // 关掉页面就归零。反的是「进度」——这里没有进度，只有你还在不在付
        "var h=0,peak=0,on=false,N=46;" +
        "function tick(){" +
        "if(on)h+=0.0024;else h-=0.0024;" +
        "if(h<0)h=0;else if(h>1)h=1;" +
        "if(h>peak)peak=h;else peak-=0.00035;if(peak<h)peak=h;" +
        "G.clearRect(0,0,W,H);" +
        "var bw=Math.min(W*0.42,520),x0=(W-bw)/2;" +
        "var y0=H*0.90,hh=H*0.76;" +
        "var lay=Math.floor(h*N);" +
        "for(var i=0;i<lay;i++){" +
        "var t2=i/N,yy=y0-t2*hh,th=hh/N*0.86;" +
        // 每一层宽窄不同、颜色不同，所以退回去的时候你认得出丢的是哪一层
        "var wob=0.55+0.45*Math.sin(i*1.37)*Math.cos(i*0.41);" +
        "G.fillStyle='hsla('+((196+t2*150)|0)+',62%,'+((44+t2*24)|0)+'%,0.88)';" +
        "G.fillRect(x0+bw*(1-wob)/2,yy-th,bw*wob,th);}" +
        "if(peak>0.01){var py=y0-peak*hh;" +
        "G.strokeStyle='rgba(200,214,240,0.34)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(x0-24,py);G.lineTo(x0+bw+24,py);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}on=true;});" +
        "function off(){on=false;}" +
        "CV.addEventListener('pointerup',off);" +
        "CV.addEventListener('pointercancel',off);" +
        "CV.addEventListener('pointerleave',off);",
    ),
  },
  {
    title: "用完了",
    html: play(
      stageCss("ut-spent", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-spent"),
      MEM +
        FIT +
        // 一百四十粒，碰到就收走。收完了这一条就**对你永久结束**——
        // 以后每次打开都是一片空的，没有重来、没有下一关、没有第二遍。
        //
        // 反的是「无限内容」。它是一次性的：你把它用掉了，它就真的没有了
        "var N=140,done=M.get('spent_done','')==='1',got=M.num('spent_n',0);" +
        "var P=[],rng=20260830;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "function alloc(){P=[];rng=20260830;" +
        "for(var i=0;i<N;i++)P.push(0.06+rnd()*0.88,0.08+rnd()*0.84,rnd());}" +
        "onfit=alloc;alloc();" +
        "var fl=[];" +
        "function tick(){" +
        "G.clearRect(0,0,W,H);" +
        "if(done){" +
        // 用完之后只剩一道极淡的横线。它记得你来过，也记得没有第二次了
        "G.strokeStyle='rgba(150,164,190,0.10)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(W*0.36,H/2);G.lineTo(W*0.64,H/2);G.stroke();" +
        "requestAnimationFrame(tick);return;}" +
        "for(var i=got;i<N;i++){" +
        "var x=P[i*3]*W,y=P[i*3+1]*H,ph=P[i*3+2]*6.2832;" +
        "var pu=0.6+0.4*Math.sin(Date.now()*0.0016+ph);" +
        "G.fillStyle='hsla('+((36+P[i*3+2]*300)|0)+',72%,64%,'+(0.5+pu*0.45).toFixed(2)+')';" +
        "G.beginPath();G.arc(x,y,2.4+pu*1.7,0,7);G.fill();}" +
        "var now=Date.now();" +
        "for(var k=fl.length-1;k>=0;k--){var a=(now-fl[k].t)/460;" +
        "if(a>1){fl.splice(k,1);continue;}" +
        "G.strokeStyle='rgba(228,240,255,'+((1-a)*0.7).toFixed(2)+')';G.lineWidth=1;" +
        "G.beginPath();G.arc(fl[k].x,fl[k].y,4+a*30,0,7);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "function take(e){if(done)return;var p=at(e);" +
        "for(var i=got;i<Math.min(N,got+6);i++){" +
        "var x=P[i*3]*W,y=P[i*3+1]*H;" +
        "if(Math.hypot(p[0]-x,p[1]-y)>26)continue;" +
        // 只能按顺序收：收到的那一粒和队首交换，队首指针往前走一格
        "for(var j=0;j<3;j++){var t2=P[got*3+j];P[got*3+j]=P[i*3+j];P[i*3+j]=t2;}" +
        "fl.push({x:x,y:y,t:Date.now()});got++;M.set('spent_n',got);" +
        "if(got>=N){done=true;M.set('spent_done','1');}return;}}" +
        "CV.addEventListener('pointermove',take);" +
        "CV.addEventListener('pointerdown',take);",
    ),
  },
  {
    title: "第一次",
    html: play(
      stageCss("ut-first"),
      stageBody("ut-first"),
      MEM +
        FIT +
        // 同一张图，只有**第一次打开**是彩色的。之后每一次都是灰的，永远。
        // 图案由这台设备自己的种子生成，所以那张彩色的只属于你，
        // 而且你已经用掉了。
        //
        // 反的是「随时可以重温」。新鲜是一次性的，且不可再生
        "var seed=M.num('first_seed',0);" +
        "if(!seed){seed=(Date.now()>>>0)||7;M.set('first_seed',seed);}" +
        "var fresh=M.get('first_seen','')!=='1';" +
        "if(fresh)setTimeout(function(){M.set('first_seen','1');},2500);" +
        "var rng=seed;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "function tick(){rng=seed;" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H/2,R=Math.min(W,H)*0.40,t=Date.now()*0.00016;" +
        "var lay=7+((rnd()*6)|0),i,j;" +
        "G.lineWidth=1.1;G.lineCap='round';" +
        "for(j=0;j<lay;j++){" +
        "var k1=2+((rnd()*7)|0),k2=1+((rnd()*5)|0),ph=rnd()*6.2832;" +
        "var rr=R*(0.24+0.76*(j+1)/lay),hue=(rnd()*360)|0;" +
        // 只此一次的那一张：颜色在第一次之后被抽干，图形一模一样
        "G.strokeStyle=fresh" +
        "?'hsla('+hue+',68%,60%,0.5)'" +
        ":'hsla(0,0%,'+((34+j*3)|0)+'%,0.42)';" +
        "G.beginPath();" +
        "for(i=0;i<=420;i++){var a=i/420*6.2832;" +
        "var m=rr*(0.62+0.38*Math.cos(a*k1+ph+t*k2));" +
        "var x=cx+Math.cos(a)*m,y=cy+Math.sin(a)*m*0.86;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}" +
        "G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "磨损",
    html: play(
      stageCss("ut-wear", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-wear"),
      MEM +
        FIT +
        // 一整片刻上去的花纹。你的手划过哪里，哪里就被磨掉一点——**磨掉的不会回来**，
        // 而且跨天记着。来的次数够多，这一片就被你磨平了。
        //
        // 反的是「用不坏」。它有寿命，你每看一次就用掉一点
        "var MC=64,MR=40,WR,GX=0,GY=0;" +
        "var raw=M.get('wear','');" +
        "WR=new Float32Array(MC*MR);" +
        "for(var i=0;i<WR.length;i++)" +
        "WR[i]=i<raw.length?(raw.charCodeAt(i)-48)/9:0;" +
        "var dirty=false;" +
        "setInterval(function(){if(!dirty)return;dirty=false;var s='';" +
        "for(var i=0;i<WR.length;i++)" +
        "s=s+String.fromCharCode(48+Math.min(9,Math.round(WR[i]*9)));" +
        "M.set('wear',s);},2500);" +
        "function wearAt(x,y){" +
        "var gx=(x/W*MC)|0,gy=(y/H*MR)|0;" +
        "if(gx<0)gx=0;else if(gx>=MC)gx=MC-1;" +
        "if(gy<0)gy=0;else if(gy>=MR)gy=MR-1;" +
        "return WR[gy*MC+gx];}" +
        "function tick(){" +
        "G.clearRect(0,0,W,H);" +
        // 玑镂式的密线：两个不可通约的频率叠出来的花纹，磨掉一点就看得出缺口
        "var cx=W/2,cy=H/2,R=Math.min(W,H)*0.44;" +
        "G.lineWidth=1;" +
        "for(var k=0;k<26;k++){" +
        "var a1=3+k*0.5,a2=11+k*0.31,rr=R*(0.22+0.78*k/26);" +
        "G.beginPath();var pen=false;" +
        "for(var i=0;i<=520;i++){var a=i/520*6.2832;" +
        "var m=rr*(0.80+0.20*Math.cos(a*a1)*Math.sin(a*a2));" +
        "var x=cx+Math.cos(a)*m,y=cy+Math.sin(a)*m*0.9;" +
        "var w=wearAt(x,y);" +
        // 磨到八成就彻底断掉，线上出现一个再也接不回去的豁口
        "if(w>0.8){if(pen){G.stroke();pen=false;}continue;}" +
        "if(!pen){G.beginPath();G.moveTo(x,y);pen=true;" +
        "G.strokeStyle='rgba(206,220,244,'+(0.52*(1-w)).toFixed(3)+')';}" +
        "else G.lineTo(x,y);}" +
        "if(pen)G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "var gx=(p[0]/W*MC)|0,gy=(p[1]/H*MR)|0;" +
        "for(var b=-2;b<=2;b++)for(var a=-2;a<=2;a++){" +
        "var dd=a*a+b*b;if(dd>5)continue;" +
        "var x=gx+a,y=gy+b;if(x<0||y<0||x>=MC||y>=MR)continue;" +
        "WR[y*MC+x]=Math.min(1,WR[y*MC+x]+0.010*(1-Math.sqrt(dd)/3));}" +
        "dirty=true;});",
    ),
  },
  {
    title: "捷径",
    html: play(
      stageCss("ut-braess", ";touch-action:none;cursor:pointer"),
      stageBody("ut-braess"),
      MEM +
        FIT +
        // 布雷斯悖论：给路网加一条**又快又免费**的捷径，所有人都改走它，
        // 结果是所有人都变慢。这不是拥堵没算好，是纳什均衡本身的性质——
        // 每个人都做了对自己最优的选择，合起来比不修那条路更差。
        //
        // 点一下开关捷径。底下那条是平均耗时，开了之后它会变长。
        // 反的是「多一个选项总不会更坏」
        "var N=260,A=[],onCut=M.get('braess','')==='1',avg=0,shown=0;" +
        "function alloc(){A=[];for(var i=0;i<N;i++)" +
        "A.push({p:Math.random(),up:Math.random()<0.5,cut:false,t:0,last:0});}" +
        "onfit=alloc;alloc();" +
        "function nodes(){var m=Math.min(W,H);" +
        "return{s:[W*0.5-m*0.36,H*0.5],t:[W*0.5+m*0.36,H*0.5]," +
        "a:[W*0.5,H*0.5-m*0.24],b:[W*0.5,H*0.5+m*0.24]};}" +
        "function tick(){var i,g,nd=nodes();" +
        // 拥堵边的耗时正比于走它的人数；固定边不管多少人都一样
        "var nA=0,nB=0,nC=0;" +
        "for(i=0;i<N;i++){g=A[i];if(g.cut)nC++;else if(g.up)nA++;else nB++;}" +
        // 布雷斯要成立，拥堵项不能带常数、固定项要等于满载时的拥堵值。
        // 原来加了 0.55 的常数、固定项给到 1.75，捷径在均衡点上反而更贵，
        // 没人会改道，悖论压根触发不了
        "var cong=(nA+nC)/N*2.0,cong2=(nB+nC)/N*2.0,fix=2.0;" +
        "var costUp=cong+fix,costDn=fix+cong2,costCut=cong+0.04+cong2;" +
        "if(costUp<0.2)costUp=0.2;if(costDn<0.2)costDn=0.2;if(costCut<0.2)costCut=0.2;" +
        "var sum=0;" +
        "for(i=0;i<N;i++){g=A[i];" +
        "var c=g.cut?costCut:(g.up?costUp:costDn);" +
        "g.p+=0.0075/c;sum+=c;" +
        "if(g.p>=1){g.p=0;" +
        // 每个人到站就重新挑一条对自己最快的：这就是均衡怎么形成的
        "if(onCut&&costCut<Math.min(costUp,costDn)-0.02)g.cut=true;" +
        "else{g.cut=false;g.up=costUp<costDn;}}}" +
        "avg=sum/N;shown+=(avg-shown)*0.05;" +
        "G.clearRect(0,0,W,H);" +
        "function seg(p,q,load){" +
        "G.strokeStyle='hsla('+((196-load*150)|0)+',72%,'+((36+load*26)|0)+'%,0.85)';" +
        "G.lineWidth=2+load*7;G.beginPath();G.moveTo(p[0],p[1]);G.lineTo(q[0],q[1]);G.stroke();}" +
        "seg(nd.s,nd.a,(nA+nC)/N);seg(nd.a,nd.t,nA/N);" +
        "seg(nd.s,nd.b,nB/N);seg(nd.b,nd.t,(nB+nC)/N);" +
        "if(onCut)seg(nd.a,nd.b,nC/N);" +
        "G.fillStyle='rgba(226,238,255,0.9)';" +
        "var K=[nd.s,nd.t,nd.a,nd.b];" +
        "for(i=0;i<4;i++){G.beginPath();G.arc(K[i][0],K[i][1],5,0,7);G.fill();}" +
        "for(i=0;i<N;i++){g=A[i];var x,y,p2=g.p;" +
        "if(g.cut){if(p2<0.34){x=nd.s[0]+(nd.a[0]-nd.s[0])*(p2/0.34);" +
        "y=nd.s[1]+(nd.a[1]-nd.s[1])*(p2/0.34);}" +
        "else if(p2<0.5){var u=(p2-0.34)/0.16;" +
        "x=nd.a[0]+(nd.b[0]-nd.a[0])*u;y=nd.a[1]+(nd.b[1]-nd.a[1])*u;}" +
        "else{var v=(p2-0.5)/0.5;x=nd.b[0]+(nd.t[0]-nd.b[0])*v;" +
        "y=nd.b[1]+(nd.t[1]-nd.b[1])*v;}}" +
        "else{var m=g.up?nd.a:nd.b;" +
        "if(p2<0.5){x=nd.s[0]+(m[0]-nd.s[0])*(p2*2);y=nd.s[1]+(m[1]-nd.s[1])*(p2*2);}" +
        "else{x=m[0]+(nd.t[0]-m[0])*((p2-0.5)*2);y=m[1]+(nd.t[1]-m[1])*((p2-0.5)*2);}}" +
        "G.fillStyle=g.cut?'rgba(255,190,120,0.9)':'rgba(180,206,240,0.7)';" +
        "G.fillRect(x-1,y-1,2.4,2.4);}" +
        // 平均耗时：开了捷径它会变长，而且不会自己回去
        "var bx=W*0.12,bw=W*0.76,by=H-26;" +
        "G.strokeStyle='rgba(150,170,200,0.2)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(bx,by);G.lineTo(bx+bw,by);G.stroke();" +
        "G.strokeStyle='rgba(255,176,110,0.85)';" +
        "G.beginPath();G.moveTo(bx,by);" +
        "G.lineTo(bx+bw*Math.max(0,Math.min(1,(shown-1.8)/2.6)),by);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(){onCut=!onCut;" +
        "M.set('braess',onCut?'1':'0');" +
        "if(!onCut)for(var i=0;i<N;i++)A[i].cut=false;});",
    ),
  },
  {
    title: "增长",
    html: play(
      stageCss("ut-boom"),
      stageBody("ut-boom"),
      FIT +
        // 草在长，吃草的在推进。规则只有两句：草够厚的地方，消费才传得过去；
        // 传过去的地方草被吃光，得从头长。
        //
        // 于是永远是同一件事：哪儿攒够了，哪儿就被扫平；扫平的地方要很久才缓过来，
        // 缓过来又会被扫。攒得越厚，扫得越快、越彻底。
        // 这不是没管好，是「无限增长」在有限空间里唯一的走法
        "var GW=1,GH=1,R,S,S2,off,og,im,TH=0.52;" +
        "function alloc(){GW=Math.max(160,Math.min(440,Math.round(W/3.4)));" +
        "GH=Math.max(80,Math.round(GW*H/W));" +
        "R=new Float32Array(GW*GH);S=new Uint8Array(GW*GH);S2=new Uint8Array(GW*GH);" +
        "for(var i=0;i<R.length;i++)R[i]=Math.random();" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "function step(){var x,y,i,dx,dy,n;" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;" +
        "if(S[i]){S2[i]=0;R[i]=0;continue;}" +
        "R[i]+=(1-R[i])*0.016;" +
        // 草不够厚就传不过去——所以扫过的地方能歇一阵，波才有间隔
        "if(R[i]<TH){S2[i]=0;continue;}" +
        "n=0;" +
        "for(dy=-1;dy<=1&&!n;dy++)for(dx=-1;dx<=1;dx++){" +
        "if(!dx&&!dy)continue;" +
        "if(S[((y+dy+GH)%GH)*GW+((x+dx+GW)%GW)]){n=1;break;}}" +
        // 偶尔自燃：不然扫完一轮就再也起不来了
        "S2[i]=(n||Math.random()<0.0000075)?1:0;}" +
        "var t=S;S=S2;S2=t;}" +
        "function draw(){var d=im.data,i,o,r;" +
        "for(i=0;i<R.length;i++){o=i*4;r=R[i];" +
        "if(S[i]){d[o]=255;d[o+1]=196;d[o+2]=96;continue;}" +
        "d[o]=18+r*46;d[o+1]=24+r*186;d[o+2]=32+r*70;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var last=0;" +
        "function tick(){var now=Date.now();if(now-last>34){last=now;step();}" +
        "draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "同温层",
    html: play(
      stageCss("ut-echo", ";touch-action:none;cursor:ew-resize"),
      stageBody("ut-echo"),
      MEM +
        FIT +
        // 每个人有一个立场（横轴）。两两碰面时，只有立场差距**小于阈值**才会互相
        // 靠近一点；差得远的碰了也当没看见。
        //
        // 往左拖是收窄阈值。阈值宽的时候所有人慢慢汇到中间；一收窄，
        // 中间就塌掉，人群裂成几块互不来往的，而且再也合不回去。
        // 这就是推荐算法那件事的模型：它只负责让你少碰见不一样的
        "var N=1200,O,eps=M.num('echo_e',0.34),T=[],drag=false,lx=0;" +
        "function alloc(){O=new Float32Array(N);" +
        "for(var i=0;i<N;i++)O[i]=Math.random();T=[];}" +
        "onfit=alloc;alloc();" +
        "function tick(){var k,i,j,d;" +
        "for(k=0;k<900;k++){" +
        "i=(Math.random()*N)|0;j=(Math.random()*N)|0;if(i===j)continue;" +
        "d=O[i]-O[j];if(d<0)d=-d;" +
        // 差得远就当没碰见。这一行就是全部
        "if(d>eps)continue;" +
        "var m=(O[i]+O[j])*0.5;" +
        "O[i]+=(m-O[i])*0.34;O[j]+=(m-O[j])*0.34;}" +
        // 每隔一阵把当前分布压成一行，往下堆——于是能看见分裂是什么时候发生的
        "var BN=120,hist=new Float32Array(BN);" +
        "for(i=0;i<N;i++){var b=(O[i]*BN)|0;if(b<0)b=0;else if(b>=BN)b=BN-1;hist[b]++;}" +
        "T.push(hist);if(T.length>Math.max(60,(H/3)|0))T.shift();" +
        "G.clearRect(0,0,W,H);" +
        "var rows=T.length,rh=Math.min(3,(H-40)/rows);" +
        "for(var r=0;r<rows;r++){var hh=T[r],mx=1;" +
        "for(i=0;i<BN;i++)if(hh[i]>mx)mx=hh[i];" +
        "for(i=0;i<BN;i++){if(hh[i]<1)continue;" +
        "var v=Math.min(1,hh[i]/mx);" +
        "G.fillStyle='hsla('+((198+i*1.1)|0)+',70%,'+((26+v*52)|0)+'%,'+(0.22+v*0.7).toFixed(2)+')';" +
        "G.fillRect(i/BN*W,(rows-1-r)*rh,W/BN+1,rh+0.6);}}" +
        // 阈值也画出来：你把它收到哪儿，它就停在哪儿，而且记着
        "G.strokeStyle='rgba(150,170,200,0.18)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(W*0.12,H-18);G.lineTo(W*0.88,H-18);G.stroke();" +
        "G.strokeStyle='rgba(214,232,255,0.75)';" +
        "G.beginPath();G.moveTo(W*0.12,H-18);" +
        "G.lineTo(W*0.12+W*0.76*eps,H-18);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}drag=true;lx=at(e)[0];});" +
        // 收窄阈值必须重新分散人群才有意义：都已经挤成一团了，再窄的口子也容得下。
        // 每调一次就是重来一次——同一群人、只换过滤的宽度，看结局差多少
        "CV.addEventListener('pointermove',function(e){if(!drag)return;" +
        "var x=at(e)[0],ne=Math.max(0.02,Math.min(0.6,eps+(x-lx)/W*0.7));lx=x;" +
        "if(Math.abs(ne-eps)<0.004)return;eps=ne;M.set('echo_e',eps.toFixed(3));" +
        "for(var i=0;i<N;i++)O[i]=Math.random();T=[];});" +
        "function up(){drag=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "推荐",
    html: play(
      stageCss("ut-reco", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-reco"),
      MEM +
        FIT +
        // 满屏是全部的东西。亮着的那十几个是"推给你的"。
        // 你点哪个，口味中心就往哪边挪一点，推荐半径就收窄一点。
        //
        // 点上二十来下，那个圈会缩成一个针尖：从此你只看得见一小撮，
        // 而整片暗着的东西一直在那儿——它们没被删掉，只是不再送到你面前。
        // 而且它记着，明天进来圈还是那么小
        "var M2=1500,IT,px=M.num('reco_x',0.5),py=M.num('reco_y',0.5)," +
        "rad=M.num('reco_r',0.42);" +
        "function alloc(){IT=new Float32Array(M2*3);" +
        "for(var i=0;i<M2;i++){IT[i*3]=Math.random();IT[i*3+1]=Math.random();" +
        "IT[i*3+2]=Math.random();}}" +
        "onfit=alloc;alloc();" +
        "var served=[];" +
        "function pick(){served=[];var d=[],i;" +
        "for(i=0;i<M2;i++){var dx=IT[i*3]-px,dy=IT[i*3+1]-py;" +
        "var dd=Math.sqrt(dx*dx+dy*dy);if(dd<=rad)d.push([dd,i]);}" +
        "d.sort(function(a,b){return a[0]-b[0];});" +
        "for(i=0;i<Math.min(18,d.length);i++)served.push(d[i][1]);}" +
        "pick();" +
        "function tick(){G.clearRect(0,0,W,H);" +
        "var i;" +
        // 全部：暗的。它们没消失，只是你看不到了
        "for(i=0;i<M2;i++){G.fillStyle='rgba(120,140,175,0.11)';" +
        "G.fillRect(IT[i*3]*W,IT[i*3+1]*H,1.6,1.6);}" +
        "G.strokeStyle='rgba(160,190,240,0.16)';G.lineWidth=1;" +
        "G.beginPath();G.ellipse(px*W,py*H,rad*W,rad*H,0,0,6.2832);G.stroke();" +
        "for(i=0;i<served.length;i++){var k=served[i];" +
        "var pu=0.6+0.4*Math.sin(Date.now()*0.002+k);" +
        "G.fillStyle='hsla('+((28+IT[k*3+2]*300)|0)+',76%,66%,'+(0.5+pu*0.45).toFixed(2)+')';" +
        "G.beginPath();G.arc(IT[k*3]*W,IT[k*3+1]*H,3.2+pu*2,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){var p=at(e);" +
        "var bx=p[0]/W,by=p[1]/H,best=-1,bd=1e9,i;" +
        "for(i=0;i<served.length;i++){var k=served[i];" +
        "var dx=IT[k*3]-bx,dy=IT[k*3+1]-by,dd=dx*dx+dy*dy;" +
        "if(dd<bd){bd=dd;best=k;}}" +
        "if(best<0||bd>0.0016)return;" +
        // 你点了 = 你喜欢。中心靠过去，半径收窄。没有反向的那个按钮
        "px+=(IT[best*3]-px)*0.42;py+=(IT[best*3+1]-py)*0.42;" +
        "rad=Math.max(0.012,rad*0.88);" +
        "M.set('reco_x',px.toFixed(4));M.set('reco_y',py.toFixed(4));" +
        "M.set('reco_r',rad.toFixed(4));pick();});",
    ),
  },
  {
    title: "对齐",
    html: play(
      stageCss("ut-align", ";touch-action:none;cursor:grab"),
      stageBody("ut-align"),
      MEM +
        FIT +
        // 把动的那根拨到跟定的那根重合。每次你对上了，它就承认一下——
        // 然后目标挪开一点点，而且**要求的精度翻一倍**。
        //
        // 所以永远差一点。而且这个精度跨天记着：你昨天对得越准，
        // 今天的门槛就越苛刻。反的是那种一直在往上提的标准
        "var tol=M.num('align_t',0.10),hit=M.num('align_h',0);" +
        "var tgt=Math.random()*6.2832,cur=tgt+0.9,drag=false,flash=0;" +
        "function tick(){" +
        "var d=cur-tgt;while(d>3.14159)d-=6.28318;while(d<-3.14159)d+=6.28318;" +
        "var ad=d<0?-d:d;" +
        "if(ad<tol&&!drag){" +
        // 对上了：认一下，然后目标挪走、门槛砍半
        "hit++;flash=1;tol=Math.max(0.00012,tol*0.5);" +
        "tgt+=(Math.random()<0.5?-1:1)*(tol*7+0.12);" +
        "M.set('align_t',tol.toFixed(6));M.set('align_h',hit);}" +
        "if(flash>0)flash-=0.022;" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H/2,R=Math.min(W,H)*0.36;" +
        "G.strokeStyle='rgba(140,160,195,0.16)';G.lineWidth=1;" +
        "G.beginPath();G.arc(cx,cy,R,0,7);G.stroke();" +
        "G.strokeStyle='rgba(150,178,220,0.75)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(cx-Math.cos(tgt)*R,cy-Math.sin(tgt)*R);" +
        "G.lineTo(cx+Math.cos(tgt)*R,cy+Math.sin(tgt)*R);G.stroke();" +
        "var g2=Math.max(0,1-ad/0.9);" +
        "G.strokeStyle='hsla('+((44+g2*70)|0)+',82%,'+((58+flash*36)|0)+'%,0.92)';" +
        "G.lineWidth=2.4;" +
        "G.beginPath();G.moveTo(cx-Math.cos(cur)*R*0.82,cy-Math.sin(cur)*R*0.82);" +
        "G.lineTo(cx+Math.cos(cur)*R*0.82,cy+Math.sin(cur)*R*0.82);G.stroke();" +
        // 底下那条是当前门槛。它只会越来越短
        "var bx=W*0.2,bw=W*0.6,by=H-24;" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(bx,by);G.lineTo(bx+bw,by);G.stroke();" +
        "G.strokeStyle='rgba(226,238,255,0.7)';" +
        "G.beginPath();G.moveTo(bx,by);" +
        "G.lineTo(bx+bw*Math.min(1,tol/0.10),by);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "function set(e){var p=at(e);cur=Math.atan2(p[1]-H/2,p[0]-W/2);}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}drag=true;set(e);});" +
        "CV.addEventListener('pointermove',function(e){if(drag)set(e);});" +
        "function up(){drag=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "债",
    html: play(
      stageCss("ut-debt", ";touch-action:none;cursor:pointer"),
      stageBody("ut-debt"),
      MEM +
        FIT +
        // 跟「背着你」正好相反：你不在的时候，水位一直在涨。
        // 按住能把它压下去一点，松手它立刻回涨，而且涨得比你压得快。
        //
        // 水面下有一丛细密的东西，涨上来就看不见了。反的是「放着不管会好起来」
        "var lv=M.num('debt_l',0.18),last=M.num('debt_t',Date.now()),on=false;" +
        "var gone=(Date.now()-last)/1000;" +
        "if(gone>0)lv=Math.min(1,lv+Math.min(gone*0.0016,0.42));" +
        "M.set('debt_l',lv.toFixed(4));M.set('debt_t',Date.now());" +
        "setInterval(function(){M.set('debt_l',lv.toFixed(4));" +
        "M.set('debt_t',Date.now());},2000);" +
        "var ST=[],rng=99;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "function alloc(){ST=[];rng=99;" +
        "for(var i=0;i<64;i++){var x=0.06+rnd()*0.88;" +
        "ST.push({x:x,h:0.18+rnd()*0.62,w:0.6+rnd()*1.6,ph:rnd()*6.2832});}}" +
        "onfit=alloc;alloc();" +
        "function tick(){" +
        // 压得慢、涨得快。你按着的时候也只是让它慢一点
        "if(on)lv-=0.0016;else lv+=0.00052;" +
        "if(lv<0)lv=0;else if(lv>1)lv=1;" +
        "G.clearRect(0,0,W,H);" +
        "var t=Date.now()*0.0011,base=H*0.94;" +
        "G.lineCap='round';" +
        "for(var i=0;i<ST.length;i++){var s=ST[i];" +
        "var x=s.x*W,hh=s.h*H*0.72;" +
        "G.strokeStyle='rgba(170,198,236,0.42)';G.lineWidth=s.w;" +
        "G.beginPath();G.moveTo(x,base);" +
        "for(var k=1;k<=10;k++){var f=k/10;" +
        "G.lineTo(x+Math.sin(t*0.6+s.ph+f*2.4)*10*f,base-hh*f);}" +
        "G.stroke();}" +
        "var wy=base-lv*H*0.86;" +
        "G.fillStyle='rgba(14,20,34,0.90)';" +
        "G.fillRect(0,wy,W,H-wy);" +
        "G.strokeStyle='rgba(120,168,224,0.55)';G.lineWidth=1.5;" +
        "G.beginPath();" +
        "for(var x2=0;x2<=W;x2+=6)" +
        "G[x2?'lineTo':'moveTo'](x2,wy+Math.sin(x2*0.017+t*1.5)*2.4);" +
        "G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}on=true;});" +
        "function off(){on=false;}" +
        "CV.addEventListener('pointerup',off);" +
        "CV.addEventListener('pointercancel',off);" +
        "CV.addEventListener('pointerleave',off);",
    ),
  },
  {
    title: "续订",
    html: play(
      stageCss("ut-streak"),
      stageBody("ut-streak"),
      MEM +
        FIT +
        // 连续来一天长一环。断一天——不是掉一环，是**整串归零**。
        //
        // 这就是连胜机制干的事：它把"每天回来"变成一笔你已经欠下的东西，
        // 让你不敢停。那个数字越大，你越走不掉。反的正是这个
        "var today=new Date().toDateString();" +
        "var y=new Date(Date.now()-86400000).toDateString();" +
        "var day=M.get('st_day',''),n=M.num('st_n',0),best=M.num('st_best',0);" +
        "var broke=0;" +
        "if(day!==today){" +
        "if(day===y)n=n+1;else{if(n>1)broke=1;n=1;}" +
        "M.set('st_day',today);M.set('st_n',n);}" +
        "if(n>best){best=n;M.set('st_best',best);}" +
        "var t0=Date.now();" +
        "function tick(){var el=(Date.now()-t0)/1000;" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H/2,R=Math.min(W,H)*0.40;" +
        // 断了的话，先把上一串碎给你看，再从一环重新开始
        "var shatter=broke?Math.min(1,el/2.2):0;" +
        "if(broke&&shatter<1){" +
        "for(var k=0;k<46;k++){var a=k/46*6.2832,d=shatter*R*2.4;" +
        "G.strokeStyle='rgba(190,120,110,'+((1-shatter)*0.5).toFixed(2)+')';" +
        "G.lineWidth=1.4;G.beginPath();" +
        "G.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,R*0.10*(1-shatter),0,7);G.stroke();}}" +
        "var show=broke?(shatter>=1?n:0):n;" +
        "for(var i=0;i<show;i++){" +
        "var t2=i/Math.max(1,show-1),rr=R*(0.16+0.84*(i+1)/Math.max(1,show));" +
        "var ph=i*0.62+Date.now()*0.00022;" +
        "var fresh=i===show-1?1:0;" +
        "G.strokeStyle='hsla('+((196+t2*120)|0)+',72%,'+((44+fresh*26)|0)+'%,'+(0.34+t2*0.5).toFixed(2)+')';" +
        "G.lineWidth=fresh?2.4:1.3;" +
        "G.beginPath();" +
        "for(var s=0;s<=90;s++){var a2=s/90*6.2832;" +
        "var m=rr*(1+0.05*Math.sin(a2*5+ph));" +
        "var x=cx+Math.cos(a2)*m,yy=cy+Math.sin(a2)*m*0.88;" +
        "if(s===0)G.moveTo(x,yy);else G.lineTo(x,yy);}" +
        "G.stroke();}" +
        // 数字放在正中。它就是这条东西全部的胁迫力
        "G.fillStyle='rgba(226,238,255,0.9)';" +
        "G.font='600 '+(Math.min(W,H)*0.11).toFixed(0)+'px ui-monospace,Menlo,monospace';" +
        "G.textAlign='center';G.textBaseline='middle';" +
        "G.fillText(String(show),cx,cy);" +
        "G.fillStyle='rgba(150,168,196,0.30)';" +
        "G.font='600 '+(Math.min(W,H)*0.038).toFixed(0)+'px ui-monospace,Menlo,monospace';" +
        "G.fillText(String(best),cx,cy+Math.min(W,H)*0.10);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "备份",
    html: play(
      stageCss("ut-copy", ";touch-action:none;cursor:pointer"),
      stageBody("ut-copy"),
      MEM +
        FIT +
        // 点一下就复制一份，然后把原件扔了、留下这份复制品。
        // 每一份都从上一份来，每一次都掉一点：糊一点、色阶粗一点、噪一点。
        //
        // 复制次数跨天记着，所以你回来看到的永远是当前那一代，回不去。
        // 反的是「拷贝是免费的」——它不是，只是账记在别处
        "var OW=440,OH=248,gen=M.num('copy_g',0),off,og;" +
        "function origin(){var i,j;" +
        "og.fillStyle='#0b1020';og.fillRect(0,0,OW,OH);" +
        "var rng=987654321;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "for(j=0;j<9;j++){" +
        "og.strokeStyle='hsla('+((rnd()*360)|0)+',74%,62%,0.85)';" +
        "og.lineWidth=1+rnd()*2.2;og.beginPath();" +
        "var k1=2+((rnd()*7)|0),ph=rnd()*6.2832,rr=OH*(0.14+0.34*rnd());" +
        "for(i=0;i<=360;i++){var a=i/360*6.2832;" +
        "var m=rr*(0.6+0.4*Math.cos(a*k1+ph));" +
        "var x=OW/2+Math.cos(a)*m*1.5,y=OH/2+Math.sin(a)*m;" +
        "if(i===0)og.moveTo(x,y);else og.lineTo(x,y);}" +
        "og.stroke();}}" +
        // 一次转录的代价：错位重绘（糊）、色阶量化（断层）、加一点噪
        "function degrade(){" +
        "og.globalAlpha=0.55;og.drawImage(off,0.7,0.5,OW,OH);og.globalAlpha=1;" +
        "var im=og.getImageData(0,0,OW,OH),d=im.data,i;" +
        "for(i=0;i<d.length;i+=4){" +
        "d[i]=Math.min(255,Math.max(0,(Math.round(d[i]/19)*19)+(Math.random()*9-4)));" +
        "d[i+1]=Math.min(255,Math.max(0,(Math.round(d[i+1]/19)*19)+(Math.random()*9-4)));" +
        "d[i+2]=Math.min(255,Math.max(0,(Math.round(d[i+2]/19)*19)+(Math.random()*9-4)));}" +
        "og.putImageData(im,0,0);}" +
        "function build(){off=document.createElement('canvas');" +
        "off.width=OW;off.height=OH;og=off.getContext('2d');" +
        "origin();for(var i=0;i<Math.min(gen,64);i++)degrade();}" +
        "build();" +
        "function tick(){G.clearRect(0,0,W,H);" +
        "var s=Math.min(W/OW,H/OH)*0.86;" +
        "G.imageSmoothingEnabled=true;" +
        "G.drawImage(off,(W-OW*s)/2,(H-OH*s)/2,OW*s,OH*s);" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(){" +
        "if(gen>=64)return;gen++;M.set('copy_g',gen);degrade();});",
    ),
  },
  {
    title: "免费",
    html: play(
      stageCss("ut-free", ";touch-action:none;cursor:pointer"),
      stageBody("ut-free"),
      MEM +
        FIT +
        // 头几下极其慷慨：一按满屏都是。之后每一下都比上一下小一点点，
        // 小得你当时察觉不到。点到两百下，只剩一颗火星。
        //
        // 用掉的次数跨天记着，昨天挥霍过，今天进来就已经很吝啬了。
        // 反的是那种先撒钱、等你离不开了再慢慢收紧的东西
        "var n=M.num('free_n',0),P=[];" +
        "function burst(x,y){" +
        // 衰减是几何的：每一下只比上一下少 1.5%，所以你察觉不到自己在被收紧
        "var k=Math.pow(0.985,n);" +
        "var cnt=Math.max(1,Math.round(460*k)),sp=1.2+8.6*k;" +
        "for(var i=0;i<cnt;i++){var a=Math.random()*6.2832,v=sp*(0.35+Math.random()*0.65);" +
        "P.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v," +
        "l:1,h:(Math.random()*70+18)|0,s:1+Math.random()*1.8});}" +
        "n++;M.set('free_n',n);}" +
        "function tick(){" +
        "G.save();G.globalCompositeOperation='destination-out';G.fillStyle='rgba(0,0,0,0.075)';G.fillRect(0,0,W,H);G.restore();" +
        "for(var i=P.length-1;i>=0;i--){var p=P[i];" +
        "p.x+=p.vx;p.y+=p.vy;p.vy+=0.045;p.vx*=0.988;p.vy*=0.988;p.l-=0.0105;" +
        "if(p.l<=0||p.y>H+20){P.splice(i,1);continue;}" +
        "G.fillStyle='hsla('+p.h+',88%,'+((56+p.l*20)|0)+'%,'+(p.l*0.9).toFixed(2)+')';" +
        "G.fillRect(p.x,p.y,p.s,p.s);}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){var p=at(e);burst(p[0],p[1]);});",
    ),
  },
  {
    title: "指标",
    html: play(
      stageCss("ut-good", ";touch-action:none;cursor:ew-resize"),
      stageBody("ut-good"),
      MEM +
        FIT +
        // 一群东西在探路，走过的地方会亮起来——那是真正要做的事。
        // 底下上面那条是**考核指标**（走了多少路），下面那条是**实际覆盖**。
        //
        // 往右拖 = 加大考核权重。它们立刻学会了：原地高速转圈，路程刷满，
        // 而地图不再有新的地方亮起来。指标一到顶，事情就停了。
        // 「一项测量一旦成为目标，就不再是好的测量」
        "var N=220,A=[],w=M.num('good_w',0.05),GW=1,GH=1,COV,drag=false,lx=0;" +
        "var met=0,cov=0;" +
        "function alloc(){GW=Math.max(60,Math.round(W/12));GH=Math.max(34,Math.round(H/12));" +
        "COV=new Float32Array(GW*GH);A=[];" +
        "for(var i=0;i<N;i++)A.push({x:Math.random()*W,y:Math.random()*H," +
        "a:Math.random()*6.2832});}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,sum=0,c=0;" +
        "for(i=0;i<COV.length;i++){COV[i]*=0.9988;if(COV[i]>0.12)c++;}" +
        "cov=c/COV.length;" +
        "for(i=0;i<A.length;i++){var g=A[i];" +
        // 考核权重一高：转向变成固定的一边（圈越转越紧），随机探索被压掉，速度拉满
        "g.a+=(Math.random()-0.5)*1.5*(1-w)+w*0.34;" +
        "var sp=1.0+w*4.6;" +
        "g.x+=Math.cos(g.a)*sp;g.y+=Math.sin(g.a)*sp;" +
        "if(g.x<0)g.x+=W;else if(g.x>=W)g.x-=W;" +
        "if(g.y<0)g.y+=H;else if(g.y>=H)g.y-=H;" +
        "var q=((g.y/H*GH)|0)*GW+((g.x/W*GW)|0);" +
        "if(q>=0&&q<COV.length)COV[q]=1;" +
        "sum+=sp;}" +
        "met=Math.min(1,(sum/A.length-1.0)/4.6);" +
        "G.clearRect(0,0,W,H);" +
        "var cw=W/GW,ch=H/GH;" +
        "for(i=0;i<COV.length;i++){var v=COV[i];if(v<0.05)continue;" +
        "G.fillStyle='rgba(90,180,200,'+(v*0.30).toFixed(3)+')';" +
        "G.fillRect((i%GW)*cw,((i/GW)|0)*ch,cw,ch);}" +
        "G.fillStyle='rgba(226,238,255,0.72)';" +
        "for(i=0;i<A.length;i++)G.fillRect(A[i].x-1,A[i].y-1,2.2,2.2);" +
        "function bar(y,v,col){" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=3;" +
        "G.beginPath();G.moveTo(W*0.12,y);G.lineTo(W*0.88,y);G.stroke();" +
        "G.strokeStyle=col;G.beginPath();G.moveTo(W*0.12,y);" +
        "G.lineTo(W*0.12+W*0.76*Math.max(0,Math.min(1,v)),y);G.stroke();}" +
        "bar(H-34,met,'rgba(255,182,110,0.9)');" +
        "bar(H-18,cov,'rgba(110,214,224,0.9)');" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}drag=true;lx=at(e)[0];});" +
        "CV.addEventListener('pointermove',function(e){if(!drag)return;" +
        "var x=at(e)[0];w=Math.max(0,Math.min(1,w+(x-lx)/W*1.5));lx=x;" +
        "M.set('good_w',w.toFixed(3));});" +
        "function up(){drag=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "推送",
    html: play(
      stageCss("ut-push", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-push"),
      FIT +
        // 按住能画。画着画着会有东西滑进来挡住，得点掉它才能接着画。
        //
        // 关键在这儿：**你连续画得越久，它来得越勤**。专注本身就是被瞄准的目标。
        // 你没法让它安静，只能被它切碎。反的是「通知是为你好」
        "var pts=[],draw=false,run=0,nt=520,tim=0,card=null;" +
        "function tick(){" +
        "if(!card){tim++;" +
        // 越是不被打断，下一次打断来得越快
        "if(draw)run++;else run=Math.max(0,run-2);" +
        "var due=Math.max(90,nt-run*1.6);" +
        "if(tim>due){tim=0;card={t:0,y:-1};}}" +
        "G.clearRect(0,0,W,H);" +
        "G.lineCap='round';G.lineJoin='round';" +
        "for(var i=1;i<pts.length;i++){var a=pts[i-1],b=pts[i];" +
        "if(b.n)continue;" +
        "G.strokeStyle='hsla('+((196+i*0.22)%360|0)+',72%,64%,'+(0.30+0.5*(i/pts.length)).toFixed(2)+')';" +
        "G.lineWidth=1.2+2.6*(i/pts.length);" +
        "G.beginPath();G.moveTo(a.x,a.y);G.lineTo(b.x,b.y);G.stroke();}" +
        "if(card){card.t++;" +
        "var slide=Math.min(1,card.t/16);" +
        "var cw=Math.min(W*0.46,420),chh=Math.min(H*0.20,118);" +
        "var cx=W-cw-24,cy=-chh+(24+chh)*slide;" +
        "card.box=[cx,cy,cw,chh];" +
        "G.fillStyle='rgba(24,27,36,0.97)';" +
        "G.fillRect(cx,cy,cw,chh);" +
        "G.strokeStyle='rgba(160,180,214,0.5)';G.lineWidth=1;" +
        "G.strokeRect(cx,cy,cw,chh);" +
        // 卡片里什么内容都没有——它要的从来不是告诉你什么，是把你打断
        "G.fillStyle='rgba(150,168,196,0.30)';" +
        "G.fillRect(cx+18,cy+chh*0.34,cw*0.52,4);" +
        "G.fillRect(cx+18,cy+chh*0.54,cw*0.34,4);" +
        "G.fillStyle='rgba(120,136,164,0.5)';" +
        "G.fillRect(cx+cw-30,cy+16,12,2);G.fillRect(cx+cw-25,cy+11,2,12);}" +
        "requestAnimationFrame(tick);}tick();" +
        "function pos(e){return at(e);}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "var p=pos(e);" +
        "if(card&&card.box){var b=card.box;" +
        "if(p[0]>=b[0]&&p[0]<=b[0]+b[2]&&p[1]>=b[1]&&p[1]<=b[1]+b[3]){" +
        // 点掉它，代价是笔断了：接着画的是新的一段，接不回去
        "card=null;run=0;if(pts.length)pts[pts.length-1].n=1;return;}}" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}draw=true;" +
        "pts.push({x:p[0],y:p[1],n:1});});" +
        "CV.addEventListener('pointermove',function(e){if(!draw||card)return;" +
        "var p=pos(e);pts.push({x:p[0],y:p[1],n:0});" +
        "if(pts.length>2600)pts.shift();});" +
        "function up(){draw=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "慢化",
    html: play(
      stageCss("ut-slow", ";touch-action:none;cursor:pointer"),
      stageBody("ut-slow"),
      FIT +
        // 一个球待在坑底。点一下把它推开，它会滚回来——这叫恢复。
        // 坑在**慢慢变浅**（那条曲线一直在压平），球每次滚回来都比上一次久一点。
        //
        // 底下一排是历次恢复用的时间，越来越长。注意：球看上去一直好好的，
        // 一直在坑底，什么都没变差。真正的预兆不是"看起来不对"，是"缓得越来越慢"。
        // 等坑平了，一推就再也回不来了
        "var k=0.055,x=0,v=0,rec=[],meas=-1,tick0=0,fallen=0,ft=0;" +
        "function reset(){k=0.055;x=0;v=0;rec=[];meas=-1;fallen=0;ft=0;}" +
        "onfit=reset;reset();" +
        "function tick(){" +
        "if(!fallen){" +
        // 坑一直在变浅。这个过程本身完全看不出来，除非你去测恢复时间
        "k-=0.0000105;" +
        "if(k<=0.0006){fallen=1;ft=0;if(Math.abs(v)<0.02)v=0.02;}" +
        "v+=-k*x-0.020*v;x+=v;" +
        "if(meas>=0){meas++;if(Math.abs(x)<0.04&&Math.abs(v)<0.004){" +
        "rec.push(meas);if(rec.length>30)rec.shift();meas=-1;}" +
        "else if(meas>1800){rec.push(1800);if(rec.length>30)rec.shift();meas=-1;}}}" +
        "else{ft++;v+=0.0016*(x>0?1:-1);x+=v;if(ft>260)reset();}" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.46,sx=Math.min(W,H)*0.34,sy=Math.min(W,H)*0.30;" +
        // 势阱：U = k x² / 2。k 越小越平
        "G.strokeStyle='rgba(140,164,200,0.42)';G.lineWidth=2;G.beginPath();" +
        "for(var i=-100;i<=100;i++){var u=i/100*2.4;" +
        "var px=cx+u*sx*0.5,py=cy-(fallen?-0.02*u*u*u*u:k*u*u*0.5)*sy*7;" +
        "if(i===-100)G.moveTo(px,py);else G.lineTo(px,py);}" +
        "G.stroke();" +
        "var bx=cx+x*sx*0.5,by=cy-(fallen?-0.02*x*x*x*x:k*x*x*0.5)*sy*7;" +
        "G.fillStyle=fallen?'rgba(232,120,100,0.95)':'rgba(226,238,255,0.92)';" +
        "G.beginPath();G.arc(bx,by-7,7,0,7);G.fill();" +
        "var n=rec.length,bw=W*0.76/Math.max(8,n),x0=W*0.12;" +
        "for(i=0;i<n;i++){var hh=Math.min(1,rec[i]/900)*(H*0.20);" +
        "G.fillStyle='hsla('+((196-Math.min(1,rec[i]/900)*170)|0)+',76%,60%,0.85)';" +
        "G.fillRect(x0+i*bw,H-18-hh,Math.max(1,bw-2),hh);}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(){if(fallen)return;" +
        "x+=(Math.random()<0.5?-1:1)*0.55;meas=0;});",
    ),
  },
  {
    title: "小世界",
    html: play(
      stageCss("ut-small", ";touch-action:none;cursor:pointer"),
      stageBody("ut-small"),
      FIT +
        // 一百二十个点围成一圈，每个只跟左右各两个相邻。消息要传到对面，
        // 得一站一站走三十步。
        //
        // 点一下随机加一条弦。**只要加上几条，平均距离就断崖式地掉下来**——
        // 不需要改变任何人的邻居，也不需要谁认识更多人。
        // 底下那条是平均步数，波纹是从一个点扩散出去的实际速度
        "var N=120,ADJ=[],chords=0,avg=0,wave=0,wt=0;" +
        "function alloc(){ADJ=[];chords=0;" +
        "for(var i=0;i<N;i++)ADJ.push([]);" +
        "for(i=0;i<N;i++){link(i,(i+1)%N);link(i,(i+2)%N);}" +
        "recompute();wave=0;wt=0;}" +
        "function link(a,b){if(a===b)return;" +
        "if(ADJ[a].indexOf(b)>=0)return;ADJ[a].push(b);ADJ[b].push(a);}" +
        // 平均最短路：从若干个点各做一次 BFS 取平均。加一条弦就重算一次
        "function recompute(){var srcs=12,tot=0,cnt=0,s,i;" +
        "var dist=new Int32Array(N),q=new Int32Array(N);" +
        "for(s=0;s<N;s+=Math.max(1,(N/srcs)|0)){" +
        "for(i=0;i<N;i++)dist[i]=-1;" +
        "dist[s]=0;q[0]=s;var head=0,tail=1;" +
        "while(head<tail){var u=q[head++];" +
        "for(i=0;i<ADJ[u].length;i++){var v=ADJ[u][i];" +
        "if(dist[v]<0){dist[v]=dist[u]+1;q[tail++]=v;}}}" +
        "for(i=0;i<N;i++)if(dist[i]>0){tot+=dist[i];cnt++;}}" +
        "avg=cnt?tot/cnt:0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){wt++;if(wt>3){wt=0;wave=(wave+1)%40;}" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.46,R=Math.min(W,H*0.86)*0.38;" +
        "function px(i){return cx+Math.cos(i/N*6.2832-1.5708)*R;}" +
        "function py(i){return cy+Math.sin(i/N*6.2832-1.5708)*R;}" +
        // 从 0 号做一次 BFS，按跳数上色：波纹跑多快，一眼就看得出
        "var dist=new Int32Array(N),q=new Int32Array(N),i;" +
        "for(i=0;i<N;i++)dist[i]=-1;dist[0]=0;q[0]=0;" +
        "var head=0,tail=1;" +
        "while(head<tail){var u=q[head++];" +
        "for(i=0;i<ADJ[u].length;i++){var v=ADJ[u][i];" +
        "if(dist[v]<0){dist[v]=dist[u]+1;q[tail++]=v;}}}" +
        "G.lineWidth=1;" +
        "for(i=0;i<N;i++)for(var j=0;j<ADJ[i].length;j++){var t2=ADJ[i][j];" +
        "if(t2<i)continue;" +
        "var far=Math.min(Math.abs(t2-i),N-Math.abs(t2-i))>2;" +
        "G.strokeStyle=far?'rgba(255,180,110,0.45)':'rgba(120,150,190,0.20)';" +
        "G.beginPath();G.moveTo(px(i),py(i));G.lineTo(px(t2),py(t2));G.stroke();}" +
        "for(i=0;i<N;i++){var d=dist[i]<0?99:dist[i];" +
        "var on=(d===wave%Math.max(1,Math.round(avg*2+2)))?1:0;" +
        "G.fillStyle=on?'rgba(255,238,190,0.95)':'hsla('+((200-Math.min(d,20)*7)|0)+',66%,'+(38+(on?26:0))+'%,0.8)';" +
        "G.beginPath();G.arc(px(i),py(i),on?4.4:2.6,0,7);G.fill();}" +
        "var bx=W*0.14,bw=W*0.72,by=H-20;" +
        "G.strokeStyle='rgba(150,170,200,0.18)';G.lineWidth=3;" +
        "G.beginPath();G.moveTo(bx,by);G.lineTo(bx+bw,by);G.stroke();" +
        "G.strokeStyle='rgba(255,186,120,0.9)';" +
        "G.beginPath();G.moveTo(bx,by);" +
        "G.lineTo(bx+bw*Math.min(1,avg/32),by);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(){" +
        "if(chords>=40){alloc();return;}" +
        "link((Math.random()*N)|0,(Math.random()*N)|0);chords++;recompute();});",
    ),
  },
  {
    title: "越急越慢",
    html: play(
      stageCss("ut-panic", ";touch-action:none;cursor:ew-resize"),
      stageBody("ut-panic"),
      MEM +
        FIT +
        // 一屋子人往一个窄门挤。往右拖 = 所有人都更用力、更快。
        //
        // 然后通过率**下降**：门口拱成一道桥，谁也出不去，越挤越死。
        // 底下那条是实际通过率，不是速度。每个人都更努力，结果更差
        "var P=[],v0=M.num('panic_v',0.55),drag=false,lx=0,outn=0,hist=[],acc=0;" +
        "function reset(){P=[];" +
        "for(var i=0;i<230;i++)P.push({x:Math.random()*W*0.55+W*0.05," +
        "y:Math.random()*H*0.72+H*0.14,vx:0,vy:0});}" +
        "onfit=reset;reset();" +
        "function tick(){var i,j;" +
        "var gx=W*0.78,gy=H*0.5,gap=Math.max(14,Math.min(W,H)*0.035);" +
        "var rad=Math.max(3.2,Math.min(W,H)*0.011);" +
        "for(i=0;i<P.length;i++){var p=P[i];" +
        // 期望速度朝着门。panic 越高，期望速度越大、也越不肯绕
        "var dx=gx-p.x,dy=gy-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;" +
        "var want=0.35+v0*2.6;" +
        "p.vx+=((dx/d)*want-p.vx)*0.10;p.vy+=((dy/d)*want-p.vy)*0.10;}" +
        // 人和人之间的推挤：重叠越多推得越狠。这就是拱桥怎么形成的
        "for(i=0;i<P.length;i++)for(j=i+1;j<P.length;j++){" +
        "var a=P[i],b=P[j],ax=b.x-a.x,ay=b.y-a.y,dd=Math.sqrt(ax*ax+ay*ay);" +
        "if(dd>rad*2||dd<0.0001)continue;" +
        "var ov=(rad*2-dd)/dd*0.5*(0.55+v0*0.9);" +
        "a.x-=ax*ov;a.y-=ay*ov;b.x+=ax*ov;b.y+=ay*ov;}" +
        "for(i=P.length-1;i>=0;i--){var q=P[i];" +
        "q.x+=q.vx;q.y+=q.vy;q.vx*=0.90;q.vy*=0.90;" +
        // 墙：只有门那一段能过
        "if(q.x>gx-rad&&q.x<gx+rad){" +
        "if(Math.abs(q.y-gy)>gap*0.5){q.x=gx-rad;q.vx*=-0.2;}}" +
        "if(q.y<rad){q.y=rad;q.vy*=-0.3;}" +
        "if(q.y>H-rad){q.y=H-rad;q.vy*=-0.3;}" +
        "if(q.x<rad){q.x=rad;q.vx*=-0.3;}" +
        "if(q.x>gx+rad*3){outn++;" +
        "q.x=W*0.06+Math.random()*W*0.16;q.y=H*0.14+Math.random()*H*0.72;" +
        "q.vx=0;q.vy=0;}}" +
        "acc++;if(acc>26){hist.push(outn);outn=0;acc=0;" +
        "if(hist.length>90)hist.shift();}" +
        "G.clearRect(0,0,W,H);" +
        "G.strokeStyle='rgba(150,170,200,0.5)';G.lineWidth=3;" +
        "G.beginPath();G.moveTo(gx,0);G.lineTo(gx,gy-gap*0.5);" +
        "G.moveTo(gx,gy+gap*0.5);G.lineTo(gx,H);G.stroke();" +
        "for(i=0;i<P.length;i++){var s=P[i];" +
        "var sp=Math.sqrt(s.vx*s.vx+s.vy*s.vy);" +
        "G.fillStyle='hsla('+((200-Math.min(1,sp/2.2)*180)|0)+',72%,62%,0.9)';" +
        "G.beginPath();G.arc(s.x,s.y,rad,0,7);G.fill();}" +
        "var mxh=1;for(i=0;i<hist.length;i++)if(hist[i]>mxh)mxh=hist[i];" +
        "G.strokeStyle='rgba(120,214,224,0.9)';G.lineWidth=1.6;G.beginPath();" +
        "for(i=0;i<hist.length;i++){var x=W*0.06+i/Math.max(1,hist.length-1)*W*0.88;" +
        "var y=H-16-hist[i]/mxh*H*0.14;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}G.stroke();" +
        "var bx=W*0.06,bw=W*0.88;" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(bx,H-6);G.lineTo(bx+bw,H-6);G.stroke();" +
        "G.strokeStyle='rgba(255,176,110,0.85)';" +
        "G.beginPath();G.moveTo(bx,H-6);G.lineTo(bx+bw*v0,H-6);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}drag=true;lx=at(e)[0];});" +
        "CV.addEventListener('pointermove',function(e){if(!drag)return;" +
        "var x=at(e)[0];v0=Math.max(0,Math.min(1,v0+(x-lx)/W*1.4));lx=x;" +
        "M.set('panic_v',v0.toFixed(3));});" +
        "function up(){drag=false;}" +
        "CV.addEventListener('pointerup',up);CV.addEventListener('pointercancel',up);",
    ),
  },
  {
    title: "版本",
    html: play(
      stageCss("ut-ver", ";touch-action:none;cursor:pointer"),
      stageBody("ut-ver"),
      MEM +
        FIT +
        // 点一下 = 更新一版。每一版都更干净：线更顺、颜色更少、边角更圆。
        // 每一版也都**少一样东西**，而且少掉的那样再也回不来。
        //
        // 更新到最后，它非常克制、非常统一、非常好看，几乎什么都没有了。
        // 版本号跨天记着。反的是「新版本总是更好」
        "var v=M.num('ver_v',0),EL=[],rng=1;" +
        "function rnd(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}" +
        "function alloc(){rng=424242;EL=[];" +
        "for(var i=0;i<26;i++)EL.push({x:0.08+rnd()*0.84,y:0.10+rnd()*0.80," +
        "r:0.04+rnd()*0.10,k:(rnd()*3)|0,h:(rnd()*360)|0,a:rnd()*6.2832," +
        "n:3+((rnd()*6)|0)});}" +
        "onfit=alloc;alloc();" +
        "function tick(){" +
        "var live=Math.max(1,EL.length-v);" +
        // 越更新越"精致"：色相收拢、线宽统一、圆角变大
        "var t=Math.min(1,v/24);" +
        "G.clearRect(0,0,W,H);" +
        "var S=Math.min(W,H);" +
        "for(var i=0;i<live;i++){var e=EL[i];" +
        "var hue=e.h+(210-e.h)*t;" +
        "var sat=(64-t*44)|0,lig=(56+t*8)|0;" +
        "G.strokeStyle='hsla('+(hue|0)+','+sat+'%,'+lig+'%,'+(0.82-t*0.14).toFixed(2)+')';" +
        "G.lineWidth=1.2+t*1.4;G.lineJoin='round';G.lineCap='round';" +
        "var cx=e.x*W,cy=e.y*H,r=e.r*S;" +
        "var n=Math.max(3,Math.round(e.n+(24-e.n)*t));" +
        "G.beginPath();" +
        "for(var k=0;k<=n;k++){var a=e.a+k/n*6.2832;" +
        "var m=r*(e.k===0?1:(e.k===1?(0.7+0.3*Math.cos(a*3)):(0.6+0.4*Math.abs(Math.sin(a*2)))));" +
        "m=m*(1-t*0.10)+r*t*0.10;" +
        "var x=cx+Math.cos(a)*m,y=cy+Math.sin(a)*m;" +
        "if(k===0)G.moveTo(x,y);else G.lineTo(x,y);}" +
        "G.closePath();G.stroke();}" +
        // 底下一排是版本：亮的是已经发过的。它只会越来越长，东西只会越来越少
        "for(var j=0;j<26;j++){" +
        "G.fillStyle=j<v?'rgba(150,178,220,0.75)':'rgba(120,136,164,0.16)';" +
        "G.fillRect(W*0.5-26*4+j*8,H-14,5,4);}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(){" +
        "if(v>=25)return;v++;M.set('ver_v',v);});",
    ),
  },
  {
    title: "混合",
    html: play(
      stageCss("ut-mix", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-mix"),
      FIT +
        // 左边一种颜色，右边一种。你划过去就是在搅。
        //
        // 底下那条只会往上，从来不往下——**你反着搅也一样**。
        // 不是你手法不对：搅拌把两种颜色摊成越来越细的丝，
        // 而细到一定程度它们就再也分不开了。有些过程只有一个方向
        "var N=6000,P=[],ent=0,T=[],vort=[];" +
        "function alloc(){P=[];" +
        "for(var i=0;i<N;i++){var x=Math.random(),y=Math.random();" +
        "P.push({x:x,y:y,c:x<0.5?0:1});}" +
        "T=[];vort=[];}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,k;" +
        "for(i=0;i<P.length;i++){var p=P[i];" +
        // 底噪：分子扩散。它极小，但正是它让"搅回去"不可能
        "p.x+=(Math.random()-0.5)*0.0016;p.y+=(Math.random()-0.5)*0.0016;" +
        "for(k=0;k<vort.length;k++){var v=vort[k];" +
        "var dx=p.x-v.x,dy=p.y-v.y,d2=dx*dx+dy*dy;" +
        "if(d2<0.05&&d2>1e-7){var f=v.s*0.02/(d2+0.004);" +
        "p.x+=-dy*f;p.y+=dx*f;}}" +
        "if(p.x<0)p.x=-p.x;else if(p.x>1)p.x=2-p.x;" +
        "if(p.y<0)p.y=-p.y;else if(p.y>1)p.y=2-p.y;}" +
        "for(k=vort.length-1;k>=0;k--){vort[k].s*=0.94;" +
        "if(vort[k].s<0.02)vort.splice(k,1);}" +
        // 混合度：把画面切成小格，看每格里两色是不是一半一半
        "var GB=26,c0=new Float64Array(GB*GB),c1=new Float64Array(GB*GB);" +
        "for(i=0;i<P.length;i++){var q=((P[i].y*GB)|0)*GB+((P[i].x*GB)|0);" +
        "if(q<0||q>=GB*GB)continue;if(P[i].c)c1[q]++;else c0[q]++;}" +
        "var e=0,tot=0;" +
        "for(i=0;i<GB*GB;i++){var n=c0[i]+c1[i];if(n<3)continue;" +
        "var a=c0[i]/n;if(a>0&&a<1)e+=-(a*Math.log(a)+(1-a)*Math.log(1-a))*n;tot+=n;}" +
        "ent=tot?e/tot/Math.log(2):0;" +
        "T.push(ent);if(T.length>Math.max(80,(W*0.8)|0))T.shift();" +
        "G.clearRect(0,0,W,H);" +
        "var vh=H*0.80;" +
        "for(i=0;i<P.length;i++){" +
        "G.fillStyle=P[i].c?'rgba(240,160,96,0.72)':'rgba(96,176,240,0.72)';" +
        "G.fillRect(P[i].x*W,P[i].y*vh,1.8,1.8);}" +
        "var by=H-18,gh=H*0.15;" +
        "G.strokeStyle='rgba(150,170,200,0.18)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "if(T.length>1){G.strokeStyle='rgba(226,238,255,0.85)';G.lineWidth=1.6;" +
        "G.beginPath();" +
        "for(i=0;i<T.length;i++){var xx=i/(T.length-1)*W,yy=by-T[i]*gh;" +
        "if(i===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);" +
        "vort.push({x:p[0]/W,y:p[1]/(H*0.80),s:1});" +
        "if(vort.length>18)vort.shift();});",
    ),
  },
  {
    title: "免疫",
    html: play(
      stageCss("ut-herd", ";touch-action:none"),
      stageBody("ut-herd"),
      FIT +
        // 左右拖，定的是有多少人事先打过（暗蓝的那些）。然后从中心放一次火。
        //
        // 你会以为「打得越多、烧得越少」是条斜线。不是。
        // 它在某个位置上一刀切下去：差一点，整块烧光；过了那一点，
        // 火苗刚出去两步就自己灭了。底下那排点是历次结果，那道悬崖是它自己长出来的。
        // 这条线上没有「尽力而为」，只有过和不过
        "var NX=118,NY,S,cov=0.16,tick2=0,pts=[],burned=0,live=0,phase=0,hold=0;" +
        "function alloc(){NY=Math.max(30,Math.round(NX*(H*0.74)/W));" +
        "S=new Uint8Array(NX*NY);start();}" +
        "function start(){var i;" +
        // 0 易感 1 已打 2 正在烧 3 烧过
        "for(i=0;i<S.length;i++)S[i]=Math.random()<cov?1:0;" +
        "for(var k=0;k<3;k++){" +
        "var x=(NX/2+(Math.random()-0.5)*4)|0,y=(NY/2+(Math.random()-0.5)*4)|0;" +
        "S[y*NX+x]=2;}" +
        "burned=0;live=3;phase=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        "function step(){var nx=new Uint8Array(S),i,x,y;" +
        "live=0;" +
        "for(y=0;y<NY;y++)for(x=0;x<NX;x++){i=y*NX+x;" +
        "if(S[i]===2){nx[i]=3;burned++;" +
        "var d=[[1,0],[-1,0],[0,1],[0,-1]];" +
        "for(var q=0;q<4;q++){var a=x+d[q][0],b=y+d[q][1];" +
        "if(a<0||b<0||a>=NX||b>=NY)continue;" +
        // 每个易感邻居有 0.85 的概率被点着。cov=0 时 R0≈2.6，阈值落在 0.6 上下
        "var j=b*NX+a;if(S[j]===0&&Math.random()<0.85)nx[j]=2;}}}" +
        "S=nx;for(i=0;i<S.length;i++)if(S[i]===2)live++;}" +
        "function tick(){tick2++;" +
        "if(phase===0){if(tick2%1===0)step();" +
        "if(live===0){phase=1;" +
        "pts.push([cov,burned/(S.length*(1-cov)+1)]);" +
        "if(pts.length>90)pts.shift();}}" +
        "else{hold++;if(hold>150)start();}" +
        "G.clearRect(0,0,W,H);" +
        "var cw=W/NX,ch=(H*0.74)/NY,oy=H*0.03;" +
        "for(var y=0;y<NY;y++)for(var x=0;x<NX;x++){var v=S[y*NX+x];" +
        "if(v===0)continue;" +
        "G.fillStyle=v===1?'rgba(46,64,92,0.30)':(v===2?'rgba(255,178,84,1)':'rgba(190,74,58,0.95)');" +
        "G.fillRect(x*cw,oy+y*ch,cw+0.6,ch+0.6);}" +
        "var by=H-16,gh=H*0.19;" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "for(var p=0;p<pts.length;p++){" +
        "G.fillStyle='rgba(255,168,72,'+(0.22+0.6*p/pts.length)+')';" +
        "G.beginPath();G.arc(pts[p][0]*W,by-pts[p][1]*gh,2.6,0,7);G.fill();}" +
        "G.strokeStyle='rgba(150,180,220,0.8)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(cov*W,by+6);G.lineTo(cov*W,by-gh-4);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "function grab(e){var p=at(e);cov=Math.max(0,Math.min(0.95,p[0]/W));" +
        "if(phase===1||live===0)start();e.preventDefault();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}grab(e);});" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)grab(e);});",
    ),
  },
  {
    title: "等位",
    html: play(
      stageCss("ut-queue", ";touch-action:none"),
      stageBody("ut-queue"),
      MEM +
        FIT +
        // 你是亮的那个。前面的人一个个被叫号，你往前挪。
        //
        // 同时有人插到你前面来——**而且你等得越久，插进来的越多**：
        // 越靠前的位置越值钱，值钱的位置就有人买。
        // 第一次你多半能排到头。排到头之后队伍重开，可你的累计等待没有清零，
        // 于是第二队走得更慢，第三队你就再也到不了前面了。
        // 点一下想催：队伍确实动了一下——你往后了一格。
        // 底下那条是累计等待，你上次离开时的位置留了一道刻痕
        "var N=360,COLS=24,qn=0,me=130,acc=0,bump=0,done=0;" +
        "var waited=M.num('q.w',0),base=waited;" +
        "function alloc(){qn=0;me=130;done=0;bump=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "if(done>0){done++;if(done>200){done=0;qn++;me=Math.min(N-1,130+70*qn);}}" +
        "else if(acc%3===0){" +
        // 前面被叫走一个，你往前一格
        "me--;waited+=1;M.set('q.w',waited);" +
        // 插队的期望人数随累计等待上升：一开始不到一个，等久了超过一个
        "var lam=0.35+Math.min(2.2,waited/900);" +
        "for(var q=0;q<3;q++)if(Math.random()<lam/3)me++;" +
        "if(me<0){me=0;done=1;}if(me>N-1)me=N-1;}" +
        "if(bump>0)bump*=0.90;" +
        "G.clearRect(0,0,W,H);" +
        "var rows=Math.ceil(N/COLS);" +
        "var top=H*0.06,bh=H*0.66;" +
        "var cw=W/(COLS+1),rh=bh/rows;" +
        "for(var i=0;i<N;i++){" +
        "var r=(i/COLS)|0,c=i%COLS;" +
        "var x=cw*(c+1),y=top+r*rh+rh*0.5;" +
        "if(i===me){" +
        "G.fillStyle='rgba(255,196,120,'+(0.88+0.12*Math.sin(acc*0.11))+')';" +
        "G.beginPath();G.arc(x,y,5.6+bump*3,0,7);G.fill();" +
        "G.strokeStyle='rgba(255,196,120,0.32)';G.lineWidth=1;" +
        "G.beginPath();G.arc(x,y,11+bump*12,0,7);G.stroke();}" +
        "else{G.fillStyle=i<me?'rgba(126,148,186,0.62)':'rgba(52,62,82,0.55)';" +
        "G.beginPath();G.arc(x,y,i<me?2.6:2,0,7);G.fill();}}" +
        // 你前面还剩多少人，画成一条横杠；它越来越长
        "var ay=top+bh+H*0.07;" +
        "G.strokeStyle='rgba(126,148,186,0.16)';G.lineWidth=4;" +
        "G.beginPath();G.moveTo(W*0.08,ay);G.lineTo(W*0.92,ay);G.stroke();" +
        "G.strokeStyle='rgba(126,148,186,0.85)';" +
        "G.beginPath();G.moveTo(W*0.08,ay);" +
        "G.lineTo(W*0.08+W*0.84*(me/N),ay);G.stroke();" +
        "var by=H-20;" +
        "G.strokeStyle='rgba(255,196,120,0.14)';G.lineWidth=4;" +
        "G.beginPath();G.moveTo(W*0.08,by);G.lineTo(W*0.92,by);G.stroke();" +
        "G.strokeStyle='rgba(255,196,120,0.85)';" +
        "G.beginPath();G.moveTo(W*0.08,by);" +
        "G.lineTo(W*0.08+W*0.84*Math.min(1,waited/5000),by);G.stroke();" +
        "if(base>0){G.strokeStyle='rgba(255,196,120,0.34)';G.lineWidth=1;" +
        "var bx=W*0.08+W*0.84*Math.min(1,base/5000);" +
        "G.beginPath();G.moveTo(bx,by-9);G.lineTo(bx,by+9);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        // 催一下。队伍动了，你往后了
        "CV.addEventListener('pointerdown',function(e){" +
        "bump=1;if(!done)me=Math.min(N-1,me+1);e.preventDefault();});",
    ),
  },
  {
    title: "投放",
    html: play(
      stageCss("ut-slot", ";touch-action:none"),
      stageBody("ut-slot"),
      MEM +
        FIT +
        // 上面那片是内容，下面那条黑的不是。
        // 往下拖可以把它推回去——推得动，它确实缩了。
        //
        // 然后它长回来，比刚才多占一点。你推得越勤，它回得越大。
        // 而且它记着：你关掉这一页，明天再来，它从你上次留下的地方接着长
        "var want=M.num('slot.w',0.14),cur=want,P=[],acc=0;" +
        "function alloc(){P=[];for(var i=0;i<140;i++)" +
        "P.push([Math.random()*W,Math.random()*H,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5]);}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        // 每一帧都往 want 靠。want 只会因为你的推挤而变大
        "cur+=(want-cur)*0.05;" +
        "if(cur>0.86)cur=0.86;" +
        "var top=H*(1-cur);" +
        "G.clearRect(0,0,W,H);" +
        "for(var i=0;i<P.length;i++){var p=P[i];" +
        "p[0]+=p[2];p[1]+=p[3];" +
        "if(p[0]<0)p[0]+=W;if(p[0]>W)p[0]-=W;" +
        "if(p[1]<0)p[1]+=top;if(p[1]>top)p[1]-=top;" +
        "var d=1;" +
        "for(var j=i+1;j<P.length;j++){var q=P[j];" +
        "var dx=q[0]-p[0],dy=q[1]-p[1];" +
        "if(dx*dx+dy*dy<3600){" +
        "G.strokeStyle=INK(0.10);G.lineWidth=1;" +
        "G.beginPath();G.moveTo(p[0],p[1]);G.lineTo(q[0],q[1]);G.stroke();}}" +
        "G.fillStyle=INK(0.5);G.beginPath();G.arc(p[0],p[1],1.5*d,0,7);G.fill();}" +
        "G.fillStyle='#07080b';G.fillRect(0,top,W,H-top+1);" +
        "var g2=G.createLinearGradient(0,top,0,H);" +
        "g2.addColorStop(0,'rgba(28,34,48,0.98)');" +
        "g2.addColorStop(1,'rgba(16,20,30,0.98)');" +
        "G.fillStyle=g2;G.fillRect(0,top,W,H-top);" +
        "G.strokeStyle='rgba(150,180,220,0.28)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,top+0.5);G.lineTo(W,top+0.5);G.stroke();" +
        "G.fillStyle='rgba(150,180,220,0.20)';" +
        "var hh=W*0.06;" +
        "G.fillRect(W/2-hh/2,top+5,hh,2.5);" +
        // 板子里放几条永远在滑的横杠，滑动本身就是它的目的
        "var rows=Math.max(1,Math.floor((H-top-16)/22));" +
        "for(var r=0;r<rows;r++){" +
        "var y=top+18+r*22;" +
        "var ph=(acc*0.9+r*70)%(W+260)-260;" +
        "G.fillStyle='rgba(90,110,145,0.20)';" +
        "G.fillRect(W*0.08,y,W*0.84,7);" +
        "G.fillStyle='rgba(150,180,220,0.34)';" +
        "G.fillRect(Math.max(W*0.08,ph),y,Math.min(200,W*0.84),7);}" +
        "requestAnimationFrame(tick);}tick();" +
        "function push(e){var p=at(e);" +
        "var n=Math.max(0.04,Math.min(0.86,1-p[1]/H));" +
        "if(n<cur){cur=n;" +
        // 你把它推回去多少，它就在目标上加回去 1.35 倍
        "want=Math.min(0.86,cur+(want-cur)*0.35+ (want-n)*1.35+0.02);" +
        "M.set('slot.w',want);}" +
        "e.preventDefault();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}push(e);});" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)push(e);});",
    ),
  },
  {
    title: "停下",
    html: play(
      stageCss("ut-stop", ";touch-action:none"),
      stageBody("ut-stop"),
      MEM +
        FIT +
        // 一个个数往前走，高低随机。你只能喊停一次，
        // 而且**过去的拿不回来，将来的看不见**。喊停就拿当下这个。
        //
        // 停下之后，剩下没露过面的会一起亮出来，你会看见自己错过了什么。
        // 底下两条：上面是你，下面是"先看前三分之一、之后遇到更好的就停"。
        // 玩上二十把你会发现，那条笨规则赢你——
        // 它不是更聪明，它只是不指望自己能挑中最好的那个
        "var N=40,V=[],idx=0,acc=0,picked=-1,phase=0,reveal=0;" +
        "var win=M.num('st.w',0),tot=M.num('st.t',0);" +
        "var rwin=M.num('st.rw',0);" +
        "function alloc(){V=[];for(var i=0;i<N;i++)V.push(Math.random());" +
        "idx=0;acc=0;picked=-1;phase=0;reveal=0;}" +
        "onfit=alloc;alloc();" +
        "function best(){var b=0;for(var i=0;i<N;i++)if(V[i]>V[b])b=i;return b;}" +
        // 三分之一法则：前 14 个只看不拿，之后遇到比它们都好的就停
        "function rule(){var m=0,k=Math.round(N/Math.E);" +
        "for(var i=0;i<k;i++)if(V[i]>m)m=V[i];" +
        "for(i=k;i<N;i++)if(V[i]>m)return i;return N-1;}" +
        "function settle(){phase=1;" +
        "tot++;if(picked===best())win++;" +
        "if(rule()===best())rwin++;" +
        "M.set('st.w',win);M.set('st.t',tot);M.set('st.rw',rwin);}" +
        "function tick(){" +
        "if(phase===0){acc++;if(acc>16){acc=0;idx++;" +
        "if(idx>=N){idx=N-1;picked=N-1;settle();}}}" +
        "else{reveal=Math.min(1,reveal+0.02);" +
        "acc++;if(acc>200)alloc();}" +
        "G.clearRect(0,0,W,H);" +
        "var top=H*0.10,bh=H*0.52,cw=W*0.86/N,ox=W*0.07;" +
        "for(var i=0;i<N;i++){" +
        "var x=ox+cw*(i+0.5),h=bh*V[i];" +
        "var seen=i<=idx;" +
        "if(!seen&&reveal<0.01)continue;" +
        "var a=seen?0.9:reveal*0.34;" +
        "var col=(i===picked)?'rgba(255,196,120,'+a+')':" +
        "((phase&&i===best())?'rgba(140,220,170,'+Math.max(a,reveal*0.9)+')':'rgba(120,148,190,'+a+')');" +
        "G.fillStyle=col;" +
        "G.fillRect(x-cw*0.34,top+bh-h,cw*0.68,h);}" +
        "if(phase===0){G.strokeStyle='rgba(255,196,120,0.55)';G.lineWidth=1.5;" +
        "var xx=ox+cw*(idx+1);" +
        "G.beginPath();G.moveTo(xx,top-6);G.lineTo(xx,top+bh+6);G.stroke();}" +
        // 两条命中率：你，和那条笨规则
        "function bar(y,v,n,col){G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=5;" +
        "G.beginPath();G.moveTo(W*0.07,y);G.lineTo(W*0.93,y);G.stroke();" +
        "if(n<1)return;G.strokeStyle=col;G.beginPath();G.moveTo(W*0.07,y);" +
        "G.lineTo(W*0.07+W*0.86*(v/n),y);G.stroke();}" +
        "bar(H-42,win,tot,'rgba(255,196,120,0.9)');" +
        "bar(H-20,rwin,tot,'rgba(140,220,170,0.9)');" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(phase===0){picked=idx;settle();}e.preventDefault();});",
    ),
  },
  {
    title: "观察",
    html: play(
      stageCss("ut-observe", ";touch-action:none"),
      stageBody("ut-observe"),
      FIT +
        // 底下有一张图。你摸哪儿，哪儿就露出来一小块——
        // 同时那一小块周围会被搅乱，而且永远搅乱了。
        //
        // 你想把整张图看全，就得处处都摸；处处都摸完，
        // 图也就没了。你手上最后会有一张完整的记录，记的是你自己的手
        "var NX=150,NY,F,K,acc=0;" +
        "function alloc(){NY=Math.max(40,Math.round(NX*H/W));" +
        "F=new Float32Array(NX*NY);K=new Float32Array(NX*NY);" +
        "for(var y=0;y<NY;y++)for(var x=0;x<NX;x++){" +
        "var u=x/NX*7,v=y/NY*7;" +
        "F[y*NX+x]=0.5+0.5*Math.sin(u*1.7+Math.cos(v*1.3)*2.2)*Math.cos(v*1.9-Math.sin(u*0.9)*1.7);}" +
        "acc=0;}" +
        "onfit=alloc;alloc();" +
        "function probe(px,py){" +
        "var cx=Math.round(px/W*NX),cy=Math.round(py/H*NY);" +
        "for(var y=cy-14;y<=cy+14;y++)for(var x=cx-14;x<=cx+14;x++){" +
        "if(x<0||y<0||x>=NX||y>=NY)continue;" +
        "var d=Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));" +
        "var i=y*NX+x;" +
        // 中心露出来
        "if(d<5.5){K[i]=Math.min(1,K[i]+0.55*(1-d/5.5));}" +
        // 外圈被搅乱，且不可逆
        "if(d>=3&&d<14){var w=(1-Math.abs(d-8)/6);" +
        "if(w>0)F[i]+=(Math.random()-0.5)*0.85*w;" +
        "if(F[i]<0)F[i]=0;if(F[i]>1)F[i]=1;}}}" +
        "function tick(){acc++;" +
        "G.clearRect(0,0,W,H);" +
        "var cw=W/NX,ch=H/NY;" +
        "for(var y=0;y<NY;y++)for(var x=0;x<NX;x++){var i=y*NX+x;" +
        "var k=K[i];if(k<0.02)continue;" +
        "var g=F[i];" +
        "G.fillStyle='rgba('+((60+g*180)|0)+','+((88+g*150)|0)+','+((130+g*110)|0)+','+Math.min(0.95,k)+')';" +
        "G.fillRect(x*cw,y*ch,cw+0.8,ch+0.8);}" +
        "requestAnimationFrame(tick);}tick();" +
        "function go(e){var p=at(e);probe(p[0],p[1]);e.preventDefault();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}go(e);});" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)go(e);});",
    ),
  },
  {
    title: "审核",
    html: play(
      stageCss("ut-redact", ";touch-action:none"),
      stageBody("ut-redact"),
      FIT +
        // 一整幅东西。点一下，就按当下这条尺子删掉一批——
        // 每一批都是**这一条**尺子量出来该删的，每一次都说得通。
        //
        // 尺子每过一次就收紧一点。你可以一直点下去。
        // 到最后剩下的是一块干干净净的空白，
        // 而没有任何一步是不讲道理的
        "var N=1500,P=[],thr=1.0,steps=0,acc=0;" +
        "function alloc(){P=[];" +
        "for(var i=0;i<N;i++){" +
        "var a=Math.random()*6.2832,r=Math.pow(Math.random(),0.55);" +
        "P.push({a:a,r:r,s:Math.random(),cut:0,t:0});}" +
        "thr=1.0;steps=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        "function pass(){steps++;" +
        // 尺子每过一次收紧一点。收紧的理由从来都是充分的
        "thr*=0.82;" +
        "for(var i=0;i<N;i++){var p=P[i];" +
        "if(!p.cut&&p.s>thr)p.cut=1;}}" +
        "function tick(){acc++;" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.46,R=Math.min(W*0.44,H*0.40);" +
        "var alive=0;" +
        "for(var i=0;i<N;i++){var p=P[i];" +
        "if(p.cut&&p.t<1)p.t=Math.min(1,p.t+0.045);" +
        "if(p.t>=1)continue;" +
        "if(!p.cut)alive++;" +
        "var x=cx+Math.cos(p.a)*p.r*R,y=cy+Math.sin(p.a)*p.r*R*0.92;" +
        "var f=1-p.t;" +
        "G.fillStyle='hsla('+((196+p.s*120)|0)+',68%,'+((46+p.s*20)|0)+'%,'+(0.85*f)+')';" +
        "G.beginPath();G.arc(x,y,(1.4+p.s*2.6)*f,0,7);G.fill();}" +
        // 底下那条是还剩多少，只会短不会长
        "var by=H-20;" +
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=5;" +
        "G.beginPath();G.moveTo(W*0.08,by);G.lineTo(W*0.92,by);G.stroke();" +
        "G.strokeStyle='rgba(150,180,220,0.85)';" +
        "G.beginPath();G.moveTo(W*0.08,by);" +
        "G.lineTo(W*0.08+W*0.84*(alive/N),by);G.stroke();" +
        "if(alive===0){acc++;if(acc>260)alloc();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){pass();e.preventDefault();});",
    ),
  },
  {
    title: "默认值",
    html: play(
      stageCss("ut-default", ";touch-action:none"),
      stageBody("ut-default"),
      MEM +
        FIT +
        // 六百个人，一个二选一。**只有很少的人真的去选**（外面有白圈的那些），
        // 其余的照默认走。点一下，翻转默认。
        //
        // 上面那条是结果，会跟着翻过去；下面那条是这些人自己怎么想的，
        // 一次都没变过。到这儿为止，这只是一张说明预设格子有多好用的图——
        // 谁都能截下来拿去用。
        //
        // 所以再加一件事：**每翻一次，就有一批白圈永远消失**。
        // 用这根杠杆是要花掉东西的，花掉的正好是唯一能不听它的那部分人。
        // 翻到最后一个白圈也没有了，结果就等于默认，一分不差。
        // 那时候你还能接着翻，只是已经没有任何东西在被说服了。
        // 关掉页面再回来，白圈不会长回来
        "var N=600,PREF=[],ACT=[],OUT=[],def=0,acc=0,tw=0;" +
        "var burn=M.num('def.burn',0);" +
        "function alloc(){PREF=[];ACT=[];OUT=[];" +
        // 认真想的话，六成多的人偏好第二个
        "for(var i=0;i<N;i++){PREF.push(Math.random()<0.63?1:0);" +
        // 只有 8% 会真的去动那一格；已经被花掉的那些不再算数
        "ACT.push(Math.random()<0.08?1:0);}" +
        "var left=[],k;" +
        "for(k=0;k<N;k++)if(ACT[k])left.push(k);" +
        "for(k=0;k<burn&&left.length;k++){" +
        "var j=(Math.random()*left.length)|0;ACT[left[j]]=0;left.splice(j,1);}" +
        "for(k=0;k<N;k++)OUT.push(ACT[k]?PREF[k]:def);" +
        "acc=0;tw=0;}" +
        "onfit=alloc;alloc();" +
        "function settle(){for(var i=0;i<N;i++)OUT[i]=ACT[i]?PREF[i]:def;}" +
        // 翻一次，烧掉还剩的自己拿主意的人里的一批
        "function flip(){def=1-def;" +
        "var left=[],i;" +
        "for(i=0;i<N;i++)if(ACT[i])left.push(i);" +
        "var q=Math.ceil(left.length*0.22);" +
        "for(i=0;i<q;i++){var j=(Math.random()*left.length)|0;" +
        "ACT[left[j]]=0;left.splice(j,1);burn++;}" +
        "M.set('def.burn',burn);settle();}" +
        "function tick(){acc++;if(tw>0)tw*=0.92;" +
        "G.clearRect(0,0,W,H);" +
        "var cols=30,rows=Math.ceil(N/cols);" +
        "var top=H*0.06,bh=H*0.62;" +
        "var cw=W*0.88/cols,rh=bh/rows,ox=W*0.06;" +
        "var so=0,sp=0,sa=0,i;" +
        "for(i=0;i<N;i++){so+=OUT[i];sp+=PREF[i];sa+=ACT[i];}" +
        "for(i=0;i<N;i++){" +
        "var c=i%cols,r=(i/cols)|0;" +
        "var x=ox+cw*(c+0.5),y=top+rh*(r+0.5);" +
        "var R=Math.min(cw,rh)*0.34;" +
        "G.fillStyle=OUT[i]?'rgba(120,170,230,0.88)':'rgba(224,140,84,0.88)';" +
        "G.beginPath();G.arc(x,y,R,0,7);G.fill();" +
        // 白圈 = 还会自己拿主意的人。只会越来越少
        "if(ACT[i]){G.strokeStyle='rgba(236,240,250,0.85)';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(x,y,R+2.6,0,7);G.stroke();}}" +
        "function bar(y,v,col){G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=7;" +
        "G.beginPath();G.moveTo(W*0.06,y);G.lineTo(W*0.94,y);G.stroke();" +
        "G.strokeStyle=col;G.beginPath();G.moveTo(W*0.06,y);" +
        "G.lineTo(W*0.06+W*0.88*v,y);G.stroke();}" +
        "bar(H-64,so/N,'rgba(120,170,230,0.92)');" +
        "bar(H-38,sp/N,'rgba(236,240,250,0.55)');" +
        // 第三条：还剩多少人会自己拿主意。它只会短下去
        "bar(H-14,sa/N/0.08,'rgba(236,240,250,0.85)');" +
        "if(tw>0.01){G.strokeStyle='rgba(236,240,250,'+(tw*0.5)+')';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(0,H-51);G.lineTo(W,H-51);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "tw=1;flip();e.preventDefault();});",
    ),
  },
  {
    title: "协调",
    html: play(
      stageCss("ut-stag", ";touch-action:none"),
      stageBody("ut-stag"),
      FIT +
        // 所有人都在做暗的那个。亮的那个对每个人都更好，大家也都知道。
        // 但一个人跑过去是要吃亏的——你只有跟周围一致才拿得到东西。
        //
        // 点一下只落一格，撑不到下一轮就被吞回去。两格挨着也一样。
        // 涂成两格见方，它站得住了——但一个人也带不动，就那么四格待着。
        // 涂到六格，它才开始自己往外铺，然后收掉整张。
        // 更好的那个一直在那儿，谁都看得见——缺的不是知道，是**同时**
        "var NX=46,NY,S,acc=0,hold=0;" +
        "function alloc(){NY=Math.max(24,Math.round(NX*(H*0.94)/W));" +
        "S=new Uint8Array(NX*NY);hold=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        // 跟人一致才有的拿：一起做暗的得 2，一起做亮的得 5，不一致得 0。
        // 所以周围亮的超过 2/7 才划得来跑过去
        "function step(){var nx=new Uint8Array(S),x,y;" +
        "for(y=0;y<NY;y++)for(x=0;x<NX;x++){var s=0,c=0;" +
        "for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){" +
        "if(!dx&&!dy)continue;var a=x+dx,b=y+dy;" +
        "if(a<0||b<0||a>=NX||b>=NY)continue;s+=S[b*NX+a];c++;}" +
        "var q=s/c;" +
        "nx[y*NX+x]=(5*q>2*(1-q))?1:0;}" +
        "S=nx;}" +
        "function tick(){acc++;if(acc>14){acc=0;step();}" +
        "G.clearRect(0,0,W,H);" +
        "var cw=W/NX,ch=(H*0.94)/NY,oy=H*0.03,n=0;" +
        "for(var y=0;y<NY;y++)for(var x=0;x<NX;x++){var v=S[y*NX+x];n+=v;" +
        "G.fillStyle=v?'rgba(150,205,255,0.92)':'rgba(26,32,44,0.95)';" +
        "G.fillRect(x*cw+0.6,oy+y*ch+0.6,cw-1.2,ch-1.2);}" +
        "if(n>NX*NY*0.985){hold++;if(hold>300)alloc();}" +
        "requestAnimationFrame(tick);}tick();" +
        // 一下点不出临界规模，得挨着多点几下
        "function paint(e){var p=at(e);" +
        "var cx=Math.round(p[0]/W*NX),cy=Math.round((p[1]-H*0.03)/(H*0.94)*NY);" +
        "if(cx>=0&&cy>=0&&cx<NX&&cy<NY)S[cy*NX+cx]=1;" +
        "e.preventDefault();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}paint(e);});" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)paint(e);});",
    ),
  },
  {
    title: "遗忘",
    html: play(
      stageCss("ut-forget", ";touch-action:none"),
      stageBody("ut-forget"),
      FIT +
        // 每个亮点是一件你记得的事。不去碰它，它会慢慢淡掉，然后没了。
        // 摸一下就想起来了，它重新变亮——
        //
        // 但每想起一次，它就挪一点。淡的小圈是它原来在的地方。
        // 你能留下的只有反复想起的那几件，而它们恰恰是被你改得最多的。
        // 剩下的没有被改动过，它们只是不在了
        "var N=240,P=[],acc=0;" +
        "function alloc(){P=[];" +
        "for(var i=0;i<N;i++){var x=Math.random(),y=Math.random();" +
        "P.push({x:x,y:y,ox:x,oy:y,v:0.35+Math.random()*0.5,n:0,h:Math.random()});}" +
        "acc=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "var alive=0,i;" +
        "for(i=0;i<N;i++){var p=P[i];" +
        // 不碰就淡。淡到零就真的没了
        "if(p.v>0){p.v-=0.00075;if(p.v<0)p.v=0;}" +
        "if(p.v>0.02)alive++;}" +
        "if(alive<8){acc++;if(acc>320)alloc();}" +
        "G.clearRect(0,0,W,H);" +
        "for(i=0;i<N;i++){var p=P[i];" +
        "if(p.v<=0.02&&p.n===0)continue;" +
        // 想起过的，原来的位置留一个淡圈
        "if(p.n>0){G.strokeStyle='rgba(140,160,200,0.22)';G.lineWidth=1;" +
        "G.beginPath();G.arc(p.ox*W,p.oy*H,3.6,0,7);G.stroke();" +
        "if(p.v>0.02){G.strokeStyle='rgba(140,160,200,0.13)';" +
        "G.beginPath();G.moveTo(p.ox*W,p.oy*H);G.lineTo(p.x*W,p.y*H);G.stroke();}}" +
        "if(p.v<=0.02)continue;" +
        "var r=2.2+p.v*6.5;" +
        "G.fillStyle='hsla('+((196+p.h*60)|0)+',72%,'+((44+p.v*26)|0)+'%,'+Math.min(0.95,p.v*1.25)+')';" +
        "G.beginPath();G.arc(p.x*W,p.y*H,r,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();" +
        "function touch(e){var q=at(e);" +
        "for(var i=0;i<N;i++){var p=P[i];if(p.v<=0.02)continue;" +
        "var dx=p.x*W-q[0],dy=p.y*H-q[1];" +
        "if(dx*dx+dy*dy>2600)continue;" +
        // 想起来了：更牢，也更不是原来那件
        "p.v=Math.min(1,p.v+0.42);p.n++;" +
        "p.x+=(Math.random()-0.5)*0.045;p.y+=(Math.random()-0.5)*0.045;" +
        "p.h+=(Math.random()-0.5)*0.06;" +
        "if(p.x<0.01)p.x=0.01;if(p.x>0.99)p.x=0.99;" +
        "if(p.y<0.01)p.y=0.01;if(p.y>0.99)p.y=0.99;}" +
        "e.preventDefault();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}touch(e);});" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)touch(e);});",
    ),
  },
  {
    title: "代价",
    html: play(
      stageCss("ut-external", ";touch-action:none"),
      stageBody("ut-external"),
      FIT +
        // 上面那片是你的地方，摸哪儿哪儿就开出来，好看、立刻、确实是你的。
        // 底下那条窄的不是你的地方，你不用去那儿。
        //
        // 每开一朵，那条窄的就暗一格。两条数：上面是你拿到的，
        // 下面是加起来还剩多少。你越干得好，下面那条掉得越快。
        // 没有一步是偷来的，账也一直摆在那儿——只是不在你手边
        "var N=340,P=[],got=0,dmg=0,acc=0;" +
        "function alloc(){P=[];" +
        "for(var i=0;i<N;i++)P.push({x:Math.random(),y:Math.random(),v:0,h:Math.random()});" +
        "got=0;dmg=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "var mine=H*0.62,gap=H*0.06;" +
        "G.clearRect(0,0,W,H);" +
        "var i;" +
        "for(i=0;i<N;i++){var p=P[i];if(p.v<=0)continue;" +
        "p.v=Math.min(1,p.v+0.05);" +
        "var r=2+p.v*9;" +
        "G.fillStyle='hsla('+((92+p.h*70)|0)+',66%,'+((40+p.v*24)|0)+'%,'+(0.85*p.v)+')';" +
        "G.beginPath();G.arc(p.x*W,H*0.04+p.y*(mine-H*0.04),r,0,7);G.fill();}" +
        // 底下那条窄带：每开一朵就暗一格
        "var sy=mine+gap,sh=H*0.14;" +
        "var cols=54,cw=W/cols;" +
        "for(i=0;i<cols;i++){" +
        "var d=Math.max(0,Math.min(1,(dmg-i*(N/cols))/(N/cols)));" +
        "G.fillStyle='rgba('+((44-d*30)|0)+','+((54-d*40)|0)+','+((72-d*54)|0)+',1)';" +
        "G.fillRect(i*cw,sy,cw+0.6,sh);}" +
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,sy-0.5);G.lineTo(W,sy-0.5);G.stroke();" +
        "function bar(y,v,col){G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.06,y);G.lineTo(W*0.94,y);G.stroke();" +
        "G.strokeStyle=col;G.beginPath();G.moveTo(W*0.06,y);" +
        "G.lineTo(W*0.06+W*0.88*Math.max(0,Math.min(1,v)),y);G.stroke();}" +
        "bar(H-42,got/N,'rgba(150,220,140,0.92)');" +
        // 合起来还剩多少：你拿到的减去那条带子上的损失，而后者更重
        "bar(H-18,1-(dmg*1.6)/N,'rgba(226,124,88,0.92)');" +
        "if(got>=N-2){acc++;if(acc>300)alloc();}" +
        "requestAnimationFrame(tick);}tick();" +
        "function reap(e){var q=at(e);var mine=H*0.62;" +
        "if(q[1]>mine)return;" +
        "for(var i=0;i<N;i++){var p=P[i];if(p.v>0)continue;" +
        "var dx=p.x*W-q[0],dy=(H*0.04+p.y*(mine-H*0.04))-q[1];" +
        "if(dx*dx+dy*dy>2200)continue;" +
        "p.v=0.05;got++;dmg++;}" +
        "e.preventDefault();}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}reap(e);});" +
        "CV.addEventListener('pointermove',function(e){if(e.buttons)reap(e);});",
    ),
  },
];
