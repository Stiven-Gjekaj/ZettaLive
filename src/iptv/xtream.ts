/** An Xtream Codes account of an IPTV provider. */
export interface XtreamAccount {
  server: string
  username: string
  password: string
}

/** The server address with a scheme and with no slash at the end. A server with no scheme gets https://. */
export function cleanServer(server: string): string {
  const s = server.trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

/** The playlist URL and the guide URL of an account. The playlist asks for HLS, which a browser can play. */
export function xtreamUrls(account: XtreamAccount): { playlist: string; guide: string } {
  const server = cleanServer(account.server)
  const auth = `username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}`
  return {
    playlist: `${server}/get.php?${auth}&type=m3u_plus&output=m3u8`,
    guide: `${server}/xmltv.php?${auth}`,
  }
}

/** The host of the server, as a name for the playlist. */
export function xtreamName(account: XtreamAccount): string {
  try {
    return new URL(cleanServer(account.server)).host
  } catch {
    return account.server
  }
}
