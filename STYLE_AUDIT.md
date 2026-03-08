# Style Audit

## 审查范围

用于持续记录本项目样式层面的结构性问题，优先关注：

- 是否符合主流博客/个人站的页面流设计
- 是否存在不必要的固定高度、裁切与滚动锁定
- 是否存在影响内容可见性和可维护性的视觉优先实现

## 状态标记

- `[ ]` 未处理
- `[~]` 处理中 / 已提交修复待复核
- `[x]` 已处理

---

## 第一轮：首页主布局壳层

### 1. 整页滚动被锁死

状态：`[x] 已处理（已复核）`

- `src/style/layouts/home-layout.css:72`
  - `html` 使用 `overflow: hidden`
- `src/style/layouts/home-layout.css:82`
  - `body` 也使用 `overflow: hidden`

问题：

- 切断浏览器原生纵向滚动
- 页面不再是主流博客常见的自然文档流
- 视口高度缩小时，内容无法向下延展，只能被压缩或裁切

### 2. 首页外层被做成固定视口壳

状态：`[x] 已处理（代码复核通过）`

- `src/style/layouts/home-layout.css:88`
  - `.home-shell` 使用 `height: 100dvh`
- `src/style/layouts/home-layout.css:96`
  - `.home-shell` 使用 `overflow: hidden`

问题：

- 更像仪表盘/控制台布局，而不是主流博客首页
- 浏览器高度变化时，header / main / footer 被强制塞进同一屏
- footer 容易出现“上顶”视觉问题

### 3. 主内容区依赖固定视口网格

状态：`[~] 已提交修复，待复核`

- `src/style/layouts/home-layout.css:94`
  - `grid-template-rows: auto minmax(0, 1fr) auto`

问题：

- 该写法本身没错，但和固定 `100dvh` 叠加后，会放大 header / footer 对主内容的挤压
- 当内容高度超过剩余空间时，页面无法自然增长

### 4. 三个主区域被强制固定高度

- `src/style/layouts/home-layout.css:425`
- `src/style/layouts/home-layout.css:440`
- `src/style/layouts/home-layout.css:450`
- `src/style/layouts/home-layout.css:571`
- `src/style/layouts/home-layout.css:579`

问题：

- `side-nav-area`、`profile-area`、`latest-area` 被固定高度或 `height: 100%`
- 这些区域依赖父容器高度，而不是由内容自然撑开
- 不符合内容驱动的页面流设计

### 5. 宽度约束绑定视口高度

状态：`[ ] 未处理`

- `src/style/layouts/home-layout.css:90`
  - `width: min(100%, var(--shell-max), calc(100dvh * var(--layout-max-ratio)))`

问题：

- 用视口高度推导页面宽度并不主流
- 横竖屏变化、开发者工具缩放时更容易出现奇怪比例

### 6. 整页滚动边界存在回弹感

状态：`[x] 已处理（已复核）`

- `src/style/layouts/home-layout.css`
  - `html` / `body` 已补充 `overscroll-behavior-y: none`

问题：

- 页面滚动到顶部或底部时，会出现继续拖动再弹回的边界回弹感
- 在当前项目目标里，这种交互不符合预期

---

## 第二轮：首页内容区内部

### 1. Profile 区继续依赖父容器高度

状态：`[~] 已提交修复，待复核`

- `src/style/components/home/profile.css:13`
  - `.profile-card` 使用 `height: 100%`

问题：

- 个人信息区不是自然高度，而是被迫填满父盒子
- 一旦父容器高度策略不合理，内部排版就会跟着异常

### 2. Profile 整体人为位移

状态：`[~] 已提交修复，待复核`

- `src/style/components/home/profile.css:22`
  - `transform: translate(...)`

问题：

- 视觉位置不由正常布局控制，而是靠偏移“摆放”
- 在不同视口高度下更容易造成上下区域压迫感

### 3. Latest 区继续被锁在固定高度体系里

