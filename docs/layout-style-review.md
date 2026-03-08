# 布局与样式设计评审

> 评审时间：2026-03-08  
> 评审范围：当前项目与布局、页面结构、样式组织、交互脚本相关的实现

## 1. 评审范围

本次主要阅读了以下文件：

- `src/layouts/BaseLayout.astro`
- `src/layouts/HomeLayout.astro`
- `src/components/layout/HomeShellFrame.astro`
- `src/components/layout/HomeShellBackground.astro`
- `src/components/layout/HomeShellScripts.astro`
- `src/components/home/HomePageContent.astro`
- `src/components/content/ArticleDetailPage.astro`
- `src/components/content/SectionListingPage.astro`
- `src/components/content/SectionArchivePage.astro`
- `src/pages/about.astro`
- `src/pages/links.astro`
- `src/pages/[section].astro`
- `src/pages/[section]/[slug].astro`
- `src/style/layouts/home-layout.css`
- `src/style/pages/content-page.css`
- `src/style/components/content/section-listing-page.css`
- `src/style/components/content/section-archive-page.css`
- `src/style/components/content/app-panel-card.css`
- `src/style/components/home/profile.css`
- `src/style/components/home/latest-articles.css`
- `src/style/components/home/home-page-content.css`

## 2. Astro 官方最佳实践摘要

在动手整理本项目之前，先参考了 Astro 官方文档中与布局、插槽和样式相关的建议。这里仅保留和当前项目最相关的结论：

### 2.1 Layout 应以插槽为核心

Astro 官方推荐使用 `slot` 作为布局包裹页面内容的基础能力。也就是说：

- Layout 负责页面公共骨架
- 页面内容通过 `slot` 注入
- 不应该让 Layout 直接耦合具体业务内容

这点当前项目整体方向是对的，`BaseLayout -> HomeLayout -> HomeShellFrame` 的分层已经具备这个基础。

### 2.2 样式默认应优先使用组件级作用域

Astro 官方明确更推荐 scoped styles，只有在确实必要时才使用全局样式。对应到当前项目，意味着：

- 全局 CSS 应尽量只放 reset、设计 token、排版基线
- 组件样式应尽量跟随组件收敛
- 页面级样式只应处理页面级差异，而不应承载太多跨组件逻辑

### 2.3 全局样式要尽量少、职责清晰

官方文档对 global styles 的态度很明确：能 scoped 就不要 global。对于当前项目来说，最理想的做法是：

- 把字体、CSS variables、reset 单独拆成基础层
- 把壳层布局样式独立为 layout 层
- 把文章页、列表页、目录抽屉等差异逻辑放到单独样式文件中

### 2.4 父组件样式影响子组件时要谨慎

Astro 文档特别提醒：父组件样式如果依赖特定结构去影响子组件，后续会越来越难排查。当前项目中已有类似趋势，例如：

- 页面样式依赖壳层类名
- 内容页样式依赖布局态 class
- 脚本依赖大量全局类名和 DOM 查询

这一点是后续最需要控制的风险。

## 2.5 当前已完成的重构进展

以下内容已经按“小步快跑”的方式完成，并经过页面复核：

### 已完成项

- 新增评审文档：`docs/layout-style-review.md`
- 修正布局变量中的错误 `clamp()` 配置
- 抽离基础 token 层到 `src/style/base/tokens.css`
- 将全局基础规则从 `home-layout.css` 移到基础层
- 让 `HomeLayout` 支持显式 `variant` / `background` 参数
- 让 `HomeShellBackground` 支持显式背景类型
- 将 `/about` 改为显式声明 `background="code-rain"`
- 将 `/links` 改为显式声明 `background="constellation"`
- 将文章详情页改为显式声明 `variant="article"`
- 将 archive 页面改为显式声明 `variant="default"`
- 将 listing 页面改为显式声明 `variant="default"`
- 新增 `src/utils/toc.ts`，统一 TOC 提取逻辑
- 将 `/about` 的 TOC 提取逻辑改为复用公共工具
- 将 `/links` 的 TOC 提取逻辑改为复用公共工具
- 将文章详情页的 TOC 提取逻辑改为复用公共工具
- 新增 `ContentShell.astro`，统一内容页基础骨架
- 新增 `TocPanel.astro`，统一 TOC 面板渲染
- 新增 `DocumentPageShell.astro`，统一文档型页面模板
- 新增 `CollectionPageShell.astro`，统一列表/归档页面模板
- 新增 `src/scripts/home-shell-theme.ts`，抽离主题切换脚本
- 新增 `src/scripts/home-shell-mobile-nav.ts`，抽离移动端导航脚本
- 新增 `src/scripts/home-shell-mobile-toc.ts`，抽离移动端 TOC 抽屉脚本
- 新增 `src/scripts/home-shell-desktop-signature-nav.ts`，抽离桌面签名导航脚本
- 新增 `src/scripts/home-shell-content-toc.ts`，抽离内容 TOC 同步逻辑
- 新增 `src/scripts/home-shell-content-page-entrance.ts`，抽离内容页入场动画逻辑
- `HomeShellScripts.astro` 已收敛为脚本装配层
- 新增 `src/style/components/content/toc-panel.css`，抽离 TOC 面板与移动 TOC 抽屉样式

