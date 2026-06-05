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
    console.error("Veriler alınamadı:", e);
  }

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #000; }
      #player { width: 100%; height: 100vh; position: relative; }

      #ad-timer, #skip-btn {
        position: absolute;
        right: 10px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 9999;
      }

      #ad-timer { bottom: 40px; }

      #skip-btn {
        bottom: 10px;
        display: none;
        cursor: pointer;
        background: #d33;
      }

      #loading-screen {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
        flex-direction: column;
        gap: 16px;
      }

      #loading-screen .spinner {
        width: 48px; height: 48px;
        border: 4px solid #333;
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      #loading-screen p {
        color: #aaa;
        font-family: Arial, sans-serif;
        font-size: 14px;
        margin: 0;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
    <script src="/assets/js/clappr.js"></script>
  </head>
  <body>
    <div id="player">
      <div id="loading-screen">
        <div class="spinner"></div>
        <p>Yayın yükleniyor...</p>
      </div>
      <div id="ad-timer" style="display:none;"></div>
      <div id="skip-btn" onclick="skipAd()">Reklamı Atla</div>
    </div>

    <script>
      const id = "${id}";
      const reklamVideo = "${reklamVideo}";
      const reklamSure = ${reklamSure};
      const reklamDurum = ${reklamDurum};

      // ✅ Worker URL — burası güncellendi
      const WORKER_URL = "https://ahbe.yedeklinksa35.workers.dev/stream";

      let adPlayer = null;
      let countdown = null;

      function hideLoading() {
        const el = document.getElementById("loading-screen");
        if (el) el.style.display = "none";
      }

      function showError(msg) {
        hideLoading();
        document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:20px'>" + msg + "</h2>";
      }

      function startMainPlayer(mainUrl) {
        mainUrl = mainUrl.replace(/edge4\./g, "edge3.");
        hideLoading();

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
        mainUrl = mainUrl.replace(/edge4\./g, "edge3.");
        window.mainStreamUrl = mainUrl;

        if (reklamDurum === 1 && reklamVideo && reklamSure > 0) {
          hideLoading();

          adPlayer = new Clappr.Player({
            source: reklamVideo,
            parentId: "#player",
            autoPlay: true,
            width: "100%",
            height: "100%"
          });

          const timerDiv = document.getElementById("ad-timer");
          const skipBtn = document.getElementById("skip-btn");

          let remaining = reklamSure;
          timerDiv.style.display = "block";
          timerDiv.innerText = "Reklamın bitmesine kalan süre: " + remaining + " saniye";

          countdown = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
              clearInterval(countdown);
              adPlayer.destroy();
              timerDiv.style.display = "none";
              skipBtn.style.display = "none";
              startMainPlayer(mainUrl);
            } else {
              timerDiv.innerText = "Reklamın bitmesine kalan süre: " + remaining + " saniye";
              if (remaining <= reklamSure - 5) skipBtn.style.display = "block";
            }
          }, 1000);

        } else {
          startMainPlayer(mainUrl);
        }
      }

      async function loadStream(id) {
        if (!id) {
          showError("ID eksik");
          return;
        }

        try {
          // ✅ Artık Worker üzerinden gidiyor — cache + rate limit koruması var
          const res = await fetch(WORKER_URL + "?id=" + encodeURIComponent(id));

          if (!res.ok) {
            showError("Yayın bulunamadı");
            return;
          }

          const data = await res.json();

          if (data.url) {
            console.log("Stream source:", data.source, "| Cache:", data.cache);
            startAdThenMain(data.url);
          } else {
            showError("Yayın bulunamadı");
          }

        } catch (err) {
          console.error("Yayın yüklenirken hata:", err);
          showError("Yayın hatası");
        }
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
