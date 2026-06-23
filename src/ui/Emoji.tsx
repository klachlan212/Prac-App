import * as React from 'react'

// Microsoft Fluent UI Emoji (Flat style), served locally from /public/emoji so they
// render identically across Apple/Android instead of each platform's native font
// (CLAUDE.md A7). Reserved for warm/illustrative spots; functional icons use Lucide.
const SRC = {
  hospital: '/emoji/hospital.svg',
  calendar: '/emoji/calendar.svg',
  compass: '/emoji/compass.svg',
  seedling: '/emoji/seedling.svg',
  memo: '/emoji/memo.svg',
  books: '/emoji/books.svg',
  stethoscope: '/emoji/stethoscope.svg',
  'speech-balloon': '/emoji/speech-balloon.svg',
  clipboard: '/emoji/clipboard.svg',
  pill: '/emoji/pill.svg',
  recycle: '/emoji/recycle.svg',
  eyes: '/emoji/eyes.svg',
  'water-wave': '/emoji/water-wave.svg',
  handshake: '/emoji/handshake.svg',
  automobile: '/emoji/automobile.svg',
  'shushing-face': '/emoji/shushing-face.svg',
  key: '/emoji/key.svg',
  'hot-beverage': '/emoji/hot-beverage.svg',
  fire: '/emoji/fire.svg',
  pushpin: '/emoji/pushpin.svg',
  page: '/emoji/page.svg',
  gear: '/emoji/gear.svg',
} as const

export type EmojiName = keyof typeof SRC

export function Emoji({
  name,
  className = 'h-5 w-5',
  label,
}: {
  name: EmojiName
  className?: string
  label?: string
}) {
  return (
    // Static local SVG asset; next/image adds no value here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[name]}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`inline-block select-none ${className}`}
    />
  )
}
