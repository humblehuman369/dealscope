import SwiftUI

@main
struct DealGapIQApp: App {
    var body: some Scene {
        WindowGroup {
            WebContainerView()
        }
        .defaultSize(width: 1280, height: 840)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
