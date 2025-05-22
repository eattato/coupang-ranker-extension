console.log("and yes am injected");
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

function parseUnit(data) {
  try {
    let totalPrice = data.price + data.feePrice;
    let unit = 0;
    let amount = 0;
    let unitForm = null;
    let amountForm = null;

    let split = [];
    if (data.unitPrice) {
      split = data.unitPrice.slice(1, -2).split(" ");
      unit = split[0].slice(0, -1);
      amount = "1";
      totalPrice = split[1].replace(",", "");
      totalPrice = Number(totalPrice.match(/\d+(\.\d+)?/g)?.[0] ?? 0);
    } else {
      split = data.name.split(", ");
      if (split < 3) split = data.name.split(" "); // 일단 띄어쓰기라도 구분
      if (split >= 3) {
        unit = split[split.length - 2];
        amount = split[split.length - 1];
      } else throw new Error("failed to parse: invalid format"); // 파싱 실패
    }

    unitForm = unit.replace(/\d+(\.\d+)?/g, "").toLowerCase();
    unit = Number(unit.match(/\d+(\.\d+)?/g)?.[0] ?? 0);
    amountForm = amount.replace(/\d+(\.\d+)?/g, "");
    amount = Number(amount.match(/\d+(\.\d+)?/g)?.[0] ?? 0);

    let availableUnits = ["ml", "l", "g", "kg"];
    if (!availableUnits.includes(unitForm))
      throw new Error(`failed to parse: invalid unit ${unitForm}(${split})`);

    if (unitForm == "l") {
      unit *= 1000;
      unitForm = "ml";
    } else if (unitForm == "kg") {
      unit *= 1000;
      unitForm = "g";
    }

    let pricePerUnit = totalPrice / unit; // 1ml/1g 당 가격
    let unitMultiply = { ml: 100, g: 100 }; // 단위 환산 배수
    if (unitMultiply[unitForm]) {
      pricePerUnit *= unitMultiply[unitForm];
      unitForm = unitMultiply[unitForm] + unitForm;
    }

    return {
      pricePerUnit: pricePerUnit,
      unitForm: unitForm,
    };
  } catch (error) {
    console.log(`no unit price - ${data.name}\n${error}`);
  }
}

function readPage(html) {
  let parser = new DOMParser();
  let page = parser.parseFromString(html, "text/html");
  let productDatas = [];

  let products = page.querySelectorAll("#productList > .search-product");
  for (let product of products) {
    let name = product.querySelector(".descriptions .name");
    let price = product.querySelector(".descriptions .price-value");
    let unitPrice = product.querySelector(".descriptions .unit-price");
    let feePrice = product.querySelector(".descriptions .fee-price");
    let link = product.querySelector(".search-product-link");
    let image = product.querySelector(".search-product-wrap-img");

    price = price.textContent.replace(",", "");
    // let priceUnit = price.replace(/\d+(\.\d+)?/g, "");
    price = Number(price.match(/\d+(\.\d+)?/g)?.[0] ?? 0);

    if (feePrice) {
      feePrice = feePrice.textContent.replace(",", "");
      feePrice = Number(feePrice.match(/\d+(\.\d+)?/g)?.[0] ?? 0);
    }

    let data = {
      name: name.textContent,
      price: price,
      unitPrice: unitPrice ? unitPrice.textContent : null,
      feePrice: feePrice,
      link: link.href,
      image: image.src,
    };

    let unitData = parseUnit(data);
    if (!unitData) continue; // 가격 파싱 불가

    data.unitData = unitData;
    productDatas.push(data);
  }

  return productDatas;
}

async function collectPages() {
  let pages = document.querySelectorAll(".btn-page > a");
  let promises = [];

  for (let page of pages) {
    let promise = new Promise(async (resolve, reject) => {
      try {
        let res = await fetch(page.href);
        let body = await res.text();
        resolve(body);
      } catch (error) {
        reject(new Error(error));
      }
    });

    promises.push(promise);
  }

  let results = await Promise.all(promises);
  return results;
}

async function load() {
  let productDatas = [];
  let pages = await collectPages();

  for (let pageHtml of pages) {
    let pageProducts = readPage(pageHtml);
    productDatas = productDatas.concat(pageProducts);
  }

  console.log(productDatas);
  return productDatas.sort((a, b) => {
    if (a.unitData.pricePerUnit < b.unitData.pricePerUnit) return -1;
    else if (a.unitData.pricePerUnit > b.unitData.pricePerUnit) return 1;
    else return 0;
  });
}

// 메인
const messager = new InjectionMessager("coupang_ranker_extension");
messager.onMessage = async function (message, sendResponse) {
  if (message.act == "load") {
    let productDatas = await load();
    console.log("load complete");
    sendResponse(productDatas);
  }
};

// window.addEventListener("message", async (event) => {
//   if (event.data.type === "coupang_ranker_extension") {
//     if (event.data.act == "run") {
//       run();
//     }
//   }
// });

document.onreadystatechange = () => {
  if (document.readyState != "interactive") return;
  const imgs = document.querySelectorAll("img");
  imgs.forEach((img) => addImage(img));

  const targetNode = document.body;
  const observer = new MutationObserver(callback);
  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });
};
