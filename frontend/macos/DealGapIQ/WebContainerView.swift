import SwiftUI
import WebKit

/// Thin Mac App Store shell: WKWebView → production DealGapIQ web app.
/// Injects `window.__DEALGAPIQ_MAC__ = true` so the web client can use
/// Mac-specific chrome (and, later, StoreKit-backed IAP instead of Stripe).
struct WebContainerView: View {
    var body: some View {
        MacWebView(url: URL(string: "https://dealgapiq.com")!)
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
            source: """
            Object.defineProperty(window, '__DEALGAPIQ_MAC__', {
              value: true,
              writable: false,
              configurable: false
            });
            document.documentElement.classList.add('dealgapiq-mac');
            """,
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

        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        webView.load(request)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Keep first-party navigations inside the shell.
            if let host = url.host?.lowercased(),
               host == "dealgapiq.com" || host.hasSuffix(".dealgapiq.com")
                || host == "accounts.google.com"
                || host.hasSuffix(".apple.com")
            {
                decisionHandler(.allow)
                return
            }

            // Deep link scheme handled natively.
            if url.scheme == "dealgapiq" {
                decisionHandler(.cancel)
                return
            }

            // External http(s) → system browser (App Store / docs / mailto helpers).
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
            // Target=_blank links: open in same webview or system browser.
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
