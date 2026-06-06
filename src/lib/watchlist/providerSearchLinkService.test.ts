import { describe, expect, it } from "vitest";
import { generateProviderLinks } from "./providerSearchLinkService";

describe("generateProviderLinks", () => {
  it("generates provider search links with Search labels for movies", () => {
    const links = generateProviderLinks({
      title: "The Matrix",
      release_year: 1999,
      media_type: "movie"
    });

    expect(links).toHaveLength(6);
    expect(links.map((link) => link.label)).toEqual([
      "Search Netflix",
      "Search Prime",
      "Search JioHotstar",
      "Search Apple TV",
      "Search YouTube",
      "Search Google"
    ]);
    expect(links.every((link) => link.label.startsWith("Search"))).toBe(true);
    expect(links.find((link) => link.key === "google")?.url).toContain("The%20Matrix%201999");
  });

  it("uses a series-specific query for series", () => {
    const links = generateProviderLinks({
      title: "Severance",
      release_year: 2022,
      media_type: "series"
    });

    expect(links.find((link) => link.key === "youtube")?.url).toContain("Severance%20series");
  });
});
