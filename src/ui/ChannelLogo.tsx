import { useState } from 'react'

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  return (words.length > 1 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : (words[0] ?? '?').slice(0, 2)).toUpperCase()
}

/** The logo of a channel, or its initials when it has no logo or the logo fails. */
export function ChannelLogo({ name, logo, size = 40 }: { name: string; logo?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden="true">
      {logo && !failed ? <img src={logo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  )
}
