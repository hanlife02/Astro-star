const endpoint = "/api/subscriptions/preferences";
interface SubscriptionResult {
  message: string;
  next?: "confirm" | "unsubscribe" | "request-unsubscribe";
}

class SubscriptionDialog extends HTMLElement {
  private cleanup?: () => void;

  connectedCallback() {
    const dialog = this.querySelector("dialog")!;
    const trigger = this.closest(
      "[data-home-shell-root]",
    )!.querySelector<HTMLButtonElement>(
      `button[aria-controls="${dialog.id}"]`,
    )!;
    const channels = dialog.querySelector<HTMLElement>(".channels")!;
    const buttons = channels.querySelectorAll<HTMLButtonElement>("button");
    const telegram = channels.querySelector("a")!;
    const forms = dialog.querySelectorAll<HTMLFormElement>("form");
    const status = dialog.querySelector<HTMLElement>('[role="status"]')!;
    const manage = dialog.querySelector<HTMLButtonElement>("[data-manage]")!;
    const listeners = new AbortController();
    const events = { signal: listeners.signal };
    let pending: AbortController | undefined;
    let nextRequest: URLSearchParams | undefined;

    function resetForms() {
      nextRequest = undefined;
      manage.hidden = true;
      for (const form of forms) {
        form.hidden = true;
        form.reset();
        form.querySelector("button")!.disabled = false;
      }
      for (const button of buttons)
        button.setAttribute("aria-pressed", "false");
    }

    async function request(body?: URLSearchParams) {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      try {
        const response = await fetch(endpoint, {
          method: body ? "POST" : "GET",
          body,
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.message || "Request failed. Please try again.",
          );
        return result;
      } catch (error) {
        if (!controller.signal.aborted)
          status.textContent =
            error instanceof Error
              ? error.message
              : "Request failed. Please try again.";
      }
    }

    function showResult(result: SubscriptionResult, fields: URLSearchParams) {
      status.textContent = result.message;
      nextRequest = undefined;
      if (result.next === "request-unsubscribe") {
        nextRequest = new URLSearchParams(fields);
        nextRequest.set("intent", "unsubscribe");
        manage.textContent = "Send unsubscribe link";
      } else if (result.next) {
        nextRequest = new URLSearchParams({
          action: result.next,
          token: fields.get("token")!,
        });
        manage.textContent =
          result.next === "confirm" ? "Confirm subscription" : "Unsubscribe";
      }
      manage.hidden = !nextRequest;
    }

    async function manageSubscription(fields: URLSearchParams) {
      manage.disabled = true;
      const result = await request(fields);
      if (result) showResult(result, fields);
      manage.disabled = false;
    }

    async function open(token = "") {
      resetForms();
      channels.hidden = Boolean(token);
      for (const button of buttons) button.disabled = true;
      telegram.removeAttribute("href");
      telegram.setAttribute("aria-disabled", "true");
      status.textContent = "Loading…";
      if (!dialog.open) dialog.showModal();
      if (token) {
        await manageSubscription(
          new URLSearchParams({ action: "manage", token }),
        );
        return;
      }
      const settings = await request();
      if (!settings) return;
      for (const button of buttons)
        button.disabled = !settings[button.dataset.channel!];
      if (settings.telegram) {
        telegram.href = `https://t.me/${settings.telegram}?start=subscribe`;
        telegram.removeAttribute("aria-disabled");
      }
      status.textContent =
        settings.email || settings.bark || settings.telegram
          ? ""
          : "No subscription channels are enabled.";
    }

    function openLink() {
      if (location.pathname !== "/") return;
      const hash = location.hash;
      if (hash !== "#subscribe" && !hash.startsWith("#subscribe=")) return;
      const linkToken =
        new URLSearchParams(hash.slice(1)).get("subscribe") ?? "";
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      void open(linkToken);
    }

    trigger.addEventListener("click", () => void open(), events);
    dialog
      .querySelector("[data-close]")!
      .addEventListener("click", () => dialog.close(), events);
    dialog.addEventListener(
      "click",
      (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dialog.close();
      },
      events,
    );
    dialog.addEventListener(
      "close",
      () => {
        pending?.abort();
        resetForms();
      },
      events,
    );
    manage.addEventListener(
      "click",
      () => {
        if (nextRequest) void manageSubscription(nextRequest);
      },
      events,
    );

    for (const button of buttons) {
      button.addEventListener(
        "click",
        () => {
          pending?.abort();
          resetForms();
          status.textContent = "";
          button.setAttribute("aria-pressed", "true");
          const form = dialog.querySelector<HTMLFormElement>(
            `[data-channel-form="${button.dataset.channel}"]`,
          )!;
          form.hidden = false;
          form.querySelector("input")!.focus();
        },
        events,
      );
    }
    for (const form of forms) {
      form.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();
          const submit = form.querySelector("button")!;
          if (submit.disabled) return;
          submit.disabled = true;
          status.textContent = "Sending…";
          const fields = new URLSearchParams({
            action: form.dataset.channelForm!,
            destination: form.querySelector("input")!.value,
          });
          const result = await request(fields);
          if (result) {
            resetForms();
            showResult(result, fields);
          }
          submit.disabled = false;
        },
        events,
      );
    }
    window.addEventListener("hashchange", openLink, events);
    document.addEventListener("astro:page-load", openLink, events);
    this.cleanup = () => {
      listeners.abort();
      pending?.abort();
    };
    openLink();
  }

  disconnectedCallback() {
    this.cleanup?.();
  }
}

customElements.define("subscription-dialog", SubscriptionDialog);