状态：`[~] 已提交修复，待复核`

- `src/style/components/home/latest-articles.css:11`
  - `.latest-articles` 使用 `height: 100%`

问题：

- latest 列表不是内容驱动，而是高度驱动
- 内容增加时只能继续依赖父级裁切

### 4. Latest 面板直接裁切内容

状态：`[~] 已提交修复，待复核`

- `src/style/components/home/latest-articles.css:25`
  - `.latest-articles-panel` 使用 `overflow: hidden`

问题：

- 内容超出不会自然滚动，也不会自然撑开
- 更容易导致信息被直接截掉

### 5. 文章标题过早截断

状态：`[~] 已提交修复，待复核`

- `src/style/components/home/latest-articles.css:140`
- `src/style/components/home/latest-articles.css:142`

问题：

- 标题使用单行省略
- 中文标题在首页列表中很容易损失关键信息

### 6. 移动端 Latest 列表宽度策略不主流

状态：`[x] 已处理（已复核）`

- `src/style/components/home/latest-articles.css:220`
  - 列表容器使用 `width: fit-content`
- `src/style/components/home/latest-articles.css:234`
  - 列表项使用 `max-width: min(100%, 72vw)`

问题：

- 文章时间线区会被收成偏窄的一列
- 视觉重心不稳定，移动端可读性下降

### 7. 首页动画默认先隐藏内容

状态：`[x] 已处理（已复核）`

- `src/style/pages/home-page-entrance.css:1`
- `src/style/pages/home-page-entrance.css:64`
- `src/style/pages/home-page-entrance.css:118`

问题：

- 首屏内容默认 `opacity: 0`
- 完全依赖 JS 再显示
- 如果脚本异常、慢执行或被阻断，首页会先出现空白或内容延迟出现

### 8. Signature、CodeTime、Heatmap 都在放大高度波动

状态：`[x] 已处理（已复核）`

- `src/style/components/home/signature.css:7`
  - `min-height: 100%`
- `src/style/components/home/codetime.css:9`
  - 图片宽度强绑定视口变化
- `src/style/components/home/githeatmap.css:3`
  - 热力图卡片宽度偏大

问题：

- 这些模块共同抬高首页局部高度
- 会进一步放大首页整体“挤压感”和高度敏感性

---

## 后续审查计划

- 第三轮：文章页与列表页
- 第四轮：组件级尺寸系统与 `clamp()` 使用策略

---

## 第三轮：文章页与列表页

### 1. 主内容区和目录区都被做成内部滚动容器

- `src/style/pages/content-page.css:36`
  - `.content-page-body` 使用 `height: 100%`
- `src/style/pages/content-page.css:38`
  - `.content-page-body` 使用 `overflow: auto`
- `src/style/pages/content-page.css:135`
  - `.content-toc` 使用 `height: 100%`
- `src/style/pages/content-page.css:141`
  - `.content-toc` 使用 `overflow: auto`

问题：

- 文章页和列表页不是浏览器整页滚动，而是内部双滚动区
- 这会让滚轮、触控板和键盘阅读体验变差
- 也会放大首页外层固定壳布局带来的复杂性

### 2. 原生滚动条被整体隐藏，并用自定义滚动条替代

状态：`[x] 已处理（已复核）`

- `src/style/pages/content-page.css:235`
- `src/style/pages/content-page.css:242`
- `src/style/pages/content-page.css:276`

问题：

- 原生滚动条被隐藏后，可发现性和可访问性下降
- 自定义滚动条维护成本更高
- 对主流博客/文章页面来说，这类复杂度通常没有必要

### 3. 内容页入场动画再次采用“默认隐藏内容”

状态：`[x] 已处理（已复核）`

- `src/style/pages/content-page.css:22`
- `src/style/pages/content-page.css:152`
- `src/style/pages/content-page.css:181`

问题：

