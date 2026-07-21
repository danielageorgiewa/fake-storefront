"use client"

import { HttpTypes } from "@medusajs/types"
import { IconButton, clx } from "@modules/common/components/ui"
import ChevronDown from "@modules/common/icons/chevron-down"
import Image from "next/image"
import { useCallback, useRef, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

// FUTURE SCOPE (not implemented): filter the visible media set by the currently
// selected product option value. The intended approach is to associate each
// media item with option values via its metadata, then show only the
// variant-associated media for the selected option value. Kept generic on
// purpose — the concrete option types differ per deployment, so nothing here
// should assume which options exist or how many there are.

// Minimum horizontal travel (px) for a touch gesture to count as a swipe.
const SWIPE_THRESHOLD = 50

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const count = images.length
  const hasMultiple = count > 1

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return
      // Wrap around so both controls stay usable at either end.
      setCurrent(((index % count) + count) % count)
    },
    [count]
  )

  const prev = useCallback(() => goTo(current - 1), [goTo, current])
  const next = useCallback(() => goTo(current + 1), [goTo, current])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hasMultiple) return
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      prev()
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      next()
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      delta < 0 ? next() : prev()
    }
    touchStartX.current = null
  }

  if (count === 0) {
    return null
  }

  return (
    <div
      className="flex items-start relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Product images"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-col flex-1 small:mx-16 gap-y-4">
        {/* Single visible frame — preserves the original aspect ratio/sizing. */}
        <div className="relative aspect-[29/34] w-full overflow-hidden rounded-lg bg-ui-bg-subtle">
          <div
            className="flex h-full w-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                id={image.id}
                className="relative h-full w-full shrink-0 grow-0 basis-full"
                // Inline flex sizing so each slide is always exactly one frame
                // wide (never shrinks to share the frame), independent of whether
                // the utility classes above have been generated/loaded yet.
                style={{ flex: "0 0 100%" }}
                role="group"
                aria-roledescription="slide"
                aria-label={`Image ${index + 1} of ${count}`}
                aria-hidden={index !== current}
              >
                {!!image.url && (
                  <Image
                    src={image.url}
                    priority={index <= 2}
                    className="rounded-rounded"
                    alt={`Product image ${index + 1}`}
                    fill
                    sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                    style={{
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {hasMultiple && (
            <>
              <IconButton
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 shadow-md hover:bg-white"
              >
                <ChevronDown className="rotate-90" />
              </IconButton>
              <IconButton
                type="button"
                onClick={next}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 shadow-md hover:bg-white"
              >
                <ChevronDown className="-rotate-90" />
              </IconButton>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="flex items-center justify-center gap-x-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to image ${index + 1}`}
                aria-current={index === current}
                className={clx(
                  "h-2 w-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2",
                  index === current ? "bg-ui-fg-base" : "bg-ui-border-base"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageGallery
