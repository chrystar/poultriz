import ExpoModulesCore
import UIKit

public class MultiShareModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MultiShare")

    AsyncFunction("shareImages") { (imageUris: [String]) in
      guard !imageUris.isEmpty else {
        throw NSError(domain: "MultiShare", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "At least one image is required."
        ])
      }

      let items = imageUris.compactMap { URL(string: $0) }
      guard items.count == imageUris.count else {
        throw NSError(domain: "MultiShare", code: 2, userInfo: [
          NSLocalizedDescriptionKey: "One or more image URLs are invalid."
        ])
      }

      DispatchQueue.main.async {
        guard let presenter = Self.topViewController() else {
          return
        }
        let activity = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let popover = activity.popoverPresentationController {
          popover.sourceView = presenter.view
          popover.sourceRect = CGRect(
            x: presenter.view.bounds.midX,
            y: presenter.view.bounds.maxY - 1,
            width: 1,
            height: 1
          )
        }
        presenter.present(activity, animated: true)
      }
    }
  }

  private static func topViewController(
    from root: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
      .first
  ) -> UIViewController? {
    if let presented = root?.presentedViewController {
      return topViewController(from: presented)
    }
    if let navigation = root as? UINavigationController {
      return topViewController(from: navigation.visibleViewController)
    }
    if let tab = root as? UITabBarController {
      return topViewController(from: tab.selectedViewController)
    }
    return root
  }
}
