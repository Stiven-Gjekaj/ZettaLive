/** A screen that a later version fills. */
export function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="dim">{text}</p>
    </section>
  )
}
