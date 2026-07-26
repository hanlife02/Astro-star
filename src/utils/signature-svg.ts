export const SIGNATURE_ASSET_BASENAME = "signature.svg";

export function normalizeSignatureSvgMarkup(input: string) {
  let value = input.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/^['"]/, "").replace(/['"]$/, "");
  }

  return value.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

export function isValidSignatureSvgMarkup(markup: string) {
  return markup.startsWith("<svg") && markup.includes("</svg>");
}
