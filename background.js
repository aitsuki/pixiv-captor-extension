chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.getTabUrl) {
        sendResponse({tabUrl : sender.tab.url})
    }
})