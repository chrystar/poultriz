package expo.modules.multishare

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class MultiShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MultiShare")

    AsyncFunction("shareImages") { imageUris: List<String> ->
      require(imageUris.isNotEmpty()) { "At least one image is required." }

      val context = appContext.reactContext ?: error("React context is unavailable.")
      val contentUris = imageUris.map { uriString ->
        val uri = Uri.parse(uriString)
        if (uri.scheme == "content") {
          uri
        } else {
          val file = File(uri.path ?: error("Invalid image URI: $uriString"))
          FileProvider.getUriForFile(context, "${context.packageName}.multi-share", file)
        }
      }

      val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
        type = "image/png"
        putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(contentUris))
        clipData = ClipData.newRawUri("Farm Wrapped", contentUris.first())
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      context.startActivity(Intent.createChooser(intent, "Share your Farm Wrapped"))
    }
  }
}
