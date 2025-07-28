import { Suspense } from "react"

export function FontPreload() {
  return (
    <Suspense fallback={null}>
      <link
        rel="preload"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        as="style"
        onLoad={(e) => {
          // @ts-ignore
          e.target.onload = null
          // @ts-ignore
          e.target.rel = 'stylesheet'
        }}
      />
      <noscript>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </noscript>
    </Suspense>
  )
} 