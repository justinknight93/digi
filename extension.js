const HTML = `
<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; overflow: hidden">
    <img
      id="digiImage"
      style="display: none"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAASUExURT8mMYubtFJgfCYrRMDL3AAAAISLNksAAAAGdFJOU///////ALO/pL8AAAAJcEhZcwAALiIAAC4iAari3ZIAAAAYdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuOWxu2j4AAAC2ZVhJZklJKgAIAAAABQAaAQUAAQAAAEoAAAAbAQUAAQAAAFIAAAAoAQMAAQAAAAIAAAAxAQIAEAAAAFoAAABphwQAAQAAAGoAAAAAAAAA35MEAOgDAADfkwQA6AMAAFBhaW50Lk5FVCA1LjEuOQADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA3NDKYIPKzAgAAAEVJREFUKFN9jEEOwCAQAhHd/3+5GbSHTVM5MROCakc7VWosHSFpkDMi4ZjGmUAG5iuAmKsYtrHt0B+hf8FBX9CvYtGXQw+8IAEiEJ5xyAAAAABJRU5ErkJggg=="
    />
    <canvas
      id="game"
      style="display: block; width: 100%; height: 100vh"
    ></canvas>
    <script>
      const JOY_COLOR = "#308530";
      const LOW_JOY_COLOR = "#baba41";
      const CRITICAL_JOY_COLOR = "#c73e3e";
      const BACKGROUND_COLOR = "#a7bbe1";
      const JOY_DRAIN_RATE = 0.001; //0.00001235;
      const vscode = acquireVsCodeApi();
      function sendMessage(text) {
        vscode.postMessage({
          command: "showMessage",
          text,
        });
      }
      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.type === "joy") {
          digi.joy += 0.001;
          if (digi.joy > 1) digi.joy = 1;
        }
      });

      const canvas = document.querySelector("#game");
      canvas.style.backgroundColor = BACKGROUND_COLOR;
      const digiImage = document.querySelector("#digiImage");
      const animations = {
        HIDDEN: -1,
        NONE: 0,
        HOPPING: 1,
      };
      const DIGI_DEFAULT = {
        name: null,
        x: 64,
        y: 0,
        flip: 0,
        animation: animations.HIDDEN,
        targetX: 64,
        joy: 1,
        timeAlive: 0,
      };
      let digi = { ...DIGI_DEFAULT };
      const ctx = canvas.getContext("2d");
      let frame = 0;

      function closeTo(x, y, x2, y2, distance) {
        const dx = x2 - x;
        const dy = y2 - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= distance;
      }

      function drawDigi(ctx, digi, jumpHeight) {
        ctx.save();

        if (digi.flip === 1) {
          // Flip around the vertical axis
          ctx.translate(digi.x + 16, digi.y - jumpHeight); // move to sprite position
          ctx.scale(-1, 1); // flip horizontally
          ctx.drawImage(digiImage, 0, 0, 16, 16); // draw at origin
        } else {
          // Normal
          ctx.drawImage(digiImage, digi.x, digi.y - jumpHeight, 16, 16);
        }

        ctx.restore();
      }

      function getLevel() {
        const baseTime = 600; // 10 minutes in seconds (level 1→2)

        let level = 1;
        let required = baseTime;

        while (digi.timeAlive >= required) {
          level++;
          required *= 10;
        }

        return level;
      }

      // update canvas with some information and animation
      const fps = new FpsCtrl(30, function (e) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (digi.animation == animations.HIDDEN) return;

        // vpet name and level
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#000000"; // Or any color you want
        ctx.fillText(\`${digi.name} (Lv. ${getLevel()})\`, 10, 10);

        // vpet stats
        switch (true) {
          case digi.joy < 0.25:
            ctx.fillStyle = CRITICAL_JOY_COLOR;
            break;
          case digi.joy < 0.5:
            ctx.fillStyle = LOW_JOY_COLOR;
            break;
          default:
            ctx.fillStyle = JOY_COLOR;
        }

        ctx.fillRect(10, 20, (canvas.width - 20) * digi.joy, 10);
        digi.joy -= JOY_DRAIN_RATE;
        if (digi.joy <= 0) {
          digi.joy = 0;
          gameOver();
          return;
        }

        // animation and movement
        switch (digi.animation) {
          case animations.NONE:
            drawDigi(ctx, digi, 0);
            break;
          case animations.HOPPING:
            const radians = frame * 1;
            const raw = Math.sin(radians);
            const wave = raw + 1;
            const jumpHeight = wave;
            drawDigi(ctx, digi, jumpHeight);
            break;
        }

        if (closeTo(digi.x, 0, digi.targetX, 0, 2)) {
          digi.animation = animations.NONE;
          if (Math.random() < 0.001 + 0.02 * digi.joy) {
            digi.targetX = (canvas.width - 32) * Math.random() + 16;
          }
        } else {
          digi.animation = animations.HOPPING;
          if (digi.x < digi.targetX) {
            digi.x++;
            digi.flip = 0;
          } else {
            digi.x--;
            digi.flip = 1;
          }
        }

        frame = (frame + 1) % 1200;
      });

      // start the loop
      fps.start();

      function FpsCtrl(fps, callback) {
        let delay = 1000 / fps,
          time = null,
          frame = -1,
          tref;

        function loop(timestamp) {
          if (time === null) time = timestamp;
          let seg = Math.floor((timestamp - time) / delay);
          if (seg > frame) {
            frame = seg;
            callback({
              time: timestamp,
              frame: frame,
            });
          }
          tref = requestAnimationFrame(loop);
        }

        this.isPlaying = false;

        this.frameRate = function (newfps) {
          if (!arguments.length) return fps;
          fps = newfps;
          delay = 1000 / fps;
          frame = -1;
          time = null;
        };

        this.start = function () {
          if (!this.isPlaying) {
            this.isPlaying = true;
            tref = requestAnimationFrame(loop);
          }
        };

        this.pause = function () {
          if (this.isPlaying) {
            cancelAnimationFrame(tref);
            this.isPlaying = false;
            time = null;
            frame = -1;
          }
        };
      }

      function save() {
        digi.timeAlive++;
        localStorage.setItem("digi", JSON.stringify(digi));
      }

      function load() {
        try {
          digi = { ...digi, ...JSON.parse(localStorage.getItem("digi")) };
        } catch {
          // no save data
        }
      }

      function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        digi.y = canvas.height - 16;
      }

      function name() {
        if (!digi.name) {
          const d = document.createElement("dialog");
          d.innerHTML = \`
                  <form method="dialog">
                    <div>Name your Digi:</div>
                    <input id="digiNameInput" autofocus required/>
                    <button>OK</button>
                  </form>
                \`;
          d.addEventListener("close", () => {
            const name = d.querySelector("#digiNameInput").value.trim();
            if (name) {
              digi.name = name;
              digi.animation = 0;
              d.remove();
            }
          });
          document.body.appendChild(d);
          d.showModal();
        }
      }

      function gameOver() {
        sendMessage(\`Your Digi, ${digi.name}, ran away.\`);
        digi.animation = animations.HIDDEN;
        const d = document.createElement("dialog");
        d.innerHTML = \`
                  <form method="dialog">
                    <div>Your Digi, ${
                      digi.name
                    }, ran away at level ${getLevel()}.</div>
                    <button>Get a new Digi</button>
                  </form>
                \`;
        d.addEventListener("close", () => {
          digi = { ...DIGI_DEFAULT };
          name();
          d.remove();
        });
        document.body.appendChild(d);
        d.showModal();
      }

      window.addEventListener("resize", resize);
      setInterval(save, 1000);
      resize();
      load();
      name();
    </script>
  </body>
</html>

`;

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = new MyWebviewViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("digi.main", provider)
  );

  // Listen for typing
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const change of event.contentChanges) {
        provider.sendJoy("code updated");
      }
    })
  );
}

class MyWebviewViewProvider {
  constructor(context) {
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView; // keep reference!
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = HTML;

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "showMessage") {
        vscode.window.showInformationMessage(message.text);
      }
    });
  }

  sendJoy(reason) {
    if (this._view) {
      this._view.webview.postMessage({ type: "joy", reason });
    }
  }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
