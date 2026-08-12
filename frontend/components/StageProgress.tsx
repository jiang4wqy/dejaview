"use client";

import { useState } from "react";
import type { Job, Tone } from "@/lib/types";
import { useTone } from "@/lib/tone";
import { useLang, type TFunc } from "@/lib/i18n";

// stage id → 展示文案：语言相关，交由组件内用 t() 现取，见 stageLabel()。
function stageLabel(stage: string, t: TFunc): string {
  switch (stage) {
    case "site_analysis": return t("stage.site_analysis");
    case "github_analysis": return t("stage.github_analysis");
    case "fingerprint": return t("stage.fingerprint");
    case "search": return t("stage.search");
    case "verify": return t("stage.verify");
    case "judge": return t("stage.judge");
    case "factlayer": return t("stage.factlayer");
    case "render": return t("stage.render");
    case "done": return t("stage.done");
    default: return stage;
  }
}
const STAGE_ORDER = [
  "site_analysis", "github_analysis", "fingerprint", "search",
  "verify", "judge", "factlayer", "render", "done",
];

// 过堂问答：correct = 最诚实/自省的那个选项，选中即"答对"→ 触发本世界特效 + 表扬；
// 其余选项被毒舌。只嘲项目/创业话术，不涉及个人。
type QA = { q: string; correct: number; opts: { t: string; r: string }[] };

