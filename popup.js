let form = document.getElementById("form")
let hostInput = document.getElementById("host")
let usernameInput = document.getElementById("username")
let passwordInput = document.getElementById("password")

form.onsubmit = saveSetting
chrome.storage.sync.get(["host", "username", "password"], (values) => {
    if(values.host != null) {
        hostInput.value = values.host
    }
    if (values.username != null) {
        usernameInput.value = values.username
    }
    if (values.password != null) {
        passwordInput.value = values.password
    }
})

/**
 * 保存设置
 * @param {Event} event 
 */
function saveSetting(event) {
    event.preventDefault()
    let host = hostInput.value
    let username = usernameInput.value
    let password = passwordInput.value
    chrome.storage.sync.set({ host, username, password })
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { onSettingChanged: true });
    });
    window.close()
}