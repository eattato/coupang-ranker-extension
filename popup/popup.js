function sendServer(act, params) {
  return new Promise((resolve, reject) => {
    function onResponse(response) {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError));
      else resolve(response);
    }

    const data = { act: act, params: params };
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, data, onResponse);
    });
  });
}

// 진행
async function load() {
  let loadingFrame = document.querySelector(".loading");
  let loadFailedFrame = document.querySelector(".load_failed");
  let mainFrame = document.querySelector(".main");
  let loadResult = null;

  try {
    loadResult = await sendServer("load");
  } catch (error) {
    console.error(error);
  }

  loadingFrame.classList.add("hidden");
  if (!loadResult) {
    loadFailedFrame.classList.remove("hidden");
    return false;
  }

  mainFrame.classList.remove("hidden");
  return true;
}

async function main() {
  await load();
}

// 메인
addEventListener("DOMContentLoaded", function () {
  main();
});
