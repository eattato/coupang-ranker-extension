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

function htmlToNode(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const nNodes = template.content.childNodes.length;
  if (nNodes !== 1) {
    throw new Error(
      `html parameter must represent a single node; got ${nNodes}. ` +
        "Note that leading or trailing spaces around an element in your " +
        'HTML, like " <img/> ", get parsed as text nodes neighbouring ' +
        "the element; call .trim() on your input to avoid this."
    );
  }
  return template.content.firstChild;
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

  let ul = document.querySelector(".main_bottom > ul");
  for (let productData of loadResult) {
    let li = htmlToNode(`
    <li>
      <div class="product_left">
        <img class="product_image" />
      </div>
      <div class="product_right">
        <div class="product_name"></div>
        <div class="product_price_total"></div>
      </div>
    </li>
    `);

    console.log(li);
    let productName = li.querySelector(".product_name");
    let productPriceTotal = li.querySelector(".product_price_total");
    // let productPriceUnit = li.querySelector(".product_price_unit");
    productName.textContent = productData.name;

    let unitText = `(${productData.unitData.unitForm}/${productData.unitData.pricePerUnit}원)`;
    productPriceTotal.textContent = `${productData.price + productData.feePrice}원${unitText}`;
    // productPriceUnit.textContent = unitText;
    ul.appendChild(li);
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
