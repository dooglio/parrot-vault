// Allow importing PNG/JPG/SVG/WebP/GIF image files
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.jpeg' {
  const src: string
  export default src
}
declare module '*.svg' {
  const src: string
  export default src
}
declare module '*.webp' {
  const src: string
  export default src
}
declare module '*.gif' {
  const src: string
  export default src
}
declare module '*.ico' {
  const src: string
  export default src
}

// Allow importing CSS files as side-effects
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
