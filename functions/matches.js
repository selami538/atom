export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");

  let playerLogo = "";
  let playerLogoyer = "";
  let playerSite = "";
  let reklamVideo = "";
  let reklamSure = 0;
  let reklamDurum = 0;
  let playerPoster = "";

  try {
    const res2 = await fetch("https://panelatom.corepanel.pro/api/verirepo.php");
    const json = await res2.json();

    if (json.playerlogo) {
      if (json.playerlogo.player_logo) playerLogo = json.playerlogo.player_logo;
      if (json.playerlogo.player_logoyeriki) playerLogoyer = json.playerlogo.player_logoyeriki;
      if (json.playerlogo.player_site) playerSite = json.playerlogo.player_site;
      if (json.playerlogo.player_reklamvideo) reklamVideo = json.playerlogo.player_reklamvideo;
      if (json.playerlogo.player_reklamsure) reklamSure = parseInt(json.playerlogo.player_reklamsure);
      if (json.playerlogo.player_reklamdurum) reklamDurum = parseInt(json.playerlogo.player_reklamdurum);
      if (json.playerlogo.player_arkaplan) playerPoster = json.playerlogo.player_arkaplan;
    }
  } catch (e) {
    console.error("Veriler alinamadi:", e);
  }

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { margin: 0; padding: 0; background: #000; }
      #player { width: 100%; height: 100vh; position: relative; }
      #ad-timer, #skip-btn {
        position: absolute; right: 10px;
        background: rgba(0,0,0,0.75); color: #fff;
        padding: 8px 12px; border-radius: 8px;
        font-family: Arial, sans-serif; font-size: 14px; z-index: 9999;
      }
      #ad-timer { bottom: 40px; }
      #skip-btn { bottom: 10px; display: none; cursor: pointer; background: #d33; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
    <script src="/assets/js/clappr.js"></script>
  </head>
  <body>
    <div id="player">
      <div id="ad-timer" style="display: none;"></div>
      <div id="skip-btn" onclick="skipAd()">Reklami Atla</div>
    </div>
    <script>
      const id = "${id}";
      const reklamVideo = "${reklamVideo}";
      const reklamSure = ${reklamSure};
      const reklamDurum = ${reklamDurum};
      let adPlayer = null;
      let countdown = null;

      // ── BIZIM SISTEM: cache'li, iPhone-uyumlu Worker URL'i ──
    const STREAM_BASE = "https://ts.yedeklinksa35.workers.dev/ott/";

      function startMainPlayer(mainUrl) {
        const options = {
          source: mainUrl,
          parentId: "#player",
          autoPlay: true,
          width: "100%",
          height: "100%",
          mimeType: "application/x-mpegURL"
        };
        ${playerLogo ? `options.watermark = "${playerLogo}";` : ""}
        ${playerSite ? `options.watermarkLink = "${playerSite}";` : ""}
        ${playerLogoyer ? `options.position = "${playerLogoyer}";` : ""}
        ${playerPoster ? `options.poster = "${playerPoster}";` : ""}
        new Clappr.Player(options);
      }

      function skipAd() {
        if (adPlayer) adPlayer.destroy();
        clearInterval(countdown);
        document.getElementById("ad-timer").style.display = "none";
        document.getElementById("skip-btn").style.display = "none";
        startMainPlayer(window.mainStreamUrl);
      }

      function startAdThenMain(mainUrl) {
        window.mainStreamUrl = mainUrl;
        if (reklamDurum === 1 && reklamVideo && reklamSure > 0) {
          adPlayer = new Clappr.Player({
            source: reklamVideo, parentId: "#player",
            autoPlay: true, width: "100%", height: "100%"
          });
          const timerDiv = document.getElementById("ad-timer");
          const skipBtn = document.getElementById("skip-btn");
          let remaining = reklamSure;
          timerDiv.style.display = "block";
          timerDiv.innerText = "Reklamin bitmesine kalan sure: " + remaining + " saniye";
          countdown = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
              clearInterval(countdown);
              adPlayer.destroy();
              timerDiv.style.display = "none";
              skipBtn.style.display = "none";
              startMainPlayer(mainUrl);
            } else {
              timerDiv.innerText = "Reklamin bitmesine kalan sure: " + remaining + " saniye";
              if (remaining <= reklamSure - 5) skipBtn.style.display = "block";
            }
          }, 1000);
        } else {
          startMainPlayer(mainUrl);
        }
      }

      function loadStream(id) {
        if (!id) {
          document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:20px'>ID eksik</h2>";
          return;
        }
        // Direkt bizim Worker URL'i — API'ye gerek yok, cache'li ve iPhone uyumlu
        const streamUrl = STREAM_BASE + encodeURIComponent(id) + ".m3u8";
        startAdThenMain(streamUrl);
      }

      document.addEventListener("DOMContentLoaded", () => {
        loadStream(id);
      });
    </script>
  </body>
</html>
`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" }
  });
}
