const captureButtonId = "pixivCaptureBtn";
const captureIconId = "pixivCaptureIcon";
const iconNormal = "fas fa-cloud-upload-alt fa-lg";
const iconSuccess = "fas fa-check fa-lg";
const iconLoading = "fas fa-spinner fa-lg fa-pulse";

let username
let password
let host

/**
 * @readonly
 * @enum {String} 抓取状态
 */
const captureStatus = {
    NORMAL: "normal",
    LOADING: "loading",
    SUCCESS: "success"
}

/**
 * 获取当前页面的URL
 * @returns {Promise<String>} 当前页面url
 */
function getCurrentUrl() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ getTabUrl: true }, (response) => {
            if (response.tabUrl) {
                resolve(response.tabUrl)
            } else {
                reject("Failed to get current url.")
            }
        })
    })
}

/**
 * 判断Url是否是illust
 * @param {string} url 
 * @returns {boolean}
 */
function isIllustUrl(url) {
    return url.match("^\.*pixiv.net/artworks/\\d+$") != null
}

/**
 * 监听页面变化
 * @param {() => void} callback 页面变化回调
 */
function observePageChange(callback) {
    let target = document.head.querySelector("title")
    let options = { attributes: true, childList: true, subtree: true }
    new MutationObserver(() => {
        callback()
    }).observe(target, options)
    callback()
}

/**
 * 检查是否已经抓取
 * @param {String} url
 */
async function checkCaptured(url) {
    try {
        changeCaptureButtonStatus(captureStatus.LOADING)
        let illustId = url.substring(url.lastIndexOf('/') + 1, url.length)
        let request = new Request(host + "/pixiv/" + illustId, { method: 'HEAD' })
        let response = await fetch(request)
        if (response.ok) {
            changeCaptureButtonStatus(captureStatus.SUCCESS)
        } else {
            changeCaptureButtonStatus(captureStatus.NORMAL)
        }
    } catch (error) {
        console.log(error);
        changeCaptureButtonStatus(captureStatus.NORMAL)
    }
}

/**
 * 抓取
 */
async function capture() {
    try {
        changeCaptureButtonStatus(captureStatus.LOADING)
        let url = await getCurrentUrl()
        let illustId = url.substring(url.lastIndexOf('/') + 1, url.length)
        let illust = (await (await fetch('https://www.pixiv.net/ajax/illust/' + illustId + "?lang=zh")).json()).body
        let pages = (await (await fetch('https://www.pixiv.net/ajax/illust/' + illustId + '/pages?lang=zh')).json()).body
        illust.pages = pages
        let json = JSON.stringify(illust)
        let request = new Request(host + '/pixiv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8;' },
            body: json
        });
        await addBasicAuthorization(request)
        let response = await fetch(request)
        if (response.ok) {
            changeCaptureButtonStatus(captureStatus.SUCCESS)
        } else if (response.status == 401) {
            changeCaptureButtonStatus(captureStatus.NORMAL)
            alert("用户认证失败，请检查账号密码是否正确设置。")
        } else {
            changeCaptureButtonStatus(captureStatus.NORMAL)
        }
    } catch (error) {
        console.log(error);
        changeCaptureButtonStatus(captureStatus.NORMAL)
    }
}

/**
 * 取消抓取
 */
async function cancelCaptured() {
    try {
        changeCaptureButtonStatus(captureStatus.LOADING)
        let url = await getCurrentUrl()
        let illustId = url.substring(url.lastIndexOf('/') + 1, url.length)
        let request = new Request(host + "/pixiv/" + illustId, { method: 'DELETE' })
        await addBasicAuthorization(request)
        let response = await fetch(request)
        if (response.ok) {
            changeCaptureButtonStatus(captureStatus.NORMAL)
        } else {
            changeCaptureButtonStatus(captureStatus.SUCCESS)
        }
    } catch (error) {
        console.log(error)
        changeCaptureButtonStatus(captureStatus.NORMAL)
    }
}

/**
 * 给请求添加Basic认证
 * @param {Request} request 
 */
async function addBasicAuthorization(request) {
    let authorization = "Basic " + btoa(username + ":" + password)
    request.headers.append("Authorization", authorization)
}

/**
 * 获取LocalStorage存储
 * @param {String} key 
 * @returns { Promise }
 */
function getStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, (item) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            }
            resolve(item[key])
        })
    })
}

/**
 * 显示抓取按钮
 */
function showCaptureButton() {
    let button = document.getElementById(captureButtonId)
    if (button) {
        button.className = ""
    } else {
        injectCaptureBtn()
    }
}

/**
 * 隐藏抓取按钮
 */
function hideCaptureButton() {
    let button = document.getElementById(captureButtonId)
    if (button) {
        button.className = "hide_capture_button"
    }
}

/**
 * 切换抓取按钮状态
 * @param {captureStatus} status 状态
 */
function changeCaptureButtonStatus(status) {
    let button = document.getElementById(captureButtonId)
    let icon = document.getElementById(captureIconId)
    switch (status) {
        case captureStatus.NORMAL:
            button.removeAttribute("disabled")
            button.dataset.status = captureStatus.NORMAL
            icon.className = iconNormal
            break
        case captureStatus.LOADING:
            button.setAttribute("disabled", "disabled")
            button.dataset.status = captureStatus.LOADING
            icon.className = iconLoading
            break
        case captureStatus.SUCCESS:
            button.removeAttribute("disabled")
            button.dataset.status = captureStatus.SUCCESS
            icon.className = iconSuccess
            break
        default:
            break
    }
}

/**
 * 注入抓取按钮
 */
function injectCaptureBtn() {
    let button = document.createElement("button")
    let icon = document.createElement("i")
    icon.id = captureIconId
    icon.setAttribute("style", "color: #339af0;")
    icon.className = iconNormal
    button.appendChild(icon)
    button.id = captureButtonId
    button.addEventListener("click", () => {
        if (button.dataset.status === captureStatus.SUCCESS) {
            cancelCaptured()
        } else {
            capture()
        }
    })
    document.body.appendChild(button)
}

async function prepare() {
    host = await getStorage("host")
    username = await getStorage("username")
    password = await getStorage("password")
    if (host != null && username != null && password != null) {
        let url = await getCurrentUrl()
        if (isIllustUrl(url)) {
            showCaptureButton()
            checkCaptured(url)
        } else {
            hideCaptureButton()
        }
    }
}

observePageChange(prepare)

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.onSettingChanged) {
        prepare()
        sendResponse({})
        console.log("onSettingChanged===");
    }
})