/**
 * 二、自己在长的。
 *
 * 打开即动，放着不管也一直有东西可看。碰它会有反应（往图谱里画一笔、给黏菌放
 * 一块食物、把撒谎的钟拨准），但那是加分项不是前提。
 *
 * 门槛是**不重样**：循环播放的花纹一律不留，留下的都是解出来的——流体、
 * 反应扩散、自组织，它们下一秒长什么样谁也算不出来。
 *
 * 作用域约定见 `../seed-embeds.ts` 顶部。
 */
import { FIT, MEM, play, stageBody, stageCss } from "./shell.js";

import type { SeedEmbed } from "./shell.js";

export const AUTO_EMBEDS: SeedEmbed[] = [
  {
    title: "时钟在撒谎",
    html: play(
      ".useless-thing .ut-lie{display:block;margin:0 auto}",
      "<div class='ut'><canvas class='ut-lie' width='200' height='200'></canvas></div>",
      "var c=R.querySelector('.ut-lie'),x=c.getContext('2d');" +
        "var n=new Date(),s=n.getFullYear()*10000+(n.getMonth()+1)*100+n.getDate()+n.getHours();" +
        "s=(s*1103515245+12345)%2147483648;var lie=2+(s%14);" +
        "function hand(a,len,w){x.beginPath();x.lineWidth=w;x.strokeStyle='#555';" +
        "x.moveTo(100,100);x.lineTo(100+Math.sin(a)*len,100-Math.cos(a)*len);x.stroke();}" +
        "function tick(){var d=new Date();x.clearRect(0,0,200,200);" +
        "x.strokeStyle='rgba(128,128,128,.35)';x.lineWidth=1;x.beginPath();x.arc(100,100,88,0,7);x.stroke();" +
        "for(var i=0;i<12;i++){var a=i*Math.PI/6;x.beginPath();" +
        "x.moveTo(100+Math.sin(a)*80,100-Math.cos(a)*80);" +
        "x.lineTo(100+Math.sin(a)*86,100-Math.cos(a)*86);x.stroke();}" +
        "var m=d.getMinutes()+lie+d.getSeconds()/60,h=d.getHours()%12+m/60;" +
        "hand(h*Math.PI/6,48,3);hand(m*Math.PI/30,74,1.5);" +
        "hand(d.getSeconds()*Math.PI/30,80,1);requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "图谱",
    html: play(
      stageCss("ut-flick", ";touch-action:none;cursor:crosshair;background:#04060c"),
      stageBody("ut-flick"),
      FIT +
        // Gray-Scott 反应扩散：两种化学物质，一种被另一种吃掉又自我催化。
        // 就这两行方程，长出来的东西会自己分裂、结痂、爬、织成迷宫
        "var GW=300,GH=169,N=GW*GH;" +
        "var A=new Float32Array(N),B=new Float32Array(N);" +
        "var A2=new Float32Array(N),B2=new Float32Array(N);" +
        "var F=new Float32Array(N),K=new Float32Array(N);" +
        // f 沿横向变、k 沿纵向变：一屏上同时养着斑点、迷宫、珊瑚、正在分裂的细胞。
        // 同一组方程，换个参数就是另一个物种——这一片是它们的标本图
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){var q=y*GW+x;" +
        "F[q]=0.026+(x/GW)*0.024;K[q]=0.054+(y/GH)*0.009;}" +
        "function clear(){for(var i=0;i<N;i++){A[i]=1;B[i]=0;}}" +
        "function seed(cx,cy,r,soft){for(var b=-r;b<=r;b++)for(var a=-r;a<=r;a++){" +
        "if(a*a+b*b>r*r)continue;var px=(cx+a)|0,py=(cy+b)|0;" +
        "if(px<2||py<2||px>=GW-2||py>=GH-2)continue;" +
        "if(soft&&Math.random()>0.65)continue;" +
        "var q=py*GW+px;B[q]=1;A[q]=0.2;}}" +
        "clear();" +
        "for(var s=0;s<22;s++)seed(10+Math.random()*(GW-20),10+Math.random()*(GH-20),3,0);" +
        "function step(){var x,y,q,a,b,la,lb,r;" +
        "for(y=1;y<GH-1;y++){for(x=1;x<GW-1;x++){q=y*GW+x;a=A[q];b=B[q];" +
        // 九点拉普拉斯：只用上下左右的话，长出来的东西带十字形的棱角
        "la=(A[q-1]+A[q+1]+A[q-GW]+A[q+GW])*0.2+" +
        "(A[q-GW-1]+A[q-GW+1]+A[q+GW-1]+A[q+GW+1])*0.05-a;" +
        "lb=(B[q-1]+B[q+1]+B[q-GW]+B[q+GW])*0.2+" +
        "(B[q-GW-1]+B[q-GW+1]+B[q+GW-1]+B[q+GW+1])*0.05-b;" +
        "r=a*b*b;" +
        "A2[q]=a+la-r+F[q]*(1-a);" +
        "B2[q]=b+0.5*lb+r-(K[q]+F[q])*b;}}" +
        "var t=A;A=A2;A2=t;t=B;B=B2;B2=t;" +
        "for(x=0;x<GW;x++){A[x]=A[x+GW];B[x]=B[x+GW];" +
        "A[(GH-1)*GW+x]=A[(GH-2)*GW+x];B[(GH-1)*GW+x]=B[(GH-2)*GW+x];}" +
        "for(y=0;y<GH;y++){A[y*GW]=A[y*GW+1];B[y*GW]=B[y*GW+1];" +
        "A[y*GW+GW-1]=A[y*GW+GW-2];B[y*GW+GW-1]=B[y*GW+GW-2];}}" +
        "var off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "var og=off.getContext('2d'),im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var i=0;i<N;i++)d[i*4+3]=255;" +
        "function draw(){var i,v,t2,r2,g2,b2;" +
        "for(i=0;i<N;i++){v=B[i];t2=v*3.0;if(t2>1)t2=1;" +
        // 深靛 → 青 → 暖白。膜的边缘最亮，所以结构自己就描出来了
        "if(t2<0.55){var u=t2/0.55;r2=6+u*24;g2=10+u*116;b2=22+u*132;}" +
        "else{var w2=(t2-0.55)/0.45;r2=30+w2*212;g2=126+w2*114;b2=154+w2*48;}" +
        "var o=i*4;d[o]=r2;d[o+1]=g2;d[o+2]=b2;}" +
        "og.putImageData(im,0,0);G.clearRect(0,0,W,H);" +
        "G.imageSmoothingEnabled=true;G.drawImage(off,0,0,W,H);}" +
        // 反应扩散走得慢，一帧多推几步才看得出在长
        "function tick(){for(var s2=0;s2<5;s2++)step();draw();" +
        "requestAnimationFrame(tick);}tick();" +
        // 你能往里画。画下去的那一撮会顺着当地的参数长成当地的样子
        "var down=false;" +
        "function paint(e){var p=at(e);" +
        "seed(p[0]/W*GW,p[1]/H*GH,4,1);}" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}down=true;paint(e);});" +
        "CV.addEventListener('pointermove',function(e){if(down)paint(e);});" +
        "CV.addEventListener('pointerup',function(){down=false;});" +
        "CV.addEventListener('pointercancel',function(){down=false;});",
    ),
  },
  {
    title: "黏菌",
    html: play(
      stageCss("ut-cloud", ";touch-action:none;cursor:crosshair;background:#04070e"),
      stageBody("ut-cloud"),
      FIT +
        // 黏菌：两万多个个体，每个只会三件事——往前看三个方向、朝信息素浓的那边
        // 拐一点、边走边留下信息素。它确实会连出一张漂亮的网。
        //
        // 但食物每隔一阵就换地方。于是那张被夸成"最优"的网瞬间全废，得从头长。
        // 最优解不是一个东西，是当时那几个食物点的影子——**越是把冗余裁干净，
        // 条件一变就死得越透**。这一条不是在展示涌现，是在拆它的台
        "var TW=1,TH=1,T,T2,AG,NA=0,off,og,im;" +
        "function alloc(){TW=Math.max(180,Math.min(420,Math.round(W/3.3)));" +
        "TH=Math.max(100,Math.round(TW*H/W));" +
        "T=new Float32Array(TW*TH);T2=new Float32Array(TW*TH);" +
        "NA=Math.min(20000,Math.round(TW*TH*0.17));AG=new Float32Array(NA*3);" +
        "for(var i=0;i<NA;i++){AG[i*3]=Math.random()*TW;AG[i*3+1]=Math.random()*TH;" +
        "AG[i*3+2]=Math.random()*6.2832;}" +
        "off=document.createElement('canvas');off.width=TW;off.height=TH;" +
        "og=off.getContext('2d');im=og.createImageData(TW,TH);" +
        "var d0=im.data;for(var j=0;j<TW*TH;j++)d0[j*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var SA=0.42,SD=5,RA=0.62;" +
        "function sniff(x,y,a){var sx=(x+Math.cos(a)*SD)|0,sy=(y+Math.sin(a)*SD)|0;" +
        "if(sx<0)sx+=TW;else if(sx>=TW)sx-=TW;" +
        "if(sy<0)sy+=TH;else if(sy>=TH)sy-=TH;return T[sy*TW+sx];}" +
        "function agents(){var i,x,y,a,f,l,r;" +
        "for(i=0;i<NA;i++){x=AG[i*3];y=AG[i*3+1];a=AG[i*3+2];" +
        "f=sniff(x,y,a);l=sniff(x,y,a-SA);r=sniff(x,y,a+SA);" +
        // 正前方最浓就直走；两边都比前面浓就随便挑一边拐——
        // 这一下随机是必须的，全都按同一个规则拐的话网会长成死板的花瓣
        "if(f>l&&f>r){}else if(f<l&&f<r){a+=(Math.random()<0.5?-RA:RA);}" +
        "else if(l>r){a-=RA;}else if(r>l){a+=RA;}" +
        "a+=(Math.random()-0.5)*0.14;" +
        "x+=Math.cos(a);y+=Math.sin(a);" +
        "if(x<0)x+=TW;else if(x>=TW)x-=TW;" +
        "if(y<0)y+=TH;else if(y>=TH)y-=TH;" +
        "AG[i*3]=x;AG[i*3+1]=y;AG[i*3+2]=a;" +
        "T[((y|0)*TW+(x|0))]+=3.2;}}" +
        // 信息素一边往四周洇一边挥发：不挥发的话整片会糊成一块，网就没了。
        // 扩散必须跟 agent 一样环形绕回去——只算内部的话，边界那一圈只进不出、
        // 永远不衰减，会变成全场最浓的引诱源，把所有个体都吸到边上去
        "function blur(){var x,y,yc,ym,yp,xm,xp;" +
        "for(y=0;y<TH;y++){yc=y*TW;ym=(y===0?TH-1:y-1)*TW;yp=(y===TH-1?0:y+1)*TW;" +
        "for(x=0;x<TW;x++){xm=x===0?TW-1:x-1;xp=x===TW-1?0:x+1;" +
        "T2[yc+x]=(T[yc+x]+T[yc+xm]+T[yc+xp]+T[ym+x]+T[yp+x])*0.2*0.90;}}" +
        "var t=T;T=T2;T2=t;}" +
        "function draw(){var d=im.data,i,v,t2,r2,g2,b2,o;" +
        // 信息素图比屏幕小得多，直接上采样血管会糊成一团光晕。
        // 加一道对比曲线：核心留住，晕掉得快，边缘才收得住
        "for(i=0;i<T.length;i++){v=T[i];t2=1-Math.exp(-v*0.13);t2=t2*t2;" +
        "if(t2<0.5){var u=t2/0.5;r2=5+u*20;g2=8+u*112;b2=20+u*128;}" +
        "else{var w2=(t2-0.5)/0.5;r2=25+w2*220;g2=120+w2*126;b2=148+w2*70;}" +
        "o=i*4;d[o]=r2;d[o+1]=g2;d[o+2]=b2;}" +
        "og.putImageData(im,0,0);G.clearRect(0,0,W,H);" +
        "G.imageSmoothingEnabled=true;G.drawImage(off,0,0,W,H);}" +
        "function tick(){" +
        "if(++fdt>1700){fdt=0;newFood();}" +
        "for(var f=0;f<FD.length;f+=2)drip(FD[f],FD[f+1],9);" +
        "agents();blur();draw();requestAnimationFrame(tick);}" +
        "var FD=[],fdt=0;" +
        "function newFood(){FD=[];for(var i=0;i<4;i++)" +
        "FD.push((0.15+Math.random()*0.7)*TW|0,(0.15+Math.random()*0.7)*TH|0);}" +
        "newFood();" +
        "function drip(cx,cy,amt){" +
        "for(var b=-6;b<=6;b++)for(var a=-6;a<=6;a++){" +
        "var dd=a*a+b*b;if(dd>36)continue;" +
        "var x=cx+a,y=cy+b;if(x<0||y<0||x>=TW||y>=TH)continue;" +
        "T[y*TW+x]+=amt*(1-Math.sqrt(dd)/6.6);}}" +
        // 手上也带着食物：你放在哪儿，网就往哪儿改道
        "function feed(e){var p=at(e);" +
        "var cx=(p[0]/W*TW)|0,cy=(p[1]/H*TH)|0;" +
        "for(var b=-7;b<=7;b++)for(var a=-7;a<=7;a++){" +
        "var dd=a*a+b*b;if(dd>49)continue;" +
        "var x=cx+a,y=cy+b;if(x<0||y<0||x>=TW||y>=TH)continue;" +
        "T[y*TW+x]+=13*(1-Math.sqrt(dd)/7.4);}}" +
        "CV.addEventListener('pointermove',feed);" +
        // 启动必须排在所有 var 之后：`tick` 第一帧就要读 `FD`，
        // 而 `var FD` 只是被提升成了 undefined，读它的 .length 会当场抛，
        // 抛在同步阶段——泵帧的 try/catch 收不到，整条静默地一个像素都不画
        "tick();",
    ),
  },
  {
    title: "燃烧的纸",
    html: play(
      stageCss("ut-burn"),
      stageBody("ut-burn"),
      FIT +
        // 火线是噪声推出来的，所以每一张烧出来的边都不一样。
        // 烧完余烬飘散，再来一张——它一直在烧，也一直烧不完
        "var burn=0,phase=0,E=[],sd=Math.random()*1000;" +
        "function edge(y){return Math.sin(y*0.021+sd)*46+Math.sin(y*0.053+sd*1.7)*22+" +
        "Math.sin(y*0.113+sd*0.3)*11;}" +
        "function tick(){G.clearRect(0,0,W,H);" +
        "var pw=Math.min(W*0.78,880),ph=Math.min(H*0.82,620);" +
        "var px=(W-pw)/2,py=(H-ph)/2,i,y;" +
        "if(phase===0){burn+=1.05;" +
        "G.fillStyle='#e9e3d6';G.fillRect(px,py,pw,ph);" +
        // 烧掉的部分直接从纸上挖掉，露出页面本身的底色
        "G.save();G.beginPath();G.moveTo(px+pw+90,py-10);" +
        "for(y=py;y<=py+ph;y+=5)G.lineTo(px+pw-burn+edge(y),y);" +
        "G.lineTo(px+pw+90,py+ph+10);G.closePath();" +
        "G.globalCompositeOperation='destination-out';G.fill();G.restore();" +
        // 火线自己发光：底下先铺一层加色的晕，再压焦边、火线、白心
        "G.lineJoin='round';G.lineCap='round';" +
        "G.beginPath();" +
        "for(y=py;y<=py+ph;y+=5){var ex=px+pw-burn+edge(y);" +
        "if(y===py)G.moveTo(ex,y);else G.lineTo(ex,y);}" +
        "G.save();G.globalCompositeOperation='lighter';" +
        "G.lineWidth=34;G.strokeStyle='rgba(190,70,12,.10)';G.stroke();" +
        "G.lineWidth=16;G.strokeStyle='rgba(240,110,24,.14)';G.stroke();G.restore();" +
        "G.lineWidth=11;G.strokeStyle='rgba(52,28,12,.5)';G.stroke();" +
        "G.lineWidth=3.4;G.strokeStyle='rgba(255,142,44,.95)';G.stroke();" +
        "G.lineWidth=1.3;G.strokeStyle='rgba(255,232,168,.9)';G.stroke();" +
        "for(i=0;i<3;i++){if(Math.random()>0.7)continue;" +
        "var yy=py+Math.random()*ph;" +
        "E.push({x:px+pw-burn+edge(yy),y:yy,vx:-0.25-Math.random()*0.9," +
        "vy:-0.6-Math.random()*1.5,l:1,s:1+Math.random()*2.1});}" +
        "if(burn>pw+110){phase=1;burn=0;}}" +
        "else{burn+=1.6;if(burn>150){phase=0;burn=0;sd=Math.random()*1000;}}" +
        // 灰烬用加色画，暗底上才亮得起来；边飘边凉，凉透就没了
        "G.save();G.globalCompositeOperation='lighter';" +
        "for(i=E.length-1;i>=0;i--){var p=E[i];" +
        "p.x+=p.vx;p.y+=p.vy;p.vy-=0.0055;p.vx+=(Math.random()-0.5)*0.09;p.l-=0.0048;" +
        "if(p.l<=0||p.y<-20){E.splice(i,1);continue;}" +
        "G.fillStyle='rgba(255,'+((70+150*p.l)|0)+','+((20+60*p.l*p.l)|0)+','+" +
        "(p.l*p.l*0.9).toFixed(2)+')';" +
        "G.fillRect(p.x,p.y,p.s,p.s);}G.restore();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "长",
    html: play(
      stageCss("ut-dla", ";touch-action:none;cursor:crosshair;background:#05070c"),
      stageBody("ut-dla"),
      FIT +
        // 扩散限制凝聚：一颗颗随机游走的粒子，碰到已有的就永远粘在那儿。
        // 就这一条规矩，长出来的是珊瑚、是霜花、是闪电——枝越往外越少被挡住，
        // 所以越长越开，中间自己就空了
        "var CS=2,GW=1,GH=1,M,AGE,off,og,im,n=0;" +
        "function alloc(){GW=Math.ceil(W/CS);GH=Math.ceil(H/CS);" +
        "M=new Uint8Array(GW*GH);AGE=new Float32Array(GW*GH);n=0;" +
        "var q=((GH>>1)*GW+(GW>>1));M[q]=1;AGE[q]=0;Rad=6;MAXR=Math.min(GW,GH)*0.46;" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var i=0;i<GW*GH;i++)d[i*4+3]=255;dirty=true;}" +
        "var dirty=true,Rad=6,MAXR=0;" +
        "onfit=alloc;alloc();" +
        "function stick(){" +
        // 从当前团块半径外一圈放生，走远了就重放——不然大半时间都耗在空地上
        "var a=Math.random()*6.2832,r=Rad+4;" +
        "var x=(GW>>1)+Math.cos(a)*r,y=(GH>>1)+Math.sin(a)*r;" +
        "for(var s=0;s<420;s++){" +
        "x+=(Math.random()*2-1)*1.6;y+=(Math.random()*2-1)*1.6;" +
        "var dx=x-(GW>>1),dy=y-(GH>>1),dd=Math.sqrt(dx*dx+dy*dy);" +
        "if(dd>Rad+22)return false;" +
        "var ix=x|0,iy=y|0;" +
        "if(ix<1||iy<1||ix>=GW-1||iy>=GH-1)return false;" +
        "var q=iy*GW+ix;" +
        "if(M[q-1]||M[q+1]||M[q-GW]||M[q+GW]){" +
        "M[q]=1;AGE[q]=n++;if(dd>Rad)Rad=dd;dirty=true;return true;}}" +
        "return false;}" +
        "function draw(){if(!dirty)return;dirty=false;" +
        "var d=im.data,i,o,t2,r2,g2,b2;" +
        "for(i=0;i<M.length;i++){o=i*4;" +
        "if(!M[i]){d[o]=5;d[o+1]=7;d[o+2]=12;continue;}" +
        // 按粘上来的先后上色：里面最早、外面最新，年轮就自己显出来了
        "t2=n>1?AGE[i]/n:0;" +
        "if(t2<0.5){var u=t2/0.5;r2=40+u*30;g2=90+u*110;b2=150+u*70;}" +
        "else{var w2=(t2-0.5)/0.5;r2=70+w2*180;g2=200+w2*40;b2=220+w2*20;}" +
        "d[o]=r2;d[o+1]=g2;d[o+2]=b2;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "function tick(){for(var k=0;k<70;k++){if(Rad>MAXR)break;stick();}" +
        "draw();requestAnimationFrame(tick);}tick();" +
        // 你也可以自己按一颗种子下去，它会长成自己那一株
        "CV.addEventListener('pointerdown',function(e){var p=at(e);" +
        "var ix=(p[0]/CS)|0,iy=(p[1]/CS)|0;" +
        "if(ix<1||iy<1||ix>=GW-1||iy>=GH-1)return;" +
        "M[iy*GW+ix]=1;AGE[iy*GW+ix]=n++;" +
        "var dx=ix-(GW>>1),dy=iy-(GH>>1),dd=Math.sqrt(dx*dx+dy*dy);" +
        "if(dd>Rad)Rad=dd;dirty=true;});",
    ),
  },
  {
    title: "振动的沙",
    html: play(
      stageCss("ut-chl", ";background:#0c0b09"),
      stageBody("ut-chl"),
      FIT +
        // 克拉尼图形：一块板按某个频率振，沙被抖着乱走，只有在**不动的那些线上**
        // 才停得住。所以浮现出来的不是画的花纹，是这块板在这个频率下的驻波节线。
        // 频率每隔一阵换一次，图形就整张重排
        "var N=15000,P=new Float32Array(N*2),tt=0,m=3.1,nn=2.2;" +
        // 场按 m/nn 算一次就够（几百帧才换一次）。让每颗粒子每帧现算五次 amp、
        // 每次四个 sin，就是每帧三十万次三角函数——白烧
        "var FN=220,FLD=new Float32Array(FN*FN);" +
        "function field(){var x,y,a,b,PI=3.14159;" +
        "for(y=0;y<FN;y++){var fy=y/(FN-1);" +
        "for(x=0;x<FN;x++){var fx=x/(FN-1);" +
        "a=Math.sin(m*PI*fx)*Math.sin(nn*PI*fy)-Math.sin(nn*PI*fx)*Math.sin(m*PI*fy);" +
        "FLD[y*FN+x]=a<0?-a:a;}}}" +
        "function alloc(){for(var i=0;i<N;i++){" +
        "P[i*2]=Math.random();P[i*2+1]=Math.random();}}" +
        "onfit=alloc;alloc();field();" +
        "function tick(){tt++;" +
        "if(tt%560===0){m=2+Math.random()*6;nn=2+Math.random()*6;field();}" +
        "var i,x,y,gx,gy,q,a,st;" +
        "for(i=0;i<N;i++){x=P[i*2];y=P[i*2+1];" +
        "gx=(x*(FN-1))|0;gy=(y*(FN-1))|0;" +
        "if(gx<1)gx=1;else if(gx>FN-2)gx=FN-2;" +
        "if(gy<1)gy=1;else if(gy>FN-2)gy=FN-2;" +
        "q=gy*FN+gx;a=FLD[q];" +
        // 抖的幅度跟当地振幅成正比：越靠近节线抖得越轻，于是自己被筛过去、
        // 而且再也抖不出来。这就是沙为什么会停在节线上
        "st=0.0016+a*0.021;" +
        "x+=-(FLD[q+1]-FLD[q-1])*0.030+(Math.random()-0.5)*st;" +
        "y+=-(FLD[q+FN]-FLD[q-FN])*0.030+(Math.random()-0.5)*st;" +
        "if(x<0)x=-x;else if(x>1)x=2-x;" +
        "if(y<0)y=-y;else if(y>1)y=2-y;" +
        "P[i*2]=x;P[i*2+1]=y;}" +
        "G.fillStyle='rgba(12,11,9,0.16)';G.fillRect(0,0,W,H);" +
        "var s=Math.min(W,H)*0.86,ox=(W-s)/2,oy=(H-s)/2;" +
        "G.fillStyle='rgba(240,232,210,0.9)';" +
        "for(i=0;i<N;i++)G.fillRect(ox+P[i*2]*s,oy+P[i*2+1]*s,1.7,1.7);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "吸引子",
    html: play(
      stageCss("ut-attr", ";background:#04050a"),
      stageBody("ut-attr"),
      FIT +
        // Clifford 吸引子：一个点反复代进同一个式子，几十万次之后落点的疏密
        // 会画出一个形。参数一直在慢慢漂，所以这个形一直在变形，不会定下来
        "var GWd=1,GHd=1,DEN,off,og,im;" +
        "function alloc(){GWd=Math.max(200,Math.min(760,Math.round(W/2)));" +
        "GHd=Math.max(120,Math.round(GWd*H/W));" +
        "DEN=new Float32Array(GWd*GHd);" +
        "off=document.createElement('canvas');off.width=GWd;off.height=GHd;" +
        "og=off.getContext('2d');im=og.createImageData(GWd,GHd);" +
        "var d=im.data;for(var i=0;i<GWd*GHd;i++)d[i*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var pa=-1.4,pb=1.6,pc=1.0,pd=0.7,t=0;" +
        "var x=0.1,y=0.1;" +
        "function tick(){t++;" +
        // 四个参数各按不同的慢周期漂：不可通约，所以形不会绕回原样
        "pa=-1.6+0.7*Math.sin(t*0.00042);pb=1.5+0.6*Math.cos(t*0.00031);" +
        "pc=0.9+0.6*Math.sin(t*0.00023);pd=0.8+0.6*Math.cos(t*0.00037);" +
        "var i,nx,ny,gx,gy,q;" +
        "for(i=0;i<DEN.length;i++)DEN[i]*=0.965;" +
        "for(i=0;i<26000;i++){" +
        "nx=Math.sin(pa*y)+pc*Math.cos(pa*x);" +
        "ny=Math.sin(pb*x)+pd*Math.cos(pb*y);" +
        "x=nx;y=ny;" +
        "gx=((x+2.2)/4.4*GWd)|0;gy=((y+2.2)/4.4*GHd)|0;" +
        "if(gx<0||gy<0||gx>=GWd||gy>=GHd)continue;" +
        "DEN[gy*GWd+gx]+=1;}" +
        "var d=im.data,v,t2,r2,g2,b2,o;" +
        "for(i=0;i<DEN.length;i++){v=DEN[i];o=i*4;" +
        "if(v<0.02){d[o]=4;d[o+1]=5;d[o+2]=10;continue;}" +
        // 密度差好几个数量级，线性映射只会剩一团白，得压成对数
        "t2=Math.log(1+v)*0.34;if(t2>1)t2=1;" +
        "if(t2<0.5){var u=t2/0.5;r2=8+u*54;g2=12+u*96;b2=30+u*150;}" +
        "else{var w2=(t2-0.5)/0.5;r2=62+w2*192;g2=108+w2*130;b2=180+w2*60;}" +
        "d[o]=r2;d[o+1]=g2;d[o+2]=b2;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "螺旋",
    html: play(
      stageCss("ut-cyc", ";background:#05060b"),
      stageBody("ut-cyc"),
      FIT +
        // Greenberg–Hastings 可激发介质（BZ 反应那一类）：一格静着的时候，
        // 只要旁边有谁在兴奋，它就跟着兴奋；兴奋完必须进一段不应期，谁也叫不醒。
        // 就这两条，波前一断就会自己卷起来——螺旋是从断口长出来的，不是画的
        "var NS=13,EX=2,GW=1,GH=1,A,B2,off,og,im,gen=0;" +
        // 邻域用 Moore（八格）等于按 L∞ 度量传播，波前会长成正方形。
        // 换成半径 2 的圆盘（20 格），波才是圆的，断口才卷得出真螺旋
        "var OFF=[];" +
        "for(var oy=-2;oy<=2;oy++)for(var ox=-2;ox<=2;ox++){" +
        "if(!ox&&!oy)continue;if(ox*ox+oy*oy>6)continue;OFF.push(ox,oy);}" +
        "function alloc(){GW=Math.max(140,Math.min(400,Math.round(W/3.8)));" +
        "GH=Math.max(90,Math.round(GW*H/W));" +
        "A=new Uint8Array(GW*GH);B2=new Uint8Array(GW*GH);" +
        // 随机初值必然到处是断掉的波前，每一个断口都是一只螺旋的种子
        // 均匀随机初值长出来的是靶心波（同心环）。螺旋要的是**相位奇点**：
        // 绕着某点走一圈，相位刚好卷过整整一圈——那个点就是螺旋核。
        // 拿几个随机手性的中心把相位场铺出来，每个中心自动是一只螺旋
        "seedPhase();" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;gen=0;}" +
        "onfit=alloc;alloc();" +
        "function seedPhase(){var K=5,cx=[],cy=[],sg=[],k,x,y;" +
        "for(k=0;k<K;k++){cx.push(Math.random()*GW);cy.push(Math.random()*GH);" +
        "sg.push(Math.random()<0.5?-1:1);}" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){var ph=0;" +
        "for(k=0;k<K;k++)ph+=sg[k]*Math.atan2(y-cy[k],x-cx[k]);" +
        "ph=ph/6.2832;ph=ph-Math.floor(ph);" +
        "A[y*GW+x]=(ph*NS)|0;}}" +
        "function step(){var x,y,q,me,dx,dy,n,alive=0;" +
        "for(y=0;y<GH;y++){for(x=0;x<GW;x++){q=y*GW+x;me=A[q];" +
        "if(me===0){n=0;" +
        "for(var k2=0;k2<OFF.length;k2+=2){" +
        "var nb=A[((y+OFF[k2+1]+GH)%GH)*GW+((x+OFF[k2]+GW)%GW)];" +
        "if(nb>0&&nb<=EX){n=1;break;}}" +
        "B2[q]=n;}" +
        // 兴奋完只能往前走完一整圈，中途不接受任何刺激——这就是不应期，
        // 也是波为什么只往一个方向传、不会倒回来的原因
        "else{B2[q]=me+1>=NS?0:me+1;}" +
        "if(B2[q]>0)alive++;}}" +
        "var t=A;A=B2;B2=t;gen++;" +
        "if(alive<A.length*0.01&&gen>80){" +
        "seedPhase();" +
        "gen=0;}}" +
        "function draw(){var d=im.data,i,s2,o,f;" +
        "for(i=0;i<A.length;i++){o=i*4;s2=A[i];" +
        "if(s2===0){d[o]=10;d[o+1]=13;d[o+2]=24;continue;}" +
        "if(s2<=EX){f=s2/EX;" +
        // 波前是热的，身后拖着一条越来越冷的不应期尾巴
        "d[o]=255-f*40;d[o+1]=228-f*120;d[o+2]=150-f*60;continue;}" +
        "f=(s2-EX)/(NS-EX);" +
        "d[o]=200-f*180;d[o+1]=104-f*84;d[o+2]=96+f*38;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var last=0;" +
        "function tick(){var now=Date.now();if(now-last>48){last=now;step();}" +
        "draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "引力",
    html: play(
      stageCss("ut-grav", ";background:#03040a"),
      stageBody("ut-grav"),
      FIT +
        // 五颗有质量的互相拉扯——三体以上就没有解析解，谁也算不出它们十分钟后
        // 在哪。四千颗没质量的尘埃只被拉、不拉别人，于是把整个引力场画了出来
        "var NB=5,BX,BY,BVX,BVY,BM,NP=4200,PX,PY,PVX,PVY;" +
        "function alloc(){" +
        "BX=new Float64Array(NB);BY=new Float64Array(NB);" +
        "BVX=new Float64Array(NB);BVY=new Float64Array(NB);BM=new Float64Array(NB);" +
        "var R=Math.min(W,H)*0.26;" +
        "for(var i=0;i<NB;i++){var a=i/NB*6.2832;" +
        "BX[i]=W/2+Math.cos(a)*R;BY[i]=H/2+Math.sin(a)*R;" +
        "BVX[i]=-Math.sin(a)*1.05;BVY[i]=Math.cos(a)*1.05;BM[i]=760+Math.random()*520;}" +
        "PX=new Float32Array(NP);PY=new Float32Array(NP);" +
        "PVX=new Float32Array(NP);PVY=new Float32Array(NP);" +
        "for(var k=0;k<NP;k++){var b=Math.random()*6.2832," +
        "r=Math.sqrt(Math.random())*Math.min(W,H)*0.46;" +
        "PX[k]=W/2+Math.cos(b)*r;PY[k]=H/2+Math.sin(b)*r;" +
        "PVX[k]=-Math.sin(b)*1.5;PVY[k]=Math.cos(b)*1.5;}" +
        "G.fillStyle='#03040a';G.fillRect(0,0,W,H);}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,j,dx,dy,d2,f,inv;" +
        "for(i=0;i<NB;i++)for(j=i+1;j<NB;j++){" +
        "dx=BX[j]-BX[i];dy=BY[j]-BY[i];d2=dx*dx+dy*dy+900;" +
        "inv=1/Math.sqrt(d2);f=1/d2;" +
        "BVX[i]+=dx*inv*f*BM[j];BVY[i]+=dy*inv*f*BM[j];" +
        "BVX[j]-=dx*inv*f*BM[i];BVY[j]-=dy*inv*f*BM[i];}" +
        "for(i=0;i<NB;i++){BX[i]+=BVX[i];BY[i]+=BVY[i];" +
        // 飞太远就从对面回来，不然跑着跑着场里就空了
        "if(BX[i]<-W*0.4)BX[i]=W*1.4;else if(BX[i]>W*1.4)BX[i]=-W*0.4;" +
        "if(BY[i]<-H*0.4)BY[i]=H*1.4;else if(BY[i]>H*1.4)BY[i]=-H*0.4;}" +
        "G.fillStyle='rgba(3,4,10,0.085)';G.fillRect(0,0,W,H);" +
        "G.fillStyle='rgba(150,190,255,0.5)';" +
        "for(var k=0;k<NP;k++){var ax=0,ay=0;" +
        "for(i=0;i<NB;i++){dx=BX[i]-PX[k];dy=BY[i]-PY[k];d2=dx*dx+dy*dy+700;" +
        "f=BM[i]/(d2*Math.sqrt(d2));ax+=dx*f;ay+=dy*f;}" +
        "PVX[k]+=ax;PVY[k]+=ay;PVX[k]*=0.9995;PVY[k]*=0.9995;" +
        "PX[k]+=PVX[k];PY[k]+=PVY[k];" +
        "if(PX[k]<-40||PX[k]>W+40||PY[k]<-40||PY[k]>H+40){" +
        "var b=Math.random()*6.2832,r=Math.min(W,H)*0.46;" +
        "PX[k]=W/2+Math.cos(b)*r;PY[k]=H/2+Math.sin(b)*r;" +
        "PVX[k]=-Math.sin(b)*1.5;PVY[k]=Math.cos(b)*1.5;continue;}" +
        "G.fillRect(PX[k],PY[k],1.2,1.2);}" +
        "for(i=0;i<NB;i++){G.fillStyle='rgba(255,228,180,0.95)';" +
        "G.beginPath();G.arc(BX[i],BY[i],2.6,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "水底",
    html: play(
      stageCss("ut-caus", ";background:#04121c"),
      stageBody("ut-caus"),
      FIT +
        // 焦散：平行光穿过起皱的水面，被折射得有疏有密，落到池底就是那张网。
        // 亮的地方不是"画上去的光"，是折射后挤到一起的光线条数
        "var SN=1,SM=1,ACC,GWa=1,GHa=1,off,og,im,t=0;" +
        "function alloc(){GWa=Math.max(160,Math.min(300,Math.round(W/4.6)));" +
        "GHa=Math.max(90,Math.round(GWa*H/W));" +
        "SN=Math.round(GWa*1.7);SM=Math.round(GHa*1.7);" +
        "ACC=new Float32Array(GWa*GHa);" +
        "off=document.createElement('canvas');off.width=GWa;off.height=GHa;" +
        "og=off.getContext('2d');im=og.createImageData(GWa,GHa);" +
        "var d=im.data;for(var i=0;i<GWa*GHa;i++)d[i*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        // 三层不同尺度、不同方向、不同速度的波叠出水面高度
        "function hgt(x,y){return Math.sin(x*15.3+t*0.021)*0.30" +
        "+Math.sin(x*7.7-y*11.1+t*0.017)*0.34" +
        "+Math.sin(y*19.7+x*5.1-t*0.026)*0.20" +
        "+Math.sin(x*27.3+y*23.1+t*0.011)*0.11;}" +
        "function tick(){t++;" +
        "var i,j,x,y,e=0.006,nx,ny,gx,gy,q;" +
        "for(i=0;i<ACC.length;i++)ACC[i]*=0.86;" +
        "for(j=0;j<SM;j++){for(i=0;i<SN;i++){" +
        "x=(i+Math.random())/SN;y=(j+Math.random())/SM;" +
        // 折射偏移 ∝ 水面斜率：斜率大的地方光被甩得远，落点就疏
        "nx=(hgt(x+e,y)-hgt(x-e,y))/(2*e);" +
        "ny=(hgt(x,y+e)-hgt(x,y-e))/(2*e);" +
        "gx=((x-nx*0.052)*GWa)|0;gy=((y-ny*0.052)*GHa)|0;" +
        "if(gx<0||gy<0||gx>=GWa||gy>=GHa)continue;" +
        "ACC[gy*GWa+gx]+=1;}}" +
        "var d=im.data,v,t2,o;" +
        "for(i=0;i<ACC.length;i++){o=i*4;v=ACC[i];" +
        "t2=1-Math.exp(-v*0.055);" +
        "d[o]=14+t2*t2*228;d[o+1]=44+t2*196;d[o+2]=74+t2*172;}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "生物",
    html: play(
      stageCss("ut-lenia", ";background:#04060a"),
      stageBody("ut-lenia"),
      FIT +
        // Lenia：生命游戏的连续版。格子不再是死/活，而是 0 到 1 的浓度；邻域不再是
        // 八格，而是一圈钟形的核。规则只有一条——邻域的加权平均落在某个窄带里就长，
        // 偏了就消。就这一条，会长出会动、会变形、会分裂的东西
        "var GW=1,GH=1,A,B2,off,og,im,KX,KY,KW,KN=0;" +
        "var R=9,MU=0.27,SIG=0.055,DT=0.10;" +
        "function bell(x,m,s){var d=(x-m)/s;return Math.exp(-d*d*0.5);}" +
        "function kernel(){var xs=[],ys=[],ws=[],sum=0,x,y;" +
        "for(y=-R;y<=R;y++)for(x=-R;x<=R;x++){" +
        "var r=Math.sqrt(x*x+y*y)/R;if(r>=1||r<=0)continue;" +
        // 环形核：中心是空的，权重集中在半径一半的那一圈上
        "var w=Math.exp(4-1/(r*(1-r)));" +
        // 权重小到这个份上对结果没影响，丢掉能省掉六成的乘加
        "if(w<0.012)continue;" +
        "xs.push(x);ys.push(y);ws.push(w);sum+=w;}" +
        "KN=ws.length;KX=new Int16Array(xs);KY=new Int16Array(ys);" +
        "KW=new Float32Array(KN);" +
        "for(var i=0;i<KN;i++)KW[i]=ws[i]/sum;}" +
        "kernel();" +
        "function alloc(){GW=Math.max(90,Math.min(150,Math.round(W/9)));" +
        "GH=Math.max(60,Math.round(GW*H/W));" +
        "A=new Float32Array(GW*GH);B2=new Float32Array(GW*GH);" +
        "sow();" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;}" +
        // 种子必须是**平滑**的低频噪声。逐格白噪声经过一百多个抽头的核平均之后，
        // 方差被压到 ±0.02——整场的 u 几乎都落在 0.5，除非 mu 正好是 0.5，
        // 否则所有格子会一起死。平滑噪声才让 u 在空间上真的有高有低
        "function sow(){var cell=12,cw=Math.ceil(GW/cell)+2,ch=Math.ceil(GH/cell)+2;" +
        "var C=new Float32Array(cw*ch),i;" +
        "for(i=0;i<C.length;i++)C[i]=Math.random();" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        "var gx=x/cell,gy=y/cell,x0=gx|0,y0=gy|0,fx=gx-x0,fy=gy-y0;" +
        "A[y*GW+x]=C[y0*cw+x0]*(1-fx)*(1-fy)+C[y0*cw+x0+1]*fx*(1-fy)" +
        "+C[(y0+1)*cw+x0]*(1-fx)*fy+C[(y0+1)*cw+x0+1]*fx*fy;}}" +
        "onfit=alloc;alloc();" +
        "var idle=0;" +
        "function step(){var x,y,i,k,u,alive=0;" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){u=0;" +
        "for(k=0;k<KN;k++)u+=KW[k]*A[((y+KY[k]+GH)%GH)*GW+((x+KX[k]+GW)%GW)];" +
        "i=y*GW+x;" +
        "var g=2*bell(u,MU,SIG)-1,v=A[i]+DT*g;" +
        "B2[i]=v<0?0:(v>1?1:v);alive+=B2[i];}" +
        "var t=A;A=B2;B2=t;" +
        // 全灭或者长满都没得看了，重撒一把
        "if(alive<GW*GH*0.004||alive>GW*GH*0.62){idle++;if(idle>12){sow();idle=0;}}" +
        "else idle=0;}" +
        "function draw(){var d=im.data,i,v,o;" +
        "for(i=0;i<A.length;i++){o=i*4;v=A[i];" +
        "if(v<0.004){d[o]=4;d[o+1]=6;d[o+2]=10;continue;}" +
        "if(v<0.5){var u2=v/0.5;d[o]=6+u2*26;d[o+1]=14+u2*118;d[o+2]=40+u2*128;}" +
        "else{var w2=(v-0.5)/0.5;d[o]=32+w2*212;d[o+1]=132+w2*112;d[o+2]=168+w2*74;}}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "function tick(){step();draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "雪",
    html: play(
      stageCss("ut-snow", ";background:#05070e"),
      stageBody("ut-snow"),
      FIT +
        // Reiter 的雪花元胞机，跑在六边形网格上。规则只有三句：已冻的和挨着冻的
        // 把水扣住不放，别处的水自由扩散，扣住的每步再从空气里多得一点。
        // 六次对称不是画出来的，是六边形网格自己带的
        "var GN=209,C=GN>>1,S,S2,off,og,im,steps=0;" +
        "var ALP=1.0,BET=0.42,GAM=0.0008;" +
        "function alloc(){S=new Float32Array(GN*GN);S2=new Float32Array(GN*GN);" +
        "S.fill(BET);S[C*GN+C]=1;steps=0;" +
        "off=document.createElement('canvas');off.width=GN;off.height=GN;" +
        "og=off.getContext('2d');im=og.createImageData(GN,GN);" +
        "var d=im.data;for(var j=0;j<GN*GN;j++)d[j*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        // 六邻域按行奇偶错开，这就是用方数组存六边形网格的办法
        "function nb(x,y,k){var odd=y&1;" +
        "var dx=[-1,0,-1,1,-1,0][k],dy=[-1,-1,0,0,1,1][k];" +
        "if(odd)dx=[0,1,-1,1,0,1][k];" +
        "return[x+dx,y+dy];}" +
        "function step(){var x,y,i,k,p,recv,su,nu,cnt;" +
        "for(y=1;y<GN-1;y++)for(x=1;x<GN-1;x++){i=y*GN+x;" +
        "recv=S[i]>=1;" +
        "if(!recv)for(k=0;k<6;k++){p=nb(x,y,k);" +
        "if(S[p[1]*GN+p[0]]>=1){recv=true;break;}}" +
        "if(recv){S2[i]=S[i]+GAM;}else{S2[i]=S[i];}}" +
        // 只有"非接受态"的水才参与扩散；被扣住的那部分不动，晶体才长得出枝
        "for(y=1;y<GN-1;y++)for(x=1;x<GN-1;x++){i=y*GN+x;" +
        "recv=S[i]>=1;" +
        "if(!recv)for(k=0;k<6;k++){p=nb(x,y,k);" +
        "if(S[p[1]*GN+p[0]]>=1){recv=true;break;}}" +
        "if(recv)continue;" +
        "su=0;cnt=0;" +
        "for(k=0;k<6;k++){p=nb(x,y,k);var q=p[1]*GN+p[0];" +
        "var rc=S[q]>=1;if(!rc)for(var k2=0;k2<6;k2++){var p2=nb(p[0],p[1],k2);" +
        "if(S[p2[1]*GN+p2[0]]>=1){rc=true;break;}}" +
        "su+=rc?0:S[q];cnt++;}" +
        "S2[i]=S[i]+ALP*0.5*(su/cnt-S[i]);}" +
        "var t=S;S=S2;S2=t;steps++;" +
        "if(steps>4200)alloc();}" +
        "function draw(){var d=im.data,i,v,o;" +
        "for(i=0;i<S.length;i++){o=i*4;v=S[i];" +
        "if(v>=1){var e=Math.min(1,(v-1)*1.6);" +
        "d[o]=196+e*59;d[o+1]=220+e*35;d[o+2]=255;}" +
        "else{var u=v/1;d[o]=8+u*22;d[o+1]=12+u*38;d[o+2]=24+u*66;}}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=true;" +
        "var s=Math.min(W,H)*0.96,ox=(W-s)/2,oy=(H-s)/2;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,ox,oy,s,s);}" +
        "function tick(){step();step();step();draw();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "晶",
    html: play(
      stageCss("ut-grain", ";background:#07070b"),
      stageBody("ut-grain"),
      FIT +
        // Potts 模型，金属退火时晶粒长大的那套。规则只有一句：换成邻居的取向，
        // 边界会不会变短？会就换。于是小的被大的吃掉、界面被拉直。
        //
        // 让它跑到底：这个"让界面越来越少"的过程，终点是**一整块，没有界面**。
        // 那时画面上什么都没有了。剩不下几粒就重新撒一遍，从头再吃一次
        "var Q=96,GW=1,GH=1,O,off,og,im,HUE;" +
        "function alloc(){GW=Math.max(160,Math.min(400,Math.round(W/3.8)));" +
        "GH=Math.max(90,Math.round(GW*H/W));" +
        "O=new Uint8Array(GW*GH);" +
        "for(var i=0;i<O.length;i++)O[i]=(Math.random()*Q)|0;" +
        "HUE=new Uint8Array(Q*3);" +
        "for(var k=0;k<Q;k++){var h=Math.random()*360,l=0.34+Math.random()*0.26;" +
        "var c=l*0.42,hp=h/60,xx=c*(1-Math.abs((hp%2)-1)),r=0,g=0,b=0;" +
        "if(hp<1){r=c;g=xx;}else if(hp<2){r=xx;g=c;}else if(hp<3){g=c;b=xx;}" +
        "else if(hp<4){g=xx;b=c;}else if(hp<5){r=xx;b=c;}else{r=c;b=xx;}" +
        "var m=l-c/2;" +
        "HUE[k*3]=(r+m)*255;HUE[k*3+1]=(g+m)*255;HUE[k*3+2]=(b+m)*255;}" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];" +
        "function unlike(x,y,o){var n=0;" +
        "for(var k=0;k<8;k++){" +
        "if(O[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)]!==o)n++;}return n;}" +
        "function anneal(){var t,x,y,k,me,cand;" +
        "for(t=0;t<26000;t++){" +
        "x=(Math.random()*GW)|0;y=(Math.random()*GH)|0;" +
        "k=(Math.random()*8)|0;" +
        "cand=O[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)];" +
        "me=O[y*GW+x];if(cand===me)continue;" +
        // 零温：只接受让界面变短或持平的翻转。持平也接受，界面才会动而不是冻住
        "if(unlike(x,y,cand)<=unlike(x,y,me))O[y*GW+x]=cand;}}" +
        "function draw(){var d=im.data,x,y,i,o,e,k,edge;" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;o=O[i];e=i*4;" +
        "edge=0;" +
        "for(k=3;k<5;k++)if(O[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)]!==o)edge=1;" +
        "if(!edge&&O[((y+1)%GH)*GW+x]!==o)edge=1;" +
        "if(edge){d[e]=8;d[e+1]=9;d[e+2]=13;continue;}" +
        "d[e]=HUE[o*3];d[e+1]=HUE[o*3+1];d[e+2]=HUE[o*3+2];}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var seen=new Uint8Array(Q);" +
        "function grains(){seen.fill(0);var n=0;" +
        "for(var i=0;i<O.length;i+=7)if(!seen[O[i]]){seen[O[i]]=1;n++;}return n;}" +
        "var chk=0;" +
        "function tick(){anneal();draw();" +
        "if(++chk>90){chk=0;if(grains()<3)alloc();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "排名",
    html: play(
      stageCss("ut-rank", ";background:#06070c"),
      stageBody("ut-rank"),
      FIT +
        // 优先连接：每来一个新的，就按"已有多少连接"的比例去连老的。
        // 于是连接数迅速拉开，几个巨头把整张网吃掉。
        //
        // 关键在颜色：亮的是**先来的**，暗的是后来的。所有巨头都是暖色——
        // 它们不是更好，只是来得早。排名制造了它声称在测量的那个东西
        "var MAXN=280,X,Y,DX,DY,DEG,E,n=0,ec=0,acc=0,KK=1;" +
        "function alloc(){X=new Float32Array(MAXN);Y=new Float32Array(MAXN);" +
        "DX=new Float32Array(MAXN);DY=new Float32Array(MAXN);" +
        "DEG=new Int32Array(MAXN);E=new Int32Array(MAXN*4);" +
        "n=0;ec=0;acc=0;for(var i=0;i<3;i++)add(true);}" +
        "function place(i){var a=Math.random()*6.2832,r=Math.min(W,H)*0.10;" +
        "X[i]=W/2+Math.cos(a)*r;Y[i]=H/2+Math.sin(a)*r;}" +
        "function link(a,b){if(ec*2+2>E.length)return;" +
        "E[ec*2]=a;E[ec*2+1]=b;ec++;DEG[a]++;DEG[b]++;}" +
        "function add(seed){if(n>=MAXN)return;var i=n++;place(i);DEG[i]=0;" +
        "if(seed){if(i>0)link(i,i-1);return;}" +
        // 从边的端点里随便抽一个 = 按度数成比例地抽节点。这就是马太效应的引擎
        "for(var k=0;k<2;k++){var t=E[(Math.random()*ec*2)|0];" +
        "if(t!==i)link(i,t);}}" +
        "onfit=alloc;alloc();" +
        // 位移式布局（Fruchterman-Reingold）：斥力 k²/d、引力 d²/k，
        // 每步位移限幅。速度式的那种在几百个节点上会累加到发散，节点全飞出画面
        "function tick(){var i,j,dx,dy,d,f;" +
        "if(n<MAXN){acc++;if(acc>6){acc=0;add(false);}}" +
        "KK=Math.sqrt(W*H/(n+1))*0.52;" +
        "for(i=0;i<n;i++){DX[i]=0;DY[i]=0;}" +
        "for(i=0;i<n;i++)for(j=i+1;j<n;j++){" +
        "dx=X[i]-X[j];dy=Y[i]-Y[j];d=Math.sqrt(dx*dx+dy*dy);" +
        "if(d<0.6){dx=Math.random()-0.5;dy=Math.random()-0.5;d=0.6;}" +
        "f=KK*KK/d;" +
        "DX[i]+=dx/d*f;DY[i]+=dy/d*f;DX[j]-=dx/d*f;DY[j]-=dy/d*f;}" +
        "for(i=0;i<ec;i++){var a=E[i*2],b=E[i*2+1];" +
        "dx=X[a]-X[b];dy=Y[a]-Y[b];d=Math.sqrt(dx*dx+dy*dy)||0.6;" +
        "f=d*d/KK;" +
        "DX[a]-=dx/d*f;DY[a]-=dy/d*f;DX[b]+=dx/d*f;DY[b]+=dy/d*f;}" +
        "var cap=KK*0.10;" +
        "for(i=0;i<n;i++){" +
        "DX[i]+=(W/2-X[i])*0.06;DY[i]+=(H/2-Y[i])*0.06;" +
        "d=Math.sqrt(DX[i]*DX[i]+DY[i]*DY[i]);" +
        "if(d>cap){DX[i]*=cap/d;DY[i]*=cap/d;}" +
        "X[i]+=DX[i];Y[i]+=DY[i];" +
        "if(X[i]<8)X[i]=8;else if(X[i]>W-8)X[i]=W-8;" +
        "if(Y[i]<8)Y[i]=8;else if(Y[i]>H-8)Y[i]=H-8;}" +
        "G.fillStyle='#06070c';G.fillRect(0,0,W,H);" +
        "G.strokeStyle='rgba(130,150,185,0.16)';G.lineWidth=1;G.beginPath();" +
        "for(i=0;i<ec;i++){G.moveTo(X[E[i*2]],Y[E[i*2]]);" +
        "G.lineTo(X[E[i*2+1]],Y[E[i*2+1]]);}G.stroke();" +
        "for(i=0;i<n;i++){var t2=1-i/MAXN;" +
        "G.fillStyle='hsla('+((214-t2*196)|0)+',78%,'+((40+t2*30)|0)+'%,'+(0.34+t2*0.6).toFixed(2)+')';" +
        "G.beginPath();G.arc(X[i],Y[i],2.2+Math.sqrt(DEG[i])*2.1,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "沙堆",
    html: play(
      stageCss("ut-pile", ";touch-action:none;cursor:crosshair;background:#07070b"),
      stageBody("ut-pile"),
      FIT +
        // 自组织临界：每格最多站三粒，第四粒一到就塌，往四邻各分一粒——
        // 邻居可能因此也超了，于是连锁。
        //
        // 它自己会走到那个"再加一粒就可能塌一大片"的状态，然后一直待在那儿。
        // 下一粒引发的是一格还是半屏，谁也算不出来。反的是「风险可控」
        "var GW=1,GH=1,Hp,off,og,im,PAL;" +
        "function alloc(){GW=Math.max(120,Math.min(300,Math.round(W/4.6)));" +
        "GH=Math.max(80,Math.round(GW*H/W));" +
        "Hp=new Int32Array(GW*GH);" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;" +
        "PAL=[[12,13,20],[38,74,128],[92,150,206],[238,214,150],[255,246,214]];}" +
        "onfit=alloc;alloc();" +
        "var mx=-1,my=-1;" +
        "function drop(){var i;" +
        "if(mx>=0){i=((my/H*GH)|0)*GW+((mx/W*GW)|0);}" +
        "else i=((GH>>1)*GW)+(GW>>1);" +
        "if(i>=0&&i<Hp.length)Hp[i]+=1;}" +
        // 塌方：全场扫一遍，超过三的往四邻各分一粒。一帧最多扫这么多遍，
        // 大塌方就分好几帧演完——正好看得见它蔓延
        "function relax(){var x,y,i,any,sweeps=0;" +
        "do{any=0;" +
        "for(y=1;y<GH-1;y++)for(x=1;x<GW-1;x++){i=y*GW+x;" +
        "if(Hp[i]<4)continue;Hp[i]-=4;" +
        "Hp[i-1]++;Hp[i+1]++;Hp[i-GW]++;Hp[i+GW]++;any=1;}" +
        "sweeps++;}while(any&&sweeps<16);}" +
        "function draw(){var d=im.data,i,o,h,c;" +
        "for(i=0;i<Hp.length;i++){o=i*4;h=Hp[i];if(h>4)h=4;if(h<0)h=0;" +
        "c=PAL[h];d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "function tick(){for(var k=0;k<26;k++)drop();relax();draw();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){var p=at(e);mx=p[0];my=p[1];});" +
        "CV.addEventListener('pointerleave',function(){mx=-1;my=-1;});",
    ),
  },
  {
    title: "渗流",
    html: play(
      stageCss("ut-perc", ";background:#07080c"),
      stageBody("ut-perc"),
      FIT +
        // 一格一格随机地填。填到一半多一点的时候，会**突然**出现一条从上通到下的路——
        // 不是慢慢连上的，是在某一格落下的那一瞬间，一大片零碎的东西一次性接通。
        //
        // 之前和之后只差一粒。反的是「量变会慢慢引起质变」：它一点都不慢
        "var GW=1,GH=1,OC,UF,SZ2,ORD,idx=0,span=-1,flash=0,off,og,im;" +
        "function alloc(){GW=Math.max(90,Math.min(200,Math.round(W/7)));" +
        "GH=Math.max(60,Math.round(GW*H/W));" +
        "var N=GW*GH;" +
        "OC=new Uint8Array(N);UF=new Int32Array(N+2);SZ2=new Int32Array(N+2);" +
        "for(var i=0;i<N+2;i++){UF[i]=i;SZ2[i]=1;}" +
        "ORD=new Int32Array(N);for(i=0;i<N;i++)ORD[i]=i;" +
        "for(i=N-1;i>0;i--){var j=(Math.random()*(i+1))|0,t=ORD[i];ORD[i]=ORD[j];ORD[j]=t;}" +
        "idx=0;span=-1;flash=0;" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var k=0;k<N;k++)d[k*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "function find(a){while(UF[a]!==a){UF[a]=UF[UF[a]];a=UF[a];}return a;}" +
        "function uni(a,b){a=find(a);b=find(b);if(a===b)return;" +
        "if(SZ2[a]<SZ2[b]){var t=a;a=b;b=t;}UF[b]=a;SZ2[a]+=SZ2[b];}" +
        "function open(){var N=GW*GH;if(idx>=N)return false;" +
        "var i=ORD[idx++],x=i%GW,y=(i/GW)|0;OC[i]=1;" +
        // 顶边和底边各接一个虚拟节点：它们连通了，就说明贯通了
        "if(y===0)uni(i,N);if(y===GH-1)uni(i,N+1);" +
        "if(x>0&&OC[i-1])uni(i,i-1);" +
        "if(x<GW-1&&OC[i+1])uni(i,i+1);" +
        "if(y>0&&OC[i-GW])uni(i,i-GW);" +
        "if(y<GH-1&&OC[i+GW])uni(i,i+GW);" +
        "if(span<0&&find(N)===find(N+1)){span=idx;flash=1;}" +
        "return true;}" +
        "function draw(){var d=im.data,i,o,N=GW*GH,rt,sr=span>0?find(N):-1;" +
        "for(i=0;i<N;i++){o=i*4;" +
        "if(!OC[i]){d[o]=10;d[o+1]=11;d[o+2]=17;continue;}" +
        "rt=find(i);" +
        "if(sr>=0&&rt===sr){" +
        // 贯通的那一簇单独点亮，刚接通时还会闪一下
        "var b=1+flash*1.4;" +
        "d[o]=Math.min(255,150*b);d[o+1]=Math.min(255,214*b);d[o+2]=Math.min(255,255*b);continue;}" +
        "var hsh=(rt*2654435761)>>>0;" +
        "d[o]=40+(hsh&31);d[o+1]=54+((hsh>>5)&41);d[o+2]=78+((hsh>>10)&47);}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "function tick(){var k;" +
        "if(flash>0)flash-=0.02;" +
        // 接通之后再填一会儿就重来：那个"之前/之后只差一粒"的瞬间才是全部内容
        "if(span>0&&idx>span+GW*GH*0.10){alloc();}" +
        "else{for(k=0;k<(span>0?26:14);k++)if(!open())break;}" +
        "draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "公地",
    html: play(
      stageCss("ut-common", ";background:#06080a"),
      stageBody("ut-common"),
      FIT +
        // 一口共有的池子，一圈人从里面取。池子自己会长，但有上限。
        // 每个人只做一件事：看见别人拿得比自己多，就把自己的量往上调一点。
        //
        // 每一步都是理性的，合起来是抽干。抽干之后大家一起饿着，
        // 池子慢慢回来，然后同一件事再发生一遍。谁也没做错，谁也活不好
        "var K=26,take=[],alive=[],stock=1,phase=0,hold=0;" +
        "function alloc(){take=[];alive=[];" +
        "for(var i=0;i<K;i++){take.push(0.10+Math.random()*0.05);alive.push(1);}" +
        "stock=1;phase=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,tot=0,liveN=0,mx=0;" +
        "for(i=0;i<K;i++)if(alive[i]){liveN++;tot+=take[i];if(take[i]>mx)mx=take[i];}" +
        // 池子按逻辑斯蒂长，取走的按各人的量扣
        "stock+=stock*(1-stock)*0.030-tot*stock*0.055;" +
        "if(stock<0)stock=0;else if(stock>1)stock=1;" +
        "for(i=0;i<K;i++){if(!alive[i])continue;" +
        // 看见别人拿得多，就跟上一点。这一行就是全部的"理性"
        "if(take[i]<mx)take[i]+=0.00042;" +
        "if(stock<0.05&&Math.random()<0.010)alive[i]=0;}" +
        "if(liveN<=1||stock<0.012){phase=1;}" +
        "if(phase===1){hold++;stock=Math.min(1,stock+0.0035);" +
        "if(hold>420){alloc();}}" +
        "G.fillStyle='#06080a';G.fillRect(0,0,W,H);" +
        "var cx=W/2,cy=H/2,R=Math.min(W,H)*0.30;" +
        "var rr=R*Math.sqrt(Math.max(0.0001,stock));" +
        "var gr=G.createRadialGradient(cx,cy,0,cx,cy,Math.max(2,rr));" +
        "gr.addColorStop(0,'rgba(120,214,190,0.92)');" +
        "gr.addColorStop(1,'rgba(40,120,120,0.10)');" +
        "G.fillStyle=gr;G.beginPath();G.arc(cx,cy,Math.max(2,rr),0,7);G.fill();" +
        "G.strokeStyle='rgba(110,150,160,0.20)';G.lineWidth=1;" +
        "G.beginPath();G.arc(cx,cy,R,0,7);G.stroke();" +
        "for(i=0;i<K;i++){var a=i/K*6.2832,d=R*1.5;" +
        "var x=cx+Math.cos(a)*d,yy=cy+Math.sin(a)*d;" +
        "if(!alive[i]){G.fillStyle='rgba(90,96,110,0.22)';" +
        "G.beginPath();G.arc(x,yy,3,0,7);G.fill();continue;}" +
        // 每个人的大小就是他现在拿多少。看着它们一起变大，然后一起没了
        "var sz=3+take[i]*46;" +
        "G.fillStyle='hsla('+((44-take[i]*180)|0)+',78%,62%,0.85)';" +
        "G.beginPath();G.arc(x,yy,sz,0,7);G.fill();" +
        "G.strokeStyle='rgba(150,200,200,0.14)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(x,yy);G.lineTo(cx,cy);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "模仿",
    html: play(
      stageCss("ut-mimic", ";background:#07080b"),
      stageBody("ut-mimic"),
      FIT +
        // 每个点有自己的一套做法（横轴）。环境的最优点在慢慢移动，
        // 每一轮大家都去抄当下表现最好的那一个。
        //
        // 于是很快所有人挤成一条线——然后最优点跳走，**所有人一起完蛋**，
        // 因为大家的答案是同一个。抄得越齐，风险越是共有的，不是分散的
        "var N=900,S,ALIVE,opt=0.5,T=[],tt=0;" +
        "function alloc(){S=new Float32Array(N);ALIVE=new Uint8Array(N);" +
        "for(var i=0;i<N;i++){S[i]=Math.random();ALIVE[i]=1;}" +
        "opt=0.5;T=[];tt=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,best=-1,bf=-1,f;" +
        "tt++;" +
        // 环境慢慢漂，偶尔跳一次。跳的那一下才是这条东西的重点
        "opt+=(Math.random()-0.5)*0.0016;" +
        "if(tt%900===0){opt=Math.random();}" +
        "if(opt<0.04)opt=0.04;else if(opt>0.96)opt=0.96;" +
        "for(i=0;i<N;i++){if(!ALIVE[i])continue;" +
        "f=1-Math.abs(S[i]-opt)*2.6;if(f>bf){bf=f;best=i;}}" +
        "var live=0;" +
        "for(i=0;i<N;i++){" +
        "if(!ALIVE[i]){if(Math.random()<0.0016){ALIVE[i]=1;" +
        "S[i]=best>=0?(S[best]+(Math.random()-0.5)*0.16):Math.random();" +
        "if(S[i]<0)S[i]=0;else if(S[i]>1)S[i]=1;}continue;}" +
        "f=1-Math.abs(S[i]-opt)*2.6;" +
        "if(f<0&&Math.random()<-f*0.09){ALIVE[i]=0;continue;}" +
        "live++;" +
        // 抄最好的那个，抄得又快又准。个体最优，群体单一
        "if(best>=0)S[i]+=(S[best]-S[i])*0.055+(Math.random()-0.5)*0.0022;" +
        "if(S[i]<0)S[i]=0;else if(S[i]>1)S[i]=1;}" +
        "var BN=150,hist=new Float32Array(BN);" +
        "for(i=0;i<N;i++){if(!ALIVE[i])continue;" +
        "var b=(S[i]*BN)|0;if(b<0)b=0;else if(b>=BN)b=BN-1;hist[b]++;}" +
        "T.push({h:hist,o:opt,n:live});" +
        "if(T.length>Math.max(70,((H-30)/2.6)|0))T.shift();" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var rows=T.length,rh=(H-24)/rows;" +
        "var SCALE=N*0.10;" +
        "for(var r=0;r<rows;r++){var e=T[r],hh=e.h;" +
        "var yy=(rows-1-r)*rh;" +
        "for(i=0;i<BN;i++){if(hh[i]<1)continue;" +
        "var v=Math.pow(Math.min(1,hh[i]/SCALE),0.6);if(v<0.05)continue;" +
        "G.fillStyle='hsla('+((150+i*0.8)|0)+',66%,'+((22+v*54)|0)+'%,'+(0.20+v*0.72).toFixed(2)+')';" +
        "G.fillRect(i/BN*W,yy,W/BN+1,rh+0.6);}" +
        // 环境最优点画成一条细线：看它什么时候跳、跳完人群怎么塌
        "G.fillStyle='rgba(255,176,110,0.5)';" +
        "G.fillRect(e.o*W-1,yy,2,rh+0.6);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "共振",
    html: play(
      stageCss("ut-reso", ";touch-action:none;cursor:ew-resize;background:#07080c"),
      stageBody("ut-reso"),
      FIT +
        // 一根梁，有它自己的固有频率。你左右晃指针就是在推它。
        // 推的节奏离固有频率越近，越省力、涨得越猛——正反馈没有自然的刹车。
        //
        // 涨过头它就断了，断成几截落下去，然后换一根新的、固有频率也换了。
        // 反的是「用力就有回报」：这里用对节奏才有，而回报的尽头是毁掉它
        "var NP=64,Y,V,f0=0,mx=0,lastx=0,lastT=0,drive=0,broke=0,bt=0,PC=[];" +
        "function alloc(){Y=new Float32Array(NP);V=new Float32Array(NP);" +
        "f0=0.055+Math.random()*0.055;broke=0;bt=0;PC=[];}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i;" +
        "if(broke){bt++;" +
        "for(i=0;i<PC.length;i++){var p=PC[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.42;p.r+=p.w;}" +
        "if(bt>190)alloc();}" +
        "else{" +
        // 一维弦：邻点拉，加一点阻尼。驱动只作用在中间那一段
        "for(i=1;i<NP-1;i++){" +
        "var acc=(Y[i-1]+Y[i+1]-2*Y[i])*f0*f0*46;" +
        "V[i]=(V[i]+acc)*0.9975;}" +
        "var mid=NP>>1;V[mid]+=drive;drive*=0.86;" +
        "for(i=1;i<NP-1;i++)Y[i]+=V[i];" +
        "Y[0]=0;Y[NP-1]=0;" +
        "mx=0;for(i=0;i<NP;i++){var a=Y[i]<0?-Y[i]:Y[i];if(a>mx)mx=a;}" +
        "if(mx>1.0){broke=1;bt=0;" +
        "for(i=0;i<NP-1;i+=4){" +
        "PC.push({x:i/(NP-1),y:Y[i],vx:(Math.random()-0.5)*3.4," +
        "vy:-2-Math.random()*3,r:Math.random()*6.28,w:(Math.random()-0.5)*0.3});}}}" +
        "G.fillStyle='#07080c';G.fillRect(0,0,W,H);" +
        "var y0=H/2,amp=Math.min(W,H)*0.30;" +
        "if(!broke){" +
        "var hot=Math.min(1,mx/1.0);" +
        "G.strokeStyle='hsla('+((196-hot*180)|0)+',82%,'+((54+hot*20)|0)+'%,0.9)';" +
        "G.lineWidth=2+hot*2.6;G.beginPath();" +
        "for(i=0;i<NP;i++){var x=i/(NP-1)*W;" +
        "if(i===0)G.moveTo(x,y0+Y[i]*amp);else G.lineTo(x,y0+Y[i]*amp);}" +
        "G.stroke();}" +
        "else{G.strokeStyle='rgba(210,150,120,0.7)';G.lineWidth=2.4;" +
        "for(i=0;i<PC.length;i++){var q=PC[i];" +
        "var px=q.x*W,py=y0+q.y*amp;" +
        "G.save();G.translate(px,py);G.rotate(q.r);" +
        "G.beginPath();G.moveTo(-W/NP*2,0);G.lineTo(W/NP*2,0);G.stroke();G.restore();}}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointermove',function(e){" +
        "var p=at(e),now=Date.now();" +
        "if(lastT){var dx=p[0]-lastx;" +
        // 推力就是你横向的速度。节奏对不对，由弦自己判断
        "drive+=dx/W*0.10;}" +
        "lastx=p[0];lastT=now;});",
    ),
  },
  {
    title: "囚徒",
    html: play(
      stageCss("ut-pd", ";background:#06070b"),
      stageBody("ut-pd"),
      FIT +
        // 空间囚徒困境。每格跟八个邻居各博弈一次，然后抄周围（含自己）得分最高的那家。
        // 背叛单次总是更划算，所以孤立的合作者必死。
        //
        // 但合作者**抱成团**就能守住边界，还能往外长。屏幕上那些不断生灭的花纹，
        // 是合作在靠聚集活着——不是靠说服，也不是靠谁更高尚
        "var GW=1,GH=1,S,S2,P,off,og,im,b=1.85;" +
        "function alloc(){GW=Math.max(90,Math.min(220,Math.round(W/6.4)));" +
        "GH=Math.max(60,Math.round(GW*H/W));" +
        "S=new Uint8Array(GW*GH);S2=new Uint8Array(GW*GH);P=new Float32Array(GW*GH);" +
        "for(var i=0;i<S.length;i++)S[i]=Math.random()<0.11?1:0;" +
        "S[((GH>>1)*GW)+(GW>>1)]=1;" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];" +
        "function step(){var x,y,i,k,me,nb,sc;" +
        // 收益：合作遇合作各得 1，背叛遇合作得 b（>1），其余为 0
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;me=S[i];" +
        // 自己也要跟自己博弈一局（Nowak-May 的原始设定）。少了这一局，
        // 合作者的团守不住边界，整片会被背叛者吃光，动态花纹根本长不出来
        "sc=(me===0)?1:0;" +
        "for(k=0;k<8;k++){nb=S[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)];" +
        "if(me===0){if(nb===0)sc+=1;}else{if(nb===0)sc+=b;}}" +
        "P[i]=sc;}" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;" +
        "var bs=P[i],bt=S[i];" +
        "for(k=0;k<8;k++){var q=((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW);" +
        "if(P[q]>bs){bs=P[q];bt=S[q];}}" +
        "S2[i]=bt;}" +
        "var t=S;S=S2;S2=t;}" +
        "var prev=null;" +
        "function draw(){var d=im.data,i,o,now,was;" +
        "for(i=0;i<S.length;i++){o=i*4;now=S[i];was=prev?prev[i]:now;" +
        // 四色：一直合作 / 一直背叛 / 刚被背叛吃掉 / 刚被合作夺回
        "if(now===0&&was===0){d[o]=46;d[o+1]=96;d[o+2]=214;}" +
        "else if(now===1&&was===1){d[o]=196;d[o+1]=44;d[o+2]=52;}" +
        "else if(now===1&&was===0){d[o]=252;d[o+1]=212;d[o+2]=90;}" +
        "else{d[o]=120;d[o+1]=232;d[o+2]=140;}}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var last=0;" +
        "function tick(){var now=Date.now();" +
        "if(now-last>110){last=now;prev=S.slice(0);step();}" +
        "draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "分岔",
    html: play(
      stageCss("ut-bif", ";background:#06070a"),
      stageBody("ut-bif"),
      FIT +
        // 一条极简单的式子：下一代 = r × 这一代 × (1 − 这一代)。
        // r 从左往右慢慢加大——先是稳定在一个值，然后两个、四个、八个……
        // 越过某一处之后，再也落不到任何固定的地方。
        //
        // 参数是连续推进的，结果不是。下面那条是当前 r 下的实际走势。
        // 反的是「可以外推」：能外推的区间是有尽头的，而且尽头没有预告
        "var off,og,col=0,rmin=2.5,rmax=4.0,hist=[];" +
        "function alloc(){off=document.createElement('canvas');" +
        "off.width=Math.max(300,Math.min(1100,Math.round(W)));" +
        "off.height=Math.max(200,Math.round(H*0.68));" +
        "og=off.getContext('2d');" +
        "og.fillStyle='#06070a';og.fillRect(0,0,off.width,off.height);" +
        "col=0;hist=[];}" +
        "onfit=alloc;alloc();" +
        "function tick(){var c,i,r,x;" +
        "for(c=0;c<3&&col<off.width;c++,col++){" +
        "r=rmin+(rmax-rmin)*(col/off.width);x=0.35;" +
        "for(i=0;i<220;i++)x=r*x*(1-x);" +
        "og.fillStyle='rgba(150,206,255,0.16)';" +
        "for(i=0;i<260;i++){x=r*x*(1-x);" +
        "og.fillRect(col,(1-x)*off.height,1,1);}}" +
        "G.fillStyle='#06070a';G.fillRect(0,0,W,H);" +
        "var bh=H*0.68;" +
        "G.imageSmoothingEnabled=true;G.drawImage(off,0,0,W,bh);" +
        "var rx=col/off.width;" +
        "G.strokeStyle='rgba(255,186,120,0.55)';G.lineWidth=1.5;" +
        "G.beginPath();G.moveTo(rx*W,0);G.lineTo(rx*W,bh);G.stroke();" +
        // 底下：当前 r 下真实的一段走势。周期一 → 二 → 四 → 乱
        "r=rmin+(rmax-rmin)*rx;x=0.35;" +
        "for(i=0;i<300;i++)x=r*x*(1-x);" +
        "hist=[];for(i=0;i<160;i++){x=r*x*(1-x);hist.push(x);}" +
        "G.strokeStyle='rgba(150,206,255,0.75)';G.lineWidth=1.2;" +
        "G.beginPath();" +
        "for(i=0;i<hist.length;i++){var px=i/(hist.length-1)*W;" +
        "var py=bh+18+(1-hist[i])*(H-bh-34);" +
        "if(i===0)G.moveTo(px,py);else G.lineTo(px,py);}" +
        "G.stroke();" +
        "if(col>=off.width){if(!tick.hold)tick.hold=0;tick.hold++;" +
        "if(tick.hold>420){tick.hold=0;alloc();}}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "红皇后",
    html: play(
      stageCss("ut-queen", ";background:#07070c"),
      stageBody("ut-queen"),
      FIT +
        // 两边都在拼命变快：谁落后，谁改进得更狠。于是两条线一起指数往上，
        // 而它们的**差**始终贴着零。
        //
        // 上面那场追逐是按相对速度画的——所以它一秒都没变过。
        // 数字在爆炸，画面纹丝不动。跑得越快，越是在原地
        "var sa=1,sb=1,T=[],ph=0;" +
        "function alloc(){sa=1;sb=1;T=[];ph=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){" +
        // 落后的一方改进得更快 —— 这就是军备竞赛稳定在零差距的原因
        "var d=sb-sa;" +
        "sa+=sa*(0.0016+Math.max(0,d)*0.0022);" +
        "sb+=sb*(0.0016+Math.max(0,-d)*0.0022);" +
        "if(sa>1e7){sa/=1e6;sb/=1e6;}" +
        "T.push([Math.log(sa),Math.log(sb)]);" +
        "if(T.length>Math.max(80,(W*0.8)|0))T.shift();" +
        "ph+=0.021;" +
        "G.fillStyle='#07070c';G.fillRect(0,0,W,H);" +
        "var top=H*0.52;" +
        // 追逐按相对速度画：两边同时快，看上去就是没变
        "var cx=W/2,cy=top*0.5,R=Math.min(W,top)*0.30;" +
        "G.strokeStyle='rgba(120,140,175,0.14)';G.lineWidth=1;" +
        "G.beginPath();G.arc(cx,cy,R,0,7);G.stroke();" +
        "var gap=0.62;" +
        "G.fillStyle='rgba(120,214,150,0.9)';" +
        "G.beginPath();G.arc(cx+Math.cos(ph)*R,cy+Math.sin(ph)*R*0.7,6,0,7);G.fill();" +
        "G.fillStyle='rgba(232,110,96,0.9)';" +
        "G.beginPath();G.arc(cx+Math.cos(ph-gap)*R,cy+Math.sin(ph-gap)*R*0.7,6,0,7);G.fill();" +
        "if(T.length<2){requestAnimationFrame(tick);return;}" +
        "var lo=1e9,hi=-1e9,i;" +
        "for(i=0;i<T.length;i++){if(T[i][0]<lo)lo=T[i][0];if(T[i][1]<lo)lo=T[i][1];" +
        "if(T[i][0]>hi)hi=T[i][0];if(T[i][1]>hi)hi=T[i][1];}" +
        "var sp=(hi-lo)||1,by=top+20,bh=H-top-40;" +
        "function line(k,col){G.strokeStyle=col;G.lineWidth=1.6;G.beginPath();" +
        "for(i=0;i<T.length;i++){var x=i/(T.length-1)*W;" +
        "var y=by+bh-(T[i][k]-lo)/sp*bh;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}G.stroke();}" +
        "line(0,'rgba(120,214,150,0.85)');line(1,'rgba(232,110,96,0.85)');" +
        // 差值：贴着零的那条。两条线冲上天，它一动不动
        "G.strokeStyle='rgba(226,238,255,0.5)';G.lineWidth=1.2;G.beginPath();" +
        "for(i=0;i<T.length;i++){var x2=i/(T.length-1)*W;" +
        "var y2=by+bh-((T[i][1]-T[i][0])*4+0.5)/1*bh*0.10-bh*0.5;" +
        "if(i===0)G.moveTo(x2,y2);else G.lineTo(x2,y2);}G.stroke();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "投票",
    html: play(
      stageCss("ut-vote", ";background:#07080b"),
      stageBody("ut-vote"),
      FIT +
        // 上半：每一格都跟着周围的多数走。于是小片的少数被抹平，边界拉直，
        // 最后整块归一。
        //
        // 下半是「记录」：一行一行往下堆。但每隔一阵，**记录会被按当下的多数重写一遍**
        // ——越往上（越早的）改得越彻底。等到全场统一，翻回去看，
        // 会显得从来就没有过第二种颜色
        "var GW=1,GH=1,S,S2,T=[],tt=0,off,og,im;" +
        "function alloc(){GW=Math.max(80,Math.min(180,Math.round(W/7.4)));" +
        "GH=Math.max(44,Math.round(GW*(H*0.5)/W));" +
        "S=new Uint8Array(GW*GH);S2=new Uint8Array(GW*GH);" +
        "for(var i=0;i<S.length;i++)S[i]=Math.random()<0.5?1:0;" +
        "T=[];tt=0;" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        "var DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];" +
        "function step(){var x,y,i,k,n;" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;n=0;" +
        "for(k=0;k<8;k++)n+=S[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)];" +
        "S2[i]=n>4?1:(n<4?0:S[i]);}" +
        "var t=S;S=S2;S2=t;}" +
        "function tick(){tt++;" +
        "if(tt%5===0)step();" +
        "var ones=0,i;for(i=0;i<S.length;i++)ones+=S[i];" +
        "var maj=ones*2>S.length?1:0,frac=ones/S.length;" +
        "if(tt%9===0){" +
        "var row=new Float32Array(GW);" +
        "for(var x2=0;x2<GW;x2++){var c=0;" +
        "for(var y2=0;y2<GH;y2++)c+=S[y2*GW+x2];row[x2]=c/GH;}" +
        "T.push(row);if(T.length>Math.max(50,((H*0.46)/2.4)|0))T.shift();" +
        // 记录被按当下的多数重写：越早的改得越狠。历史不是被删掉，是被改口径
        "for(var r=0;r<T.length;r++){var age=1-r/Math.max(1,T.length-1);" +
        "var k2=0.05+age*0.16;" +
        "for(var q=0;q<GW;q++)T[r][q]+=((maj?1:0)-T[r][q])*k2;}}" +
        "var d=im.data;" +
        "for(i=0;i<S.length;i++){var o=i*4;" +
        "if(S[i]){d[o]=228;d[o+1]=176;d[o+2]=96;}else{d[o]=72;d[o+1]=126;d[o+2]=206;}}" +
        "og.putImageData(im,0,0);" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "G.imageSmoothingEnabled=false;G.drawImage(off,0,0,W,H*0.50);" +
        "var rows=T.length,rh=(H*0.46)/Math.max(1,rows),by=H*0.52;" +
        "for(var r2=0;r2<rows;r2++){var rw=T[rows-1-r2];" +
        "for(var q2=0;q2<GW;q2++){var v=rw[q2];" +
        "var rr=(72+(228-72)*v)|0,gg=(126+(176-126)*v)|0,bb=(206+(96-206)*v)|0;" +
        "G.fillStyle='rgb('+rr+','+gg+','+bb+')';" +
        "G.fillRect(q2/GW*W,by+r2*rh,W/GW+1,rh+0.6);}}" +
        "if(frac<0.006||frac>0.994){if(!tick.h)tick.h=0;tick.h++;" +
        "if(tick.h>260){tick.h=0;alloc();}}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "谢林",
    html: play(
      stageCss("ut-schel", ";background:#07080b"),
      stageBody("ut-schel"),
      FIT +
        // 每个人的要求都不高：周围的邻居里，跟我同类的**只要有四成**就满意——
        // 也就是八个邻居里有三到四个。这不是什么苛刻的条件。
        // 不满意的就搬到随便一个空位去。没有人排斥谁，没有人有恶意。
        //
        // 然后你看着它彻底隔离。温和的个体偏好，加总起来不是温和的结果
        "var GW=1,GH=1,C,EMP=[],off,og,im,TH=0.42,hold=0;" +
        "function alloc(){GW=Math.max(70,Math.min(150,Math.round(W/9)));" +
        "GH=Math.max(44,Math.round(GW*H/W));" +
        "C=new Uint8Array(GW*GH);" +
        "for(var i=0;i<C.length;i++)C[i]=Math.random()<0.10?0:(Math.random()<0.5?1:2);" +
        "off=document.createElement('canvas');off.width=GW;off.height=GH;" +
        "og=off.getContext('2d');im=og.createImageData(GW,GH);" +
        "var d=im.data;for(var j=0;j<GW*GH;j++)d[j*4+3]=255;hold=0;}" +
        "onfit=alloc;alloc();" +
        "var DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];" +
        "function happy(x,y,me){var same=0,occ=0,k;" +
        "for(k=0;k<8;k++){var v=C[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)];" +
        "if(!v)continue;occ++;if(v===me)same++;}" +
        "return occ===0?1:(same/occ>=TH?1:0);}" +
        "function step(){var x,y,i,moved=0;" +
        "EMP=[];for(i=0;i<C.length;i++)if(!C[i])EMP.push(i);" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;var me=C[i];" +
        "if(!me||happy(x,y,me))continue;" +
        "if(!EMP.length)continue;" +
        "var k=(Math.random()*EMP.length)|0,dst=EMP[k];" +
        "C[dst]=me;C[i]=0;EMP[k]=i;moved++;}" +
        "return moved;}" +
        "function seg(){var same=0,occ=0,x,y,k;" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){var me=C[y*GW+x];if(!me)continue;" +
        "for(k=0;k<8;k++){var v=C[((y+DY[k]+GH)%GH)*GW+((x+DX[k]+GW)%GW)];" +
        "if(!v)continue;occ++;if(v===me)same++;}}" +
        "return occ?same/occ:0;}" +
        "function draw(){var d=im.data,i,o,v;" +
        "for(i=0;i<C.length;i++){o=i*4;v=C[i];" +
        "if(!v){d[o]=12;d[o+1]=13;d[o+2]=18;}" +
        "else if(v===1){d[o]=76;d[o+1]=150;d[o+2]=222;}" +
        "else{d[o]=232;d[o+1]=158;d[o+2]=88;}}" +
        "og.putImageData(im,0,0);G.imageSmoothingEnabled=false;" +
        "G.clearRect(0,0,W,H);G.drawImage(off,0,0,W,H);}" +
        "var last=0;" +
        "function tick(){var now=Date.now();" +
        "if(now-last>90){last=now;var mv=step();" +
        // 没人再想搬了 = 隔离完成。停一会儿让你看清，然后重新洗牌再来一遍
        // hold 数的是步不是帧，一步 90ms——原来 320 步是停 29 秒，
        // 看着跟死了没区别。112 步约 10 秒，够看清隔离的样子
        "if(mv<2){hold++;if(hold>112)alloc();}else hold=0;}" +
        "draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "零和",
    html: play(
      stageCss("ut-wealth", ";background:#06070a"),
      stageBody("ut-wealth"),
      FIT +
        // 六百个人，每人手上一样多。反复随便挑两个，把两人的钱合起来
        // **随机地**重分——没有技巧、没有优势、没有谁更努力，完全公平。
        //
        // 然后就这么分成了几个人拿走大半。极端不平等不需要有人作恶，
        // 也不需要谁更聪明：随机的公平交换自己就会走到这儿
        "var N=600,Wl,srt,init=0;" +
        "function alloc(){Wl=new Float64Array(N);" +
        "for(var i=0;i<N;i++)Wl[i]=1;srt=new Float64Array(N);init=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,j,k,pool,r;" +
        "for(k=0;k<900;k++){" +
        "i=(Math.random()*N)|0;j=(Math.random()*N)|0;if(i===j)continue;" +
        // 完全对称：两人的钱合起来，随机切一刀。谁也没占谁便宜
        "pool=Wl[i]+Wl[j];r=Math.random();Wl[i]=pool*r;Wl[j]=pool*(1-r);}" +
        "init++;" +
        "for(i=0;i<N;i++)srt[i]=Wl[i];" +
        "srt.sort();" +
        "G.fillStyle='#06070a';G.fillRect(0,0,W,H);" +
        "var bw=W/N,mx=srt[N-1]||1;" +
        // 起点那条水平线一直留着：所有人一样多的时候是什么样
        "var flatY=H-24-(1/mx)*(H-60);" +
        "G.strokeStyle='rgba(150,170,200,0.28)';G.lineWidth=1;" +
        "G.setLineDash([5,5]);G.beginPath();" +
        "G.moveTo(0,Math.max(2,flatY));G.lineTo(W,Math.max(2,flatY));G.stroke();" +
        "G.setLineDash([]);" +
        "for(i=0;i<N;i++){var v=srt[i]/mx;" +
        "var hh=v*(H-60),x=i*bw;" +
        "G.fillStyle='hsla('+((196-v*172)|0)+',74%,'+((44+v*22)|0)+'%,0.92)';" +
        "G.fillRect(x,H-24-hh,Math.max(1,bw-0.4),hh);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "绩效",
    html: play(
      stageCss("ut-rankcull", ";background:#07070b"),
      stageBody("ut-rankcull"),
      FIT +
        // 每一轮按水平排序，末位淘汰两成，补进新人。活下来的人还会继续变强。
        // 于是那条淘汰线**一直往上爬**。
        //
        // 虚线是最开始那轮的中位数。爬到后来，被淘汰的人比当初的中上游还强——
        // 他们没有变差，只是标准是相对的。相对评价永远制造失败者，和绝对水平无关
        "var N=260,Q,line=0,base=0,T=[],rounds=0,acc=0;" +
        "function alloc(){Q=new Float64Array(N);" +
        "for(var i=0;i<N;i++)Q[i]=0.30+Math.random()*0.40;" +
        "var s=Array.from(Q).sort(function(a,b){return a-b;});" +
        "base=s[(N/2)|0];line=0;T=[];rounds=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){var i;" +
        "for(i=0;i<N;i++)Q[i]+=0.0016+Math.random()*0.0024;" +
        "var idx=[];for(i=0;i<N;i++)idx.push(i);" +
        "idx.sort(function(a,b){return Q[a]-Q[b];});" +
        "var cut=(N*0.20)|0;" +
        "line=Q[idx[cut]];" +
        // 补进来的新人不比留下的差：他们就在当前分布里抽样。差的只是名次
        "for(i=0;i<cut;i++)Q[idx[i]]=line+(Math.random()-0.35)*0.10;" +
        "rounds++;T.push(line);if(T.length>240)T.shift();}" +
        "function tick(){acc++;if(acc>14){acc=0;round();}" +
        "G.fillStyle='#07070b';G.fillRect(0,0,W,H);" +
        "var lo=0.2,hi=Math.max(1.0,line+0.35);" +
        "function ty(q){return H-26-((q-lo)/(hi-lo))*(H-60);}" +
        "var i;" +
        "for(i=0;i<N;i++){var x=(i/N)*W*0.94+W*0.03,y=ty(Q[i]);" +
        "var doomed=Q[i]<line?1:0;" +
        "G.fillStyle=doomed?'rgba(226,110,96,0.85)':'rgba(140,200,230,0.72)';" +
        "G.beginPath();G.arc(x,y,2.6,0,7);G.fill();}" +
        "G.strokeStyle='rgba(255,170,110,0.85)';G.lineWidth=1.6;" +
        "G.beginPath();G.moveTo(0,ty(line));G.lineTo(W,ty(line));G.stroke();" +
        // 最初那轮的中位数。淘汰线爬到它上面之后，故事就说完了
        "G.strokeStyle='rgba(170,186,214,0.42)';G.lineWidth=1;G.setLineDash([6,6]);" +
        "G.beginPath();G.moveTo(0,ty(base));G.lineTo(W,ty(base));G.stroke();" +
        "G.setLineDash([]);" +
        "if(T.length>1){G.strokeStyle='rgba(255,170,110,0.30)';G.lineWidth=1;" +
        "G.beginPath();" +
        "for(i=0;i<T.length;i++){var xx=i/(T.length-1)*W;" +
        "if(i===0)G.moveTo(xx,ty(T[i]));else G.lineTo(xx,ty(T[i]));}G.stroke();}" +
        "if(line>hi-0.05)alloc();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "级联",
    html: play(
      stageCss("ut-casc", ";background:#06070b"),
      stageBody("ut-casc"),
      FIT +
        // 每个人先拿到一条只有六成准的私人线索，再看前面所有人**公开选了什么**。
        // 只要公开票差到两票，理性的做法就是跟票——自己那条线索从此不再进入决策。
        //
        // 下排小点是各人真正拿到的线索，上排大点是他们公开的选择。级联一开始，
        // 两排就对不上了：所有人的信息都还在，只是一条也没被用上。而且它可能整队错
        "var N=64,sig=[],pub=[],truth=0,k=0,acc=0,P=0.60;" +
        "function alloc(){truth=Math.random()<0.5?0:1;sig=[];pub=[];k=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        "function stepOne(){" +
        "var s=Math.random()<P?truth:1-truth;sig.push(s);" +
        "var a=0,b=0,i;" +
        "for(i=0;i<pub.length;i++){if(pub[i]===0)a++;else b++;}" +
        // 公开票差到两票就跟票，这是贝叶斯理性的结果，不是从众的性格问题
        "if(a-b>=2)pub.push(0);else if(b-a>=2)pub.push(1);else pub.push(s);}" +
        "function tick(){acc++;" +
        "if(acc>16){acc=0;if(k<N){stepOne();k++;}else{acc=-160;alloc();}}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var y1=H*0.40,y2=H*0.62,bw=W*0.94/N,x0=W*0.03;" +
        "var i;" +
        "for(i=0;i<pub.length;i++){var x=x0+bw*(i+0.5);" +
        "var okS=sig[i]===truth,okP=pub[i]===truth;" +
        "G.fillStyle=sig[i]===0?'rgba(96,164,224,0.34)':'rgba(232,158,88,0.34)';" +
        "G.beginPath();G.arc(x,y2,Math.max(2,bw*0.16),0,7);G.fill();" +
        "G.fillStyle=pub[i]===0?'rgba(96,164,224,0.95)':'rgba(232,158,88,0.95)';" +
        "G.beginPath();G.arc(x,y1,Math.max(3,bw*0.30),0,7);G.fill();" +
        // 公开选择跟自己的线索不一致时，连一条线：级联开始之后这些线会连成一片
        "if(sig[i]!==pub[i]){G.strokeStyle='rgba(226,110,96,0.55)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(x,y1+bw*0.30);G.lineTo(x,y2-bw*0.16);G.stroke();}}" +
        // 最左边那一小段是真相的颜色。整队跟错的时候，一眼看得出
        "G.fillStyle=truth===0?'rgba(96,164,224,0.9)':'rgba(232,158,88,0.9)';" +
        "G.fillRect(x0-W*0.018,y1-3,W*0.012,6);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "蝴蝶",
    html: play(
      stageCss("ut-fly", ";background:#06070c"),
      stageBody("ut-fly"),
      FIT +
        // 两套一模一样的双摆，只有一个差别：其中一个的起始角多了 0.000000001。
        // 一开始它们完全重合，你只看得见一条。
        //
        // 底下那条是它们的差距，对数刻度——**从第一帧起就在稳稳地涨**。
        // 也就是说，分开这件事早就发生了，只是要等到某一刻才够大到看得见。
        // 「不可预测」不是因为算得不够细
        "var A=[0,0,0,0],B=[0,0,0,0],T=[],cx=0,cy=0,L1=1,L2=1,age=0;" +
        "function reset(){var a=2.0+Math.random()*0.8;" +
        "A=[a,a*0.6,0,0];B=[a+1e-9,a*0.6,0,0];T=[];age=0;}" +
        "function geo(){var k=Math.min(W,H*0.62);L1=k*0.21;L2=k*0.19;cx=W/2;cy=H*0.30;}" +
        "onfit=function(){geo();reset();};geo();reset();" +
        "function phys(S,dt){var a1=S[0],a2=S[1],v1=S[2],v2=S[3];" +
        "var l1=1,l2=0.9,m1=1.2,m2=1,g=9.8;" +
        "var s=Math.sin(a1-a2),c=Math.cos(a1-a2),c2=Math.cos(2*(a1-a2));" +
        "var den=2*m1+m2-m2*c2;if(Math.abs(den)<1e-9)return;" +
        "var ac1=(-g*(2*m1+m2)*Math.sin(a1)-m2*g*Math.sin(a1-2*a2)-" +
        "2*s*m2*(v2*v2*l2+v1*v1*l1*c))/(l1*den);" +
        "var ac2=(2*s*(v1*v1*l1*(m1+m2)+g*(m1+m2)*Math.cos(a1)+v2*v2*l2*m2*c))/(l2*den);" +
        "S[2]=v1+ac1*dt;S[3]=v2+ac2*dt;S[0]=a1+S[2]*dt;S[1]=a2+S[3]*dt;}" +
        "function arm(S,col,w){" +
        "var x1=cx+Math.sin(S[0])*L1,y1=cy+Math.cos(S[0])*L1;" +
        "var x2=x1+Math.sin(S[1])*L2,y2=y1+Math.cos(S[1])*L2;" +
        "G.strokeStyle=col;G.lineWidth=w;G.lineCap='round';" +
        "G.beginPath();G.moveTo(cx,cy);G.lineTo(x1,y1);G.lineTo(x2,y2);G.stroke();" +
        "G.fillStyle=col;G.beginPath();G.arc(x2,y2,w*2.4,0,7);G.fill();}" +
        "function tick(){var i;age++;" +
        "for(i=0;i<6;i++){phys(A,0.006);phys(B,0.006);}" +
        "var d=Math.abs(A[0]-B[0])+Math.abs(A[1]-B[1]);" +
        "if(d<1e-15)d=1e-15;" +
        "T.push(Math.log(d));if(T.length>Math.max(80,(W*0.8)|0))T.shift();" +
        "G.fillStyle='#06070c';G.fillRect(0,0,W,H);" +
        // 先画后一个，再画前一个：重合的时候你只会看到一条
        "arm(B,'rgba(232,132,96,0.9)',2.4);" +
        "arm(A,'rgba(120,200,240,0.9)',2.0);" +
        "var by=H-22,bh=H*0.22;" +
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "if(T.length>1){G.strokeStyle='rgba(255,186,120,0.9)';G.lineWidth=1.5;" +
        "G.beginPath();" +
        "for(i=0;i<T.length;i++){var x=i/(T.length-1)*W;" +
        // 从 e^-35 到 e^0 映到条高：直线上升就是指数发散
        "var y=by-((T[i]+35)/35)*bh;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}G.stroke();}" +
        "if(d>1.4&&age>900)reset();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "过拟合",
    html: play(
      stageCss("ut-overfit", ";background:#07080b"),
      stageBody("ut-overfit"),
      FIT +
        // 灰点是训练数据（一条平缓的真曲线加噪声）。橙线是模型，次数从低到高扫。
        //
        // 次数一高，它就**穿过每一个训练点**——对已有数据解释得完美无缺。
        // 而红点是它没见过的数据，那时候它错得离谱，两点之间还会甩出去。
        // 把每个数据点都解释清楚的模型，什么都预测不了
        "var XS=[],YS=[],VX=[],VY=[],deg=1,acc=0,co=[];" +
        "function truth(x){return 0.45+0.30*Math.sin(x*2.1+0.4)-0.10*x;}" +
        "function alloc(){XS=[];YS=[];VX=[];VY=[];deg=1;acc=0;" +
        "for(var i=0;i<13;i++){var x=-1+2*i/12+(Math.random()-0.5)*0.05;" +
        "XS.push(x);YS.push(truth(x)+(Math.random()-0.5)*0.16);}" +
        "for(i=0;i<9;i++){var vx=-0.92+1.84*Math.random();" +
        "VX.push(vx);VY.push(truth(vx)+(Math.random()-0.5)*0.16);}" +
        "lsq();}" +
        // 最小二乘：正规方程 + 高斯消元。次数一高矩阵会病态——那正是它甩出去的原因
        // 不能叫 fit —— `FIT` 里已经有一个 function fit()（按容器重开画布）。
        // 函数声明提升会让后定义的覆盖前面的，FIT 末尾那句 fit() 就会调到这里来
        "function lsq(){var n=deg+1,i,j,k,M=[],b=[];" +
        "for(i=0;i<n;i++){M.push(new Float64Array(n));b.push(0);}" +
        "for(k=0;k<XS.length;k++){var p=[],x=XS[k];p.push(1);" +
        "for(i=1;i<n;i++)p.push(p[i-1]*x);" +
        "for(i=0;i<n;i++){b[i]+=p[i]*YS[k];" +
        "for(j=0;j<n;j++)M[i][j]+=p[i]*p[j];}}" +
        "for(i=0;i<n;i++)M[i][i]+=1e-9;" +
        "for(i=0;i<n;i++){var piv=i;" +
        "for(j=i+1;j<n;j++)if(Math.abs(M[j][i])>Math.abs(M[piv][i]))piv=j;" +
        "var tm=M[i];M[i]=M[piv];M[piv]=tm;var tb=b[i];b[i]=b[piv];b[piv]=tb;" +
        "if(Math.abs(M[i][i])<1e-14)continue;" +
        "for(j=i+1;j<n;j++){var f=M[j][i]/M[i][i];" +
        "for(k=i;k<n;k++)M[j][k]-=f*M[i][k];b[j]-=f*b[i];}}" +
        "co=new Float64Array(n);" +
        "for(i=n-1;i>=0;i--){var s=b[i];" +
        "for(j=i+1;j<n;j++)s-=M[i][j]*co[j];" +
        "co[i]=Math.abs(M[i][i])<1e-14?0:s/M[i][i];}}" +
        "function ev(x){var s=0,p=1;" +
        "for(var i=0;i<co.length;i++){s+=co[i]*p;p*=x;}return s;}" +
        "onfit=alloc;alloc();" +
        "function px(x){return (x+1)/2*W*0.92+W*0.04;}" +
        "function py(y){return H*0.88-y*H*0.62;}" +
        "function tick(){acc++;" +
        "if(acc>150){acc=0;deg++;if(deg>12){deg=1;alloc();}lsq();}" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var i;" +
        "G.strokeStyle='rgba(130,150,180,0.28)';G.lineWidth=1.4;G.beginPath();" +
        "for(i=0;i<=200;i++){var x=-1+2*i/200;" +
        "if(i===0)G.moveTo(px(x),py(truth(x)));else G.lineTo(px(x),py(truth(x)));}" +
        "G.stroke();" +
        "G.strokeStyle='rgba(255,176,110,0.95)';G.lineWidth=2;G.beginPath();" +
        "var started=0;" +
        "for(i=0;i<=400;i++){var x2=-1+2*i/400,y2=py(ev(x2));" +
        "if(y2<-H*2||y2>H*3){started=0;continue;}" +
        "if(!started){G.moveTo(px(x2),y2);started=1;}else G.lineTo(px(x2),y2);}" +
        "G.stroke();" +
        "G.fillStyle='rgba(190,204,228,0.85)';" +
        "for(i=0;i<XS.length;i++){G.beginPath();" +
        "G.arc(px(XS[i]),py(YS[i]),4,0,7);G.fill();}" +
        "G.fillStyle='rgba(232,96,90,0.95)';" +
        "for(i=0;i<VX.length;i++){G.beginPath();" +
        "G.arc(px(VX[i]),py(VY[i]),3.4,0,7);G.fill();}" +
        // 底下的短杠：次数。它一格一格往右走，画面就一步步失控
        "for(i=0;i<12;i++){G.fillStyle=i<deg?'rgba(255,176,110,0.85)':'rgba(140,158,186,0.20)';" +
        "G.fillRect(W*0.30+i*W*0.033,H-16,W*0.024,4);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "辛普森",
    html: play(
      stageCss("ut-simp", ";background:#07080c"),
      stageBody("ut-simp"),
      FIT +
        // 同一批点。分成两组看，每一组的趋势都是**往上**的；
        // 合起来看，整体的趋势是**往下**的。
        //
        // 两条结论都对，用的是同一份数据。它反复在"分组"和"合并"之间切换——
        // 看清楚：变的只是你怎么切它。「让数据说话」是句空话
        "var P=[],mode=0,acc=0,mix=0;" +
        "function alloc(){P=[];" +
        // A 组 x 小 y 高，B 组 x 大 y 低；组内都是正斜率
        "for(var i=0;i<130;i++){var x=0.06+Math.random()*0.38;" +
        "P.push({x:x,y:0.48+ (x-0.25)*0.55+(Math.random()-0.5)*0.13,g:0});}" +
        "for(i=0;i<130;i++){var x2=0.56+Math.random()*0.38;" +
        "P.push({x:x2,y:0.20+(x2-0.75)*0.55+(Math.random()-0.5)*0.13,g:1});}" +
        "mode=0;acc=0;mix=0;}" +
        "onfit=alloc;alloc();" +
        "function lin(sel){var n=0,sx=0,sy=0,sxx=0,sxy=0,i;" +
        "for(i=0;i<P.length;i++){if(sel>=0&&P[i].g!==sel)continue;" +
        "n++;sx+=P[i].x;sy+=P[i].y;sxx+=P[i].x*P[i].x;sxy+=P[i].x*P[i].y;}" +
        "var d=n*sxx-sx*sx;if(Math.abs(d)<1e-9)return[0,0];" +
        "var b=(n*sxy-sx*sy)/d;return[b,(sy-b*sx)/n];}" +
        "function px(x){return x*W*0.88+W*0.06;}" +
        "function py(y){return H*0.90-y*H*0.74;}" +
        "function seg(f,col,w){G.strokeStyle=col;G.lineWidth=w;G.beginPath();" +
        "G.moveTo(px(0.02),py(f[0]*0.02+f[1]));" +
        "G.lineTo(px(0.98),py(f[0]*0.98+f[1]));G.stroke();}" +
        "function tick(){acc++;" +
        "if(acc>230){acc=0;mode=1-mode;}" +
        "mix+=((mode?1:0)-mix)*0.045;" +
        "G.fillStyle='#07080c';G.fillRect(0,0,W,H);" +
        "var i;" +
        "for(i=0;i<P.length;i++){var p=P[i];" +
        // 合并模式下两组的颜色收敛到同一个灰：分组信息被抹掉的那一刻
        "var r=(96+(150-96)*mix)|0,g2=((p.g?150:180)+(160-(p.g?150:180))*mix)|0;" +
        "var b=((p.g?90:230)+(180-(p.g?90:230))*mix)|0;" +
        "G.fillStyle='rgba('+r+','+g2+','+b+',0.80)';" +
        "G.beginPath();G.arc(px(p.x),py(p.y),3,0,7);G.fill();}" +
        "var fa=lin(0),fb=lin(1),fall=lin(-1);" +
        "G.globalAlpha=1-mix;" +
        "seg(fa,'rgba(120,190,240,0.95)',2.2);seg(fb,'rgba(240,170,110,0.95)',2.2);" +
        "G.globalAlpha=mix;" +
        "seg(fall,'rgba(236,242,255,0.95)',2.6);" +
        "G.globalAlpha=1;" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "锦标赛",
    html: play(
      stageCss("ut-tour", ";background:#06070b"),
      stageBody("ut-tour"),
      FIT +
        // 六十四个选手，**实力完全一样**。每一场都是掷硬币。
        // 于是照样会有人一路连胜、拿到冠军，看上去像个故事。
        //
        // 底下一排是历届冠军的号码。它们均匀地铺满整条——冠军是噪声的产物，
        // 只是噪声长得很像实力。反的是"结果可以倒推原因"
        "var N=64,rnd=[],cur=0,acc=0,hist=[],champ=-1;" +
        "function alloc(){rnd=[[]];for(var i=0;i<N;i++)rnd[0].push(i);" +
        "cur=0;acc=0;champ=-1;}" +
        "onfit=function(){alloc();hist=[];};alloc();" +
        "function tick(){acc++;" +
        "if(acc>34){acc=0;" +
        "var last=rnd[rnd.length-1];" +
        "if(last.length>1){var nxt=[];" +
        // 每一场都是纯粹的硬币。没有任何选手比别人强
        "for(var i=0;i<last.length;i+=2)" +
        "nxt.push(Math.random()<0.5?last[i]:last[i+1]);" +
        "rnd.push(nxt);}" +
        "else{if(champ<0){champ=last[0];hist.push(champ);" +
        "if(hist.length>420)hist.shift();}" +
        "cur++;if(cur>50){alloc();}}}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var top=H*0.10,bh=H*0.66,R=rnd.length,i,j;" +
        "for(i=0;i<R;i++){var row=rnd[i];" +
        "var y=top+bh*(i/Math.max(1,6));" +
        "for(j=0;j<row.length;j++){" +
        "var x=W*0.06+W*0.88*((j+0.5)/row.length);" +
        "var win=(i===R-1&&row.length===1);" +
        "G.fillStyle=win?'rgba(255,214,130,0.95)':'hsla('+((row[j]*5.6)|0)+',62%,62%,0.85)';" +
        "G.beginPath();G.arc(x,y,win?7:3.4,0,7);G.fill();" +
        "if(i>0){var prev=rnd[i-1];" +
        "G.strokeStyle='rgba(130,150,185,0.22)';G.lineWidth=1;" +
        "for(var k=j*2;k<j*2+2&&k<prev.length;k++){" +
        "var pxx=W*0.06+W*0.88*((k+0.5)/prev.length);" +
        "var pyy=top+bh*((i-1)/Math.max(1,6));" +
        "G.beginPath();G.moveTo(pxx,pyy);G.lineTo(x,y);G.stroke();}}}}" +
        // 历届冠军：铺满整条 = 谁都可能，跟实力无关
        "var by=H-26;" +
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(W*0.06,by);G.lineTo(W*0.94,by);G.stroke();" +
        "for(i=0;i<hist.length;i++){" +
        "var hx=W*0.06+W*0.88*(hist[i]/(N-1));" +
        "G.fillStyle='hsla('+((hist[i]*5.6)|0)+',62%,62%,0.55)';" +
        "G.fillRect(hx-1.4,by-9,2.8,18);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "孔多塞",
    html: play(
      stageCss("ut-cond", ";background:#07080c"),
      stageBody("ut-cond"),
      FIT +
        // 三个选项，一群人各有自己的排序。两两拿出来比，都按多数决：
        // 甲胜乙、乙胜丙、丙胜甲。箭头绕成一个圈。
        //
        // 没有谁是多数派选出来的赢家——**根本不存在这样一个赢家**。
        // "按多数来"这句话在这里没有指代，改一下比较的顺序就能换个结果。
        // 反的是"投票能得出集体的意愿"
        "var G3=[],pair=[[0,1],[1,2],[2,0]],acc=0,margin=[0,0,0],win=[0,0,0];" +
        "function alloc(){" +
        // 三种排序各占一块，比例带随机。这个结构必然出环
        "G3=[{o:[0,1,2],n:0},{o:[1,2,0],n:0},{o:[2,0,1],n:0}];" +
        "var tot=0,i;" +
        "for(i=0;i<3;i++){G3[i].n=26+((Math.random()*22)|0);tot+=G3[i].n;}" +
        "compute();}" +
        "function prefers(o,a,b){return o.indexOf(a)<o.indexOf(b);}" +
        "function compute(){for(var k=0;k<3;k++){" +
        "var a=pair[k][0],b=pair[k][1],ca=0,cb=0;" +
        "for(var g=0;g<3;g++){if(prefers(G3[g].o,a,b))ca+=G3[g].n;else cb+=G3[g].n;}" +
        "win[k]=ca>cb?a:b;margin[k]=Math.abs(ca-cb)/(ca+cb);}}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;if(acc>420){acc=0;alloc();}" +
        "G.fillStyle='#07080c';G.fillRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.42,R=Math.min(W,H)*0.26;" +
        "var COL=['rgba(120,190,240,','rgba(240,170,110,','rgba(150,220,160,'];" +
        "function nx(i){return cx+Math.cos(-1.5708+i*2.0944)*R;}" +
        "function ny(i){return cy+Math.sin(-1.5708+i*2.0944)*R;}" +
        "var k;" +
        "for(k=0;k<3;k++){var a=pair[k][0],b=pair[k][1];" +
        "var from=win[k],to=(from===a)?b:a;" +
        "var x1=nx(from),y1=ny(from),x2=nx(to),y2=ny(to);" +
        "var dx=x2-x1,dy=y2-y1,d=Math.sqrt(dx*dx+dy*dy)||1;" +
        "var pad=Math.min(W,H)*0.055;" +
        "x1+=dx/d*pad;y1+=dy/d*pad;x2-=dx/d*pad;y2-=dy/d*pad;" +
        "G.strokeStyle='rgba(226,238,255,'+(0.28+margin[k]*1.4).toFixed(2)+')';" +
        "G.lineWidth=1.5+margin[k]*14;G.lineCap='round';" +
        "G.beginPath();G.moveTo(x1,y1);G.lineTo(x2,y2);G.stroke();" +
        // 箭头：三条首尾相接，绕成一个圈
        "var ang=Math.atan2(y2-y1,x2-x1),hs=8+margin[k]*16;" +
        "G.beginPath();G.moveTo(x2,y2);" +
        "G.lineTo(x2-Math.cos(ang-0.42)*hs,y2-Math.sin(ang-0.42)*hs);" +
        "G.lineTo(x2-Math.cos(ang+0.42)*hs,y2-Math.sin(ang+0.42)*hs);" +
        "G.closePath();G.fillStyle='rgba(226,238,255,0.75)';G.fill();}" +
        "for(k=0;k<3;k++){G.fillStyle=COL[k]+'0.95)';" +
        "G.beginPath();G.arc(nx(k),ny(k),Math.min(W,H)*0.045,0,7);G.fill();}" +
        // 底下三堆是选民：每堆的排序用三个小点从左到右表示
        "var by=H*0.80,bw=W*0.24;" +
        "for(var g=0;g<3;g++){var ox=W*0.14+g*W*0.26;" +
        "for(k=0;k<3;k++){G.fillStyle=COL[G3[g].o[k]]+'0.9)';" +
        "G.beginPath();G.arc(ox+k*18,by,6,0,7);G.fill();}" +
        "G.fillStyle='rgba(150,168,196,0.35)';" +
        "for(var m=0;m<G3[g].n;m++)" +
        "G.fillRect(ox-6+(m%18)*4.6,by+18+((m/18)|0)*5,3,3);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "赢家诅咒",
    html: play(
      stageCss("ut-curse", ";background:#06070b"),
      stageBody("ut-curse"),
      FIT +
        // 一件东西有个真实价值（那条横线）。十二个人各自估价，估得有高有低，
        // **平均下来是准的**——大家合起来没有偏见。
        //
        // 但拍卖只有出价最高的人拿走。而出价最高的，恰恰是高估得最离谱的那个。
        // 底下那条是历次"赢家比真值高出多少"，它一直在零以上。
        // 竞争没有筛出最懂的人，筛出的是错得最乐观的那个
        "var V=0.5,E=[],hist=[],acc=0,N=12,winIdx=0,avg=0;" +
        "function roll(){E=[];var s=0;" +
        "for(var i=0;i<N;i++){var e=V+(Math.random()+Math.random()+Math.random()-1.5)*0.22;" +
        "E.push(e);s+=e;}" +
        "avg=s/N;winIdx=0;" +
        "for(i=1;i<N;i++)if(E[i]>E[winIdx])winIdx=i;" +
        "hist.push(E[winIdx]-V);if(hist.length>200)hist.shift();}" +
        "onfit=function(){hist=[];roll();};roll();" +
        "function tick(){acc++;if(acc>46){acc=0;roll();}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var top=H*0.10,bh=H*0.48;" +
        "function py(v){return top+bh-(v-0.0)/1.0*bh;}" +
        "G.strokeStyle='rgba(226,238,255,0.55)';G.lineWidth=1.6;" +
        "G.setLineDash([7,6]);G.beginPath();" +
        "G.moveTo(W*0.05,py(V));G.lineTo(W*0.95,py(V));G.stroke();G.setLineDash([]);" +
        "var i;" +
        "for(i=0;i<N;i++){var x=W*0.10+W*0.80*(i/(N-1));" +
        "var isw=i===winIdx;" +
        "G.strokeStyle='rgba(130,150,185,0.30)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(x,py(V));G.lineTo(x,py(E[i]));G.stroke();" +
        "G.fillStyle=isw?'rgba(255,186,110,0.98)':'rgba(150,182,222,0.75)';" +
        "G.beginPath();G.arc(x,py(E[i]),isw?8:4.4,0,7);G.fill();}" +
        // 所有估价的平均：正好落在真值线上。个体无偏，赢家有偏
        "G.fillStyle='rgba(140,220,180,0.95)';" +
        "G.beginPath();G.arc(W*0.05,py(avg),5,0,7);G.fill();" +
        "var by=H-24,gh=H*0.24;" +
        "G.strokeStyle='rgba(150,170,200,0.22)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "if(hist.length>1){G.strokeStyle='rgba(255,150,110,0.9)';G.lineWidth=1.5;" +
        "G.beginPath();" +
        "for(i=0;i<hist.length;i++){var xx=i/(hist.length-1)*W;" +
        "var yy=by-Math.max(0,Math.min(1,hist[i]/0.5))*gh;" +
        "if(i===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();" +
        "var s=0;for(i=0;i<hist.length;i++)s+=hist[i];" +
        "var m=by-Math.max(0,Math.min(1,(s/hist.length)/0.5))*gh;" +
        "G.strokeStyle='rgba(255,200,150,0.45)';G.setLineDash([5,5]);" +
        "G.beginPath();G.moveTo(0,m);G.lineTo(W,m);G.stroke();G.setLineDash([]);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "柠檬市场",
    html: play(
      stageCss("ut-lemon", ";background:#07070b"),
      stageBody("ut-lemon"),
      FIT +
        // 卖家手上的东西有好有坏（纵轴）。买家看不出好坏，只肯按**平均水平**出价
        // ——那条横线。
        //
        // 于是东西比出价好的卖家退出（不值得卖）。剩下的平均就更差，价再往下掉，
        // 又一批退出。一层层塌下去，最后只剩最差的还在市场上。
        //
        // 没有人撒谎，也没有人作恶。只是信息不对称，好东西被逐出去了
        "var N=420,Q,alive,price=1,acc=0,phase=0,hold=0;" +
        "function alloc(){Q=new Float64Array(N);alive=new Uint8Array(N);" +
        "for(var i=0;i<N;i++){Q[i]=Math.random();alive[i]=1;}" +
        "price=1;phase=0;hold=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        "function step(){var i,s=0,n=0;" +
        "for(i=0;i<N;i++)if(alive[i]){s+=Q[i];n++;}" +
        "if(!n){phase=1;return;}" +
        // 买家只肯出平均值。这是理性的：他分不出好坏
        "var target=s/n;price+=(target-price)*0.20;" +
        "var out=0;" +
        "for(i=0;i<N;i++){if(!alive[i])continue;" +
        // 东西比价钱好，就不卖了。退出的永远是好的那一批
        "if(Q[i]>price+0.012){alive[i]=0;out++;}}" +
        "if(out===0&&n<N*0.10)phase=1;}" +
        "function tick(){acc++;" +
        "if(phase===0){if(acc>16){acc=0;step();}}" +
        "else{hold++;if(hold>240)alloc();}" +
        "G.fillStyle='#07070b';G.fillRect(0,0,W,H);" +
        "function py(q){return H*0.92-q*H*0.80;}" +
        "var i;" +
        "for(i=0;i<N;i++){var x=W*0.05+W*0.90*(i/(N-1));" +
        "if(alive[i]){G.fillStyle='hsla('+((44+Q[i]*120)|0)+',72%,62%,0.85)';" +
        "G.beginPath();G.arc(x,py(Q[i]),2.8,0,7);G.fill();}" +
        "else{G.fillStyle='rgba(90,96,110,0.16)';" +
        "G.fillRect(x-1,py(Q[i])-1,2,2);}}" +
        "G.strokeStyle='rgba(255,176,110,0.9)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(0,py(price));G.lineTo(W,py(price));G.stroke();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "回归",
    html: play(
      stageCss("ut-regress", ";background:#06070b"),
      stageBody("ut-regress"),
      FIT +
        // 左边是第一次考试，右边是第二次。每个人的真实水平**一次都没变过**，
        // 变的只有当天的运气。
        //
        // 挑出第一次垫底的那批（红），什么都不做，第二次他们大幅进步；
        // 挑出第一次拔尖的那批（蓝），第二次他们退步。极端值本来就会自己回来。
        //
        // 于是任何针对"差生"的干预都会显得有效，任何针对"尖子"的都会显得有害。
        // 噪声在给干预发奖状
        "var N=240,S,A,B,acc=0;" +
        "function alloc(){S=new Float64Array(N);A=new Float64Array(N);B=new Float64Array(N);" +
        "for(var i=0;i<N;i++){S[i]=0.5+(Math.random()+Math.random()-1)*0.16;" +
        "A[i]=S[i]+(Math.random()+Math.random()-1)*0.20;" +
        "B[i]=S[i]+(Math.random()+Math.random()-1)*0.20;}" +
        "acc=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;if(acc>420){acc=0;alloc();}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var i,idx=[];for(i=0;i<N;i++)idx.push(i);" +
        "idx.sort(function(a,b){return A[a]-A[b];});" +
        "var cut=(N*0.12)|0,tag=new Uint8Array(N);" +
        "for(i=0;i<cut;i++)tag[idx[i]]=1;" +
        "for(i=N-cut;i<N;i++)tag[idx[i]]=2;" +
        "var x1=W*0.24,x2=W*0.76;" +
        "function py(v){return H*0.90-v*H*0.78;}" +
        "for(i=0;i<N;i++){" +
        "var col=tag[i]===1?'rgba(232,110,96,':(tag[i]===2?'rgba(110,180,240,':'rgba(130,146,175,');" +
        "G.strokeStyle=col+(tag[i]?0.5:0.10)+')';G.lineWidth=tag[i]?1.3:0.7;" +
        "G.beginPath();G.moveTo(x1,py(A[i]));G.lineTo(x2,py(B[i]));G.stroke();" +
        "G.fillStyle=col+(tag[i]?0.95:0.30)+')';" +
        "G.beginPath();G.arc(x1,py(A[i]),tag[i]?3.4:2,0,7);G.fill();" +
        "G.beginPath();G.arc(x2,py(B[i]),tag[i]?3.4:2,0,7);G.fill();}" +
        // 两批人各自的均值：连起来就是"进步"和"退步"，而没人做过任何事
        "var la=0,lb=0,ha=0,hb=0,c=0;" +
        "for(i=0;i<N;i++){if(tag[i]===1){la+=A[i];lb+=B[i];c++;}}" +
        "la/=c;lb/=c;c=0;" +
        "for(i=0;i<N;i++){if(tag[i]===2){ha+=A[i];hb+=B[i];c++;}}" +
        "ha/=c;hb/=c;" +
        "G.lineWidth=3;G.lineCap='round';" +
        "G.strokeStyle='rgba(232,110,96,0.95)';" +
        "G.beginPath();G.moveTo(x1,py(la));G.lineTo(x2,py(lb));G.stroke();" +
        "G.strokeStyle='rgba(110,180,240,0.95)';" +
        "G.beginPath();G.moveTo(x1,py(ha));G.lineTo(x2,py(hb));G.stroke();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "萤火虫",
    html: play(
      stageCss("ut-fire", ";background:#05060a"),
      stageBody("ut-fire"),
      FIT +
        // 每只虫都有自己的节奏，但会照着周围的节奏调一点点。耦合慢慢加强，
        // 于是它们越闪越齐，最后整片一起明灭——很好看。
        //
        // 底下那条是相位分布的熵。同步的过程，就是它一路掉到零的过程：
        // 齐了之后，一千只虫和一只虫携带的信息一样多。
        // 一致的代价是，它们之间不再有任何区别
        "var N=900,P,Wn,K=0,ent=1,T=[],up=1;" +
        "function alloc(){P=new Float64Array(N);Wn=new Float64Array(N);" +
        "for(var i=0;i<N;i++){P[i]=Math.random()*6.2832;" +
        "Wn[i]=0.055+(Math.random()-0.5)*0.030;}" +
        "K=0;T=[];up=1;}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,sx=0,sy=0;" +
        "for(i=0;i<N;i++){sx+=Math.cos(P[i]);sy+=Math.sin(P[i]);}" +
        "var r=Math.sqrt(sx*sx+sy*sy)/N,psi=Math.atan2(sy,sx);" +
        // 平均场：每只只跟"整体的节奏"比，不用两两算
        "for(i=0;i<N;i++)P[i]+=Wn[i]+K*r*Math.sin(psi-P[i]);" +
        "K+=up*0.00055;if(K>0.30)up=-1;if(K<0){K=0;up=1;alloc();}" +
        "var B=36,hist=new Float64Array(B);" +
        "for(i=0;i<N;i++){var b=(((P[i]%6.2832)+6.2832)%6.2832)/6.2832*B|0;" +
        "hist[b<0?0:(b>=B?B-1:b)]++;}" +
        "ent=0;for(i=0;i<B;i++){var p=hist[i]/N;if(p>0)ent-=p*Math.log(p);}" +
        "ent/=Math.log(B);" +
        "T.push(ent);if(T.length>Math.max(80,(W*0.8)|0))T.shift();" +
        "G.fillStyle='#05060a';G.fillRect(0,0,W,H);" +
        "var cols=Math.ceil(Math.sqrt(N*W/(H*0.72))),rows=Math.ceil(N/cols);" +
        "var cw=W/cols,ch=(H*0.72)/rows;" +
        "for(i=0;i<N;i++){var x=(i%cols)*cw+cw/2,y=((i/cols)|0)*ch+ch/2;" +
        "var f=(1+Math.cos(P[i]))/2;f=f*f*f;" +
        "if(f<0.02)continue;" +
        "G.fillStyle='rgba(255,236,150,'+(f*0.92).toFixed(3)+')';" +
        "G.beginPath();G.arc(x,y,1.6+f*3.4,0,7);G.fill();}" +
        "var by=H-20,gh=H*0.20;" +
        "G.strokeStyle='rgba(150,170,200,0.18)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "if(T.length>1){G.strokeStyle='rgba(140,214,224,0.9)';G.lineWidth=1.6;" +
        "G.beginPath();" +
        "for(i=0;i<T.length;i++){var xx=i/(T.length-1)*W,yy=by-T[i]*gh;" +
        "if(i===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "锁定",
    html: play(
      stageCss("ut-lockin", ";background:#06070b"),
      stageBody("ut-lockin"),
      FIT +
        // 两种做法，**好坏完全一样**。每来一个人，就按当前谁用得多、按比例去选谁。
        // 二十四个平行世界同时跑（二十四条线）。
        //
        // 开头它们挤在一起乱晃，然后一条条分开、各自钉死在不同的高度，再也不动。
        // 每个世界都锁定了一个赢家，而赢家是早期几次随机波动决定的。
        // 不是更好的那个赢了，是先涨起来的那个赢了
        "var M2=24,A=[],B=[],T=[],acc=0,step=0;" +
        "function alloc(){A=[];B=[];T=[];step=0;acc=0;" +
        "for(var i=0;i<M2;i++){A.push(1);B.push(1);T.push([0.5]);}}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "if(acc>2&&step<900){acc=0;step++;" +
        "for(var i=0;i<M2;i++){" +
        // 波利亚罐：选中的那一方权重再加一。正反馈，没有任何质量差异
        "var p=A[i]/(A[i]+B[i]);" +
        "if(Math.random()<p)A[i]++;else B[i]++;" +
        "T[i].push(A[i]/(A[i]+B[i]));}}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var top=H*0.08,bh=H*0.84;" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=1;G.setLineDash([5,5]);" +
        "G.beginPath();G.moveTo(0,top+bh*0.5);G.lineTo(W,top+bh*0.5);G.stroke();" +
        "G.setLineDash([]);" +
        "for(var m=0;m<M2;m++){var tr=T[m];" +
        "var last=tr[tr.length-1];" +
        "G.strokeStyle='hsla('+((196+(last-0.5)*280)|0)+',72%,'+((44+Math.abs(last-0.5)*46)|0)+'%,0.78)';" +
        "G.lineWidth=1.3;G.beginPath();" +
        "for(var i2=0;i2<tr.length;i2++){" +
        "var x=i2/900*W,y=top+bh*(1-tr[i2]);" +
        "if(i2===0)G.moveTo(x,y);else G.lineTo(x,y);}" +
        "G.stroke();" +
        "G.fillStyle='hsla('+((196+(last-0.5)*280)|0)+',80%,64%,0.95)';" +
        "G.beginPath();G.arc(Math.min(W,tr.length/900*W),top+bh*(1-last),3,0,7);G.fill();}" +
        "if(step>=900){acc++;if(acc>620)alloc();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "搭便车",
    html: play(
      stageCss("ut-public", ";background:#07080b"),
      stageBody("ut-public"),
      FIT +
        // 每一轮，每个人自愿往公共池里投一点。池子会翻倍，然后平分给所有人。
        // 全体多投，全体都赚；但对每个人来说，少投一点自己总是更划算。
        //
        // 每轮结束大家看谁赚得多，就跟着学。于是投入一轮轮往下掉，
        // 掉到没有人再投任何东西。公共池还在，只是空了。
        // 没有人破坏它，每个人都只是做了对自己更好的选择
        "var N=200,C,earn,avg=1,T=[],acc=0,hold=0;" +
        "function alloc(){C=new Float64Array(N);earn=new Float64Array(N);" +
        "for(var i=0;i<N;i++)C[i]=0.35+Math.random()*0.55;" +
        "T=[];acc=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){var i,pot=0;" +
        "for(i=0;i<N;i++)pot+=C[i];" +
        // 池子翻 1.7 倍再平分。整体最优是全投，个体最优是不投
        "var share=pot*1.7/N;" +
        "for(i=0;i<N;i++)earn[i]=1-C[i]+share;" +
        "for(i=0;i<N;i++){" +
        // 随便看五个人，跟里面最赚的那个学。学到的永远是"少投一点"
        "var bj=-1,be=-1e9;" +
        "for(var q=0;q<5;q++){var j=(Math.random()*N)|0;" +
        "if(earn[j]>be){be=earn[j];bj=j;}}" +
        "if(be>earn[i])C[i]+=(C[bj]-C[i])*0.5;" +
        "C[i]+=(Math.random()-0.5)*0.02;" +
        "if(C[i]<0)C[i]=0;else if(C[i]>1)C[i]=1;}" +
        "var s=0;for(i=0;i<N;i++)s+=C[i];avg=s/N;" +
        "T.push(avg);if(T.length>Math.max(80,(W*0.8)|0))T.shift();}" +
        "function tick(){acc++;if(acc>5){acc=0;round();}" +
        "if(avg<0.006){hold++;if(hold>260)alloc();}" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.34,R=Math.min(W,H)*0.16;" +
        "var pr=R*Math.sqrt(Math.max(0.0001,avg));" +
        "var gr=G.createRadialGradient(cx,cy,0,cx,cy,Math.max(2,pr));" +
        "gr.addColorStop(0,'rgba(140,220,190,0.9)');" +
        "gr.addColorStop(1,'rgba(50,120,110,0.10)');" +
        "G.fillStyle=gr;G.beginPath();G.arc(cx,cy,Math.max(2,pr),0,7);G.fill();" +
        "G.strokeStyle='rgba(110,150,160,0.22)';G.lineWidth=1;" +
        "G.beginPath();G.arc(cx,cy,R,0,7);G.stroke();" +
        "var i;" +
        "for(i=0;i<N;i++){var a=i/N*6.2832,d=R*1.9;" +
        "var x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*0.86;" +
        "G.fillStyle='hsla('+((6+C[i]*150)|0)+',72%,'+((42+C[i]*24)|0)+'%,0.9)';" +
        "G.beginPath();G.arc(x,y,2+C[i]*5,0,7);G.fill();}" +
        "var by=H-20,gh=H*0.22;" +
        "G.strokeStyle='rgba(150,170,200,0.18)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "if(T.length>1){G.strokeStyle='rgba(140,220,190,0.9)';G.lineWidth=1.6;" +
        "G.beginPath();" +
        "for(i=0;i<T.length;i++){var xx=i/(T.length-1)*W,yy=by-T[i]*gh;" +
        "if(i===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "配对",
    html: play(
      stageCss("ut-match", ";background:#06070c"),
      stageBody("ut-match"),
      FIT +
        // 两边各有各的偏好，规则完全对称：延迟接受算法，跑出来的匹配是稳定的。
        // 唯一的不对称是——**谁先开口**。
        //
        // 左边先提，右边只能接受或拒绝。底下两条是各自拿到的名次（越短越好）：
        // 先开口那边明显更好。规则中立，不等于结果中立
        "var N=26,PA=[],PB=[],match=[],rA=0,rB=0,acc=0,side=0;" +
        "function alloc(){PA=[];PB=[];var i,j;" +
        "for(i=0;i<N;i++){var a=[],b=[];" +
        "for(j=0;j<N;j++){a.push(j);b.push(j);}" +
        "for(j=N-1;j>0;j--){var k=(Math.random()*(j+1))|0,t=a[j];a[j]=a[k];a[k]=t;" +
        "k=(Math.random()*(j+1))|0;t=b[j];b[j]=b[k];b[k]=t;}" +
        "PA.push(a);PB.push(b);}" +
        "solve();}" +
        // 延迟接受：提议方轮流求，被求方留下当前最好的
        "function solve(){var prop=PA,recv=PB;" +
        "if(side){prop=PB;recv=PA;}" +
        "var nextI=new Int32Array(N),cur=new Int32Array(N).fill(-1),free=[],i;" +
        "for(i=0;i<N;i++)free.push(i);" +
        "var guard=0;" +
        "while(free.length&&guard++<N*N*2){" +
        "var m=free.pop();if(nextI[m]>=N)continue;" +
        "var w=prop[m][nextI[m]++];" +
        "if(cur[w]<0){cur[w]=m;}" +
        "else{var rNew=recv[w].indexOf(m),rOld=recv[w].indexOf(cur[w]);" +
        "if(rNew<rOld){free.push(cur[w]);cur[w]=m;}else free.push(m);}}" +
        "match=[];for(i=0;i<N;i++)match.push(-1);" +
        "for(i=0;i<N;i++)if(cur[i]>=0)match[cur[i]]=i;" +
        "var sa=0,sb=0;" +
        "for(i=0;i<N;i++){if(match[i]<0)continue;" +
        "sa+=prop[i].indexOf(match[i]);sb+=recv[match[i]].indexOf(i);}" +
        "if(side){rB=sa/N;rA=sb/N;}else{rA=sa/N;rB=sb/N;}}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "if(acc>320){acc=0;side=1-side;solve();}" +
        "G.fillStyle='#06070c';G.fillRect(0,0,W,H);" +
        "var xl=W*0.26,xr=W*0.74,top=H*0.10,bh=H*0.62;" +
        "var i;" +
        "for(i=0;i<N;i++){var y=top+bh*(i/(N-1));" +
        "var m=side?-1:match[i];" +
        "var to=side?null:(match[i]<0?null:top+bh*(match[i]/(N-1)));" +
        "if(!side&&match[i]>=0){" +
        "G.strokeStyle='rgba(150,180,220,0.30)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(xl,y);G.lineTo(xr,to);G.stroke();}}" +
        "if(side){for(i=0;i<N;i++){if(match[i]<0)continue;" +
        "G.strokeStyle='rgba(220,170,130,0.30)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(xl,top+bh*(i/(N-1)));" +
        "G.lineTo(xr,top+bh*(match[i]/(N-1)));G.stroke();}}" +
        "for(i=0;i<N;i++){var y2=top+bh*(i/(N-1));" +
        "G.fillStyle=side?'rgba(150,180,220,0.7)':'rgba(255,196,120,0.95)';" +
        "G.beginPath();G.arc(xl,y2,side?3.4:5,0,7);G.fill();" +
        "G.fillStyle=side?'rgba(255,196,120,0.95)':'rgba(150,180,220,0.7)';" +
        "G.beginPath();G.arc(xr,y2,side?5:3.4,0,7);G.fill();}" +
        // 两条是各自的平均名次，越短越好。先开口的那边永远更短
        "function bar(y,v,col){G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=3;" +
        "G.beginPath();G.moveTo(W*0.12,y);G.lineTo(W*0.88,y);G.stroke();" +
        "G.strokeStyle=col;G.beginPath();G.moveTo(W*0.12,y);" +
        "G.lineTo(W*0.12+W*0.76*Math.min(1,v/(N*0.5)),y);G.stroke();}" +
        "bar(H-38,rA,'rgba(150,180,220,0.9)');" +
        "bar(H-20,rB,'rgba(255,196,120,0.9)');" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "无限猴子",
    html: play(
      stageCss("ut-monkey", ";background:#07080b"),
      stageBody("ut-monkey"),
      FIT +
        // 同一个目标图案，两种找法。左边：每次全部重掷，谁也不留。
        // 右边：留下已经对的那些，只重掷错的。
        //
        // 左边那条几乎贴着地面不动——它在一个组合爆炸的空间里瞎撞，
        // 撞到宇宙热寂也撞不着。右边几秒钟就成了。
        // 差别不是算力，是**有没有让每一步的结果留下来**
        "var GW=16,GH=16,TGT,A1,A2,best1=0,best2=0,T1=[],T2=[],tries=0;" +
        "function alloc(){var n=GW*GH,i;" +
        "TGT=new Uint8Array(n);" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        "var dx=(x-7.5)/7.5,dy=(y-7.5)/7.5;" +
        "var r=Math.sqrt(dx*dx+dy*dy),a=Math.atan2(dy,dx);" +
        "TGT[y*GW+x]=(r<0.92&&r>0.30+0.22*Math.cos(a*5))?1:0;}" +
        "A1=new Uint8Array(n);A2=new Uint8Array(n);" +
        "for(i=0;i<n;i++){A1[i]=Math.random()<0.5?1:0;A2[i]=Math.random()<0.5?1:0;}" +
        "best1=0;best2=0;T1=[];T2=[];tries=0;}" +
        "onfit=alloc;alloc();" +
        "function score(A){var s=0;for(var i=0;i<A.length;i++)if(A[i]===TGT[i])s++;" +
        "return s/A.length;}" +
        "function tick(){var i,n=GW*GH,k;" +
        "for(k=0;k<40;k++){tries++;" +
        // 左：全部重掷。上一次对了多少完全不影响这一次
        "for(i=0;i<n;i++)A1[i]=Math.random()<0.5?1:0;" +
        "var s1=score(A1);if(s1>best1)best1=s1;" +
        // 右：只重掷错的。每一步的成果都留下来了
        "for(i=0;i<n;i++)if(A2[i]!==TGT[i]&&Math.random()<0.06)A2[i]=1-A2[i];}" +
        "best2=score(A2);" +
        "T1.push(best1);T2.push(best2);" +
        "if(T1.length>Math.max(80,(W*0.8)|0)){T1.shift();T2.shift();}" +
        "if(best2>0.999){if(!tick.h)tick.h=0;tick.h++;if(tick.h>240){tick.h=0;alloc();}}" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var cell=Math.min(W*0.24,H*0.42)/GW;" +
        "function grid(A,ox,oy,col){for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        "var v=A[y*GW+x],t=TGT[y*GW+x];" +
        "G.fillStyle=v?(v===t?col:'rgba(226,110,96,0.75)'):'rgba(24,28,38,0.9)';" +
        "G.fillRect(ox+x*cell,oy+y*cell,cell-1,cell-1);}}" +
        "var oy=H*0.10;" +
        "grid(A1,W*0.14,oy,'rgba(150,180,220,0.9)');" +
        "grid(A2,W*0.60,oy,'rgba(140,220,170,0.9)');" +
        "var by=H-20,gh=H*0.24;" +
        "G.strokeStyle='rgba(150,170,200,0.18)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "function line(T,col){if(T.length<2)return;" +
        "G.strokeStyle=col;G.lineWidth=1.6;G.beginPath();" +
        "for(var i=0;i<T.length;i++){var x=i/(T.length-1)*W;" +
        "var y=by-(T[i]-0.5)*2*gh;" +
        "if(i===0)G.moveTo(x,y);else G.lineTo(x,y);}G.stroke();}" +
        "line(T1,'rgba(150,180,220,0.9)');line(T2,'rgba(140,220,170,0.9)');" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "幸存者",
    html: play(
      stageCss("ut-survive", ";background:#06070b"),
      stageBody("ut-survive"),
      FIT +
        // 一架架飞机出去，随机挨枪。打中要害的回不来，其余的都回来了。
        // 你只能检查回来的那些——亮的弹孔就是它们身上的。
        //
        // 打得多了，机身上会浮出两块**空白**。
        // 顺着看下去的结论是"空白处没挨过枪，不用管"。
        // 每隔一会儿，那些没回来的挨在哪儿会以暗红浮上来一次：
        // 全在那两块空白里。你手上的样本是被结果筛过的，
        // 它记录的不是哪儿危险，是哪儿挨了还能飞回来
        "var GW=96,GH,BODY,HIT,LOST,sor=0,rev=0,fc=0;" +
        "function inb(x,y){var u=(x-GW*0.5)/(GW*0.42),v=(y-GH*0.5)/(GH*0.30);" +
        "if(u*u+v*v<1)return 1;" +
        "var w=(x-GW*0.5)/(GW*0.16),z=(y-GH*0.5)/(GH*0.46);" +
        "return (w*w+z*z<1)?1:0;}" +
        "function crit(x,y){var d1=(x-GW*0.34)*(x-GW*0.34)+(y-GH*0.5)*(y-GH*0.5);" +
        "var d2=(x-GW*0.66)*(x-GW*0.66)+(y-GH*0.5)*(y-GH*0.5);" +
        "var r=GW*0.055;return (d1<r*r||d2<r*r)?1:0;}" +
        "function alloc(){GH=Math.max(28,Math.round(GW*(H*0.86)/W));" +
        "BODY=new Uint8Array(GW*GH);HIT=new Float32Array(GW*GH);LOST=new Float32Array(GW*GH);" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++)" +
        "BODY[y*GW+x]=inb(x,y)?(crit(x,y)?2:1):0;" +
        "sor=0;rev=0;fc=0;}" +
        "onfit=alloc;alloc();" +
        "function sortie(){var pts=[],i,down=0;" +
        "for(var k=0;k<7;k++){" +
        "var x=(Math.random()*GW)|0,y=(Math.random()*GH)|0;" +
        "if(!BODY[y*GW+x]){k--;continue;}" +
        "pts.push(y*GW+x);if(BODY[y*GW+x]===2)down=1;}" +
        // 只有回来的那些，弹孔才进得了你的样本
        "for(i=0;i<pts.length;i++){if(down)LOST[pts[i]]+=1;else HIT[pts[i]]+=1;}" +
        "sor++;}" +
        "function tick(){fc++;if(sor<5200)for(var k=0;k<5;k++)sortie();" +
        // 每隔一会儿，把没回来的那些叠上来看一眼
        "rev=(fc%560>=380)?Math.min(1,rev+0.022):Math.max(0,rev-0.022);" +
        "if(fc>1900){alloc();}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var cw=W/GW,ch=(H*0.86)/GH,oy=H*0.07;" +
        "var mx=1,i2;" +
        "for(i2=0;i2<HIT.length;i2++)if(HIT[i2]>mx)mx=HIT[i2];" +
        "var ml=1;for(i2=0;i2<LOST.length;i2++)if(LOST[i2]>ml)ml=LOST[i2];" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){var i=y*GW+x;" +
        "if(!BODY[i])continue;" +
        "G.fillStyle='rgba(38,46,62,0.85)';" +
        "G.fillRect(x*cw,oy+y*ch,cw+0.7,ch+0.7);" +
        "var h=HIT[i]/mx;" +
        "if(h>0.02){G.fillStyle='rgba(226,232,244,'+Math.min(0.95,0.10+Math.pow(h,1.7)*0.9)+')';" +
        "G.fillRect(x*cw,oy+y*ch,cw+0.7,ch+0.7);}" +
        "if(rev>0.01){var l=LOST[i]/ml;" +
        "if(l>0.02){G.fillStyle='rgba(214,64,52,'+Math.min(0.92,(0.2+l*0.85)*rev)+')';" +
        "G.fillRect(x*cw,oy+y*ch,cw+0.7,ch+0.7);}}}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "蒸发冷却",
    html: play(
      stageCss("ut-evap", ";background:#07080b"),
      stageBody("ut-evap"),
      FIT +
        // 每个点是一个人，高低是他的立场。谁都没有改过主意。
        //
        // 每一轮，最温和的那 4% 先走——他们本来就没那么投入，走掉的成本最低。
        // 剩下的人一个字都没改，可这群人的中心自己往上爬了。
        // 一批批走下去，最后这里只剩一小撮最极端的，然后连他们也没了。
        // 从头到尾没有一个人被说服过：变的不是人，是还留在这儿的是谁
        "var N=460,X,alive,mean=0.5,T=[],acc=0,hold=0;" +
        "function gauss(){var u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();" +
        "return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v);}" +
        "function draw0(){return Math.max(0,Math.min(1,0.5+gauss()*0.16));}" +
        "function alloc(){X=new Float64Array(N);alive=new Uint8Array(N);" +
        "for(var i=0;i<N;i++){X[i]=draw0();alive[i]=1;}" +
        "mean=0.5;T=[];acc=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){var i,s=0,n=0;" +
        "for(i=0;i<N;i++)if(alive[i]){s+=X[i];n++;}" +
        "if(n<10){hold++;if(hold>70)alloc();return;}" +
        "mean=s/n;" +
        // 最温和的那一批先走：他们本来就没那么投入
        "var idx=[];for(i=0;i<N;i++)if(alive[i])idx.push(i);" +
        "idx.sort(function(a,b){return X[a]-X[b];});" +
        "var q=Math.max(1,Math.round(idx.length*0.04));" +
        "for(i=0;i<q;i++)alive[idx[i]]=0;" +
        "T.push(mean);if(T.length>Math.max(60,(W*0.7)|0))T.shift();}" +
        "function tick(){acc++;if(acc>4){acc=0;round();}" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var top=H*0.06,bh=H*0.66;" +
        "for(var i=0;i<N;i++){if(!alive[i])continue;" +
        "var x=(i%46)/45*W*0.86+W*0.07;" +
        "var y=top+bh*(1-X[i]);" +
        "var e=Math.max(0,Math.min(1,(X[i]-mean)*6+0.5));" +
        "G.fillStyle='hsla('+((208-e*180)|0)+',72%,'+((44+e*22)|0)+'%,0.82)';" +
        "G.beginPath();G.arc(x,y,2.6,0,7);G.fill();}" +
        "G.strokeStyle='rgba(255,196,120,0.85)';G.lineWidth=1.6;" +
        "G.setLineDash([7,6]);G.beginPath();" +
        "G.moveTo(0,top+bh*(1-mean));G.lineTo(W,top+bh*(1-mean));G.stroke();" +
        "G.setLineDash([]);" +
        "var by=H-18,gh=H*0.20;" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        "if(T.length>1){G.strokeStyle='rgba(255,196,120,0.9)';G.lineWidth=1.6;" +
        "G.beginPath();" +
        "for(var k=0;k<T.length;k++){var xx=k/(T.length-1)*W,yy=by-(T[k]-0.5)*2*gh;" +
        "if(k===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "多数无知",
    html: play(
      stageCss("ut-pluri", ";background:#06070b"),
      stageBody("ut-pluri"),
      FIT +
        // 每个格子是一个人。**方块是他做的**，中间那颗小点是他真正想的。
        //
        // 私下里四分之三的人不同意。但每个人只看得见别人做了什么，
        // 看见周围一片赞成，就跟着做了赞成。
        // 方块很快铺成一整片同色，小点却始终是花的。
        // 一个谁都不相信的共识，靠着"别人好像都信"稳稳立着
        "var NX=52,NY,PUB,PRI,acc=0,hold=0;" +
        "function alloc(){NY=Math.max(16,Math.round(NX*(H*0.9)/W));" +
        "PUB=new Uint8Array(NX*NY);PRI=new Uint8Array(NX*NY);" +
        "for(var i=0;i<PUB.length;i++){" +
        // 私下里只有四分之一的人是真同意的
        "PRI[i]=Math.random()<0.25?1:0;" +
        // 一开始大家公开做的就是自己想的，只有很小的偏差
        "PUB[i]=PRI[i];}" +
        // 中间先有一小撮公开赞成的，仅此而已
        "for(var y0=0;y0<NY;y0++)for(var x0=0;x0<NX;x0++){" +
        "var dx0=(x0-NX*0.5)/(NX*0.13),dy0=(y0-NY*0.5)/(NY*0.20);" +
        "if(dx0*dx0+dy0*dy0<1)PUB[y0*NX+x0]=1;}" +
        "acc=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        "function step(){var nx=new Uint8Array(PUB),x,y;" +
        "for(y=0;y<NY;y++)for(x=0;x<NX;x++){var s=0,c=0;" +
        "for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){" +
        "if(!dx&&!dy)continue;var a=x+dx,b=y+dy;" +
        "if(a<0||b<0||a>=NX||b>=NY)continue;s+=PUB[b*NX+a];c++;}" +
        "var i=y*NX+x,f=s/c;" +
        // 从众是单向的：看见周围一片赞成，反对的那句话就说不出口了；
        // 反过来，本来就赞成的人从不需要假装反对
        "var p=(f>0.40)?0.97:(PRI[i]?0.92:0.05);" +
        "nx[i]=Math.random()<p?1:0;}" +
        "PUB=nx;}" +
        "function tick(){acc++;if(acc>3){acc=0;step();" +
        "var s=0;for(var i=0;i<PUB.length;i++)s+=PUB[i];" +
        "if(s>PUB.length*0.97||s<PUB.length*0.03){hold++;if(hold>300)alloc();}}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var cw=W/NX,ch=(H*0.9)/NY,oy=H*0.05;" +
        "for(var y=0;y<NY;y++)for(var x=0;x<NX;x++){var i=y*NX+x;" +
        "G.fillStyle=PUB[i]?'rgba(72,118,176,0.92)':'rgba(28,34,46,0.92)';" +
        "G.fillRect(x*cw+0.7,oy+y*ch+0.7,cw-1.4,ch-1.4);" +
        "G.fillStyle=PRI[i]?'rgba(150,200,255,0.95)':'rgba(236,150,86,0.95)';" +
        "G.beginPath();G.arc(x*cw+cw/2,oy+y*ch+ch/2,Math.min(cw,ch)*0.17,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "兼容",
    html: play(
      stageCss("ut-compat", ";background:#07080b"),
      stageBody("ut-compat"),
      FIT +
        // 每个小东西都在转，各转各的。它们没有一个是坏的。
        //
        // 上面那格是版本号，隔一会儿加一。每加一次，
        // 落后三代以上的就永久停住——不是它们出了问题，是脚下的地挪了。
        // 停下的再也不会重新转。新的会补进来，也只是排队等着轮到自己
        "var N,ITEM=[],cur=0,acc=0;" +
        "function alloc(){var cols=Math.max(6,Math.round(W/86));" +
        "var rows=Math.max(4,Math.round(H*0.80/86));" +
        "N=cols*rows;ITEM=[];cur=0;acc=0;" +
        "for(var i=0;i<N;i++)ITEM.push({c:i%cols,r:(i/cols)|0,cols:cols,rows:rows," +
        "v:-((Math.random()*3)|0),ph:Math.random()*6.2832," +
        "sp:0.02+Math.random()*0.035,dead:0});}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "if(acc>120){acc=0;cur++;" +
        "for(var i=0;i<N;i++){var it=ITEM[i];" +
        // 落后三代就永久停住
        "if(!it.dead&&cur-it.v>=3){it.dead=1;}" +
        // 死掉的位置隔一阵会补进新的，版本是当下的
        "else if(it.dead&&Math.random()<0.13){it.dead=0;it.v=cur;it.ph=Math.random()*6.2832;}}}" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var cols=ITEM[0].cols,rows=ITEM[0].rows;" +
        "var cw=W/cols,ch=(H*0.80)/rows,oy=H*0.13;" +
        "var R=Math.min(cw,ch)*0.30;" +
        "for(var i=0;i<N;i++){var it=ITEM[i];" +
        "var x=cw*(it.c+0.5),y=oy+ch*(it.r+0.5);" +
        "if(!it.dead)it.ph+=it.sp;" +
        "var age=Math.max(0,Math.min(2,cur-it.v));" +
        "G.strokeStyle=it.dead?'rgba(58,66,84,0.55)':'rgba(150,180,220,'+(0.92-age*0.22)+')';" +
        "G.lineWidth=it.dead?1:1.7;" +
        "G.beginPath();G.arc(x,y,R,0,7);G.stroke();" +
        "G.beginPath();G.moveTo(x,y);" +
        "G.lineTo(x+Math.cos(it.ph)*R*0.86,y+Math.sin(it.ph)*R*0.86);G.stroke();" +
        "if(!it.dead){G.fillStyle='rgba(150,180,220,'+(0.9-age*0.25)+')';" +
        "G.beginPath();G.arc(x,y,1.8,0,7);G.fill();}}" +
        // 顶上那排短杠是版本号，只加不减
        "var vx=W*0.06;" +
        "for(var k=0;k<=cur&&k<64;k++){" +
        "G.fillStyle=k===cur?'rgba(255,196,120,0.95)':'rgba(120,140,175,0.35)';" +
        "G.fillRect(vx+k*(W*0.88/64),H*0.045,Math.max(2,W*0.88/64-3),5);}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "搜索",
    html: play(
      stageCss("ut-index", ";background:#06070b"),
      stageBody("ut-index"),
      FIT +
        // 满屏的东西，只有一部分挂了标签（亮圈那些）。
        // 那道扫过去的线是查询：它只带得回挂了标签的。
        //
        // 被带回来的会被看见，于是长大；没被带回来的没人管，慢慢淡掉、消失。
        // 到最后满屏都是挂过标签的，画面干干净净、毫无缺口——
        // 你不会觉得少了什么。搜不到本来不等于不存在，用久了就是一件事了
        "var N=520,P=[],scan=0,acc=0;" +
        "function alloc(){P=[];" +
        "for(var i=0;i<N;i++)P.push({x:Math.random(),y:Math.random()," +
        "idx:Math.random()<0.34?1:0,w:0.42+Math.random()*0.2,seen:0,a:1});" +
        "scan=0;acc=0;}" +
        "onfit=alloc;alloc();" +
        "function tick(){acc++;" +
        "var ps=scan;scan+=0.0042;if(scan>1.12)scan=-0.06;" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var i,live=0;" +
        "for(i=0;i<N;i++){var p=P[i];if(p.a<=0)continue;live++;" +
        // 查询线扫到：挂了标签的才会被带回来
        "if(p.idx&&p.x>ps&&p.x<=scan){p.seen=1;p.w=Math.min(1.35,p.w+0.055);}" +
        // 没被带回来的，没人维护，慢慢没了
        "if(!p.idx){p.w-=0.00042;if(p.w<0.06)p.a-=0.012;}" +
        "var x=p.x*W,y=p.y*H*0.94+H*0.03,r=Math.max(0.4,p.w*Math.min(W,H)*0.014);" +
        "if(p.idx){G.fillStyle='rgba(150,190,235,'+(0.30+p.w*0.5)*p.a+')';" +
        "G.beginPath();G.arc(x,y,r,0,7);G.fill();" +
        "G.strokeStyle='rgba(180,215,255,'+(0.5*p.a)+')';G.lineWidth=1;" +
        "G.beginPath();G.arc(x,y,r+2.4,0,7);G.stroke();}" +
        "else{G.fillStyle='rgba(214,150,96,'+(0.20+p.w*0.45)*p.a+')';" +
        "G.beginPath();G.arc(x,y,r,0,7);G.fill();}}" +
        "if(scan>=0&&scan<=1){" +
        "var g2=G.createLinearGradient(scan*W-70,0,scan*W,0);" +
        "g2.addColorStop(0,'rgba(180,215,255,0)');" +
        "g2.addColorStop(1,'rgba(180,215,255,0.20)');" +
        "G.fillStyle=g2;G.fillRect(scan*W-70,0,70,H);" +
        "G.strokeStyle='rgba(200,225,255,0.55)';G.lineWidth=1.2;" +
        "G.beginPath();G.moveTo(scan*W,0);G.lineTo(scan*W,H);G.stroke();}" +
        "if(live<N*0.36){acc++;if(acc>420)alloc();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "围观",
    html: play(
      stageCss("ut-bystand", ";background:#07080b"),
      stageBody("ut-bystand"),
      FIT +
        // 左边三个人，右边四十个。中间那点亮起来就是出事了。
        // 每个人自己判断要不要动——人越多，每个人越觉得**轮不到自己**。
        //
        // 底下两条是各自的出手率。左边那条明显更高。
        // 人多不是保险；人多的时候，那个"总会有人管吧"是所有人一起想的
        "var A=[],B=[],ev=0,acc=0,sa=0,na=0,sb=0,nb=0,resA=0,resB=0;" +
        "function mk(n){var a=[];for(var i=0;i<n;i++)a.push({t:i/n*6.2832,r:0.62+Math.random()*0.3,act:0});return a;}" +
        "function alloc(){A=mk(3);B=mk(40);ev=0;acc=0;sa=0;na=0;sb=0;nb=0;}" +
        "onfit=alloc;alloc();" +
        // 责任被摊薄的速度得快过人数增长，不然"人多总有一个会动"在算术上就成立了。
        // 这条曲线是照着实测对齐的：三个人在场约八成有人出手，四十个人约三成
        "function p1(n){return 0.581*Math.exp(-0.1073*(n-1));}" +
        "function trial(){var i,any=0;" +
        "for(i=0;i<A.length;i++){A[i].act=Math.random()<p1(A.length)?1:0;if(A[i].act)any=1;}" +
        "na++;if(any)sa++;resA=any;" +
        "any=0;" +
        "for(i=0;i<B.length;i++){B[i].act=Math.random()<p1(B.length)?1:0;if(B[i].act)any=1;}" +
        "nb++;if(any)sb++;resB=any;}" +
        "function tick(){acc++;" +
        "if(acc>78){acc=0;ev=1;trial();}" +
        "if(acc>46)ev=0;" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "function arena(list,cx,cy,R,any){" +
        "if(ev){G.fillStyle='rgba(255,168,72,'+(0.35+0.4*Math.sin(acc*0.4))+')';" +
        "G.beginPath();G.arc(cx,cy,7,0,7);G.fill();" +
        "G.strokeStyle='rgba(255,168,72,0.30)';G.lineWidth=1;" +
        "G.beginPath();G.arc(cx,cy,7+acc*0.9,0,7);G.stroke();}" +
        "else{G.fillStyle='rgba(90,104,132,0.5)';" +
        "G.beginPath();G.arc(cx,cy,4,0,7);G.fill();}" +
        "for(var i=0;i<list.length;i++){var w=list[i];" +
        "var d=ev&&w.act?0.62:1;" +
        "var x=cx+Math.cos(w.t)*R*w.r*d,y=cy+Math.sin(w.t)*R*w.r*d;" +
        "if(ev&&w.act){G.strokeStyle='rgba(255,196,120,0.45)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(x,y);G.lineTo(cx,cy);G.stroke();}" +
        "G.fillStyle=(ev&&w.act)?'rgba(255,196,120,0.95)':'rgba(112,132,168,0.72)';" +
        "G.beginPath();G.arc(x,y,ev&&w.act?4.2:3,0,7);G.fill();}}" +
        "var R=Math.min(W*0.20,H*0.30);" +
        "arena(A,W*0.27,H*0.40,R,resA);arena(B,W*0.73,H*0.40,R,resB);" +
        "function bar(y,s,n,col){G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.08,y);G.lineTo(W*0.92,y);G.stroke();" +
        "if(n<1)return;G.strokeStyle=col;G.beginPath();G.moveTo(W*0.08,y);" +
        "G.lineTo(W*0.08+W*0.84*(s/n),y);G.stroke();}" +
        "bar(H-44,sa,na,'rgba(255,196,120,0.9)');" +
        "bar(H-20,sb,nb,'rgba(120,150,200,0.9)');" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "诱因",
    html: play(
      stageCss("ut-cobra", ";background:#07080b"),
      stageBody("ut-cobra"),
      FIT +
        // 一开始只是想把这东西弄少一点，所以按个数发赏钱。
        // 抓的人多了起来，数量掉下去——那条线的前半段是好看的。
        //
        // 然后有人算明白了：赏钱是按个数发的，那就自己养。
        // 养的比抓的划算，养的人越来越多。后半段那条线爬回来，
        // 而且爬得比一开始还高。你出钱买的是那个数字，不是那件事
        "var N=900,S=[],hunt=0,farm=0,pop=0,T=[],acc=0,hold=0,t0=0;" +
        "function alloc(){S=[];" +
        "for(var i=0;i<N;i++)S.push(i<220?{x:Math.random(),y:Math.random(),on:1,f:0}:{x:0,y:0,on:0,f:0});" +
        "hunt=0.02;farm=0;T=[];acc=0;hold=0;t0=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){var i,n=0;" +
        "for(i=0;i<N;i++)if(S[i].on)n++;" +
        "pop=n;t0++;" +
        // 赏钱一出，抓的人迅速多起来
        "if(pop>12)hunt=Math.min(0.085,hunt+0.0016);" +
        // 但赏钱是按个数发的。过一阵就有人发现：养比抓划算
        "if(t0>30)farm=Math.min(0.16,farm+0.0030);" +
        // 最后剩的那几只抓不着——真实里也是这样，而这正好给了养的空间
        "if(n>12)for(i=0;i<N;i++){if(!S[i].on)continue;" +
        "if(Math.random()<hunt){S[i].on=0;}}" +
        "var born=Math.round(n*farm);" +
        "for(i=0;i<N&&born>0;i++){if(S[i].on)continue;" +
        "S[i].on=1;S[i].f=1;S[i].x=Math.random();S[i].y=Math.random();born--;}" +
        "T.push(pop/N);if(T.length>Math.max(60,(W*0.72)|0))T.shift();" +
        "if(pop>=N-4){hold++;if(hold>260)alloc();}}" +
        "function tick(){acc++;if(acc>4){acc=0;round();}" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var top=H*0.05,bh=H*0.62;" +
        "for(var i=0;i<N;i++){var s=S[i];if(!s.on)continue;" +
        "G.fillStyle=s.f?'rgba(226,124,88,0.85)':'rgba(126,150,190,0.75)';" +
        "G.beginPath();G.arc(s.x*W*0.94+W*0.03,top+s.y*bh,2.6,0,7);G.fill();}" +
        "var by=H-18,gh=H*0.24;" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,by);G.lineTo(W,by);G.stroke();" +
        // 那条虚线是一开始的水平，越过它就是全赔了
        "if(T.length){G.strokeStyle='rgba(150,170,200,0.34)';G.setLineDash([6,6]);" +
        "G.beginPath();G.moveTo(0,by-T[0]*gh);G.lineTo(W,by-T[0]*gh);G.stroke();" +
        "G.setLineDash([]);}" +
        "if(T.length>1){G.strokeStyle='rgba(226,124,88,0.92)';G.lineWidth=1.8;" +
        "G.beginPath();" +
        "for(var k=0;k<T.length;k++){var xx=k/(T.length-1)*W,yy=by-T[k]*gh;" +
        "if(k===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "信号",
    html: play(
      stageCss("ut-signal", ";background:#06070b"),
      stageBody("ut-signal"),
      FIT +
        // 每个人有一个天生的高低（左边那列，一开始就定了、也没变过）。
        // 为了让人知道自己是高的，他得烧掉点什么；越高的人烧起来越省，
        // 所以最后烧的量正好把高低排了出来——右边那列和左边一模一样。
        //
        // 信息是真传出去了。代价是底下那堆一直在涨的灰烬，
        // 而它排出来的这个次序，从第一帧起就在那儿了
        "var N=34,TYPE=[],SIG=[],burn=0,acc=0,fit2=0,st=0;" +
        "function alloc(){TYPE=[];SIG=[];" +
        "for(var i=0;i<N;i++){TYPE.push(Math.random());SIG.push(0);}" +
        "burn=0;acc=0;fit2=0;st=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){st++;" +
        "var i,mx=0;" +
        // 每个人都想比别人多烧一点，好显得更高。烧的边际代价跟自己的高低成反比
        "for(i=0;i<N;i++)if(SIG[i]>mx)mx=SIG[i];" +
        "for(i=0;i<N;i++){" +
        "var step=0.010*(0.25+TYPE[i]);" +
        "if(SIG[i]<mx*(0.55+TYPE[i]*0.55))SIG[i]+=step;" +
        "else SIG[i]+=step*0.35;" +
        "burn+=SIG[i]*0.0016;}" +
        // 烧出来的次序和天生的次序对得上多少
        "var ord=[],j;for(i=0;i<N;i++)ord.push(i);" +
        "ord.sort(function(a,b){return SIG[a]-SIG[b];});" +
        "var ok=0;for(i=0;i<N;i++)for(j=i+1;j<N;j++)" +
        "if((TYPE[ord[i]]<TYPE[ord[j]]))ok++;" +
        "fit2=ok/(N*(N-1)/2);}" +
        "function tick(){acc++;if(acc>2){acc=0;round();}" +
        "if(st>700)alloc();" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var top=H*0.07,bh=H*0.60;" +
        "var ord=[],i;for(i=0;i<N;i++)ord.push(i);" +
        "ord.sort(function(a,b){return SIG[b]-SIG[a];});" +
        "var mx=0.0001;for(i=0;i<N;i++)if(SIG[i]>mx)mx=SIG[i];" +
        "var byType=[];for(i=0;i<N;i++)byType.push(i);" +
        "byType.sort(function(a,b){return TYPE[b]-TYPE[a];});" +
        "for(i=0;i<N;i++){" +
        "var a=byType[i];" +
        "var ya=top+bh*(i/(N-1)),yb=top+bh*(ord.indexOf(a)/(N-1));" +
        "G.strokeStyle=(byType[i]===ord[i])?'rgba(120,150,200,0.34)':'rgba(226,124,88,0.6)';" +
        "G.lineWidth=1;G.beginPath();G.moveTo(W*0.30,ya);G.lineTo(W*0.70,yb);G.stroke();" +
        "G.fillStyle='hsla('+((202-TYPE[a]*70)|0)+',66%,'+((36+TYPE[a]*32)|0)+'%,0.95)';" +
        "G.beginPath();G.arc(W*0.30,ya,4.6,0,7);G.fill();" +
        "var c=ord[i];" +
        "G.fillStyle='hsla('+((202-TYPE[c]*70)|0)+',66%,'+((36+TYPE[c]*32)|0)+'%,0.95)';" +
        "G.beginPath();G.arc(W*0.70,top+bh*(i/(N-1)),4.6,0,7);G.fill();" +
        // 每个人身上那道横杠是他烧掉的量
        "G.strokeStyle='rgba(226,124,88,0.55)';G.lineWidth=2.4;" +
        "G.beginPath();G.moveTo(W*0.72,top+bh*(i/(N-1)));" +
        "G.lineTo(W*0.72+W*0.20*(SIG[c]/mx),top+bh*(i/(N-1)));G.stroke();}" +
        "var by=H-20;" +
        // 上面这条：次序传对了多少，几乎立刻就满了
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.08,by-22);G.lineTo(W*0.92,by-22);G.stroke();" +
        "G.strokeStyle='rgba(120,180,235,0.9)';G.beginPath();G.moveTo(W*0.08,by-22);" +
        "G.lineTo(W*0.08+W*0.84*fit2,by-22);G.stroke();" +
        // 下面这条：一直在涨的灰烬
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.08,by);G.lineTo(W*0.92,by);G.stroke();" +
        "G.strokeStyle='rgba(226,124,88,0.9)';G.beginPath();G.moveTo(W*0.08,by);" +
        "G.lineTo(W*0.08+W*0.84*Math.min(1,burn/260),by);G.stroke();" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "复印",
    html: play(
      stageCss("ut-copy", ";background:#06070b"),
      stageBody("ut-copy"),
      FIT +
        // 左边是原件，右边是当下这一代。中间每复印一次就是新的一代。
        //
        // 底下两条：上面那条是**这一代和上一代差多少**——它一直贴着零，
        // 每一次都在容差之内，每一次都验收得过。
        // 下面那条是这一代和原件差多少，它一路往上走，走到面目全非。
        // 没有哪一步出过错。错的是"每一步都没错"这件事本身
        "var GW=64,GH=64,ORIG,CUR,PREV,gen=0,acc=0,dPrev=0,dOrig=0;" +
        "function alloc(){ORIG=new Float32Array(GW*GH);" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        "var u=(x-31.5)/31.5,v=(y-31.5)/31.5;" +
        "var r=Math.sqrt(u*u+v*v),a=Math.atan2(v,u);" +
        "var s=0.5+0.5*Math.cos(a*3+r*5.5);" +
        "ORIG[y*GW+x]=r<0.86?Math.max(0,Math.min(1,s*(1-r*0.35))):0.06;}" +
        "CUR=new Float32Array(ORIG);PREV=new Float32Array(ORIG);" +
        "gen=0;acc=0;dPrev=0;dOrig=0;}" +
        "onfit=alloc;alloc();" +
        "function copy(){var i,x,y;PREV=new Float32Array(CUR);" +
        "var nx=new Float32Array(GW*GH);" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){" +
        // 一次复印：轻微的糊、轻微的偏色、一点噪点。每一项都小到可以忽略
        "var s=0,c=0;" +
        "for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){" +
        "var a=x+dx,b=y+dy;if(a<0||b<0||a>=GW||b>=GH)continue;" +
        "var w=(dx===0&&dy===0)?13:1;s+=CUR[b*GW+a]*w;c+=w;}" +
        "var v=s/c;" +
        "v=0.5+(v-0.5)*1.006;" +
        "v+=(Math.random()-0.5)*0.010;" +
        "nx[y*GW+x]=Math.max(0,Math.min(1,v));}" +
        "CUR=nx;gen++;" +
        "var sp=0,so=0;" +
        "for(i=0;i<CUR.length;i++){sp+=Math.abs(CUR[i]-PREV[i]);so+=Math.abs(CUR[i]-ORIG[i]);}" +
        "dPrev=sp/CUR.length;dOrig=so/CUR.length;}" +
        "function tick(){acc++;if(acc>1){acc=0;if(gen<900)copy();else{acc=-320;alloc();}}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var S=Math.min(W*0.40,H*0.72),ox1=W*0.06,ox2=W*0.54,oy=H*0.06;" +
        "var cs=S/GW;" +
        "function put(A,ox){for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        "var v=A[y*GW+x];" +
        "G.fillStyle='rgb('+((26+v*206)|0)+','+((32+v*198)|0)+','+((44+v*186)|0)+')';" +
        "G.fillRect(ox+x*cs,oy+y*cs,cs+0.6,cs+0.6);}}" +
        "put(ORIG,ox1);put(CUR,ox2);" +
        "var by=H-20;" +
        "function bar(y,v,col){G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.06,y);G.lineTo(W*0.94,y);G.stroke();" +
        "G.strokeStyle=col;G.beginPath();G.moveTo(W*0.06,y);" +
        "G.lineTo(W*0.06+W*0.88*Math.min(1,v),y);G.stroke();}" +
        "bar(by-22,dPrev/0.30,'rgba(120,180,235,0.9)');" +
        "bar(by,dOrig/0.30,'rgba(226,124,88,0.9)');" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "马太",
    html: play(
      stageCss("ut-matthew", ";background:#07080b"),
      stageBody("ut-matthew"),
      FIT +
        // 三百个人，**一开始一模一样**，每人手里一份。
        // 每一轮发出去一份，落在谁手上的概率跟他现在有多少成正比。
        // 规则对所有人一字不差，也没有任何人比别人强。
        //
        // 上面是排好序的柱子，下面那条弯下去的是分配曲线：
        // 直的那条是人人一样，越往下弯就越集中。它只会往下弯。
        //
        // 停在哪儿不是偶然：这么发下去，最后各人占的份额在所有可能里是**均匀**的，
        // 也就是说，极不平均的那些结果和平均的那些一样容易出现。
        // 基尼系数会稳在 0.5 上下，最上面一成拿走三成。
        // 到最后你会想给最上面那根编一个理由，可这里从头到尾没有理由
        "var N=300,Wl,tot=0,acc=0,hold=0,cum=null;" +
        "function alloc(){Wl=new Float64Array(N);" +
        "for(var i=0;i<N;i++)Wl[i]=1;tot=N;acc=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){for(var k=0;k<70;k++){" +
        // 落在谁手上，跟他现在有多少成正比。仅此而已
        "var r=Math.random()*tot,s=0,j=0;" +
        "for(j=0;j<N;j++){s+=Wl[j];if(s>=r)break;}" +
        "if(j>=N)j=N-1;Wl[j]+=1;tot+=1;}}" +
        "function tick(){acc++;if(tot<N*120){acc=0;round();}" +
        "var s2=Array.prototype.slice.call(Wl);s2.sort(function(a,b){return a-b;});" +
        "G.fillStyle='#07080b';G.fillRect(0,0,W,H);" +
        "var top=H*0.05,bh=H*0.46,mx=s2[N-1]||1,i;" +
        "for(i=0;i<N;i++){var x=W*0.05+W*0.90*(i/(N-1)),h=bh*(s2[i]/mx);" +
        "G.fillStyle='hsla('+((208-(s2[i]/mx)*160)|0)+',70%,'+((38+(s2[i]/mx)*28)|0)+'%,0.9)';" +
        "G.fillRect(x-W*0.0013,top+bh-h,W*0.0026+1,h);}" +
        // 分配曲线：横轴是从最少到最多的人数占比，纵轴是他们合起来占了多少
        "var ly=H*0.58,lh=H*0.34,c=0;" +
        "G.strokeStyle='rgba(150,170,200,0.28)';G.lineWidth=1;G.setLineDash([6,6]);" +
        "G.beginPath();G.moveTo(W*0.10,ly+lh);G.lineTo(W*0.90,ly);G.stroke();" +
        "G.setLineDash([]);" +
        "G.strokeStyle='rgba(255,196,120,0.92)';G.lineWidth=2;G.beginPath();" +
        "G.moveTo(W*0.10,ly+lh);" +
        "for(i=0;i<N;i++){c+=s2[i];" +
        "G.lineTo(W*0.10+W*0.80*((i+1)/N),ly+lh-lh*(c/tot));}" +
        "G.stroke();" +
        "if(tot>=N*120){hold++;if(hold>320)alloc();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "贴现",
    html: play(
      stageCss("ut-discount", ";background:#06070b"),
      stageBody("ut-discount"),
      FIT +
        // 两件事：近的那件小一点，远的那件大一点。两边的日子都定死了，
        // 谁也没有变过。变的只是**今天是哪天**。
        //
        // 两条线是它们此刻在你眼里值多少。它们会交叉。
        // 交叉点左边你要远的那件，右边你要近的那件——
        // 没有新消息，没有人劝你，你的偏好自己翻了个面
        "var t=0,acc=0,hold=0,TA=6.0,TB=13.0,VA=1.0,VB=2.1,K=0.62;" +
        "function alloc(){t=0;acc=0;hold=0;}" +
        "onfit=alloc;alloc();" +
        // 双曲贴现：越靠近，近的那件涨得越凶
        "function val(v,tt,now){var d=Math.max(0.001,tt-now);return v/(1+K*d);}" +
        "function tick(){acc++;if(acc>1){acc=0;" +
        "if(t<TA)t+=0.018;else{hold++;if(hold>180){t=0;hold=0;}}}" +
        "G.fillStyle='#06070b';G.fillRect(0,0,W,H);" +
        "var left=W*0.08,right=W*0.92,top=H*0.10,bot=H*0.80;" +
        "var TT=TA*1.22,mxv=Math.max(VA,VB);" +
        "function X(tt){return left+(right-left)*(tt/TT);}" +
        "function Y(v){return bot-(bot-top)*(v/mxv);}" +
        "G.strokeStyle='rgba(150,170,200,0.16)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(left,bot);G.lineTo(right,bot);G.stroke();" +
        "function curve(v,tt,col){G.strokeStyle=col;G.lineWidth=2;G.beginPath();" +
        "for(var s=0;s<=TT;s+=TT/260){" +
        "if(s>tt)break;" +
        "var y=Y(val(v,tt,s));" +
        "if(s===0)G.moveTo(X(s),y);else G.lineTo(X(s),y);}" +
        "G.stroke();" +
        "G.fillStyle=col;G.beginPath();G.arc(X(tt),Y(v),5,0,7);G.fill();}" +
        "curve(VA,TA,'rgba(255,168,72,0.92)');" +
        "curve(VB,TB,'rgba(120,180,235,0.92)');" +
        "var va=val(VA,TA,t),vb=val(VB,TB,t);" +
        // 今天这条竖线，和它此刻和两条曲线相交的位置
        "G.strokeStyle='rgba(236,240,250,0.32)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(X(t),top-8);G.lineTo(X(t),bot+8);G.stroke();" +
        "G.fillStyle='rgba(255,168,72,0.95)';" +
        "G.beginPath();G.arc(X(t),Y(va),4,0,7);G.fill();" +
        "G.fillStyle='rgba(120,180,235,0.95)';" +
        "G.beginPath();G.arc(X(t),Y(vb),4,0,7);G.fill();" +
        // 底下这条：此刻你要的是哪一件
        "var by=H-22,pick=(va>vb)?1:0;" +
        "G.fillStyle=pick?'rgba(255,168,72,0.92)':'rgba(120,180,235,0.92)';" +
        "G.fillRect(W*0.08,by,W*0.84,7);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
];
