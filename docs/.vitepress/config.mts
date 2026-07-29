import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'

const base = '/Astro-star-docs/'
const withBase = (path: string) => `${base}${path.replace(/^\//, '')}`

type SectionConfig = {
  text: string
  dir: string
}

type PageMeta = {
  order: number
  text: string
  link: string
}

const docsRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const enSections: SectionConfig[] = [
  { text: 'Theme', dir: 'theme' },
  { text: 'Deploy', dir: 'deploy' },
  { text: 'Creation', dir: 'creation' },
  { text: 'Develop', dir: 'develop' }
]

const zhSections: SectionConfig[] = [
  { text: '主题', dir: 'theme' },
  { text: '部署', dir: 'deploy' },
  { text: '创作', dir: 'creation' },
  { text: '开发', dir: 'develop' }
]

function buildSidebar(sections: SectionConfig[], prefix = ''): DefaultTheme.Sidebar {
  const prefixPath = prefix ? `${prefix}/` : ''
  return {
    '/': sections.map((section) => ({
      text: section.text,
      items: getSectionItems(section.dir, prefixPath)
    }))
  }
}

function getSectionItems(sectionDir: string, prefixPath: string): DefaultTheme.SidebarItem[] {
  const absoluteDir = join(docsRoot, prefixPath, sectionDir)

  if (!existsSync(absoluteDir)) {
    return []
  }

  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md')
    .map((entry) => getPageMeta(prefixPath, sectionDir, entry.name))
    .sort((a, b) => a.order - b.order || a.text.localeCompare(b.text, 'en'))
    .map(({ text, link }) => ({ text, link }))
}

function getPageMeta(prefixPath: string, sectionDir: string, fileName: string): PageMeta {
  const absolutePath = join(docsRoot, prefixPath, sectionDir, fileName)
  const source = readFileSync(absolutePath, 'utf8')
  const frontmatter = parseFrontmatter(source)
  const h1 = source.match(/^#\s+(.+)$/m)?.[1]?.trim()
  const fallbackTitle = basename(fileName, extname(fileName))
  const order = Number(frontmatter.order)

  return {
    order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER,
    text: frontmatter.title ?? h1 ?? fallbackTitle,
    link: `/${prefixPath}${sectionDir}/${basename(fileName, extname(fileName))}`
  }
}

function parseFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^---\n([\s\S]*?)\n---/)

  if (!match) {
    return {}
  }

  return Object.fromEntries(
    match[1]
      .split('\n')
      .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, '')])
  )
}

const head = [
  ['meta', { name: 'theme-color', content: '#ff5d01' }],
  ['link', { rel: 'icon', type: 'image/png', href: withBase('/astro-star.png') }],
  ['link', { rel: 'apple-touch-icon', href: withBase('/astro-star.png') }]
]

const socialLinks: DefaultTheme.SocialLink[] = [
  { icon: 'github', link: 'https://github.com/hanlife02/Astro-star' }
]

const footer = {
  message: 'Astro-star documentation site.',
  copyright: 'Astro-star source code uses Apache-2.0.'
}

const markdown: DefaultTheme.Config['markdown'] = {
  math: true
}

export default defineConfig({
  base,
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['README.md', 'CONTRIBUTING.md'],
  markdown,
  head,

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'Astro-star Docs',
      description: 'Documentation for the Astro-star open-source Astro personal site theme',
      themeConfig: {
        logo: '/astro-star.png',
        nav: [
          { text: 'Astro-star', link: 'https://github.com/hanlife02/Astro-star' },
          { text: 'Docs', link: '/theme/overview' }
        ],
        sidebar: buildSidebar(enSections),
        outline: { label: 'On this page', level: [2, 3] },
        socialLinks,
        footer,
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: {
          text: 'Updated',
          formatOptions: { dateStyle: 'full', timeStyle: 'medium', forceLocale: true }
        },
        editLink: {
          pattern: 'https://github.com/hanlife02/Astro-star/edit/main/docs/:path',
          text: 'Edit this page on GitHub'
        },
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light mode',
        darkModeSwitchTitle: 'Switch to dark mode',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Back to top',
        externalLinkIcon: true,
        search: {
          provider: 'local',
          options: {
            locales: {
              root: {
                translations: {
                  button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
                  modal: {
                    displayDetails: 'Show details',
                    resetButtonTitle: 'Reset search',
                    backButtonTitle: 'Close search',
                    noResultsText: 'No results',
                    footer: {
                      selectText: 'Select',
                      selectKeyAriaLabel: 'Enter',
                      navigateText: 'Navigate',
                      navigateUpKeyAriaLabel: 'Arrow up',
                      navigateDownKeyAriaLabel: 'Arrow down',
                      closeText: 'Close',
                      closeKeyAriaLabel: 'esc'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      title: 'Astro-star 文档',
      description: 'Astro-star 开源 Astro 个人站点主题文档',
      themeConfig: {
        logo: '/astro-star.png',
        nav: [
          { text: 'Astro-star', link: 'https://github.com/hanlife02/Astro-star' },
          { text: '文档', link: '/zh/theme/overview' }
        ],
        sidebar: buildSidebar(zhSections, 'zh'),
        outline: { label: '本页目录', level: [2, 3] },
        socialLinks,
        footer,
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: {
          text: '更新于',
          formatOptions: { dateStyle: 'full', timeStyle: 'medium', forceLocale: true }
        },
        editLink: {
          pattern: 'https://github.com/hanlife02/Astro-star/edit/main/docs/:path',
          text: '在 GitHub 上编辑本页'
        },
        darkModeSwitchLabel: '颜色选择',
        lightModeSwitchTitle: '切换至亮色模式',
        darkModeSwitchTitle: '切换至暗色模式',
        sidebarMenuLabel: '目录',
        returnToTopLabel: '回到顶部',
        externalLinkIcon: true,
        search: {
          provider: 'local',
          options: {
            locales: {
              zh: {
                translations: {
                  button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
                  modal: {
                    displayDetails: '显示详细列表',
                    resetButtonTitle: '重置搜索',
                    backButtonTitle: '关闭搜索',
                    noResultsText: '没有结果',
                    footer: {
                      selectText: '选择',
                      selectKeyAriaLabel: '输入',
                      navigateText: '导航',
                      navigateUpKeyAriaLabel: '上箭头',
                      navigateDownKeyAriaLabel: '下箭头',
                      closeText: '关闭',
                      closeKeyAriaLabel: 'esc'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
})
