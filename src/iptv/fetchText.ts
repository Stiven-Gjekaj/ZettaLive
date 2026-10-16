/** Why a URL did not give its text. The app shows this text to the user. */
export class LoadError extends Error {}

/** True when an HTTPS page cannot load the URL, because the URL is cleartext HTTP. */
export function isBlockedCleartext(url: string, pageProtocol = globalThis.location?.protocol): boolean {
  return pageProtocol === 'https:' && url.trim().toLowerCase().startsWith('http:')
}

/** Reads the text of a URL. Unzips a gzip file. Throws a LoadError with a clear reason. */
export async function fetchText(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (isBlockedCleartext(url)) {
    throw new LoadError('The URL starts with http://. A browser cannot load it from an HTTPS page. Use an https:// URL.')
  }
  let response: Response
  try {
    response = await fetcher(url)
  } catch {
    throw new LoadError('The server did not answer, or it does not let a browser read the file (no CORS headers).')
  }
  if (!response.ok) throw new LoadError(`The server answered with the error ${response.status}.`)
  return decode(new Uint8Array(await response.arrayBuffer()))
}

/** Reads the text of a file that the user chose. Unzips a gzip file. */
export async function readFileText(file: Blob): Promise<string> {
  return decode(new Uint8Array(await file.arrayBuffer()))
}

async function decode(bytes: Uint8Array): Promise<string> {
  // A gzip file starts with the bytes 1f 8b. When a server sends
  // Content-Encoding: gzip, the browser unzips the answer already.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const body = new Response(bytes as BodyInit).body
    if (!body) return ''
    return new Response(body.pipeThrough(new DecompressionStream('gzip'))).text()
  }
  return new TextDecoder().decode(bytes)
}
