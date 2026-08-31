import { describe, expect, it } from "vitest";

import { SEED_EMBEDS } from "./seed-embeds.js";

/**
 * 这些东西**直接注入官网页面**，没有 iframe 边界。所以作用域是靠约定守的，
 * 这组测试就是那个约定的执行者——违反了会把整站的版式或事件一起改掉。
 */
/** 把字符串字面量抹成同长度空白，免得里面的括号分号干扰花括号深度 */
function blankStrings(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "'" || c === '"') {
      const q = c;
      out += " ";
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\") {
          out += "  ";
          i += 2;
          continue;
        }
        out += " ";
        i++;
      }
      out += " ";
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** 取出 `function 名字(...){...}` 的函数体 */
function bodyOf(s: string, name: string): string {
  const m = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(s);
  if (!m) return "";
  let d = 0;
  let i = m.index + m[0].length - 1;
  const start = i;
  for (; i < s.length; i++) {
    if (s[i] === "{") d++;
    else if (s[i] === "}") {
      d--;
      if (!d) break;
    }
  }
  return s.slice(start, i);
}

describe("可交互物必须守住自己的作用域", () => {
  for (const embed of SEED_EMBEDS) {
    describe(embed.title, () => {
      const styles = [...embed.html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
        .map((m) => m[1])
        .join("\n");
      const scripts = [...embed.html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
        .map((m) => m[1])
        .join("\n");

      it("舞台不铺 #hex 实心底 —— 亮暗色靠页面透出来", () => {
        expect(styles, embed.title).not.toMatch(/background\s*:\s*#/);
        expect(scripts, embed.title).not.toMatch(
          /fillStyle='#[0-9a-fA-F]+';G\.fillRect\(0,0,W,H\)/,
        );
      });

      it("CSS 选择器全部收在 .useless-thing 里", () => {
        const selectors = styles
          .split("}")
          .map((chunk) => chunk.split("{")[0].trim())
          .filter(Boolean);
        for (const sel of selectors) {
          // `@media` 之类的 at-rule 不是选择器
          if (sel.startsWith("@")) continue;
          expect(sel, `越界的选择器：${sel}`).toMatch(/^\.useless-thing\b/);
        }
      });

      it("不往 document / window 上绑事件", () => {
        // 绑在 document 上会收到整页的点击，读者点导航也会触发它
        expect(scripts).not.toMatch(/document\s*\.\s*addEventListener/);
        expect(scripts).not.toMatch(/window\s*\.\s*addEventListener/);
        expect(scripts).not.toMatch(/document\s*\.\s*on\w+\s*=/);
      });

      it("只在自己的容器内查元素", () => {
        // 全局查询会在同一页摆两个时抓到别人那一个
        expect(scripts).not.toMatch(/document\s*\.\s*getElementById/);
        expect(scripts).not.toMatch(/document\s*\.\s*querySelector/);
        expect(scripts).toContain("currentScript.parentNode");
      });

      it("脚本包在 IIFE 里，不往全局漏变量", () => {
        expect(scripts.trim()).toMatch(/^\(function\s*\(\)\s*\{/);
      });

      it("语法正确", () => {
        expect(() => new Function(scripts)).not.toThrow();
      });

      /*
       * 拼接时多打一个 `+`（`"a" + +"b"`）会把后面那整段字符串求成 `NaN` 吞掉，
       * 留下 `}NaNRr=1;` 这种残骸——它**解析得过**（`NaNRr` 就是个标识符），
       * 上面那条测不出来，页面却是空的。
       *
       * 认的是「粘在标识符上的 NaN」，不是 NaN 本身：`MEM` 里
       * `v===null?NaN:parseFloat(v)` 是正当的独立字面量，两边都不是标识符字符。
       */
      /*
       * `BOX` 已经占了 `.ut` / `.ut-mono` / `.ut-btn` / `.ut-tap` 这几个类。
       * 拿它们当舞台容器的类名，样式会直接套上去——`.ut-mono` 带着
       * `opacity:.45`，整块画面会被压成半透明，而画布数据看着还是对的，
       * 极难查。所以直接禁掉。
       */
      /*
       * `FIT` 自己声明了 `CV` / `G` / `W` / `H` / `onfit` / `fit` / `at` / `INK`。
       * 条目里再声明同名的，函数声明提升会让后者覆盖前者——`FIT` 末尾那句 `fit()`
       * 就会调到你的函数上去，画布从此没被定过尺寸，而且报错发生在同步阶段，
       * 泵帧的 try/catch 也抓不到。整条静默地不画任何东西。
       */
      it("不重新声明 FIT 已占用的标识符", () => {
        if (!scripts.includes("var CV=R.querySelector('canvas')")) return;
        for (const id of ["fit", "at"]) {
          const hits = [...scripts.matchAll(new RegExp(`function ${id}\\(`, "g"))];
          expect(hits.length, `${embed.title} 重复声明了 function ${id}()`).toBe(1);
        }
        for (const id of ["CV", "G", "W", "H", "onfit", "INK"]) {
          const hits = [...scripts.matchAll(new RegExp(`\\bvar ${id}\\s*=`, "g"))];
          expect(hits.length, `${embed.title} 重复声明了 var ${id}`).toBeLessThan(2);
        }
      });

      /*
       * `黏菌` 曾经把启动那句 `tick();` 排在 `var FD=[]` 前面。`var` 会提升，
       * 所以第一帧读到的 `FD` 是 `undefined`，`FD.length` 当场抛——抛在同步阶段，
       * 泵帧的 try/catch 收不到，`__err` 是空的，上面每一条测试都过，
       * 而整条一个像素都没画。这是第三次栽在"同步阶段静默抛错"上了。
       *
       * 认的是：顶层有个裸调用排在某个顶层 `var` 前面，而被调的那个函数
       * （连它一跳内调到的）读了这个 var。单字母的名字不认——`i`/`x`/`d`
       * 到处都是局部变量，认了全是噪音，而真正会出事的状态都有名字。
       */
      it("启动不能排在它要读的 var 前面", () => {
        const src = blankStrings(scripts);
        const depth: number[] = new Array(src.length).fill(0);
        let d = 0;
        for (let i = 0; i < src.length; i++) {
          if (src[i] === "{") d++;
          depth[i] = d;
          if (src[i] === "}") d--;
        }
        const decls = new Map<string, number>();
        for (const m of src.matchAll(/\bvar\s+([A-Za-z_$][\w$]*)/g))
          if (depth[m.index] === 1 && !decls.has(m[1])) decls.set(m[1], m.index);

        for (const m of src.matchAll(/(^|[;}])\s*([A-Za-z_$][\w$]*)\s*\(\s*\)\s*;/g)) {
          const at = m.index + m[0].length - 1;
          if (depth[at] !== 1) continue;
          let reach = bodyOf(src, m[2]);
          for (const callee of new Set(
            [...reach.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1]),
          ))
            reach += bodyOf(src, callee);
          for (const [name, pos] of decls) {
            if (pos < at || name.length < 2) continue;
            const used = new RegExp(
              `(^|[^\\w$.])${name.replace(/\$/g, "\\$")}([^\\w$]|$)`,
            ).test(reach);
            expect(
              used,
              `${embed.title}：${m[2]}() 排在 var ${name} 前面，但它读 ${name}`,
            ).toBe(false);
          }
        }
      });

      it("舞台类名不撞 BOX 已占用的", () => {
        for (const cls of ["ut-mono", "ut-btn", "ut-tap"]) {
          expect(embed.html, `${embed.title} 用了保留类名 ${cls}`).not.toMatch(
            new RegExp(`<div class='${cls}'>\\s*<canvas`),
          );
        }
      });

      /*
       * `MEM` / `FIT` / `BOX` 是 TS 侧的常量名，拼进去的运行时对象叫 `M`。
       * 顺手写成 `MEM.num(...)`，语法是对的、上面每一条都过，但页面一加载
       * 就 ReferenceError——而且是在同步阶段抛的，泵帧的 try/catch 抓不到，
       * 画布一个像素都没被碰过。
       */
      it("不引用 TS 侧的常量名 —— 运行时那个对象叫 M", () => {
        for (const name of ["MEM", "FIT", "BOX"]) {
          expect(scripts, `${embed.title} 把 ${name} 当成了运行时标识符`).not.toMatch(
            new RegExp(`\\b${name}\\s*[.(\\[]`),
          );
        }
      });

      it("拼接没有失手 —— NaN 不该粘在标识符上", () => {
        expect(scripts, embed.title).not.toMatch(
          /NaN[A-Za-z_$0-9]|[A-Za-z_$0-9]NaN/,
        );
      });

      it("可见 DOM 没有汉字 —— 机制自己说话，旁白拿掉", () => {
        const visible = embed.html
          .replace(/<script>[\s\S]*?<\/script>/g, "")
          .replace(/<style>[\s\S]*?<\/style>/g, "")
          .replace(/\baria-label=(['"])[\s\S]*?\1/g, "");
        expect(visible, embed.title).not.toMatch(/[\u4e00-\u9fff]/);
      });

      it("脚本不把汉字写进页面", () => {
        expect(scripts, embed.title).not.toMatch(
          /textContent\s*=\s*(['"`])[^'"`]*[\u4e00-\u9fff]/,
        );
        expect(scripts, embed.title).not.toMatch(
          /\+=['"][^'"]*[\u4e00-\u9fff]/,
        );
      });
    });
  }

  it("标题互不重复 —— seed 靠标题查重", () => {
    const titles = SEED_EMBEDS.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  /*
   * 收东西的标准有两条，缺一条都不收。
   *
   * 一、**翻到这一天，你会想动手，或者愿意让它开着。**
   *    挡在外面的三类，每一类都吃过亏才写下来：一句话的笑话（懂了就完）、
   *    循环播放的花纹（第二眼就没有新东西）、把输入映射成一个标量的演示
   *    （它证明的是「我读得到你」，不是一件事）。
   *
   * 二、**机制自己要说出一件事，而且不许靠旁白说。**
   *    这个模块叫「无用」是反话——它反的是凡事先问有什么用。所以一条东西
   *    光是漂亮不够：漂亮的物理演示恰恰是实用主义的战利品，是拿来证明
   *    「这套模型很准」的。要么它在拒绝什么（`最后一个键` 用一次少一个、
   *    `一口气` 憋越久呼得越慢、`洞穴` 不能加速也不能分享进度），
   *    要么把过程跑到底、让它自己走到反讽的终点（`河` 刻到没有地形、
   *    `晶` 粗化到没有晶界、`黏菌` 把网优化到没有冗余然后食物一挪全废）。
   *
   *    判断办法有两条，缺一条都不算过。
   *
   *    一、如果这条东西换个名字放进 GPU 厂商的发布会背景毫无违和，
   *       那它就还没有观点——漂亮的物理演示是实用主义的战利品。
   *
   *    二、如果它换个名字放进行为经济学的课件、或者增长团队的入职材料里
   *       毫无违和，那它也还没有观点。**论证不等于立场。**
   *       把一个有名字的效应画清楚，是在给这套秩序做注解，不是在拒绝它。
   *       `默认值` 现在既是对暗模式的控诉，也是一份合格的暗模式说明书。
   *
   *    第二条是补写的，因为前 100 条里有大约一半没过：`auto.ts` 末尾连着
   *    十五条全是"效应 + 底下两条对比杠"。漂移有原因——`probe-useless.ts`
   *    只证得了能压成一句可转述命题的东西，于是"可验证"悄悄变成了"可教学"，
   *    而 `一次` 那种（按住才长、松手当场没、不留不存不给看第二遍）
   *    根本没有东西可测。**核对台会挑食，别让它替你定标准。**
   *
   * 加东西先过这两关，再改这个数。宁可少。
   */
  it("正好 100 条", () => {
    expect(SEED_EMBEDS.length).toBe(100);
  });
});