### 本轮过程中修复的问题

在抽离基础样式的过程中，曾出现文章页和 archive 页滚动异常。最终已经通过以下方式修复：

- 取消文章变体的整屏锁高
- 取消文章正文容器的内层强制滚动
- 恢复文章页、archive 页、列表页的自然页面滚动

### 当前状态

截至目前，项目已经完成了第一阶段里最稳妥的一部分：

- 基础样式层开始从布局样式中分离
- 布局开始从“路径推断”过渡到“页面显式声明”
- 关键滚动回归问题已修复
- about、links、文章页三处重复 TOC 逻辑已完成第一轮收敛
- 文章详情页已不再依赖路径深度推断自身布局类型
- archive 与 listing 页面也已开始显式声明布局变体
- about / links / article / archive / listing 已完成多层页面壳收敛
- `HomeShellScripts.astro` 已完成 theme / nav / toc / entrance 模块化拆分
- 当前布局脚本结构已从“大内联脚本”收敛为“模块 + 装配层”

但以下事项仍然**尚未开始或尚未完成**：

- `content-page.css` 继续拆分（已完成 TOC 面板首轮拆分）
- 统一断点与命名域
- 继续降低脚本对全局类名与 DOM 结构的耦合
- 清理无效或噪音布局变量
- 评估搜索入口是否保留或降级

## 3. 当前实现的优点

先说好的部分。

### 3.1 内容与展示有基本分离

当前项目并没有把文章正文直接硬编码在布局组件中，而是通过页面加载 MD/MDX 内容，再放入布局。这一点符合“内容驱动”和“内容与展示分离”的目标。

### 3.2 布局层次比较清楚

当前结构大致是：

- `BaseLayout`：HTML 文档骨架、head、body、背景插槽
- `HomeLayout`：统一接入背景、壳层、脚本
- `HomeShellFrame`：真正的页面结构容器

这是一个不错的基础，说明项目已经有“布局壳”和“业务内容”分层的意识。

### 3.3 已考虑移动端和桌面端差异

当前样式确实包含了：

- 移动端汉堡导航
- 桌面端侧边导航
- 移动端 TOC 抽屉
- 桌面端 sticky TOC

说明设计时已经考虑了多端适配，而不是只做桌面端。

## 4. 当前存在的主要问题

下面按优先级说明问题。

### 4.1 样式职责混杂，文件过重

这是当前最明显的问题。

#### `src/style/layouts/home-layout.css`

这个文件当前同时承担了：

- 字体声明
- 全局变量
- reset / html / body 基础样式
- header 样式
- main 三栏布局
- footer 样式
- 移动导航抽屉
- 深色模式分支
- 悬浮按钮定位

这会导致 Layout 层样式不再只是“布局层”，而是几乎变成了整个站点的总入口样式文件。

#### `src/style/pages/content-page.css`

这个文件当前同时处理：

- 通用正文排版
- 目录 TOC
- 文章详情头部
- 列表页样式
- Links 页样式
- 卡片列表样式
- 移动端 TOC 浮层
- 内容页入场动画配套状态

这会直接造成两个后果：

1. 修改内容页某一块样式时，很容易误伤其它页面
2. 页面层样式和组件层样式边界不清晰

### 4.2 路由结构反向控制布局，耦合偏高

当前有两处典型问题：

#### `HomeLayout` 通过 URL 深度推断页面类型

当前 `HomeLayout` 通过 `pathname` 和分段长度来推断 `shellVariant`。这意味着：

- 页面是不是文章页，不是页面自己声明的
- 而是路由层级“猜出来的”

这会让布局逻辑依赖 URL 结构，属于比较脆弱的耦合方式。

#### `HomeShellBackground` 通过 pathname 决定背景

当前背景也是靠路径判断：

- `/about` 用代码雨
- `/links` 用星空
- 其它用主页背景

这会导致“视觉选择权”不在页面本身，而在一个路径匹配组件中。后续如果：

