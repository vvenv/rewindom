/**
 * 内置创作模板预设 —— **代码里的只读常量，不是种进库的行**。
 *
 * 种进库的话，以后想改进预设文案就够不到已经种下去的那份了；只读常量 + 复制成租户
 * 自己的模板，既能持续改进预设，又不会覆盖租户已经改过的版本。复制出来的模板记
 * `preset_key` 只作来源标记，**不做「跟随预设更新」**——那是隐式改写租户定的规矩。
 *
 * 预设文案是业务数据不是界面文案，所以按 locale 分组直接写在这里（与 site-form 的
 * `FORM_ERROR_TEXT` 同口径），不进 i18next 的 namespace。
 */

import type { AppLocale } from "@rewindom/module-sdk";

import type {
  ContentOutputRules,
  ContentTemplateField,
  ContentTemplateSample,
} from "./content-template.js";
import type { ContentFormat } from "./content.js";

export interface ContentTemplatePreset {
  key: string;
  name: string;
  description: string;
  format: ContentFormat;
  fields: ContentTemplateField[];
  guidelines: string;
  output_rules: ContentOutputRules;
  samples: ContentTemplateSample[];
}

/**
 * 存量 `brief` 升级成填写记录时用的字段 id 与标签。
 *
 * 迁移脚本与「通用创作说明」预设共用同一个 id，这样老内容在新模板下打开时
 * 那一栏能对上，不会变成一条无主的孤立 entry。
 */
export const GENERAL_BRIEF_FIELD_ID = "brief";

