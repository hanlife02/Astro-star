import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { unified } from "unified";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { remarkContentFormatDirectives } from "../src/utils/remark-content-format-directives.js";

const contentProseStyles = await readFile(
  new URL("../src/style/components/content/content-prose.css", import.meta.url),
  "utf8",
);
const templateSource = await readFile(
  new URL(
    "../src/content/blog/template/mdx-rendering-formats.mdx",
    import.meta.url,
  ),
  "utf8",
);

function transform(source) {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(source);
  const file = {
    value: source,
    fail(message) {
      throw new Error(message);
    },
  };

  remarkContentFormatDirectives()(tree, file);
  return tree;
}

function getVideoFigure(tree) {
  const figure = tree.children[0];
  assert.equal(figure?.data?.hName, "figure");
  assert.equal(figure.data.hProperties.class, "content-video-figure");
  return figure;
}

function getMedia(figure, tagName) {
  const frame = figure.children.find((child) => child.data?.hName === "div");
  assert.ok(frame, "video frame is missing");
  const media = frame.children.find((child) => child.data?.hName === tagName);
  assert.ok(media, `${tagName} media is missing`);
  return media;
}

function getFrame(figure) {
  const frame = figure.children.find((child) => child.data?.hName === "div");
  assert.ok(frame, "video frame is missing");
  return frame;
}

test("a direct video directive becomes a lazy native video figure", () => {
  const figure = getVideoFigure(
    transform(':video[Demo](/videos/demo.mp4){poster="/figures/demo.webp"}'),
  );
  const video = getMedia(figure, "video");

  assert.equal(video.data.hProperties.controls, true);
  assert.equal(video.data.hProperties.playsinline, true);
  assert.equal(video.data.hProperties.preload, "none");
  assert.equal(video.data.hProperties.poster, "/figures/demo.webp");
  assert.equal(video.data.hProperties["data-video-src"], "/videos/demo.mp4");
  assert.equal("src" in video.data.hProperties, false);
  const sourceLink = getFrame(figure).children.find(
    (child) => child.data?.hName === "a",
  );
  assert.ok(sourceLink, "video source fallback is missing");
  assert.equal("hidden" in sourceLink.data.hProperties, false);
  assert.equal(
    figure.children.some(
      (child) =>
        child.data?.hName === "figcaption" &&
        child.children[0].value === "Demo",
    ),
    true,
  );
});

test("a YouTube directive becomes a youtube-nocookie iframe without an eager src", () => {
  const figure = getVideoFigure(
    transform(":video[YouTube](https://youtu.be/abc123)"),
  );
  const iframe = getMedia(figure, "iframe");

  assert.equal(
    iframe.data.hProperties["data-video-src"],
    "https://www.youtube-nocookie.com/embed/abc123",
  );
  assert.equal("src" in iframe.data.hProperties, false);
  assert.equal(iframe.data.hProperties.loading, "lazy");
  assert.equal(iframe.data.hProperties.allowfullscreen, true);
});

test("a Bilibili directive keeps a numeric page parameter", () => {
  const figure = getVideoFigure(
    transform(
      ":video[Bilibili](https://www.bilibili.com/video/BV1xx411c7mD?p=3)",
    ),
  );
  const iframe = getMedia(figure, "iframe");

  assert.equal(
    iframe.data.hProperties["data-video-src"],
    "https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&p=3",
  );
  assert.equal("src" in iframe.data.hProperties, false);
});

test("a non-exclusive video-looking phrase stays ordinary text", () => {
  const tree = transform("Read :video[Demo](/videos/demo.mp4) later.");

  assert.equal(tree.children[0].data, undefined);
});

test("a similarly named directive is not treated as a video directive", () => {
  const tree = transform(":videography[Demo](/videos/demo.mp4)");

  assert.equal(tree.children[0].data, undefined);
});

test("an invalid exclusive video directive fails with a source error", () => {
  assert.throws(
    () => transform(":video[Demo](/videos/demo.mp4) trailing"),
    /video directive must occupy its own line/,
  );
});

test("unsafe video protocols are rejected during Markdown processing", () => {
  assert.throws(
    () => transform(":video[Bad](javascript:alert(1))"),
    /video URL must use a safe protocol/,
  );
});

test("hosted video IDs must use the provider's safe ID alphabet", () => {
  assert.throws(
    () => transform(":video[Bad](https://youtube.com/watch?v=bad.id)"),
    /YouTube video URL is missing a video ID/,
  );
  assert.throws(
    () =>
      transform(":video[Bad](https://www.bilibili.com/video?bvid=not-a-BV)"),
    /Bilibili video URL is missing a BV ID/,
  );
  assert.throws(
    () => transform(":video[Bad](https://youtu.be/abc123/extra)"),
    /YouTube video URL is missing a video ID/,
  );
  assert.throws(
    () => transform(":video[Bad](https://www.youtube.com/embed/abc123/extra)"),
    /YouTube video URL is missing a video ID/,
  );
  assert.throws(
    () => transform(":video[Bad](https://www.bilibili.com/video/BVabc.more)"),
    /Bilibili video URL is missing a BV ID/,
  );
});

test("unknown HTTPS hosts remain native videos instead of becoming iframes", () => {
  const figure = getVideoFigure(
    transform(":video[Remote](https://cdn.example.com/demo.mp4)"),
  );

  assert.ok(getMedia(figure, "video"));
  assert.equal(
    figure.children.some((child) => child.data?.hName === "iframe"),
    false,
  );
});

test("video figures reserve a responsive 16:9 frame", () => {
  const figureRule = contentProseStyles.match(
    /\.content-page-body \.content-video-figure \{([\s\S]*?)\}/,
  )?.[1];
  const frameRule = contentProseStyles.match(
    /\.content-page-body \.content-video-frame \{([\s\S]*?)\}/,
  )?.[1];
  const mediaRule = contentProseStyles.match(
    /\.content-page-body \.content-video-frame :is\(video, iframe\) \{([\s\S]*?)\}/,
  )?.[1];
  const playRule = contentProseStyles.match(
    /\.content-page-body \.content-video-play \{([\s\S]*?)\}/,
  )?.[1];

  assert.ok(figureRule, "video figure rule is missing");
  assert.ok(frameRule, "video frame rule is missing");
  assert.ok(mediaRule, "video media rule is missing");
  assert.ok(playRule, "video play button rule is missing");
  assert.match(frameRule, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(figureRule, /width:\s*min\(100%/);
  assert.match(frameRule, /width:\s*100%/);
  assert.match(mediaRule, /position:\s*absolute/);
  assert.match(mediaRule, /width:\s*100%/);
  assert.match(mediaRule, /height:\s*100%/);
  assert.match(playRule, /position:\s*absolute/);
});

test("the template renders a live video preview outside its syntax code block", () => {
  const sourceOutsideFences = templateSource.replace(/^```[\s\S]*?^```$/gm, "");

  assert.match(
    sourceOutsideFences,
    /:video\[Flower demo\]\(https:\/\/interactive-examples\.mdn\.mozilla\.net\/media\/cc0-videos\/flower\.mp4\)/,
  );
});
