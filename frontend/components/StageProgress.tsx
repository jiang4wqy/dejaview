"use client";

import { useState } from "react";
import type { Job, Tone } from "@/lib/types";
import { useTone } from "@/lib/tone";

const STAGE_LABELS: Record<string, string> = {
  site_analysis: "分析网站", github_analysis: "分析仓库", fingerprint: "合成项目指纹",
  search: "搜索相似项目", verify: "验证候选", judge: "重复度裁判",
  factlayer: "汇总事实层", render: "生成报告", done: "完成",
};
const STAGE_ORDER = [
  "site_analysis", "github_analysis", "fingerprint", "search",
  "verify", "judge", "factlayer", "render", "done",
];

type QA = { q: string; opts: { t: string; r: string }[] };

// 打发等待的"过堂问答"——毒舌粗暴、镀金势利；只嘲项目/创业话术，不涉及个人。
const QUIZ: Record<Tone, QA[]> = {
  roast: [
    { q: "讲真，你这项目的灵感哪来的？", opts: [
      { t: "深夜 emo 一拍脑门", r: "拍脑门拍出来的，难怪一按就碎。" },
      { t: "看别人融资眼红", r: "红着眼抄，抄得还没人家好。" },
      { t: "GitHub Trending 顺来的", r: "顺手牵羊，牵的还是只病羊。" },
      { t: "我这叫致敬，不叫抄", r: "致敬到连 bug 都一模一样。" }]},
    { q: "你 README 里「革命性/颠覆」出现了几次？", opts: [
      { t: "0 次，我心虚", r: "心虚是对的，至少有自知之明。" },
      { t: "1–3 次，克制", r: "克制个啥，产品配不上这三次。" },
      { t: "4–9 次，营销号", r: "建议改行写标题党，更有前途。" },
      { t: "全文都是", r: "PPT 创业之王，实物呢？" }]},
    { q: "投资人问你护城河，你会？", opts: [
      { t: "顾左右而言他", r: "言他半天，他已经在删你微信。" },
      { t: "「我们更懂用户」", r: "你连自己都没搞懂。" },
      { t: "掏出一张架构图", r: "图很唬人，跑起来就露馅。" },
      { t: "直接聊愿景", r: "愿景很大，用户为零。" }]},
    { q: "你和竞品最大的区别是？", opts: [
      { t: "UI 换了个色", r: "换皮怪，石锤了。" },
      { t: "多了个 AI 按钮", r: "2026 了还在「加个 AI」？" },
      { t: "……说不上来", r: "说不上来就别做了，真的。" },
      { t: "我们更有情怀", r: "情怀不能当护城河。" }]},
    { q: "给你的代码贴个标签：", opts: [
      { t: "缝合怪", r: "缝合得针脚都露在外面。" },
      { t: "屎山预备役", r: "预备个啥，已经是了。" },
      { t: "能跑就行", r: "跑是跑，一压测就躺。" },
      { t: "我觉得很优雅", r: "全世界只有你这么觉得。" }]},
    { q: "你的项目上线多久了？", opts: [
      { t: "还没上，在打磨", r: "磨到风口都过了。" },
      { t: "上了，没人用", r: "没人用还敢叫产品？叫作品吧。" },
      { t: "几个朋友在用", r: "情面用户，一撤全归零。" },
      { t: "数据很好（自己刷的）", r: "刷出来的繁荣最不经看。" }]},
    { q: "被问「这不是 XX 早做过了」，你：", opts: [
      { t: "他们做得不好", r: "你做得更不好，扯平了。" },
      { t: "我们切细分", r: "细分到只剩你一个用户。" },
      { t: "时机不一样", r: "人家吃肉，你喝汤。" },
      { t: "……（沉默）", r: "沉默是金，救不了项目。" }]},
  ],
  serious: [
    { q: "若你的项目是一支股票，分析师评级？", opts: [
      { t: "强烈卖出", r: "难得的诚实，委员会欣慰。" },
      { t: "减持观望", r: "观望到退市。" },
      { t: "持有（面子）", r: "持有的是执念，不是价值。" },
      { t: "该 IPO 了", r: "先证明你能活过下一轮。" }]},
    { q: "你的商业模式，一句话：", opts: [
      { t: "先做大再说", r: "做大靠烧钱，钱呢？" },
      { t: "羊毛出在猪身上", r: "猪在哪？只看到羊。" },
      { t: "靠爱发电", r: "爱是易耗品，电费不是。" },
      { t: "融资续命", r: "续到断奶那天怎么办？" }]},
    { q: "尽调时你最怕被问：", opts: [
      { t: "你们赚钱吗", r: "这题能筛掉九成 PPT。" },
      { t: "留存多少", r: "低于行业就别提增长。" },
      { t: "壁垒在哪", r: "别人两周能抄完的东西？" },
      { t: "为什么是你们", r: "答不上，估值直接对折。" }]},
    { q: "你的估值逻辑是？", opts: [
      { t: "对标独角兽 ×0.1", r: "乘 0.1 还是高估了。" },
      { t: "PPT 里写的数", r: "PPT 是艺术，不是财报。" },
      { t: "拍脑袋", r: "脑袋值几个钱，估值就几个钱。" },
      { t: "不懂，但很贵", r: "贵得毫无道理，也算本事。" }]},
    { q: "现金流跑道还剩多久？", opts: [
      { t: "18 个月（吹的）", r: "吹的月份，打三折。" },
      { t: "6 个月", r: "该焦虑了，别装淡定。" },
      { t: "下月工资靠融资", r: "这不叫创业，叫赌博。" },
      { t: "不看这个，看愿景", r: "愿景不发工资。" }]},
    { q: "你的护城河成分表？", opts: [
      { t: "先发优势", r: "先发的坟头草两米高了。" },
      { t: "网络效应（画的）", r: "画的效应，风一吹就散。" },
      { t: "技术壁垒", r: "开源两周就追平。" },
      { t: "品牌情怀", r: "情怀在财报上一文不值。" }]},
    { q: "路演后投资人说「保持联系」，意思是？", opts: [
      { t: "有戏", r: "天真，这是最高级的拒绝。" },
      { t: "礼貌拒绝", r: "你懂行，可惜项目不行。" },
      { t: "让我再想想", r: "想到你 out of runway。" },
      { t: "回去等消息", r: "消息永远在路上。" }]},
  ],
};

