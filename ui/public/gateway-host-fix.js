(function () {
  try {
    var key = "clawdbot.control.settings.v1";
    var params = new URLSearchParams(window.location.search);
    var raw = localStorage.getItem(key);
    var o = raw ? JSON.parse(raw) : {};
    var changed = false;
    var strip = false;

    var tok = params.get("token");
    if (tok != null) {
      var tt = tok.trim();
      if (tt) {
        o.token = tt;
        changed = true;
      }
      params.delete("token");
      strip = true;
    }

    var explicitGatewayFromQuery = false;
    var gu = params.get("gatewayUrl");
    if (gu != null) {
      var gg = gu.trim();
      if (gg) {
        o.gatewayUrl = gg;
        explicitGatewayFromQuery = true;
        changed = true;
      }
      params.delete("gatewayUrl");
      strip = true;
    }

    var sess = params.get("session");
    if (sess != null) {
      var sk = sess.trim();
      if (sk) {
        o.sessionKey = sk;
        o.lastActiveSessionKey = sk;
        changed = true;
      }
      params.delete("session");
      strip = true;
    }

    var host = location.hostname;
    if (!explicitGatewayFromQuery && host !== "localhost" && host !== "127.0.0.1") {
      var wsUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host;
      var g = (o.gatewayUrl && String(o.gatewayUrl).trim()) || "";
      var needsFix = !g || /127\.0\.0\.1|localhost/.test(g);
      if (!needsFix && g) {
        try {
          needsFix = new URL(g).host !== location.host;
        } catch {
          needsFix = true;
        }
      }
      if (needsFix) {
        o.gatewayUrl = wsUrl;
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(key, JSON.stringify(o));
    }

    if (strip) {
      var next = params.toString();
      var u = new URL(window.location.href);
      u.search = next;
      window.history.replaceState({}, "", u.toString());
    }
  } catch {}
})();
