export function countContentWords(source: string) {
  const body = source
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/^\s*(import|export)\s.+$/gmu, " ")
    .replace(/```[^\n\r]*[\r]?\n/g, " ")
    .replace(/```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[>#*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cjkUnits = body.match(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
  );
  const nonCjkBody = body.replace(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    " ",
  );
  const latinWords = nonCjkBody.match(
    /[\p{Letter}\p{Number}]+(?:[._'-][\p{Letter}\p{Number}]+)*/gu,
  );

  return (cjkUnits?.length ?? 0) + (latinWords?.length ?? 0);
}
