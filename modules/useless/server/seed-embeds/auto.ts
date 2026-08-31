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
      // 一个看着完全正常的钟：刻度对、秒针走得准、时针分针的联动也对。
      // 只有一件事不对——分针一直偏着，偏 2 到 15 分钟。
      //
      // 偏多少由日期和小时定，所以这一小时里它自洽得毫无破绽，
      // 你盯着它看不出问题；下一小时它换一个偏差，还是自洽。
      // 它把钟能给的都给了你，只扣下了唯一那件你要的事。
      // 这条不给尽头：钟就该一直走下去，那正是它的可信之处
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
      stageCss("ut-flick", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-flick"),
      FIT +
        // Gray-Scott 反应扩散：两种化学物质，一种被另一种吃掉又自我催化。
        // 就这两行方程，长出来的东西会自己分裂、结痂、爬、织成迷宫
        "var GW=300,GH=169,N=GW*GH,KOFF=0;" +
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
        "B2[q]=b+0.5*lb+r-(K[q]+KOFF+F[q])*b;}}" +
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
        "var era=0;" +
        // 整块的参数在慢慢漂。花纹不是这片东西的性质，是这组参数的性质；
        // 漂出那个窄窗口，纹路就一层层化掉，剩一片什么都不是的均匀。
        // 然后漂回来，重新长——这是一直下去的
        "function tick(){era++;" +
        "KOFF=(era<4200)?0:(era<8400?(era-4200)*0.0000105:0);" +
        "if(era>11000){era=0;KOFF=0;clear();" +
        "for(var s3=0;s3<22;s3++)" +
        "seed(10+Math.random()*(GW-20),10+Math.random()*(GH-20),3,0);}" +
        "for(var s2=0;s2<5;s2++)step();draw();" +
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
      stageCss("ut-cloud", ";touch-action:none;cursor:crosshair"),
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
      stageCss("ut-dla", ";touch-action:none;cursor:crosshair"),
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
      stageCss("ut-chl"),
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
        "if(tt%2900===0){m=2+Math.random()*6;nn=2+Math.random()*6;field();}" +
        "var i,x,y,gx,gy,q,a,st;" +
        "for(i=0;i<N;i++){x=P[i*2];y=P[i*2+1];" +
        "gx=(x*(FN-1))|0;gy=(y*(FN-1))|0;" +
        "if(gx<1)gx=1;else if(gx>FN-2)gx=FN-2;" +
        "if(gy<1)gy=1;else if(gy>FN-2)gy=FN-2;" +
        "q=gy*FN+gx;a=FLD[q];" +
        // 抖的幅度跟当地振幅成正比：越靠近节线抖得越轻，于是自己被筛过去、
        // 而且再也抖不出来。这就是沙为什么会停在节线上。
        //
        // 一张图要跑够久才走得完：沙全落到线上、整片不再动，那个静止才是结果。
        // 原先 560 帧就换一次频率，等于每次都在沙刚开始聚拢时把它重新打散——
        // 永远在"正在形成"，永远不给你看形成之后
        "st=a*0.024;" +
        "x+=-(FLD[q+1]-FLD[q-1])*0.030+(Math.random()-0.5)*st;" +
        "y+=-(FLD[q+FN]-FLD[q-FN])*0.030+(Math.random()-0.5)*st;" +
        "if(x<0)x=-x;else if(x>1)x=2-x;" +
        "if(y<0)y=-y;else if(y>1)y=2-y;" +
        "P[i*2]=x;P[i*2+1]=y;}" +
        "G.save();G.globalCompositeOperation='destination-out';G.fillStyle='rgba(0,0,0,0.16)';G.fillRect(0,0,W,H);G.restore();" +
        "var s=Math.min(W,H)*0.86,ox=(W-s)/2,oy=(H-s)/2;" +
        "G.fillStyle='rgba(240,232,210,0.9)';" +
        "for(i=0;i<N;i++)G.fillRect(ox+P[i*2]*s,oy+P[i*2+1]*s,1.7,1.7);" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "吸引子",
    html: play(
      stageCss("ut-attr"),
      stageBody("ut-attr"),
      FIT +
        // Clifford 吸引子：一个点反复代进同一个式子，几十万次之后落点的疏密
        // 会画出一个形。参数一直在慢慢漂，所以这个形一直在变形，不会定下来
        "var GWd=1,GHd=1,DEN,off,og,im,flat=0;" +
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
        // 四个参数各按不同的慢周期漂：不可通约，所以形不会绕回原样。
        //
        // 漂着漂着会漂进简并区：吸引子塌成一个点或一条线，那些花纹全没了。
        // 那才是这套式子的真相——它本身没有什么特别，是你碰巧在看好参数。
        // 塌了就让它塌着待一会儿，看清楚了，再把相位推过去接着漂
        "pa=-1.6+0.7*Math.sin(t*0.00042);pb=1.5+0.6*Math.cos(t*0.00031);" +
        "pc=0.9+0.6*Math.sin(t*0.00023);pd=0.8+0.6*Math.cos(t*0.00037);" +
        "var i,nx,ny,gx,gy,q;" +
        "var alive2=0;" +
        "for(i=0;i<DEN.length;i++){DEN[i]*=0.965;if(DEN[i]>0.02)alive2++;}" +
        "if(alive2<DEN.length*0.006){flat++;if(flat>640){flat=0;t+=1500;}}else flat=0;" +
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
      stageCss("ut-cyc"),
      stageBody("ut-cyc"),
      FIT +
        // Greenberg–Hastings 可激发介质（BZ 反应那一类）：一格静着的时候，
        // 只要旁边有谁在兴奋，它就跟着兴奋；兴奋完必须进一段不应期，谁也叫不醒。
        // 就这两条，波前一断就会自己卷起来——螺旋是从断口长出来的，不是画的
        "var NS=13,EX=2,GW=1,GH=1,A,B2,off,og,im,gen=0,rest3=0;" +
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
        // 真实的可激发介质是要烧试剂的：每转一圈，恢复得都更慢一点。
        // 不应期长到某个程度，波前追不上自己的尾巴，螺旋就解体，
        // 整片安静下来。安静一会儿，换一缸新的试剂再来——这是一直下去的
        "if(gen>0&&gen%420===0&&NS<52)NS++;" +
        "if(alive<A.length*0.004&&gen>200){rest3++;" +
        "if(rest3>420){seedPhase();NS=13;gen=0;rest3=0;}}}" +
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
      stageCss("ut-grav"),
      stageBody("ut-grav"),
      FIT +
        // 五颗有质量的互相拉扯——三体以上就没有解析解，谁也算不出它们十分钟后
        // 在哪。四千颗没质量的尘埃只被拉、不拉别人，于是把整个引力场画了出来。
        //
        // 但这套东西真正的结局不是一直好看下去：多体系统会把成员一个个
        // **甩出去**，剩下的越抱越紧，最后通常只剩一对绕着转的。
        // 每甩掉一个，场就少一层结构，尘埃的花纹就简单一分。
        // 到只剩两颗时那张网基本就是两个圈了，好看的部分是被解掉的。
        // 原先这里写了环绕：飞出去就从对面拉回来——那是我在拦着它结束
        "var NB=5,BX,BY,BVX,BVY,BM,ALIVE,NP=4200,PX,PY,PVX,PVY,hold=0;" +
        "function alloc(){" +
        "BX=new Float64Array(NB);BY=new Float64Array(NB);" +
        "BVX=new Float64Array(NB);BVY=new Float64Array(NB);BM=new Float64Array(NB);" +
        "var R=Math.min(W,H)*0.26;" +
        "for(var i=0;i<NB;i++){var a=i/NB*6.2832;" +
        "BX[i]=W/2+Math.cos(a)*R;BY[i]=H/2+Math.sin(a)*R;" +
        "BVX[i]=-Math.sin(a)*1.05;BVY[i]=Math.cos(a)*1.05;BM[i]=760+Math.random()*520;}" +
        "ALIVE=new Uint8Array(NB);for(i=0;i<NB;i++)ALIVE[i]=1;hold=0;" +
        "PX=new Float32Array(NP);PY=new Float32Array(NP);" +
        "PVX=new Float32Array(NP);PVY=new Float32Array(NP);" +
        "for(var k=0;k<NP;k++){var b=Math.random()*6.2832," +
        "r=Math.sqrt(Math.random())*Math.min(W,H)*0.46;" +
        "PX[k]=W/2+Math.cos(b)*r;PY[k]=H/2+Math.sin(b)*r;" +
        "PVX[k]=-Math.sin(b)*1.5;PVY[k]=Math.cos(b)*1.5;}" +
        "G.clearRect(0,0,W,H);}" +
        "onfit=alloc;alloc();" +
        "function tick(){var i,j,dx,dy,d2,f,inv,n=0;" +
        "for(i=0;i<NB;i++)for(j=i+1;j<NB;j++){" +
        "if(!ALIVE[i]||!ALIVE[j])continue;" +
        "dx=BX[j]-BX[i];dy=BY[j]-BY[i];d2=dx*dx+dy*dy+900;" +
        "inv=1/Math.sqrt(d2);f=1/d2;" +
        "BVX[i]+=dx*inv*f*BM[j];BVY[i]+=dy*inv*f*BM[j];" +
        "BVX[j]-=dx*inv*f*BM[i];BVY[j]-=dy*inv*f*BM[i];}" +
        "for(i=0;i<NB;i++){if(!ALIVE[i])continue;" +
        "BX[i]+=BVX[i];BY[i]+=BVY[i];" +
        // 甩出去就是甩出去了，不回来
        "if(BX[i]<-W*0.7||BX[i]>W*1.7||BY[i]<-H*0.7||BY[i]>H*1.7)ALIVE[i]=0;" +
        "else n++;}" +
        // 剩两颗就没什么可解的了：那对会抱得越来越紧，尘埃退成两个圈。
        // 这一段要留够久，因为"解完了"本身就是要看的东西；久到最后那对
        // 自己也飘出去也没关系，那是同一件事的下一步。然后重开一局，一直下去
        "if(n<=2){hold++;if(hold>900)alloc();}" +
        "G.save();G.globalCompositeOperation='destination-out';G.fillStyle='rgba(0,0,0,0.085)';G.fillRect(0,0,W,H);G.restore();" +
        "G.fillStyle='rgba(150,190,255,0.5)';" +
        "for(var k=0;k<NP;k++){var ax=0,ay=0;" +
        "for(i=0;i<NB;i++){if(!ALIVE[i])continue;" +
        "dx=BX[i]-PX[k];dy=BY[i]-PY[k];d2=dx*dx+dy*dy+700;" +
        "f=BM[i]/(d2*Math.sqrt(d2));ax+=dx*f;ay+=dy*f;}" +
        "PVX[k]+=ax;PVY[k]+=ay;PVX[k]*=0.9995;PVY[k]*=0.9995;" +
        "PX[k]+=PVX[k];PY[k]+=PVY[k];" +
        "if(PX[k]<-40||PX[k]>W+40||PY[k]<-40||PY[k]>H+40){" +
        "var b=Math.random()*6.2832,r=Math.min(W,H)*0.46;" +
        "PX[k]=W/2+Math.cos(b)*r;PY[k]=H/2+Math.sin(b)*r;" +
        "PVX[k]=-Math.sin(b)*1.5;PVY[k]=Math.cos(b)*1.5;continue;}" +
        "G.fillRect(PX[k],PY[k],1.2,1.2);}" +
        "for(i=0;i<NB;i++){if(!ALIVE[i])continue;" +
        "G.fillStyle='rgba(255,228,180,0.95)';" +
        "G.beginPath();G.arc(BX[i],BY[i],2.6,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "水底",
    html: play(
      stageCss("ut-caus"),
      stageBody("ut-caus"),
      FIT +
        // 焦散：平行光穿过起皱的水面，被折射得有疏有密，落到池底就是那张网。
        // 亮的地方不是"画上去的光"，是折射后挤到一起的光线条数
        "var SN=1,SM=1,ACC,GWa=1,GHa=1,off,og,im,t=0,swell=1,fuel=0;" +
        "function alloc(){GWa=Math.max(160,Math.min(300,Math.round(W/4.6)));" +
        "GHa=Math.max(90,Math.round(GWa*H/W));" +
        "SN=Math.round(GWa*1.7);SM=Math.round(GHa*1.7);" +
        "ACC=new Float32Array(GWa*GHa);" +
        "off=document.createElement('canvas');off.width=GWa;off.height=GHa;" +
        "og=off.getContext('2d');im=og.createImageData(GWa,GHa);" +
        "var d=im.data;for(var i=0;i<GWa*GHa;i++)d[i*4+3]=255;}" +
        "onfit=alloc;alloc();" +
        // 三层不同尺度、不同方向、不同速度的波叠出水面高度。
        // 整体乘一个 swell：起风的时候是 1，风停之后一路衰到 0，
        // 水面一平，池底那张网就没有了——那张网从来不是水的性质，是浪的性质
        "function hgt(x,y){return swell*(Math.sin(x*15.3+t*0.021)*0.30" +
        "+Math.sin(x*7.7-y*11.1+t*0.017)*0.34" +
        "+Math.sin(y*19.7+x*5.1-t*0.026)*0.20" +
        "+Math.sin(x*27.3+y*23.1+t*0.011)*0.11);}" +
        "function tick(){t++;fuel++;" +
        // 一轮四分钟上下：起浪、稳住、风停、水面抹平、再起一阵
        "if(fuel<5200)swell=1;" +
        "else if(fuel<9000)swell=1-(fuel-5200)/3800;" +
        "else if(fuel<11200)swell=0;" +
        "else{fuel=0;swell=1;}" +
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
      stageCss("ut-lenia"),
      stageBody("ut-lenia"),
      FIT +
        // Lenia：生命游戏的连续版。格子不再是死/活，而是 0 到 1 的浓度；邻域不再是
        // 八格，而是一圈钟形的核。规则只有一条——邻域的加权平均落在某个窄带里就长，
        // 偏了就消。就这一条，会长出会动、会变形、会分裂的东西
        "var GW=1,GH=1,A,B2,off,og,im,KX,KY,KW,KN=0;" +
        "var R=9,MU=0.27,SIG=0.055,DT=0.10,age=0;" +
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
        "function tick(){age++;" +
        // 它们靠的那条生长带在慢慢挪。挪出去了就撑不住，一个个化掉。
        // 没有谁做错什么，是它们赖以成立的那个条件不在了。
        // 化完停一会儿，把条件调回来，再养一批——一直下去
        "if(age>3600)MU+=0.000075;" +
        "if(age>9000){age=0;MU=0.27;alloc();}" +
        "step();draw();requestAnimationFrame(tick);}tick();",
    ),
  },
  {
    title: "雪",
    html: play(
      stageCss("ut-snow"),
      stageBody("ut-snow"),
      FIT +
        // Reiter 的雪花元胞机，跑在六边形网格上。规则只有三句：已冻的和挨着冻的
        // 把水扣住不放，别处的水自由扩散，扣住的每步再从空气里多得一点。
        // 六次对称不是画出来的，是六边形网格自己带的
        "var GN=209,C=GN>>1,S,S2,off,og,im,steps=0,G0=0.0008;" +
        "var ALP=1.0,BET=0.42,GAM=0.0008;" +
        "function alloc(){S=new Float32Array(GN*GN);S2=new Float32Array(GN*GN);" +
        "S.fill(BET);S[C*GN+C]=1;steps=0;GAM=G0;" +
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
        // 周围的水汽是有数的：长到一定程度就没得补了，晶体停在那儿。
        // 一片雪花不是被谁叫停的，是它把身边的东西用完了。
        // 停够久再化一片新的——这是一直下去的
        "if(steps>26000)GAM=Math.max(0,GAM-0.00000012);" +
        "if(steps>42000)alloc();}" +
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
      stageCss("ut-grain"),
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
      stageCss("ut-rank"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-pile", ";touch-action:none;cursor:crosshair"),
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
      stageCss("ut-perc"),
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
      stageCss("ut-common"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-mimic"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-reso", ";touch-action:none;cursor:ew-resize"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-pd"),
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
      stageCss("ut-bif"),
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
        "og.clearRect(0,0,off.width,off.height);" +
        "col=0;hist=[];}" +
        "onfit=alloc;alloc();" +
        "function tick(){var c,i,r,x;" +
        "for(c=0;c<3&&col<off.width;c++,col++){" +
        "r=rmin+(rmax-rmin)*(col/off.width);x=0.35;" +
        "for(i=0;i<220;i++)x=r*x*(1-x);" +
        "og.fillStyle='rgba(150,206,255,0.16)';" +
        "for(i=0;i<260;i++){x=r*x*(1-x);" +
        "og.fillRect(col,(1-x)*off.height,1,1);}}" +
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-queen"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-vote"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-schel"),
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
      stageCss("ut-wealth"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-rankcull"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-casc"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-fly"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-overfit"),
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
        "G.clearRect(0,0,W,H);" +
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
      stageCss("ut-simp", ";touch-action:none;cursor:ew-resize"),
      stageBody("ut-simp"),
      FIT +
        // 一批点，位置从头到尾没动过。
        //
        // **那条竖线由你拖。** 它把这批点切成两半，然后这条东西老老实实算三条趋势：
        // 左半边一条、右半边一条、全体一条。三条都是最小二乘，一个字没作假。
        //
        // 把线拖到中间那道缝里：左右两边都往上，全体往下。**三条都是真的。**
        // 拖到别处，你会得到别的组合，也一样都是真的。
        //
        // 所以这条东西**不给你"正确的切法"**。不是我没做那个按钮——
        // 是那个按钮不存在：任何一条结论都要先选一个切法，
        // 而选切法的人已经把结论选完了。「让数据说话」是句空话，
        // 数据不会说话，是切它的人在说
        "var P=[],split=0.5,down=false;" +
        "function alloc(){P=[];var i;" +
        "for(i=0;i<130;i++){var x=0.06+Math.random()*0.36;" +
        "P.push({x:x,y:0.48+(x-0.24)*0.55+(Math.random()-0.5)*0.13});}" +
        "for(i=0;i<130;i++){var x2=0.58+Math.random()*0.36;" +
        "P.push({x:x2,y:0.20+(x2-0.76)*0.55+(Math.random()-0.5)*0.13});}}" +
        "alloc();" +
        // 最小二乘。sel<0 全体，0 左半，1 右半
        "function lin(sel){var n=0,sx=0,sy=0,sxx=0,sxy=0,i,p;" +
        "for(i=0;i<P.length;i++){p=P[i];" +
        "if(sel===0&&p.x>=split)continue;" +
        "if(sel===1&&p.x<split)continue;" +
        "n++;sx+=p.x;sy+=p.y;sxx+=p.x*p.x;sxy+=p.x*p.y;}" +
        "if(n<3)return null;var d=n*sxx-sx*sx;if(Math.abs(d)<1e-9)return null;" +
        "var b=(n*sxy-sx*sy)/d;return[b,(sy-b*sx)/n];}" +
        "function pxx(x){return x*W*0.88+W*0.06;}" +
        "function pyy(y){return H*0.88-y*H*0.72;}" +
        "function seg(f,x0,x1,col,w){if(!f)return;G.strokeStyle=col;G.lineWidth=w;" +
        "G.beginPath();G.moveTo(pxx(x0),pyy(f[0]*x0+f[1]));" +
        "G.lineTo(pxx(x1),pyy(f[0]*x1+f[1]));G.stroke();}" +
        "function tick(){" +
        "G.clearRect(0,0,W,H);" +
        "var i;" +
        "for(i=0;i<P.length;i++){var p=P[i];" +
        "G.fillStyle=INK(p.x<split?0.42:0.26);" +
        "G.beginPath();G.arc(pxx(p.x),pyy(p.y),3,0,7);G.fill();}" +
        // 全体那条。它一直往下
        "seg(lin(-1),0.03,0.97,INK(0.55),2.6);" +
        // 左右各一条。切在缝里的时候，两条都往上
        "seg(lin(0),0.03,split,'rgba(224,150,40,0.95)',2.2);" +
        "seg(lin(1),split,0.97,'rgba(224,150,40,0.95)',2.2);" +
        "G.strokeStyle=INK(0.30);G.lineWidth=1.4;G.setLineDash([5,5]);" +
        "G.beginPath();G.moveTo(pxx(split),H*0.05);G.lineTo(pxx(split),H*0.93);" +
        "G.stroke();G.setLineDash([]);" +
        "G.fillStyle=INK(0.45);" +
        "G.beginPath();G.arc(pxx(split),H*0.05,5,0,7);G.fill();" +
        "requestAnimationFrame(tick);}tick();" +
        "function put(e){var p=at(e),v=(p[0]-W*0.06)/(W*0.88);" +
        "split=v<0.08?0.08:(v>0.92?0.92:v);}" +
        "CV.addEventListener('pointerdown',function(e){down=true;put(e);e.preventDefault();});" +
        "CV.addEventListener('pointermove',function(e){if(down)put(e);});" +
        "CV.addEventListener('pointerup',function(){down=false;});" +
        "CV.addEventListener('pointerleave',function(){down=false;});"
    ),
  },
  {
    title: "锦标赛",
    html: play(
      stageCss("ut-tour", ";touch-action:none;cursor:pointer"),
      stageBody("ut-tour"),
      MEM +
        FIT +
        // 六十四个人，**实力完全一样**。每一场都是掷硬币，没有例外。
        //
        // 亮的那个是你。**按一下打一场**：赢了进下一轮，输了就没了，
        // 剩下的人接着打完，跟你没关系。
        //
        // 打得够多，你迟早会连赢六场。到那时顶上会摆出你的战绩——
        // 一排整整齐齐的六个赢，一次都没输过。
        //
        // 那排东西和一份真的简历长得一模一样，因为**简历本来就长这样**：
        // 它记的是赢了几场，不是为什么赢。这条东西没有藏起来的"实力"变量，
        // 你可以去看代码——就是 `Math.random()<0.5`。
        //
        // 它不给你任何办法打得更好，因为没有"更好"这回事。
        // 它只给你再来一次，而再来一次总会给出一份漂亮的战绩
        "var R6=6,alive=64,rnd=0,me=1,acc=0,phase=0,ph=0,SH=[];" +
        "var best=M.num('tou.best',0),runs=M.num('tou.n',0);" +
        "function alloc(){alive=64;rnd=0;me=1;acc=0;phase=0;ph=0;SH=[];}" +
        "alloc();" +
        // 你打一场。就这一行，没有别的
        "function play1(){if(!me)return;" +
        "if(Math.random()<0.5){rnd++;SH.push(1);" +
        "if(rnd>best){best=rnd;M.set(\'tou.best\',best);}" +
        "if(rnd>=R6){phase=2;ph=0;runs++;M.set(\'tou.n\',runs);}}" +
        "else{me=0;phase=1;ph=0;runs++;M.set(\'tou.n\',runs);}}" +
        "function tick(){ph++;" +
        // 你不打它替你打。它打的也是同一枚硬币
        "if(phase===0){acc++;if(acc>90){acc=0;play1();}}" +
        "else if(ph>300)alloc();" +
        // 每过一轮，场上就少一半人。这一半跟谁强谁弱没有关系
        "alive=64>>Math.min(6,rnd);" +
        "G.clearRect(0,0,W,H);" +
        "var i,k,cy=H*0.50,cols=16;" +
        // 场上还剩的人。你在里面的时候是琥珀色那个
        "for(i=0;i<alive;i++){" +
        "var x=W*0.5+((i%cols)-(Math.min(alive,cols)-1)/2)*W*0.045;" +
        "var y=cy+((i/cols)|0)*22-((alive/cols)|0)*11;" +
        "G.fillStyle=INK(0.30);G.beginPath();G.arc(x,y,4,0,7);G.fill();}" +
        "if(me){G.fillStyle=\'rgba(224,150,40,0.98)\';" +
        "G.beginPath();G.arc(W*0.5,cy-((alive/cols)|0)*11-34,8,0,7);G.fill();" +
        "G.strokeStyle=\'rgba(224,150,40,0.35)\';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(W*0.5,cy-((alive/cols)|0)*11-34,8+((ph*0.6)%26),0,7);G.stroke();}" +
        // 这一局你赢过的场次
        "for(k=0;k<SH.length;k++){" +
        "G.fillStyle=\'rgba(224,150,40,0.9)\';" +
        "G.fillRect(W*0.5-(R6*17)/2+k*17,H*0.78,12,14);}" +
        "for(k=SH.length;k<R6;k++){G.strokeStyle=INK(0.14);G.lineWidth=1;" +
        "G.strokeRect(W*0.5-(R6*17)/2+k*17+0.5,H*0.78+0.5,11,13);}" +
        // 顶上：你打到今天为止最好的一次。它只会变好，不会变坏
        "for(k=0;k<R6;k++){var bx2=W*0.5-(R6*13)/2+k*13;" +
        "if(k<best){G.fillStyle=\'rgba(224,150,40,\'+(phase===2?0.95:0.62)+\')\';" +
        "G.fillRect(bx2,H*0.09,9,11);}" +
        "else{G.strokeStyle=INK(0.12);G.lineWidth=1;" +
        "G.strokeRect(bx2+0.5,H*0.09+0.5,8,10);}}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener(\'pointerdown\',function(e){" +
        "if(phase===0)play1();else alloc();e.preventDefault();});"
    ),
  },
  {
    title: "孔多塞",
    html: play(
      stageCss("ut-cond", ";touch-action:none;cursor:pointer"),
      stageBody("ut-cond"),
      MEM +
        FIT +
        // 三个选项，一群人各有各的排序。两两拿出来比，都按多数决：
        // 甲胜乙、乙胜丙、丙胜甲。三支箭头首尾相接，绕成一个圈。
        // 没有谁是多数派选出来的赢家——**根本不存在这样一个赢家**。
        //
        // 所以只能安排顺序：先比掉两个，剩下的那个再和胜者比。
        // **这个顺序由你定**：点三条边中的一条，那两个先比。
        //
        // 于是每次都是**你没让它上场的那一个**当选。三个你都能让它当选，
        // 而这群人的偏好从头到尾一个字没改过——顶上那三个圈是你的收藏，
        // 关掉页面回来还在。集齐三个，你就亲手证明了这里没有"集体的意愿"。
        //
        // 这条东西不给你"公平的议程"那个按钮。不是我没做：
        // **中立的顺序不存在**，因为顺序必须有一个，而任何一个都在决定结果
        "var G3=[],pair=[[0,1],[1,2],[2,0]],margin=[0,0,0],win=[0,0,0];" +
        "var phase=0,ph=0,firstE=-1,elim=-1,champ=-1,W1=-1;" +
        "var CR=M.get('con.win','000').split('');" +
        "if(CR.length!==3)CR=['0','0','0'];" +
        "function prefers(o,a,b){return o.indexOf(a)<o.indexOf(b);}" +
        "function compute(){for(var k=0;k<3;k++){" +
        "var a=pair[k][0],b=pair[k][1],ca=0,cb=0;" +
        "for(var g=0;g<3;g++){if(prefers(G3[g].o,a,b))ca+=G3[g].n;else cb+=G3[g].n;}" +
        "win[k]=ca>cb?a:b;margin[k]=Math.abs(ca-cb)/(ca+cb);}}" +
        // 三种排序各占一块。任意两块之和都大于第三块，所以必定出环——
        // 这不是碰巧挑出来的例子，是这个结构一定会有的样子
        "function alloc(){G3=[{o:[0,1,2],n:0},{o:[1,2,0],n:0},{o:[2,0,1],n:0}];" +
        "for(var i=0;i<3;i++)G3[i].n=26+((Math.random()*22)|0);compute();}" +
        "function beat(a,b){for(var k=0;k<3;k++){" +
        "if((pair[k][0]===a&&pair[k][1]===b)||(pair[k][0]===b&&pair[k][1]===a))" +
        "return win[k];}return a;}" +
        // 先比掉哪两个，第三个就赢。这不是我编的规则，是那个环自己的算术
        "function agenda(e){firstE=e;W1=win[e];" +
        "elim=(pair[e][0]===W1)?pair[e][1]:pair[e][0];" +
        "var third=3-pair[e][0]-pair[e][1];" +
        "champ=beat(W1,third);phase=1;ph=0;}" +
        "alloc();" +
        "function nx(i,cx,cy,R){return cx+Math.cos(-1.5708+i*2.0944)*R;}" +
        "function ny(i,cx,cy,R){return cy+Math.sin(-1.5708+i*2.0944)*R;}" +
        "function tick(){ph++;" +
        // 你不定它自己定一个。它挑的那条边也是随手挑的
        "if(phase===0){if(ph>460)agenda((Math.random()*3)|0);}" +
        "else if(phase===1){if(ph>150){phase=2;ph=0;}}" +
        "else if(phase===2){if(ph>120){phase=3;ph=0;" +
        "CR[champ]='1';M.set('con.win',CR.join(''));}}" +
        "else if(ph>300){phase=0;ph=0;firstE=-1;elim=-1;champ=-1;W1=-1;}" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.42,R=Math.min(W,H)*0.26,k,i;" +
        "var COL=['224,150,40','40,158,150','150,104,196'];" +
        // 三支箭头绕成的那个圈。它一直在，不管你怎么安排顺序
        "for(k=0;k<3;k++){var a=pair[k][0],b=pair[k][1];" +
        "var from=win[k],to=(from===a)?b:a;" +
        "var x1=nx(from,cx,cy,R),y1=ny(from,cx,cy,R);" +
        "var x2=nx(to,cx,cy,R),y2=ny(to,cx,cy,R);" +
        "var dx=x2-x1,dy=y2-y1,d=Math.sqrt(dx*dx+dy*dy)||1,pad=Math.min(W,H)*0.055;" +
        "x1+=dx/d*pad;y1+=dy/d*pad;x2-=dx/d*pad;y2-=dy/d*pad;" +
        "var hot=(k===firstE);" +
        "G.strokeStyle=hot?'rgba(224,150,40,0.95)':INK(0.16+margin[k]*0.7);" +
        "G.lineWidth=(hot?3:1.5)+margin[k]*10;G.lineCap='round';" +
        "G.beginPath();G.moveTo(x1,y1);G.lineTo(x2,y2);G.stroke();" +
        "var ang=Math.atan2(y2-y1,x2-x1),hs=8+margin[k]*14;" +
        "G.beginPath();G.moveTo(x2,y2);" +
        "G.lineTo(x2-Math.cos(ang-0.42)*hs,y2-Math.sin(ang-0.42)*hs);" +
        "G.lineTo(x2-Math.cos(ang+0.42)*hs,y2-Math.sin(ang+0.42)*hs);" +
        "G.closePath();G.fillStyle=hot?'rgba(224,150,40,0.9)':INK(0.5);G.fill();}" +
        "for(k=0;k<3;k++){" +
        "var dead=(phase>=2&&k===elim)||(phase===3&&k!==champ);" +
        "var r2=Math.min(W,H)*(k===champ&&phase===3?0.058:0.045);" +
        "G.fillStyle='rgba('+COL[k]+','+(dead?0.18:0.95)+')';" +
        "G.beginPath();G.arc(nx(k,cx,cy,R),ny(k,cx,cy,R),r2,0,7);G.fill();" +
        "if(k===champ&&phase===3){G.strokeStyle='rgba('+COL[k]+',0.6)';G.lineWidth=1.6;" +
        "G.beginPath();G.arc(nx(k,cx,cy,R),ny(k,cx,cy,R),r2+7+ph*0.03,0,7);G.stroke();}}" +
        // 底下三堆是选民，每堆的排序用三个小点从左到右表示。**它们从不改变**
        "var by=H*0.80;" +
        "for(var g=0;g<3;g++){var ox=W*0.5+(g-1)*W*0.26-W*0.02;" +
        "for(k=0;k<3;k++){G.fillStyle='rgba('+COL[G3[g].o[k]]+',0.9)';" +
        "G.beginPath();G.arc(ox+k*18,by,6,0,7);G.fill();}" +
        "G.fillStyle=INK(0.24);" +
        "for(var m=0;m<G3[g].n;m++)" +
        "G.fillRect(ox-6+(m%18)*4.6,by+18+((m/18)|0)*5,3,3);}" +
        // 顶上：你已经让谁当选过。集齐三个就是全部的论证
        "for(k=0;k<3;k++){var hx=W*0.5+(k-1)*30,hy=H*0.06;" +
        "G.strokeStyle='rgba('+COL[k]+',0.55)';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(hx,hy,7,0,7);G.stroke();" +
        "if(CR[k]==='1'){G.fillStyle='rgba('+COL[k]+',0.95)';" +
        "G.beginPath();G.arc(hx,hy,4.4,0,7);G.fill();}}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(phase!==0){e.preventDefault();return;}" +
        "var p=at(e),cx2=W/2,cy2=H*0.42,R2=Math.min(W,H)*0.26,best=0,bd=1e9;" +
        "for(var k2=0;k2<3;k2++){" +
        "var mxp=(nx(pair[k2][0],cx2,cy2,R2)+nx(pair[k2][1],cx2,cy2,R2))*0.5;" +
        "var myp=(ny(pair[k2][0],cx2,cy2,R2)+ny(pair[k2][1],cx2,cy2,R2))*0.5;" +
        "var dd=(p[0]-mxp)*(p[0]-mxp)+(p[1]-myp)*(p[1]-myp);" +
        "if(dd<bd){bd=dd;best=k2;}}" +
        "agenda(best);e.preventDefault();});"
    ),
  },
  {
    title: "赢家诅咒",
    html: play(
      stageCss("ut-curse", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-curse"),
      MEM +
        FIT +
        // 一件东西有个真实价值。你看不见它——你看见的是**你自己对它的读数**：
        // 中间那团晃着的雾。雾的中心就是你的估价，它是无偏的（平均而言不高不低），
        // 但单独这一次可能差得很远，而雾有多宽，你就有多不知道。
        //
        // 另外十一个人各有各的雾，你看不见。
        //
        // 按住画面报个价，也可以什么都不做，让这一件过去。
        //
        // 报了价——无论买没买到——雾会收拢、滑到真值上，你看着自己差了多少。
        // 什么都不做，拍卖照样发生、照样有人买走，**但你那团雾不散**。
        // 看得见是要买门票的，而门票只有一种买法：把自己押进去。
        //
        // 押进去又怎样呢：买到手的永远是估得最高的那个，也就是错得最乐观的那个。
        // 底下那堆是你的账，关掉页面回来还在——红的是买到手多付的，
        // 琥珀的发丝是报了价没买到，灰的发丝是忍住没报。
        // 忍住的记录细到看不见，出手的记录厚得压着画面。
        // 这条东西没有赢法：不报价就永远看不清，报价就在给那堆添厚度
        "var N=12,V=0,EST=[],my=0,bid=-1,phase=0,ph=0,winner=-1,over=0,down=false;" +
        "var PILE=[],PL=M.get('cur.pile','').split(',');" +
        "for(var pi=0;pi<PL.length;pi++){var pv=parseFloat(PL[pi]);" +
        "if(isFinite(pv))PILE.push(pv);}" +
        // 那团雾的粒子：横向位置、相位、快慢各自不同，所以它一直在晃，
        // 晃到你没法靠盯着它把中心量准——不知道就是不知道
        "var NF=320,FX=[],FA=[],FS=[];" +
        "for(var fi=0;fi<NF;fi++){FX.push(Math.random());" +
        "FA.push(Math.random()*6.2832);FS.push(0.5+Math.random()*1.1);}" +
        // 三个均匀分布相加，近似正态：估价散得开，但中心就是真值
        "function tri(){return (Math.random()+Math.random()+Math.random()-1.5)*0.24;}" +
        "function cl(v){return v<0.03?0.03:(v>0.97?0.97:v);}" +
        "function pyv(v){return H*0.82-v*H*0.66;}" +
        "function vy(y){return (H*0.82-y)/(H*0.66);}" +
        "function bx(k){return W*0.30+W*0.62*(k-1)/(N-2);}" +
        "function roll(){V=0.30+Math.random()*0.42;EST=[];" +
        "for(var i=0;i<N;i++)EST.push(cl(V+tri()));" +
        "my=EST[0];bid=-1;winner=-1;over=0;phase=0;ph=0;down=false;}" +
        "function settle(){var i,best=1,bv=EST[1];" +
        // 别人照自己的估价报，谁高谁拿走
        "for(i=2;i<N;i++)if(EST[i]>bv){bv=EST[i];best=i;}" +
        "if(bid>=0&&bid>bv){winner=0;over=bid-V;}else{winner=best;over=bv-V;}" +
        "if(bid<0)PILE.push(-2);" +
        "else if(winner===0)PILE.push(Math.max(0,over));else PILE.push(-1);" +
        "if(PILE.length>420)PILE.shift();M.set('cur.pile',PILE.join(','));}" +
        "roll();" +
        "function tick(){ph++;" +
        // 报价窗口 180 帧。过了就过了，这一件不会再来一次
        "if(phase===0){if(ph>180){settle();phase=bid>=0?1:2;ph=0;}}" +
        "else if(phase===1){if(ph>150)roll();}" +
        "else{if(ph>120)roll();}" +
        "G.clearRect(0,0,W,H);" +
        "var MX=W*0.16,i,al;" +
        "G.strokeStyle='rgba(130,150,185,0.12)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(MX,pyv(1));G.lineTo(MX,pyv(0));G.stroke();" +
        // 报过价，雾才会收拢、滑到真值上。没报，它就一直晃在你自己的读数上
        "var k2=0,ctr=my,sp=1;" +
        "if(phase===1){k2=ph/80;if(k2>1)k2=1;sp=1-k2;ctr=my+(V-my)*k2;}" +
        "var dim=phase===2?Math.max(0,1-ph/120):1;" +
        "for(i=0;i<NF;i++){" +
        // 两个不可通约的慢频叠着，所以这团雾一直在翻，翻不出周期
        "var off=(Math.sin(ph*0.037*FS[i]+FA[i])*0.6+" +
        "Math.sin(ph*0.017+FA[i]*2.7)*0.4)*0.27*sp;" +
        "var hx=W*0.20+W*0.76*FX[i]+Math.sin(ph*0.011+FA[i])*W*0.022*sp;" +
        "G.fillStyle=INK((0.22+0.30*k2)*dim);" +
        "G.beginPath();G.arc(hx,pyv(ctr+off),(1.3+2.0*FS[i]+1.5*k2).toFixed(2),0,7);" +
        "G.fill();}" +
        "if(phase===0){" +
        // 你的估价：雾的中心。它一路在淡下去——窗口越接近关上，
        // 你越看不清自己到底知道什么
        "var fade=1-ph/180;if(fade<0.16)fade=0.16;" +
        "G.strokeStyle='rgba(214,138,32,'+fade.toFixed(3)+')';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(0,pyv(my));G.lineTo(W*0.30,pyv(my));G.stroke();" +
        // 另外十一个人在场。你只看得见他们在，看不见他们知道什么
        "G.fillStyle=INK(0.42);" +
        "for(i=1;i<N;i++){G.beginPath();G.arc(bx(i),pyv(0)+20,3.2,0,7);G.fill();}" +
        "if(bid>=0){G.strokeStyle='rgba(224,150,40,0.85)';G.lineWidth=1.3;" +
        "G.beginPath();G.moveTo(0,pyv(bid));G.lineTo(W,pyv(bid));G.stroke();" +
        "G.fillStyle='rgba(224,150,40,0.98)';" +
        "G.beginPath();G.arc(MX,pyv(bid),6,0,7);G.fill();}}" +
        "else{al=ph/16;if(al>1)al=1;al*=dim;" +
        "var wx=winner===0?MX:bx(winner),wv=winner===0?bid:EST[winner];" +
        // 多付的那一截画成实的：拿走它的人高出真值多少。
        // 只有雾收拢了才画得出来——没报价就没有这一截，也没有那个数
        "if(phase===1&&wv>V){" +
        "G.fillStyle=(winner===0?'rgba(206,92,74,':'rgba(116,88,98,')+(0.6*k2).toFixed(3)+')';" +
        "G.fillRect(wx-W*0.045,pyv(wv),W*0.09,pyv(V)-pyv(wv));}" +
        "G.fillStyle=INK(0.6*al);" +
        "for(i=1;i<N;i++){G.beginPath();G.arc(bx(i),pyv(EST[i]),4,0,7);G.fill();}" +
        "if(bid>=0){G.fillStyle='rgba(224,150,40,'+(0.95*al).toFixed(3)+')';" +
        "G.beginPath();G.arc(MX,pyv(bid),6,0,7);G.fill();}" +
        "G.strokeStyle=winner===0?'rgba(224,150,40,'+(0.95*al).toFixed(3)+')':INK(0.5*al);" +
        "G.lineWidth=1.6;" +
        "G.beginPath();G.arc(wx,pyv(wv),11,0,7);G.stroke();}" +
        // 那堆账画在最后，所以它是**盖上去**的：从底边往上长，
        // 一点点把这场拍卖埋掉。多付得越多那道疤越厚；忍住的那次
        // 只有一根一像素的发丝。买得够多，你就快看不见自己在买什么了
        "var band=H*0.36,yy=H;" +
        "for(i=PILE.length-1;i>=0&&yy>H-band;i--){var hv=PILE[i];" +
        "var hg=hv>=0?hv*H*0.13:(hv>-1.5?1.6:1);if(hg<1)hg=1;" +
        "if(yy-hg<H-band)hg=yy-(H-band);" +
        "G.fillStyle=hv>=0?'rgba(206,92,74,0.88)':" +
        "(hv>-1.5?'rgba(214,176,120,0.55)':'rgba(110,126,156,0.40)');" +
        "G.fillRect(0,yy-hg,W,hg);yy-=hg;}" +
        "requestAnimationFrame(tick);}tick();" +
        "function put(e){if(phase!==0)return;var p=at(e);" +
        "var b=vy(p[1]);bid=b<0?0:(b>1?1:b);}" +
        "CV.addEventListener('pointerdown',function(e){down=true;put(e);e.preventDefault();});" +
        "CV.addEventListener('pointermove',function(e){if(down)put(e);});" +
        "CV.addEventListener('pointerup',function(){down=false;});" +
        "CV.addEventListener('pointerleave',function(){down=false;});",
    ),
  },
  {
    title: "柠檬市场",
    html: play(
      stageCss("ut-lemon", ";touch-action:none;cursor:pointer"),
      stageBody("ut-lemon"),
      MEM +
        FIT +
        // 一屋子卖家，东西有好有坏（越高越好）。买家看不出好坏，
        // 只肯按**当下的平均水平**出价——那条橙线。这不是他坏，是他真的分不出。
        //
        // 于是东西比价钱好的人退出，剩下的平均更差，价再掉，又一批退出。
        // 你看着它一层层塌下去。
        //
        // **你也在里面**：中间那颗亮的是你手上这件，它在上面，是好的。
        // 点一下就是卖掉——按当下这个价。价一直在跌，所以你卖得越早拿得越多，
        // 而最早的那一刻你还什么都不知道。
        //
        // 不卖也行。可这个市场里最好的那一件，就是你手上这件；
        // 你把它留住，它就**从这个市场里彻底没有了**。
        // 顶上那条虚线是这里还剩的最好的东西有多好——
        // 你每退出一次它掉得比你卖掉一次更多，而且只往下走，
        // 关掉页面回来还在那儿。没有把它拉回去的办法。
        //
        // 两条路都是亏：卖，你自己亏；不卖，所有人亏。
        // 这条东西不给第三条路，因为现实里也没有
        "var NM=340,Q=new Float64Array(NM),AL=new Uint8Array(NM);" +
        "var XS=new Float64Array(NM);" +
        "var cap=M.num('lem.cap',1),myq=0,price=1,phase=0,ph=0,sold=-1,acc=0,my2=0;" +
        "function pyq(q){return H*0.90-q*H*0.80;}" +
        "function newRound(){var i;" +
        "for(i=0;i<NM;i++){Q[i]=Math.random()*cap;AL[i]=1;XS[i]=Math.random();}" +
        // 你手上这件总在这个市场的顶上。所以它一定是"退出的那一批"里的
        "myq=cap*(0.82+Math.random()*0.16);" +
        "price=cap*0.52;phase=0;ph=0;sold=-1;acc=0;my2=myq;}" +
        // 买家把价挪向当下的平均。挪完，东西比价钱好的那批陆续不卖了——
        // 是陆续，不是一刀切：一刀切的话整个市场三十帧就见底，
        // 而这条东西要给你看的正是"一层层塌下去"这个过程本身
        "function cascade(){var i,s=0,n=0;" +
        "for(i=0;i<NM;i++)if(AL[i]){s+=Q[i];n++;}" +
        "if(n<2)return;price+=(s/n-price)*0.07;" +
        "for(i=0;i<NM;i++)" +
        "if(AL[i]&&Q[i]>price+0.010&&Math.random()<0.025)AL[i]=0;}" +
        "newRound();" +
        "function tick(){ph++;" +
        "if(phase===0){acc++;if(acc>4){acc=0;cascade();}" +
        "if(ph>380){phase=1;ph=0;" +
        // 卖掉，这个市场少一件好的；守住不卖，也少一件好的，而且少得更狠——
        // 卖掉的东西好歹还在别人手上，守住的等于从来没存在过
        "cap=cap-(sold>=0?0.010:0.017);if(cap<0.06)cap=0.06;" +
        "M.set('lem.cap',cap);}}" +
        "else if(ph>120)newRound();" +
        "if(phase===1){var kk=ph/60;if(kk>1)kk=1;" +
        // 卖了就滑到价线上去；没卖就往上飘出画面——你带着它走了
        "my2=sold>=0?(sold+(price-sold)*kk):(myq+(1.22-myq)*kk);}" +
        "else my2=sold>=0?sold:myq;" +
        "G.clearRect(0,0,W,H);" +
        // 天花板：这里还剩的最好的东西有多好。只往下走
        "G.strokeStyle='rgba(150,170,200,0.20)';G.lineWidth=1;G.setLineDash([2,7]);" +
        "G.beginPath();G.moveTo(0,pyq(cap));G.lineTo(W,pyq(cap));G.stroke();" +
        "G.setLineDash([]);" +
        "var i,cq=cap<0.06?0.06:cap;" +
        "for(i=0;i<NM;i++){var x=W*0.04+W*0.92*XS[i];" +
        "if(AL[i]){G.fillStyle='hsla('+((40+Q[i]/cq*118)|0)+',72%,60%,0.82)';" +
        "G.beginPath();G.arc(x,pyq(Q[i]),2.7,0,7);G.fill();}" +
        // 退出的留一个灰点在原处：它们没有消失，只是不卖了
        "else{G.fillStyle='rgba(96,104,120,0.30)';G.fillRect(x-1.2,pyq(Q[i])-1.2,2.4,2.4);}}" +
        "G.strokeStyle='rgba(255,176,110,0.9)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(0,pyq(price));G.lineTo(W,pyq(price));G.stroke();" +
        "var mal=phase===1?(1-ph/110):1;if(mal<0)mal=0;" +
        // 你和那个价之间的空当，就是你要吞下去的那一截
        "G.strokeStyle=INK(0.30*mal);G.lineWidth=1.2;" +
        "G.beginPath();G.moveTo(W*0.5,pyq(my2));G.lineTo(W*0.5,pyq(price));G.stroke();" +
        "if(sold>=0){G.strokeStyle=INK(0.30*mal);" +
        "G.setLineDash([3,4]);G.beginPath();" +
        "G.moveTo(W*0.5-16,pyq(myq));G.lineTo(W*0.5+16,pyq(myq));G.stroke();" +
        "G.setLineDash([]);}" +
        "G.fillStyle=INK(0.92*mal);" +
        "G.beginPath();G.arc(W*0.5,pyq(my2),7.5,0,7);G.fill();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(phase===0&&sold<0)sold=price;e.preventDefault();});",
    ),
  },
  {
    title: "回归",
    html: play(
      stageCss("ut-regress", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-regress"),
      MEM +
        FIT +
        // 左边是第一次考试。每个人有一个真实水平，**从头到尾一次都没变过**；
        // 变的只有当天的运气。
        //
        // 按住左边挑一批人出来做干预——挑谁由你。松手，第二次考试就考了。
        //
        // 挑垫底那批，他们大幅进步。挑拔尖那批，他们退步。你什么都没做过。
        //
        // **对照组一直在画面上。** 你圈中的那批里，只有一半被算成"接受了干预"
        // （琥珀色），另一半是对照（灰色）——同一批人、同样的起点、同样的第二次。
        // 两组的走向一模一样。这条东西不替你把那条对照均值线画出来：
        // 它就在那儿，你自己看。
        //
        // 背景里那把越来越密的琥珀色扇子，是你历次干预的战绩，
        // 关掉页面回来还在。全都朝一个方向斜——因为你每次都挑垫底的，
        // 而垫底的每次都会回来。**你要多少战绩它就给你多少，一张都不作假。**
        //
        // 你不动手它也不闲着：等够了它自己挑垫底那批，自己给自己发一张奖状
        "var N=260,S,A,B,TAG,XJ,phase=0,ph=0,sel=-1,SW=0.075,down=false;" +
        "var EV=[],EL=M.get('reg.ev','').split(',');" +
        "for(var ei=0;ei<EL.length;ei++){var ep=EL[ei].split(':');" +
        "if(ep.length===2){var e1=parseFloat(ep[0]),e2=parseFloat(ep[1]);" +
        "if(isFinite(e1)&&isFinite(e2))EV.push([e1,e2]);}}" +
        "function py(v){return H*0.90-v*H*0.78;}" +
        "function vy(y){return (H*0.90-y)/(H*0.78);}" +
        "function alloc(){S=new Float64Array(N);A=new Float64Array(N);" +
        "B=new Float64Array(N);TAG=new Uint8Array(N);XJ=new Float64Array(N);" +
        // 真实水平只抽一次，两次考试都围着它抖。所以任何"进步"都只是运气换了一次
        "for(var i=0;i<N;i++){S[i]=0.5+(Math.random()+Math.random()-1)*0.16;" +
        "A[i]=S[i]+(Math.random()+Math.random()-1)*0.20;" +
        "B[i]=S[i]+(Math.random()+Math.random()-1)*0.20;XJ[i]=Math.random();}" +
        "phase=0;ph=0;sel=-1;}" +
        "function lowBand(){var idx=[],i;for(i=0;i<N;i++)idx.push(i);" +
        "idx.sort(function(a,b){return A[a]-A[b];});" +
        "var c=(N*0.10)|0,s=0;for(i=0;i<c;i++)s+=A[idx[i]];return s/c;}" +
        // 圈中的这批里掷一次硬币分两半：一半算"受了干预"，一半是对照。
        // 两边其实什么都没受到，所以两边一定走得一样——这就是全部机关
        "function commit(auto){var i,n=0;" +
        "for(i=0;i<N;i++)TAG[i]=0;" +
        "for(i=0;i<N;i++)if(Math.abs(A[i]-sel)<SW){TAG[i]=Math.random()<0.5?1:2;n++;}" +
        "if(n<8){sel=-1;return;}" +
        "phase=1;ph=0;" +
        // 只有你亲手挑的那次进战绩。它自己挑的那次不算——那是它在演示，不是你在干
        "if(!auto){var ta=0,tb=0,tn=0;" +
        "for(i=0;i<N;i++)if(TAG[i]===1){ta+=A[i];tb+=B[i];tn++;}" +
        "if(tn>2){EV.push([ta/tn,tb/tn]);if(EV.length>90)EV.shift();" +
        "var o=[];for(i=0;i<EV.length;i++)o.push(EV[i][0].toFixed(3)+':'+EV[i][1].toFixed(3));" +
        "M.set('reg.ev',o.join(','));}}}" +
        "onfit=alloc;alloc();" +
        "function tick(){ph++;" +
        "if(phase===0){if(ph>340){if(sel<0){sel=lowBand();commit(1);}else commit(0);}}" +
        "else if(ph>440)alloc();" +
        "G.clearRect(0,0,W,H);" +
        "var i,x1=W*0.28,x2=W*0.88;" +
        // 背景那把扇子：历次战绩，一张不落，全朝一个方向斜。
        // 它铺满整幅宽度，比这一轮的线更长——所以它是"底下那一层"，
        // 不会和当前这轮混在一起。攒得越多越密，而每一条都是真的
        "G.lineWidth=1.2;G.lineCap='round';" +
        "for(i=0;i<EV.length;i++){" +
        "G.strokeStyle='rgba(224,150,40,'+(0.08+0.14*(i+1)/EV.length).toFixed(3)+')';" +
        "G.beginPath();G.moveTo(0,py(EV[i][0]));G.lineTo(W,py(EV[i][1]));G.stroke();}" +
        // 挑人的时候，第一次考试是**一片人群**，不是一根竖线：
        // 你在一片人里划一道，那才叫挑人。挑完他们收拢成一列，
        // 第二次考试再从这一列考出去
        "var ga=phase===1?ph/45:0;if(ga>1)ga=1;" +
        "var gr=phase===1?(ph-45)/60:0;if(gr<0)gr=0;if(gr>1)gr=1;" +
        "for(i=0;i<N;i++){var t2=TAG[i];" +
        "var cx=W*0.04+W*0.42*XJ[i],xs=cx+(x1-cx)*ga;" +
        "var xe=xs+(x2-xs)*gr,ye=py(A[i]+(B[i]-A[i])*gr);" +
        "if(gr>0){G.strokeStyle=t2===1?'rgba(224,150,40,0.6)':INK(t2===2?0.42:0.10);" +
        "G.lineWidth=t2?1.4:0.7;" +
        "G.beginPath();G.moveTo(xs,py(A[i]));G.lineTo(xe,ye);G.stroke();}" +
        // 落在带子里的人先亮起来——你看得见自己圈住了谁
        "var inb=phase===0&&sel>=0&&Math.abs(A[i]-sel)<SW;" +
        "G.fillStyle=t2===1?'rgba(224,150,40,0.95)':INK(t2===2?0.62:(inb?0.80:0.26));" +
        "G.beginPath();G.arc(xs,py(A[i]),t2||inb?3.6:2.2,0,7);G.fill();" +
        "if(gr>0){G.beginPath();G.arc(xe,ye,t2?3.6:2.2,0,7);G.fill();}}" +
        "if(phase===0&&sel>=0){G.strokeStyle=INK(0.30);G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,py(sel+SW));G.lineTo(W*0.46,py(sel+SW));" +
        "G.moveTo(0,py(sel-SW));G.lineTo(W*0.52,py(sel-SW));G.stroke();}" +
        // 受了干预的那批的均值线。**只画这一条。**
        // 对照那批的均值和它重合，可这条东西不替你画出来——你自己看那些灰点
        "if(gr>0.02){var ta=0,tb=0,tn=0;" +
        "for(i=0;i<N;i++)if(TAG[i]===1){ta+=A[i];tb+=B[i];tn++;}" +
        "if(tn>2){ta/=tn;tb/=tn;" +
        "G.strokeStyle='rgba(224,150,40,0.95)';G.lineWidth=3;" +
        "G.beginPath();G.moveTo(x1,py(ta));" +
        "G.lineTo(x1+(x2-x1)*gr,py(ta+(tb-ta)*gr));G.stroke();}}" +
        "requestAnimationFrame(tick);}tick();" +
        "function pick(e){if(phase!==0)return;var p=at(e);" +
        "var v=vy(p[1]);sel=v<0.02?0.02:(v>0.98?0.98:v);}" +
        // 结果放到一半也能按：当场换一批人，并且立刻圈住你按的那一档。
        // 不让读者干等着一轮放完——等待不是这条东西要说的那件事
        "CV.addEventListener('pointerdown',function(e){down=true;" +
        "if(phase===1)alloc();pick(e);e.preventDefault();});" +
        "CV.addEventListener('pointermove',function(e){if(down)pick(e);});" +
        "CV.addEventListener('pointerup',function(){" +
        "if(down&&phase===0&&sel>=0)commit(0);down=false;});" +
        "CV.addEventListener('pointerleave',function(){down=false;});",
    ),
  },
  {
    title: "萤火虫",
    html: play(
      stageCss("ut-fire", ";touch-action:none;cursor:pointer"),
      stageBody("ut-fire"),
      FIT +
        // 每只虫有自己的节奏，也都会照着周围的节奏调一点。耦合慢慢加强，
        // 于是它们越闪越齐，最后整片一起明灭。很好看。
        //
        // 大的那只是你。默认你和大家一样在跟着调。
        // **按住画面，你就不跟了**——你保住自己的节奏，一点不改。
        //
        // 按住的时候你会发现：整片齐了，只有你一个在乱闪。
        // 那看上去不像"独立"，看上去像**坏了**。
        // 松手，两秒之内你就被吸进去，从此再也分不出哪只是你。
        //
        // 这条东西**没有"让别人跟着你"那个按钮**。
        // 齐的代价是没人分得出你，不齐的代价是看起来像坏的。就这两样
        "var NF=900,PH,OM,K=0,me=0,hold=false,up=1;" +
        "function alloc(){PH=new Float64Array(NF);OM=new Float64Array(NF);" +
        "for(var i=0;i<NF;i++){PH[i]=Math.random()*6.2832;" +
        "OM[i]=0.055+(Math.random()-0.5)*0.030;}" +
        "me=(NF*0.5)|0;K=0;up=1;}" +
        "alloc();" +
        "function tick(){var i,sx=0,sy=0;" +
        "for(i=0;i<NF;i++){sx+=Math.cos(PH[i]);sy+=Math.sin(PH[i]);}" +
        "var r=Math.sqrt(sx*sx+sy*sy)/NF,psi=Math.atan2(sy,sx);" +
        "for(i=0;i<NF;i++){" +
        // 按住的时候，只有你这一只的耦合是 0。别人照旧
        "var kk=(i===me&&hold)?0:K;" +
        "PH[i]+=OM[i]+kk*r*Math.sin(psi-PH[i]);}" +
        "K+=up*0.00055;if(K>0.30)up=-1;if(K<0){K=0;up=1;alloc();}" +
        "G.clearRect(0,0,W,H);" +
        "var cols=Math.ceil(Math.sqrt(NF*W/H)),rows=Math.ceil(NF/cols);" +
        "var cw=W/cols,ch=H/rows;" +
        "for(i=0;i<NF;i++){var x=(i%cols)*cw+cw/2,y=((i/cols)|0)*ch+ch/2;" +
        "var f=(1+Math.cos(PH[i]))/2;f=f*f*f;" +
        "if(i===me){G.fillStyle='rgba(224,150,40,'+(0.25+f*0.75).toFixed(3)+')';" +
        "G.beginPath();G.arc(x,y,4+f*6,0,7);G.fill();" +
        "G.strokeStyle='rgba(224,150,40,0.35)';G.lineWidth=1.2;" +
        "G.beginPath();G.arc(x,y,12,0,7);G.stroke();continue;}" +
        "if(f<0.02)continue;" +
        "G.fillStyle=INK(f*0.72);" +
        "G.beginPath();G.arc(x,y,1.6+f*3.4,0,7);G.fill();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){hold=true;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){hold=false;});" +
        "CV.addEventListener('pointercancel',function(){hold=false;});" +
        "CV.addEventListener('pointerleave',function(){hold=false;});"
    ),
  },
  {
    title: "锁定",
    html: play(
      stageCss("ut-lockin", ";touch-action:none;cursor:pointer"),
      stageBody("ut-lockin"),
      FIT +
        // 两种做法，**好坏完全一样**，一点差别都没有。
        // 每来一个人，就按当前谁用得多、按比例挑一个。仅此而已。
        //
        // **按一下，你就往少的那一边送十个人。** 送多少人是固定的，一直是十个。
        //
        // 一开始送十个，能把整个局面掀过去——可那时候两边各占一半，
        // 谁也看不出有什么可掀的，你也没有理由按。
        // 等到明显有一边赢了、你终于想按了，同样的十个人已经什么都不是。
        //
        // 你能改变结局的力气一直是同一份。**变的是它值多少。**
        // 这条东西不给你"早知道"，因为早的时候确实没有什么可知道的
        "var A=1,B=1,T=[],acc=0,hold2=0;" +
        "function alloc(){A=1;B=1;T=[];acc=0;hold2=0;}" +
        "alloc();" +
        "function tick(){acc++;" +
        "if(acc>1){acc=0;" +
        // 按比例挑一个。两边好坏一样，所以这里没有任何偏向
        "for(var k=0;k<3;k++){if(Math.random()*(A+B)<A)A++;else B++;}" +
        "T.push(A/(A+B));if(T.length>Math.max(80,(W*0.86)|0))T.shift();}" +
        "if(A+B>2600){hold2++;if(hold2>260)alloc();}" +
        "G.clearRect(0,0,W,H);" +
        "var i,ty=H*0.10,th=H*0.62;" +
        // 那条线是两边的占比。它一开始在中间抖，抖着抖着就贴到某一边去了
        "G.strokeStyle=INK(0.14);G.lineWidth=1;G.setLineDash([5,5]);" +
        "G.beginPath();G.moveTo(0,ty+th*0.5);G.lineTo(W,ty+th*0.5);G.stroke();" +
        "G.setLineDash([]);" +
        "if(T.length>1){G.strokeStyle=INK(0.55);G.lineWidth=2;G.beginPath();" +
        "for(i=0;i<T.length;i++){var xx=i/(T.length-1)*W;" +
        "if(i===0)G.moveTo(xx,ty+th*(1-T[i]));else G.lineTo(xx,ty+th*(1-T[i]));}" +
        "G.stroke();}" +
        // 底下两根柱子：谁用得多。你按的时候是往短的那根加
        "var by=H*0.94,bw=W*0.16,fr=A/(A+B);" +
        "G.fillStyle=INK(0.30);" +
        "G.fillRect(W*0.5-bw-W*0.01,by-H*0.16*fr,bw,H*0.16*fr);" +
        "G.fillRect(W*0.5+W*0.01,by-H*0.16*(1-fr),bw,H*0.16*(1-fr));" +
        // 你那十个人，按当前的盘子算，值多少。它一路缩下去
        "var worth=10/(A+B);" +
        "G.strokeStyle=INK(0.10);G.lineWidth=4;" +
        "G.beginPath();G.moveTo(W*0.08,H-6);G.lineTo(W*0.92,H-6);G.stroke();" +
        "G.strokeStyle='rgba(224,150,40,0.9)';G.beginPath();G.moveTo(W*0.08,H-6);" +
        "G.lineTo(W*0.08+W*0.84*Math.min(1,worth/0.5),H-6);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        // 十个人。永远是十个人
        "CV.addEventListener('pointerdown',function(e){" +
        "if(A<B)A+=10;else B+=10;e.preventDefault();});"
    ),
  },
  {
    title: "搭便车",
    html: play(
      stageCss("ut-freeride", ";touch-action:none;cursor:pointer"),
      stageBody("ut-freeride"),
      MEM +
        FIT +
        // 中间那个东西是大家共用的，它一直在漏。往里投东西它才在。
        //
        // 六十个人，每个人都是**有条件的合作者**：他看上一轮有多少人投了，
        // 就照着那个比例决定自己投不投。没有人是坏人，也没有人想搞垮它。
        // 可只要有几个人少投一点，下一轮就有更多人少投一点。它只会往下走。
        //
        // **按住画面就是你在投。** 你投的是真的，中间那个东西会因此大一点、
        // 亮一点；你投得越久，它塌得越慢。
        //
        // 但这条东西**没有给你"让别人也投"的按钮**。你能做的只有自己付出，
        // 而衰减是从别人那儿来的。你把自己投空，它还是会塌，只是慢一点。
        //
        // 你投出去的总量记在本地，只增不减。它买不回任何东西——
        // 那个东西塌了就是塌了，你的账还在
        "var NF=60,C=[],pot=1,round2=0,acc=0,hold=false,rest=0,seen=1;" +
        "var paid=M.num('fre.paid',0);" +
        "function alloc(){C=[];for(var i=0;i<NF;i++)C.push(0.62+Math.random()*0.3);" +
        "pot=1;round2=0;acc=0;rest=0;seen=1;}" +
        "alloc();" +
        "function step(){var i,s=0;" +
        // 每个人照着上一轮看到的合作水平定自己的，再往下磨一点点
        "for(i=0;i<NF;i++){C[i]+=(seen-C[i])*0.55;C[i]-=0.012+Math.random()*0.016;" +
        "if(C[i]<0)C[i]=0;s+=C[i];}" +
        "seen=s/NF;round2++;" +
        "var give=s/NF+(hold?0.9:0);" +
        // 池子一直在漏。投进来的补一点
        "pot+=(give-0.55)*0.10;if(pot<0)pot=0;if(pot>1.6)pot=1.6;" +
        "if(hold){paid+=0.02;M.set('fre.paid',paid.toFixed(2));}}" +
        "function tick(){acc++;if(acc>13){acc=0;step();}" +
        "if(pot<=0.005){rest++;if(rest>240)alloc();}" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W*0.5,cy=H*0.42,i;" +
        // 中间那个共用的东西。它的大小和亮度就是池子
        "var rr=Math.min(W,H)*0.06+Math.min(W,H)*0.16*pot;" +
        "G.fillStyle='rgba(224,150,40,'+(0.10+pot*0.55).toFixed(3)+')';" +
        "G.beginPath();G.arc(cx,cy,rr,0,7);G.fill();" +
        "G.strokeStyle=INK(0.14);G.lineWidth=1;" +
        "G.beginPath();G.arc(cx,cy,Math.min(W,H)*0.22,0,7);G.stroke();" +
        // 一圈人。谁还在投，谁的线还连着
        "for(i=0;i<NF;i++){var a=i/NF*6.2832;" +
        "var x=cx+Math.cos(a)*Math.min(W,H)*0.30,y=cy+Math.sin(a)*Math.min(W,H)*0.30;" +
        "if(C[i]>0.02){G.strokeStyle=INK(0.06+C[i]*0.28);G.lineWidth=1+C[i]*1.6;" +
        "G.beginPath();G.moveTo(x,y);" +
        "G.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);G.stroke();}" +
        "G.fillStyle=INK(0.16+C[i]*0.5);" +
        "G.beginPath();G.arc(x,y,3.4,0,7);G.fill();}" +
        // 你。按住的时候你那条线是亮的，而且比谁都粗
        "var ya=-1.5708,yx=cx+Math.cos(ya)*Math.min(W,H)*0.30;" +
        "var yy=cy+Math.sin(ya)*Math.min(W,H)*0.30;" +
        "if(hold){G.strokeStyle='rgba(224,150,40,0.9)';G.lineWidth=3.4;" +
        "G.beginPath();G.moveTo(yx,yy);G.lineTo(cx,cy-rr);G.stroke();}" +
        "G.fillStyle='rgba(224,150,40,0.98)';" +
        "G.beginPath();G.arc(yx,yy,7,0,7);G.fill();" +
        // 你一共投出去多少。只增不减，也换不回什么
        "G.strokeStyle=INK(0.10);G.lineWidth=4;" +
        "G.beginPath();G.moveTo(W*0.08,H-10);G.lineTo(W*0.92,H-10);G.stroke();" +
        "G.strokeStyle='rgba(224,150,40,0.85)';G.beginPath();G.moveTo(W*0.08,H-10);" +
        "G.lineTo(W*0.08+W*0.84*Math.min(1,paid/60),H-10);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){hold=true;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){hold=false;});" +
        "CV.addEventListener('pointercancel',function(){hold=false;});" +
        "CV.addEventListener('pointerleave',function(){hold=false;});"
    ),
  },
  {
    title: "配对",
    html: play(
      stageCss("ut-match", ";touch-action:none;cursor:pointer"),
      stageBody("ut-match"),
      FIT +
        // 两边各十二个人，各有各的偏好。规则完全对称：延迟接受算法，
        // 跑出来的匹配是稳定的——没有任何一对想私下重配。
        // 这个规则挑不出毛病，两边的人也挑不出毛病。
        //
        // 唯一没有被规则规定的，是**谁先开口**。
        //
        // **按左半边，你这边先开口；按右半边，对面先开口。** 偏好一个字没改，
        // 匹配立刻整个重排。底下两条是各自拿到的名次（越短越好）：
        // 先开口那边总是更好，而且好的那些正是对面丢的那些。
        //
        // 这条东西没有"两边都好"那个按钮。不是我没做——
        // 稳定匹配里，提议方拿到的是它所有稳定解里最好的那个，
        // 接收方拿到的正好是最差的那个。**这两句话是同一句话。**
        // 中立的规则已经给了你，剩下那件事规则管不着，而它决定一切
        "var NP=12,P0=[],P1=[],R0=[],R1=[],MT=[],side=0,ra=0,rb=0,anim=0;" +
        "function shuf(n){var a=[],i,j,t;for(i=0;i<n;i++)a.push(i);" +
        "for(i=n-1;i>0;i--){j=(Math.random()*(i+1))|0;t=a[i];a[i]=a[j];a[j]=t;}return a;}" +
        "function alloc(){P0=[];P1=[];R0=[];R1=[];var i,k;" +
        "for(i=0;i<NP;i++){P0.push(shuf(NP));P1.push(shuf(NP));}" +
        "for(i=0;i<NP;i++){R0.push(new Int16Array(NP));R1.push(new Int16Array(NP));" +
        "for(k=0;k<NP;k++){R0[i][P0[i][k]]=k;R1[i][P1[i][k]]=k;}}" +
        "side=0;anim=0;}" +
        // Gale–Shapley。prop=0 时左边提议，=1 时右边提议
        "function da(prop){var PA=prop?P1:P0,RB=prop?R0:R1;" +
        "var nx=new Int16Array(NP),m=new Int16Array(NP),free=[],i;" +
        "for(i=0;i<NP;i++){m[i]=-1;free.push(i);}" +
        "var guard=0;" +
        "while(free.length&&guard++<4000){var a=free.pop();" +
        "if(nx[a]>=NP)continue;var b=PA[a][nx[a]++];" +
        "if(m[b]<0)m[b]=a;" +
        "else if(RB[b][a]<RB[b][m[b]]){free.push(m[b]);m[b]=a;}" +
        "else free.push(a);}" +
        // 还回来的一律是「左边下标 → 右边下标」
        "var out=new Int16Array(NP);" +
        "for(i=0;i<NP;i++)out[i]=-1;" +
        "for(i=0;i<NP;i++){if(m[i]<0)continue;" +
        "if(prop)out[i]=m[i];else out[m[i]]=i;}" +
        "return out;}" +
        "function run(){MT=da(side);var i,sa=0,sb=0,n=0;" +
        "for(i=0;i<NP;i++){if(MT[i]<0)continue;n++;" +
        "sa+=R0[i][MT[i]];sb+=R1[MT[i]][i];}" +
        "ra=n?sa/n/(NP-1):0;rb=n?sb/n/(NP-1):0;anim=0;}" +
        "alloc();run();" +
        "function tick(){anim++;" +
        "G.clearRect(0,0,W,H);" +
        "var i,x1=W*0.26,x2=W*0.74,top=H*0.10,bh=H*0.60;" +
        "function yy(i2){return top+bh*(i2/(NP-1));}" +
        "var gr=anim/26;if(gr>1)gr=1;" +
        "for(i=0;i<NP;i++){if(MT[i]<0)continue;" +
        "G.strokeStyle=INK(0.28);G.lineWidth=1.4;" +
        "G.beginPath();G.moveTo(x1,yy(i));" +
        "G.lineTo(x1+(x2-x1)*gr,yy(i)+(yy(MT[i])-yy(i))*gr);G.stroke();}" +
        "for(i=0;i<NP;i++){" +
        // 先开口那一边是琥珀色的
        "G.fillStyle=side===0?'rgba(224,150,40,0.9)':INK(0.45);" +
        "G.beginPath();G.arc(x1,yy(i),5,0,7);G.fill();" +
        "G.fillStyle=side===1?'rgba(224,150,40,0.9)':INK(0.45);" +
        "G.beginPath();G.arc(x2,yy(i),5,0,7);G.fill();}" +
        // 两条：各自拿到的名次，越短越好
        "function bar(y,v,hot){G.strokeStyle=INK(0.10);G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.10,y);G.lineTo(W*0.90,y);G.stroke();" +
        "G.strokeStyle=hot?'rgba(224,150,40,0.9)':INK(0.42);" +
        "G.beginPath();G.moveTo(W*0.10,y);" +
        "G.lineTo(W*0.10+W*0.80*Math.min(1,v),y);G.stroke();}" +
        "bar(H-34,ra,side===0);bar(H-12,rb,side===1);" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "var p=at(e);side=p[0]<W*0.5?0:1;run();e.preventDefault();});"
    ),
  },
  {
    title: "无限猴子",
    html: play(
      stageCss("ut-monkey", ";touch-action:none;cursor:pointer"),
      stageBody("ut-monkey"),
      MEM +
        FIT +
        // 左边是目标图案。右边是到目前为止**撞得最像的那一次**。
        // 每一帧都在重掷一整张，掷中的位数比历史最好还多，就换上去。
        //
        // 底下那条是最好成绩，它一直在涨。**每一格都是真的，一格也没有注水。**
        // 前几秒它冲得很快，然后越来越慢，然后几乎不动了——
        // 它会停在六成上下，因为随机乱撞的期望本来就是五成，
        // 再往上全靠运气，而运气是要指数级的次数才买得到的。
        //
        // **按住画面可以让它掷得更快。** 快多少都行，它还是不会到。
        // 五百七十六位全中要 2^576 次，这个数比宇宙里的原子还多。
        //
        // 成绩记在本地，只涨不跌。你下次回来它还差一点，
        // 再下次还差一点，永远差一点——**而每一次它都真的又近了一点点。**
        // 反的是"只要进度条在动就说明快到了"
        "var GN=24,SZ=GN*GN,TGT,BEST,LAST,best=0,hold=false,tries=0;" +
        "var rec=M.num('mky.best',0);" +
        "function alloc(){TGT=new Uint8Array(SZ);BEST=new Uint8Array(SZ);" +
        "for(var y=0;y<GN;y++)for(var x=0;x<GN;x++){" +
        "var u=(x-11.5)/11.5,v=(y-11.5)/11.5,r=Math.sqrt(u*u+v*v);" +
        "TGT[y*GN+x]=(r<0.82&&Math.cos(Math.atan2(v,u)*3+r*4.5)>0)?1:0;}" +
        "LAST=new Uint8Array(SZ);" +
        "for(var i=0;i<SZ;i++)BEST[i]=Math.random()<0.5?1:0;" +
        "best=0;for(i=0;i<SZ;i++)if(BEST[i]===TGT[i])best++;}" +
        "alloc();" +
        "function draw1(){var i,n=0;" +
        "var C=new Uint8Array(SZ);" +
        "for(i=0;i<SZ;i++){C[i]=Math.random()<0.5?1:0;if(C[i]===TGT[i])n++;}" +
        "LAST=C;tries++;" +
        "if(n>best){best=n;BEST=C;" +
        "if(best>rec){rec=best;M.set('mky.best',rec);}}}" +
        "function tick(){var k,rounds=hold?46:9;" +
        "for(k=0;k<rounds;k++)draw1();" +
        "G.clearRect(0,0,W,H);" +
        "var S=Math.min(W*0.40,H*0.72),cs=S/GN;" +
        "var ox1=W*0.5-S-W*0.02,ox2=W*0.5+W*0.02,oy=(H-S)*0.42;" +
        "var x2,y2,i2;" +
        "for(y2=0;y2<GN;y2++)for(x2=0;x2<GN;x2++){i2=y2*GN+x2;" +
        "G.fillStyle=INK(TGT[i2]?0.72:0.07);" +
        "G.fillRect(ox1+x2*cs,oy+y2*cs,cs+0.5,cs+0.5);" +
        "G.fillStyle=INK(BEST[i2]?0.72:0.07);" +
        "G.fillRect(ox2+x2*cs,oy+y2*cs,cs+0.5,cs+0.5);}" +
        // 按住的时候，把**这一瞬间正在掷的那张**盖上去。
        // 你看得见它在掷、掷得飞快，而右边那张几乎不动——
        // 这两件事同时为真，正是这条东西要说的
        "if(hold){for(y2=0;y2<GN;y2++)for(x2=0;x2<GN;x2++){" +
        "if(!LAST[y2*GN+x2])continue;G.fillStyle=INK(0.20);" +
        "G.fillRect(ox2+x2*cs,oy+y2*cs,cs+0.5,cs+0.5);}}" +
        // 这一次的最好成绩。五成是瞎撞的起点，所以只画五成往上那一截
        "var f=(best/SZ-0.5)/0.5;if(f<0)f=0;" +
        "var fr=(rec/SZ-0.5)/0.5;if(fr<0)fr=0;" +
        "G.strokeStyle=INK(0.10);G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.10,H-30);G.lineTo(W*0.90,H-30);G.stroke();" +
        "G.strokeStyle=INK(0.45);G.beginPath();G.moveTo(W*0.10,H-30);" +
        "G.lineTo(W*0.10+W*0.80*f,H-30);G.stroke();" +
        // 历史最好，只涨不跌，关掉页面回来还在
        "G.strokeStyle='rgba(224,150,40,0.9)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(W*0.10+W*0.80*fr,H-38);" +
        "G.lineTo(W*0.10+W*0.80*fr,H-22);G.stroke();" +
        // 终点就在那儿。它一直在那儿
        "G.strokeStyle=INK(0.30);G.lineWidth=1.4;" +
        "G.beginPath();G.moveTo(W*0.90,H-42);G.lineTo(W*0.90,H-18);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){hold=true;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){hold=false;});" +
        "CV.addEventListener('pointercancel',function(){hold=false;});" +
        "CV.addEventListener('pointerleave',function(){hold=false;});"
    ),
  },
  {
    title: "幸存者",
    html: play(
      stageCss("ut-surv", ";touch-action:none;cursor:pointer"),
      stageBody("ut-surv"),
      FIT +
        // 一批东西一起出发。走的过程里不断有谁停掉——**停掉的当场从画面上消失，
        // 不留一道痕迹**。到右边还在的就那么几条，又粗又亮，看着确实不一样。
        //
        // 挑一条。你只能挑看得见的——这就是全部的问题所在。
        //
        // 挑完，同一批东西再走一遍，这次连停掉的那两百多条一起画出来。
        // 你挑的那条是琥珀色的。你自己看它和那些灰的有什么不同。
        //
        // 它们的生死是**纯掷硬币**：每一步一样的概率，谁都没有比谁强的地方。
        // 所以这条东西不是在说"幸存者不厉害"——是在说，
        // 到了你看得见他们的时候，能分辨的那个时刻**早就过去了**；
        // 而在还分辨得出的时候，画面上是两百四十条一模一样的线。
        //
        // 这条不给你"早点挑"的选项。不是没做，是**那个选项不存在**：
        // 你要挑，就得先看见；看见了，就已经晚了
        "var NP=240,LEN=90,PXs,PYs,DIE,SUR=[],phase=0,ph=0,pickI=-1,tstep=0;" +
        "function px2(u){return W*0.06+W*0.88*u;}" +
        "function py2(v){return H*0.08+H*0.84*v;}" +
        "function alloc(){PXs=new Float32Array(NP*LEN);PYs=new Float32Array(NP*LEN);" +
        "DIE=new Int16Array(NP);SUR=[];var i,s;" +
        "for(i=0;i<NP;i++){var y=0.5+(Math.random()-0.5)*0.09,d=LEN;" +
        "for(s=0;s<LEN;s++){y+=(Math.random()+Math.random()+Math.random()-1.5)*0.034;" +
        "if(y<0.02)y=0.02;if(y>0.98)y=0.98;" +
        "PXs[i*LEN+s]=s/(LEN-1);PYs[i*LEN+s]=y;" +
        // 每一步一样的概率。没有哪条线比别的线强，一点都没有
        "if(d===LEN&&Math.random()<0.038)d=s;}" +
        "DIE[i]=d;if(d===LEN)SUR.push(i);}" +
        // 万一一条都没活下来，就拿撑得最久的几条顶上，别让画面空掉
        "if(SUR.length<2){var ord=[];for(i=0;i<NP;i++)ord.push(i);" +
        "ord.sort(function(a,b){return DIE[b]-DIE[a];});" +
        "SUR=[ord[0],ord[1],ord[2]];}" +
        "phase=0;ph=0;pickI=-1;tstep=0;}" +
        "function path(i,upto,st){var s,xx,yy;G.beginPath();" +
        "for(s=0;s<=upto;s+=st){xx=px2(PXs[i*LEN+s]);yy=py2(PYs[i*LEN+s]);" +
        "if(s===0)G.moveTo(xx,yy);else G.lineTo(xx,yy);}G.stroke();}" +
        "onfit=alloc;alloc();" +
        "function tick(){ph++;var i,k;" +
        "if(phase===0){tstep=(ph*0.5)|0;if(tstep>=LEN){tstep=LEN-1;phase=1;ph=0;}}" +
        // 你不挑它就替你挑一条，好让这一轮走完。它挑的那条也是随手抓的
        "else if(phase===1){if(ph>340){pickI=SUR[(Math.random()*SUR.length)|0];" +
        "phase=2;ph=0;}}" +
        "else if(ph>360)alloc();" +
        "G.clearRect(0,0,W,H);" +
        "if(phase===0){" +
        // 还活着的才画。停掉的当场没有了——你看不见它们，正如现实里你也看不见
        "G.strokeStyle=INK(0.26);G.lineWidth=1;" +
        "for(i=0;i<NP;i++){if(DIE[i]<=tstep)continue;path(i,tstep,1);}" +
        "G.fillStyle=INK(0.5);" +
        "for(i=0;i<NP;i++){if(DIE[i]<=tstep)continue;" +
        "G.beginPath();G.arc(px2(PXs[i*LEN+tstep]),py2(PYs[i*LEN+tstep]),1.8,0,7);G.fill();}}" +
        "else if(phase===1){" +
        // 只剩下活到最后的几条。它们又粗又亮，看着确实像回事
        "G.strokeStyle=INK(0.55);G.lineWidth=1.8;" +
        "for(k=0;k<SUR.length;k++)path(SUR[k],LEN-1,1);" +
        "G.fillStyle=INK(0.9);" +
        "for(k=0;k<SUR.length;k++){G.beginPath();" +
        "G.arc(px2(1),py2(PYs[SUR[k]*LEN+LEN-1]),7,0,7);G.fill();}}" +
        "else{" +
        // 重放：这一次把停掉的那些一起画出来。它们一直都在，只是没画过
        "var rt=(ph*0.55)|0;if(rt>LEN-1)rt=LEN-1;" +
        "G.strokeStyle=INK(0.13);G.lineWidth=1;" +
        "for(i=0;i<NP;i++){var u=DIE[i]<rt?DIE[i]:rt;if(u<1)continue;" +
        "if(i===pickI)continue;path(i,u,2);}" +
        "G.strokeStyle=INK(0.42);G.lineWidth=1.4;" +
        "for(k=0;k<SUR.length;k++)if(SUR[k]!==pickI)path(SUR[k],rt,2);" +
        "if(pickI>=0){G.strokeStyle='rgba(224,150,40,0.95)';G.lineWidth=2.2;" +
        "path(pickI,rt,1);" +
        "G.fillStyle='rgba(224,150,40,0.95)';G.beginPath();" +
        "G.arc(px2(PXs[pickI*LEN+rt]),py2(PYs[pickI*LEN+rt]),6,0,7);G.fill();}}" +
        "requestAnimationFrame(tick);}tick();" +
        // 只能挑看得见的那几条。挑完立刻重放
        "CV.addEventListener('pointerdown',function(e){" +
        "if(phase!==1){if(phase===2)alloc();e.preventDefault();return;}" +
        "var p=at(e),best=-1,bd=1e9,k2;" +
        "for(k2=0;k2<SUR.length;k2++){var i2=SUR[k2];" +
        "var dx=p[0]-px2(1),dy=p[1]-py2(PYs[i2*LEN+LEN-1]);" +
        "var d2=dx*dx*0.12+dy*dy;if(d2<bd){bd=d2;best=i2;}}" +
        "if(best>=0){pickI=best;phase=2;ph=0;}e.preventDefault();});",
    ),
  },
  {
    title: "蒸发冷却",
    html: play(
      stageCss("ut-evap", ";touch-action:none;cursor:pointer"),
      stageBody("ut-evap"),
      FIT +
        // 每个点是一个人，高低是他的立场。**没有一个人改过主意**，一个字都没有。
        //
        // 每一轮，最温和的那几个先走——他们本来就没那么投入，走掉的代价最低。
        // 剩下的人原地不动，可这群人的中心自己往上爬。
        //
        // 亮的那个是你，在偏下的位置。这条东西**没有给你挪动自己的开关**，
        // 也没有给你留住别人的开关。你只有一个动作：**按一下就是走。**
        //
        // 你不走的话，比你温和的会一个个走光，然后你就是这里最温和的那个，
        // 再然后你是唯一一个还站在那个高度的人。你还是没改过主意，
        // 可你现在是"这里最不坚定的"——而这个称呼是别人走出来的，不是你挣来的。
        //
        // 你走了也一样：你本来就在温和那头，你一走，中心爬得更快一点。
        // **留下来你被推着变极端，走掉你把别人推得更极端。** 没有第三个动作
        "var N=460,X,alive,mean=0.5,acc=0,hold=0,me=0,out=0,rank=1;" +
        "function gauss(){var u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();" +
        "return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v);}" +
        "function alloc(){X=new Float64Array(N);alive=new Uint8Array(N);" +
        "for(var i=0;i<N;i++){var t=0.5+gauss()*0.16;" +
        "X[i]=t<0?0:(t>1?1:t);alive[i]=1;}" +
        // 你在偏下的位置：不是最温和的，但下面的人不多。撑不了几轮就轮到你了
        "me=(N*0.5)|0;X[me]=0.5-0.16*0.85;alive[me]=1;" +
        "mean=0.5;acc=0;hold=0;out=0;rank=1;}" +
        "onfit=alloc;alloc();" +
        "function round(){var i,s=0,n=0;" +
        "for(i=0;i<N;i++)if(alive[i]){s+=X[i];n++;}" +
        "if(n<8){hold++;if(hold>90)alloc();return;}" +
        "mean=s/n;" +
        "var idx=[];for(i=0;i<N;i++)if(alive[i]&&i!==me)idx.push(i);" +
        "idx.sort(function(a,b){return X[a]-X[b];});" +
        // 最温和的那一批先走。**你不在这个名单里**——走不走只有你自己决定
        "var q=Math.max(1,Math.round((idx.length+1)*0.04));" +
        "for(i=0;i<q&&i<idx.length;i++)alive[idx[i]]=0;" +
        // 你在还留着的人里排第几温和。这个名次一路往下掉，而你一动没动
        "rank=1;for(i=0;i<N;i++)if(alive[i]&&i!==me&&X[i]<X[me])rank++;}" +
        // 一轮 22 帧。原先是 5 帧，十五秒就走光了——而这条东西要给你看的
        // 正是"你的名次一路往下掉，而你一动没动"这个过程
        "function tick(){acc++;if(acc>21){acc=0;round();}" +
        "G.clearRect(0,0,W,H);" +
        "var top=H*0.06,bh=H*0.80,i;" +
        "for(i=0;i<N;i++){if(!alive[i]||i===me)continue;" +
        "var x=(i%46)/45*W*0.86+W*0.07,y=top+bh*(1-X[i]);" +
        "G.fillStyle=INK(0.34);G.beginPath();G.arc(x,y,2.6,0,7);G.fill();}" +
        // 这群人的中心。没有人改过主意，可它一直在往上爬
        "G.strokeStyle='rgba(224,150,40,0.75)';G.lineWidth=1.6;G.setLineDash([7,6]);" +
        "G.beginPath();G.moveTo(0,top+bh*(1-mean));G.lineTo(W,top+bh*(1-mean));" +
        "G.stroke();G.setLineDash([]);" +
        // 你。走掉之后退到边上，还看得见，只是不算数了
        "var mx=out?W*0.026:((me%46)/45*W*0.86+W*0.07);" +
        "var my=top+bh*(1-X[me]);" +
        "G.strokeStyle=INK(out?0.10:0.20);G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,my);G.lineTo(W,my);G.stroke();" +
        "G.fillStyle=out?INK(0.30):'rgba(224,150,40,0.98)';" +
        "G.beginPath();G.arc(mx,my,out?4.5:7,0,7);G.fill();" +
        // 你下面还剩几个人。它一路掉到 0，而你的高度一毫米都没动过
        "if(!out){G.fillStyle=INK(0.24);" +
        "for(i=0;i<rank-1&&i<60;i++)" +
        "G.fillRect(W*0.026+i*4.2,my+11,2,5);}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(!out){out=1;alive[me]=0;}else alloc();e.preventDefault();});"
    ),
  },
  {
    title: "多数无知",
    html: play(
      stageCss("ut-plural", ";touch-action:none;cursor:pointer"),
      stageBody("ut-plural"),
      FIT +
        // 一屋子人，**公开表现全都一样**：没有一个人显出异议。
        //
        // 私下里，七成的人不同意。这条东西知道，你不知道——
        // 它只告诉你**你自己**是哪一种：你不同意（你是琥珀色那个）。
        //
        // **按住画面，就是你把自己亮出来。** 一个人亮着什么也不会发生：
        // 每个人心里有一道坎，要看见够多的人先亮，他才敢跟。
        // 你得一直按着，按到有几个坎最低的人跟上，再按到他们把更高的坎压过去。
        // 松早了，跟上的那几个会缩回去，而你刚才是唯一亮着的那个。
        //
        // 撑过去了，你会看见这屋里本来就有七成人和你一样——
        // **他们一直都在，只是谁也没先动。**
        //
        // 在你亮出来之前，这条东西不告诉你有多少人跟你一样。
        // 不是我藏着——**要是那件事看得见，就没有人需要先站出来了**
        "var NU=180,priv,thr,shown,cnt,me=0,hold=false,acc=0,win=0;" +
        "function alloc(){priv=new Uint8Array(NU);thr=new Float32Array(NU);" +
        "shown=new Uint8Array(NU);cnt=new Int16Array(NU);" +
        "for(var i=0;i<NU;i++){priv[i]=Math.random()<0.70?1:0;" +
        // 每个人心里那道坎。有几个人的坎低到你一个人就能压过去
        "thr[i]=(i%26===0)?0.004+Math.random()*0.010:0.03+Math.random()*0.42;}" +
        "me=(NU*0.5)|0;priv[me]=1;acc=0;win=0;}" +
        "alloc();" +
        "function tick(){var i,n=0;" +
        "for(i=0;i<NU;i++)if(shown[i])n++;" +
        "var f=(n+(hold?1:0))/NU;" +
        // 坎压过去了还不够，得压住一阵子人才敢动。松手就往回缩
        "for(i=0;i<NU;i++){if(i===me||!priv[i]){shown[i]=0;continue;}" +
        "if(f>=thr[i]){cnt[i]++;if(cnt[i]>44)shown[i]=1;}" +
        "else{cnt[i]-=2;if(cnt[i]<0){cnt[i]=0;shown[i]=0;}}}" +
        "shown[me]=hold?1:0;" +
        "if(f>0.55){win++;}else if(win>0)win--;" +
        "G.clearRect(0,0,W,H);" +
        "var cols=Math.ceil(Math.sqrt(NU*W/H)),rows=Math.ceil(NU/cols);" +
        "var cw=W/cols,ch=H/rows;" +
        "for(i=0;i<NU;i++){var x=(i%cols)*cw+cw/2,y=((i/cols)|0)*ch+ch/2;" +
        "var r=Math.min(cw,ch)*0.28;" +
        "if(i===me){G.fillStyle='rgba(224,150,40,'+(hold?0.98:0.55)+')';" +
        "G.beginPath();G.arc(x,y,r*1.5,0,7);G.fill();" +
        "if(hold){G.strokeStyle='rgba(224,150,40,0.4)';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(x,y,r*1.5+6,0,7);G.stroke();}continue;}" +
        // 亮出来的是琥珀色。没亮的一律长得一模一样——不管他私下怎么想
        "if(shown[i]){G.fillStyle='rgba(224,150,40,0.9)';" +
        "G.beginPath();G.arc(x,y,r*1.3,0,7);G.fill();}" +
        "else{G.strokeStyle=INK(0.22);G.lineWidth=1.2;" +
        "G.beginPath();G.arc(x,y,r,0,7);G.stroke();}}" +
        // 撑过去之后，把私下的真相摆出来：他们一直都在
        "if(win>90){var al=(win-90)/80;if(al>1)al=1;" +
        "for(i=0;i<NU;i++){if(!priv[i]||shown[i]||i===me)continue;" +
        "var x2=(i%cols)*cw+cw/2,y2=((i/cols)|0)*ch+ch/2;" +
        "G.strokeStyle='rgba(224,150,40,'+(0.45*al).toFixed(3)+')';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(x2,y2,Math.min(cw,ch)*0.28,0,7);G.stroke();}}" +
        "acc++;requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){hold=true;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){hold=false;});" +
        "CV.addEventListener('pointercancel',function(){hold=false;});" +
        "CV.addEventListener('pointerleave',function(){hold=false;});"
    ),
  },
  {
    title: "兼容",
    html: play(
      stageCss("ut-compat", ";touch-action:none;cursor:pointer"),
      stageBody("ut-compat"),
      MEM +
        FIT +
        // 满屏的小东西都在转，各转各的，**没有一个是坏的**。
        // 每一个身上带着自己的版本号。落后三代以上的会永久停住——
        // 不是它出了问题，是脚下的地挪了。停住的再也不会重新转。
        //
        // 亮的那个是你。**按一下就是更新到最新。** 不按，你迟早也停。
        //
        // 版本号不是自己往前走的：**够多的人更新到了新版，它才往前挪一格。**
        // 也就是说，你按的那一下，正好是把落后的人推停的那一下。
        // 你更新是为了自己不停；你不更新，停的是你。**没有第三个动作。**
        //
        // 你推到过的最高版本记在本地。回来的时候这地方已经停了一片，
        // 而它们停下的那一刻，你正好在按
        "var NC=340,VER,PXc,PYc,SPc,ANG,dead,V=6,you=0,acc=0,frozen=0;" +
        "var top=M.num('cmp.top',6);if(top<6)top=6;if(top>60)top=60;" +
        "function alloc(){VER=new Int16Array(NC);PXc=new Float32Array(NC);" +
        "PYc=new Float32Array(NC);SPc=new Float32Array(NC);ANG=new Float32Array(NC);" +
        "dead=new Uint8Array(NC);V=top;" +
        "for(var i=0;i<NC;i++){PXc[i]=Math.random();PYc[i]=Math.random();" +
        "SPc[i]=0.010+Math.random()*0.030;ANG[i]=Math.random()*6.2832;" +
        // 回来的时候，跟不上的那些早就停在那儿了
        "VER[i]=V-((Math.random()*7)|0);" +
        "if(VER[i]<V-3){dead[i]=1;VER[i]=V-4;}}" +
        "you=(NC*0.5)|0;VER[you]=V;dead[you]=0;acc=0;frozen=0;}" +
        "alloc();" +
        "function bump(){V++;if(V>top){top=V;if(top>60)top=60;M.set('cmp.top',top);}" +
        "for(var i=0;i<NC;i++)if(!dead[i]&&VER[i]<V-3){dead[i]=1;frozen++;}}" +
        // 版本往前挪的条件：够多的人已经在新版上了。推动它的就是"更新"这个动作本身
        "function check(){var i,n=0,c=0;" +
        "for(i=0;i<NC;i++){if(dead[i])continue;n++;if(VER[i]>=V)c++;}" +
        "if(n>0&&c/n>0.40)bump();}" +
        "function tick(){acc++;" +
        // 别人也在陆续更新，各更各的
        "if(acc>7){acc=0;var i;" +
        "for(i=0;i<NC;i++){if(dead[i]||i===you)continue;" +
        "if(VER[i]<V&&Math.random()<0.10)VER[i]=V;}" +
        "check();}" +
        "G.clearRect(0,0,W,H);" +
        "var i2,R3=Math.min(W,H)*0.016;" +
        "for(i2=0;i2<NC;i2++){" +
        "var x=W*0.04+W*0.92*PXc[i2],y=H*0.05+H*0.90*PYc[i2];" +
        "if(!dead[i2])ANG[i2]+=SPc[i2];" +
        "var lag=V-VER[i2];" +
        "if(dead[i2]){G.strokeStyle=INK(0.10);G.lineWidth=1;" +
        "G.beginPath();G.arc(x,y,R3,0,6.2832);G.stroke();" +
        "G.strokeStyle=INK(0.13);G.beginPath();G.moveTo(x,y);" +
        "G.lineTo(x+Math.cos(ANG[i2])*R3,y+Math.sin(ANG[i2])*R3);G.stroke();continue;}" +
        "var me2=(i2===you);" +
        // 还在转的：转的那道弧越短，说明它落后得越多——离停住越近
        "G.strokeStyle=me2?'rgba(224,150,40,0.95)':INK(0.42-lag*0.07);" +
        "G.lineWidth=me2?2.2:1.4;" +
        "G.beginPath();G.arc(x,y,R3,ANG[i2],ANG[i2]+2.6-lag*0.6);G.stroke();" +
        "if(me2){G.fillStyle='rgba(224,150,40,0.95)';" +
        "G.beginPath();G.arc(x,y,3,0,7);G.fill();}}" +
        // 顶上那条：这地方已经停掉的比例。它只会长
        "var dn=0;for(i2=0;i2<NC;i2++)if(dead[i2])dn++;" +
        "G.strokeStyle=INK(0.10);G.lineWidth=4;" +
        "G.beginPath();G.moveTo(W*0.08,H-10);G.lineTo(W*0.92,H-10);G.stroke();" +
        "G.strokeStyle=INK(0.40);G.beginPath();G.moveTo(W*0.08,H-10);" +
        "G.lineTo(W*0.08+W*0.84*(dn/NC),H-10);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(!dead[you]){VER[you]=V;check();}else alloc();e.preventDefault();});"
    ),
  },
  {
    title: "搜索",
    html: play(
      stageCss("ut-index", ";touch-action:none;cursor:crosshair"),
      stageBody("ut-index"),
      MEM +
        FIT +
        // 满屏的东西。琥珀色的那些没有挂标签，其余的挂了。
        //
        // **你手上是一盏灯，就是你的指针。** 它只照得亮挂了标签的东西：
        // 照到的会被带回来、被看见，于是长大。
        // 同一盏灯扫过没挂标签的那些，它们什么也不会发生——
        // 没有被带回来，就没有人管，于是一点点淡掉，然后没有了。
        //
        // 这条东西**只给你这一件工具**。你没法搜"没挂标签的"，
        // 不是我没做那个开关，是那个开关不存在：搜索就是这个意思。
        // 灯照不到的地方不会变暗，它只是不在你的结果里；
        // 而不在结果里的东西，是靠别的东西活着的，你照得越勤它们死得越快。
        //
        // 结局是满屏都挂着标签，颜色齐整、密度均匀、一个缺口都没有——
        // **非常好看，而且你不会觉得少了什么。** 这就是它想让你看的那件事。
        //
        // 你照没的东西记在本地，关掉页面回来它们也不在了。
        // 灯不会把它们照回来，这条东西也不打算给你那个功能
        "var N=640,PX,PY,IDX,WT,AL,scan=-0.06,lx=-1,ly=-1,idle=999,wr=0,rest=0;" +
        "var keep=M.num('idx.keep',1);" +
        "if(keep>1)keep=1;if(keep<0.15)keep=0.15;" +
        "function alloc(){PX=new Float32Array(N);PY=new Float32Array(N);" +
        "IDX=new Uint8Array(N);WT=new Float32Array(N);AL=new Float32Array(N);" +
        "for(var i=0;i<N;i++){PX[i]=Math.random();PY[i]=Math.random();" +
        "IDX[i]=Math.random()<0.34?1:0;" +
        // 上次被你照没的那些，这次一开始就不在了
        "if(!IDX[i]&&Math.random()>keep)continue;" +
        "WT[i]=0.42+Math.random()*0.2;AL[i]=1;}" +
        "scan=-0.06;rest=0;}" +
        // 一次查询。挂了标签的被带回来（长大），没挂的什么也没发生（于是往下掉）
        "function query(cx,cy,rad,gain){var i,dx,dy,rr=rad*rad;" +
        "for(i=0;i<N;i++){if(AL[i]<=0)continue;" +
        "dx=PX[i]*W-cx;dy=(PY[i]*H*0.94+H*0.03)-cy;" +
        "if(dx*dx+dy*dy>rr)continue;" +
        "if(IDX[i]){WT[i]+=gain;if(WT[i]>1.35)WT[i]=1.35;}" +
        "else{WT[i]-=gain*0.42;}}}" +
        "onfit=alloc;alloc();" +
        "function tick(){idle++;" +
        // 没人拿灯的时候有一道自己在走的查询，比你的灯弱得多。
        // 所以这地方在你不在的时候也一直在变干净，只是慢
        "var ps=scan;scan+=0.0042;if(scan>1.12)scan=-0.06;" +
        "var i;" +
        "if(idle>90)for(i=0;i<N;i++){if(AL[i]<=0)continue;" +
        "if(IDX[i]&&PX[i]>ps&&PX[i]<=scan){WT[i]+=0.055;if(WT[i]>1.35)WT[i]=1.35;}" +
        "else if(!IDX[i])WT[i]-=0.00004;}" +
        // 你的灯。半径固定，跟着指针走
        "var R2=Math.min(W,H)*0.17;" +
        "if(lx>=0&&idle<90)query(lx,ly,R2,0.030);" +
        "G.clearRect(0,0,W,H);" +
        "var untag=0;" +
        "for(i=0;i<N;i++){if(AL[i]<=0)continue;" +
        "if(!IDX[i]){untag++;" +
        "if(WT[i]<0.05){AL[i]-=0.02;" +
        "if(AL[i]<=0){AL[i]=0;keep-=1/(N*0.66*6);if(keep<0.15)keep=0.15;" +
        "wr++;if(wr>3){wr=0;M.set('idx.keep',keep.toFixed(4));}continue;}}}" +
        "var x=PX[i]*W,y=PY[i]*H*0.94+H*0.03;" +
        "var r=WT[i]*Math.min(W,H)*0.014;if(r<0.4)r=0.4;" +
        "if(IDX[i]){G.fillStyle=INK((0.22+WT[i]*0.42)*AL[i]);" +
        "G.beginPath();G.arc(x,y,r,0,7);G.fill();" +
        "G.strokeStyle=INK(0.30*AL[i]);G.lineWidth=1;" +
        "G.beginPath();G.arc(x,y,r+2.4,0,7);G.stroke();}" +
        // 没挂标签的是琥珀色的。它们是这幅画上仅有的另一种颜色，
        // 而这条东西的结局就是把这个颜色去干净
        "else{G.fillStyle='rgba(224,150,40,'+((0.28+WT[i]*0.5)*AL[i]).toFixed(3)+')';" +
        "G.beginPath();G.arc(x,y,r,0,7);G.fill();}}" +
        "if(lx>=0&&idle<90){" +
        "var g3=G.createRadialGradient(lx,ly,0,lx,ly,R2);" +
        "g3.addColorStop(0,INK(0.10));g3.addColorStop(1,INK(0));" +
        "G.fillStyle=g3;G.beginPath();G.arc(lx,ly,R2,0,7);G.fill();" +
        "G.strokeStyle=INK(0.22);G.lineWidth=1;" +
        "G.beginPath();G.arc(lx,ly,R2,0,7);G.stroke();}" +
        "else if(scan>=0&&scan<=1){G.strokeStyle=INK(0.20);G.lineWidth=1.2;" +
        "G.beginPath();G.moveTo(scan*W,0);G.lineTo(scan*W,H);G.stroke();}" +
        // 琥珀色一个不剩，就是这一轮的终点。停一会儿，再摆一片新的——
        // 而新的那片里，你照没过的那些不会回来
        "if(untag<1){rest++;if(rest>300)alloc();}else rest=0;" +
        "requestAnimationFrame(tick);}tick();" +
        "function lamp(e){var p=at(e);lx=p[0];ly=p[1];idle=0;}" +
        "CV.addEventListener('pointermove',lamp);" +
        "CV.addEventListener('pointerdown',function(e){lamp(e);e.preventDefault();});" +
        "CV.addEventListener('pointerleave',function(){lx=-1;idle=999;});",
    ),
  },
  {
    title: "围观",
    html: play(
      stageCss("ut-bystand", ";touch-action:none"),
      stageBody("ut-bystand"),
      MEM +
        FIT +
        // 中间那点亮起来就是出事了。一圈人在旁边，**你是发亮的那一个**。
        // 每次出事你有一小段时间：点一下就是你去了。
        //
        // 你不去也行，多半会有别人去——旁边的人越多，越可能有人替你收场，
        // 于是你越有理由不动。这条式子是照实测对齐的：三个人在场约八成有人出手，
        // 四十个人约三成。人少的时候你不动，事情就砸在你手上；人多的时候
        // 你不动，通常也没人怪你，因为确实"总会有人"。
        //
        // 底下三条：出过手的次数、没出手且没人管的次数、在场人数。
        // 人数会一直涨。前两条记在本地，关掉页面回来还在——
        // 这条不给你结论，只给你一份自己的记录
        "var CROWD=3,W2=[],ev=0,acc=0,win=0,me=0,other=0,acted=0,fail=0,evn=0;" +
        "var Sm=M.num('by.me',0),Sf=M.num('by.fail',0),Sn=M.num('by.n',0);" +
        "function mk(n){var a=[];for(var i=0;i<n;i++)" +
        "a.push({t:i/n*6.2832,r:0.60+Math.random()*0.32,act:0});return a;}" +
        "function alloc(){CROWD=3;W2=mk(CROWD);ev=0;acc=0;win=0;me=0;other=0;acted=0;fail=0;evn=0;}" +
        "onfit=alloc;alloc();" +
        // 责任被摊薄的速度得快过人数增长，不然"人多总有一个会动"在算术上就成立了。
        // 这条曲线照着实测对齐：三个人在场约八成有人出手，四十个人约三成
        "function p1(n){return 0.581*Math.exp(-0.1073*(n-1));}" +
        "function settle(){var i,any=0;" +
        "for(i=0;i<W2.length;i++){W2[i].act=Math.random()<p1(CROWD+1)?1:0;if(W2[i].act)any=1;}" +
        "other=any;evn++;Sn++;" +
        "if(me){acted++;Sm++;}else if(!any){fail++;Sf++;}" +
        "M.set('by.me',Sm);M.set('by.fail',Sf);M.set('by.n',Sn);" +
        // 每收一次场，围观的人就多几个。下一次更不像你的事
        "if(CROWD<40){CROWD+=2;if(CROWD>40)CROWD=40;W2=mk(CROWD);}}" +
        "function tick(){acc++;" +
        // 出事：给你 44 帧的窗口。过了就过了
        "if(!ev&&acc>96){ev=1;acc=0;me=0;win=44;}" +
        "else if(ev){win--;if(win<=0){ev=0;acc=0;settle();}}" +
        "G.clearRect(0,0,W,H);" +
        "var cx=W/2,cy=H*0.40,R=Math.min(W*0.34,H*0.30);" +
        "if(ev){G.fillStyle='rgba(255,168,72,'+(0.4+0.4*Math.sin(win*0.4))+')';" +
        "G.beginPath();G.arc(cx,cy,9,0,7);G.fill();" +
        "G.strokeStyle='rgba(255,168,72,0.34)';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(cx,cy,9+(44-win)*1.5,0,7);G.stroke();}" +
        "else{G.fillStyle=other?'rgba(140,200,160,0.55)':'rgba(150,80,66,0.6)';" +
        "G.beginPath();G.arc(cx,cy,5,0,7);G.fill();}" +
        "var i;" +
        "for(i=0;i<W2.length;i++){var w=W2[i];" +
        "var d=(!ev&&w.act)?0.60:1;" +
        "var x=cx+Math.cos(w.t)*R*w.r*d,y=cy+Math.sin(w.t)*R*w.r*d*0.94;" +
        "if(!ev&&w.act){G.strokeStyle='rgba(140,200,160,0.4)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(x,y);G.lineTo(cx,cy);G.stroke();}" +
        "G.fillStyle=(!ev&&w.act)?'rgba(140,200,160,0.9)':'rgba(112,132,168,0.7)';" +
        "G.beginPath();G.arc(x,y,3.2,0,7);G.fill();}" +
        // 你在圈上，永远是最亮的那个
        "var myx=cx+Math.cos(-1.5708)*R*0.94,myy=cy+Math.sin(-1.5708)*R*0.94;" +
        "if(me){G.strokeStyle='rgba(255,220,150,0.75)';G.lineWidth=1.6;" +
        "G.beginPath();G.moveTo(myx,myy);G.lineTo(cx,cy);G.stroke();}" +
        "G.fillStyle='rgba(255,220,150,'+(ev?(0.7+0.3*Math.sin(win*0.5)):0.9)+')';" +
        "G.beginPath();G.arc(myx,myy,6.2,0,7);G.fill();" +
        "if(ev){G.strokeStyle='rgba(255,220,150,0.5)';G.lineWidth=1.4;" +
        "G.beginPath();G.arc(myx,myy,6.2+win*0.24,0,7);G.stroke();}" +
        "function bar(y,v,n,col){G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=6;" +
        "G.beginPath();G.moveTo(W*0.08,y);G.lineTo(W*0.92,y);G.stroke();" +
        "if(n<1)return;G.strokeStyle=col;G.beginPath();G.moveTo(W*0.08,y);" +
        "G.lineTo(W*0.08+W*0.84*Math.min(1,v/n),y);G.stroke();}" +
        "bar(H-58,Sm,Sn,'rgba(255,220,150,0.92)');" +
        "bar(H-34,Sf,Sn,'rgba(198,86,72,0.92)');" +
        "bar(H-12,CROWD,40,'rgba(112,132,168,0.8)');" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(ev)me=1;e.preventDefault();});",
    ),
  },
  {
    title: "诱因",
    html: play(
      stageCss("ut-cobra", ";touch-action:none;cursor:pointer"),
      stageBody("ut-cobra"),
      MEM +
        FIT +
        // 满屏是你想弄少的东西。你只有一个办法：**按住画面**——按住就是在按个数发赏钱。
        //
        // 按下去很有效。抓的人立刻多起来，点子一片片消掉，画面空出来，手感极好。
        //
        // 同时有另一件事在慢慢发生，慢到你按着的时候不会注意：
        // 有人算明白了，赏钱是按**个数**发的，那就自己养。摊子搭起来要时间，
        // 所以它一直落后于你的手；而它散得比搭起来还慢得多。
        // 琥珀色的那些是养出来的。
        //
        // 松手，抓的立刻停了，养的还在出货。画面会涨回来，
        // 而且涨得比你按之前高——你按得越久，反弹越狠。
        //
        // 再按一次也行，还是有效，还是会更糟：这个摊子只从你上次留下的规模往上搭。
        // 而且它有个再也回不去的底，关掉页面回来还在那儿。
        //
        // **你能调的只有那个数字，调不了那件事。** 这条东西不给你第二个开关，
        // 因为现实里那些"先把指标压下去"的办法，也只有这一个
        "var NG=1800,OC=new Uint8Array(NG);" +
        "var PXa=new Float64Array(NG),PYa=new Float64Array(NG);" +
        "var cap=0,flo=M.num('cob.floor',0),hold=false,acc=0,held=0,pop=0;" +
        "for(var gi=0;gi<NG;gi++){PXa[gi]=Math.random();PYa[gi]=Math.random();" +
        "OC[gi]=gi<720?1:0;}" +
        "if(flo>0.055)flo=0.055;if(flo<0)flo=0;cap=flo;" +
        "function step(){var i,n=0,nw=0;" +
        "for(i=0;i<NG;i++)if(OC[i]){n++;if(OC[i]===1)nw++;}pop=n;" +
        "var b=hold?1:0;" +
        // 赏钱在的时候抓得快。这一段是真有效的，不是假的。
        // 但越少越难抓——最后剩的那几只谁也逮不着。没有这一条，
        // 长按就直接把它抓绝了，而绝种之后什么都长不回来，整条东西死在那儿
        "var pc=0.030*(n/400);if(pc>0.030)pc=0.030;" +
        "if(b)for(i=0;i<NG;i++)if(OC[i]&&Math.random()<pc)OC[i]=0;" +
        // 全部机关就在这两个数不一样大：搭摊子慢（0.0008），拆摊子快一点（0.0035），
        // 但都比你的手慢得多。所以你按着的那一阵子看不出有什么在长起来
        "cap+=b?(1-cap)*0.0008:-cap*0.0035;" +
        // 搭起来过的规模留下一个再也回不去的底，记在本地
        "if(cap>flo/0.35){flo=cap*0.35;if(flo>0.055)flo=0.055;" +
        "M.set('cob.floor',flo.toFixed(4));}" +
        "if(cap<flo)cap=flo;" +
        "var born=Math.round(n*cap*0.070);" +
        "for(i=0;i<NG&&born>0;i++)if(!OC[i]){OC[i]=2;born--;}" +
        // 野生的有个自然上限：地方就这么大。所以没人管的时候它自己稳在起手那个数——
        // 原先写成"自繁和自然死正好打平"，那等于只要有一点养殖就无限涨上去，
        // 松了手再也回不来。实测过：干等四千帧还满屏。稳态得是稳态，不是临界
        // 野的总还有几只在别处，绝不了种。没有这一条，一次长按之后
        // 满屏全成了养殖的，而养殖在没有赏钱时是补不上自然死的——
        // 于是整幅画面慢慢清空到一个不剩，从此再也长不出东西。实测过
        "var room=1-n/1300;if(room<0)room=0;" +
        "var wb=Math.round(nw*0.010*room+2.6*room);" +
        "for(i=NG-1;i>=0&&wb>0;i--)if(!OC[i]){OC[i]=1;wb--;}" +
        "for(i=0;i<NG;i++)if(OC[i]&&Math.random()<0.006)OC[i]=0;}" +
        "function tick(){acc++;if(acc>2){acc=0;step();}" +
        "if(hold)held++;" +
        "G.clearRect(0,0,W,H);" +
        "var i,fw=INK(0.5);" +
        "for(i=0;i<NG;i++){if(!OC[i])continue;" +
        "G.fillStyle=OC[i]===2?'rgba(224,150,40,0.88)':fw;" +
        "G.beginPath();G.arc(W*0.03+W*0.94*PXa[i],H*0.05+H*0.84*PYa[i],3.2,0,7);G.fill();}" +
        // 按着的时候底下那条一直在走：钱在往外流。松手就归零，不给你留个总数——
        // 这条东西不打算让你把它算成一笔账
        "if(hold){var L=held*0.0016;if(L>1)L=1;" +
        "G.strokeStyle='rgba(224,150,40,0.85)';G.lineWidth=3;" +
        "G.beginPath();G.moveTo(0,H-2);G.lineTo(W*L,H-2);G.stroke();}" +
        // 那条再也回不去的底：摊子最小也有这么大
        "if(flo>0.002){G.strokeStyle='rgba(224,150,40,0.30)';G.lineWidth=1;" +
        "G.beginPath();G.moveTo(0,H-6);G.lineTo(W*(flo/0.055),H-6);G.stroke();}" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){hold=true;held=0;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){hold=false;});" +
        "CV.addEventListener('pointercancel',function(){hold=false;});" +
        "CV.addEventListener('pointerleave',function(){hold=false;});",
    ),
  },
  {
    title: "信号",
    html: play(
      stageCss("ut-signal", ";touch-action:none;cursor:pointer"),
      stageBody("ut-signal"),
      MEM +
        FIT +
        // 每个人有一个天生的高低，一开始就定了，也没变过。你看不见别人的。
        // 你也有一个，**这条东西也不告诉你你的是多少**。
        //
        // 想让人知道你高，只有一个办法：烧掉点什么。烧得越多排得越前。
        // **按住画面就是在烧。** 松手你就往下沉，因为别人还在烧。
        //
        // 越高的人烧起来越省，所以烧到最后，排出来的次序会和天生的次序
        // 一模一样——一轮结束时它会把天生的次序摆在旁边给你看，你自己对。
        //
        // 那份次序**第一帧就在那儿了**。这一整轮烧掉的东西，
        // 一件也没有变成别的什么，它只是把一份本来就存在的排序抄了一遍。
        // 底下那堆灰是全场烧掉的总量，关掉页面回来还在。
        //
        // 这条东西没有"直接让人看见"那个按钮。不是我没做——
        // 那个按钮要是存在，就没有人需要烧了
        "var N=34,TYPE=[],SIG=[],phase=0,ph=0,hold=false,me=0,fit2=0;" +
        "var ash=M.num('sig.ash',0);" +
        "function alloc(){TYPE=[];SIG=[];" +
        "for(var i=0;i<N;i++){TYPE.push(Math.random());SIG.push(0);}" +
        "me=(Math.random()*N)|0;phase=0;ph=0;fit2=0;}" +
        "alloc();" +
        "function step(){var i,mx=0;" +
        "for(i=0;i<N;i++)if(SIG[i]>mx)mx=SIG[i];" +
        // 别人一直在烧。烧的边际代价跟自己的高低成反比：高的人烧得起
        "for(i=0;i<N;i++){if(i===me)continue;" +
        "var st=0.010*(0.25+TYPE[i]);" +
        "SIG[i]+=(SIG[i]<mx*(0.55+TYPE[i]*0.55))?st:st*0.35;" +
        "ash+=SIG[i]*0.0006;}" +
        // 你只有按住的时候在烧。你的边际代价也跟你的高低有关，而你不知道它是多少
        "if(hold){var s2=0.010*(0.25+TYPE[me]);SIG[me]+=s2;ash+=SIG[me]*0.0006;}" +
        "var ord=[],j;for(i=0;i<N;i++)ord.push(i);" +
        "ord.sort(function(a,b){return SIG[a]-SIG[b];});" +
        "var ok=0;for(i=0;i<N;i++)for(j=i+1;j<N;j++)if(TYPE[ord[i]]<TYPE[ord[j]])ok++;" +
        "fit2=ok/(N*(N-1)/2);}" +
        "function tick(){ph++;" +
        "if(phase===0){step();if(ph>1500){phase=1;ph=0;" +
        "M.set('sig.ash',ash.toFixed(2));}}" +
        "else if(ph>420)alloc();" +
        "G.clearRect(0,0,W,H);" +
        "var i,top=H*0.07,bh=H*0.62,mx=0.0001;" +
        "for(i=0;i<N;i++)if(SIG[i]>mx)mx=SIG[i];" +
        "var byS=[];for(i=0;i<N;i++)byS.push(i);" +
        "byS.sort(function(a,b){return SIG[b]-SIG[a];});" +
        // 看得见的只有这一列：按烧掉的量排的次序
        "for(i=0;i<N;i++){var who=byS[i],y=top+bh*(i/(N-1));" +
        "var isme=(who===me);" +
        "G.strokeStyle=isme?'rgba(224,150,40,0.75)':INK(0.22);G.lineWidth=isme?3:2.2;" +
        "G.beginPath();G.moveTo(W*0.30,y);" +
        "G.lineTo(W*0.30+W*0.34*(SIG[who]/mx),y);G.stroke();" +
        "G.fillStyle=isme?'rgba(224,150,40,0.98)':INK(0.5);" +
        "G.beginPath();G.arc(W*0.28,y,isme?6:4,0,7);G.fill();" +
        // 一轮完了才把天生的次序摆出来。你自己对
        "if(phase===1){var al=ph/40;if(al>1)al=1;" +
        "G.fillStyle=INK(0.55*al);" +
        "G.beginPath();G.arc(W*0.72+W*0.20*TYPE[who],y,3.4,0,7);G.fill();" +
        "G.strokeStyle=INK(0.14*al);G.lineWidth=1;" +
        "G.beginPath();G.moveTo(W*0.66,y);" +
        "G.lineTo(W*0.72+W*0.20*TYPE[who],y);G.stroke();}}" +
        // 次序抄对了多少。它很快就满了，然后一直满着，而火还在烧
        "G.strokeStyle=INK(0.10);G.lineWidth=5;" +
        "G.beginPath();G.moveTo(W*0.08,H-30);G.lineTo(W*0.92,H-30);G.stroke();" +
        "G.strokeStyle=INK(0.42);G.beginPath();G.moveTo(W*0.08,H-30);" +
        "G.lineTo(W*0.08+W*0.84*fit2,H-30);G.stroke();" +
        // 全场烧掉的灰，一直在长，关掉页面回来还在
        "G.strokeStyle='rgba(224,150,40,0.85)';G.lineWidth=5;" +
        "G.beginPath();G.moveTo(W*0.08,H-12);" +
        "G.lineTo(W*0.08+W*0.84*Math.min(1,ash/900),H-12);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){hold=true;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){hold=false;});" +
        "CV.addEventListener('pointercancel',function(){hold=false;});" +
        "CV.addEventListener('pointerleave',function(){hold=false;});"
    ),
  },
  {
    title: "复印",
    html: play(
      stageCss("ut-copy", ";touch-action:none;cursor:pointer"),
      stageBody("ut-copy"),
      FIT +
        // 两张图并排：左边是上一代，右边是这一代。**按一下就是签一次字**，
        // 签了就印下一代。你不按它也会自己过——没有人拦着，验收本来就是这样过的。
        //
        // 你签的每一次都对。左右两张的差别始终在容差之内，你怎么看都看不出问题，
        // 因为确实没有问题：一次复印只糊一点点、只偏一点点。
        //
        // 印够了，左边那张会换成**原件**。同一个位置、同一个画框，
        // 换的只是拿来比的东西。你这才看得见你签出来的是什么。
        //
        // 关键在于：整个签字的过程里，这条东西**不给你看原件**。
        // 不是我藏起来了——是你手上真的只有上一代。
        // 能拿原件比的时候，你已经不需要比了；需要比的时候，原件不在你手上。
        // 没有哪一步出过错。错的是"每一步都没错"这件事本身
        "var GW=64,GH=64,ORIG,CUR,PREV,gen=0,acc=0,phase=0,ph=0;" +
        "var LIM=150;" +
        "function alloc(){ORIG=new Float32Array(GW*GH);" +
        "for(var y=0;y<GH;y++)for(var x=0;x<GW;x++){" +
        "var u=(x-31.5)/31.5,v=(y-31.5)/31.5;" +
        "var r=Math.sqrt(u*u+v*v),a=Math.atan2(v,u);" +
        "var s=0.5+0.5*Math.cos(a*3+r*5.5);" +
        "ORIG[y*GW+x]=r<0.86?Math.max(0,Math.min(1,s*(1-r*0.35))):0.06;}" +
        "CUR=new Float32Array(ORIG);PREV=new Float32Array(ORIG);" +
        "gen=0;acc=0;phase=0;ph=0;}" +
        "function copy(){var x,y;PREV=new Float32Array(CUR);" +
        "var nx=new Float32Array(GW*GH);" +
        "for(y=0;y<GH;y++)for(x=0;x<GW;x++){" +
        // 一次复印：轻微的糊、轻微的偏、一点噪点。每一项都小到可以忽略——
        // 而"可以忽略"正是它能一直过下去的原因
        "var s=0,c=0;" +
        "for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){" +
        "var a=x+dx,b=y+dy;if(a<0||b<0||a>=GW||b>=GH)continue;" +
        "var w=(dx===0&&dy===0)?13:1;s+=CUR[b*GW+a]*w;c+=w;}" +
        "var v=s/c;v=0.5+(v-0.5)*1.006;v+=(Math.random()-0.5)*0.010;" +
        "nx[y*GW+x]=v<0?0:(v>1?1:v);}" +
        "CUR=nx;gen++;if(gen>=LIM){phase=1;ph=0;}}" +
        "onfit=alloc;alloc();" +
        "function tick(){ph++;" +
        // 自动签字比手动慢。你按得越勤，越快看到结果——这条不拦你
        "if(phase===0){acc++;if(acc>5){acc=0;copy();}}" +
        "else if(ph>420)alloc();" +
        "G.clearRect(0,0,W,H);" +
        "var S=Math.min(W*0.42,H*0.84),cs=S/GW;" +
        "var ox1=W*0.5-S-W*0.02,ox2=W*0.5+W*0.02,oy=(H-S)*0.5;" +
        // 揭晓：左边那张从"上一代"化成"原件"。画框没动，换的只是拿来比的东西
        "var mix=phase===1?ph/120:0;if(mix>1)mix=1;" +
        "var x2,y2,i2,v2;" +
        "for(y2=0;y2<GH;y2++)for(x2=0;x2<GW;x2++){i2=y2*GW+x2;" +
        "v2=PREV[i2]+(ORIG[i2]-PREV[i2])*mix;" +
        "G.fillStyle=INK(0.06+v2*0.86);" +
        "G.fillRect(ox1+x2*cs,oy+y2*cs,cs+0.6,cs+0.6);" +
        "G.fillStyle=INK(0.06+CUR[i2]*0.86);" +
        "G.fillRect(ox2+x2*cs,oy+y2*cs,cs+0.6,cs+0.6);}" +
        // 签了多少次。这是画面上唯一的数字，而它一直在长
        "G.strokeStyle=INK(0.10);G.lineWidth=2;" +
        "G.beginPath();G.moveTo(ox1,H-8);G.lineTo(ox1+S*2+W*0.04,H-8);G.stroke();" +
        "G.strokeStyle=phase===1?'rgba(224,150,40,0.9)':INK(0.42);" +
        "G.beginPath();G.moveTo(ox1,H-8);" +
        "G.lineTo(ox1+(S*2+W*0.04)*Math.min(1,gen/LIM),H-8);G.stroke();" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(phase===0)copy();else alloc();e.preventDefault();});"
    ),
  },
  {
    title: "马太",
    html: play(
      stageCss("ut-matthew"),
      stageBody("ut-matthew"),
      MEM +
        FIT +
        // 三百个人，**一开始一模一样**，每人手里一份。
        // 每一轮发出去一份，落在谁手上的概率跟他现在有多少成正比。
        // 规则对所有人一字不差，也没有任何人比别人强。
        //
        // 上面是排好序的柱子，下面那条弯下去的是分配曲线：
        // 直的那条是人人一样，越往下弯就越集中。它只会往下弯。
        //
        // 你能插手：**按住不放**，就一直从最多的那个手里挪一份给最少的那个。
        // 按着的时候曲线确实在往回抬——你按得住多久，它就抬多久。
        // 松手，那条规则还在跑（它从不停，也没有终点），一会儿就弯回去了。
        // 底下那条橙的是你一共挪了多少份。它只会长，而且**局面重开也不清零**，
        // 关掉页面回来还在——那是你的账，不是这一局的账。
        // 它长成什么样，跟曲线弯成什么样，是两件互不相干的事
        //
        // 停在哪儿不是偶然：这么发下去，最后各人占的份额在所有可能里是**均匀**的，
        // 也就是说，极不平均的那些结果和平均的那些一样容易出现。
        // 基尼系数会稳在 0.5 上下，最上面一成拿走三成。
        // 到最后你会想给最上面那根编一个理由，可这里从头到尾没有理由
        "var N=300,Wl,tot=0,acc=0,hold=0,push2=0;" +
        "var moved=M.num('mat.moved',0);" +
        "function alloc(){Wl=new Float64Array(N);" +
        "for(var i=0;i<N;i++)Wl[i]=1;tot=N;acc=0;hold=0;push2=0;}" +
        "onfit=alloc;alloc();" +
        "function round(){for(var k=0;k<70;k++){" +
        // 落在谁手上，跟他现在有多少成正比。仅此而已
        "var r=Math.random()*tot,s=0,j=0;" +
        "for(j=0;j<N;j++){s+=Wl[j];if(s>=r)break;}" +
        "if(j>=N)j=N-1;Wl[j]+=1;tot+=1;}}" +
        "function tick(){acc++;round();" +
        // 那条规则不会停，也没有终点。数字大了就整体折半：
        // 比例一点没变，只是让它能一直发下去
        "if(tot>N*40){var h2=0;for(var z=0;z<N;z++){Wl[z]=Math.max(1,Wl[z]*0.5);h2+=Wl[z];}tot=h2;}" +
        "if(push2){var hi=0,lo=0,i2;" +
        "for(i2=0;i2<N;i2++){if(Wl[i2]>Wl[hi])hi=i2;if(Wl[i2]<Wl[lo])lo=i2;}" +
        "for(var g=0;g<34&&Wl[hi]>Wl[lo]+1;g++){" +
        "Wl[hi]-=1;Wl[lo]+=1;moved++;" +
        "hi=0;lo=0;for(i2=0;i2<N;i2++){if(Wl[i2]>Wl[hi])hi=i2;if(Wl[i2]<Wl[lo])lo=i2;}}" +
        "M.set('mat.moved',moved);}" +
        "var s2=Array.prototype.slice.call(Wl);s2.sort(function(a,b){return a-b;});" +
        "G.clearRect(0,0,W,H);" +
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
        // 你一共挪了多少份。只会长
        "var by2=H-12;" +
        "G.strokeStyle='rgba(150,170,200,0.14)';G.lineWidth=5;" +
        "G.beginPath();G.moveTo(W*0.10,by2);G.lineTo(W*0.90,by2);G.stroke();" +
        "G.strokeStyle='rgba(236,148,84,0.9)';G.beginPath();G.moveTo(W*0.10,by2);" +
        "G.lineTo(W*0.10+W*0.80*Math.min(1,moved/9000),by2);G.stroke();" +
        
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "try{CV.setPointerCapture(e.pointerId);}catch(err){}push2=1;e.preventDefault();});" +
        "CV.addEventListener('pointerup',function(){push2=0;});" +
        "CV.addEventListener('pointercancel',function(){push2=0;});",
    ),
  },
  {
    title: "贴现",
    html: play(
      stageCss("ut-discount", ";touch-action:none;cursor:pointer"),
      stageBody("ut-discount"),
      MEM +
        FIT +
        // 两件事：近的那件小，远的那件大。**日子和大小都定死了，从头到尾没动过。**
        //
        // 两条曲线是它们此刻**看上去**值多少——远的东西看着小，这不是错觉的比喻，
        // 是所有人都这么打折的。竖线是"现在"，它一直往右走。
        //
        // 一开始远的那条明显在上面，你会想等。**按右半边，就是记下"我要等"。**
        //
        // 走到中间，两条会交叉。过了那个点，近的那件看上去更大——
        // 那时候你按左半边就能拿走它，这条东西不会拦你，也不会提醒你刚才说过什么。
        //
        // **它没有"把刚才那个决定锁住"的按钮。** 不是我没做：
        // 承诺装置是唯一有用的东西，而这条东西的全部内容就是不给你。
        // 你每翻一次供，底下多一道杠，关掉页面回来还在
        "var TS=0.45,TL=0.90,VS=0.42,VL=1.0,KK=9;" +
        "var now=0,plan=-1,took=-1,ph=0,phase=0;" +
        "var flips=M.num('dis.flip',0),runs=M.num('dis.n',0);" +
        "function app(t,v,n){var d=t-n;if(d<0)d=0;return v/(1+KK*d);}" +
        "function alloc(){now=0;plan=-1;took=-1;ph=0;phase=0;}" +
        "alloc();" +
        "function done(what){took=what;phase=1;ph=0;" +
        "runs++;M.set('dis.n',runs);" +
        // 说好要等大的，最后拿了小的——这就是翻供
        "if(plan===1&&what===0){flips++;M.set('dis.flip',flips);}}" +
        "function tick(){ph++;" +
        "if(phase===0){now+=1/820;" +
        "if(now>=TL){done(1);}}" +
        "else if(ph>300)alloc();" +
        "G.clearRect(0,0,W,H);" +
        "var i,x0=W*0.06,xw=W*0.88,top=H*0.14,bh=H*0.56;" +
        "function px3(t){return x0+xw*t;}" +
        "function py3(v){return top+bh*(1-v);}" +
        // 两条"此刻看上去值多少"的曲线。它们会交叉，而两件事本身一动没动
        "for(var s=0;s<2;s++){" +
        "G.strokeStyle=s?INK(0.30):'rgba(224,150,40,0.55)';G.lineWidth=2;" +
        "G.beginPath();" +
        "for(i=0;i<=120;i++){var n2=i/120*TL;" +
        "var v2=s?app(TL,VL,n2):app(TS,VS,n2);" +
        "if(n2>(s?TL:TS))continue;" +
        "if(i===0)G.moveTo(px3(n2),py3(v2));else G.lineTo(px3(n2),py3(v2));}" +
        "G.stroke();}" +
        // 两件事本身，钉在各自的日子上
        "G.fillStyle='rgba(224,150,40,'+(took===0?0.98:0.5)+')';" +
        "G.fillRect(px3(TS)-7,py3(VS),14,py3(0)-py3(VS));" +
        "G.fillStyle=INK(took===1?0.7:0.32);" +
        "G.fillRect(px3(TL)-7,py3(VL),14,py3(0)-py3(VL));" +
        // 现在
        "G.strokeStyle=INK(0.45);G.lineWidth=1.6;" +
        "G.beginPath();G.moveTo(px3(now),top-10);G.lineTo(px3(now),py3(0)+10);G.stroke();" +
        // 你记下的打算。它只是一个记号，没有任何约束力
        "if(plan>=0){var tx=plan?px3(TL):px3(TS);" +
        "G.strokeStyle=INK(0.40);G.lineWidth=1.4;G.setLineDash([4,4]);" +
        "G.beginPath();G.arc(tx,py3(plan?VL:VS)-16,9,0,7);G.stroke();G.setLineDash([]);" +
        "if(phase===1&&plan===1&&took===0){" +
        "G.strokeStyle='rgba(206,92,74,0.9)';G.lineWidth=2;" +
        "G.beginPath();G.moveTo(tx-12,py3(VL)-28);G.lineTo(tx+12,py3(VL)-4);G.stroke();}}" +
        // 你翻过多少次供。只增不减
        "G.fillStyle='rgba(206,92,74,0.85)';" +
        "for(i=0;i<flips&&i<48;i++)G.fillRect(W*0.06+i*9,H-14,4,9);" +
        "requestAnimationFrame(tick);}tick();" +
        "CV.addEventListener('pointerdown',function(e){" +
        "if(phase===1){alloc();e.preventDefault();return;}" +
        "var p=at(e);" +
        // 近的那件，只有走到它跟前才拿得走；此前按左边只是记个打算
        "if(p[0]<W*0.5){if(now>=TS-0.02)done(0);else plan=0;}" +
        "else plan=1;" +
        "e.preventDefault();});"
    ),
  },
];
