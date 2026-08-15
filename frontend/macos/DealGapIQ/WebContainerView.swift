import AppKit
import SwiftUI
import WebKit

/// Thin Mac App Store shell: WKWebView → production DealGapIQ web app.
/// Injects `window.__DEALGAPIQ_MAC__ = true` and wires RevenueCat via
/// `window.DealGapIQMac.iap` so Stripe is never used for digital unlocks.
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

        context.coordinator.attach(webView)
        context.coordinator.iapBridge.attach(to: webView)

        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        webView.load(request)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, NSWindowDelegate {
        let iapBridge = RevenueCatBridge()
        private weak var mainWebView: WKWebView?
        private var popups: [PopupSession] = []
        private var openedExternalURLs = Set<String>()

        private final class PopupSession {
            let webView: WKWebView
            var window: NSWindow?
            /// Already routed to the main webview or Safari — ignore follow-up navigations.
            var consumed = false

            init(webView: WKWebView) {
                self.webView = webView
            }
        }

        func attach(_ webView: WKWebView) {
            mainWebView = webView
        }

        private func isHTTP(_ url: URL) -> Bool {
            let scheme = url.scheme?.lowercased()
            return scheme == "http" || scheme == "https"
        }

        private func isAboutBlank(_ url: URL) -> Bool {
            url.scheme?.lowercased() == "about"
        }

        private func isInlineDocumentURL(_ url: URL) -> Bool {
            let scheme = url.scheme?.lowercased()
            return scheme == "blob" || scheme == "data"
        }

        /// First-party app surfaces, OAuth hosts, and the currently loaded origin
        /// (localhost / preview) stay inside the shell.
        private func isInAppURL(_ url: URL) -> Bool {
            guard let host = url.host?.lowercased() else { return false }
            if host == "dealgapiq.com" || host.hasSuffix(".dealgapiq.com") { return true }
            if host == "localhost" || host == "127.0.0.1" { return true }
            if host == "accounts.google.com" || host.hasSuffix(".apple.com") { return true }
            if let current = mainWebView?.url?.host?.lowercased(), current == host { return true }
            return false
        }

        private func popup(for webView: WKWebView) -> PopupSession? {
            popups.first { $0.webView === webView }
        }

        private func openExternalOnce(_ url: URL) {
            let key = url.absoluteString
            guard !openedExternalURLs.contains(key) else { return }
            openedExternalURLs.insert(key)
            NSWorkspace.shared.open(url)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                self?.openedExternalURLs.remove(key)
            }
        }

        private func windowDimension(_ value: NSNumber?, fallback: CGFloat) -> CGFloat {
            let n = value.map { CGFloat(truncating: $0) } ?? 0
            return n > 0 ? n : fallback
        }

        private func presentAuxiliaryWindow(_ session: PopupSession, features: WKWindowFeatures) {
            let width = max(windowDimension(features.width, fallback: 820), 480)
            let height = max(windowDimension(features.height, fallback: 900), 360)
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: width, height: height),
                styleMask: [.titled, .closable, .miniaturizable, .resizable],
                backing: .buffered,
                defer: false
            )
            window.title = "DealGapIQ"
            let container = NSView(frame: NSRect(x: 0, y: 0, width: width, height: height))
            session.webView.frame = container.bounds
            session.webView.autoresizingMask = [.width, .height]
            container.addSubview(session.webView)
            window.contentView = container
            window.isReleasedWhenClosed = false
            window.delegate = self
            window.center()
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            session.window = window
        }

        private func close(_ session: PopupSession) {
            session.window?.delegate = nil
            session.window?.close()
            popups.removeAll { $0.webView === session.webView }
        }

        func windowWillClose(_ notification: Notification) {
            guard let window = notification.object as? NSWindow else { return }
            popups.removeAll { $0.window === window }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if let session = popup(for: webView) {
                if session.consumed {
                    decisionHandler(.cancel)
                    DispatchQueue.main.async { [weak self] in
                        self?.close(session)
                    }
                    return
                }
                // Visible print / document windows: keep blob, data, and about:blank here.
                if isAboutBlank(url) || isInlineDocumentURL(url) {
                    decisionHandler(.allow)
                    return
                }
                if isInAppURL(url) {
                    mainWebView?.load(URLRequest(url: url))
                    decisionHandler(.cancel)
                    close(session)
                    return
                }
                if isHTTP(url) {
                    openExternalOnce(url)
                    decisionHandler(.cancel)
                    close(session)
                    return
                }
                decisionHandler(.allow)
                return
            }

            // New-window request from the main webview.
            if navigationAction.targetFrame == nil {
                if isAboutBlank(url) || isInlineDocumentURL(url) {
                    decisionHandler(.allow)
                    return
                }
                if isInAppURL(url) {
                    mainWebView?.load(URLRequest(url: url))
                    decisionHandler(.cancel)
                    return
                }
                if isHTTP(url) {
                    openExternalOnce(url)
                    decisionHandler(.cancel)
                    return
                }
                decisionHandler(.allow)
                return
            }

            if isInAppURL(url) || isInlineDocumentURL(url) || isAboutBlank(url) {
                decisionHandler(.allow)
                return
            }

            if url.scheme == "dealgapiq" {
                decisionHandler(.cancel)
                return
            }

            if isHTTP(url) {
                openExternalOnce(url)
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
            // Always return a webview. Returning nil on macOS opens Safari.
            let popupView = WKWebView(frame: .zero, configuration: configuration)
            popupView.navigationDelegate = self
            popupView.uiDelegate = self
            let session = PopupSession(webView: popupView)
            popups.append(session)

            if let url = navigationAction.request.url,
               !isAboutBlank(url),
               !isInlineDocumentURL(url)
            {
                if isInAppURL(url) {
                    mainWebView?.load(URLRequest(url: url))
                    session.consumed = true
                } else if isHTTP(url) {
                    openExternalOnce(url)
                    session.consumed = true
                } else {
                    presentAuxiliaryWindow(session, features: windowFeatures)
                }
            } else {
                // about:blank, blob/data, or empty URL — print / document.write surfaces.
                presentAuxiliaryWindow(session, features: windowFeatures)
            }

            return popupView
        }
    }
}
