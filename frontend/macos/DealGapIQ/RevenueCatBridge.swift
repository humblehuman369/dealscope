import Foundation
import RevenueCat
import WebKit

/// Bridges RevenueCat (StoreKit) to the WKWebView via `window.DealGapIQMac.iap`.
@MainActor
final class RevenueCatBridge: NSObject, WKScriptMessageHandler {
    static let messageHandlerName = "dealgapiqIAP"

    private weak var webView: WKWebView?
    private var configured = false
    private var packagesById: [String: Package] = [:]

    func attach(to webView: WKWebView) {
        self.webView = webView
        webView.configuration.userContentController.add(self, name: Self.messageHandlerName)
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard
            let body = message.body as? [String: Any],
            let id = body["id"] as? String,
            let method = body["method"] as? String
        else { return }

        let params = body["params"] as? [String: Any] ?? [:]
        Task { @MainActor in
            do {
                let result = try await self.dispatch(method: method, params: params)
                self.resolve(id: id, result: result)
            } catch {
                self.reject(
                    id: id,
                    message: error.localizedDescription,
                    userCancelled: Self.isPurchaseCancelled(error)
                )
            }
        }
    }

    private func dispatch(method: String, params: [String: Any]) async throws -> Any {
        switch method {
        case "configure":
            guard let apiKey = params["apiKey"] as? String, !apiKey.isEmpty else {
                throw BridgeError.invalidParams("apiKey required")
            }
            if !configured {
                Purchases.logLevel = .warn
                Purchases.configure(withAPIKey: apiKey)
                configured = true
            }
            return ["ok": true]

        case "logIn":
            try requireConfigured()
            guard let appUserID = params["appUserID"] as? String, !appUserID.isEmpty else {
                throw BridgeError.invalidParams("appUserID required")
            }
            _ = try await Purchases.shared.logIn(appUserID)
            return ["ok": true]

        case "getOfferings":
            try requireConfigured()
            let offerings = try await Purchases.shared.offerings()
            guard let current = offerings.current else {
                return ["packages": []]
            }
            var packages: [[String: Any]] = []
            packagesById.removeAll()
            for pkg in current.availablePackages {
                packagesById[pkg.identifier] = pkg
                let product = pkg.storeProduct
                packages.append([
                    "identifier": pkg.identifier,
                    "packageType": packageTypeString(pkg.packageType),
                    "product": [
                        "identifier": product.productIdentifier,
                        "title": product.localizedTitle,
                        "description": product.localizedDescription,
                        "priceString": product.localizedPriceString,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "currencyCode": product.currencyCode ?? "USD",
                    ] as [String: Any],
                ])
            }
            return ["packages": packages]

        case "purchasePackage":
            try requireConfigured()
            guard let packageId = params["packageId"] as? String else {
                throw BridgeError.invalidParams("packageId required")
            }
            if packagesById[packageId] == nil {
                // Refresh cache if web asks before/without a prior getOfferings in this session.
                _ = try await dispatch(method: "getOfferings", params: [:])
            }
            guard let pkg = packagesById[packageId] else {
                throw BridgeError.packageNotFound(packageId)
            }
            let result = try await Purchases.shared.purchase(package: pkg)
            if result.userCancelled {
                throw BridgeError.userCancelled
            }
            return ["ok": true]

        case "restorePurchases":
            try requireConfigured()
            _ = try await Purchases.shared.restorePurchases()
            return ["ok": true]

        default:
            throw BridgeError.unknownMethod(method)
        }
    }

    private func requireConfigured() throws {
        guard configured else { throw BridgeError.notConfigured }
    }

    private func packageTypeString(_ type: PackageType) -> String {
        switch type {
        case .monthly: return "MONTHLY"
        case .annual: return "ANNUAL"
        case .weekly: return "WEEKLY"
        case .lifetime: return "LIFETIME"
        case .twoMonth: return "TWO_MONTH"
        case .threeMonth: return "THREE_MONTH"
        case .sixMonth: return "SIX_MONTH"
        case .custom: return "CUSTOM"
        case .unknown: return "UNKNOWN"
        @unknown default: return "UNKNOWN"
        }
    }

    private func resolve(id: String, result: Any) {
        reply(id: id, payload: ["ok": true, "result": result])
    }

    private func reject(id: String, message: String, userCancelled: Bool) {
        reply(
            id: id,
            payload: [
                "ok": false,
                "error": message,
                "userCancelled": userCancelled,
            ]
        )
    }

    private func reply(id: String, payload: [String: Any]) {
        guard
            let data = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: data, encoding: .utf8)
        else { return }
        let script = "window.DealGapIQMac && window.DealGapIQMac._reply(\(jsString(id)), \(json));"
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    private func jsString(_ value: String) -> String {
        let escaped = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
        return "'\(escaped)'"
    }

    private static func isPurchaseCancelled(_ error: Error) -> Bool {
        if let bridgeError = error as? BridgeError, case .userCancelled = bridgeError {
            return true
        }
        if let code = error as? ErrorCode, code == .purchaseCancelledError {
            return true
        }
        let ns = error as NSError
        return ns.domain == ErrorCode.errorDomain
            && ns.code == ErrorCode.purchaseCancelledError.rawValue
    }

    enum BridgeError: LocalizedError {
        case notConfigured
        case invalidParams(String)
        case unknownMethod(String)
        case packageNotFound(String)
        case userCancelled

        var errorDescription: String? {
            switch self {
            case .notConfigured:
                return "RevenueCat is not configured."
            case .invalidParams(let detail):
                return "Invalid parameters: \(detail)"
            case .unknownMethod(let method):
                return "Unknown IAP method: \(method)"
            case .packageNotFound(let id):
                return "Package not found: \(id)"
            case .userCancelled:
                return "Purchase cancelled."
            }
        }
    }
}

extension RevenueCatBridge {
    /// Injected at document start — defines the promise bridge the web app calls.
    static var userScriptSource: String {
        """
        Object.defineProperty(window, '__DEALGAPIQ_MAC__', {
          value: true, writable: false, configurable: false
        });
        document.documentElement.classList.add('dealgapiq-mac');

        window.DealGapIQMac = {
          _pending: Object.create(null),
          _call: function(method, params) {
            var self = this;
            return new Promise(function(resolve, reject) {
              var id = Math.random().toString(36).slice(2) + Date.now().toString(36);
              self._pending[id] = { resolve: resolve, reject: reject };
              try {
                window.webkit.messageHandlers.\(messageHandlerName).postMessage({
                  id: id,
                  method: method,
                  params: params || {}
                });
              } catch (err) {
                delete self._pending[id];
                reject(err);
              }
            });
          },
          _reply: function(id, payload) {
            var pending = this._pending[id];
            if (!pending) return;
            delete this._pending[id];
            if (payload && payload.ok) {
              pending.resolve(payload.result);
            } else {
              var err = new Error((payload && payload.error) || 'IAP failed');
              err.userCancelled = !!(payload && payload.userCancelled);
              pending.reject(err);
            }
          },
          iap: {
            configure: function(apiKey) {
              return window.DealGapIQMac._call('configure', { apiKey: apiKey });
            },
            logIn: function(appUserID) {
              return window.DealGapIQMac._call('logIn', { appUserID: appUserID });
            },
            getOfferings: function() {
              return window.DealGapIQMac._call('getOfferings', {});
            },
            purchasePackage: function(packageId) {
              return window.DealGapIQMac._call('purchasePackage', { packageId: packageId });
            },
            restorePurchases: function() {
              return window.DealGapIQMac._call('restorePurchases', {});
            }
          }
        };
        """
    }
}