- 改路由
- 增加语言前缀
- 做主题切换
- 新增页面类型

这个设计会迅速变难维护。

### 4.3 页面骨架重复，复用还不够彻底

当前 `about`、`links`、文章详情页都在重复类似结构：

- `HomeLayout`
- `Signature`
- 中间正文区
- 右侧 TOC
- `FooterMeta`

这说明虽然用了统一外壳，但“文档内容页”的抽象层还没有真正建立。

如果后续需要统一：

- TOC 标题
- TOC 空状态
- 文章页/普通文档页的 spacing
- 内容区动画

你会发现改动点非常分散。

### 4.4 TOC 逻辑重复，工具函数没有抽离

当前 `slugifyHeading` / `extractTocHeadings` 在多个页面和文章页里重复出现。

这类逻辑本质上已经是稳定的通用工具，继续散落在页面里会带来：

- 重复维护
- 修 bug 要改多个文件
- 行为不一致风险

### 4.5 交互脚本过于集中，且全局查询过多

`HomeShellScripts.astro` 目前承担了太多职责：

- 主题切换
- 桌面签名导航开合
- 移动端导航抽屉
- 移动端 TOC 抽屉
- 内容页 TOC 激活同步
- 内容页入场动画
- Astro 页面切换后二次初始化

而且实现方式大量依赖：

- `document.querySelector()`
- `window` 全局状态
- class 切换
- dataset 状态同步

问题不是它“不能用”，而是它后续会非常难拆，非常难测，也非常容易因为 DOM 结构微调而失效。

### 4.6 滚动模型复杂，用户体验风险偏高

当前桌面端文章布局大量使用：

- `100dvh`
- `overflow: hidden`
- 内层滚动容器
- sticky header + sticky toc

这种设计虽然视觉上容易做出“控制台面板感”，但会带来一系列问题：

- 浏览器原生滚动行为不自然
- 锚点跳转和目录高亮更复杂
- 浏览器查找、阅读模式、返回滚动位置可能异常
- 触摸板和鼠标滚轮的行为体验不稳定

对博客这类长内容站点来说，这种滚动模型通常不是最稳妥的方案。

### 4.7 断点体系不统一，维护成本高

当前项目同时出现了这些断点：

- `40rem`
- `48rem`
- `56.25rem`
- `72rem`
- `150rem`
- `200rem`

断点并不是越多越专业。当前的问题是：

- 缺少统一断点定义
- 文件间各自决定断点
- 无法快速建立整体响应式心智模型

后期维护会越来越依赖“试出来”，而不是“设计出来”。

### 4.8 存在具体样式错误与噪音变量

这里有一个明确的具体错误：

- `src/style/layouts/home-layout.css` 中 `--header-main-gap: clamp(2.75rem, 1.4vw, 1.25rem)`

`clamp(min, preferred, max)` 的上下限顺序应保持合理，这里最小值和最大值明显写反了。

此外还存在一些疑似噪音变量或可疑 token，例如：

- `--layout-max-ratio`
- `--main-mobile-h`
- `--main-desktop-h`

如果变量已经不再驱动布局，建议清理掉，否则会增加阅读成本。

### 4.9 类名命名域偏泛，未来容易冲突

例如：

- `.listing-*`
- `.archive-*`
- `.app-panel-*`

在项目还小时没问题，但只要页面和组件增多，这种命名很容易冲突，尤其是在你已经存在较多全局样式文件的前提下。

### 4.10 有“占位 UI”但未完成行为

当前 header 中已有搜索按钮入口，但尚未看到对应搜索逻辑接入。

这种情况的问题是：

- 视觉上像一个正式功能
- 但用户点击后没有完整体验

如果短期内不会做，建议先隐藏或降级为非主要入口。

## 5. 问题背后的根因

如果把这些问题再往下归纳，根因主要有 4 个：

### 5.1 Layout、Page、Component 三层职责边界还不够稳

当前三层虽然存在，但样式与脚本没有完全跟着这三层收敛，导致跨层引用较多。

### 5.2 页面类型抽象还不够明确

例如“首页”“文档页”“文章页”“列表页”“归档页”这些类型，当前没有彻底形成稳定抽象，因此很多规则只能写在通用 CSS 里硬分支。

### 5.3 视觉效果优先于长期可维护性

例如：

- 整屏高度控制
- 多层 sticky
- 内层滚动容器
- 大量动画和状态切换

这些设计短期能快速形成鲜明风格，但后续维护代价很高。

### 5.4 缺少基础设施层

当前还缺少几个应该尽快补上的基础层：

