import assert from "node:assert/strict";
import test from "node:test";
import { activateVideoPlayer } from "../src/scripts/home-shell-content-video.ts";

function createFakeVideoFrame() {
  const attributes = new Map([["data-video-src", "/videos/demo.mp4"]]);
  const calls = [];
  const media = {
    tagName: "VIDEO",
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    load() {
      calls.push("load");
    },
    play() {
      calls.push("play");
      return Promise.resolve();
    },
  };
  const button = { hidden: false };
  const sourceLink = { hidden: true };
  const error = { hidden: true };

  return {
    calls,
    media,
    button,
    sourceLink,
    error,
    dataset: {},
    querySelector(selector) {
      if (selector === "[data-video-src]") return media;
      if (selector === "[data-video-play='true']") return button;
      if (selector === "[data-video-source-link='true']") return sourceLink;
      if (selector === "[data-video-error='true']") return error;
      return null;
    },
  };
}

test("activating a native video sets its source only on demand", async () => {
  const frame = createFakeVideoFrame();

  assert.equal(frame.media.getAttribute("src"), null);
  activateVideoPlayer(frame);
  await Promise.resolve();

  assert.equal(frame.media.getAttribute("src"), "/videos/demo.mp4");
  assert.deepEqual(frame.calls, ["load", "play"]);
  assert.equal(frame.button.hidden, true);
  assert.equal(frame.dataset.videoState, "ready");
});

test("activation tolerates browsers that reject scripted playback", async () => {
  const frame = createFakeVideoFrame();
  frame.media.play = () => Promise.reject(new Error("autoplay blocked"));

  activateVideoPlayer(frame);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(frame.media.getAttribute("src"), "/videos/demo.mp4");
  assert.equal(frame.button.hidden, true);
  assert.equal(frame.error.hidden, true);
});

test("activation tolerates browsers that throw from scripted playback", () => {
  const frame = createFakeVideoFrame();
  frame.media.play = () => {
    throw new Error("play unavailable");
  };

  assert.doesNotThrow(() => activateVideoPlayer(frame));
  assert.equal(frame.media.getAttribute("src"), "/videos/demo.mp4");
  assert.equal(frame.button.hidden, true);
  assert.equal(frame.dataset.videoState, "ready");
});
