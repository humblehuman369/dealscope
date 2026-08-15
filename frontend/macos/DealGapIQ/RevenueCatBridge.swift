import Foundation
import RevenueCat
import WebKit

/// Exposes StoreKit / RevenueCat to the WKWebView as `window.DealGapIQMac.iap`.
/// Product IDs match iOS: `com.monthly.dealgapiq` / `com.yearly.dealgapiq`.
@MainActor
final class RevenueCatBridge: NSObject, WKScriptMessageHandler {
    static let messageHandlerName = "dealGapIqMacIap"

    private weak var webView: WKWebView?

    func attach(to webView: WKWebView) {
        self.webView = webView
        webView.configuration.userContentController.add(self, name: Self.messageHandlerName)
        let js = Self.bootstrapJavaScript()
        let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        webView.configuration.userContentController.addUserScript(script)
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == Self.messageHandlerName,
              let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let method = body["method"] as? String
        else { return }

        Task { @MainActor in
            do {
                let result = try await self.dispatch(method: method, params: body["params"] as? [String: Any] ?? [:])
                self.resolve(id: id, result: result, error: nil)
            } catch {
                self.resolve(id: id, result: nil, error: error.localizedDescription)
            }
        }
    }

    private func dispatch(method: String, params: [String: Any]) async throws -> Any {
        switch method {
        case "configure":
            guard let apiKey = params["apiKey"] as? String, !apiKey.isEmpty else {
                throw BridgeError.invalidParams("apiKey required")
            }
            Purchases.logLevel = .warn
            Purchases.configure(withAPIKey: apiKey)
            return ["ok": true]

        case "logIn":
            guard let appUserID = params["appUserID"] as? String, !appUserID.isEmpty else {
                throw BridgeError.invalidParams("appUserID required")
            }
            _ = try await Purchases.shared.logIn(appUserID)
            return ["ok": true]

        case "getOfferings":
            let offerings = try await Purchases.shared.offerings()
            let packages = (offerings.current?.availablePackages ?? []).map { pkg -> [String: Any] in
                let product = pkg.storeProduct
                let packageType: String
                switch pkg.packageType {
                case .monthly: packageType = "MONTHLY"
                case .annual: packageType = "ANNUAL"
                default: packageType = "UNKNOWN"
                }
                return [
                    "identifier": product.productIdentifier,
                    "title": product.localizedTitle,
                    "description": product.localizedDescription,
                    "priceString": product.localizedPriceString,
                    "price": NSDecimalNumber(decimal: product.price).doubleValue,
                    "currencyCode": product.currencyCode ?? "USD",
                    "packageType": packageType,
                    "packageIdentifier": pkg.identifier,
                ]
            }
            return ["packages": packages]

        case "purchase":
            guard let packageIdentifier = params["packageIdentifier"] as? String else {
                throw BridgeError.invalidParams("packageIdentifier required")
            }
            let offerings = try await Purchases.shared.offerings()
            guard let pkg = offerings.current?.availablePackages.first(where: {
                $0.identifier == packageIdentifier
                    || $0.storeProduct.productIdentifier == packageIdentifier
            }) else {
                throw BridgeError.invalidParams("Package not found")
            }
            do {
                _ = try await Purchases.shared.purchase(package: pkg)
                return ["userCancelled": false]
            } catch ErrorCode.purchaseCancelledError {
                return ["userCancelled": true]
            }

        case "restore":
            _ = try await Purchases.shared.restorePurchases()
            return ["ok": true]

        default:
            throw BridgeError.unknownMethod(method)
        }
    }

    private func resolve(id: String, result: Any?, error: String?) {
        var payload: [String: Any] = ["id": id]
        payload["result"] = result ?? NSNull()
        payload["error"] = error ?? NSNull()
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let json = String(data: data, encoding: .utf8)
        else { return }
        let js = "window.__dealGapIqMacIapResolve && window.__dealGapIqMacIapResolve(\(json));"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    private static func bootstrapJavaScript() -> String {
        """
        (function () {
          if (window.DealGapIQMac && window.DealGapIQMac.iap) return;
          const pending = {};
          let seq = 0;
          window.__dealGapIqMacIapResolve = function (msg) {
            const p = pending[msg.id];
            if (!p) return;
            delete pending[msg.id];
            if (msg.error) p.reject(new Error(msg.error));
            else p.resolve(msg.result);
          };
          function call(method, params) {
            return new Promise(function (resolve, reject) {
              const id = String(++seq);
              pending[id] = { resolve: resolve, reject: reject };
              window.webkit.messageHandlers.\(messageHandlerName).postMessage({
                id: id,
                method: method,
                params: params || {}
              });
            });
          }
          window.DealGapIQMac = window.DealGapIQMac || {};
          window.DealGapIQMac.iap = {
            configure: function (apiKey) { return call('configure', { apiKey: apiKey }); },
            logIn: function (appUserID) { return call('logIn', { appUserID: appUserID }); },
            getOfferings: function () { return call('getOfferings', {}); },
            purchase: function (packageIdentifier) {
              return call('purchase', { packageIdentifier: packageIdentifier });
            },
            restore: function () { return call('restore', {}); }
          };
        })();
        """
    }

    enum BridgeError: LocalizedError {
        case invalidParams(String)
        case unknownMethod(String)

        var errorDescription: String? {
            switch self {
            case .invalidParams(let m): return m
            case .unknownMethod(let m): return "Unknown IAP method: \(m)"
            }
        }
    }
}
