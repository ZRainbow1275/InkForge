fn main() {
    // Re-run this build script (which re-embeds the Windows icon resource via
    // tauri-build/winres) whenever an icon source or the Tauri config changes.
    // tauri_build::build() does NOT emit rerun-if-changed for the icon files,
    // so without these lines cargo relinks a STALE embedded icon on icon-only
    // changes and the app/taskbar icon never updates after a rebuild.
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.icns");
    println!("cargo:rerun-if-changed=icons/32x32.png");
    println!("cargo:rerun-if-changed=icons/128x128.png");
    println!("cargo:rerun-if-changed=icons/128x128@2x.png");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}