const zhPresets: ContentTemplatePreset[] = [
  {
    key: "xhs-note",
    name: "小红书笔记",
    description: "按小红书的阅读习惯产出：钩子标题、短句正文、结尾话题标签。",
    format: "note",
    fields: [
      {
        id: "subject",
        label: "写什么",
        type: "text",
        required: true,
        placeholder: "例：周末在家做的低卡三明治",
        help: "一句话说清这篇的主体：产品、地点、做法或经历。",
        options: [],
      },
      {
        id: "audience",
        label: "写给谁看",
        type: "text",
        required: true,
        placeholder: "例：想减脂又懒得做饭的上班族",
        help: "越具体越好。写「所有人」等于没写。",
        options: [],
      },
      {
        id: "pain",
        label: "他们的痛点",
        type: "textarea",
        required: true,
        placeholder: "例：外卖贵又油，自己做又怕麻烦、怕难吃",
        help: "开头那三行就靠它抓人。写读者心里已经在嘀咕的那句话。",
        options: [],
      },
      {
        id: "selling_points",
        label: "核心卖点",
        type: "textarea",
        required: true,
        placeholder: "一行一个，例：5 分钟出锅 / 全程不开火 / 一份 12 块",
        help: "一行一个，最多三个。多了读者一个也记不住。",
        options: [],
      },
      {
        id: "emotion",
        label: "想引发的情绪",
        type: "select",
        required: false,
        placeholder: "",
        help: "决定整篇的语气。",
        options: ["种草想买", "被治愈", "涨知识", "会心一笑", "想立刻动手试"],
      },
      {
        id: "cta",
        label: "结尾引导",
        type: "text",
        required: false,
        placeholder: "例：评论区告诉我你想看哪种口味",
        help: "留一个读者能顺手做的动作，别写「欢迎关注」。",
        options: [],
      },
      {
        id: "keywords",
        label: "必带关键词",
        type: "tags",
        required: false,
        placeholder: "逗号分隔，例：低卡,减脂餐,快手菜",
        help: "会被写进正文和话题标签，影响搜索能不能找到。",
        options: [],
      },
      {
        id: "avoid",
        label: "禁用词",
        type: "tags",
        required: false,
        placeholder: "逗号分隔，例：最好,第一,包治",
        help: "绝对化用语和承诺疗效的词都容易限流。",
        options: [],
      },
    ],
    guidelines: [
      "用第一人称写，像跟朋友分享，不是在做广告。",
      "开头三行内把痛点抛出来，读者划到这里就要有共鸣。",
      "多用短句，一段不超过三行；关键处可以用 emoji 分隔，但别每句都加。",
      "卖点要落到具体的数字、时间、价格上，不要写「非常好用」这种空话。",
      "不写绝对化用语，不承诺效果，不贬低同类产品。",
      "结尾用一句自然的话引导互动，不要写「欢迎点赞关注收藏」。",
    ].join("\n"),
    output_rules: {
      title_max: 20,
      body_min: 300,
      body_max: 500,
      hashtag_min: 6,
      hashtag_max: 8,
      tone: "第一人称、口语、有分享欲",
    },
    samples: [
      {
        title: "打工人早餐救星🥪 5 分钟不开火",
        body: [
          "早上多睡十分钟还是吃口热的，我选择两个都要。",
          "",
          "以前赶时间就随手买个面包，吃完两小时又饿。后来改成这个三明治，全程不开火，5 分钟出锅，一份成本 12 块左右。",
          "",
          "做法真的很懒：全麦吐司两片，昨晚剩的鸡胸撕成条，铺一层生菜，挤点黄芥末，对折压紧。想丰盛点就加个溏心蛋。",
          "",
          "吃了两周，最大的变化是上午不犯困了，也没到十点就翻抽屉找零食。",
          "",
          "你们早上一般吃什么？我想再囤几个备选方案🙋",
          "",
          "#低卡 #减脂餐 #快手早餐 #打工人早餐 #三明治 #懒人食谱",
        ].join("\n"),
      },
    ],
  },
  {
    key: "wechat-article",
    name: "公众号长文",
    description: "有观点、有结构的深度文章：立论、展开、收束。",
    format: "article",
    fields: [
      {
        id: "topic",
        label: "主题",
        type: "text",
        required: true,
        placeholder: "例：小团队该不该自建数据看板",
        help: "一句话说清这篇要谈的事。",
        options: [],
      },
      {
        id: "thesis",
        label: "核心观点",
        type: "textarea",
        required: true,
        placeholder: "例：先用现成工具跑通指标口径，再谈自建",
        help: "读者看完应该被说服的那一句。没有观点的文章只是资料汇编。",
        options: [],
      },
      {
        id: "audience",
        label: "写给谁看",
        type: "text",
        required: true,
        placeholder: "例：10 人以内团队的技术负责人",
        help: "决定用多少行话、要不要解释基础概念。",
        options: [],
      },
      {
        id: "evidence",
        label: "论据与素材",
        type: "textarea",
        required: false,
        placeholder: "一行一条：数据、案例、亲身经历",
        help: "一行一条。没写进来的事实，模型不会替你编。",
        options: [],
      },
      {
        id: "structure",
        label: "结构偏好",
        type: "select",
        required: false,
        placeholder: "",
        help: "决定小标题怎么切。",
        options: [
          "问题—原因—对策",
          "现象—拆解—结论",
          "时间线复盘",
          "对比多个方案",
        ],
      },
      {
        id: "keywords",
        label: "必带关键词",
        type: "tags",
        required: false,
        placeholder: "逗号分隔",
        help: "",
        options: [],
      },
    ],
    guidelines: [
      "先立论后展开：开头两段之内把观点亮出来，不要铺垫太久。",
      "每个小节只讲一件事，小标题用陈述句，让人扫一眼就知道这节说什么。",
      "论据优先用给定素材里的具体数字和案例；素材里没有的事实不要写。",
      "少用形容词，多用动词和名词。避免「赋能」「抓手」这类词。",
      "结尾回到开头的观点，给读者一个可执行的下一步。",
    ].join("\n"),
    output_rules: {
      title_max: 30,
      body_min: 1200,
      body_max: 2500,
      hashtag_min: 0,
      hashtag_max: 5,
      tone: "克制、有判断、不煽情",
    },
    samples: [],
  },
  {
    key: "general",
    name: "通用创作说明",
    description: "只有一栏自由描述，等同于拆分前的写法。",
    format: "note",
    fields: [
      {
        id: GENERAL_BRIEF_FIELD_ID,
        label: "创作说明",
        type: "textarea",
        required: false,
        placeholder: "想写什么、给谁看、要突出什么",
        help: "",
        options: [],
      },
    ],
    guidelines: "",
    output_rules: {
      title_max: 0,
      body_min: 0,
      body_max: 0,
      hashtag_min: 0,
      hashtag_max: 0,
      tone: "",
    },
    samples: [],
  },
];