- 文章主体、目录标题、目录项都会先 `opacity: 0`
- 页面可见性依赖 JS 状态切换
- 如果脚本异常，文章页首屏也会出现空白或延迟显现

### 4. 目录侧栏视觉复杂度偏高

状态：`[x] 已处理（已复核）`

- `src/style/pages/content-page.css:252`
- `src/style/pages/content-page.css:276`
- `src/style/pages/content-page.css:293`

问题：

- 目录区叠加了进度条、自定义滚动条、动画状态和多层过渡
- 这对文章阅读的核心价值提升有限
- 但会显著提高维护成本与样式耦合

### 5. 移动端目录抽屉过重

状态：`[x] 已处理（已复核）`

- `src/style/pages/content-page.css:622`
- `src/style/pages/content-page.css:629`
- `src/style/pages/content-page.css:647`

问题：

- 移动端目录使用固定定位整屏抽屉
- 同时继续依赖高度锁定与局部滚动
- 这更像应用侧边栏，而不是主流博客常见的轻量目录/返回顶部辅助

### 6. 列表卡片摘要被强制单行截断

状态：`[~] 已提交修复，待复核`

- `src/style/pages/content-page.css:554`
- `src/style/pages/content-page.css:559`
- `src/style/pages/content-page.css:560`

问题：

- 摘要只能显示一行
- 信息密度低，内容表达不完整
- 主流博客列表更常见的是两到三行截断，或完全自然换行

### 7. 文章与列表页仍复用首页的三栏壳布局

- `src/components/content/ArticleDetailPage.astro:44`
- `src/components/content/SectionListingPage.astro:27`
- `src/components/content/SectionArchivePage.astro:27`

问题：

- 所有内容页继续依赖 `HomeLayout`
- 文章阅读页和首页展示页的交互目标并不相同
- 用同一套固定壳布局会把首页的问题同步带入文章页和列表页

### 8. Archive 页样式组织方式不一致

状态：`[x] 已处理（已复核）`

- `src/components/content/SectionArchivePage.astro:81`

问题：

- 这里直接在组件内部写了一整段页面级样式
- 这虽然符合 Astro scoped styles 能力，但和项目其余页面多采用外部样式文件的方式不一致
- 后续维护时，样式入口不统一，查找成本更高

### 9. Archive 列表日期列有潜在窄屏约束问题

状态：`[x] 已处理（已复核）`

- `src/components/content/SectionArchivePage.astro:115`
- `src/components/content/SectionArchivePage.astro:124`

问题：

- 日期列 `white-space: nowrap`
- 桌面还好，但在窄屏和较长日期格式下会更依赖断点兜底
- 结构弹性一般

### 10. 存在疑似未使用的文章页样式文件

状态：`[x] 已处理（已复核）`

- `src/style/pages/article-page.css:1`

问题：

- 当前代码搜索未发现该样式文件被页面或组件导入
- 这属于潜在死代码
- 会干扰后续样式审查与维护判断

---

## 第四轮：全项目样式系统

### 1. 缺少统一的设计 Token 体系

- `src/style/layouts/home-layout.css:33`
- `src/style/components/home/profile.css:3`
- `src/style/components/home/latest-articles.css:2`
- `src/style/components/content/app-panel-card.css:3`

问题：

- 项目虽然有少量根变量，但大量尺寸、间距、圆角、字号仍分散写在各组件文件中
- 许多组件自己维护一套局部变量，缺少统一 token 分层
- 后续想整体调整视觉密度、字号级别、圆角体系时，成本会很高

### 2. `clamp()` 使用策略不统一

- `src/style/layouts/home-layout.css:37`
- `src/style/components/home/latest-articles.css:2`
- `src/style/components/content/app-panel-card.css:45`
- `src/style/pages/content-page.css:43`

问题：

- 有的 `clamp()` 更像做字号缩放，有的拿来控盒子高度、宽度、留白、图标尺寸
- 中间参数有的用 `vw`、有的用 `vh`、有的仍是固定值
- 缺少统一规范，导致响应式行为很难预测

### 3. 固定高度思路在多个层级重复出现

- `src/style/layouts/home-layout.css:88`
- `src/style/layouts/home-layout.css:425`
- `src/style/components/home/profile.css:13`
- `src/style/components/home/latest-articles.css:11`
- `src/style/pages/content-page.css:36`
- `src/style/pages/content-page.css:135`

问题：

- 从布局壳层到内容层都在依赖固定高度或 `height: 100%`
- 这会让页面层层互相绑定
- 一旦上层尺寸策略变化，下层布局很容易连锁失真

### 4. `overflow` 策略过度依赖隐藏和局部滚动

- `src/style/layouts/home-layout.css:72`
- `src/style/layouts/home-layout.css:82`
- `src/style/layouts/home-layout.css:96`
- `src/style/components/home/latest-articles.css:25`
- `src/style/pages/content-page.css:38`
- `src/style/pages/content-page.css:141`
- `src/style/pages/content-page.css:647`

问题：

- 很多区域优先选择 `overflow: hidden` 或 `overflow: auto`
- 页面自然流被拆成多个局部可滚动盒子
- 这不是主流博客站点最常见的交互模型

### 5. 动画默认隐藏内容的策略被多处复用

- `src/style/pages/home-page-entrance.css:1`
- `src/style/pages/content-page.css:22`
- `src/style/pages/content-page.css:152`
- `src/style/pages/content-page.css:181`

问题：

- 内容基础可见性依赖 JS 改状态
- 动画从“增强层”变成了“显示层”
- 容错性不足，不符合内容优先原则

### 6. 主题色与交互色缺少统一变量

- `src/style/layouts/home-layout.css:226`
- `src/style/components/home/footer-info.css:47`
- `src/style/components/home/latest-articles.css:168`
- `src/style/components/content/app-panel-card.css:97`
- `src/style/pages/content-page.css:259`
- `src/style/pages/content-page.css:590`
- `src/style/components/ui/floating-action-button.css:22`

问题：

- `#483D8B` 在多个文件中重复硬编码
- 如果未来改主题色，需要跨文件批量替换
- 缺少统一的品牌色 / hover 色 / emphasis 色变量

### 7. 断点体系部分统一，但仍有分散定义

- `src/style/layouts/home-layout.css:519`
- `src/style/components/home/footer-info.css:53`
- `src/style/components/home/latest-articles.css:179`
- `src/style/components/content/app-panel-card.css:147`
- `src/components/content/SectionArchivePage.astro:140`
- `src/components/links/LostLinksPanel.astro:117`

问题：

- 项目里确实大量使用 `56.25rem` 这一主断点，这是好事
- 但同时又混入 `48rem`、`40rem`、`72rem` 等多套断点
- 这些断点没有集中管理，后续维护不够直观

### 8. 样式入口组织不一致

- `src/style/layouts/home-layout.css:1`
- `src/style/pages/content-page.css:1`
- `src/components/content/SectionArchivePage.astro:81`
- `src/components/links/LostLinksPanel.astro:47`
- `src/components/background/ConstellationBackground.astro:234`
- `src/components/background/CodeRainBackground.astro:40`

问题：

- 有的页面样式在独立 CSS 文件
- 有的组件直接内联 `<style>`
- 有的背景层又在组件内部写接近全局效果的样式
- 样式来源不统一，排查优先级与覆盖关系时成本偏高

### 9. 背景系统偏“视觉主导”，而不是“内容主导”

- `src/style/components/background/home-background.css:2`
- `src/components/background/ConstellationBackground.astro:241`
- `src/components/background/CodeRainBackground.astro:42`

问题：

- 多个背景都采用 `position: fixed; inset: 0`
- 这种全屏固定背景视觉冲击较强，但也提高了布局复杂度
- 对主流博客而言，背景通常应更克制，避免压过正文结构

### 10. 文本截断策略使用偏多

