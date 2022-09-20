import { promises as fs } from "fs"

import { describe, expect, test } from "vitest"

import html from "./__test__/data/index.txt?raw"

import { Index } from "."

describe("Index", () => {
  test("normal", async () => {
    const asset = JSON.parse(
      // eslint-disable-next-line n/no-path-concat
      await fs.readFile(`${__dirname}/__test__/assets/index.json`, "utf8")
    ) as Awaited<ReturnType<typeof Index>>
    const result = JSON.parse(JSON.stringify(await Index(html)))

    asset.preRelease.forEach((item, index) => {
      // eslint-disable-next-line functional/immutable-data
      item.time_release = result.preRelease[index].time_release
    })

    expect(result).toEqual(asset)
  })
})