"use client"

import { useParams, usePathname } from "next/navigation"
import ReactCountryFlag from "react-country-flag"

import { updateRegion } from "@lib/data/cart"

type LocaleOption = {
  code: string
  label: string
}

const LOCALES: LocaleOption[] = [
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
]

const LocaleSwitcher = () => {
  const { countryCode } = useParams()
  const currentPath = usePathname().split(`/${countryCode}`)[1]

  const handleChange = (code: string) => {
    if (code === countryCode) {
      return
    }

    updateRegion(code, currentPath)
  }

  return (
    <div className="txt-compact-small flex items-center gap-x-2">
      {LOCALES.map((locale, index) => {
        const isActive = locale.code === countryCode

        return (
          <span key={locale.code} className="flex items-center">
            {index > 0 && <span className="mr-2 text-ui-fg-muted">|</span>}
            <button
              type="button"
              onClick={() => handleChange(locale.code)}
              disabled={isActive}
              aria-current={isActive ? "true" : undefined}
              className={
                isActive
                  ? "flex items-center gap-x-1.5 font-semibold text-ui-fg-base cursor-default"
                  : "flex items-center gap-x-1.5 hover:text-ui-fg-base"
              }
            >
              <ReactCountryFlag
                svg
                style={{ width: "16px", height: "16px" }}
                countryCode={locale.code}
              />
              {locale.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}

export default LocaleSwitcher