- `src/style/components/home/latest-articles.css:140`
- `src/style/pages/content-page.css:559`
- `src/style/components/content/app-panel-card.css:65`
- `src/style/components/content/app-panel-card.css:128`
- `src/components/links/LostLinksPanel.astro:103`

问题：

- 多处使用单行 `ellipsis`
- 这种处理对卡片式导航可以接受，但当前使用频率偏高
- 对中文内容站来说，会明显损失信息表达

### 11. 存在疑似异常的尺寸范围

- `src/style/components/home/footer-info.css:12`

问题：

- 当前页脚字号为 `clamp(0.2rem, 1.2vw, 1.95rem)`
- 最小值和最大值跨度过大，不像常规正文或辅助信息字号策略
- 这类极端范围会让不同窗口下的实际观感非常不稳定

### 12. 存在未使用样式文件，影响系统清晰度

- `src/style/pages/article-page.css:1`

问题：

- 当前未发现该文件被页面导入
- 样式系统里有“看起来存在、实际未启用”的内容
- 会增加误判和维护成本

---

## 第五轮：基础布局入口与交互脚本

### 1. 主题初始化时机偏晚，存在首屏闪烁风险

- `src/layouts/BaseLayout.astro:39`
- `src/layouts/HomeLayout.astro:39`
- `src/components/layout/HomeShellScripts.astro:66`

问题：

- 主题脚本放在 `body-end` 槽位执行
- 页面首屏 HTML 和背景可能先按默认样式渲染，再切换到用户主题
- 这会产生浅色/深色闪烁，尤其在网络慢或设备慢时更明显

### 2. 交互脚本职责过于集中

- `src/components/layout/HomeShellScripts.astro:4`

问题：

- 同一个内联脚本同时负责主题切换、桌面导航、移动导航、移动 TOC、内容入场、目录进度与自定义滚动条
- 文件职责过重，样式与脚本状态耦合非常深
- 后续只改一个交互，容易牵连多个页面行为

### 3. 样式可见性过度依赖脚本状态切换

- `src/components/layout/HomeShellScripts.astro:245`
- `src/components/layout/HomeShellScripts.astro:284`
- `src/components/layout/HomeShellScripts.astro:317`

问题：

- 页面进入状态、目录可见状态、目录进度条都由运行时动态插入和切换
- 这使得 UI 的基础呈现不再主要由 HTML + CSS 决定
- 一旦脚本时序异常，UI 就容易出现空白、错位或未初始化状态

### 4. About / Links 页的 TOC 提取逻辑重复

- `src/pages/about.astro:36`
- `src/pages/links.astro:36`

问题：

- 两个页面几乎重复了一套 `slugifyHeading` / `extractTocHeadings`
- 这不是纯样式问题，但会让内容页表现规则难以统一维护
- 后续一旦目录生成策略调整，需要多处同步修改

### 5. 内容页继续继承首页交互壳

- `src/components/content/ArticleDetailPage.astro:44`
- `src/components/content/SectionListingPage.astro:27`
- `src/components/content/SectionArchivePage.astro:27`
- `src/pages/about.astro:69`
- `src/pages/links.astro:69`

问题：

- 几乎所有内容页都继续挂在 `HomeLayout` 上
- 结果是首页导航壳、脚本、浮动按钮、TOC 行为被整站继承
- 首页展示逻辑和内容阅读逻辑没有真正分层

### 6. 桌面导航交互更偏“悬浮应用菜单”，不够主流内容站

- `src/components/layout/HomeShellScripts.astro:78`
- `src/components/layout/HomeShellScripts.astro:103`
- `src/components/layout/HomeShellScripts.astro:107`

问题：

- 桌面导航主要围绕 `mouseenter` / `mouseleave` 控制展开关闭
- 这种交互更像应用菜单，而不是主流博客常见的直接可见导航
- 对内容站来说，导航可发现性略弱，交互心智也偏重

