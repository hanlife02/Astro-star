export interface FriendLinkItem {
  name: string;
  description: string;
  href: string;
  avatarSrc: string;
}

export interface LostLinkItem {
  name: string;
  description: string;
  href: string;
}

export interface LinksPageConfig {
  title: string;
  intro: string;
  friendsTitle: string;
  lostTitle: string;
  applyTitle: string;
  applyOwner: {
    name: string;
    description: string;
    href: string;
    avatarSrc: string;
  };
  applyRules: readonly string[];
}

export const linksPage = {
  title: "Links",
  intro: "The order is random~",
  friendsTitle: "Friends",
  lostTitle: "Lost",
  applyTitle: "Apply",
  applyOwner: {
    name: "Ethan",
    description: "Don't stay awake for too long.",
    href: "https://hanlife02.com",
    avatarSrc: "https://hanlife02.com/avatar.svg",
  },
  applyRules: [
    "Before applying, make sure your site already lists my link. If your application is approved and you later remove my link, I will remove yours and add your site to a blacklist.",
    "If your site is unreachable for a long time, I may remove your link. You can apply again after your site is back online.",
    "Your site must not contain political sensitivity, illegal content, or anything that violates applicable laws.",
    "No excessive advertising, no malware, and no malicious scripts.",
    "If you republish articles, you must cite the original source.",
    "Your site must enable HTTPS globally.",
    "You must use your own independent domain. Public subdomains or free domains are not accepted (e.g. github.io, vercel.app, eu.org, js.cool, .tk, .ml, .cf).",
    "Commercial sites and non-personal sites are not accepted.",
  ],
} satisfies LinksPageConfig;

