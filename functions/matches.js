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
    if (res2.ok) {
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
    }
  } catch (e) {
    console.error("Panel verisi alınamadı:", e);
  }

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #000; overflow: hidden; }
      #player { width: 100vw; height: 100vh; position: relative; }

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
        border: none;
        outline: none;
      }

      #skip-btn:hover { background: #ff4444; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
    <script src="/assets/js/clappr.js"></script>
  </head>
  <body>
    <div id="player">
      <div id="ad-timer" style="display:none;"></div>
      <button id="skip-btn" onclick="skipAd()">Reklamı Atla</button>
    </div>

    <script>
      const KANAL_ID     = ${JSON.stringify(id || "")};
      const reklamVideo  = ${JSON.stringify(reklamVideo)};
      const reklamSure   = ${reklamSure};
      const reklamDurum  = ${reklamDurum};
      const playerLogo   = ${JSON.stringify(playerLogo)};
      const playerSite   = ${JSON.stringify(playerSite)};
      const playerLogoyer = ${JSON.stringify(playerLogoyer)};
      const playerPoster  = ${JSON.stringify(playerPoster)};

      let adPlayer   = null;
      let mainPlayer = null;
      let countdown  = null;

      function showError(msg) {
        document.getElementById("player").innerHTML =
          '<p style="color:white;text-align:center;margin-top:20px;font-family:Arial;font-size:18px">' + msg + '</p>';
      }

      function startMainPlayer(mainUrl) {
        if (!mainUrl) { showError("Yayın bulunamadı"); return; }
        console.log("Ana yayın başlatılıyor:", mainUrl);

        try {
          const options = {
            source: mainUrl,
            parentId: "#player",
            autoPlay: true,
            width: "100%",
            height: "100%",
            mimeType: "application/x-mpegURL",
            hlsjsConfig: {
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90
            }
          };

          if (playerLogo)     options.watermark     = playerLogo;
          if (playerSite)     options.watermarkLink  = playerSite;
          if (playerLogoyer)  options.position       = playerLogoyer;
          if (playerPoster)   options.poster         = playerPoster;

          mainPlayer = new Clappr.Player(options);

          mainPlayer.on(Clappr.Events.PLAYER_ERROR, function(e) {
            console.error("Player hatası:", e);
            showError("Yayın yüklenirken bir hata oluştu.");
          });
        } catch(e) {
          console.error("Player oluşturulamadı:", e);
          showError("Player başlatılamadı.");
        }
      }

      function skipAd() {
        if (adPlayer) { try { adPlayer.destroy(); } catch(e) {} adPlayer = null; }
        clearInterval(countdown);
        document.getElementById("ad-timer").style.display = "none";
        document.getElementById("skip-btn").style.display = "none";
        startMainPlayer(window._mainUrl);
      }

      function startAdThenMain(mainUrl) {
        window._mainUrl = mainUrl;

        if (reklamDurum === 1 && reklamVideo && reklamSure > 0) {
          try {
            adPlayer = new Clappr.Player({
              source: reklamVideo,
              parentId: "#player",
              autoPlay: true,
              width: "100%",
              height: "100%"
            });

            const timerDiv = document.getElementById("ad-timer");
            const skipBtn  = document.getElementById("skip-btn");

            let remaining = reklamSure;
            timerDiv.style.display = "block";
            timerDiv.innerText = "Reklamın bitmesine: " + remaining + " sn";

            countdown = setInterval(() => {
              remaining--;
              if (remaining <= 0) {
                clearInterval(countdown);
                try { adPlayer.destroy(); } catch(e) {}
                timerDiv.style.display = "none";
                skipBtn.style.display  = "none";
                startMainPlayer(mainUrl);
              } else {
                timerDiv.innerText = "Reklamın bitmesine: " + remaining + " sn";
                if (remaining <= reklamSure - 5) skipBtn.style.display = "block";
              }
            }, 1000);

            adPlayer.on(Clappr.Events.PLAYER_ENDED, function() {
              clearInterval(countdown);
              timerDiv.style.display = "none";
              skipBtn.style.display  = "none";
              startMainPlayer(mainUrl);
            });

          } catch(e) {
            console.error("Reklam player hatası:", e);
            startMainPlayer(mainUrl);
          }
        } else {
          startMainPlayer(mainUrl);
        }
      }

      async function loadStream() {
        if (!KANAL_ID) { showError("ID eksik"); return; }

        let streamUrl = "";

        // 1. Kaynak: teletv3
        try {
          console.log("teletv3 isteği atılıyor...");
          const res1 = await fetch(
            "https://teletv3.top/load/yayinlink.php?id=" + encodeURIComponent(KANAL_ID),
            { signal: AbortSignal.timeout(8000) }
          );
          if (res1.ok) {
            const data1 = await res1.json();
            console.log("teletv3 yanıtı:", data1);
            if (data1?.deismackanal && data1.deismackanal.includes("m3u8")) {
              streamUrl = data1.deismackanal.replace(/edge\\d+/g, "edge3");
              console.log("teletv3'ten URL alındı:", streamUrl);
            }
          } else {
            console.warn("teletv3 HTTP hatası:", res1.status);
          }
        } catch(e) {
          console.warn("teletv3 isteği başarısız:", e.message);
        }

        // 2. Kaynak: cinema (teletv3 başarısız olursa)
        if (!streamUrl) {
          try {
            console.log("cinema isteği atılıyor...");
            const res2 = await fetch("https://streamsport365.com/cinema", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Origin": "https://streamsport365.com",
                "Referer": "https://streamsport365.com/"
              },
              body: JSON.stringify({
                AppId: "5000",
                AppVer: "1",
                VpcVer: "1.0.12",
                Language: "en",
                Token: "",
                VideoId: KANAL_ID
              }),
              signal: AbortSignal.timeout(8000)
            });

            console.log("cinema HTTP status:", res2.status);

            if (res2.ok) {
              const data2 = await res2.json();
              console.log("cinema yanıtı:", data2);
              if (data2?.URL) {
                streamUrl = data2.URL.replace(/edge\\d+/g, "edge3");
                console.log("cinema'dan URL alındı:", streamUrl);
              } else {
                console.warn("cinema URL boş döndü:", data2);
              }
            } else {
              const errText = await res2.text();
              console.warn("cinema HTTP hatası:", res2.status, errText);
            }
          } catch(e) {
            console.warn("cinema isteği başarısız:", e.message);
          }
        }

        if (streamUrl) {
          startAdThenMain(streamUrl);
        } else {
          showError("Yayın bulunamadı. Lütfen daha sonra tekrar deneyin.");
        }
      }

      document.addEventListener("DOMContentLoaded", loadStream);
    </script>
  </body>
</html>
`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