### 7. 移动端 TOC 与浮动按钮逻辑较重

- `src/components/layout/HomeShellScripts.astro:180`
- `src/components/layout/HomeShellScripts.astro:208`
- `src/components/layout/HomeShellScripts.astro:221`

问题：

- 移动端目录依赖 class 状态切换、外部点击关闭、Escape 关闭、媒体查询同步
- 这套逻辑复杂度明显高于主流博客常见做法
- 后续很容易出现状态不同步或边界场景问题

### 8. BaseLayout 过于轻量，页面级基础信息与体验策略沉淀不足

- `src/layouts/BaseLayout.astro:21`

问题：

- 当前只提供最基础的 HTML 壳与插槽
- 页面级 meta、主题预初始化、阅读体验相关的全局基础策略没有沉淀在统一入口
- 导致不少体验逻辑被挪到页面末尾脚本中补救

---

## 第六轮：导航一致性、语义与可访问性

### 1. 顶级导航缺少 Home

- `src/config/site.ts:52`

问题：

- 当前导航只包含 `About / Blog / Note / Project / Links`
- 缺少顶级页面 `/`
- 这和项目定义的 6 个核心顶级页面不一致，也不符合用户预期的完整主导航

### 2. 主导航没有当前页状态

- `src/components/layout/HomeShellFrame.astro:49`
- `src/components/layout/HomeShellFrame.astro:71`

问题：

- 导航链接仅做列表渲染，没有 `aria-current` 或当前态样式
- 用户无法快速确认自己位于哪个栏目
- 对主流内容站来说，这是导航体验的基础项

### 3. 首页导航与内容页目录混用了相似的交互角色

- `src/components/layout/HomeShellFrame.astro:71`
- `src/components/content/ArticleDetailPage.astro:95`
- `src/pages/about.astro:78`
- `src/pages/links.astro:78`

问题：

- 左侧/顶部主导航与右侧 TOC 都采用类似的列表导航表现
- 但两者职责不同，一个是站点导航，一个是页内导航
- 目前视觉和交互边界不够清晰

### 4. TOC 标题与结构表现不一致

- `src/pages/about.astro:82`
- `src/pages/links.astro:78`
- `src/components/content/ArticleDetailPage.astro:95`
- `src/components/content/SectionListingPage.astro:62`
- `src/components/content/SectionArchivePage.astro:60`

问题：

- `About` 页有显式 `Contents` 标题
- `Links`、文章页、列表页、归档页的 TOC 区则缺少统一可见标题
- 这会让侧栏结构认知不统一，也影响扫描效率

### 5. 多处使用 `aria-label` 补语义，但结构语义本身偏弱

- `src/components/common/FooterMeta.astro:15`
- `src/components/links/FriendLinksPanel.astro:9`
- `src/components/ui/AppPanelCard.astro:23`

问题：

- 一些区域通过 `aria-label` 命名，但本身仍是普通 `div`
- 这能部分补充说明，但不如直接使用更合适的语义容器更自然
- 当前做法会让语义信息分散在标签属性里，而不是结构本身

### 6. 卡片与外链文案可见性较弱

- `src/components/links/FriendLinkCard.astro:10`
- `src/components/ui/AppPanelCard.astro:29`

问题：

- 外链卡片本身可点击，但没有额外的外链视觉提示
- 对主流内容站来说，外部跳转通常会有更明确的反馈或图标提示
- 当前交互偏极简，但信息提示不够

### 7. 可访问性状态有做，但分布不均

- `src/components/layout/HomeShellScripts.astro:198`
- `src/components/layout/HomeShellScripts.astro:431`
- `src/components/layout/HomeShellFrame.astro:45`
- `src/components/layout/HomeShellFrame.astro:68`

问题：

- 移动 TOC 按钮会维护 `aria-expanded`
- TOC 当前项会动态设置 `aria-current`
- 但主导航、桌面导航折叠区、站点栏目导航并没有同等完整的状态表达
- 这说明无障碍策略是“局部补丁式”而不是系统设计式

