"use client";

import { useState } from "react";
import type { Job, Tone } from "@/lib/types";
import { useTone } from "@/lib/tone";
import { useLang, type TFunc, type Lang } from "@/lib/i18n";

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
//
// 题库正文体量很大（三种语气 × 逐题逐选项，上百条短句），塞进扁平的 i18n 词典会让
// DictKey 联合类型爆炸且难以维护，所以延续 lib/showcase-data.ts 的做法——内容按语言
// 整份分叉存放在这里，用同一个 Lang 类型选择，而不是每条短句都开一个 key。
// 短小、可复用的微文案（旁白开场白、命中/未命中前缀、"换一题"按钮等）仍然走 lib/i18n.ts
// 的 stage.quizNarr*/quiz.* 键，和其余界面外壳保持一致。
type QA = { q: string; correct: number; opts: { t: string; r: string }[] };

const QUIZ_ZH: Record<Tone, QA[]> = {
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

const QUIZ_EN: Record<Tone, QA[]> = {
  roast: [
    { q: "Real talk — where'd the idea for this actually come from?", correct: 0, opts: [
      { t: "Late-night emo brainstorm", r: "🎯 Owning the impulse — at least it's honest. Points for that." },
      { t: "Jealous of someone else's funding round", r: "Green with envy, and the copy's worse than the original." },
      { t: "Rode a trending repo", r: "Opportunistic borrowing — and you grabbed a sickly one." },
      { t: "It's a homage, not a copy", r: "A homage so faithful it kept the original's bugs." }]},
    { q: "How many times does \"disruptive\" or \"revolutionary\" show up in your README?", correct: 0, opts: [
      { t: "Zero — I'd feel too guilty", r: "🎯 Guilt is clarity. Beats bragging any day." },
      { t: "1–3, kept it restrained", r: "Restrained, sure, but the product doesn't earn even those three." },
      { t: "4–9, straight-up marketing copy", r: "You'd have a brighter future writing clickbait headlines." },
      { t: "It's in every sentence", r: "King of the pitch deck. Where's the actual product?" }]},
    { q: "What's the biggest difference between you and the competition?", correct: 2, opts: [
      { t: "Recolored the UI", r: "Confirmed: reskin goblin." },
      { t: "Bolted on an AI button", r: "It's 2026 and \"bolt on an AI button\" is still the whole strategy?" },
      { t: "Honestly? Not much", r: "🎯 Takes guts to admit there's no difference. Respect." },
      { t: "We just care more", r: "Passion isn't a moat." }]},
    { q: "How long has your project actually been live?", correct: 1, opts: [
      { t: "Not yet — still polishing", r: "Polishing so long the trend already died." },
      { t: "It's live, basically nobody uses it", r: "🎯 Staring down grim numbers head-on — that deserves a toast." },
      { t: "A few friends use it", r: "Mercy users. Pull the favor and it's zero overnight." },
      { t: "Great numbers (that I inflated myself)", r: "Fabricated growth is the least durable kind." }]},
    { q: "Slap a label on your codebase:", correct: 0, opts: [
      { t: "Frankenstein's monster / a hill of tech debt", r: "🎯 Self-aware — even a hill of tech debt can be saved." },
      { t: "It runs, that's enough", r: "It runs, until the first load test knocks it flat." },
      { t: "I actually think it's elegant", r: "You're the only person on Earth who thinks so." },
      { t: "Trade secret", r: "Secret my foot — you just don't want anyone to see the mess." }]},
    { q: "An investor asks about your moat. You say?", correct: 3, opts: [
      { t: "Change the subject", r: "They're already deleting your contact." },
      { t: "\"We just understand users better\"", r: "You don't even understand yourself." },
      { t: "Whip out an architecture diagram to dazzle them", r: "Slick on paper, falls apart the moment it runs." },
      { t: "Honestly? Don't have one yet", r: "🎯 Heartbreakingly honest. Respect." }]},
    { q: "Someone says \"didn't [X] already do this?\" You respond:", correct: 3, opts: [
      { t: "They did it badly", r: "You did it worse. Call it even." },
      { t: "We're targeting a niche", r: "Niche enough that you're the only user left in it." },
      { t: "The timing's different", r: "They're eating steak, you're sipping the broth." },
      { t: "Fair point, let me think about that", r: "🎯 Willing to reflect — still salvageable." }]},
    { q: "Which question from users terrifies you most?", correct: 0, opts: [
      { t: "\"How's this different from [X]?\"", r: "🎯 Correctly terrified — that's exactly your weak spot." },
      { t: "\"How much does it cost?\"", r: "Charge money? You wouldn't dare." },
      { t: "\"Is this safe?\"", r: "...let's not dig into that one." },
      { t: "\"How long will you guys even last?\"", r: "Ouch. Straight for the heart." }]},
    { q: "What's driving your growth?", correct: 2, opts: [
      { t: "Chart manipulation / mutual clicking", r: "Fake prosperity — pops the second you poke it." },
      { t: "Friends sharing it around", r: "Friends use it once and leave." },
      { t: "Honestly, there is no growth yet", r: "🎯 Admitting the stall is step one of a comeback." },
      { t: "Word-of-mouth exploded (in my imagination)", r: "Exploded in your imagination, dead silent in reality." }]},
    { q: "What's your project's real core competitive edge?", correct: 3, opts: [
      { t: "First-mover advantage", r: "The grass on that first-mover's grave is two meters tall." },
      { t: "Technical superiority", r: "Open source it and the competition catches up in two weeks." },
      { t: "An all-star team", r: "An all-star team building this is even more embarrassing." },
      { t: "...still looking for it", r: "🎯 At least you're looking. Beats faking it." }]},
    { q: "What if the funding doesn't come through tomorrow?", correct: 1, opts: [
      { t: "Hang in there, it'll happen", r: "Belief doesn't pay the cash-flow bill." },
      { t: "Honestly? It might just die", r: "🎯 Facing reality is the first move in any comeback." },
      { t: "Pivot to a whole new space", r: "Serial-founder-in-training." },
      { t: "That won't happen (ostrich mode)", r: "Head in the sand, rear end still exposed." }]},
    { q: "What do you think this roast is about to give you?", correct: 0, opts: [
      { t: "A gut punch, but a useful one", r: "🎯 Tough and clear-eyed — teachable material." },
      { t: "Nothing but bias", r: "The evidence is right there. Some bias." },
      { t: "Whatever, I don't believe any of it", r: "Not believing it won't save you from the duplication score." },
      { t: "Compliments (dream on)", r: "This is the Big Top, not the Cheer Squad." }]},
  ],
  serious: [
    { q: "If your project were a stock, what rating would the analysts give it?", correct: 0, opts: [
      { t: "Strong sell", r: "📈 Rare honesty — the committee is noting this in your favor." },
      { t: "Underweight, watch and wait", r: "Watch and wait, all the way to delisting." },
      { t: "Hold (for pride's sake)", r: "What you're holding is stubbornness, not value." },
      { t: "Time to IPO", r: "Prove you survive the next round first." }]},
    { q: "During due diligence, which question do you dread most?", correct: 0, opts: [
      { t: "\"Are you actually profitable?\"", r: "📈 Facing the profitability question head-on. Professional." },
      { t: "\"What's your retention?\"", r: "Below industry average — don't even bring up growth." },
      { t: "\"Where's the barrier to entry?\"", r: "Something that can be cloned in two weeks?" },
      { t: "\"Why should it be you?\"", r: "Can't answer that, and the valuation gets cut in half on the spot." }]},
    { q: "What's the logic behind your valuation?", correct: 3, opts: [
      { t: "Benchmark against a unicorn, times 0.1", r: "Even times 0.1 is generous." },
      { t: "Whatever number's in the deck", r: "A pitch deck is art, not a balance sheet." },
      { t: "Gut feeling", r: "Your valuation is worth exactly what your gut is worth." },
      { t: "Honestly? Can't quite work it out", r: "📈 Admitting the uncertainty actually makes you more credible." }]},
    { q: "How much runway do you have left?", correct: 1, opts: [
      { t: "18 months (padded)", r: "Padded months get a 70% haircut." },
      { t: "Honestly? 6 months, and it's tight", r: "📈 A clear-eyed number. Now we can actually talk." },
      { t: "Next month's payroll depends on this raise", r: "That's not a startup, that's a bet at the table." },
      { t: "We don't track that — we track the vision", r: "Vision doesn't clear payroll." }]},
    { q: "List the ingredients in your moat:", correct: 3, opts: [
      { t: "First-mover advantage", r: "The grass on that grave is two meters tall." },
      { t: "Network effects (hand-drawn, on a whiteboard)", r: "A drawn effect scatters the moment the wind blows." },
      { t: "Technical barriers", r: "Open source it, matched in two weeks." },
      { t: "Honestly? Still pretty thin", r: "📈 Only by admitting it's thin can you actually build it up." }]},
    { q: "After the pitch, the investor says \"let's stay in touch.\" That means:", correct: 1, opts: [
      { t: "There's still a chance", r: "Naive. That's the politest form of rejection there is." },
      { t: "A polite no — I get it", r: "📈 Reading the subtext correctly. Mature." },
      { t: "Let me think it over", r: "Think it over until you're out of runway." },
      { t: "Go home and wait to hear back", r: "The word \"back\" is doing a lot of waiting." }]},
    { q: "What's the one lesson you most need to learn?", correct: 0, opts: [
      { t: "Figure out who's actually paying", r: "📈 Grasping the fundamentals. Points earned." },
      { t: "Raise more money", r: "Money doesn't fix the root problem." },
      { t: "Hire more people", r: "Headcount isn't the same as getting things done." },
      { t: "Shoot another promo video", r: "A promo video won't save your retention." }]},
    { q: "Your competitor has more money and more people. You:", correct: 2, opts: [
      { t: "Go head-to-head", r: "An egg against a rock." },
      { t: "Latch onto a bigger player", r: "Latch on hard enough and you get absorbed." },
      { t: "Find the niche they can't be bothered with", r: "📈 Horse-racing strategy — clever." },
      { t: "Raise more to match their burn", r: "A cash-burning war has no winners." }]},
  ],
  comfort: [
    { q: "Looking at everything so far, how do you feel about yourself?", correct: 0, opts: [
      { t: "I've worked really hard, I deserve a hug", r: "💖 Yes! Hug yourself first — you truly are amazing." },
      { t: "Still so far to go, I'm anxious", r: "🌈 No rush — you're already stronger than yesterday's you." },
      { t: "I want to give up again", r: "🌈 It's okay to rest — I'll be here when you come back." },
      { t: "I don't even know if it matters", r: "💖 The fact that you were willing to start already means everything." }]},
    { q: "Nobody's using your project yet. Do you:", correct: 1, opts: [
      { t: "Doubt yourself", r: "🌈 Don't doubt — you just haven't been seen yet." },
      { t: "Keep going, because I love it", r: "💖 That's the spirit! Love alone is unstoppable." },
      { t: "Have a quiet little emo moment", r: "🌈 Once you're done, come back — the treasure's waiting." },
      { t: "Delete the repo and vanish", r: "💖 Don't delete it! It's proof of how hard you tried." }]},
    { q: "Someone says \"you're just reinventing the wheel.\" You:", correct: 2, opts: [
      { t: "Feel really hurt", r: "🌈 They just don't get it — your wheel has your warmth in it." },
      { t: "Start doubting yourself", r: "💖 Every great thing has been told \"someone already did this.\"" },
      { t: "So what if it's a wheel, I'm having fun building it", r: "💖 That's exactly right! Joy plus growth beats everything else." },
      { t: "Want to argue back but don't feel sure enough", r: "🌈 You don't have to prove anything to anyone — you're already on the road." }]},
    { q: "Right now, which words do you most want to hear?", correct: 0, opts: [
      { t: "You're already doing great", r: "💖 You. Are. Already. Doing. Great. Really." },
      { t: "Just hang on a little longer", r: "🌈 Hang on a little longer, and remember to be gentle with yourself too." },
      { t: "It's okay, take your time", r: "💖 It's okay. Take your time. There's still time for everything." },
      { t: "I believe in you", r: "🌈 I. Believe. In you. No conditions attached." }]},
    { q: "What score would you give yourself right now?", correct: 3, opts: [
      { t: "A 60, just passing", r: "💖 At least a 90! You're way too hard on yourself." },
      { t: "I'm scared to score it, might make me sad", r: "🌈 Then let me score it for you — full marks, because you're still here, still trying." },
      { t: "Zero, I've given up", r: "💖 Even giving up scores 100 — you're just tired, not incapable." },
      { t: "Full marks! I'm proud of myself", r: "🌈 Now that's the spirit! So proud of you!!" }]},
  ],
};

const QUIZ: Record<Lang, Record<Tone, QA[]>> = { zh: QUIZ_ZH, en: QUIZ_EN };

function narrFor(tone: Tone, t: TFunc): string {
  if (tone === "roast") return t("stage.quizNarrRoast");
  if (tone === "comfort") return t("stage.quizNarrComfort");
  return t("stage.quizNarrSerious");
}

function Quiz({ tone }: { tone: Tone }) {
  const { t, lang } = useLang();
  const bank = QUIZ[lang][tone];
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
      <div className="quiz-narr">{narrFor(tone, t)}</div>
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
              ? tone === "roast" ? t("quiz.hitRoast") : tone === "comfort" ? t("quiz.hitComfort") : t("quiz.hitSerious")
              : tone === "roast" ? t("quiz.missRoast") : tone === "comfort" ? t("quiz.missComfort") : t("quiz.missSerious")}
            {q.opts[picked].r}
          </span>
          <button type="button" className="quiz-next" onClick={next}>{t("quiz.next")}</button>
        </div>
      ) : null}
      <div className="quiz-count">
        {t("quiz.count", { count, right })}
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
