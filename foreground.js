console.log("its coupang");
class InjectionMessager {
  constructor(dataType) {
    this.dataType = dataType;
    this.onMessage = null;
    this.callbacks = {};

    window.addEventListener("message", async (event) => {
      if (event.source != window) return;
      if (event.data.type != this.dataType) return;

      if (event.data.act == "response" && event.data.id) {
        let callback = this.callbacks[event.data.id];
        if (callback) callback(event.data.params);
        else {
        }
      } else if (this.onMessage) {
        const sendResponse = (params) => this.sendResponse(event.data.id, params);
        this.onMessage(event.data, sendResponse);
      }
    });
  }

  sendResponse(id, params) {
    window.postMessage(
      {
        type: this.dataType,
        act: "response",
        params: params,
        id: id,
      },
      "*"
    );
  }

  sendPost(act, params) {
    return new Promise((resolve, reject) => {
      let id = this.generateId(10);
      let callback = function (res) {
        resolve(res);
      };

      this.callbacks[id] = callback;
      window.postMessage(
        {
          type: this.dataType,
          act: act,
          params: params,
          id: id,
        },
        "*"
      );
    });
  }

  generateId(length) {
    let result = "";
    let line = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 1; i <= length; i++) {
      let c = Math.floor(Math.random() * line.length);
      result += line.charAt(c);
    }

    return result;
  }
}

function injectScript(src) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(src);
  // script.type = "module"; // <-- Add this line for ESM module support
  // script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
}

function sendPost(act, params) {
  window.postMessage(
    {
      type: "coupang_ranker_extension",
      act: act,
      params: params,
    },
    "*"
  );
}

function sendServer(act, params) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        act: act,
        params: params,
      },
      (res) => resolve(res)
    );
  });
}

async function load(sendResponse) {
  let data = await messager.sendPost("load");
  console.log(`loaded: ${data}`);
  sendResponse(data);
}

// 메인
const messager = new InjectionMessager("coupang_ranker_extension");

// popup에서 요청 받음
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.act == "load") {
    load(sendResponse);
  }

  return true;
});

// 인젝션 적용
injectScript("./injection.js");
console.log("trying injection lesgo");