const enPresets: ContentTemplatePreset[] = [
  {
    key: "xhs-note",
    name: "Social note",
    description:
      "A scannable social note: hook title, short paragraphs, closing hashtags.",
    format: "note",
    fields: [
      {
        id: "subject",
        label: "What it's about",
        type: "text",
        required: true,
        placeholder: "e.g. a low-calorie sandwich I make on weekends",
        help: "One line naming the product, place, method or experience.",
        options: [],
      },
      {
        id: "audience",
        label: "Who it's for",
        type: "text",
        required: true,
        placeholder:
          "e.g. office workers who want to eat light but hate cooking",
        help: 'The more specific the better. "Everyone" says nothing.',
        options: [],
      },
      {
        id: "pain",
        label: "Their pain point",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. takeout is pricey and greasy, cooking feels like work",
        help: "The first three lines live on this. Write what the reader is already thinking.",
        options: [],
      },
      {
        id: "selling_points",
        label: "Key points",
        type: "textarea",
        required: true,
        placeholder:
          "One per line, e.g. ready in 5 minutes / no stove / $2 a serving",
        help: "One per line, three at most. More than that and nothing sticks.",
        options: [],
      },
      {
        id: "emotion",
        label: "Feeling to land",
        type: "select",
        required: false,
        placeholder: "",
        help: "Sets the tone of the whole piece.",
        options: [
          "I want this",
          "Comforting",
          "I learned something",
          "Made me smile",
          "I want to try it now",
        ],
      },
      {
        id: "cta",
        label: "Closing nudge",
        type: "text",
        required: false,
        placeholder: "e.g. tell me which flavour to try next",
        help: 'Leave one easy action. Not "please follow".',
        options: [],
      },
      {
        id: "keywords",
        label: "Must-use keywords",
        type: "tags",
        required: false,
        placeholder: "Comma separated",
        help: "Goes into the body and the hashtags; affects whether people find it.",
        options: [],
      },
      {
        id: "avoid",
        label: "Words to avoid",
        type: "tags",
        required: false,
        placeholder: "Comma separated, e.g. best, cures, guaranteed",
        help: "Absolute claims and health promises get posts throttled.",
        options: [],
      },
    ],
    guidelines: [
      "Write in first person, like sharing with a friend, not running an ad.",
      "Put the pain point in the first three lines — the reader has to nod there.",
      "Short sentences; no paragraph longer than three lines. Emoji sparingly.",
      'Ground every point in a number, a time or a price. Never "really great".',
      "No absolute claims, no promised results, no putting down alternatives.",
      'Close with a natural nudge to reply, not "like and subscribe".',
    ].join("\n"),
    output_rules: {
      title_max: 40,
      body_min: 600,
      body_max: 1_000,
      hashtag_min: 6,
      hashtag_max: 8,
      tone: "first person, spoken, eager to share",
    },
    samples: [],
  },
  {
    key: "wechat-article",
    name: "Long-form article",
    description: "An argued piece: claim, development, close.",
    format: "article",
    fields: [
      {
        id: "topic",
        label: "Topic",
        type: "text",
        required: true,
        placeholder: "e.g. should a small team build its own dashboard",
        help: "One line naming what this piece is about.",
        options: [],
      },
      {
        id: "thesis",
        label: "Core claim",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. settle your metric definitions on off-the-shelf tools first",
        help: "The sentence the reader should be convinced of. Without one it's just a file dump.",
        options: [],
      },
      {
        id: "audience",
        label: "Who it's for",
        type: "text",
        required: true,
        placeholder: "e.g. tech leads at teams under 10 people",
        help: "Decides how much jargon is fine and what needs explaining.",
        options: [],
      },
      {
        id: "evidence",
        label: "Evidence and material",
        type: "textarea",
        required: false,
        placeholder: "One per line: data, cases, first-hand experience",
        help: "One per line. Facts you leave out will not be invented for you.",
        options: [],
      },
      {
        id: "structure",
        label: "Structure",
        type: "select",
        required: false,
        placeholder: "",
        help: "Decides how the sections are cut.",
        options: [
          "Problem — cause — fix",
          "Observation — analysis — conclusion",
          "Timeline retrospective",
          "Compare the options",
        ],
      },
      {
        id: "keywords",
        label: "Must-use keywords",
        type: "tags",
        required: false,
        placeholder: "Comma separated",
        help: "",
        options: [],
      },
    ],
    guidelines: [
      "State the claim within the first two paragraphs; don't warm up for long.",
      "One idea per section. Section headings are statements, scannable at a glance.",
      "Prefer the numbers and cases given as material. Don't state facts not supplied.",
      "Fewer adjectives, more verbs and nouns. Avoid corporate filler.",
      "Close by returning to the claim with one concrete next step.",
    ].join("\n"),
    output_rules: {
      title_max: 60,
      body_min: 3_000,
      body_max: 6_000,
      hashtag_min: 0,
      hashtag_max: 5,
      tone: "measured, opinionated, unsentimental",
    },
    samples: [],
  },
  {
    key: "general",
    name: "Free-form brief",
    description: "A single free-text box — the way it worked before templates.",
    format: "note",
    fields: [
      {
        id: GENERAL_BRIEF_FIELD_ID,
        label: "Brief",
        type: "textarea",
        required: false,
        placeholder: "What to write, who it's for, what to emphasise",
        help: "",
        options: [],
      },
    ],
    guidelines: "",
    output_rules: {
      title_max: 0,
      body_min: 0,
      body_max: 0,
      hashtag_min: 0,
      hashtag_max: 0,
      tone: "",
    },
    samples: [],
  },
];

const PRESETS_BY_LOCALE: Record<AppLocale, ContentTemplatePreset[]> = {
  "zh-CN": zhPresets,
  en: enPresets,
};

export function contentTemplatePresets(
  locale: AppLocale,
): ContentTemplatePreset[] {
  return PRESETS_BY_LOCALE[locale] ?? zhPresets;
}

export function findContentTemplatePreset(
  locale: AppLocale,
  key: string,
): ContentTemplatePreset | null {
  return (
    contentTemplatePresets(locale).find((preset) => preset.key === key) ?? null
  );
}