export const friendLinks = [
  {
    name: "静かな森",
    description: "致虚极，守静笃。",
    href: "https://innei.in",
    avatarSrc:
      "https://avatars.githubusercontent.com/u/41265413?v=4",
  },
  {
    name: "lanhao.site",
    description: "Blog of LanHao",
    href: "https://site.lanhao.cc",
    avatarSrc:
      "https://img.lanhao.cc/file/AgACAgUAAxkDAAMIabYspSOWQMwSyhadQAwEEAABY0O0AAIjD2sb92ewVdFz-0Xsk40tAQADAgADeAADOgQ.jpg",
  },
  {
    name: "启动台LaunchPad",
    description: "代码改变世界",
    href: "https://launchpadx.top/",
    avatarSrc: "/figures/启动台LaunchPad.jpg",
  },
  {
    name: "Arthals",
    description: "所见高山远木，阔云流风；所幸岁月盈余，了无拘束。",
    href: "https://arthals.ink",
    avatarSrc: "/figures/Arthals.png",
  },
  {
    name: "EmptyBlue",
    description: "My compass is curiosity.",
    href: "https://lyt0112.com",
    avatarSrc: "/figures/EmptyBlue.jpg",
  },
  {
    name: "Guoweiyi",
    description: "愿薪火相传，美德不灭",
    href: "https://gwy.fun",
    avatarSrc: "/figures/Guoweiyi.jpg",
  },
  {
    name: "狱杰手书",
    description: "just a OTAKUS",
    href: "https://uegee.com",
    avatarSrc: "/figures/狱杰手书.jpg",
  },
  {
    name: "C+V",
    description: "万物可爱，你也不例外",
    href: "https://pku-cs-cjw.top",
    avatarSrc: "/figures/C-V.jpg",
  },
  {
    name: "Friendwho",
    description: "不想写描述的胡老师",
    href: "https://friendwho.space",
    avatarSrc: "/figures/Friendwho.jpg",
  },
  {
    name: "肖寒武",
    description: "我歌月徘徊，我舞影零乱",
    href: "https://www.xiaohanwu.com/",
    avatarSrc: "/figures/肖寒武.jpg",
  },
  {
    name: "Elykia' Blog",
    description: "致以无暇之人",
    href: "https://blog.elykia.cn",
    avatarSrc: "/figures/Elykia-Blog.gif",
  },
  {
    name: "YangTY's Blog",
    description: "越过山川",
    href: "https://blog.imyangty.com",
    avatarSrc: "/figures/YangTY-s-Blog.jpg",
  },
  {
    name: "Jing Xu's Site",
    description: "p大图&经双鼠鼠, 爱好中国哲学",
    href: "https://iculizhi.github.io",
    avatarSrc: "/figures/Jing-Xu-s-Site.jpg",
  },
  {
    name: "ZLA 小站",
    description: "不要哭，不要笑，不要恨，要理解。",
    href: "https://zla.pub",
    avatarSrc:
      "https://cdn.v2ex.com/gravatar/cba8b28739dd6225f6fe961762bdb0b71b858d68c83d946a37cee3b0e0daece5?size=512",
  },
  {
    name: "Hinai",
    description: "曇花一現",
    href: "https://blog.woo.moe",
    avatarSrc: "https://data.woo.moe/image/ico/104491469_0_r.png",
  },
  {
    name: "CWorld Site",
    description: "求知若愚，虚怀若谷",
    href: "https://cworld0.com/",
    avatarSrc: "/figures/CWorld-Site.webp",
  },
  {
    name: "Magma Ink",
    description: "为美好的生活献礼",
    href: "https://magma.ink/",
    avatarSrc: "/figures/Magma-Ink.jpg",
  },
  {
    name: "喵二の小博客",
    description: "缘，妙不可言",
    href: "https://www.miaoer.net/",
    avatarSrc: "/figures/喵二の小博客.webp",
  },
  {
    name: "Lynn",
    description: "幕天席地，纵意所如",
    href: "https://blog.lynn6.cn/",
    avatarSrc: "/figures/Lynn.jpg",
  },
  {
    name: "QQ",
    description: "一只图图",
    href: "https://www.chenquan-tutu.top",
    avatarSrc: "/figures/QQ.jpg",
  },
  {
    name: "Ariasakaの小窝",
    description: "人有悲欢离合 月有阴晴圆缺",
    href: "https://blog.yaria.top",
    avatarSrc: "/figures/Ariasakaの小窝.png",
  },
  {
    name: "哈喽！林墨白",
    description: "沉墨满纸，一笑若白",
    href: "https://blog.lmb.blue",
    avatarSrc: "/figures/哈喽-林墨白.png",
  },
  {
    name: "bbb-lsy07",
    description: "科技激荡人文，洞见智慧本真。",
    href: "https://blog.tsoo.net",
    avatarSrc: "/figures/bbb-lsy07.jpg",
  },
  {
    name: "Chlorine",
    description: "An Element-chan who writes",
    href: "https://chlo.is",
    avatarSrc: "/figures/Chlorine.webp",
  },
  {
    name: "Anfsity",
    description: "There is a reason",
    href: "https://www.anfstiy.me",
    avatarSrc: "/figures/Anfsity.png",
  },
  {
    name: "雨缄信笺",
    description: "倚楼听风雨，淡看江湖路",
    href: "https://rain-sealedletter.top",
    avatarSrc: "/figures/雨缄信笺.png",
  },
  {
    name: "LanM",
    description: "蓝莓",
    href: "https://bluelanm.github.io",
    avatarSrc: "https://bluelanm.github.io/my-website/img/3.ico",
  },
  {
    name: "虚无与信条",
    description: "知我者谓我心忧，不知我者谓我何求",
    href: "https://fomalhaut647.com/",
    avatarSrc: "https://fomalhaut647.com/avatar",
  },
] satisfies readonly FriendLinkItem[];

export const lostLinks = [
  {
    name: "LD",
    description: "万般皆磨炼，有志终逞愿。",
    href: "https://ldblog.icu",
  },
] satisfies readonly LostLinkItem[];
