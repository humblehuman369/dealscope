import SwiftUI
import WebKit

/// Thin Mac App Store shell: WKWebView → production DealGapIQ web app.
/// RevenueCat/StoreKit IAP is exposed to the page via `window.DealGapIQMac.iap`.
struct WebContainerView: View {
    private var startURL: URL {
        if let override = ProcessInfo.processInfo.environment["DEALGAPIQ_URL"],
           let url = URL(string: override)
        {
            return url
        }
        return URL(string: "https://dealgapiq.com")!
    }

    var body: some View {
        MacWebView(url: startURL)
            .frame(minWidth: 1100, minHeight: 720)
            .background(Color.black)
    }
}

struct MacWebView: NSViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        config.websiteDataStore = .default()

        let userScript = WKUserScript(
            source: RevenueCatBridge.userScriptSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(userScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsMagnification = true
        webView.customUserAgent =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
            + "(KHTML, like Gecko) Version/17.0 Safari/605.1.15 DealGapIQMac/1.0"

        context.coordinator.iapBridge.attach(to: webView)

        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        webView.load(request)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let iapBridge = RevenueCatBridge()

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if let host = url.host?.lowercased(),
               host == "dealgapiq.com" || host.hasSuffix(".dealgapiq.com")
                || host == "accounts.google.com"
                || host.hasSuffix(".apple.com")
            {
                decisionHandler(.allow)
                return
            }

            if url.scheme == "dealgapiq" {
                decisionHandler(.cancel)
                return
            }

            if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                if let host = url.host?.lowercased(),
                   host == "dealgapiq.com" || host.hasSuffix(".dealgapiq.com")
                {
                    webView.load(URLRequest(url: url))
                } else {
                    NSWorkspace.shared.open(url)
                }
            }
            return nil
        }
    }
}