const NARR: Record<Tone, string> = {
  roast: "🤡 后台正在扒你的皮，先来道题醒醒神：",
  serious: "💰 分析师正在给你估值，顺便做份问卷：",
};

function Quiz({ tone }: { tone: Tone }) {
  const bank = QUIZ[tone];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const q = bank[idx % bank.length];

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    setCount((c) => c + 1);
  }
  function next() {
    setPicked(null);
    let n = idx;
    while (bank.length > 1 && n === idx) n = Math.floor(Math.random() * bank.length);
    setIdx(n);
  }

  return (
    <div className="quiz">
      <div className="quiz-narr">{NARR[tone]}</div>
      <div className="quiz-q">{q.q}</div>
      <div className="quiz-opts">
        {q.opts.map((o, i) => (
          <button key={i} type="button"
            className={`quiz-opt${picked === i ? " picked" : ""}${picked !== null && picked !== i ? " dim" : ""}`}
            onClick={() => pick(i)} disabled={picked !== null}>
            <span className="quiz-letter">{"ABCD"[i]}</span>
            <span>{o.t}</span>
          </button>
        ))}
      </div>
      {picked !== null ? (
        <div className="quiz-reaction">
          <span className="quiz-verdict">{tone === "roast" ? "🎯 " : "📊 "}{q.opts[picked].r}</span>
          <button type="button" className="quiz-next" onClick={next}>换一题 →</button>
        </div>
      ) : null}
      <div className="quiz-count">已过堂 {count} 题 · 纯属娱乐，不影响分析结论</div>
    </div>
  );
}

export default function StageProgress({ job }: { job: Job }) {
  const { tone } = useTone();
  const pct = Math.max(0, Math.min(100, Math.round((job.progress ?? 0) * 100)));
  const label = STAGE_LABELS[job.stage] ?? job.stage ?? "处理中";
  const queued = job.status === "queued";
  const currentIndex = STAGE_ORDER.indexOf(job.stage);

  return (
    <div className="panel waitroom">
      <div className="wait-top">
        <div className={`mascot ${tone === "roast" ? "m-clown" : "m-gilt"}`} aria-hidden="true">
          {tone === "roast" ? "🤡" : "💰"}
        </div>
        <div className="wait-head">
          <span className="invest-kicker">
            {tone === "roast" ? "// 后台正在开嘲…" : "// 委员会正在评估…"}
          </span>
          <div className="progress-head">
            <span className="progress-stage">{queued ? "排队中" : label}</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="分析进度">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <ol className="stagelist">
        {STAGE_ORDER.map((key, i) => {
          const state = currentIndex < 0 ? "" : i < currentIndex ? "done" : i === currentIndex ? "active" : "";
          return (
            <li key={key} className={`stage-item ${state}`}>
              <span className="stage-dot" aria-hidden="true" />
              <span className="stage-name">{STAGE_LABELS[key]}</span>
            </li>
          );
        })}
      </ol>

      {tone ? <Quiz tone={tone} /> : null}

      <p className="progress-caption">页面会自动刷新，先别关——马上出结果。</p>
    </div>
  );
}
