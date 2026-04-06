import { describe, expect, test } from "bun:test"
import { premium } from "@/provider/sdk/copilot/premium"

describe("premium", () => {
  test("reads copilot premium headers", () => {
    const headers = new Headers({
      "copilot-usage": '{"premium_requests":1.25}',
      "x-ratelimit-remaining-premium": "97",
    })

    expect(premium(headers)).toEqual({
      premiumRequestCost: 1.25,
      premiumRequestBalance: 97,
    })
  })

  test("returns undefined when headers are absent", () => {
    expect(premium(new Headers())).toBeUndefined()
  })
})