- 统一 design tokens 层
- 统一断点定义层
- 通用 TOC 工具层
- 通用内容页壳层
- 更细分的交互脚本模块层

## 6. 建议的重构方向

这里不追求一次性大改，而是强调“小步快跑、每次只动少量文件”。

### 6.1 第一优先级：拆基础层与去路径耦合

#### 建议 1：拆出基础样式层

建议新建：

- `src/style/base/tokens.css`
- `src/style/base/reset.css`

把以下内容从 `home-layout.css` 挪出去：

- `@font-face`
- `:root` 设计 token
- `html / body / *` 基础规则

这样 `home-layout.css` 才能真正只负责“布局壳”。

#### 建议 2：让 Layout 接收显式变体

不要让 `HomeLayout` 再通过路径推断页面类型。建议改成：

- 页面显式传 `variant="default" | "article" | "doc"`
- 页面显式传 `background="home" | "code-rain" | "constellation"`

这样更符合“内容与展示分离”原则，也更利于未来主题迁移。

### 6.2 第二优先级：抽出通用内容页壳

建议新增一个内容页通用布局组件，例如：

- `src/components/layout/ContentShell.astro`

负责统一处理：

- `Signature`
- 正文区域容器
- TOC 容器
- Footer 区

这样可以把：

- `about`
- `links`
- 文章详情页

统一到同一套壳结构中。

### 6.3 第三优先级：抽出 TOC 工具函数

建议新增：

- `src/utils/toc.ts`

统一提供：

- `slugifyHeading()`
- `extractTocHeadings()`

这样可以消除页面中的重复逻辑，并确保行为一致。

### 6.4 第四优先级：拆分 `content-page.css`

建议把当前内容拆成：

- `content-page.css`：通用正文排版、通用 TOC 基础样式
- `article-page.css`：文章头部、元信息、阅读相关样式
- `listing-page.css`：列表页、卡片页样式
- `toc-drawer.css`：移动端 TOC 抽屉

这样每个文件才有明确职责。

### 6.5 第五优先级：简化滚动系统

建议逐步把文章页改回：

- 页面自然滚动
- 右侧 TOC sticky
- 尽量避免正文内层滚动

博客内容站通常更适合这种模型，也更稳定。

### 6.6 第六优先级：重构脚本模块

建议把 `HomeShellScripts.astro` 至少拆成以下逻辑块：

- theme
- nav
- toc
- entrance

如果后续继续做交互增强，可以再进一步变成独立模块文件，而不是一个超大内联脚本。

### 6.7 第七优先级：统一断点和命名体系

建议统一断点档位，例如只保留：

- `sm`
- `md`
- `lg`

并把类名进一步命名域化，例如：

- `.section-listing-*`
- `.section-archive-*`
- `.content-toc-*`
- `.home-shell-*`

避免后面样式冲突。

## 7. 推荐执行顺序

为了符合当前项目“小步快跑”的开发要求，建议按下面顺序来：

### 第一轮

- 拆 `tokens.css` / `reset.css`
- 修正明显错误的 `clamp()`
- 给 `HomeLayout` 增加显式 `variant` / `background` props

### 第二轮

- 提取 `ContentShell.astro`
- 提取 `src/utils/toc.ts`
- 消除 `about` / `links` / 文章页中的重复结构和重复函数

### 第三轮

- 拆 `content-page.css`
- 收敛文章页、列表页、TOC 抽屉样式职责

### 第四轮

- 重构 `HomeShellScripts.astro`
- 统一断点
- 清理噪音变量
- 统一命名域

## 8. 优先级清单

### P1：必须尽快改

- 样式职责混杂
- 路径驱动布局变体
- 路径驱动背景选择
- `clamp()` 明显错误

### P2：强烈建议尽快改

- 重复内容页骨架
- 重复 TOC 工具函数
- 超大交互脚本

### P3：可在后续迭代改

- 统一断点体系
- 命名域收敛
- 搜索入口是否保留
- 视觉细节与动效策略优化

## 9. 最终结论

当前项目的布局设计**不是方向错了**，而是已经从“可工作”进入到“需要整理架构”的阶段。

它的主要问题不是功能缺失，而是：

- 样式层次开始变重
- 布局和路由开始相互耦合
- 页面结构重复逐渐增多
- 交互状态管理越来越集中在一个脚本里

如果现在不收敛，后面每新增一个页面或视觉变体，维护成本都会明显变高。

所以后续修改建议遵循一个核心原则：

> 让页面显式声明自己需要什么布局与背景，让组件只负责结构与展示，让样式文件只负责自己那一层的事情。

这会让整个 Astro 博客更可定制、更可迁移，也更符合你最初设定的架构目标。



