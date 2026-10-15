import { containerClass, containerHeaderClass, containerTitleClass } from './styles.js'

/**
 * A console-style container: optional header (title, description, actions) above its content.
 * @param {{
 *   title?: import('react').ReactNode,
 *   titleId?: string,
 *   description?: import('react').ReactNode,
 *   actions?: import('react').ReactNode,
 *   className?: string,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function Container({ title, titleId, description, actions, className, children }) {
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={`${containerClass()} ${className ?? ''}`}
    >
      {title && (
        <div
          className={`${containerHeaderClass()} flex flex-wrap items-start justify-between gap-3`}
        >
          <div>
            <h2 id={titleId} className={containerTitleClass()}>
              {title}
            </h2>
            {description && <p className="mt-1 text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
