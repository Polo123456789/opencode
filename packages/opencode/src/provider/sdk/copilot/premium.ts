type Meta = {
  premiumRequestCost?: number
  premiumRequestBalance?: number
}

const num = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return
  const parsed = Number(value.trim())
  if (Number.isFinite(parsed)) return parsed
}

const get = (headers: Headers | Record<string, string> | undefined, key: string) => {
  if (!headers) return
  if (headers instanceof Headers) return headers.get(key) ?? headers.get(key.toLowerCase()) ?? undefined
  return headers[key] ?? headers[key.toLowerCase()]
}

const parse = (value: string | undefined) => {
  if (!value) return
  const raw = value.trim()
  const direct = num(raw)
  if (direct !== undefined) return direct

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "number") return parsed
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return
    return num(
      parsed["premium_requests"] ??
        parsed["premiumRequests"] ??
        parsed["request_cost"] ??
        parsed["requestCost"] ??
        parsed["cost"],
    )
  } catch {}

  const match = raw.match(/premium[_ -]?requests?["=: ]+([0-9]+(?:\.[0-9]+)?)/i)
  return num(match?.[1])
}

export function premium(headers: Headers | Record<string, string> | undefined): Meta | undefined {
  const meta: Meta = {
    premiumRequestCost: parse(get(headers, "copilot-usage")),
    premiumRequestBalance: num(get(headers, "x-ratelimit-remaining-premium")),
  }

  if (meta.premiumRequestCost === undefined && meta.premiumRequestBalance === undefined) return
  return meta
}
