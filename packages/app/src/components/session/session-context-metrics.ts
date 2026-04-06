import type { AssistantMessage, Message, Part } from "@opencode-ai/sdk/v2/client"

type Provider = {
  id: string
  name?: string
  models: Record<string, Model | undefined>
}

type Model = {
  name?: string
  limit: {
    context: number
  }
}

type Context = {
  message: AssistantMessage
  provider?: Provider
  model?: Model
  providerLabel: string
  modelLabel: string
  limit: number | undefined
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
  usage: number | null
  premium: {
    cost: number | undefined
    remaining: number | undefined
  }
}

type Metrics = {
  totalCost: number
  context: Context | undefined
}

const tokenTotal = (msg: AssistantMessage) => {
  return msg.tokens.input + msg.tokens.output + msg.tokens.reasoning + msg.tokens.cache.read + msg.tokens.cache.write
}

const lastAssistantWithTokens = (messages: Message[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== "assistant") continue
    if (tokenTotal(msg) <= 0) continue
    return msg
  }
}

const extract = (parts: Part[] | undefined) => {
  const list =
    parts?.filter((part): part is Extract<Part, { type: "step-finish" }> => part.type === "step-finish") ?? []
  const costs = list.flatMap((part) => {
    const value = part.metadata?.["copilot"]
    if (!value || typeof value !== "object" || Array.isArray(value)) return []
    const cost = value["premiumRequestCost"]
    if (typeof cost !== "number" || !Number.isFinite(cost)) return []
    return [cost]
  })

  const last = list.findLast((part) => {
    const value = part.metadata?.["copilot"]
    return value && typeof value === "object" && !Array.isArray(value) && value["premiumRequestBalance"] !== undefined
  })
  const value = last?.metadata?.["copilot"]
  const remaining =
    value && typeof value === "object" && !Array.isArray(value) && typeof value["premiumRequestBalance"] === "number"
      ? value["premiumRequestBalance"]
      : undefined

  return {
    cost: costs.length ? costs.reduce((sum, value) => sum + value, 0) : undefined,
    remaining,
  }
}

const build = (
  messages: Message[] = [],
  providers: Provider[] = [],
  parts: Record<string, Part[] | undefined> = {},
): Metrics => {
  const totalCost = messages.reduce((sum, msg) => sum + (msg.role === "assistant" ? msg.cost : 0), 0)
  const message = lastAssistantWithTokens(messages)
  if (!message) return { totalCost, context: undefined }

  const provider = providers.find((item) => item.id === message.providerID)
  const model = provider?.models[message.modelID]
  const limit = model?.limit.context
  const total = tokenTotal(message)
  const meta = extract(parts[message.id])

  return {
    totalCost,
    context: {
      message,
      provider,
      model,
      providerLabel: provider?.name ?? message.providerID,
      modelLabel: model?.name ?? message.modelID,
      limit,
      input: message.tokens.input,
      output: message.tokens.output,
      reasoning: message.tokens.reasoning,
      cacheRead: message.tokens.cache.read,
      cacheWrite: message.tokens.cache.write,
      total,
      usage: limit ? Math.round((total / limit) * 100) : null,
      premium: meta,
    },
  }
}

export function getSessionContextMetrics(
  messages: Message[] = [],
  providers: Provider[] = [],
  parts: Record<string, Part[] | undefined> = {},
) {
  return build(messages, providers, parts)
}