### 8. `summary/details` 被同时用于语义折叠和自定义菜单

- `src/components/layout/HomeShellFrame.astro:44`
- `src/components/layout/HomeShellFrame.astro:67`
- `src/components/links/LostLinksPanel.astro:23`

问题：

- `details/summary` 同时承担移动菜单、桌面导航折叠、链接面板折叠三类用途
- 这种复用并非不能做，但不同场景的交互预期差异较大
- 当前项目里更像“统一用这个控件顶上”，而不是按语义场景分别设计

### 9. 页面标题与元信息基础建设偏弱

- `src/layouts/BaseLayout.astro:18`

问题：

- 目前主要只设置了 `<title>`
- 缺少页面描述、社交分享、规范化链接等基础页面信息策略
- 虽然这不只是样式问题，但会直接影响主流内容站的完整度和专业感

---

## 第七轮：正文排版与 Markdown 阅读体验

### 1. 正文对 Markdown 块内容缺少专门样式

- `src/style/pages/content-page.css:83`
- `src/style/pages/content-page.css:109`

问题：

- `blockquote`、`pre`、`table`、`figure` 目前主要只定义了外边距
- 没有看到针对代码块、引用块、表格、图片说明的完整阅读样式
- 这会让 MD/MDX 内容渲染出来“能看”，但不够像成熟内容站

### 2. 正文链接识别度偏弱

- `src/style/pages/content-page.css:70`

问题：

- 正文链接颜色直接继承正文主色
- 默认状态下不够突出，链接可发现性较弱
- 主流博客通常会给正文链接更明确的视觉区分

### 3. 文章页通过隐藏正文首个 `h1` 规避重复标题

- `src/style/pages/content-page.css:373`

问题：

- `.content-page--article .content-page-body > h1:first-of-type { display: none; }`
- 这说明内容模型和展示模型之间存在重复标题冲突
- 属于“样式层兜底数据结构问题”，不够干净

### 4. 多个大标题采用透明描边字，阅读性一般

- `src/style/pages/content-page.css:41`
- `src/style/pages/content-page.css:393`
- `src/style/pages/content-page.css:469`

问题：

- 页面主标题、文章标题、列表标题都使用透明填充 + `text-stroke`
- 视觉个性很强，但阅读效率和兼容性不如正常文字填充
- 对主流内容站来说，这种表达适合点缀，不适合高频标题体系

### 5. TOC 当前项与悬停态通过缩放强调，容易造成文字抖动感

- `src/style/pages/content-page.css:345`
- `src/style/pages/content-page.css:363`

问题：

- 目录项激活和 hover 都用 `transform: scale(...)`
- 文字缩放会带来视觉抖动，尤其在长目录中更明显
- 主流内容站更常用颜色、粗细、边线或背景变化做强调

### 6. 列表卡片描述信息量偏低

- `src/style/pages/content-page.css:554`

问题：

- 描述只允许单行省略
- 对博客/项目列表这种内容型页面来说，信息承载不足
- 更主流的做法是 2–3 行截断或按内容自然换行

### 7. 正文阅读宽度和字面节奏缺少单独约束

- `src/style/pages/content-page.css:35`
- `src/style/pages/content-page.css:64`

问题：

- 正文主要依赖外层布局列宽，没有看到针对 prose 阅读宽度的独立优化
- 字号、行高有基础设置，但缺少更精细的阅读节奏控制
- 对长文博客来说，可读性优化还不够“内容优先”

### 8. 代码、表格、媒体嵌入的降级体验不明确

- `src/style/pages/content-page.css:83`
- `src/style/pages/content-page.css:109`

问题：

- 没看到对横向溢出的表格、长代码块、嵌入媒体的专门溢出策略
- 一旦内容里出现复杂表格或长代码，阅读区很可能出现溢出或裁切依赖上层容器
- 这对技术博客尤其是隐患
