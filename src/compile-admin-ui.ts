import { compileUiExtensions, setBranding } from "@vendure/ui-devkit/compiler";
import * as path from "path";

compileUiExtensions({
  outputPath: path.join(__dirname, "../__admin-ui"),
  extensions: [
    // Add your UI extensions here
    setBranding({
      // The small logo appears in the top left of the screen
      smallLogoPath: path.join(__dirname, "admin-branding/favicon.png"),
      // The large logo is used on the login page
      largeLogoPath: path.join(__dirname, "admin-branding/logo.png"),
      faviconPath: path.join(__dirname, "admin-branding/favicon.png"),
    }),
  ],
})
  .compile?.()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
