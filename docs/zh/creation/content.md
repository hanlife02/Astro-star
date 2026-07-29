---
order: 10
---

# 创作内容

## 目录位置

```text
src/content/
├── blog/
├── note/
├── project/
└── page/
```

`blog` 用于博文，`note` 用于手记，`project` 用于项目，`page` 用于固定页面（如 about、links）。

## 分类

在 blog/ 或 note/ 下新建目录，目录名即为分类的`routeslug`，不建议使用中文。

后续`type`可以使用中文作为分类名，同一目录下`type`值一定要保持一致，不然会随机选取其中的一个`type`值作为分类名。

如果直接将文章置于 blog/ 或 note/ 下，则是`uncategorized`类

## 文章

支持`md`或`mdx`格式的文件

`blog` 和 `note` 推荐 frontmatter：

```md
---
routeSlug: 'deploy-astro-star'
title: 'Astro-star 部署记录'
description: '记录一次从构建到服务器上线的流程。'
createdAt: '2026-05-03 20:30'
updatedAt: '2026-05-03 20:30'
type: 'Building'
---
```

| Variables   | 说明                                                  |
| ----------- | ----------------------------------------------------- |
| routeSlug   | 命名文章 URL 的末尾                                   |
| title       | 文章标题                                              |
| description | 文章描述                                              |
| createdAt   | 创建日期，不存在时会根据 git 自动生成，一般不需要设置 |
| updatedAt   | 更新日期，同理 createdAt ,一般不需要设置              |
| type        | 文章分类 (project 暂时不支持 type 分类)               |

## 项目页 frontmatter

```md
---
routeSlug: 'my-project'
title: 'My Project'
description: '项目简介'
createdAt: '2026-06-15 23:05:26'
projectUrl: 'https://github.com/your-name/my-project'
docUrl: 'https://example.com/docs'
published: true
---
```

| 字段       | 说明                         |
| ---------- | ---------------------------- |
| projectUrl | 项目地址（仅项目页展示）     |
| docUrl     | 项目文档地址（仅项目页展示） |
| published  | 设为 `false` 时作为草稿隐藏  |

## 固定页面 frontmatter

用于 `src/content/page/` 下的页面（如 about、links）：

```md
---
title: About Me
heading: About
description: This page introduces me and this site.
background: code-rain
---
```

`background` 可选值：`code-rain`（代码雨）、`snow`（雪花）、`constellation`（星座连线）。

## 常用字段说明

| 字段        | 说明                                          |
| ----------- | --------------------------------------------- |
| routeSlug   | URL 短名，建议英文小写+连字符                 |
| title       | 标题                                          |
| description | 摘要，用于列表页和 SEO                        |
| createdAt   | 创建时间，省略时从 Git 记录或文件系统时间回退 |
| updatedAt   | 更新时间，省略时同样从 Git 记录回退           |
| type        | 文章分类/标签展示字段                         |
| projectUrl  | 项目地址（仅项目页展示）                      |
| docUrl      | 项目文档地址（仅项目页展示）                  |
| image       | 社交分享图/SEO 图                             |
| published   | 设为 `false` 时作为草稿隐藏                   |

Frontmatter 字段均可省略，省略后会使用文件路径、文件名、正文内容或 Git 时间等信息作为兜底。

## 特殊语法渲染

### 折叠信息（Fold）

使用 `:::fold` 语法实现可折叠内容块，支持默认折叠或展开状态：

```md
:::fold[点击展开]
隐藏内容可以包含段落、列表和代码块。
:::

:::fold[默认展开]{open=true}
这个折叠默认是展开的。
:::
```

### 涂抹文字（Blur Text）

使用 `||text||` 语法实现悬停显示的模糊文字效果，读者需要将鼠标悬停才能查看隐藏内容。

### 横线划除

使用 `~~text~~` 语法实现删除线效果，渲染为静音样式的划除文字。

### GitHub 仓库卡片

在文章内容中单列一个 GitHub 仓库链接，会自动渲染为带图标的卡片形式。

## 静态资源

本地资源放在 `public/` 下，引用时从根路径开始：

- 头像：放在 `public/avatar.svg`，配置中写 `/avatar.svg`
- 文章图片：放在 `public/figures/`，引用时写 `/figures/xxx.png`
- 站点图标：放在 `public/site-icon.svg`，配置中写 `/site-icon.svg`
- 赞赏二维码：放在 `public/reward/`，配置中写 `/reward/wechat.png`