const QUIZ: Record<Tone, QA[]> = {
  roast: [
    { q: "讲真，你这项目的灵感哪来的？", correct: 0, opts: [
      { t: "深夜 emo 拍脑门想的", r: "🎯 承认冲动，至少真诚——加分。" },
      { t: "看别人融资眼红", r: "红着眼抄，抄得还没人家好。" },
      { t: "Trending 顺来的", r: "顺手牵羊，牵的还是只病羊。" },
      { t: "致敬，不叫抄", r: "致敬到连 bug 都一模一样。" }]},
    { q: "README 里「颠覆/革命性」出现几次？", correct: 0, opts: [
      { t: "0 次，我心虚", r: "🎯 心虚是清醒，比吹牛强。" },
      { t: "1–3 次，克制", r: "克制个啥，产品配不上这三次。" },
      { t: "4–9 次，营销号", r: "改行写标题党更有前途。" },
      { t: "全文都是", r: "PPT 创业之王，实物呢？" }]},
    { q: "你和竞品最大的区别是？", correct: 2, opts: [
      { t: "UI 换了个色", r: "换皮怪，石锤了。" },
      { t: "加了个 AI 按钮", r: "2026 了还在「加个 AI」？" },
      { t: "老实说，没啥区别", r: "🎯 敢承认没区别，勇气可嘉。" },
      { t: "我们更有情怀", r: "情怀当不了护城河。" }]},
    { q: "你项目上线多久了？", correct: 1, opts: [
      { t: "还没上，在打磨", r: "磨到风口都过了。" },
      { t: "上了，几乎没人用", r: "🎯 直面惨淡数据，值得敬一杯。" },
      { t: "几个朋友在用", r: "情面用户，一撤全归零。" },
      { t: "数据很好（自己刷的）", r: "刷出来的繁荣最不经看。" }]},
    { q: "给你的代码贴个标签：", correct: 0, opts: [
      { t: "缝合怪 / 屎山", r: "🎯 有自知之明，屎山也有救。" },
      { t: "能跑就行", r: "跑是跑，一压测就躺。" },
      { t: "我觉得挺优雅", r: "全世界只有你这么觉得。" },
      { t: "商业机密", r: "机密个啥，怕人看到烂吧。" }]},
    { q: "投资人问你护城河，你？", correct: 3, opts: [
      { t: "顾左右而言他", r: "他已经在删你微信了。" },
      { t: "「我们更懂用户」", r: "你连自己都没搞懂。" },
      { t: "掏架构图糊弄", r: "图很唬人，跑起来就露馅。" },
      { t: "老实说：暂时没有", r: "🎯 诚实到让人心疼，敬你。" }]},
    { q: "被问「这不是 XX 早做过了」，你？", correct: 3, opts: [
      { t: "他们做得不好", r: "你做得更不好，扯平了。" },
      { t: "我们切细分", r: "细分到只剩你一个用户。" },
      { t: "时机不一样", r: "人家吃肉，你喝汤。" },
      { t: "确实，我再想想", r: "🎯 肯反思，还有得救。" }]},
    { q: "你最怕用户问哪句？", correct: 0, opts: [
      { t: "「这和 XX 有啥不一样」", r: "🎯 怕对了，这正是你的命门。" },
      { t: "「怎么收费」", r: "收费？你敢收吗。" },
      { t: "「安全吗」", r: "这个……别深究。" },
      { t: "「你们能活多久」", r: "扎心了老铁。" }]},
    { q: "你的增长靠什么？", correct: 2, opts: [
      { t: "刷榜 / 互点", r: "虚假繁荣，一戳就破。" },
      { t: "熟人转发", r: "熟人用完就走。" },
      { t: "老实说，还没增长", r: "🎯 承认停滞，是复活第一步。" },
      { t: "口碑爆炸（想象的）", r: "想象里爆炸，现实里哑火。" }]},
    { q: "你项目真正的核心竞争力？", correct: 3, opts: [
      { t: "先发优势", r: "先发的坟头草两米高了。" },
      { t: "技术领先", r: "开源两周就被追平。" },
      { t: "团队豪华", r: "豪华团队做出这个更尴尬。" },
      { t: "……我也在找", r: "🎯 至少你在找，比装的强。" }]},
    { q: "如果明天没融到钱？", correct: 1, opts: [
      { t: "再撑撑，会有的", r: "信念感救不了现金流。" },
      { t: "老实说：可能就凉了", r: "🎯 认清现实，才谈得上翻盘。" },
      { t: "换个赛道重来", r: "连环创业者预备役。" },
      { t: "不会的（鸵鸟）", r: "头埋沙里，屁股还露着。" }]},
    { q: "你觉得这次锐评会给你？", correct: 0, opts: [
      { t: "一记暴击，但有用", r: "🎯 抗揍又清醒，孺子可教。" },
      { t: "全是偏见", r: "证据摆着呢，偏见你的头。" },
      { t: "无所谓，我不信", r: "不信也躲不过重复度。" },
      { t: "夸夸我（做梦）", r: "这是马戏团，不是夸夸群。" }]},
  ],
  serious: [
    { q: "若你的项目是一支股票，分析师评级？", correct: 0, opts: [
      { t: "强烈卖出", r: "📈 难得的诚实，委员会记你一功。" },
      { t: "减持观望", r: "观望到退市。" },
      { t: "持有（面子）", r: "持有的是执念，不是价值。" },
      { t: "该 IPO 了", r: "先证明你能活过下一轮。" }]},
    { q: "尽调时你最怕被问：", correct: 0, opts: [
      { t: "「你们赚钱吗」", r: "📈 直面盈利问题，专业。" },
      { t: "留存多少", r: "低于行业就别提增长。" },
      { t: "壁垒在哪", r: "两周能抄完的东西？" },
      { t: "为什么是你们", r: "答不上，估值直接对折。" }]},
    { q: "你的估值逻辑是？", correct: 3, opts: [
      { t: "对标独角兽 ×0.1", r: "乘 0.1 还是高估了。" },
      { t: "PPT 里写的数", r: "PPT 是艺术，不是财报。" },
      { t: "拍脑袋", r: "脑袋值几个钱，估值就几个钱。" },
      { t: "老实说：算不清", r: "📈 承认不确定，反而可信。" }]},
    { q: "现金流跑道还剩多久？", correct: 1, opts: [
      { t: "18 个月（吹的）", r: "吹的月份，打三折。" },
      { t: "老实说：6 个月，紧张", r: "📈 数字清醒，可以谈。" },
      { t: "下月工资靠融资", r: "这不叫创业，叫赌博。" },
      { t: "不看这个，看愿景", r: "愿景不发工资。" }]},
    { q: "你的护城河成分表？", correct: 3, opts: [
      { t: "先发优势", r: "先发的坟头草两米高了。" },
      { t: "网络效应（画的）", r: "画的效应，风一吹就散。" },
      { t: "技术壁垒", r: "开源两周就追平。" },
      { t: "老实说：还很薄", r: "📈 敢承认薄，才补得上。" }]},
    { q: "路演后投资人说「保持联系」，意思是？", correct: 1, opts: [
      { t: "有戏", r: "天真，这是最高级的拒绝。" },
      { t: "礼貌拒绝，我懂", r: "📈 读懂潜台词，成熟。" },
      { t: "让我再想想", r: "想到你 out of runway。" },
      { t: "回去等消息", r: "消息永远在路上。" }]},
    { q: "你最该补的一课是？", correct: 0, opts: [
      { t: "先搞清楚谁付钱", r: "📈 抓住本质，加分。" },
      { t: "多融点钱", r: "钱解决不了根本问题。" },
      { t: "多招几个人", r: "人多不等于事成。" },
      { t: "再拍个宣传片", r: "宣传片救不了留存。" }]},
    { q: "竞品比你有钱有人，你？", correct: 2, opts: [
      { t: "硬刚", r: "以卵击石。" },
      { t: "抱大腿", r: "抱到被收编。" },
      { t: "找他们懒得做的细分", r: "📈 田忌赛马，聪明。" },
      { t: "融更多钱对轰", r: "烧钱大战没有赢家。" }]},
  ],
  comfort: [
    { q: "做到现在，你觉得自己？", correct: 0, opts: [
      { t: "已经很努力了，值得抱抱", r: "💖 对！先抱抱自己，你真的很棒。" },
      { t: "还差得远，好焦虑", r: "🌈 别急，你已经比昨天的自己更强了。" },
      { t: "又想放弃了", r: "🌈 想歇会儿也没关系，我等你回来。" },
      { t: "不知道有没有意义", r: "💖 你愿意开始，本身就很有意义。" }]},
    { q: "项目暂时没人用，你会？", correct: 1, opts: [
      { t: "怀疑自己", r: "🌈 别怀疑，是还没被看见而已。" },
      { t: "继续做，我喜欢就好", r: "💖 就是这个劲儿！热爱本身无敌。" },
      { t: "偷偷 emo", r: "🌈 emo 完记得回来，宝藏在等你。" },
      { t: "删库跑路", r: "💖 别删！它是你努力的证明。" }]},
    { q: "被说「你这是重复造轮子」，你？", correct: 2, opts: [
      { t: "很受伤", r: "🌈 他们不懂，你的轮子有你的温度。" },
      { t: "开始自我怀疑", r: "💖 每个伟大的东西都被说过『早有人做了』。" },
      { t: "轮子怎么了，我造得开心", r: "💖 这才对！开心 + 成长比什么都值。" },
      { t: "想反驳但没底气", r: "🌈 你不用向谁证明，你已经在路上了。" }]},
    { q: "此刻最想听到哪句话？", correct: 0, opts: [
      { t: "你已经很棒了", r: "💖 你！已！经！很！棒！了！真的。" },
      { t: "再坚持一下", r: "🌈 再坚持一下，也记得对自己温柔。" },
      { t: "没关系慢慢来", r: "💖 没关系，慢慢来，都来得及。" },
      { t: "我相信你", r: "🌈 我，相信，你。无条件的。" }]},
    { q: "给现在的自己打几分？", correct: 3, opts: [
      { t: "60 分及格吧", r: "💖 至少 90 分！你对自己太严了。" },
      { t: "不敢打，怕难过", r: "🌈 那我替你打——满分，因为你在坚持。" },
      { t: "0 分，摆烂了", r: "💖 摆烂也 100 分，你只是累了不是不行。" },
      { t: "满分！我为自己骄傲", r: "🌈 这就对了！为你骄傲！！" }]},
  ],
};

