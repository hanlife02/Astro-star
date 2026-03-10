# 性能排查记录

## 范围

本次排查基于以下方式完成：

- 本地执行 `pnpm build`，检查构建产物体积与页面输出规模
- 审查首页、文章页、导航、目录、背景动画等关键运行时代码
- 审查全局字体、图片、SVG、第三方资源的加载方式

本次结论主要来自代码审查与构建结果，不包含浏览器 Performance trace、Lighthouse、FPS、TBT 等实测数据。

## 当前结论

当前页面“渲染有些卡”的主要问题，不是 Astro 客户端包体过大，而是运行时渲染成本偏高，集中体现在：

1. 首屏存在偏重的 SVG / 图片 / 内联内容
2. 文章页目录在滚动时有频繁布局读取和自动平滑滚动
3. 首页入场动画存在较多 DOM 重建与逐字动画
4. 字体与第三方图片资源策略不够克制
5. 背景特效存在持续动画与高频绘制

补充说明：

- 本地 `pnpm build` 后，客户端 JS 仅发现一个较小 chunk，约 `6.9 kB`
- 因此体感卡顿更像是“主线程忙、绘制忙、滚动时掉帧”，而不是“下载 JS 太慢”

## 主要缺陷

### 1. 首屏资源过重

#### 头像与站点图标过大

- `public/avatar.svg` 当前约 `1.1 MB`
- `public/site-icon.svg` 当前约 `1.1 MB`

相关代码：

- `src/config/site.ts`
- `src/components/home/HomePageContent.astro`

问题点：

- 头像属于首屏关键内容，但当前仍使用了 `loading="lazy"`
- 超大 SVG 会增加网络传输、HTML 解析、图像解码与首次绘制成本
- 站点图标体积过大，会增加所有页面的基础请求成本

#### 签名 SVG 直接内联到配置并重复渲染

相关代码：

- `src/config/site.ts`
- `src/components/home/signature.astro`
- `src/style/components/home/signature.css`

问题点：

- 签名 SVG 字符串直接放在配置中，体积极大
- 渲染时实际生成了两份 SVG DOM
- 同时叠加了无限循环的描边与显隐动画

影响：

- HTML 体积变大
- DOM 节点数增加
- 首屏解析和样式计算成本上升
- 持续动画增加长期绘制成本

### 2. 文章页目录滚动逻辑成本过高

相关代码：

- `src/scripts/home-shell-content-toc.ts`

问题点：

- 滚动时反复遍历所有 heading
- 每次更新都会读取 `getBoundingClientRect()`、`offsetHeight`、`offsetTop`
- 自动跟随目录时直接调用 `scrollTo({ behavior: "smooth" })`
- 监听器直接绑定在 `scroll` 和 `resize` 上

影响：

- 滚动期间容易触发布局计算
- 自动平滑滚动会进一步放大卡顿感
- 在文章较长、标题较多时更明显

### 3. 首页入场动画过重

相关代码：

- `src/components/home/HomePageContent.astro`
- `src/style/pages/home-page-entrance.css`

问题点：

- 文本被拆成大量 span 节点
- 使用 `setTimeout` 逐字 reveal
- 每次执行都要重建一遍文本节点
- 每个字还叠加了 `blur + transform + opacity` 的过渡

影响：

- 首屏主线程负担变重
- 低端设备或移动端更容易发闷、掉帧
- 动画收益与成本不成比例

### 4. 字体与第三方媒体策略不够克制

相关代码：

- `src/style/base/tokens.css`
- `src/components/home/CodeTime.astro`
- `src/components/home/githeatmap.astro`

问题点：

- 字体仍使用 TTF，而不是更适合 Web 的 WOFF2
- 当前几个主要字重单个文件约 `217K` 到 `247K`
- 首页两个第三方图片卡片没有显式 `width` / `height`
- 第三方图片加载完全依赖外站稳定性

影响：

- 字体下载成本偏高
- 更容易产生布局抖动和首屏不稳定
- 第三方资源慢时会直接影响首页观感

### 5. 背景特效存在持续绘制压力

相关代码：

- `src/components/background/ConstellationBackground.astro`
- `src/components/background/CodeRainBackground.astro`
- `src/style/components/background/home-background.css`

问题点：

- `/links` 页 `constellation` 背景使用 canvas 持续 `requestAnimationFrame`
- 粒子间连线是近似 O(n²) 的计算
- `/about` 页 code rain、首页 snow background 也都有持续动画

影响：

- 在低端设备上更容易持续占用主线程 / GPU
- 页面静止时也会有持续成本
- 装饰性效果对流畅度的负担偏大

## 优先级优化路径

### P0：先砍首屏重资源

目标：先解决最直接的首屏解析、绘制和资源请求压力。

建议：

1. 压缩 `avatar.svg` 与 `site-icon.svg`
2. 头像改为首屏加载，并补齐尺寸信息
3. 签名 SVG 从配置中移出，改为独立静态资源
4. 不再同时渲染两份签名 SVG
5. 减少或移除签名的无限循环动画

预期收益：

- 首屏 HTML 更轻
- 关键视觉资源更稳定
- 首页与导航区域的绘制压力明显下降

### P1：重写文章页目录联动逻辑

目标：解决文章页滚动掉帧和目录“跟随抖动”。

建议：

1. 用 `IntersectionObserver` 替代滚动时手动扫描 heading
2. 至少缓存 heading 位置信息，避免每次滚动都全量读取布局
3. 只有 active item 真正变化时才更新目录状态
4. 自动跟随目录时取消 `smooth`
5. 点击目录跳转时再保留平滑滚动

预期收益：

- 文章页滚动更顺
- 目录更新更稳定
- 降低滚动过程中布局和绘制压力

### P2：简化首页入场动画

目标：保留风格，但降低首屏主线程负担。

建议：

1. 逐字动画改为按词或按句
2. 尽量改成 CSS-only，减少 JS 驱动的 reveal 流程
3. 去掉 blur 过渡
4. 动画只执行一次，不重复重建文本节点

预期收益：

- 首屏更快进入稳定状态
- 低端设备体感改善明显

### P3：收紧字体与外链媒体

目标：降低基础资源成本，减少 CLS 和外站波动影响。

建议：

1. TTF 转 WOFF2
2. 按实际使用字重裁剪字体资源
3. 为第三方图片补齐 `width` / `height`
4. 能自托管的 badge 尽量自托管
5. 非关键媒体尽量延后显示

预期收益：

- 页面基础加载更稳
- 字体成本下降
- 首页布局跳动减少

### P4：最后清理背景特效

目标：降低长期绘制成本，而不是一开始就大改视觉。

建议：

1. `constellation` 降粒子数
2. 缩短连线距离
3. 页面不可见时彻底停掉动画
4. 如果只是装饰，优先考虑静态纹理或低帧率方案

预期收益：

- 降低装饰层对流畅度的持续影响
- 特别有利于低端设备和移动端

## 推荐执行顺序

建议按以下顺序推进：

1. 首屏重资源治理
2. 文章页目录逻辑重写
3. 首页入场动画简化
4. 字体与第三方媒体治理
5. 背景特效降本

其中，最值得最先做的两项是：

- 签名 / 头像资源减重
- 目录滚动逻辑重写

只做这两项，通常体感就会明显改善。

## 暂不执行

当前仅记录问题与优化路径，暂不开始代码执行。

待 review 通过后，再按优先级逐项落地。
