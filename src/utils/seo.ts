export const APP_NAME = "Project Y"
export const DEFAULT_DESCRIPTION = "Project Management without bullshit."

export function formatPageTitle(pageTitle: string): string {
  return `${pageTitle} · ${APP_NAME}`
}

export const seo = ({
  title,
  description,
  keywords,
  image,
}: {
  title: string
  description?: string
  image?: string
  keywords?: string
}) => {
  const tags = [
    { title },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
          { property: 'og:image', content: image },
        ]
      : []),
  ]

  return tags
}

export function pageMeta(pageTitle: string, description = DEFAULT_DESCRIPTION) {
  return seo({ title: formatPageTitle(pageTitle), description })
}