const NARR: Record<Tone, string> = {
  roast: "🤡 后台正在扒你的皮，先来道题醒醒神（答对有惊喜）：",
  serious: "💰 分析师正在给你估值，顺便做份问卷（答对有彩头）：",
  comfort: "🌈 夸夸群正在集合，先来道暖心小题（答对有抱抱）：",
};

function Quiz({ tone }: { tone: Tone }) {
  const bank = QUIZ[tone];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [right, setRight] = useState(0);
  const q = bank[idx % bank.length];

  function pick(i: number, e: React.MouseEvent) {
    if (picked !== null) return;
    setPicked(i);
    setCount((c) => c + 1);
    if (i === q.correct) {
      setRight((r) => r + 1);
      // 答对 → 触发本世界特效
      if (tone === "roast") window.__djBurst?.(e.clientX, e.clientY);
      else if (tone === "comfort") window.__djHearts?.(e.clientX, e.clientY);
      else window.__djGold?.();
    }
  }
  function next() {
    setPicked(null);
    let n = idx;
    while (bank.length > 1 && n === idx) n = Math.floor(Math.random() * bank.length);
    setIdx(n);
  }

  const correctPicked = picked !== null && picked === q.correct;

  return (
    <div className="quiz">
      <div className="quiz-narr">{NARR[tone]}</div>
      <div className="quiz-q">{q.q}</div>
      <div className="quiz-opts">
        {q.opts.map((o, i) => {
          const isRight = picked !== null && i === q.correct;
          const isWrongPick = picked === i && i !== q.correct;
          return (
            <button key={i} type="button"
              className={`quiz-opt${picked === i ? " picked" : ""}${isRight ? " right" : ""}${isWrongPick ? " wrong" : ""}${picked !== null && picked !== i && !isRight ? " dim" : ""}`}
              onClick={(e) => pick(i, e)} disabled={picked !== null}>
              <span className="quiz-letter">{"ABCD"[i]}</span>
              <span>{o.t}</span>
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <div className={`quiz-reaction${correctPicked ? " hit" : ""}`}>
          <span className="quiz-verdict">
            {correctPicked
              ? tone === "roast" ? "🎉 答对！" : tone === "comfort" ? "💖 抱抱！" : "🥂 高见。"
              : tone === "roast" ? "🃏 " : tone === "comfort" ? "🌈 " : "— "}
            {q.opts[picked].r}
          </span>
          <button type="button" className="quiz-next" onClick={next}>换一题 →</button>
        </div>
      ) : null}
      <div className="quiz-count">
        已过堂 {count} 题 · 答对 {right} · 纯属娱乐，不影响分析结论
      </div>
    </div>
  );
}

function pctOf(v: number) {
  const n = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// relation → 中文标签 + 皮肤（与 ReportView 的 RELATION 保持同一套视觉语言，仅直接竞品用告警色）。
function relLabel(relation: string, t: TFunc): string {
  switch (relation) {
    case "direct_competitor": return t("relation.direct_competitor");
    case "alternative": return t("relation.alternative");
    case "adjacent": return t("relation.adjacent");
    case "abandoned": return t("relation.abandoned");
    case "superficial": return t("relation.superficial");
    default: return relation;
  }
}
function relClass(relation?: string): string {
  return relation === "direct_competitor" ? "direct" : "adj";
}

// 渐进揭示：随后端流式推来的中间产物，一块块点亮
function LiveBuild({ job }: { job: Job }) {
  const { t } = useLang();
  const idx = STAGE_ORDER.indexOf(job.stage);
  const reached = (s: string) => idx >= STAGE_ORDER.indexOf(s);
  const fp = job.fingerprint;
  const cands = job.candidates ?? [];
  const verified = job.verified ?? [];
  const dup = job.duplication;

  const steps = [
    {
      key: "fp", icon: "🧬", title: t("livebuild.fingerprintTitle"),
      done: !!fp,
      running: job.stage === "fingerprint" || (reached("site_analysis") && !fp && !reached("search")),
      body: fp ? <p className="lb-one">{fp.one_liner}</p> : null,
    },
    {
      key: "search", icon: "🔍", title: t("livebuild.searchTitle"),
      done: cands.length > 0 || reached("verify"),
      running: job.stage === "search",
      body: cands.length ? (
        <div className="lb-cands">
          {cands.slice(0, 6).map((c, i) => {
            // 一旦深度核对(verify)产出，用更准的 relation/notes 顶替早期的粗召回信息。
            const v = verified.find((x) => x.ref.url === c.url || x.ref.name === c.name);
            const snippet = v?.notes || c.snippet;
            return (
              <div key={i} className="lb-cand">
                <span className="lb-cand-name">{c.name}</span>
                {v ? (
                  <span className={`lb-rel ${relClass(v.relation)}`}>
                    {relLabel(v.relation, t)}
                  </span>
                ) : null}
                {snippet ? <p className="lb-cand-snip">{snippet}</p> : null}
              </div>
            );
          })}
          {cands.length > 6 ? (
            <span className="lb-chip more">{t("livebuild.moreCandidates", { n: cands.length - 6 })}</span>
          ) : null}
        </div>
      ) : reached("search") ? (
        <span className="muted">{t("livebuild.noCandidates")}</span>
      ) : null,
    },
    {
      key: "verify", icon: "⚖️", title: t("livebuild.verifyTitle"),
      done: verified.length > 0 || reached("judge"),
      running: job.stage === "verify",
      body: verified.length ? (
        <p className="lb-note">
          {t("livebuild.verifyNote", {
            total: verified.length,
            direct: verified.filter((v) => v.relation === "direct_competitor").length,
          })}
        </p>
      ) : null,
    },
    {
      key: "judge", icon: "🔨", title: t("livebuild.judgeTitle"),
      done: !!dup,
      running: job.stage === "judge",
      body: dup ? (
        <div className="lb-verdict">
          {t("metric.dupProb")} <b>{pctOf(dup.duplication_score)}%</b>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="livebuild">
      {steps.map((s) => (
        <div key={s.key} className={`lb-step ${s.done ? "done" : s.running ? "run" : "wait"}`}>
          <div className="lb-ico">{s.done ? "✓" : s.icon}</div>
          <div className="lb-main">
            <div className="lb-title">
              {s.title}
              {s.running && !s.done ? <i className="lb-dots" aria-hidden="true" /> : null}
            </div>
            {s.done && s.body ? <div className="lb-body">{s.body}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StageProgress({ job }: { job: Job }) {
  const { tone } = useTone();
  const { t } = useLang();
  const pct = Math.max(0, Math.min(100, Math.round((job.progress ?? 0) * 100)));
  const label = stageLabel(job.stage, t) || job.stage || t("stage.processingFallback");
  const queued = job.status === "queued";

  return (
    <div className="panel waitroom">
      <div className="wait-top">
        <div
          className={`mascot ${tone === "roast" ? "m-clown" : tone === "comfort" ? "m-comfort" : "m-gilt"}`}
          aria-hidden="true"
        >
          {tone === "roast" ? "🤡" : tone === "comfort" ? "🌈" : "💰"}
        </div>
        <div className="wait-head">
          <span className="invest-kicker">
            {tone === "roast" ? t("stage.waitKickerRoast") : tone === "comfort" ? t("stage.waitKickerComfort") : t("stage.waitKickerSerious")}
          </span>
          <div className="progress-head">
            <span className="progress-stage">{queued ? t("stage.queued") : label}</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("stage.progressAriaLabel")}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <LiveBuild job={job} />

      {tone ? <Quiz tone={tone} /> : null}

      <p className="progress-caption">{t("stage.caption")}</p>
    </div>
  );
}
