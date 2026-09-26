const AUTH_ATTEMPT_KEY = "sink.quick-create.auth-attempt";

function parseCurrentRequest() {
  const pathname = window.location.pathname.replace(/^\/+/, "");
  const separator = pathname.indexOf("/");
  if (separator <= 0) throw new Error("Invalid quick-create URL.");

  const slug = decodeURIComponent(pathname.slice(0, separator));
  let target = pathname.slice(separator + 1);

  if (!/^https?:\/\//i.test(target)) {
    target = decodeURIComponent(target);
  }

  target += window.location.search;
  target += window.location.hash;

  const url = new URL(target);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS target URLs are supported.");
  }

  return { slug, url: url.toString() };
}

function originalPath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function setStatus(message) {
  document.querySelector("#status").textContent = message;
}

function showResult(shortLink) {
  const result = document.querySelector("#result");
  const input = document.querySelector("#short-link");
  const button = document.querySelector("#copy");

  input.value = shortLink;
  result.classList.add("visible");

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shortLink);
      button.textContent = "Copied";
    } catch {
      input.focus();
      input.select();
      button.textContent = "Select all";
    }
  });
}

async function requireAccessLogin() {
  const returnTo = originalPath();
  const previousAttempt = sessionStorage.getItem(AUTH_ATTEMPT_KEY);

  if (previousAttempt === returnTo) {
    sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
    setStatus("Cloudflare Access login is required, but the login session was not accepted.");
    return;
  }

  sessionStorage.setItem(AUTH_ATTEMPT_KEY, returnTo);
  window.location.replace(`/dashboard/quick-auth?return=${encodeURIComponent(returnTo)}`);
}

async function createShortLink() {
  const payload = parseCurrentRequest();
  const response = await fetch("/api/link/quick-create", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    await requireAccessLogin();
    return;
  }

  if (response.status === 409) {
    sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
    setStatus("That short-link slug already exists.");
    return;
  }

  if (!response.ok) {
    sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
    let detail = `Request failed with HTTP ${response.status}.`;
    try {
      const body = await response.json();
      if (body && typeof body.statusMessage === "string") detail = body.statusMessage;
      else if (body && typeof body.message === "string") detail = body.message;
    } catch {}
    throw new Error(detail);
  }

  const data = await response.json();
  if (!data || typeof data.shortLink !== "string") {
    throw new Error("Sink returned an invalid quick-create response.");
  }

  sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
  history.replaceState(null, "", data.shortLink);
  setStatus("Created. This link expires in seven days.");
  showResult(data.shortLink);
}

createShortLink().catch((error) => {
  sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
  setStatus(error instanceof Error ? error.message : String(error));
});
